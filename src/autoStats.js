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
  fire: ['불타는', '타오르는', '용암의', '화염의', '작열하는', '불꽃튀는'],
  water: ['파도의', '심해의', '물결치는', '푸른', '격류의', '해일의'],
  nature: ['숲의', '덩굴의', '푸르른', '야생의', '이끼낀', '뿌리깊은'],
  lightning: ['번개의', '전격의', '폭풍의', '질풍의', '뇌전의', '섬광의'],
  ice: ['얼어붙은', '서리의', '극한의', '빙결의', '한파의', '빙하의'],
  arcane: ['신비한', '마법의', '고대의', '비전의', '주술의', '차원의'],
  light: ['찬란한', '빛나는', '성스러운', '여명의', '서광의', '광휘의'],
  steel: ['강철의', '기계의', '철갑의', '정밀한', '합금의', '중장갑의'],
  dark: ['그림자', '심연의', '어둠의', '칠흑의', '망령의', '암흑의'],
};

// 사진의 질감(디테일/채도)에 따라 '로봇' 계열과 '생물' 계열 이름을 다르게 조합한다.
const MECHA_NOUNS = ['드로이드', '메카', '기어봇', '사이보그', '아머', '워머신', '스트라이커', '건쉽', '메탈가드', '타이탄봇', '발칸', '유닛'];
const CREATURE_NOUNS = ['수호자', '괴수', '골렘', '드래곤', '사자', '매', '거신병', '야수', '요수', '키메라', '그리폰', '리바이어던'];

// 이름 문장 구조에 쓰이는 보조 단어들 - 매번 같은 "수식어+명사" 틀만 반복되지
// 않도록, "OO의 ROLE" 같은 다른 틀도 섞어서 쓴다.
const ROLE_WORDS = ['지배자', '계승자', '파수꾼', '사도', '현신', '수호신', '개척자', '심판자', '정복자', '방랑자'];
const EPITHETS = ['전설의', '태초의', '금단의', '잊혀진', '영원한'];
const MECHA_SERIALS = ['Mk-II', 'Mk-III', 'X-7', 'Type-3', 'Zero', 'V2'];

/** 매번 같은 "형용사+명사" 틀만 쓰지 않도록 이름 문장 구조를 여러 개 섞는다. */
function buildName(rand, element, style, prefix, noun) {
  const elementLabel = ELEMENTS[element].label;
  const role = () => ROLE_WORDS[Math.floor(rand() * ROLE_WORDS.length)];

  const templateRoll = Math.floor(rand() * 3);
  let name;
  if (templateRoll === 0) {
    name = `${prefix} ${noun}`;
    // prefix가 이미 '~의' 형태면 수식어를 더했을 때 조사가 겹쳐 어색해지므로 피한다.
    if (style === 'creature' && !prefix.endsWith('의') && rand() < 0.3) {
      name = `${EPITHETS[Math.floor(rand() * EPITHETS.length)]} ${name}`;
    }
  } else if (templateRoll === 1) {
    name = `${elementLabel}의 ${role()}`;
  } else {
    name = `${noun}의 ${role()}`;
  }

  if (style === 'mecha' && rand() < 0.4) {
    name = `${name} ${MECHA_SERIALS[Math.floor(rand() * MECHA_SERIALS.length)]}`;
  }

  return name;
}

