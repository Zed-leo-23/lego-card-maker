import './style.css';
import { loadImageFromBlob, canvasToPngBlob } from './imageUtils.js';
import { computeAutoCard, ELEMENTS, RARITY_LABELS } from './autoStats.js';
import { getAllCards, saveCard, deleteCard, nextCardNumber } from './db.js';
import { buildCardElement } from './cardView.js';

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
                <span class="auto-stat">❤️ HP <b id="statHp"></b></span>
                <span class="auto-stat">⚔ ATK <b id="statAtk"></b></span>
                <span class="auto-stat">🛡 DEF <b id="statDef"></b></span>
                <span class="auto-stat" id="statRarity"></span>
              </div>

              <label>피스 수 (선택)
                <input id="fPieces" type="number" min="0" placeholder="예: 350" disabled />
              </label>
              <label>제작일
                <input id="fDate" type="date" disabled />
              </label>
              <label class="full">카드 설명 (선택)
                <textarea id="fNote" maxlength="120" rows="2" placeholder="이 작품에 대한 한마디를 남겨보세요" disabled></textarea>
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
`;

// ---------- 상태 ----------
const state = {
  bgCanvas: null, // 배경 제거된 결과를 그린 캔버스(카드 아트 원본)
  artDataUrl: null,
  auto: null, // computeAutoCard() 결과 {name, element, hp, atk, def, rarity}
  reroll: 0,
  selectedIds: new Set(),
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
});

// ---------- 2. 배경 제거 ----------
const bgCanvasEl = document.getElementById('bgCanvas');
const bgStatus = document.getElementById('bgStatus');

btnRemoveBg.addEventListener('click', async () => {
  if (!state.originalFile) return;
  btnRemoveBg.disabled = true;
  bgStatus.textContent = '배경 제거 모델을 불러오는 중... (처음 한 번은 다소 걸려요)';
  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const publicPath = new URL(
      `${import.meta.env.BASE_URL}bg-assets/`,
      window.location.origin
    ).toString();
    const blob = await removeBackground(state.originalFile, {
      publicPath,
      model: 'isnet_fp16',
      progress: (key, current, total) => {
        bgStatus.textContent = `처리 중... ${key} (${current}/${total})`;
      },
    });
    const img = await loadImageFromBlob(blob);

    bgCanvasEl.width = img.width;
    bgCanvasEl.height = img.height;
    bgCanvasEl.getContext('2d').drawImage(img, 0, 0);
    state.bgCanvas = bgCanvasEl;
    state.artDataUrl = bgCanvasEl.toDataURL('image/png');

    bgStatus.textContent = '✅ 배경 제거 완료! 아래에서 카드를 완성해보세요.';

    state.reroll = 0;
    generateAuto();

    document.querySelectorAll('#cardForm input, #cardForm textarea')
      .forEach((el) => (el.disabled = false));
    document.getElementById('btnReroll').disabled = false;
    document.getElementById('btnSaveCard').disabled = false;
    document.getElementById('btnDownloadPng').disabled = false;
  } catch (err) {
    console.error(err);
    const reason = err && err.message ? err.message : String(err);
    bgStatus.textContent = `⚠️ 배경 제거에 실패했어요. 인터넷 연결을 확인하고 다시 시도해주세요. (${reason})`;
    btnRemoveBg.disabled = false;
  }
});

// ---------- 3. 카드 완성 ----------
const form = document.getElementById('cardForm');
const fTitle = document.getElementById('fTitle');
const fDate = document.getElementById('fDate');
const autoStatsBox = document.getElementById('autoStats');
fDate.value = new Date().toISOString().slice(0, 10);

function generateAuto() {
  if (!state.bgCanvas) return;
  const auto = computeAutoCard(state.bgCanvas, { nonce: state.reroll });
  state.auto = auto;
  fTitle.value = auto.name;

  const element = ELEMENTS[auto.element];
  const rarity = RARITY_LABELS[auto.rarity];
  document.getElementById('statElement').textContent = `${element.icon} ${element.label}`;
  document.getElementById('statHp').textContent = auto.hp;
  document.getElementById('statAtk').textContent = auto.atk;
  document.getElementById('statDef').textContent = auto.def;
  document.getElementById('statRarity').textContent = rarity.label;
  autoStatsBox.hidden = false;

  updateCardPreview();
}

document.getElementById('btnReroll').addEventListener('click', () => {
  state.reroll += 1;
  generateAuto();
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
    pieces: document.getElementById('fPieces').value,
    date: fDate.value,
    note: document.getElementById('fNote').value,
    artDataUrl: state.artDataUrl,
    cardNo: state.previewCardNo || 1,
  };
}

// ---------- 카드 미리보기 ----------
const cardPreviewMount = document.getElementById('cardPreviewMount');

function updateCardPreview() {
  cardPreviewMount.innerHTML = '';
  cardPreviewMount.appendChild(buildCardElement(currentCardData()));
}
updateCardPreview();

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
  state.artDataUrl = null;
  state.auto = null;
  state.reroll = 0;
  state.originalFile = null;
  fileInput.value = '';
  [originalCanvas, bgCanvasEl].forEach((c) => {
    c.width = 0;
    c.height = 0;
  });
  uploadHint.hidden = false;
  bgStatus.textContent = '';
  btnRemoveBg.disabled = true;
  autoStatsBox.hidden = true;
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

    wrap.appendChild(checkbox);
    wrap.appendChild(delBtn);
    wrap.appendChild(buildCardElement(card, { thumb: true }));
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
