import express from "express";
import { engine } from "express-handlebars";
import  session from 'express-session';
import db  from "./db.js" ;
import 'dotenv/config';
import helpers from './lib/handlebars.js';
import {simpleAuthMiddleware} from './lib/funciones.js';
import * as path from "path";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const app = express();
// Credenciales "a capón"
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;

app.use((express.static(path.join(__dirname,"public"))));
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

/**
 * LISTADO PRINCIPAL
 */

app.get("/", async (req, res) => {
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

/**
 * REGISTRAR PAGO + EXTENDER SUBSCRIPCION
 */
app.post("/pay", async (req, res) => {
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

app.post("/revoke", async (req, res) => {
  const { subscripcion_id } = req.body;

  await db.query(`
    UPDATE subscripciones
    SET estado='inactivo'
    WHERE id=?
  `, [subscripcion_id]);

  res.redirect("/");
});

app.post("/activate", async (req, res) => {
  const { subscripcion_id } = req.body;

  await db.query(`
    UPDATE subscripciones
    SET estado='activo'
    WHERE id=?
  `, [subscripcion_id]);

  res.redirect("/");
});


//rutras para login
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === AUTH_USER && password === AUTH_PASS) {
        req.session.isAuthenticated = true;
        return res.redirect('/');
    }

    res.render('login', { error: 'Credenciales incorrectas' });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});


app.listen(3000, () => {
  console.log("🚀 Admin panel en http://localhost:3000");
});