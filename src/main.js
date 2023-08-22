import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import LocalSession from 'telegraf-session-local';
import config from 'config';
import { ogg } from './ogg.js';
import { openai } from './openai.js';

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

const localSession = new LocalSession({
  database: 'sessions.json', // Файл для хранения данных сессий
  property: 'session', // Название свойства, через которое будем получать доступ к сессии (ctx.session)
  storage: LocalSession.storageFileAsync, // Используем хранение данных в файле
});

const INITIAL_SESSION = {};

bot.use(localSession.middleware());

function getMenu() {
  return Markup.keyboard(['Новая тема']).resize();
}


bot.hears('Новая тема', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(code('Жду Вашего голосового или текстового сообщения'));
});

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    code('Жду Вашего голосового или текстового сообщения'),
    getMenu()
  );
});

bot.on(message('voice'), async (ctx) => {
  // Получаем текущий контекст сессии для текущего пользователя
  const session = ctx.session;

  // Добавляем новое сообщение в контекст сессии
  session.messages = session.messages || []; // Создаем массив, если его нет
  try {
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);

    await ctx.reply(code(`Ваш запрос: ${text}`));
    const { chat, message_id } = await ctx.reply(
      code('Сообщение принял. Жду ответ от сервера...')
    );

    session.messages.push({
      role: openai.roles.USER,
      content: text,
    });

    const response = await openai.chat(ctx.session.messages);

    session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });
    ctx.session = session;

    await ctx.telegram.editMessageText(
      chat.id,
      message_id,
      undefined,
      response.content
    );
    //await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while voice message', e.message);
  }
});

bot.on(message('text'), async (ctx) => {
  const message = ctx.message.text;

  // Получаем текущий контекст сессии для текущего пользователя
  const session = ctx.session;

  // Добавляем новое сообщение в контекст сессии
  session.messages = session.messages || []; // Создаем массив, если его нет
  try {
    const { chat, message_id } = await ctx.reply(
      code('Сообщение принял. Жду ответ от сервера...')
    );

    session.messages.push({
      role: openai.roles.USER,
      content: message,
    });

    const response = await openai.chat(session.messages);

    session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });

    ctx.session = session;

    await ctx.telegram.editMessageText(
      chat.id,
      message_id,
      undefined,
      response.content
    );
    //await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while text message', e.message);
    console.log(ctx);
  }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
