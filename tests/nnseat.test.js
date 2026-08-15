/* 신경망 좌석이 실제로 로드된 상태의 한 판 진행 검증.
 *
 * smoke.test.js는 jsdom에서 onnxruntime 스크립트 로드가 실패해 항상 규칙기반으로
 * 떨어진다. 그래서 v2.11.0의 "티어별 신경망 좌석" 경로가 검사되지 않았고,
 * 배포본에서 비딩 단계 정지가 났다. 이 테스트는 window.ort에 onnxruntime-node를
 * 넣어 그 경로를 실제로 태운다.
 *
 * 티어는 env TIER로 고른다 (기본 intermediate).
 */
const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
const { JSDOM } = require('jsdom');
const fs = require('fs');
const ortNode = require('onnxruntime-node');

const WEB = __P('../web');
const html = fs.readFileSync(__P('../web/index.html'), 'utf8');
const TIER = process.env.TIER || 'intermediate';

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = q => ({ matches: true, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
    Object.defineProperty(window.navigator, 'language', { value: 'ko-KR' });
    // jsdom은 별도 실행영역이라 typed array 생성자가 다르다. onnxruntime-node가
    // 자기 실행영역의 Float32Array를 요구하므로 노드 것을 주입한다(하네스 한정).
    window.Float32Array = Float32Array;
    window.Uint8Array = Uint8Array;
    window.BigInt64Array = BigInt64Array;
    // 브라우저에서 ort가 로드된 상태를 흉내낸다. 모델 경로 './model/x.onnx'는
    // web/ 기준이므로 절대경로로 바꿔 준다.
    const wrap = {
      env: { wasm: {} },
      Tensor: ortNode.Tensor,
      InferenceSession: {
        create: (p) => ortNode.InferenceSession.create(
          typeof p === 'string' ? __path.join(WEB, p.replace(/^\.\//, '')) : p),
      },
    };
    window.ort = wrap;
  },
});
const w = dom.window;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(150);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }

  MUI.settings.ui.difficulty = TIER;
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 1;
  MUI.settings.ui.speed = 'fast';

  const ok = await MUI.ensureNN();
  const seats = MUI.seatModels.slice(1);
  console.log(`티어 ${TIER} · 모델 로드 ${ok ? '성공' : '실패'} · 좌석 [${seats.join(' ')}]`);
  if (!ok) { console.error('FAIL: 신경망 로드에 실패했다 — 이 테스트는 로드 성공 경로를 검사한다'); process.exit(1); }

  MUI.newMatch();
  await sleep(100);

  // 비딩이 진행되는지 본다 — 정지하면 여기서 걸린다
  let humanActs = 0, guard = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await sleep(40);
    if (++guard > 2000) break;
    const g = MUI.game;
    if (!g) continue;
    if (g.phase === 'done' || MUI.matchOver) break;
    if (MUI.busy) continue;
    if (g.currentPlayer !== 0) continue;
    if (g.phase === 'bidding') { MUI.humanAct({ type: 'pass' }); humanActs++; }
    else if (g.phase === 'floor') {
      MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) }); humanActs++;
    } else if (g.phase === 'friend') {
      MUI.humanAct({ type: 'friend', mode: 'first' }); humanActs++;
    } else if (g.phase === 'play') {
      const legal = g._legalPlays(0).filter(m => !m.jokerCall);
      if (legal.length) { MUI.humanAct({ type: 'play', card: legal[0].card }); humanActs++; }
    }
  }
  const g = MUI.game;
  const phase = g ? g.phase : 'none';
  const trick = g && g.play ? g.play.trickNo : 0;
  console.log(`진행 결과 — phase ${phase} · 트릭 ${trick} · 내 착수 ${humanActs}회`);
  if (phase === 'bidding' && humanActs === 0) {
    console.error('FAIL: 비딩에서 정지했다 (공약 모달 미표시 재현)');
    process.exit(1);
  }
  if (humanActs === 0) { console.error('FAIL: 사람 차례가 한 번도 오지 않았다'); process.exit(1); }

  // 매치 시작 후에도 좌석 구성이 그 티어 그대로여야 한다.
  // v2.11.0은 newMatch()가 assignSeatModels()를 인자 없이 불러 마스터 판에
  // 중급 구성(v5 하나 + 규칙기반 셋)이 앉았다 — 라벨 없는 좌석으로 드러났다.
  const plan = MUI.seatModels.slice(1);
  const want = { intermediate: 1, advanced: 4, master: 4 }[TIER];
  const nnCount = plan.filter(x => x && x !== 'H').length;
  console.log(`매치 후 좌석 [${plan.join(' ')}] · 신경망 ${nnCount}자리 (기대 ${want})`);
  if (nnCount !== want) {
    console.error(`FAIL: ${TIER} 좌석 구성이 어긋났다 — 다른 티어 구성으로 덮였을 수 있다`);
    process.exit(1);
  }
  if (TIER === 'master' && plan.some(x => x === 'v5')) {
    console.error('FAIL: 마스터 판에 중급 모델(v5)이 앉았다');
    process.exit(1);
  }

  // 매치 종료 화면의 좌석 라벨 — 신경망 좌석은 전부 닉네임이 보여야 한다
  if (MUI.matchOver) {
    const nb = w.document.querySelector('#next-btn');
    if (nb) { nb.click(); await sleep(300); }
    const rows = [...w.document.querySelectorAll('.rank-row .nm')];
    if (rows.length) {
      // AI 좌석 4개는 전부 라벨이 있어야 한다 — 신경망은 닉네임, 규칙기반은 '규칙기반'.
      const tags = rows.map(r => r.querySelector('.style-tag')).filter(Boolean).map(x => x.textContent);
      console.log(`라벨 ${tags.length}/4 — ${tags.join(' · ')}`);
      if (tags.length !== 4) { console.error('FAIL: AI 좌석 4개 중 라벨이 빠진 자리가 있다'); process.exit(1); }
      const nnTags = tags.filter(x => x !== '규칙기반').length;
      if (nnTags !== nnCount) {
        console.error(`FAIL: 신경망 라벨 ${nnTags}개인데 신경망 좌석은 ${nnCount}개다`);
        process.exit(1);
      }
    }
  }
  console.log('nnseat: PASS');
  process.exit(0);
})().catch(e => { console.error('FAIL:', e && e.message); process.exit(1); });
