import { fetchAllCardsOnce, pushCard, removeCard } from './cloudSync.js';

export async function getAllCards() {
  return fetchAllCardsOnce();
}

export async function saveCard(card) {
  await pushCard(card);
}

export async function deleteCard(id) {
  await removeCard(id);
}

export async function nextCardNumber() {
  const cards = await fetchAllCardsOnce();
  return cards.length + 1;
}