const FLAVORS = {
  fire: [
    '용암보다 뜨거운 투지를 품고 있다.',
    '닿는 것은 무엇이든 그을려 버린다.',
    '분노가 들끓을수록 더 강해진다.',
    '꺼지지 않는 불씨를 가슴에 숨겼다.',
    '한번 타오르면 아무도 못 말린다.',
    '재가 되어도 다시 일어선다.',
  ],
  water: [
    '깊은 바다처럼 속을 알 수 없다.',
    '한 방울의 틈만 있어도 흘러든다.',
    '거센 파도처럼 모든 걸 휩쓴다.',
    '유연하지만 한번 밀리면 끝이 없다.',
    '흐르는 물처럼 멈추지 않는다.',
    '고요할수록 더 깊은 힘을 숨긴다.',
  ],
  nature: [
    '숲의 숨결을 몸에 두르고 있다.',
    '뿌리처럼 조용히, 그러나 멈추지 않는다.',
    '계절이 바뀌어도 변함없이 자란다.',
    '야생의 감각으로 위험을 미리 느낀다.',
    '땅의 기운을 끌어모아 자란다.',
    '꺾여도 다시 싹을 틔운다.',
  ],
  lightning: [
    '눈 깜짝할 사이에 거리를 좁힌다.',
    '번쩍이는 섬광 뒤에 천둥이 따라온다.',
    '멈춰 있을 때조차 전기가 흐른다.',
    '폭풍의 속도로 전장을 가른다.',
    '한순간의 틈도 놓치지 않는다.',
    '번개처럼 나타났다 사라진다.',
  ],
  ice: [
    '한번 얼리면 녹는 법이 없다.',
    '차가운 겉모습 속에 치밀한 계산이 있다.',
    '서리 낀 숨결로 주변을 얼어붙게 한다.',
    '극한의 추위도 두렵지 않다.',
    '감정을 얼려버린 듯 냉정하다.',
    '발 디딘 곳마다 얼음꽃이 핀다.',
  ],
  arcane: [
    '오래된 마법서에만 전해지는 존재다.',
    '보이지 않는 힘으로 운명을 뒤튼다.',
    '비밀스러운 주문을 혼자서 완성했다.',
    '시간조차 비껴가는 듯한 기운을 지녔다.',
    '현실과 환상의 경계에 서 있다.',
    '그 힘의 근원은 아무도 모른다.',
  ],
  light: [
    '어둠 속에서도 홀로 빛난다.',
    '그 빛을 따라 길 잃은 자들이 모여든다.',
    '거짓을 밝혀내는 성스러운 힘이 있다.',
    '여명과 함께 다시 일어선다.',
    '닿는 곳마다 그림자를 몰아낸다.',
    '한 줄기 빛으로 모두를 이끈다.',
  ],
  steel: [
    '빈틈없는 설계로 어떤 충격도 견딘다.',
    '수없이 두드려 만든 단단함을 지녔다.',
    '정밀하게 계산된 움직임만 보여준다.',
    '녹슬지 않는 의지로 자리를 지킨다.',
    '단 하나의 오차도 허용하지 않는다.',
    '겉은 차갑지만 속은 누구보다 뜨겁다.',
  ],
  dark: [
    '그림자 속에서만 진짜 모습을 드러낸다.',
    '소리 없이 다가와 승부를 끝낸다.',
    '깊은 어둠만큼 속을 가늠할 수 없다.',
    '빛이 없는 곳에서 더 강해진다.',
    '아무도 그 발소리를 듣지 못한다.',
    '밤이 깊을수록 존재감이 짙어진다.',
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

/** 디테일(에지)이 많고 채도가 낮을수록 '로봇' 계열, 그 반대면 '생물' 계열로 추정 */
function pickStyle(detailScore, sat) {
  const mechaScore = detailScore * 0.7 + (1 - sat) * 0.3;
  return mechaScore > 0.42 ? 'mecha' : 'creature';
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

const STAT_RANGES = { hp: [10, 99], atk: [5, 99], def: [5, 99] };

export function rarityForPower(power) {
  if (power >= 220) return 'holo';
  if (power >= 180) return 'rare';
  if (power >= 140) return 'uncommon';
  return 'common';
}

/** 능력치 1개를 주사위 굴리듯 새로 뽑는다 (수동 리롤용, 매번 진짜 랜덤). */
export function rollStat(key) {
  const [lo, hi] = STAT_RANGES[key] || [5, 99];
  return Math.round(lo + Math.random() * (hi - lo));
}

/**
 * 작품 사진을 분석해서 이름/속성/능력치/등급을 자동으로 만들어요.
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

  // 배경을 따로 지우지 않으므로, 사진 중심부(피사체로 추정)와 테두리(배경으로
  // 추정) 영역의 색 차이를 "피사체가 얼마나 뚜렷한가"의 대용치로 쓴다.
  const cx0 = Math.round(w * 0.25), cx1 = Math.round(w * 0.75);
  const cy0 = Math.round(h * 0.25), cy1 = Math.round(h * 0.75);
  let centerR = 0, centerG = 0, centerB = 0, centerN = 0;
  let borderR = 0, borderG = 0, borderB = 0, borderN = 0;
  const lumas = new Float32Array(w * h);

  for (let y = 0, p = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, p++, i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      lumas[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const inCenter = x >= cx0 && x < cx1 && y >= cy0 && y < cy1;
      if (inCenter) {
        centerR += r; centerG += g; centerB += b; centerN++;
      } else {
        borderR += r; borderG += g; borderB += b; borderN++;
      }
    }
  }
  const centerAvg = [centerR / Math.max(1, centerN), centerG / Math.max(1, centerN), centerB / Math.max(1, centerN)];
  const borderAvg = [borderR / Math.max(1, borderN), borderG / Math.max(1, borderN), borderB / Math.max(1, borderN)];
  const [hue, sat, light] = rgbToHsl(...centerAvg);

  const centerBorderDist = Math.sqrt(
    (centerAvg[0] - borderAvg[0]) ** 2 +
    (centerAvg[1] - borderAvg[1]) ** 2 +
    (centerAvg[2] - borderAvg[2]) ** 2
  );
  const presence = clamp(centerBorderDist / 140, 0, 1);

  let gradSum = 0, gradCount = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
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

  const hp = clamp(Math.round(40 + presence * 55 + jitter(14)), 10, 99);
  const atk = clamp(Math.round(15 + detailScore * 75 + jitter(14)), 5, 99);
  const def = clamp(Math.round(15 + (1 - detailScore) * 45 + presence * 25 + jitter(12)), 5, 99);

  const element = pickElement(hue, sat, light);
  const style = pickStyle(detailScore, sat);
  const prefixList = PREFIXES[element];
  const nounList = style === 'mecha' ? MECHA_NOUNS : CREATURE_NOUNS;
  const prefix = prefixList[Math.floor(rand() * prefixList.length)];
  const noun = nounList[Math.floor(rand() * nounList.length)];
  const name = buildName(rand, element, style, prefix, noun);

  const flavorList = FLAVORS[element];
  const note = flavorList[Math.floor(rand() * flavorList.length)];

  const rarity = rarityForPower(hp + atk + def);

  return { name, element, style, hp, atk, def, rarity, note };
}
