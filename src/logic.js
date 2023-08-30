import { code, italic } from 'telegraf/format';
import { openai } from './openai.js';
import { buttonRepeat } from './markup.js';

export async function processTextToChat(ctx, content) {
  ctx.session.messages = ctx.session.messages || [];

  try {
    const { chat, message_id } = await ctx.reply(
      code('Сообщение принял. Жду ответ от сервера...')
    );

    ctx.session.messages.push({
      role: openai.roles.USER,
      content: content,
    });

    const responseGPT = await openai.chat(ctx.session.messages);

    console.log(responseGPT);
    if (!responseGPT.status) {
      if (responseGPT.finishReason === openai.finishReason.STOP) {
        ctx.session.messages.push({
          role: openai.roles.ASSISTANT,
          content: responseGPT.message,
        });
        await ctx.telegram.editMessageText(
          chat.id,
          message_id,
          undefined,
          responseGPT.message
        );
      }
      if (responseGPT.finishReason === openai.finishReason.LENGTH) {
        ctx.session.messages.push({
          role: openai.roles.ASSISTANT,
          content: responseGPT.message,
        });
        await ctx.telegram.editMessageText(
          chat.id,
          message_id,
          undefined,
          responseGPT.message
        );
        await ctx.reply(
          italic(
            '❌ Oops! Мы превысили лимит длинны сессии, но это лишь повод начать новую беседу. 😊 Можешь попробовать создать новый диалог, указав более короткие фразы или уточнив ваш запрос'
          )
        );
      }
    } else {
      if (responseGPT.status >= 500) {
        await ctx.telegram.editMessageText(
          chat.id,
          message_id,
          undefined,
          italic(
            '⚠️ Oops! Возникли проблемы с моим разумом. Моя творческая инспирация пока в отпуске. Пожалуйста, попробуй еще раз позже. 😊'
          ),
          buttonRepeat()
        );
      } else {
        await ctx.telegram.editMessageText(
          chat.id,
          message_id,
          undefined,
          italic(
            `⚠️ Oops! Что-то пошло не так и я получил код ошибки ${responseGPT.status}. Пожалуйста, попробуй еще раз или создайте новую сессию. 😊`
          ),
          buttonRepeat()
        );
      }
    }
  } catch (e) {
    console.log('Error while proccesing text to gpt', e.message);
  }
}
