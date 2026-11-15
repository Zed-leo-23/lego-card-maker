import './style.css';
import { loadImageFromBlob, canvasToPngBlob } from './imageUtils.js';
import { computeAutoCard, ELEMENTS } from './autoStats.js';
import { saveCard, deleteCard } from './db.js';
import { subscribeToCards } from './cloudSync.js';
import { buildCardElement } from './cardView.js';

const MAX_REROLLS = 3;

const app = document.getElementById('app');

app.innerHTML = `
  <div class="app-frame" id="appFrame">
    <header class="app-frame-header">
      <h1>🧱 레고 카드메이커</h1>
      <nav class="tabs">
        <button class="tab-btn active" data-tab="create">📷</button>
        <button class="tab-btn" data-tab="gallery">내 컬렉션 <span id="galleryCount" class="count-badge">0</span></button>
      </nav>
    </header>

    <section id="tab-create" class="tab-panel active">
      <div class="creator-toolbar">
        <div class="name-field">
          <input id="fTitle" maxlength="24" placeholder="사진을 찍으면 이름이 자동으로 생겨요" />
          <button type="button" id="btnReroll" class="dice-btn-lg" disabled title="이름·능력치 다시 뽑기">
            🎲 <span id="rerollCount">${MAX_REROLLS}</span>
          </button>
        </div>
      </div>

      <div class="card-stage">
        <div id="cardPreviewMount"></div>
      </div>

      <div class="actions">
        <button id="btnSaveCard" disabled>⭐ 저장</button>
        <button id="btnDownloadPng" class="secondary" disabled>🖼️ PNG로 내보내기</button>
      </div>

      <input type="file" id="fileInput" accept="image/*" class="visually-hidden" />
    </section>

    <section id="tab-gallery" class="tab-panel">
      <div class="gallery-toolbar">
        <button id="btnSelectAll" class="secondary">전체 선택</button>
        <button id="btnPrintSelected">🖨️ 선택한 카드 인쇄</button>
        <span id="selectedCount" class="hint-text"></span>
      </div>
      <div id="galleryGrid" class="gallery-grid"></div>
      <p id="galleryEmpty" class="empty-hint">아직 저장된 카드가 없어요. 사진을 찍어서 첫 작품을 등록해보세요!</p>
    </section>
  </div>

  <div id="printSheet" class="print-sheet"></div>

  <div id="cardModal" class="card-modal" hidden>
    <div class="card-modal-backdrop" id="cardModalBackdrop"></div>
    <div class="card-modal-content">
      <button type="button" id="btnCloseModal" class="modal-close" aria-label="닫기">✕</button>
      <div id="cardModalMount"></div>
    </div>
  </div>
`;

// ---------- 상태 ----------
const state = {
  artCanvas: null, // 카드 아트로 쓸 사진 캔버스
  artDataUrl: null,
  auto: null, // computeAutoCard() 결과 {name, element, hp, atk, def, rarity}
  reroll: 0,
  rerollsLeft: MAX_REROLLS,
  selectedIds: new Set(),
};

// ---------- 탭 (하나의 프레임 안에서 내용만 바뀐다) ----------
const appFrame = document.getElementById('appFrame');
function goToTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
  appFrame.classList.toggle('app-frame--wide', tab === 'gallery');
}
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => goToTab(btn.dataset.tab));
});

// ---------- 사진 촬영/선택 (카드의 빈 이미지 영역이 버튼 역할을 한다) ----------
const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = await loadImageFromBlob(file);
  const maxW = 1000;
  const scale = Math.min(1, maxW / img.width);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  state.artCanvas = canvas;
  state.artDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  state.reroll = 0;
  state.rerollsLeft = MAX_REROLLS;

  generateAuto();
  updateRerollDisplay();

  document.getElementById('btnSaveCard').disabled = false;
  document.getElementById('btnDownloadPng').disabled = false;
});

