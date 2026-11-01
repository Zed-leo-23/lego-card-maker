// AI 배경 제거(WASM/SIMD 필요)를 쓸 수 없는 아주 오래된 기기/브라우저를 위한
// 순수 JS 대체 수단. "단순한 배경(바닥, 책상)에서 찍어주세요" 라는 안내에 맞춰,
// 테두리에서 시작하는 flood fill로 배경과 비슷한 색을 투명하게 지운다.
// AI 방식만큼 정교하진 않지만 어떤 기기에서도 동작한다.

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * @param {HTMLImageElement} img
 * @param {{maxSize?:number, tolerance?:number}} opts
 * @returns {HTMLCanvasElement}
 */
export function simpleRemoveBackground(img, opts = {}) {
  const { maxSize = 1000, tolerance = 30 } = opts;
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
  const total = width * height;
  const background = new Uint8Array(total); // 1 = 배경으로 판정됨
  const visited = new Uint8Array(total);

  const idx = (x, y) => y * width + x;

  const stack = [];
  for (let x = 0; x < width; x++) {
    stack.push(idx(x, 0), idx(x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    stack.push(idx(0, y), idx(width - 1, y));
  }

  while (stack.length) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    background[p] = 1;

    const x = p % width;
    const y = (p / width) | 0;
    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < width - 1 ? p + 1 : -1,
      y > 0 ? p - width : -1,
      y < height - 1 ? p + width : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      const ni = n * 4;
      if (colorDistance(r, g, b, data[ni], data[ni + 1], data[ni + 2]) <= tolerance) {
        stack.push(n);
      }
    }
  }

  for (let p = 0; p < total; p++) {
    if (background[p]) data[p * 4 + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
