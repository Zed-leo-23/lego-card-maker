export const THEMES = {
  space: { label: '우주', icon: '🚀', c1: '#2b1768', c2: '#7c4dff' },
  vehicle: { label: '자동차', icon: '🚗', c1: '#8e0000', c2: '#ff5252' },
  castle: { label: '성 & 기사', icon: '🏰', c1: '#8a6400', c2: '#ffd54f' },
  robot: { label: '로봇', icon: '🤖', c1: '#263238', c2: '#78909c' },
  building: { label: '건축물', icon: '🏙️', c1: '#00453c', c2: '#26a69a' },
  creature: { label: '동물 & 생물', icon: '🐉', c1: '#0d3d14', c2: '#66bb6a' },
  pirate: { label: '해적', icon: '🏴‍☠️', c1: '#1a1a1a', c2: '#607d8b' },
  other: { label: '기타 테마', icon: '🧱', c1: '#b71c1c', c2: '#fbc02d' },
};

export function rarityFor(pieces) {
  const n = Number(pieces) || 0;
  if (n >= 800) return { label: '홀로 레어', cls: 'rarity-holo' };
  if (n >= 300) return { label: '레어', cls: 'rarity-rare' };
  if (n >= 100) return { label: '언커먼', cls: 'rarity-uncommon' };
  return { label: '커먼', cls: 'rarity-common' };
}

function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** @param {object} card */
export function cardInnerHTML(card) {
  const theme = THEMES[card.theme] || THEMES.other;
  const rarity = rarityFor(card.pieces);
  const stars = Math.max(1, Math.min(5, Number(card.stars) || 1));
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  const cardNo = String(card.cardNo || 1).padStart(3, '0');

  return `
    <div class="card-inner ${rarity.cls}">
      <div class="card-header">
        <span class="card-title">${escapeHtml(card.title || '이름 없는 작품')}</span>
        <span class="card-hp">🧩 ${Number(card.pieces) || 0}</span>
      </div>
      <div class="card-art">
        ${card.artDataUrl
          ? `<img src="${card.artDataUrl}" alt="${escapeHtml(card.title || '')}" />`
          : '<div class="card-art-placeholder">이미지 없음</div>'}
      </div>
      <div class="card-type-row">
        <span class="card-badge">${theme.icon} ${theme.label}</span>
        <span class="card-stars">${starStr}</span>
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
  const theme = THEMES[card.theme] || THEMES.other;
  const el = document.createElement('div');
  el.className = 'poke-card' + (thumb ? ' poke-card--thumb' : '');
  el.style.setProperty('--c1', theme.c1);
  el.style.setProperty('--c2', theme.c2);
  el.innerHTML = cardInnerHTML(card);
  return el;
}
