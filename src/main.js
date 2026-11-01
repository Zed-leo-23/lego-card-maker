import './style.css';
import { applyLegoAnimationStyle, loadImageFromBlob, canvasToPngBlob } from './legoFilter.js';
import { getAllCards, saveCard, deleteCard, nextCardNumber } from './db.js';
import { buildCardElement, THEMES } from './cardView.js';

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
          <label class="file-btn">
            📷 사진 선택 / 촬영
            <input type="file" id="fileInput" accept="image/*" capture="environment" hidden />
          </label>
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

        <li class="step" id="step-style">
          <h2><span class="step-num">3</span> 2D 레고 애니메이션 스타일</h2>
          <div class="controls" id="styleControls">
            <label>윤곽선 굵기
              <input type="range" id="edgeStrength" min="0" max="100" value="55" disabled />
            </label>
            <label>색상 단순화
              <input type="range" id="posterLevels" min="2" max="8" value="4" disabled />
            </label>
            <label>채도
              <input type="range" id="saturation" min="40" max="200" value="135" disabled />
            </label>
          </div>
          <div class="preview-box checker">
            <canvas id="styleCanvas"></canvas>
          </div>
        </li>

        <li class="step" id="step-info">
          <h2><span class="step-num">4</span> 카드 정보 입력</h2>
          <form id="cardForm" class="card-form">
            <label>작품 이름
              <input id="fTitle" maxlength="20" placeholder="예: 우주 탐사선" disabled />
            </label>
            <label>테마
              <select id="fTheme" disabled>
                ${Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
              </select>
            </label>
            <label>피스 수
              <input id="fPieces" type="number" min="0" placeholder="예: 350" disabled />
            </label>
            <label>제작일
              <input id="fDate" type="date" disabled />
            </label>
            <label>난이도
              <select id="fStars" disabled>
                <option value="1">★☆☆☆☆</option>
                <option value="2">★★☆☆☆</option>
                <option value="3" selected>★★★☆☆</option>
                <option value="4">★★★★☆</option>
                <option value="5">★★★★★</option>
              </select>
            </label>
            <label class="full">카드 설명
              <textarea id="fNote" maxlength="120" rows="3" placeholder="이 작품에 대한 한마디를 남겨보세요" disabled></textarea>
            </label>
          </form>
        </li>

        <li class="step" id="step-card">
          <h2><span class="step-num">5</span> 카드 미리보기 &amp; 저장</h2>
          <div class="card-stage">
            <div id="cardPreviewMount"></div>
          </div>
          <div class="actions">
            <button id="btnSaveCard" disabled>⭐ 내 컬렉션에 저장</button>
            <button id="btnDownloadPng" class="secondary" disabled>🖼️ 스타일 이미지 내보내기(PNG)</button>
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
  bgRemovedImage: null, // Image (투명 배경 PNG)
  styledCanvas: null,
  artDataUrl: null,
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
const originalCanvas = document.getElementById('originalCanvas');
const uploadHint = document.getElementById('uploadHint');
const btnRemoveBg = document.getElementById('btnRemoveBg');

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
const bgCanvas = document.getElementById('bgCanvas');
const bgStatus = document.getElementById('bgStatus');
const styleInputs = {
  edge: document.getElementById('edgeStrength'),
  levels: document.getElementById('posterLevels'),
  sat: document.getElementById('saturation'),
};

btnRemoveBg.addEventListener('click', async () => {
  if (!state.originalFile) return;
  btnRemoveBg.disabled = true;
  bgStatus.textContent = '배경 제거 모델을 불러오는 중... (처음 한 번은 다소 걸려요)';
  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const blob = await removeBackground(state.originalFile, {
      progress: (key, current, total) => {
        bgStatus.textContent = `처리 중... ${key} (${current}/${total})`;
      },
    });
    const img = await loadImageFromBlob(blob);
    state.bgRemovedImage = img;

    bgCanvas.width = img.width;
    bgCanvas.height = img.height;
    bgCanvas.getContext('2d').drawImage(img, 0, 0);

    bgStatus.textContent = '✅ 배경 제거 완료! 아래에서 결과를 확인하세요.';
    Object.values(styleInputs).forEach((el) => (el.disabled = false));
    applyStylePreview();
  } catch (err) {
    console.error(err);
    bgStatus.textContent = '⚠️ 배경 제거에 실패했어요. 인터넷 연결을 확인하고 다시 시도해주세요.';
    btnRemoveBg.disabled = false;
  }
});

