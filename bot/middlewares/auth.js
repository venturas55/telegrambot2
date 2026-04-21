import { getUserByTelegramId } from '../services/userService.js';
import {ADMIN_ID} from '../config.js'

export const checkAccess = async (bot, msg, next) => {
  const userId = msg.from.id;
  const first_name = msg.from.first_name;
  const last_name = msg.from.last_name;
  const chatId = msg.chat.id;
  console.log("MSG:",msg);

  try {
    const user = await getUserByTelegramId(userId);
    console.log(user);
    if (!user) {
      await bot.sendMessage(chatId, `❌ ${first_name} no estas registrado`);
      await bot.sendMessage(ADMIN_ID, ` ⚠️ El usuario ${first_name} ${last_name} con el id: ${userId} quiere tener acceso al Buscaviento_bot ⚠️`);
      return;
    }

    if (!user.has_access) {
      await bot.sendMessage(chatId, "⚠️ Suscripción no activa o expirada");
      return;
    }

    msg.dbUser = user;

    next();
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Error interno");
  }
};