import { Markup } from 'telegraf';

export function getMenu() {
  return Markup.keyboard(['Новая сессия']).resize();
}

export function buttonRepeat() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Да', 'Yes'),
    Markup.button.callback('Нет', 'No'),
  ]);
}
