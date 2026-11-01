// 배경 제거 라이브러리(@imgly/background-removal)는 기본적으로 모델/wasm 파일을
// 매 실행마다 staticimgly.com(외부 CDN)에서 내려받는다. 일부 네트워크 환경(모바일
// 통신사, 공용 와이파이, 콘텐츠 필터 등)에서 그 CDN이 막히거나 느리면 배경 제거가
// 조용히 실패한다. 이 스크립트는 빌드 시점에 필요한 파일만 내려받아
// public/bg-assets/ 에 저장해서, 배포 후에는 우리 사이트(GitHub Pages) 자신에서
// 서빙하도록 만든다 — 외부 CDN 의존성을 없애고 신뢰성을 높인다.
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(
  await readFile(path.join(ROOT, 'node_modules/@imgly/background-removal/package.json'), 'utf8')
);
const VERSION = pkg.version;
// isnet_quint8(small)은 다운로드는 가볍지만 결과 품질이 눈에 띄게 떨어져서(노이즈 심함)
// 기본값인 isnet_fp16(medium)을 사용한다. 용량은 더 크지만 결과가 훨씬 깨끗하다.
const MODEL = 'isnet_fp16';

const CDN_BASE = `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/dist/`;
const OUT_DIR = path.join(ROOT, 'public', 'bg-assets');

const NEEDED_KEYS = [
  `/models/${MODEL}`,
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
];

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`[fetch-bg-assets] manifest: ${CDN_BASE}resources.json`);
  const res = await fetch(`${CDN_BASE}resources.json`);
  if (!res.ok) throw new Error(`resources.json fetch failed: ${res.status}`);
  const manifest = await res.json();

  const trimmed = {};
  for (const key of NEEDED_KEYS) {
    const entry = manifest[key];
    if (!entry) throw new Error(`manifest missing expected key: ${key}`);
    trimmed[key] = entry;

    for (const chunk of entry.chunks) {
      const dest = path.join(OUT_DIR, chunk.name);
      if (await exists(dest)) continue;
      const url = `${CDN_BASE}${chunk.name}`;
      process.stdout.write(`[fetch-bg-assets] downloading ${chunk.name} (${key})...\n`);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`chunk fetch failed (${url}): ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      await writeFile(dest, buf);
    }
  }

  await writeFile(path.join(OUT_DIR, 'resources.json'), JSON.stringify(trimmed));
  console.log(`[fetch-bg-assets] done -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[fetch-bg-assets] failed:', err);
  process.exit(1);
});
