#!/usr/bin/env node
/**
 * build.mjs — src/ 모듈을 web/index.template.html 에 주입해 web/index.html 을 만든다.
 *
 *   node tools/build.mjs            # 빌드
 *   node tools/build.mjs --check    # 빌드 결과가 현재 index.html 과 같은지만 확인 (CI용)
 *
 * 주입 규칙
 *   engine → 전역 스코프 (window.MightyEngine 노출)
 *   master → IIFE 로 감싼다 (엔진과 SUITS 등 상수명이 겹친다)
 *   ai     → 전역 스코프 (window.MightyAI 노출)
 *   ui     → 전역 스코프 (게임 드라이버)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');

const template = read('web/index.template.html');
const parts = {
  engine: read('src/mighty-engine.js'),
  master: read('src/mighty-master.js'),
  ai: read('src/mighty-ai.js'),
  ui: read('src/ui.js'),
};

// master 는 전역 상수 충돌을 피하려고 IIFE 로 감싼다
const wrap = (name, code) =>
  name === 'master' ? `\n(function(){\n${code}\n})();\n` : `\n${code}\n`;

let out = template;
for (const [name, code] of Object.entries(parts)) {
  const token = `/*__INJECT:${name}__*/`;
  if (!out.includes(token)) throw new Error(`템플릿에 ${token} 가 없다`);
  out = out.replace(token, wrap(name, code));
}

// 버전 라벨 확인 (CHANGELOG 동기화 검사에 쓰인다)
const ver = out.match(/const APP_VERSION = '(v[\d.]+)'/)?.[1];
if (!ver) throw new Error('APP_VERSION 을 찾을 수 없다');

if (process.argv.includes('--check')) {
  const current = read('web/index.html');
  if (current !== out) {
    console.error('빌드 결과가 web/index.html 과 다르다. `npm run build` 를 실행해라.');
    process.exit(1);
  }
  console.log(`build check OK (${ver})`);
} else {
  writeFileSync(join(ROOT, 'web/index.html'), out);
  console.log(`built web/index.html — ${ver}, ${(out.length / 1024).toFixed(0)} KB`);
}
