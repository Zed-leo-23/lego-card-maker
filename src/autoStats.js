import { rgbToHsl } from './colorUtils.js';

export const ELEMENTS = {
  fire: { label: '불꽃', icon: '🔥', c1: '#8e0000', c2: '#ff5252' },
  water: { label: '물', icon: '💧', c1: '#01579b', c2: '#4fc3f7' },
  nature: { label: '자연', icon: '🌿', c1: '#1b5e20', c2: '#66bb6a' },
  lightning: { label: '번개', icon: '⚡', c1: '#8a6400', c2: '#ffd54f' },
  ice: { label: '얼음', icon: '❄️', c1: '#005662', c2: '#4dd0e1' },
  arcane: { label: '마법', icon: '🔮', c1: '#2b1768', c2: '#9575cd' },
  light: { label: '빛', icon: '✨', c1: '#a67c00', c2: '#fff176' },
  steel: { label: '강철', icon: '⚙️', c1: '#263238', c2: '#90a4ae' },
  dark: { label: '어둠', icon: '🌑', c1: '#000000', c2: '#616161' },
};

export const RARITY_LABELS = {
  common: { label: '커먼', cls: 'rarity-common' },
  uncommon: { label: '언커먼', cls: 'rarity-uncommon' },
  rare: { label: '레어', cls: 'rarity-rare' },
  holo: { label: '홀로 레어', cls: 'rarity-holo' },
};

const PREFIXES = {
  fire: ['불타는', '타오르는', '용암의', '화염의'],
  water: ['파도의', '심해의', '물결치는', '푸른'],
  nature: ['숲의', '덩굴의', '푸르른', '야생의'],
  lightning: ['번개의', '전격의', '폭풍의', '질풍의'],
  ice: ['얼어붙은', '서리의', '극한의', '빙결의'],
  arcane: ['신비한', '마법의', '고대의', '비전의'],
  light: ['찬란한', '빛나는', '성스러운', '여명의'],
  steel: ['강철의', '기계의', '철갑의', '정밀한'],
  dark: ['그림자', '심연의', '어둠의', '칠흑의'],
};
const NOUNS = ['기사', '수호자', '전사', '드래곤', '거신병', '탐사선', '요새', '매', '사자', '골렘', '전함', '로봇', '사령관', '파수꾼', '개척자'];

const FLAVORS = {
  fire: [
    '용암보다 뜨거운 투지를 품고 있다.',
    '닿는 것은 무엇이든 그을려 버린다.',
    '분노가 들끓을수록 더 강해진다.',
    '꺼지지 않는 불씨를 가슴에 숨겼다.',
  ],
  water: [
    '깊은 바다처럼 속을 알 수 없다.',
    '한 방울의 틈만 있어도 흘러든다.',
    '거센 파도처럼 모든 걸 휩쓴다.',
    '유연하지만 한번 밀리면 끝이 없다.',
  ],
  nature: [
    '숲의 숨결을 몸에 두르고 있다.',
    '뿌리처럼 조용히, 그러나 멈추지 않는다.',
    '계절이 바뀌어도 변함없이 자란다.',
    '야생의 감각으로 위험을 미리 느낀다.',
  ],
  lightning: [
    '눈 깜짝할 사이에 거리를 좁힌다.',
    '번쩍이는 섬광 뒤에 천둥이 따라온다.',
    '멈춰 있을 때조차 전기가 흐른다.',
    '폭풍의 속도로 전장을 가른다.',
  ],
  ice: [
    '한번 얼리면 녹는 법이 없다.',
    '차가운 겉모습 속에 치밀한 계산이 있다.',
    '서리 낀 숨결로 주변을 얼어붙게 한다.',
    '극한의 추위도 두렵지 않다.',
  ],
  arcane: [
    '오래된 마법서에만 전해지는 존재다.',
    '보이지 않는 힘으로 운명을 뒤튼다.',
    '비밀스러운 주문을 혼자서 완성했다.',
    '시간조차 비껴가는 듯한 기운을 지녔다.',
  ],
  light: [
    '어둠 속에서도 홀로 빛난다.',
    '그 빛을 따라 길 잃은 자들이 모여든다.',
    '거짓을 밝혀내는 성스러운 힘이 있다.',
    '여명과 함께 다시 일어선다.',
  ],
  steel: [
    '빈틈없는 설계로 어떤 충격도 견딘다.',
    '수없이 두드려 만든 단단함을 지녔다.',
    '정밀하게 계산된 움직임만 보여준다.',
    '녹슬지 않는 의지로 자리를 지킨다.',
  ],
  dark: [
    '그림자 속에서만 진짜 모습을 드러낸다.',
    '소리 없이 다가와 승부를 끝낸다.',
    '깊은 어둠만큼 속을 가늠할 수 없다.',
    '빛이 없는 곳에서 더 강해진다.',
  ],
};

