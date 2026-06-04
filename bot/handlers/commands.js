import { HELP, mostrarPlayas, estadoUsuarios, ADMIN_ID, ruta, esperandoSugerencia } from '../config.js';
import fs from 'fs';
import db from "../services/db.js";
import { getOpcUaData, degreesToDirection } from "../services/getopcuaData.js";

export const handleCommands = async (bot, msg) => {
  //console.log("MSG:", msg);
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
            { text: "🏝️ Canet", url: "http://guardiandelfaro.es/cam/canet.html" }
          ],
          [
            { text: "🪨 Pobla de Farnals", url: "http://guardiandelfaro.es/cam/pobla.html" }
          ],
          [
            { text: "🌊 Patacona", url: "http://guardiandelfaro.es/cam/alboraya.html" }
          ],
          [
            { text: "🏄‍♂️ Arenas", url: "http://guardiandelfaro.es/cam/arenas.html" }
          ],
          [
            { text: "🫒 Oliva", url: "http://guardiandelfaro.es/cam/oliva.html" }
          ]
          ,
          [
            { text: "🌅 Altea", url: "http://guardiandelfaro.es/cam/altea.html" }
          ],
          [
            { text: "🪢 Santa Pola", url: "http://guardiandelfaro.es/cam/santapola.html" }
          ]
        ]
      }
    });
  }

  if (texto === "/start" || texto === "/help") {
    bot.sendMessage(chatId, HELP);
    return true;
  }
  if (texto === "/suscripcion") {
    const [rows] = await db.query(
      `SELECT * FROM subscripciones WHERE telegram_id = ?`,
      [userId]
    );

    const suscripcion = rows[0];

    const fecha = suscripcion.end_date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const hora = suscripcion.end_date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    });

    if (!suscripcion) {
      await bot.sendMessage(
        chatId,
        "No tienes ninguna suscripción activa. Contacta con el administrador"
      );
      return true;
    }

    await bot.sendMessage(
      chatId,
      `Tu suscripción estará activa hasta el ${fecha} a las ${hora}.\n\n${user}, si deseas seguir disfrutando del servicio, puedes renovarla por 4,99 €.`
    );

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
      bot.sendMessage(chatId, `🤖 Logs: \n${data.slice(-600)}`);
    });
    return true;
  }

  if (texto === "/estaciones") {
    const valor = await getOpcUaData();
    let viento_valencia = (valor[0].velocidad_media_viento * 3.6 / 1.852).toFixed(1);
    let viento_sagunto = (valor[1].velocidad_media_viento * 3.6 / 1.852).toFixed(1);
    let viento_gandia = (valor[2].velocidad_media_viento * 3.6 / 1.852).toFixed(1);
    let dir_valencia = degreesToDirection(valor[0].direccion_viento);
    let dir_sagunto = degreesToDirection(valor[1].direccion_viento);
    let dir_gandia = degreesToDirection(valor[2].direccion_viento);

    return bot.sendMessage(chatId, "📡 Selecciona una estación", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: `Sagunto - ${viento_sagunto}knots ${dir_sagunto}`, url: "http://guardiandelfaro.es/viento#2" }
          ],
          [
            { text: `Valencia - ${viento_valencia}knots ${dir_valencia}`, url: "http://guardiandelfaro.es/viento#1" }
          ],
          [
            { text: `Gandia - ${viento_gandia}knots ${dir_gandia}`, url: "http://guardiandelfaro.es/viento#3" }
          ]
        ]
      }
    });
    return true;
  }

  if (texto === "/avisos") {
    let [configuracion] = await db.query(`SELECT * FROM  configuraciones where telegram_id=?`, [userId]);
    configuracion = configuracion[0];
    let texto;
    let botones;
    let hora = (configuracion.hora_aviso).substr(0, 5)
    if (configuracion.alarmas) {
      texto = `📝 Tienes la configuración de avisos activada a las ${hora}`;
      botones = [
        [
          { text: "❌ Desactivar", callback_data: "avisos:desactivar" }
        ],
        [
          { text: "⏰ Cambiar hora", callback_data: "avisos:cambiar_hora" }
        ]
      ]
    } else {
      texto = `📝 Tienes la configuración de avisos desactivada`;
      botones = [
        [
          { text: "✅ Activar", callback_data: "avisos:activar" },
        ],
        [
          { text: "⏰ Cambiar hora", callback_data: "avisos:cambiar_hora" }
        ]
      ]
    }

    bot.sendMessage(chatId,
      texto,
      {
        reply_markup: {
          inline_keyboard: botones
        }
      }
    );
    return true;
  }


  // 1. ACTIVAR MODO SUGERENCIA
  if (texto === "/sugerencia") {
    estadoUsuarios[userId] = {
      ...estadoUsuarios[userId],
      modo: "sugerencia"
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