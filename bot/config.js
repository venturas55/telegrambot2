//export const USERS_PERMITIDOS =  [8406513586, 8277408556, 8718113457,1946422850];
                                  //Guardian     Jorge       Robin      Nacho

export const MY_CHAT_ID = Number(process.env.MY_CHAT_ID);
export const ADMIN_ID = Number(process.env.ADMIN_ID);
export const BOT_TOKEN = process.env.BOT_TOKEN;
import moment from 'moment';
export const ruta = `${process.env.HOME}/.pm2/logs/telegramBOT-out.log`;
export const DIAS_VALIDOS = ["ayer", "hoy", "mañana"];
export const PLAYAS_VALIDAS = [
  "peñíscola", "castellon", "burriana", "canet",
  "port saplaya", "saler", "mareny", "oliva",
  "molins", "altea", "villajoyosa", "santa pola", "los narejos"
];
export const HELP = `
PONLA PONLA PONLA

Puedes escribir:
\n\t\t 👉 <Playa> <Día>\n\nEjemplo:\n\t\t👉 Mareny hoy

🤖 Comandos disponibles:
/playa → Elegir spot
/general → Estado global de playas
/avisos → Consultar avisos
/sugerencia → Enviar notificaciones
/help → Muestra esta ayuda

`;
// Estado simple por usuario. Para el envio de playa y dia
export const estadoUsuarios = {};
// Estado para envio de sugerencias al developer
export const esperandoSugerencia = new Set();

export const mostrarPlayas = (bot,chatId) => {
  bot.sendMessage(chatId, "🏖️ Elige una playa:", {
    reply_markup: {
      inline_keyboard: PLAYAS_VALIDAS.map(p => [
        { text: p, callback_data: `playa:${p}` }
      ])
    }
  });
};

export const validar = (playa, dia) => {
  if (!PLAYAS_VALIDAS.includes(playa)) {
    return `❌ La playa 🏖️ debe ser una de las siguientes:\n\tPeñíscola\n\tCastellon\n\tBurriana\n\tCanet\n\tPort saplaya\n\tSaler\n\tMareny\n\tOliva\n\tMolins\n\tAltea\n\tVillajoyosa\n\tSanta pola\n\tLos narejos`;
  }
  if (!DIAS_VALIDOS.includes(dia)) {
    return `❌ La segunda palabra debe ser el día deseado:\n\t${playa} ayer\n\t${playa} hoy\n\t${playa} mañana`;
  }
  return null;
};

// 🎯 ACCIÓN PRINCIPAL INPUT ESCRITO A MANO
export const procesarPeticion = (bot,userId,chatId, user, playa, dia) => {

  const error = validar(playa, dia);
  if (error) {
    bot.sendMessage(chatId, error);
    return;
  }
  const mensaje = `Ponla|${user}|${chatId}|${playa} ${dia}`;

  bot.sendMessage(MY_CHAT_ID, mensaje);

  bot.sendMessage(chatId, `⏳ Procesando...`);
  logAccion(user,userId, chatId, "Procesado: "+playa+" "+dia);

};

// PARA LOGAR ACCIONES
export const logAccion = (user, userId, chatId, accion) => {
  console.log(
    `[${moment(Date.now()).format("L LTS")}] \t ${user} (${userId} -${chatId} ) envió \t ${accion}`
  );
};