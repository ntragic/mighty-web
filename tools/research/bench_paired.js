/**
 * 페어드 벤치마크 (공통난수): 같은 딜에서 A=전원 휴리스틱, B=좌석 k만 NN.
 * 좌석 상금 차이를 딜 단위로 짝지어 비교(분산 축소) + 역할 일치 부분집합에서
 * 역할별 승률과 프렌드 협력 지표를 대조한다.
 * 사용: node bench_paired.js [게임수] [성향...]
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ORT_PATH = process.env.ORT_PATH || 'onnxruntime-node';
const ort = require(ORT_PATH);
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
// AGENT=advanced 면 B팔에 NN 대신 고급 티어 휴리스틱을 앉힌다 (휴리스틱 A/B용)
const AGENT = process.env.AGENT || 'nn';
// 어블레이션용 가중치 오버라이드: WOVR='{"advJitter":0.3}'
const WOVR = process.env.WOVR ? JSON.parse(process.env.WOVR) : undefined;

const NUM = 5;
const isPoint = c => !E.isJoker(c) && c.rank >= 10;

/** history 트릭에서 카드 서열 재계산용 pl 스텁 */
function stubPl(t) {
  const p0 = t.plays[0];
  return {
    ledSuit: p0.jokerSuit || (E.isJoker(p0.card) ? null : p0.card.suit),
    trickNo: t.trickNo,
    jokerCallActive: t.plays.some(x => x.jokerCall),
  };
}
const stronger = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

/** 프렌드 좌석 S의 협력 지표 */
function coopMetrics(g, S) {
  const decl = g.result.declarer;
  let steal = 0, stealChance = 0, waste = 0, wasteDen = 0, leak = 0, feed = 0, ptsPlayed = 0;
  for (const t of g.play.history) {
    const pl = stubPl(t);
    const key = e => g._cardStrength(e, pl);
    const mine = t.plays.find(e => e.player === S);
    if (!mine) continue;
    // 주공이 S의 카드 없이 이겼을 트릭인가
    let bestE = null, bestK = [-2, -1];
    for (const e of t.plays) {
      if (e.player === S) continue;
      const k = key(e);
      if (stronger(k, bestK)) { bestK = k; bestE = e; }
    }
    const declWouldWin = bestE && bestE.player === decl;
    if (declWouldWin) {
      stealChance++;
      if (t.winner === S) steal++;             // 팀 내부 탈취(자원 낭비)
    }
    if (E.isJoker(mine.card) || E.sameCard(mine.card, g.mightyCard)) {
      wasteDen++;
      if (t.points === 0) waste++;             // 무가치 트릭에 마이티·조커 소진
    }
    if (isPoint(mine.card)) {
      ptsPlayed++;
      if (t.winner === decl) feed++;                    // 주공 트릭에 점수 공급
      if (t.winner !== decl && t.winner !== S) leak++;  // 야당 트릭에 점수 헌납
    }
  }
  return { steal, stealChance, waste, wasteDen, leak, feed, ptsPlayed };
}

async function playGame(seed, persona, nnSeat, sess) {
  const g = new E.MightyGame({ seed });
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng);
  const altAgent = AGENT === 'advanced'
    ? new E.HeuristicAgent({ ...E.PERSONAS[persona], weights: WOVR }, g.rng,
                           { tier: 'advanced' }) : null;
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const pick = [];
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 500) return null;
    if (nnSeat != null && g.currentPlayer === nnSeat) {
      if (altAgent) {
        g.act(altAgent.act(g));
      } else {
        const a = await M.chooseAction(sess, ort, g, nnSeat, pick);
        const act = M.actionToEngine(a, g, pick);
        if (act) g.act(act);
      }
    } else {
      g.act(agent.act(g));
    }
  }
  const r = g.result;
  return { g, declarer: r.declarer, friend: r.friend, win: !!r.win,
           count: r.contract.count, giruda: r.contract.giruda, prizes: r.prizes };
}

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const se = a => Math.sqrt(a.reduce((s, x) => s + (x - mean(a)) ** 2, 0) / (a.length - 1) / a.length);
const pct = (w, n) => n ? (w / n * 100).toFixed(1) + '%' : '—';

