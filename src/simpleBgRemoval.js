// AI 배경 제거(WASM/SIMD 필요)를 쓸 수 없는 아주 오래된 기기/브라우저를 위한
// 순수 JS 대체 수단. "단순한 배경(바닥, 책상)에서 찍어주세요" 라는 안내에 맞춰,
// 배경과 색이 비슷한 영역을 지운다.
//
// 과거 시행착오:
// 1) 이웃 픽셀과 비교하며 번지는 방식 -> 그림자/그라데이션을 타고 색이 점점
//    변해서 피사체까지 통째로 지워짐. => 반드시 '고정된 배경 대표색'과 비교.
// 2) 배경 대표색을 1개(중앙값)만 쓰는 방식 -> "흰 배경지 + 나무 책상 + 조명
//    하이라이트"처럼 톤이 여러 개 섞인 배경에서 일부가 안 지워짐.
//    => 테두리에서 자주 나오는 색 여러 개를 대표색(클러스터)으로 뽑는다.
// 3) 테두리에서부터 '연결된' 픽셀만 지우는 flood fill -> 두 대표색 사이의
//    그라데이션 전환 구간이 둘 중 어느 색과도 안 맞아서 "벽"이 되어, 그 너머
//    (예: 중앙의 조명 반사 얼룩)에 닿지 못해 안 지워짐.
//    => 연결 여부 대신 "색이 배경과 비슷한 덩어리"를 전부 찾은 뒤, 그 중
//    테두리에 닿아있거나 아주 작은(= 피사체일 리 없는 얼룩/반사) 덩어리만
//    지운다. 크고 테두리에 안 닿은 덩어리(= 피사체)는 보존된다.

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** 테두리 픽셀을 양자화해서 자주 나오는 색 상위 몇 개를 대표색으로 뽑는다. */
function sampleBorderClusters(data, width, height, maxClusters = 10) {
  const bins = new Map(); // key -> {r,g,b,count}
  const margin = Math.max(2, Math.round(Math.min(width, height) * 0.02));

  const add = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    let e = bins.get(key);
    if (!e) { e = { r: 0, g: 0, b: 0, count: 0 }; bins.set(key, e); }
    e.r += r; e.g += g; e.b += b; e.count += 1;
  };

  const step = Math.max(1, Math.floor((width + height) / 400));
  for (let m = 0; m < margin; m += Math.max(1, Math.floor(margin / 3))) {
    for (let x = 0; x < width; x += step) {
      add((m * width + x) * 4);
      add(((height - 1 - m) * width + x) * 4);
    }
    for (let y = 0; y < height; y += step) {
      add((y * width + m) * 4);
      add((y * width + (width - 1 - m)) * 4);
    }
  }

  const sorted = [...bins.values()].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, e) => s + e.count, 0) || 1;

  const clusters = [];
  let covered = 0;
  for (const e of sorted) {
    clusters.push([e.r / e.count, e.g / e.count, e.b / e.count]);
    covered += e.count;
    if (clusters.length >= maxClusters || covered / total > 0.97) break;
  }
  return clusters.length ? clusters : [[255, 255, 255]];
}

/**
 * 배경과 색이 비슷한 픽셀 덩어리(연결 요소)를 모두 찾고, 그 중 테두리에
 * 닿아있거나 충분히 작은 덩어리만 "지울 대상"으로 표시한다.
 */
function findBackgroundRegions(data, width, height, clusters, tolerance) {
  const total = width * height;
  const matches = (p) => {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (const [cr, cg, cb] of clusters) {
      if (colorDistance(r, g, b, cr, cg, cb) <= tolerance) return true;
    }
    return false;
  };

  const labeled = new Int32Array(total).fill(-1);
  const smallIslandCap = Math.max(400, Math.round(total * 0.05));
  const background = new Uint8Array(total);
  let removedCount = 0;

  const stack = [];
  for (let start = 0; start < total; start++) {
    if (labeled[start] !== -1 || !matches(start)) continue;

    let touchesBorder = false;
    let size = 0;
    const members = [];
    stack.length = 0;
    stack.push(start);
    labeled[start] = start; // 컴포넌트 id로 시작 인덱스를 재사용

    while (stack.length) {
      const p = stack.pop();
      size++;
      members.push(p);
      const x = p % width;
      const y = (p / width) | 0;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;

      const neighbors = [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y < height - 1 ? p + width : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || labeled[n] !== -1) continue;
        if (!matches(n)) continue;
        labeled[n] = start;
        stack.push(n);
      }
    }

    if (touchesBorder || size <= smallIslandCap) {
      for (const p of members) background[p] = 1;
      removedCount += size;
    }
  }

  return { background, bgRatio: removedCount / total };
}

/**
 * @param {HTMLImageElement} img
 * @param {{maxSize?:number, tolerance?:number}} opts
 * @returns {HTMLCanvasElement}
 */
export function simpleRemoveBackground(img, opts = {}) {
  const { maxSize = 900 } = opts;
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

  const clusters = sampleBorderClusters(data, width, height);

  // 피사체는 테두리에 닿지 않는 한, 색이 달라서 애초에 "배경 덩어리"로
  // 분류되지 않는다 (findBackgroundRegions의 설계). 그래서 배경 비율이
  // 높다고 무조건 허용치를 줄이면 안 된다 - 피사체가 화면에서 작게 찍힌
  // 정상적인 사진일 수도 있다. 배경이 거의 안 지워졌을 때만(클러스터가
  // 부족했을 가능성) 허용치를 늘려서 다시 시도한다.
  let tolerance = opts.tolerance ?? 42;
  let result = findBackgroundRegions(data, width, height, clusters, tolerance);
  let attempts = 0;
  while (result.bgRatio < 0.12 && tolerance < 160 && attempts < 5) {
    tolerance *= 1.4;
    result = findBackgroundRegions(data, width, height, clusters, tolerance);
    attempts++;
  }

  for (let p = 0; p < width * height; p++) {
    if (result.background[p]) data[p * 4 + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
