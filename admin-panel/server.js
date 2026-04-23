import express from "express";
import { engine } from "express-handlebars";
import session from 'express-session';
import db from "./db.js";
import 'dotenv/config';
import helpers from './lib/handlebars.js';
import { simpleAuthMiddleware } from './lib/funciones.js';
import * as path from "path";
import * as url from "url";
import { bot } from "./services/telegram.js"
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const app = express();
// Credenciales "a capón"
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;
app.use(express.json());
app.use((express.static(path.join(__dirname, "public"))));
app.use(express.urlencoded({ extended: true }));

// Handlebars setup
app.engine("hbs", engine({
  extname: "hbs",
  defaultLayout: "main",
  helpers: helpers //no hay nada aun
}));
app.set("view engine", "hbs");
app.set("views", "./views");

// Sesión
app.use(session({
  secret: 'clave_super_secreta',
  resave: false,
  saveUninitialized: false,
}));

// IMPORTANTE: después de session
app.use(simpleAuthMiddleware);

//LISTADO PRINCIPAL DE USUARIOS
app.get("/", simpleAuthMiddleware, async (req, res) => {
  const [users] = await db.query(`
    SELECT 
      u.telegram_id,
      u.username,
      u.nombre,
      s.id AS subscripcion_id,
      s.estado,
      s.start_date,
      (s.estado = 'activo' AND s.end_date > NOW()) AS has_access,
      s.end_date
    FROM usuarios u
    LEFT JOIN subscripciones s 
      ON u.telegram_id = s.telegram_id order by s.start_date
  `);

  res.render("home", { users });
});

//RUTA PARA VER LOS PAGOS DE UN USUARIO
app.get("/pagos/:telegram_id", simpleAuthMiddleware, async (req, res) => {
  const { telegram_id } = req.params;
  const [pagos] = await db.query(`
    SELECT * FROM pagos where telegram_id=?`, [telegram_id]);
  const [[usuario]] = await db.query(`
    SELECT * FROM usuarios where telegram_id=?`, [telegram_id]);

  res.render("pagos", { pagos, usuario });
});

//BORRAR UN PAGO
app.post("/delPayment", simpleAuthMiddleware, async (req, res) => {
  const { subscripcion_id } = req.body;
  console.log(subscripcion_id);
  await db.query(`
    DELETE FROM pagos where id= ? `, [subscripcion_id]);

  res.redirect("/");
});

//AÑADIR UN PAGO Y EXTENDER SUSCRIPCION UN MES MAS DE LA FECHA NOW()
app.post("/pay", simpleAuthMiddleware, async (req, res) => {
  const { telegram_id, subscripcion_id } = req.body;

  await db.query(`
    INSERT INTO pagos (telegram_id, subscripcion_id, precio, fecha_pago)
    VALUES (?, ?, 5, NOW())
  `, [telegram_id, subscripcion_id]);

  await db.query(`
    UPDATE subscripciones
    SET estado='activo',
        end_date=DATE_ADD(end_date, INTERVAL 1 MONTH)
    WHERE id=?
  `, [subscripcion_id]);

  res.redirect("/");
});

//EDITAR UN PAGO
app.post("/editPayment", simpleAuthMiddleware, async (req, res) => {
  const { id, precio, fecha_pago } = req.body;

  await db.query(`
    UPDATE pagos
    SET precio = ?, fecha_pago = ?
    WHERE id = ?
  `, [precio, fecha_pago, id]);

  res.json({ ok: true });
});

//ACTUALIZAR FECHA DE EXPIRACION DE SUSCRIPCION
app.post("/update-expira", simpleAuthMiddleware, async (req, res) => {
  const { id, end_date } = req.body;

  await db.query(`
    UPDATE subscripciones
    SET end_date = ?
    WHERE id = ?
  `, [end_date, id]);

  res.json({ ok: true });
});

//CREA UN USUARIO
app.post("/alta-nueva", async (req, res) => {
  console.log(req.body)
  const { telegram_id, usuario, nombre } = req.body;

  try {
    await db.query(`
      INSERT INTO usuarios (telegram_id, username, nombre, fecha_alta)
      VALUES (?, ?, ?, NOW())
    `, [telegram_id, usuario, nombre]);

    await db.query(`
    INSERT INTO  subscripciones(telegram_id, estado, start_date, end_date)
    values (?,'inactivo',NOW(),NOW() )
  `, [telegram_id]);

    res.json({
      ok: true,
      message: "Usuario creado correctamente"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Error al crear el usuario"
    });
  }
});

//REVOCAR ACCESO A UN USUARIO
app.post("/revoke", simpleAuthMiddleware, async (req, res) => {
  const { subscripcion_id } = req.body;
  console.log("voy");
  await db.query(`
    UPDATE subscripciones
    SET estado='inactivo'
    WHERE id=?
  `, [subscripcion_id]);

  const [[usuario]] = await db.query(`
  SELECT * FROM usuarios u left join subscripciones s on u.telegram_id=s.telegram_id WHERE id=?
`, [subscripcion_id]);
  console.log(usuario)

  res.redirect("/");
});

//ACTIVAR ACCESO A UN USUARIO
app.post("/activate", simpleAuthMiddleware, async (req, res) => {
  const { subscripcion_id } = req.body;

  await db.query(`
    UPDATE subscripciones
    SET estado='activo'
    WHERE id=?
  `, [subscripcion_id]);

  res.redirect("/");
});

// ELIMINAR UN USUARIO (Y SUS PAGOS Y SUSCRIPCIONES)
app.post("/remove", simpleAuthMiddleware, async (req, res) => {
  const { telegram_id } = req.body;
  console.log(telegram_id);
  await db.query(`
    DELETE FROM pagos WHERE telegram_id=?
  `, [telegram_id]);
  await db.query(`
    DELETE FROM subscripciones WHERE telegram_id=?
  `, [telegram_id]);
  await db.query(`
    DELETE FROM usuarios WHERE telegram_id=?
  `, [telegram_id]);



  res.redirect("/");
});

//RUTA PARA VISTA DE LOGIN
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Enviar broadcast
app.post('/broadcast', async (req, res) => {
  const message = req.body.message;
  const [users] = await db.query(`SELECT telegram_id FROM usuarios`);
  for (const user of users) {
    const chatId = user.telegram_id;
    try {
      await bot.sendMessage(chatId, message);
      await new Promise(r => setTimeout(r, 50)); // evitar rate limit
    } catch (e) {
      console.log(`Error con ${chatId}`);
      if (e.response?.statusCode === 403) {
        // Usuario bloqueó el bot → eliminar
        await db.query(`DELETE FROM usuarios WHERE telegram_id = ?`, [chatId]);
      }
    }
  }

  res.redirect('/');
});

//RUTA PARA LOGIN
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === AUTH_USER && password === AUTH_PASS) {
    req.session.isAuthenticated = true;
    return res.redirect('/');
  }

  res.render('login', { error: 'Credenciales incorrectas' });
});

//RUTA PARA LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Admin panel en https://localhost:${process.env.PORT}`);
});