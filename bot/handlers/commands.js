import { HELP, mostrarPlayas, ADMIN_ID, ruta, esperandoSugerencia } from '../config.js';
import fs from 'fs';

export const handleCommands = (bot, msg) => {
  //console.log("MSG:",msg);
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user = msg.from.first_name + msg.from.last_name;
  const texto = msg.text;

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
      bot.sendMessage(chatId, `🤖 Logs: \n${data.slice(-300)}`);
    });
    return true;
  }

  if (texto === "/avisos") {
    bot.sendMessage(chatId, " Aqui podrás consultar los \n\t📝 avisos 📝 \nrelevantes sobre el funcionamiento de la app");
    return true;
  }

  // 1. ACTIVAR MODO SUGERENCIA
  if (texto === "/sugerencia") {
    esperandoSugerencia.add(userId);

    bot.sendMessage(chatId, "✍️ Escribe tu sugerencia y se la enviaré al admin.");
    return true;
  }

  // 2. CAPTURAR MENSAJE SI ESTÁ EN MODO SUGERENCIA
  if (esperandoSugerencia.has(userId)) {
    esperandoSugerencia.delete(userId);
    const sugerencia = texto;
    bot.sendMessage(chatId, "✅ Sugerencia enviada. ¡Gracias!");
    bot.sendMessage(
      ADMIN_ID,
      `📩 Nueva sugerencia:\n\n👤 ${user}\n 🆔 ${userId}\n\n💬 ${sugerencia}`
    );
    return true;
  }
};