// ---------- 이름/능력치 자동 생성 + 다시 뽑기 ----------
const fTitle = document.getElementById('fTitle');
const btnReroll = document.getElementById('btnReroll');

function generateAuto() {
  if (!state.artCanvas) return;
  const auto = computeAutoCard(state.artCanvas, { nonce: state.reroll });
  state.auto = auto;
  fTitle.value = auto.name;
  updateCardPreview();
}

function updateRerollDisplay() {
  document.getElementById('rerollCount').textContent = state.rerollsLeft;
  btnReroll.disabled = !state.artCanvas || state.rerollsLeft <= 0;
}

btnReroll.addEventListener('click', () => {
  if (!state.artCanvas || state.rerollsLeft <= 0) return;
  state.reroll += 1;
  state.rerollsLeft -= 1;
  generateAuto();
  updateRerollDisplay();
});

fTitle.addEventListener('input', updateCardPreview);

function currentCardData() {
  const auto = state.auto || {};
  return {
    title: fTitle.value,
    element: auto.element,
    hp: auto.hp,
    atk: auto.atk,
    def: auto.def,
    rarity: auto.rarity,
    date: new Date().toISOString().slice(0, 10),
    note: auto.note || '',
    artDataUrl: state.artDataUrl,
    cardNo: state.previewCardNo || 1,
  };
}

// ---------- 카드 미리보기 (이 카드 자체가 곧 편집 화면) ----------
const cardPreviewMount = document.getElementById('cardPreviewMount');

function applyCreatorTheme() {
  const element = ELEMENTS[state.auto?.element] || ELEMENTS.steel;
  appFrame.style.setProperty('--creator-c1', element.c1);
  appFrame.style.setProperty('--creator-c2', element.c2);
}

function updateCardPreview() {
  applyCreatorTheme();
  cardPreviewMount.innerHTML = '';
  const cardEl = buildCardElement(currentCardData(), { editable: true });
  const captureBtn = cardEl.querySelector('#cardArtCapture');
  if (captureBtn) captureBtn.addEventListener('click', () => fileInput.click());
  const retakeBtn = cardEl.querySelector('#cardArtRetake');
  if (retakeBtn) retakeBtn.addEventListener('click', () => fileInput.click());
  const resetBtn = cardEl.querySelector('#cardReset');
  if (resetBtn) resetBtn.addEventListener('click', resetCreator);
  const goGalleryBtn = cardEl.querySelector('#cardGoGallery');
  if (goGalleryBtn) goGalleryBtn.addEventListener('click', () => goToTab('gallery'));
  cardPreviewMount.appendChild(cardEl);
}
updateCardPreview();
updateRerollDisplay();

// ---------- 카드 확대 보기 ----------
const cardModal = document.getElementById('cardModal');
const cardModalMount = document.getElementById('cardModalMount');

function openCardModal(card) {
  cardModalMount.innerHTML = '';
  cardModalMount.appendChild(buildCardElement(card));
  cardModal.hidden = false;
}
function closeCardModal() {
  cardModal.hidden = true;
}
document.getElementById('btnCloseModal').addEventListener('click', closeCardModal);
document.getElementById('cardModalBackdrop').addEventListener('click', closeCardModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !cardModal.hidden) closeCardModal();
});

document.getElementById('btnSaveCard').addEventListener('click', async () => {
  if (!state.artDataUrl || !state.auto) return;
  const btnSaveCard = document.getElementById('btnSaveCard');
  btnSaveCard.disabled = true;
  const cardNo = latestCards.length + 1;
  const card = { id: crypto.randomUUID(), createdAt: Date.now(), cardNo, ...currentCardData() };
  try {
    await saveCard(card);
    resetCreator();
    goToTab('gallery');
  } catch (err) {
    console.error(err);
    alert(`저장에 실패했어요. 인터넷 연결을 확인해주세요.\n(${err.message || err})`);
    btnSaveCard.disabled = false;
  }
});

