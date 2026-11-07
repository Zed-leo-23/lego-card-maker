import './style.css';
import { loadImageFromBlob, canvasToPngBlob } from './imageUtils.js';
import { computeAutoCard, ELEMENTS, RARITY_LABELS, rollStat, rarityForPower } from './autoStats.js';
import { getAllCards, saveCard, deleteCard, nextCardNumber } from './db.js';
import { buildCardElement } from './cardView.js';
import { simpleRemoveBackground } from './simpleBgRemoval.js';
import { floodErase, floodRestore } from './retouch.js';

const AI_BG_REMOVAL_DISABLED_KEY = 'lego-card-ai-bg-removal-disabled';

const app = document.getElementById('app');

app.innerHTML = `
  <header class="topbar">
    <h1>🧱 레고 카드메이커</h1>
    <p class="subtitle">부수기 전에, 작품을 포켓몬 카드처럼 영원히 간직하세요</p>
    <nav class="tabs">
      <button class="tab-btn active" data-tab="create">카드 만들기</button>
      <button class="tab-btn" data-tab="gallery">내 컬렉션 <span id="galleryCount" class="count-badge">0</span></button>
    </nav>
  </header>

  <main>
    <section id="tab-create" class="tab-panel active">
      <ol class="wizard">
        <li class="step" id="step-upload">
          <h2><span class="step-num">1</span> 작품 사진 올리기</h2>
          <p class="step-hint">배경이 단순한 곳(바닥, 책상)에서 밝게 찍으면 잘라내기가 더 잘 돼요.</p>
          <button type="button" id="btnChoosePhoto" class="file-btn">📷 사진 선택 / 촬영</button>
          <input type="file" id="fileInput" accept="image/*" class="visually-hidden" />
          <div class="preview-box">
            <canvas id="originalCanvas"></canvas>
            <p id="uploadHint" class="empty-hint">아직 사진이 없어요</p>
          </div>
        </li>

        <li class="step" id="step-bg">
          <h2><span class="step-num">2</span> 배경 제거 (누끼컷)</h2>
          <button id="btnRemoveBg" disabled>✂️ 배경 제거하기</button>
          <p id="bgStatus" class="step-hint"></p>
          <div class="preview-box checker">
            <canvas id="bgCanvas"></canvas>
          </div>
          <div class="retouch-tools" id="retouchTools" hidden>
            <div class="retouch-row">
              <button type="button" id="modeErase" class="mode-btn active">🧽 지우기</button>
              <button type="button" id="modeRestore" class="mode-btn">↩️ 복원</button>
              <button type="button" id="btnUndo" class="secondary" disabled>되돌리기</button>
            </div>
            <label class="retouch-tolerance-label">
              민감도
              <input type="range" id="retouchTolerance" min="10" max="90" value="32" />
            </label>
            <p class="step-hint">남은 배경을 탭하면 지워져요. 잘못 지워졌으면 '복원'을 누르고 탭하세요. 누른 채로 끌면 선을 따라 지울 수 있어요.</p>
          </div>
        </li>

        <li class="step" id="step-card">
          <h2><span class="step-num">3</span> 카드 완성하기</h2>
          <p class="step-hint">사진을 분석해서 이름과 능력치를 자동으로 만들어드려요. 마음에 안 들면 다시 뽑기를 눌러보세요.</p>

          <div class="finish-layout">
            <form id="cardForm" class="card-form">
              <label class="full">
                작품 이름
                <div class="name-row">
                  <input id="fTitle" maxlength="24" placeholder="사진을 분석하면 자동으로 채워져요" disabled />
                  <button type="button" id="btnReroll" class="secondary" disabled>🎲 다시 뽑기</button>
                </div>
              </label>

              <div class="auto-stats" id="autoStats" hidden>
                <span class="auto-stat" id="statElement"></span>
                <span class="auto-stat stat-with-dice">
                  ❤️ HP <b id="statHp"></b>
                  <button type="button" class="dice-btn" data-stat="hp" title="HP 다시 굴리기">🎲<small id="rerollHp">5</small></button>
                </span>
                <span class="auto-stat stat-with-dice">
                  ⚔ ATK <b id="statAtk"></b>
                  <button type="button" class="dice-btn" data-stat="atk" title="ATK 다시 굴리기">🎲<small id="rerollAtk">5</small></button>
                </span>
                <span class="auto-stat stat-with-dice">
                  🛡 DEF <b id="statDef"></b>
                  <button type="button" class="dice-btn" data-stat="def" title="DEF 다시 굴리기">🎲<small id="rerollDef">5</small></button>
                </span>
                <span class="auto-stat" id="statRarity"></span>
              </div>

              <label>제작일
                <input id="fDate" type="date" disabled />
              </label>
              <label class="full">
                카드 설명
                <div class="name-row">
                  <textarea id="fNote" maxlength="120" rows="2" placeholder="사진을 분석하면 자동으로 채워져요" disabled></textarea>
                </div>
              </label>
            </form>

            <div class="card-stage">
              <div id="cardPreviewMount"></div>
            </div>
          </div>

          <div class="actions">
            <button id="btnSaveCard" disabled>⭐ 내 컬렉션에 저장</button>
            <button id="btnDownloadPng" class="secondary" disabled>🖼️ 누끼컷 이미지 내보내기(PNG)</button>
            <button id="btnReset" class="ghost">↺ 새 카드로 시작</button>
          </div>
        </li>
      </ol>
    </section>

    <section id="tab-gallery" class="tab-panel">
      <div class="gallery-toolbar">
        <button id="btnSelectAll" class="secondary">전체 선택</button>
        <button id="btnPrintSelected">🖨️ 선택한 카드 인쇄</button>
        <span id="selectedCount" class="hint-text"></span>
      </div>
      <div id="galleryGrid" class="gallery-grid"></div>
      <p id="galleryEmpty" class="empty-hint">아직 저장된 카드가 없어요. '카드 만들기' 탭에서 첫 작품을 등록해보세요!</p>
    </section>
  </main>

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
  bgCanvas: null, // 배경 제거된 결과를 그린 캔버스(카드 아트 원본)
  originalRefCanvas: null, // 복원용: 원본 사진을 bgCanvas와 같은 크기로 그려둔 캔버스
  artDataUrl: null,
  auto: null, // computeAutoCard() 결과 {name, element, hp, atk, def, rarity}
  reroll: 0,
  selectedIds: new Set(),
  retouchMode: 'erase',
  undoStack: [],
  statRerolls: { hp: 5, atk: 5, def: 5 },
};

// ---------- 탭 ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'gallery') renderGallery();
  });
});

// ---------- 1. 업로드 ----------
const fileInput = document.getElementById('fileInput');
const btnChoosePhoto = document.getElementById('btnChoosePhoto');
const originalCanvas = document.getElementById('originalCanvas');
const uploadHint = document.getElementById('uploadHint');
const btnRemoveBg = document.getElementById('btnRemoveBg');

btnChoosePhoto.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = await loadImageFromBlob(file);
  const maxW = 900;
  const scale = Math.min(1, maxW / img.width);
  originalCanvas.width = img.width * scale;
  originalCanvas.height = img.height * scale;
  originalCanvas.getContext('2d').drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);
  uploadHint.hidden = true;
  btnRemoveBg.disabled = false;
  state.originalFile = file;

  // Colab 등에서 미리 배경을 지운 PNG를 올리면, 배경 제거 단계를 건너뛰고 바로 카드로 넘어간다.
  if (file.type === 'image/png' && detectAlreadyCutOut(img)) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    await finishBackgroundRemoval(canvas, {
      statusMessage: '✅ 이미 배경이 투명한 사진이네요! 배경 제거를 건너뛰고 바로 카드를 만들어요.',
      refSource: img,
    });
  }
});

// ---------- 2. 배경 제거 ----------
const bgCanvasEl = document.getElementById('bgCanvas');
const bgStatus = document.getElementById('bgStatus');

async function removeBackgroundWithAi(file) {
  const { removeBackground } = await import('@imgly/background-removal');
  const publicPath = new URL(
    `${import.meta.env.BASE_URL}bg-assets/`,
    window.location.origin
  ).toString();
  const blob = await removeBackground(file, {
    publicPath,
    model: 'isnet_fp16',
    progress: (key, current, total) => {
      bgStatus.textContent = `처리 중... ${key} (${current}/${total})`;
    },
  });
  const img = await loadImageFromBlob(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas;
}

async function removeBackgroundWithFallback(file) {
  const img = await loadImageFromBlob(file);
  return simpleRemoveBackground(img);
}

btnRemoveBg.addEventListener('click', async () => {
  if (!state.originalFile) return;
  btnRemoveBg.disabled = true;

  let resultCanvas = null;
  let usedFallback = false;

  if (!localStorage.getItem(AI_BG_REMOVAL_DISABLED_KEY)) {
    bgStatus.textContent = '배경 제거 모델을 불러오는 중... (처음 한 번은 다소 걸려요)';
    try {
      resultCanvas = await removeBackgroundWithAi(state.originalFile);
    } catch (err) {
      console.warn('AI 배경 제거 실패, 간단 방식으로 대체합니다:', err);
      localStorage.setItem(AI_BG_REMOVAL_DISABLED_KEY, '1');
    }
  }

  if (!resultCanvas) {
    usedFallback = true;
    try {
      bgStatus.textContent = '간단 방식으로 배경을 제거하는 중...';
      resultCanvas = await removeBackgroundWithFallback(state.originalFile);
    } catch (err) {
      console.error(err);
      const reason = err && err.message ? err.message : String(err);
      bgStatus.textContent = `⚠️ 배경 제거에 실패했어요. 다시 시도해주세요. (${reason})`;
      btnRemoveBg.disabled = false;
      return;
    }
  }

  await finishBackgroundRemoval(resultCanvas, {
    statusMessage: usedFallback
      ? '✅ 배경 제거 완료! (이 기기에서는 간단 방식을 사용했어요) 아래에서 카드를 완성해보세요.'
      : '✅ 배경 제거 완료! 아래에서 카드를 완성해보세요.',
  });
});

async function finishBackgroundRemoval(resultCanvas, { statusMessage, refSource } = {}) {
  bgCanvasEl.width = resultCanvas.width;
  bgCanvasEl.height = resultCanvas.height;
  bgCanvasEl.getContext('2d').drawImage(resultCanvas, 0, 0);
  state.bgCanvas = bgCanvasEl;
  state.artDataUrl = bgCanvasEl.toDataURL('image/png');

  const originalImgForRef = refSource || (await loadImageFromBlob(state.originalFile));
  const refCanvas = document.createElement('canvas');
  refCanvas.width = bgCanvasEl.width;
  refCanvas.height = bgCanvasEl.height;
  refCanvas.getContext('2d').drawImage(originalImgForRef, 0, 0, refCanvas.width, refCanvas.height);
  state.originalRefCanvas = refCanvas;
  state.undoStack = [];
  btnUndo.disabled = true;
  setRetouchMode('erase');
  retouchTools.hidden = false;

  bgStatus.textContent = statusMessage || '✅ 배경 제거 완료! 아래에서 카드를 완성해보세요.';
  btnRemoveBg.disabled = false;

  state.reroll = 0;
  generateAuto();

  document.querySelectorAll('#cardForm input, #cardForm textarea')
    .forEach((el) => (el.disabled = false));
  document.getElementById('btnReroll').disabled = false;
  document.getElementById('btnSaveCard').disabled = false;
  document.getElementById('btnDownloadPng').disabled = false;
}

/** 업로드한 이미지에 이미 투명 배경이 상당 부분 있으면(Colab 등에서 미리 자른 사진) true */
function detectAlreadyCutOut(img) {
  const sw = 80;
  const scale = sw / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let transparent = 0;
  const total = w * h;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) transparent++;
  }
  return transparent / total > 0.05;
}

// ---------- 2-1. 터치로 배경 다듬기 (지우기 / 복원) ----------
const retouchTools = document.getElementById('retouchTools');
const modeEraseBtn = document.getElementById('modeErase');
const modeRestoreBtn = document.getElementById('modeRestore');
const btnUndo = document.getElementById('btnUndo');
const retouchTolerance = document.getElementById('retouchTolerance');

function setRetouchMode(mode) {
  state.retouchMode = mode;
  modeEraseBtn.classList.toggle('active', mode === 'erase');
  modeRestoreBtn.classList.toggle('active', mode === 'restore');
}
modeEraseBtn.addEventListener('click', () => setRetouchMode('erase'));
modeRestoreBtn.addEventListener('click', () => setRetouchMode('restore'));

function pushUndo() {
  const ctx = bgCanvasEl.getContext('2d');
  const snap = ctx.getImageData(0, 0, bgCanvasEl.width, bgCanvasEl.height);
  state.undoStack.push(snap);
  if (state.undoStack.length > 15) state.undoStack.shift();
  btnUndo.disabled = false;
}

btnUndo.addEventListener('click', () => {
  if (!state.undoStack.length) return;
  const snap = state.undoStack.pop();
  bgCanvasEl.getContext('2d').putImageData(snap, 0, 0);
  state.artDataUrl = bgCanvasEl.toDataURL('image/png');
  updateCardPreview();
  btnUndo.disabled = state.undoStack.length === 0;
});

function canvasPointFromEvent(e) {
  const rect = bgCanvasEl.getBoundingClientRect();
  const scaleX = bgCanvasEl.width / rect.width;
  const scaleY = bgCanvasEl.height / rect.height;
  return {
    x: Math.floor((e.clientX - rect.left) * scaleX),
    y: Math.floor((e.clientY - rect.top) * scaleY),
  };
}

let retouchLastPoint = null;

function applyRetouchAt(e, { force = false } = {}) {
  if (!state.bgCanvas || !state.originalRefCanvas) return;
  const { x, y } = canvasPointFromEvent(e);
  if (!force && retouchLastPoint) {
    const dx = x - retouchLastPoint.x, dy = y - retouchLastPoint.y;
    if (dx * dx + dy * dy < 36) return;
  }
  retouchLastPoint = { x, y };

  const ctx = bgCanvasEl.getContext('2d');
  const tolerance = Number(retouchTolerance.value);
  const changed = state.retouchMode === 'erase'
    ? floodErase(ctx, x, y, tolerance)
    : floodRestore(ctx, state.originalRefCanvas.getContext('2d'), x, y, tolerance);

  if (changed) {
    state.artDataUrl = bgCanvasEl.toDataURL('image/png');
    updateCardPreview();
  }
}

let retouchPointerDown = false;
bgCanvasEl.addEventListener('pointerdown', (e) => {
  if (!state.bgCanvas) return;
  retouchPointerDown = true;
  retouchLastPoint = null;
  pushUndo();
  applyRetouchAt(e, { force: true });
  bgCanvasEl.setPointerCapture(e.pointerId);
  e.preventDefault();
});
bgCanvasEl.addEventListener('pointermove', (e) => {
  if (!retouchPointerDown) return;
  applyRetouchAt(e);
});
window.addEventListener('pointerup', () => {
  retouchPointerDown = false;
});

// ---------- 3. 카드 완성 ----------
const form = document.getElementById('cardForm');
const fTitle = document.getElementById('fTitle');
const fNote = document.getElementById('fNote');
const fDate = document.getElementById('fDate');
const autoStatsBox = document.getElementById('autoStats');
fDate.value = new Date().toISOString().slice(0, 10);

function updateStatDisplay() {
  if (!state.auto) return;
  const element = ELEMENTS[state.auto.element];
  const rarity = RARITY_LABELS[state.auto.rarity];
  document.getElementById('statElement').textContent = `${element.icon} ${element.label}`;
  document.getElementById('statHp').textContent = state.auto.hp;
  document.getElementById('statAtk').textContent = state.auto.atk;
  document.getElementById('statDef').textContent = state.auto.def;
  document.getElementById('statRarity').textContent = rarity.label;
  ['hp', 'atk', 'def'].forEach((key) => {
    const label = key[0].toUpperCase() + key.slice(1);
    document.getElementById(`reroll${label}`).textContent = state.statRerolls[key];
    document.querySelector(`.dice-btn[data-stat="${key}"]`).disabled = state.statRerolls[key] <= 0;
  });
}

function generateAuto() {
  if (!state.bgCanvas) return;
  const auto = computeAutoCard(state.bgCanvas, { nonce: state.reroll });
  state.auto = auto;
  state.statRerolls = { hp: 5, atk: 5, def: 5 };
  fTitle.value = auto.name;
  fNote.value = auto.note;

  updateStatDisplay();
  autoStatsBox.hidden = false;

  updateCardPreview();
}

document.getElementById('btnReroll').addEventListener('click', () => {
  state.reroll += 1;
  generateAuto();
});

document.querySelectorAll('.dice-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.stat;
    if (!state.auto || state.statRerolls[key] <= 0) return;
    state.auto[key] = rollStat(key);
    state.statRerolls[key] -= 1;
    state.auto.rarity = rarityForPower(state.auto.hp + state.auto.atk + state.auto.def);
    updateStatDisplay();
    updateCardPreview();
  });
});

form.addEventListener('input', updateCardPreview);

function currentCardData() {
  const auto = state.auto || {};
  return {
    title: fTitle.value,
    element: auto.element,
    hp: auto.hp,
    atk: auto.atk,
    def: auto.def,
    rarity: auto.rarity,
    date: fDate.value,
    note: fNote.value,
    artDataUrl: state.artDataUrl,
    cardNo: state.previewCardNo || 1,
  };
}

// ---------- 카드 미리보기 ----------
const cardPreviewMount = document.getElementById('cardPreviewMount');

function updateCardPreview() {
  cardPreviewMount.innerHTML = '';
  const cardEl = buildCardElement(currentCardData());
  cardEl.classList.add('clickable-card');
  cardEl.addEventListener('click', () => openCardModal(currentCardData()));
  cardPreviewMount.appendChild(cardEl);
}
updateCardPreview();

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
  const cardNo = await nextCardNumber();
  const card = { id: crypto.randomUUID(), createdAt: Date.now(), cardNo, ...currentCardData() };
  await saveCard(card);
  renderGallery();
  resetWizard();
  document.querySelector('.tab-btn[data-tab="gallery"]').click();
});

document.getElementById('btnDownloadPng').addEventListener('click', async () => {
  if (!state.bgCanvas) return;
  const blob = await canvasToPngBlob(state.bgCanvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fTitle.value || 'lego-card'}.png`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btnReset').addEventListener('click', resetWizard);

