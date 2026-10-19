import express from "express";
import db from "./db.js";
import { bot } from "./services/telegram.js";

export const apiRouter = express.Router();

export async function isAdminUser(username) {
  const [rows] = await db.query(
    "SELECT 1 FROM usuarios WHERE username=? AND privilegios='admin' LIMIT 1",
    [username]
  );
  return rows.length > 0;
}

export async function listUsers() {
  const [users] = await db.query(`
    SELECT
      u.telegram_id,
      u.username,
      u.nombre,
      s.estado,
      s.id AS subscripcion_id,
      CASE
        WHEN s.end_date >= NOW() and s.estado='activo' THEN 'true'
        ELSE 'false'
      END AS has_access,
      s.start_date,
      s.end_date
    FROM usuarios u
    LEFT JOIN subscripciones s
      ON u.telegram_id = s.telegram_id
    ORDER BY s.start_date
  `);
  return users;
}

export async function getUserPayments(telegramId) {
  const [pagos] = await db.query(
    "SELECT * FROM pagos WHERE telegram_id=?",
    [telegramId]
  );
  const [peticiones] = await db.query(
    "SELECT * FROM peticiones WHERE telegram_id=?",
    [telegramId]
  );
  const [[usuario]] = await db.query(
    "SELECT * FROM usuarios WHERE telegram_id=?",
    [telegramId]
  );
  return { pagos, peticiones, usuario };
}

export async function getPaymentsDashboard() {
  const [pagos] = await db.query(`
    SELECT *
    FROM pagos p
    LEFT JOIN usuarios u ON p.telegram_id = u.telegram_id
  `);
  const [[stats]] = await db.query(`
    SELECT
      COUNT(*) AS num_pagos,
      SUM(precio) AS total_pagos,
      MIN(fecha_pago) AS primera_fecha,
      MAX(fecha_pago) AS ultima_fecha,
      TIMESTAMPDIFF(
        MONTH,
        DATE_FORMAT(MIN(fecha_pago), '%Y-%m-01'),
        DATE_FORMAT(MAX(fecha_pago), '%Y-%m-01')
      ) + 1 AS meses
    FROM pagos;
  `);
  const [peticiones] = await db.query(`
    SELECT *
    FROM peticiones p
    LEFT JOIN usuarios u ON p.telegram_id=u.telegram_id
    ORDER BY p.fecha DESC
  `);

  return {
    pagos,
    totalPagos: stats.total_pagos || 0,
    meses: stats.meses || 0,
    primeraFecha: stats.primera_fecha,
    ultimaFecha: stats.ultima_fecha,
    numPagos: stats.num_pagos || 0,
    gastos: (stats.meses || 0) * 25,
    peticiones
  };
}

export async function deletePayment(id) {
  await db.query("DELETE FROM pagos WHERE id=?", [id]);
}

export async function recordPayment(telegramId, subscriptionId) {
  await db.query(`
    INSERT INTO pagos (telegram_id, subscripcion_id, precio, fecha_pago)
    VALUES (?, ?, 5, NOW())
  `, [telegramId, subscriptionId]);
  await db.query(`
    UPDATE subscripciones
    SET estado='activo',
        end_date=DATE_ADD(end_date, INTERVAL 1 MONTH)
    WHERE id=?
  `, [subscriptionId]);
}

export async function editPayment(id, precio, fechaPago) {
  await db.query(`
    UPDATE pagos
    SET precio = ?, fecha_pago = ?
    WHERE id = ?
  `, [precio, fechaPago, id]);
}

export async function updateExpiration(id, endDate) {
  await db.query(`
    UPDATE subscripciones
    SET end_date = ?
    WHERE id = ?
  `, [endDate, id]);
}

export async function createUser(telegramId, username, nombre) {
  await db.query(`
    INSERT INTO usuarios (telegram_id, username, nombre, fecha_alta)
    VALUES (?, ?, ?, NOW())
  `, [telegramId, username, nombre]);
  await db.query(`
    INSERT INTO subscripciones (telegram_id, estado, start_date, end_date)
    VALUES (?,'inactivo',NOW(),NOW())
  `, [telegramId]);
}

export async function updateSubscriptionStatus(id, estado) {
  await db.query(`
    UPDATE subscripciones
    SET estado=?
    WHERE id=?
  `, [estado, id]);
}

export async function removeUser(telegramId) {
  await db.query("DELETE FROM pagos WHERE telegram_id=?", [telegramId]);
  await db.query("DELETE FROM subscripciones WHERE telegram_id=?", [telegramId]);
  await db.query("DELETE FROM usuarios WHERE telegram_id=?", [telegramId]);
}

export async function sendBroadcast(message) {
  const [users] = await db.query(`
    SELECT u.telegram_id
    FROM usuarios u
    INNER JOIN subscripciones s
      ON u.telegram_id = s.telegram_id
    WHERE s.estado = 'activo'
      AND s.end_date > NOW()
  `);

  for (const user of users) {
    const chatId = user.telegram_id;
    try {
      await bot.sendMessage(chatId, message);
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.log(`Error con ${chatId}`);
      if (error.response?.statusCode === 403) {
        await db.query("DELETE FROM usuarios WHERE telegram_id = ?", [chatId]);
      }
    }
  }
}

apiRouter.get("/users", async (_req, res) => {
  res.json(await listUsers());
});

apiRouter.get("/users/:telegram_id/payments", async (req, res) => {
  res.json(await getUserPayments(req.params.telegram_id));
});

apiRouter.get("/payments", async (_req, res) => {
  res.json(await getPaymentsDashboard());
});

apiRouter.delete("/payments/:id", async (req, res) => {
  await deletePayment(req.params.id);
  res.json({ ok: true });
});

apiRouter.post("/payments", async (req, res) => {
  const { telegram_id, subscripcion_id } = req.body;
  await recordPayment(telegram_id, subscripcion_id);
  res.json({ ok: true });
});

apiRouter.patch("/payments/:id", async (req, res) => {
  const { precio, fecha_pago } = req.body;
  await editPayment(req.params.id, precio, fecha_pago);
  res.json({ ok: true });
});

apiRouter.patch("/subscriptions/:id/expiration", async (req, res) => {
  await updateExpiration(req.params.id, req.body.end_date);
  res.json({ ok: true });
});

apiRouter.patch("/subscriptions/:id/activate", async (req, res) => {
  await updateSubscriptionStatus(req.params.id, "activo");
  res.json({ ok: true });
});

apiRouter.patch("/subscriptions/:id/revoke", async (req, res) => {
  await updateSubscriptionStatus(req.params.id, "inactivo");
  res.json({ ok: true });
});

apiRouter.post("/users", async (req, res) => {
  const { telegram_id, usuario, nombre } = req.body;
  await createUser(telegram_id, usuario, nombre);
  res.json({ ok: true, message: "Usuario creado correctamente" });
});

apiRouter.delete("/users/:telegram_id", async (req, res) => {
  await removeUser(req.params.telegram_id);
  res.json({ ok: true });
});

apiRouter.post("/broadcast", async (req, res) => {
  await sendBroadcast(req.body.message);
  res.json({ ok: true });
});

apiRouter.use((error, _req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }
  res.status(500).json({ ok: false, message: "Error interno de la API." });
});
