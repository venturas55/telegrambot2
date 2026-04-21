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

dayjs.locale('es');

const bot = initTelegram(BOT_TOKEN);

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
    procesarPeticion(bot, userId, chatId, user, parsed.playa.toLowerCase(),      parsed.dia.toLowerCase());
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

    // 👉 Ejecutar lógica
    procesarPeticion(bot, userId, chatId, query.from.first_name + " " + query.from.last_name, playa, dia);

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