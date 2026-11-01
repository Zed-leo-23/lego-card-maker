// AI 배경 제거(WASM/SIMD 필요)를 쓸 수 없는 아주 오래된 기기/브라우저를 위한
// 순수 JS 대체 수단. "단순한 배경(바닥, 책상)에서 찍어주세요" 라는 안내에 맞춰,
// 테두리 색을 기준 삼아 그 색과 비슷하면서 테두리와 연결된 영역만 투명하게 지운다.
// (주의: 비교 기준을 '이웃 픽셀'로 하면 그림자/그라데이션을 타고 색이 점점
// 번져서 피사체까지 통째로 지워지는 문제가 생긴다 - 반드시 고정된 배경색 기준으로
// 비교해야 한다.)

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** 테두리 픽셀을 샘플링해서 배경의 대표 색(채널별 중앙값)을 구한다. */
function sampleBorderColor(data, width, height) {
  const rs = [], gs = [], bs = [];
  const step = Math.max(1, Math.floor((width + height) / 200));
  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      const i = (y * width + x) * 4;
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
  }
  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      const i = (y * width + x) * 4;
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
  }
  return [median(rs), median(gs), median(bs)];
}

/** 테두리와 연결되어 있으면서 배경 기준색과 비슷한 픽셀만 투명 처리 대상으로 표시 */
function floodFillBackground(data, width, height, bgColor, tolerance) {
  const total = width * height;
  const background = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const [br, bg, bb] = bgColor;
  const idx = (x, y) => y * width + x;

  const isBg = (p) => {
    const i = p * 4;
    return colorDistance(data[i], data[i + 1], data[i + 2], br, bg, bb) <= tolerance;
  };

  const stack = [];
  for (let x = 0; x < width; x++) stack.push(idx(x, 0), idx(x, height - 1));
  for (let y = 0; y < height; y++) stack.push(idx(0, y), idx(width - 1, y));

  while (stack.length) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;
    if (!isBg(p)) continue;
    background[p] = 1;

    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0 && !visited[p - 1]) stack.push(p - 1);
    if (x < width - 1 && !visited[p + 1]) stack.push(p + 1);
    if (y > 0 && !visited[p - width]) stack.push(p - width);
    if (y < height - 1 && !visited[p + width]) stack.push(p + width);
  }

  let bgCount = 0;
  for (let p = 0; p < total; p++) bgCount += background[p];
  return { background, bgRatio: bgCount / total };
}

/**
 * @param {HTMLImageElement} img
 * @param {{maxSize?:number, tolerance?:number}} opts
 * @returns {HTMLCanvasElement}
 */
export function simpleRemoveBackground(img, opts = {}) {
  const { maxSize = 1000 } = opts;
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const bgColor = sampleBorderColor(data, width, height);

  // 배경이 지나치게 많이/적게 지워지면 허용치를 조절해 다시 시도한다.
  let tolerance = opts.tolerance ?? 45;
  let result = floodFillBackground(data, width, height, bgColor, tolerance);
  let attempts = 0;
  while (result.bgRatio > 0.9 && attempts < 4) {
    tolerance *= 0.6;
    result = floodFillBackground(data, width, height, bgColor, tolerance);
    attempts++;
  }

  for (let p = 0; p < width * height; p++) {
    if (result.background[p]) data[p * 4 + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