function resetWizard() {
  state.bgCanvas = null;
  state.originalRefCanvas = null;
  state.artDataUrl = null;
  state.auto = null;
  state.reroll = 0;
  state.originalFile = null;
  state.undoStack = [];
  state.statRerolls = { hp: 5, atk: 5, def: 5 };
  fileInput.value = '';
  [originalCanvas, bgCanvasEl].forEach((c) => {
    c.width = 0;
    c.height = 0;
  });
  uploadHint.hidden = false;
  bgStatus.textContent = '';
  btnRemoveBg.disabled = true;
  autoStatsBox.hidden = true;
  retouchTools.hidden = true;
  btnUndo.disabled = true;
  setRetouchMode('erase');
  form.reset();
  fDate.value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('#cardForm input, #cardForm textarea')
    .forEach((el) => (el.disabled = true));
  document.getElementById('btnReroll').disabled = true;
  document.getElementById('btnSaveCard').disabled = true;
  document.getElementById('btnDownloadPng').disabled = true;
  updateCardPreview();
}

// ---------- 갤러리 ----------
const galleryGrid = document.getElementById('galleryGrid');
const galleryEmpty = document.getElementById('galleryEmpty');
const galleryCount = document.getElementById('galleryCount');
const selectedCountEl = document.getElementById('selectedCount');

async function renderGallery() {
  const cards = await getAllCards();
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
      await deleteCard(card.id);
      state.selectedIds.delete(card.id);
      renderGallery();
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

document.getElementById('btnSelectAll').addEventListener('click', async () => {
  const cards = await getAllCards();
  if (state.selectedIds.size === cards.length) {
    state.selectedIds.clear();
  } else {
    cards.forEach((c) => state.selectedIds.add(c.id));
  }
  renderGallery();
});

// ---------- 인쇄 ----------
const printSheet = document.getElementById('printSheet');

document.getElementById('btnPrintSelected').addEventListener('click', async () => {
  const cards = await getAllCards();
  const target = state.selectedIds.size
    ? cards.filter((c) => state.selectedIds.has(c.id))
    : cards;
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

// ---------- 초기 렌더 ----------
renderGallery();
