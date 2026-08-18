/**
 * 브라우저 실측 러너 — 크롬을 헤드리스로 띄우고 bench-search.html의 runBench()를
 * CDP로 부른다. 드라이버 의존성(puppeteer 등) 없이 Node 22의 내장 WebSocket만 쓴다.
 *
 * 사용: node tools/bench/run-bench.mjs [딜수] [K] [gate]
 * 인자: 딜수 K gate budgetMs
 *   env CHROME(실행 파일) · PORT(정적 서버, 기본 8099) · CDP(기본 9222)
 *       THROTTLE(CPU 배속 감속, 예: 4 = 저사양 기기 흉내)
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const PORT = parseInt(process.env.PORT || '8099', 10);
const CDP = parseInt(process.env.CDP || '9222', 10);
const CHROME = process.env.CHROME || 'google-chrome';
const [deals = '12', K = '16', gate = '0.6', budget = '4000'] = process.argv.slice(2);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
               '.json': 'application/json' };

const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])));
    if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream',
                         'cache-control': 'no-store' });
    res.end(body);
  } catch (e) { res.writeHead(404).end(String(e && e.message)); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const url = `http://127.0.0.1:${PORT}/tools/bench/bench-search.html`;
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/mighty-bench-profile', url,
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function pageTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
      const t = list.find(x => x.type === 'page' && x.url.includes('bench-search'));
      if (t && t.webSocketDebuggerUrl) return t;
    } catch (e) { /* 아직 안 떴다 */ }
    await sleep(500);
  }
  throw new Error('크롬 디버깅 타깃을 못 찾았다');
}

const target = await pageTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise(res => {
  const i = ++id;
  pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});

// 저사양 기기 흉내 — 개발 데스크톱 수치만 보면 모바일에서 물린다
const THROTTLE = parseFloat(process.env.THROTTLE || '1');
if (THROTTLE > 1) await send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

// 페이지 스크립트가 다 뜰 때까지 기다린다
for (let i = 0; i < 60; i++) {
  const r = await send('Runtime.evaluate', { expression: 'typeof window.runBench' });
  if (r.result?.result?.value === 'function') break;
  await sleep(500);
}

const expr = `window.runBench({deals:${deals}, K:${K}, gate:${gate}, budgetMs:${budget}}).then(JSON.stringify)`;
const out = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
const val = out.result?.result?.value;
if (!val) {
  console.error('실패:', JSON.stringify(out.result, null, 2));
  process.exitCode = 1;
} else {
  const r = JSON.parse(val);
  const f = x => (x && x.n ? `n=${x.n} 평균 ${x.avg.toFixed(0)}ms · 중앙 ${x.p50.toFixed(0)}ms · 최대 ${x.max.toFixed(0)}ms` : '없음');
  console.log(`\n브라우저 실측 (wasm 1스레드${THROTTLE > 1 ? ` · CPU 1/${THROTTLE}` : ''}) · 모델 로드 ${r.loadMs.toFixed(0)}ms · ${r.deals}판 · 수 ${r.moves}`);
  console.log(`  설정 K=${r.K} gate=${r.gate} · 클래스 국면 ${r.classStates} (딜당 ${(r.classStates / Math.max(1, r.deals)).toFixed(2)})` +
    ` · 탐색 발화 딜당 ${r.firedPerDeal.toFixed(2)}회`);
  console.log(`  탐색 한 수      ${f(r.search)}`);
  console.log(`  같은 국면 정책  ${f(r.policyAtSameStates)}`);
  console.log(`  ${r.ua}`);
}
ws.close();
chrome.kill();
server.close();
process.exit(process.exitCode || 0);