function pickElement(h, s, l) {
  if (s < 0.18) return l > 0.62 ? 'steel' : l < 0.28 ? 'dark' : 'steel';
  if (h < 20 || h >= 345) return 'fire';
  if (h < 50) return 'fire';
  if (h < 70) return 'lightning';
  if (h < 170) return 'nature';
  if (h < 200) return 'ice';
  if (h < 255) return 'water';
  if (h < 300) return 'arcane';
  return 'light';
}

function hashBytes(data, nonce = 0) {
  let h = 0x811c9dc5 ^ nonce;
  const step = Math.max(4, Math.floor(data.length / 4000 / 4) * 4) || 4;
  for (let i = 0; i < data.length; i += step) {
    h ^= data[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed;
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * 배경이 제거된 작품 이미지를 분석해서 이름/속성/능력치/등급을 자동으로 만들어요.
 * 같은 사진 + 같은 nonce 면 항상 같은 결과가 나오고, nonce를 바꾸면(다시 뽑기) 변형이 나와요.
 * @param {HTMLCanvasElement|HTMLImageElement} source
 * @param {{nonce?:number}} opts
 */
export function computeAutoCard(source, opts = {}) {
  const nonce = opts.nonce || 0;
  const sw = 120;
  const scale = sw / Math.max(source.width, source.height);
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(source, 0, 0, w, h);
  const { data } = tctx.getImageData(0, 0, w, h);

  let alphaCount = 0, rSum = 0, gSum = 0, bSum = 0;
  const lumas = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3];
    if (a > 20) {
      alphaCount++;
      rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
      lumas[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
  }
  const total = w * h;
  const sizeRatio = alphaCount / total;
  const avgR = rSum / Math.max(1, alphaCount);
  const avgG = gSum / Math.max(1, alphaCount);
  const avgB = bSum / Math.max(1, alphaCount);
  const [hue, sat, light] = rgbToHsl(avgR, avgG, avgB);

  let gradSum = 0, gradCount = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (!lumas[p]) continue;
      const gx = lumas[p + 1] - lumas[p - 1];
      const gy = lumas[p + w] - lumas[p - w];
      gradSum += Math.sqrt(gx * gx + gy * gy);
      gradCount++;
    }
  }
  const detailScore = gradCount ? clamp((gradSum / gradCount) / 60, 0, 1) : 0.3;

  const seed = hashBytes(data, nonce);
  const rand = mulberry32(seed);
  const jitter = (range) => Math.round((rand() - 0.5) * range);

  const hp = clamp(Math.round(40 + sizeRatio * 55 + jitter(14)), 10, 99);
  const atk = clamp(Math.round(15 + detailScore * 75 + jitter(14)), 5, 99);
  const def = clamp(Math.round(15 + (1 - detailScore) * 45 + sizeRatio * 25 + jitter(12)), 5, 99);

  const element = pickElement(hue, sat, light);
  const prefixList = PREFIXES[element];
  const prefix = prefixList[Math.floor(rand() * prefixList.length)];
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)];
  const name = `${prefix} ${noun}`;

  const flavorList = FLAVORS[element];
  const note = flavorList[Math.floor(rand() * flavorList.length)];

  const power = hp + atk + def;
  let rarity = 'common';
  if (power >= 220) rarity = 'holo';
  else if (power >= 180) rarity = 'rare';
  else if (power >= 140) rarity = 'uncommon';

  return { name, element, hp, atk, def, rarity, note };
}
