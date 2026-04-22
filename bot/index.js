import 'dotenv/config';
import fs from 'fs';
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import { initTelegram } from './services/telegram.js';
import {
  MY_CHAT_ID,
  BOT_TOKEN,
  DIAS_VALIDOS,
  HELP,
  estadoUsuarios,
  procesarPeticion,
  logAccion
} from './config.js';
import { normalizar, parseInput } from './utils.js';

import { checkAccess } from './middlewares/auth.js';
import { handleCommands } from './handlers/commands.js';

import cron from "node-cron";
import pool from "./services/db.js";
dayjs.locale('es');

const bot = initTelegram(BOT_TOKEN);

// ==============================================
// 💬NODE CRON PARA NOTIFICAR VENCIMIENTO PROXIMO
// ==============================================
cron.schedule('0 8 * * *', async () => {
  try {
    const [rows] = await pool.query(`
      SELECT telegram_id, end_date
      FROM subscripciones
      WHERE estado = 'activo' 
      AND end_date >= NOW()
      AND end_date <= DATE_ADD(NOW(), INTERVAL 5 DAY)
    `);

    const ahora = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })
    );
    
    for (const user of rows) {
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

    console.log(`Avisos enviados: ${rows.length}`);
  } catch (err) {
    console.error('Error en cron:', err);
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
    const handled = handleCommands(bot, msg);
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

bot.on('callback_query', (query) => {
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
      `✅ Pedido enviado\n\n🏖️ Playa: ${playa}\n📅 Día: ${dia}`,
      {
        chat_id: chatId,
        message_id: query.message.message_id
        // ❌ NO reply_markup → elimina botones
      }
    );
    logAccion(query.from.username || query.from.first_name, userId, chatId, `${estado.playa} ${dia} `);
    delete estadoUsuarios[userId];
  }

  bot.answerCallbackQuery(query.id);
});

// ======================
// 🚀 INIT
// ======================

//bot.sendMessage(MY_CHAT_ID, "🤖 Bot iniciado");