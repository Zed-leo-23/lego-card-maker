// 2D 레고 애니메이션 스타일 필터
// - 색상 단순화(posterize)
// - 채도 보정
// - 실루엣 외곽선 + 내부 윤곽선(에지) 굵은 잉크선 (토이/카드 스타일)

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) { h = 0; s = 0; }
  else {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

/** 분리형(가로->세로) 최대값 필터로 마스크를 굵게 확장(dilate) */
function dilateMask(mask, width, height, radius) {
  if (radius <= 0) return mask;
  const tmp = new Uint8Array(width * height);
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let v = 0;
      const lo = Math.max(0, x - radius), hi = Math.min(width - 1, x + radius);
      for (let xx = lo; xx <= hi; xx++) {
        if (mask[row + xx]) { v = 1; break; }
      }
      tmp[row + x] = v;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let v = 0;
      const lo = Math.max(0, y - radius), hi = Math.min(height - 1, y + radius);
      for (let yy = lo; yy <= hi; yy++) {
        if (tmp[yy * width + x]) { v = 1; break; }
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

/**
 * @param {HTMLCanvasElement|HTMLImageElement|ImageBitmap} source
 * @param {{levels:number, saturation:number, edgeStrength:number, maxSize?:number}} opts
 * @returns {HTMLCanvasElement}
 */
export function applyLegoAnimationStyle(source, opts) {
  const { levels = 4, saturation = 130, edgeStrength = 55, maxSize = 1100 } = opts;

  const srcW = source.width, srcH = source.height;
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const satFactor = saturation / 100;
  const levelSteps = Math.max(2, Math.round(levels)) - 1;

  // 1) 채도 보정 + 색상 단순화(posterize)
  const luma = new Float32Array(width * height);
  const alphaMask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    alphaMask[p] = a > 20 ? 1 : 0;
    if (a === 0) { luma[p] = 0; continue; }

    let [h, s, l] = rgbToHsl(r, g, b);
    s = clamp01(s * satFactor);
    let [nr, ng, nb] = hslToRgb(h, s, l);

    nr = Math.round(Math.round((nr / 255) * levelSteps) / levelSteps * 255);
    ng = Math.round(Math.round((ng / 255) * levelSteps) / levelSteps * 255);
    nb = Math.round(Math.round((nb / 255) * levelSteps) / levelSteps * 255);

    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
    luma[p] = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
  }

  // 2) 내부 윤곽선: 루마에 대한 Sobel 에지 검출
  const edgeMask = new Uint8Array(width * height);
  const sobelThreshold = 90 - edgeStrength * 0.55; // 세기가 높을수록 민감하게
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (!alphaMask[p]) continue;
      const tl = luma[p - width - 1], t = luma[p - width], tr = luma[p - width + 1];
      const l = luma[p - 1], r = luma[p + 1];
      const bl = luma[p + width - 1], b = luma[p + width], br = luma[p + width + 1];
      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > sobelThreshold) edgeMask[p] = 1;
    }
  }

  // 3) 실루엣 외곽선: 투명/불투명 경계
  const silhouetteMask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!alphaMask[p]) continue;
      const isEdge =
        x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        !alphaMask[p - 1] || !alphaMask[p + 1] ||
        !alphaMask[p - width] || !alphaMask[p + width];
      if (isEdge) silhouetteMask[p] = 1;
    }
  }

  const innerRadius = Math.max(0, Math.round(edgeStrength / 100 * 1.6));
  const outerRadius = Math.max(1, Math.round(1 + edgeStrength / 100 * 3.4));
  const thickEdge = dilateMask(edgeMask, width, height, innerRadius);
  const thickSilhouette = dilateMask(silhouetteMask, width, height, outerRadius);

  for (let p = 0; p < width * height; p++) {
    if (!alphaMask[p]) continue;
    if (thickEdge[p] || thickSilhouette[p]) {
      const i = p * 4;
      data[i] = 24; data[i + 1] = 20; data[i + 2] = 28; // 잉크 라인 색
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function loadImageFromBlob(blobOrFile) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blobOrFile);
  });
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
