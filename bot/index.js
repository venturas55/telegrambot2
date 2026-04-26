import 'dotenv/config';
import fs from 'fs';
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import { initTelegram } from './services/telegram.js';
import {
  MY_CHAT_ID,
  ADMIN_ID,
  BOT_TOKEN,
  DIAS_VALIDOS,
  HELP,
  estadoUsuarios,
  procesarPeticion,
  logAccion,
  fetchNivelDeViento,
  mensajeViento
} from './config.js';
import { normalizar, parseInput } from './utils.js';

import { checkAccess } from './middlewares/auth.js';
import { handleCommands } from './handlers/commands.js';

import cron from "node-cron";
import db from "./services/db.js";
dayjs.locale('es');

const bot = initTelegram(BOT_TOKEN);

// ==============================================
// 💬NODE CRON PARA NOTIFICAR VENCIMIENTO PROXIMO
// ==============================================
cron.schedule('0 8 * * *', async () => {
  try {
    const [suscripciones] = await db.query(`
      SELECT telegram_id, end_date
      FROM subscripciones
      WHERE estado = 'activo' 
      AND end_date >= NOW()
      AND end_date <= DATE_ADD(NOW(), INTERVAL 5 DAY)
    `);


    const ahora = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })
    );

    //AVISOS DE EXPIRACION DE LA SUSCRIPCION
    for (const user of suscripciones) {
      const fechaFormateada = new Date(user.end_date).toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const chatId = user.telegram_id;
      const fin = new Date(user.end_date);
      if (fin <= ahora) continue;
      const diffMs = fin - ahora;
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let textoDias;
      if (diasRestantes > 1) {
        textoDias = `⏳ Faltan ${diasRestantes} días`;
      } else if (diasRestantes === 1) {
        textoDias = `⏳ Falta 1 día`;
      } else {
        textoDias = `🚨 Vence hoy`;
      }

      const mensaje = `⚠️ Tu suscripción expira pronto.\n${textoDias}\n📅 Fecha de expiración: ${fechaFormateada}\n\nRenueva para no perder acceso.`;
      try {
        await bot.sendMessage(chatId, mensaje);
      } catch (e) {
        console.warn(`No se pudo enviar a ${chatId}`);
      }
    }

    //console.log(`Avisos enviados: ${rows.length}`);
  } catch (err) {
    console.error('Error en cron:', err);
  }
});

// ==============================================
// 💬NODE CRON PARA NOTIFICAR ALARMAS
// ==============================================

cron.schedule('0,15,30,45 * * * *', async () => {
  const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const horaActual = ahora.toTimeString().slice(0, 5); // "HH:MM"

  try {
    const [configuraciones] = await db.query(`SELECT c.telegram_id,c.alarmas,c.hora_aviso,p.nombre as playa,m.nombre as modelo FROM configuraciones c LEFT JOIN playas p on c.playa_id=p.id LEFT JOIN modelos m ON m.id=c.modelo_id WHERE alarmas = 1 AND hora_aviso IS NOT NULL`);
    for (const user of configuraciones) {
      if (user.hora_aviso.slice(0, 5) === horaActual && user.alarmas) {
        const nivel = await fetchNivelDeViento(user.playa, user.modelo);
        const mensaje = mensajeViento(nivel);
        await bot.sendMessage(user.telegram_id, mensaje);
      }
    }
  } catch (err) {
    console.error('Error enviando avisos:', err);
  }
});

// ======================
// 💬 ERROR POLLING
// ======================

bot.on("polling_error", (error) => {
  if (error.code === 'ECONNRESET') {
    console.warn("⚠️ Conexion reiniciada (ECONNRESET). Reintentando...");
    return;
  }

  console.error("❌ Polling error:", error);
});
// ======================
// 💬 MENSAJES
// ======================

bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const user = msg.from.username || msg.from.first_name || "user";
  const texto = normalizar(msg.text || "");

  logAccion(user, userId, chatId, texto);
  // 🔐 middleware de acceso
  await checkAccess(bot, msg, async () => {

    // 👉 comandos
    const handled = await handleCommands(bot, msg);
    if (handled) return;

    // 👉 lógica actual
    const parsed = parseInput(texto);
    if (!parsed) {
      bot.sendMessage(chatId, HELP);
      return;
    }
    procesarPeticion(bot, userId, chatId, user, parsed.playa.toLowerCase(), parsed.dia.toLowerCase());
  });
});

// ======================
// 🔘 CALLBACK BOTONES
// ======================

bot.on('callback_query', async (query) => {
  const user = query.from.username || query.from.first_name || "user";
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const data = query.data;

  //console.log(query);

  if (data.startsWith("playa:")) {
    const playa = data.split(":")[1];

    estadoUsuarios[userId] = { playa };

    bot.editMessageText(`🏖️ Playa: ${playa}\nAhora elige día:`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: DIAS_VALIDOS.map(d => [
          { text: d, callback_data: `dia:${d}` }
        ])
      }
    });
  }

  if (data.startsWith("dia:")) {
    const dia = data.split(":")[1];
    const estado = estadoUsuarios[userId];

    if (!estado?.playa) {
      bot.sendMessage(chatId, "❌ Primero elige playa");
      return;
    }

    const playa = estado.playa;
    const nombre = [query.from.first_name, query.from.last_name].filter(Boolean).join(" ");
    // 👉 Ejecutar lógica
    procesarPeticion(bot, userId, chatId, nombre, playa, dia);

    // 👉 EDITAR el mensaje y quitar botones
    bot.editMessageText(
      `✅ Solicitud enviado\n\n🏖️ Playa: ${playa}\n📅 Día: ${dia}`,
      {
        chat_id: chatId,
        message_id: query.message.message_id
        // ❌ NO reply_markup → elimina botones
      }
    );
    logAccion(query.from.username || query.from.first_name, userId, chatId, `${estado.playa} ${dia} `);
    delete estadoUsuarios[userId];
  }

  if (data.startsWith("avisos:")) {
    const accion = data.split(":")[1];

    // ACTIVAR
    if (accion === "activar") {
      await db.query(
        `INSERT INTO configuraciones (telegram_id, alarmas)
       VALUES (?, TRUE)
       ON DUPLICATE KEY UPDATE alarmas = TRUE`,
        [userId]
      );

      bot.editMessageText("✅ Avisos activados", {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    }

    // DESACTIVAR
    if (accion === "desactivar") {
      await db.query(
        `UPDATE configuraciones SET alarmas = FALSE WHERE telegram_id = ?`,
        [userId]
      );

      bot.editMessageText("❌ Avisos desactivados", {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    }

    // CAMBIAR HORA
    if (accion === "cambiar_hora") {
      estadoUsuarios[userId] = { modo: "hora" };

      bot.sendMessage(chatId, "⏰ Escribe la hora en formato HH:MM (ej: 08:30)");
    }
  }

  bot.answerCallbackQuery(query.id);
});

// ======================
// 🚀 INIT
// ======================

//bot.sendMessage(MY_CHAT_ID, "🤖 Bot iniciado");