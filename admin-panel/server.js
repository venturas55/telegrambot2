import express from "express";
import { engine } from "express-handlebars";
import db  from "./db.js" ;
import 'dotenv/config';
import helpers from './lib/handlebars.js';
import * as path from "path";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const app = express();

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

app.listen(3000, () => {
  console.log("🚀 Admin panel en http://localhost:3000");
});