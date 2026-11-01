import { get, set } from 'idb-keyval';

const KEY = 'lego-cards-v1';

export async function getAllCards() {
  const cards = await get(KEY);
  return cards || [];
}

export async function saveCard(card) {
  const cards = await getAllCards();
  cards.unshift(card);
  await set(KEY, cards);
  return cards;
}

export async function deleteCard(id) {
  const cards = await getAllCards();
  const next = cards.filter((c) => c.id !== id);
  await set(KEY, next);
  return next;
}

export async function nextCardNumber() {
  const cards = await getAllCards();
  return cards.length + 1;
}
