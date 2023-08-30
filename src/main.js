import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { code, bold } from 'telegraf/format';
import LocalSession from 'telegraf-session-local';
import config from 'config';
import { ogg } from './ogg.js';
import { openai } from './openai.js';
import { processTextToChat } from './logic.js';

import { buttonRepeat } from './markup.js';

import { getMenu } from './markup.js';

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'), {
  handlerTimeout: 900000,
});

const localSession = new LocalSession({
  database: 'sessions.json', // Файл для хранения данных сессий
  property: 'session', // Название свойства, через которое будем получать доступ к сессии (ctx.session)
  storage: LocalSession.storageFileAsync, // Используем хранение данных в файле
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2), // null & 2 для красивого форматирования JSON
    deserialize: (str) => JSON.parse(str),
  }, // Формат хранилища/базы данных (по умолчанию: JSON.stringify / JSON.parse)
  //state: { messages: [] } // Массив `messages` для хранения пользовательских сообщений
});

localSession.DB.then((DB) => {
  console.log('Current LocalSession DB:', DB.value());
  // console.log(DB.get('sessions').getById('1:1').value())
});

const INITIAL_SESSION = {};

bot.use(localSession.middleware());

bot.hears('Новая тема', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(code('Жду вашего голосового или текстового сообщения'));
});

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    code('Жду вашего голосового или текстового сообщения'),
    getMenu()
  );

  //await ctx.reply('Отправить', buttonRepeat())
});

bot.action('Yes', async (ctx) => {
  try {
    const { messages } = await localSession.getSession(
      localSession.getSessionKey(ctx)
    );
    const msg = messages[messages.length - 1];
    //console.log(messages)
    await ctx.editMessageReplyMarkup();
    await processTextToChat(ctx, msg.content);
  } catch (e) {
    console.log('Error while text repeat YES', e.message);
  }
});

bot.action('No', async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup();
  } catch (e) {
    console.log('Error while text repeat NO', e.message);
  }
});

bot.on(message('voice'), async (ctx) => {
  try {
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);

    await ctx.reply(code(`Ваш запрос: ${text}`));
    await processTextToChat(ctx, text);
  } catch (e) {
    console.log('Error while voice message', e.message);
  }
});

bot.on(message('text'), async (ctx, next) => {
  try {
    await processTextToChat(ctx, ctx.message.text);
  } catch (e) {
    console.log('Error while text message', e.message);
  }
  return next();
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
