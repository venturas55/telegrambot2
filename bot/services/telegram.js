import TelegramBot from 'node-telegram-bot-api';

export const initTelegram = (token) => {
  return new TelegramBot(token, {
    polling: {
      interval: 300,
      autoStart: true,
      params: {
        timeout: 10
      }
    }
  });
};