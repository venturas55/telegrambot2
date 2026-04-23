import TelegramBot from 'node-telegram-bot-api';
const BOT_TOKEN = process.env.BOT_TOKEN;
const initTelegram = (token) => {
  return new TelegramBot(token);
};

export const bot = initTelegram(BOT_TOKEN);