(async () => {
  const sess = AGENT === 'advanced' ? null : await ort.InferenceSession.create(MODEL);
  console.log(AGENT === 'advanced' ? 'B팔: 고급 티어 휴리스틱 (A팔: 중급)' : `model: ${MODEL}`);
  const N = parseInt(process.argv[2] || '600', 10);
  const personas = process.argv.slice(3);
  const list = personas.length ? personas : ['gambler', 'balanced', 'careful'];

  for (const persona of list) {
    let seed = 300000, done = 0, matched = 0, nnDecl = 0, v2Decl = 0;
    const dPrize = [];
    const role = { declarer: [0, 0], friend: [0, 0], defender: [0, 0] };   // [NN여당승, n]
    const roleBase = { declarer: [0, 0], friend: [0, 0], defender: [0, 0] };
    const cNN = { steal: 0, stealChance: 0, waste: 0, wasteDen: 0, leak: 0, feed: 0, ptsPlayed: 0 };
    const cV2 = { steal: 0, stealChance: 0, waste: 0, wasteDen: 0, leak: 0, feed: 0, ptsPlayed: 0 };
    let friendPairs = 0;
    while (done < N) {
      const s = ++seed;
      const k = done % NUM;
      const A = await playGame(s, persona, null, sess);
      if (!A) continue;
      const B = await playGame(s, persona, k, sess);
      if (!B) continue;
      done++;
      dPrize.push(B.prizes[k] - A.prizes[k]);
      if (B.declarer === k) nnDecl++;
      if (A.declarer === k) v2Decl++;
      const same = A.declarer === B.declarer && A.friend === B.friend &&
                   A.count === B.count && A.giruda === B.giruda;
      if (!same) continue;
      matched++;
      const r = B.declarer === k ? 'declarer'
              : (B.friend != null && B.friend === k && B.friend !== B.declarer) ? 'friend'
              : 'defender';
      role[r][0] += B.win ? 1 : 0; role[r][1]++;
      roleBase[r][0] += A.win ? 1 : 0; roleBase[r][1]++;
      if (r === 'friend') {
        friendPairs++;
        const mb = coopMetrics(B.g, k), ma = coopMetrics(A.g, k);
        for (const key of Object.keys(cNN)) { cNN[key] += mb[key]; cV2[key] += ma[key]; }
      }
    }
    console.log(`\n### ${persona}  (딜 ${done}쌍, 역할일치 ${matched} = ${(matched / done * 100).toFixed(0)}%)`);
    console.log(`좌석 상금 페어드 차이  ${mean(dPrize) >= 0 ? '+' : ''}${mean(dPrize).toFixed(1)} ± ${se(dPrize).toFixed(1)}`);
    console.log(`해당좌석 주공빈도     B ${pct(nnDecl, done)} vs A ${pct(v2Decl, done)}`);
    for (const r of ['declarer', 'friend', 'defender']) {
      const [w, n] = role[r], [bw, bn] = roleBase[r];
      const d = n ? (w / n - bw / bn) * 100 : 0;
      console.log(`  ${r.padEnd(9)} 여당승률 NN ${pct(w, n)} vs v2 ${pct(bw, bn)}  Δ${d >= 0 ? '+' : ''}${d.toFixed(1)}pt  (n=${n})`);
    }
    if (friendPairs) {
      const f = (o, a, b) => `${pct(o[a], o[b])}`;
      console.log(`  프렌드 협력지표 (동일 딜 ${friendPairs}쌍, 낮을수록 협력적)`);
      console.log(`    팀내부 트릭탈취  NN ${f(cNN, 'steal', 'stealChance')} vs v2 ${f(cV2, 'steal', 'stealChance')}`);
      console.log(`    마이티·조커 낭비 NN ${f(cNN, 'waste', 'wasteDen')} vs v2 ${f(cV2, 'waste', 'wasteDen')}`);
      console.log(`    야당에 점수 헌납 NN ${f(cNN, 'leak', 'ptsPlayed')} vs v2 ${f(cV2, 'leak', 'ptsPlayed')}`);
      console.log(`    주공에 점수 공급  NN ${f(cNN, 'feed', 'ptsPlayed')} vs v2 ${f(cV2, 'feed', 'ptsPlayed')} (높을수록 협력적)`);
    }
  }
})();
