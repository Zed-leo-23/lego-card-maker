// 배경 제거 결과를 사용자가 직접 탭/드래그로 다듬을 수 있게 해주는 매직완드 도구.
// - 지우기: 탭한 지점과 색이 비슷하게 '연결된' 영역을 투명하게 지운다.
// - 복원: 탭한 지점을 원본 사진과 비교해서, 비슷하게 연결된 영역을 원본 색으로 되살린다.
// 두 경우 모두 "연결된 영역만" 처리하므로, 전혀 다른 색인 피사체 전체가 한번에
// 날아가는 일은 없다.

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * 탭한 지점과 연결되어 있고 색이 비슷한 픽셀을 모두 투명하게 지운다.
 * @param {CanvasRenderingContext2D} ctx 현재 작업 중인 캔버스
 * @param {number} x
 * @param {number} y
 * @param {number} tolerance
 * @returns {boolean} 무언가 지워졌으면 true
 */
export function floodErase(ctx, x, y, tolerance) {
  const { width, height } = ctx.canvas;
  if (x < 0 || y < 0 || x >= width || y >= height) return false;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const startIdx = (y * width + x) * 4;
  if (data[startIdx + 3] === 0) return false; // 이미 투명함

  const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2];
  const visited = new Uint8Array(width * height);
  const stack = [y * width + x];
  let changed = false;

  while (stack.length) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    if (data[i + 3] === 0) continue;
    if (colorDistance(data[i], data[i + 1], data[i + 2], sr, sg, sb) > tolerance) continue;

    data[i + 3] = 0;
    changed = true;

    const px = p % width, py = (p / width) | 0;
    if (px > 0 && !visited[p - 1]) stack.push(p - 1);
    if (px < width - 1 && !visited[p + 1]) stack.push(p + 1);
    if (py > 0 && !visited[p - width]) stack.push(p - width);
    if (py < height - 1 && !visited[p + width]) stack.push(p + width);
  }

  if (changed) ctx.putImageData(imageData, 0, 0);
  return changed;
}

/**
 * 탭한 지점을 기준으로, 원본 사진에서 색이 비슷하게 연결된 영역을 원본 그대로 되살린다.
 * @param {CanvasRenderingContext2D} ctx 현재 작업 중인 캔버스 (투명해진 부분을 복원)
 * @param {CanvasRenderingContext2D} originalCtx 원본 사진을 같은 크기로 그려둔 캔버스
 * @param {number} x
 * @param {number} y
 * @param {number} tolerance
 * @returns {boolean}
 */
export function floodRestore(ctx, originalCtx, x, y, tolerance) {
  const { width, height } = ctx.canvas;
  if (x < 0 || y < 0 || x >= width || y >= height) return false;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const originalData = originalCtx.getImageData(0, 0, width, height).data;

  const startIdx = (y * width + x) * 4;
  if (data[startIdx + 3] !== 0) return false; // 이미 보이는 부분

  const sr = originalData[startIdx], sg = originalData[startIdx + 1], sb = originalData[startIdx + 2];
  const visited = new Uint8Array(width * height);
  const stack = [y * width + x];
  let changed = false;

  while (stack.length) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    if (data[i + 3] !== 0) continue; // 이미 보이면 건너뜀 (복원 대상 아님)
    if (colorDistance(originalData[i], originalData[i + 1], originalData[i + 2], sr, sg, sb) > tolerance) continue;

    data[i] = originalData[i];
    data[i + 1] = originalData[i + 1];
    data[i + 2] = originalData[i + 2];
    data[i + 3] = originalData[i + 3] || 255;
    changed = true;

    const px = p % width, py = (p / width) | 0;
    if (px > 0 && !visited[p - 1]) stack.push(p - 1);
    if (px < width - 1 && !visited[p + 1]) stack.push(p + 1);
    if (py > 0 && !visited[p - width]) stack.push(p - width);
    if (py < height - 1 && !visited[p + width]) stack.push(p + width);
  }

  if (changed) ctx.putImageData(imageData, 0, 0);
  return changed;
}