// ---------- 3. 스타일 적용 ----------
const styleCanvas = document.getElementById('styleCanvas');
let styleDebounce;

function applyStylePreview() {
  if (!state.bgRemovedImage) return;
  clearTimeout(styleDebounce);
  styleDebounce = setTimeout(() => {
    const canvas = applyLegoAnimationStyle(state.bgRemovedImage, {
      levels: Number(styleInputs.levels.value),
      saturation: Number(styleInputs.sat.value),
      edgeStrength: Number(styleInputs.edge.value),
    });
    state.styledCanvas = canvas;
    styleCanvas.width = canvas.width;
    styleCanvas.height = canvas.height;
    styleCanvas.getContext('2d').drawImage(canvas, 0, 0);
    state.artDataUrl = canvas.toDataURL('image/png');

    document.querySelectorAll('#cardForm input, #cardForm select, #cardForm textarea')
      .forEach((el) => (el.disabled = false));
    document.getElementById('btnSaveCard').disabled = false;
    document.getElementById('btnDownloadPng').disabled = false;
    updateCardPreview();
  }, 80);
}

Object.values(styleInputs).forEach((el) => el.addEventListener('input', applyStylePreview));

// ---------- 4. 카드 정보 ----------
const form = document.getElementById('cardForm');
const fDate = document.getElementById('fDate');
fDate.value = new Date().toISOString().slice(0, 10);
form.addEventListener('input', updateCardPreview);

function currentCardData() {
  return {
    title: document.getElementById('fTitle').value,
    theme: document.getElementById('fTheme').value,
    pieces: document.getElementById('fPieces').value,
    date: fDate.value,
    stars: document.getElementById('fStars').value,
    note: document.getElementById('fNote').value,
    artDataUrl: state.artDataUrl,
    cardNo: state.previewCardNo || 1,
  };
}

// ---------- 5. 카드 미리보기 ----------
const cardPreviewMount = document.getElementById('cardPreviewMount');

function updateCardPreview() {
  cardPreviewMount.innerHTML = '';
  cardPreviewMount.appendChild(buildCardElement(currentCardData()));
}
updateCardPreview();

document.getElementById('btnSaveCard').addEventListener('click', async () => {
  if (!state.artDataUrl) return;
  const cardNo = await nextCardNumber();
  const card = { id: crypto.randomUUID(), createdAt: Date.now(), cardNo, ...currentCardData() };
  await saveCard(card);
  renderGallery();
  resetWizard();
  document.querySelector('.tab-btn[data-tab="gallery"]').click();
});

document.getElementById('btnDownloadPng').addEventListener('click', async () => {
  if (!state.styledCanvas) return;
  const blob = await canvasToPngBlob(state.styledCanvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${document.getElementById('fTitle').value || 'lego-card'}.png`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btnReset').addEventListener('click', resetWizard);

function resetWizard() {
  state.bgRemovedImage = null;
  state.styledCanvas = null;
  state.artDataUrl = null;
  state.originalFile = null;
  fileInput.value = '';
  [originalCanvas, bgCanvas, styleCanvas].forEach((c) => {
    c.width = 0;
    c.height = 0;
  });
  uploadHint.hidden = false;
  bgStatus.textContent = '';
  btnRemoveBg.disabled = true;
  Object.values(styleInputs).forEach((el) => (el.disabled = true));
  form.reset();
  fDate.value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('#cardForm input, #cardForm select, #cardForm textarea')
    .forEach((el) => (el.disabled = true));
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
