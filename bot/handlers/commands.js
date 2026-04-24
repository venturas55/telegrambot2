import { HELP, mostrarPlayas, estadoUsuarios, ADMIN_ID, ruta, esperandoSugerencia } from '../config.js';
import fs from 'fs';
import db from "../services/db.js";

export const handleCommands = async (bot, msg) => {
  //console.log("MSG:",msg);
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user = [msg.from.first_name, msg.from.last_name]
    .filter(Boolean)
    .join(" ");
  const texto = msg.text;
  const estado = estadoUsuarios[userId];


  if (texto === "/general") {
    bot.sendMessage(chatId, "⏳ Procesando peticion estado general...");
    bot.sendMessage(process.env.MY_CHAT_ID, `General|${user}|${chatId}|todo`);
    return true;
  }

  if (texto === "/playa") {
    mostrarPlayas(bot, chatId);
    return true;
  }

  if (texto === "/cam") {
    return bot.sendMessage(chatId, "📡 Selecciona una cámara disponible (modo experimental):", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🌊 Patacona", url: "http://guardiandelfaro.es/cam/alboraya.html" }
          ],
          [
            { text: "🏝️ Pobla de Farnals", url: "http://guardiandelfaro.es/cam/pobla.html" }
          ],
          [
            { text: "🌅 Altea", url: "http://guardiandelfaro.es/cam/altea.html" }
          ]
        ]
      }
    });
  }

  if (texto === "/start" || texto === "/help") {
    bot.sendMessage(chatId, HELP);
    return true;
  }

  if (texto === "/precio") {
    bot.sendMessage(chatId, `${user} recuerda pagar los 4,99€ al mes.`);
    return true;
  }

  if (texto === "/log") {
    if (chatId != ADMIN_ID) {
      bot.sendMessage(chatId, "No tienes permiso para ver logs ❌");
      return true;
    }
    fs.readFile(ruta, 'utf8', (err, data) => {
      if (err) {
        bot.sendMessage(chatId, "Error leyendo logs ❌ No estará usando PM2 en el despliegue");
        return true;
      }
      bot.sendMessage(chatId, `🤖 Logs: \n${data.slice(-500)}`);
    });
    return true;
  }

  if (texto === "/avisos") {
    bot.sendMessage(chatId,
      "📝 Configuración de avisos:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Activar", callback_data: "avisos:activar" },
              { text: "❌ Desactivar", callback_data: "avisos:desactivar" }
            ],
            [
              { text: "⏰ Cambiar hora", callback_data: "avisos:cambiar_hora" }
            ]
          ]
        }
      }
    );
    return true;
  }
  // 1. ACTIVAR MODO SUGERENCIA
  if (texto === "/sugerencia") {
    estadoUsuarios[userId] = {
      ...estadoUsuarios[userId],
      modo: "hora"
    };

    bot.sendMessage(chatId, "✍️ Escribe tu sugerencia y se la enviaré al admin.");
    return true;
  }

  // 2. CAPTURAR MENSAJE SI ESTÁ EN MODO SUGERENCIA
  if (estado?.modo === "sugerencia") {
    const sugerencia = texto;

    bot.sendMessage(chatId, "✅ Sugerencia enviada. ¡Gracias!");
    bot.sendMessage(
      ADMIN_ID,
      `📩 Nueva sugerencia:\n\n👤 ${user}\n 🆔 ${userId}\n\n💬 ${sugerencia}`
    );

    delete estadoUsuarios[userId];
    return true;
  }

  //3 CAPTURAR MENSAJE SI EL USUARIO INTRODUCE UNA HORA USANDO CONFIGURACION DE ALARMAS
  if (estado?.modo === "hora") {
    // Validar formato HH:MM
    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regexHora.test(texto)) {
      bot.sendMessage(chatId, "❌ Formato inválido. Usa HH:MM (ej: 08:30)");
      return true;
    }

    // Validar múltiplo de 15 minutos
    const minutos = parseInt(texto.split(":")[1], 10);
    if (![0, 15, 30, 45].includes(minutos)) {
      bot.sendMessage(chatId, "❌ Solo se permiten ajustes cada 15 minutos: 00, 15, 30 o 45.");
      return true;
    }

    // Guardar en la DB
    await db.query(
      `INSERT INTO configuraciones (telegram_id, hora_aviso)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE hora_aviso = VALUES(hora_aviso)`,
      [userId, texto]
    );

    bot.sendMessage(chatId, `✅ Hora configurada a ${texto}`);
    delete estadoUsuarios[userId];
    return true;
  }
};