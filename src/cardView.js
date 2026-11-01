import { ELEMENTS, RARITY_LABELS } from './autoStats.js';

function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** @param {object} card */
export function cardInnerHTML(card) {
  const element = ELEMENTS[card.element] || ELEMENTS.steel;
  const rarity = RARITY_LABELS[card.rarity] || RARITY_LABELS.common;
  const cardNo = String(card.cardNo || 1).padStart(3, '0');

  return `
    <div class="card-inner ${rarity.cls}">
      <div class="card-header">
        <span class="card-title">${escapeHtml(card.title || '이름 없는 작품')}</span>
        <span class="card-hp">${element.icon} HP ${card.hp ?? 0}</span>
      </div>
      <div class="card-art">
        ${card.artDataUrl
          ? `<img src="${card.artDataUrl}" alt="${escapeHtml(card.title || '')}" />`
          : '<div class="card-art-placeholder">이미지 없음</div>'}
      </div>
      <div class="card-stat-row">
        <span class="card-stat atk">⚔ ${card.atk ?? 0}</span>
        <span class="card-stat def">🛡 ${card.def ?? 0}</span>
        <span class="card-badge">${element.icon} ${element.label}</span>
      </div>
      <div class="card-note-box">${escapeHtml(card.note || '')}</div>
      <div class="card-footer">
        <span>${card.date || ''}</span>
        <span class="card-rarity-label">${rarity.label}</span>
        <span>No. ${cardNo}</span>
      </div>
    </div>
  `;
}

export function buildCardElement(card, { thumb = false } = {}) {
  const element = ELEMENTS[card.element] || ELEMENTS.steel;
  const el = document.createElement('div');
  el.className = 'poke-card' + (thumb ? ' poke-card--thumb' : '');
  el.style.setProperty('--c1', element.c1);
  el.style.setProperty('--c2', element.c2);
  el.innerHTML = cardInnerHTML(card);
  return el;
}
