import express from "express";
import { engine } from "express-handlebars";
import session from 'express-session';
import 'dotenv/config';
import helpers from './lib/handlebars.js';
import { simpleAuthMiddleware } from './lib/funciones.js';
import {
  apiRouter,
  createUser,
  deletePayment,
  editPayment,
  getPaymentsDashboard,
  getUserPayments,
  isAdminUser,
  listUsers,
  recordPayment,
  removeUser,
  sendBroadcast,
  updateExpiration,
  updateSubscriptionStatus
} from "./api.js";
import * as path from "path";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const app = express();
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;
app.use(express.json());
app.use((express.static(path.join(__dirname, "public"))));
app.use(express.urlencoded({ extended: true }));

// Handlebars setup
app.engine("hbs", engine({
  extname: "hbs",
  defaultLayout: "main",
  helpers: helpers
}));
app.set("view engine", "hbs");
app.set("views", "./views");

// Sesión
app.use(session({
  secret: 'clave_super_secreta',
  resave: false,
  saveUninitialized: false,
}));

async function handleLogin(req, res, wantsJson) {
  const { username, password } = req.body;

  if (!AUTH_USER || !AUTH_PASS) {
    console.error("AUTH_USER y AUTH_PASS deben estar configurados.");
    if (wantsJson) {
      return res.status(500).json({
        ok: false,
        message: "El login del administrador no está configurado."
      });
    }
    return res.status(500).render("login", {
      error: "El login del administrador no está configurado."
    });
  }

  try {
    const usernameMatches = username === AUTH_USER;
    const passwordMatches = password === AUTH_PASS;
    const isAdmin = usernameMatches && await isAdminUser(AUTH_USER);

    if (!usernameMatches || !passwordMatches || !isAdmin) {
      console.warn("Login de administrador rechazado:", {
        usernameMatches,
        passwordMatches,
        isAdmin
      });
      if (wantsJson) {
        return res.status(401).json({
          ok: false,
          message: "Credenciales incorrectas o usuario sin privilegios de administrador."
        });
      }
      return res.status(401).render("login", {
        error: "Credenciales incorrectas."
      });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate(error => error ? reject(error) : resolve());
    });
    req.session.isAuthenticated = true;
    await new Promise((resolve, reject) => {
      req.session.save(error => error ? reject(error) : resolve());
    });

    if (wantsJson) {
      return res.json({ ok: true });
    }
    return res.redirect("/");
  } catch (error) {
    console.error("Error al autenticar al administrador:", error);
    if (wantsJson) {
      return res.status(500).json({
        ok: false,
        message: "No se pudo validar el acceso."
      });
    }
    return res.status(500).render("login", {
      error: "No se pudo validar el acceso."
    });
  }
}

apiRouter.get("/auth/session", (req, res) => {
  res.json({ authenticated: Boolean(req.session.isAuthenticated) });
});
apiRouter.post("/auth/login", (req, res) => handleLogin(req, res, true));

// IMPORTANTE: después de session
app.use(simpleAuthMiddleware);
app.use("/api", apiRouter);

//LISTADO PRINCIPAL DE USUARIOS
app.get("/", simpleAuthMiddleware, async (req, res) => {
  const users = await listUsers();
  res.render("home", { users });
});

//RUTA PARA VER LOS PAGOS DE UN USUARIO
app.get("/pagos/:telegram_id", simpleAuthMiddleware, async (req, res) => {
  const { telegram_id } = req.params;
  const { pagos, peticiones, usuario } = await getUserPayments(telegram_id);
  res.render("pagos", { pagos, peticiones, usuario });
});

//RUTA PARA VER LOS PAGOS DE UN USUARIO
app.get("/pagos", simpleAuthMiddleware, async (req, res) => {
  try {
    const paymentsData = await getPaymentsDashboard();
    res.render("pagos_list", paymentsData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al obtener los pagos");
  }
});

//BORRAR UN PAGO
app.post("/delPayment", simpleAuthMiddleware, async (req, res) => {
  const { subscripcion_id } = req.body;
  console.log(subscripcion_id);
  await deletePayment(subscripcion_id);

  if (req.accepts("json")) {
    return res.json({ ok: true });
  }
  res.redirect("/");
});

//AÑADIR UN PAGO Y EXTENDER SUSCRIPCION UN MES MAS DE LA FECHA NOW()
app.post("/pay", simpleAuthMiddleware, async (req, res) => {
  const { telegram_id, subscripcion_id } = req.body;
  await recordPayment(telegram_id, subscripcion_id);

  if (req.accepts("json")) {
    return res.json({ ok: true });
  }
  res.redirect("/");
});

//EDITAR UN PAGO
app.post("/editPayment", simpleAuthMiddleware, async (req, res) => {
  const { id, precio, fecha_pago } = req.body;
  await editPayment(id, precio, fecha_pago);

  res.json({ ok: true });
});

//ACTUALIZAR FECHA DE EXPIRACION DE SUSCRIPCION
app.post("/update-expira", simpleAuthMiddleware, async (req, res) => {
  const { id, end_date } = req.body;
  await updateExpiration(id, end_date);

  res.json({ ok: true });
});

//CREA UN USUARIO
app.post("/alta-nueva", async (req, res) => {
  console.log(req.body)
  const { telegram_id, usuario, nombre } = req.body;

  try {
    await createUser(telegram_id, usuario, nombre);

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
  await updateSubscriptionStatus(subscripcion_id, "inactivo");

  if (req.accepts("json")) {
    return res.json({ ok: true });
  }
  res.redirect("/");
});

//ACTIVAR ACCESO A UN USUARIO
app.post("/activate", simpleAuthMiddleware, async (req, res) => {
  const { subscripcion_id } = req.body;
  await updateSubscriptionStatus(subscripcion_id, "activo");

  if (req.accepts("json")) {
    return res.json({ ok: true });
  }
  res.redirect("/");
});

// ELIMINAR UN USUARIO (Y SUS PAGOS Y SUSCRIPCIONES)
app.post("/remove", simpleAuthMiddleware, async (req, res) => {
  const { telegram_id } = req.body;
  console.log(telegram_id);
  await removeUser(telegram_id);

  if (req.accepts("json")) {
    return res.json({ ok: true });
  }
  res.redirect("/");
});

//RUTA PARA VISTA DE LOGIN
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Enviar broadcast
app.post('/broadcast', async (req, res) => {
  const message = req.body.message;
  await sendBroadcast(message);

  res.redirect('/');
});

//RUTA PARA LOGIN
app.post('/login', async (req, res) => {
  return handleLogin(req, res, req.is("application/json"));
});

//RUTA PARA LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        ok: false,
        message: "No se pudo cerrar la sesión."
      });
    }
    if (req.accepts("json")) {
      return res.json({ ok: true });
    }
    res.redirect('/login');
  });
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Admin panel en https://localhost:${process.env.PORT}`);
});