document.getElementById('btnDownloadPng').addEventListener('click', async () => {
  if (!state.artCanvas) return;
  const blob = await canvasToPngBlob(state.artCanvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fTitle.value || 'lego-card'}.png`;
  a.click();
  URL.revokeObjectURL(url);
});

function resetCreator() {
  state.artCanvas = null;
  state.artDataUrl = null;
  state.auto = null;
  state.reroll = 0;
  state.rerollsLeft = MAX_REROLLS;
  fileInput.value = '';
  fTitle.value = '';
  document.getElementById('btnSaveCard').disabled = true;
  document.getElementById('btnDownloadPng').disabled = true;
  updateRerollDisplay();
  updateCardPreview();
}

// ---------- 갤러리 (Firestore 실시간 구독 - 다른 기기에서 저장해도 자동 반영) ----------
const galleryGrid = document.getElementById('galleryGrid');
const galleryEmpty = document.getElementById('galleryEmpty');
const galleryCount = document.getElementById('galleryCount');
const selectedCountEl = document.getElementById('selectedCount');

let latestCards = [];

function renderGalleryFromCache() {
  const cards = latestCards;
  galleryGrid.innerHTML = '';
  galleryCount.textContent = cards.length;
  galleryEmpty.hidden = cards.length !== 0;

  cards.forEach((card) => {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'gallery-checkbox';
    checkbox.checked = state.selectedIds.has(card.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selectedIds.add(card.id);
      else state.selectedIds.delete(card.id);
      updateSelectedCount();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'gallery-delete';
    delBtn.textContent = '🗑️';
    delBtn.title = '삭제';
    delBtn.addEventListener('click', async () => {
      if (!confirm('이 카드를 컬렉션에서 삭제할까요?')) return;
      try {
        await deleteCard(card.id);
        state.selectedIds.delete(card.id);
      } catch (err) {
        console.error(err);
        alert(`삭제에 실패했어요.\n(${err.message || err})`);
      }
    });

    const cardEl = buildCardElement(card, { thumb: true });
    cardEl.classList.add('clickable-card');
    cardEl.addEventListener('click', () => openCardModal(card));

    wrap.appendChild(checkbox);
    wrap.appendChild(delBtn);
    wrap.appendChild(cardEl);
    galleryGrid.appendChild(wrap);
  });
  updateSelectedCount();
}

function updateSelectedCount() {
  selectedCountEl.textContent = state.selectedIds.size
    ? `${state.selectedIds.size}장 선택됨`
    : '';
}

subscribeToCards(
  (cards) => {
    latestCards = cards;
    renderGalleryFromCache();
  },
  (err) => {
    console.error(err);
    galleryEmpty.hidden = false;
    galleryEmpty.textContent = `⚠️ 카드 서버에 연결할 수 없어요. (${err.message || err})`;
  }
);

document.getElementById('btnSelectAll').addEventListener('click', () => {
  if (state.selectedIds.size === latestCards.length) {
    state.selectedIds.clear();
  } else {
    latestCards.forEach((c) => state.selectedIds.add(c.id));
  }
  renderGalleryFromCache();
});

// ---------- 인쇄 ----------
const printSheet = document.getElementById('printSheet');

document.getElementById('btnPrintSelected').addEventListener('click', () => {
  const target = state.selectedIds.size
    ? latestCards.filter((c) => state.selectedIds.has(c.id))
    : latestCards;
  if (!target.length) {
    alert('인쇄할 카드가 없어요. 컬렉션에 카드를 먼저 저장해주세요.');
    return;
  }
  printSheet.innerHTML = '';
  target.forEach((card) => {
    const cell = document.createElement('div');
    cell.className = 'print-cell';
    cell.appendChild(buildCardElement(card));
    printSheet.appendChild(cell);
  });
  requestAnimationFrame(() => window.print());
});

