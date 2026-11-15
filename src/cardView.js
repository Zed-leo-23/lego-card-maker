import { ELEMENTS, RARITY_LABELS } from './autoStats.js';

function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** @param {object} card */
export function cardInnerHTML(card, { editable = false } = {}) {
  const element = ELEMENTS[card.element] || ELEMENTS.steel;
  const rarity = RARITY_LABELS[card.rarity] || RARITY_LABELS.common;
  const cardNo = String(card.cardNo || 1).padStart(3, '0');
  const hasPhoto = Boolean(card.artDataUrl);

  const artContent = card.artDataUrl
    ? `<img src="${card.artDataUrl}" alt="${escapeHtml(card.title || '')}" />` +
      (editable ? '<button type="button" class="card-art-retake" id="cardArtRetake" title="다시 촬영">🔄</button>' : '')
    : editable
      ? `<button type="button" class="card-art-capture" id="cardArtCapture">
          <span class="capture-icon">📷</span>
          <span>탭해서 촬영 / 선택</span>
        </button>`
      : '<div class="card-art-placeholder">이미지 없음</div>';

  return `
    <div class="card-inner ${rarity.cls}">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">${escapeHtml(card.title || '이름 없는 작품')}</span>
          ${editable ? '<button type="button" class="card-mini-btn" id="cardReset" title="새로 시작">↺</button>' : ''}
        </div>
        <div class="card-header-right">
          <span class="card-hp">${element.icon} HP ${card.hp ?? 0}</span>
          ${editable ? '<button type="button" class="card-mini-btn" id="cardGoGallery" title="카드 목록">🗂️</button>' : ''}
          ${editable ? `<button type="button" class="card-mini-btn card-mini-btn--wide" id="cardReroll" ${(!hasPhoto || (card.rerollsLeft ?? 0) <= 0) ? 'disabled' : ''} title="이름·능력치 다시 뽑기">🎲<span class="mini-count">${card.rerollsLeft ?? 0}</span></button>` : ''}
        </div>
      </div>
      <div class="card-art">
        ${artContent}
      </div>
      <div class="card-stat-row">
        <span class="card-stat atk">⚔ ${card.atk ?? 0}</span>
        <span class="card-stat def">🛡 ${card.def ?? 0}</span>
        <span class="card-badge">${element.icon} ${element.label}</span>
      </div>
      <div class="card-note-box">${escapeHtml(card.note || '')}</div>
      <div class="card-footer">
        ${editable ? `<button type="button" class="card-mini-btn card-mini-btn--footer" id="cardSave" ${hasPhoto ? '' : 'disabled'} title="저장">⭐</button>` : ''}
        <div class="card-footer-info">
          <span>${card.date || ''}</span>
          <span class="card-rarity-label">${rarity.label}</span>
          <span>No. ${cardNo}</span>
        </div>
        ${editable ? `<button type="button" class="card-mini-btn card-mini-btn--footer" id="cardExportPng" ${hasPhoto ? '' : 'disabled'} title="PNG로 내보내기">🖼️</button>` : ''}
      </div>
    </div>
  `;
}

export function buildCardElement(card, { thumb = false, editable = false } = {}) {
  const element = ELEMENTS[card.element] || ELEMENTS.steel;
  const el = document.createElement('div');
  el.className = 'poke-card' + (thumb ? ' poke-card--thumb' : '');
  el.style.setProperty('--c1', element.c1);
  el.style.setProperty('--c2', element.c2);
  el.innerHTML = cardInnerHTML(card, { editable });
  return el;
}
