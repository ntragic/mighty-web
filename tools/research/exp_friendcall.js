/**
 * NN 주공의 프렌드 콜 분포 측정: 무슨 카드를 부르고, 그게 셀프인지 진짜 프렌드인지, 승률은 어떤지.
 * 사용: node exp_friendcall.js [게임수]   env: MODEL=
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;
const RN = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const name = c => E.isJoker(c) ? 'JOKER' : `${c.suit}${RN[c.rank] || c.rank}`;

async function play(seed, persona, sess) {
  const g = new E.MightyGame({ seed });
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: 'advanced' });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const picks = [[], [], [], [], []];
  let guard = 0, call = null;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 800) return null;
    const seat = g.currentPlayer;
    const wasFriendPhase = g.phase === 'friend';
    const a = await M.chooseAction(sess, ort, g, seat, picks[seat]);
    const act = M.actionToEngine(a, g, picks[seat]);
    if (!act) continue;
    if (wasFriendPhase) {
      const declHand = g.hands[g.declarer].slice();
      const floor = g.discard.slice();
      const mightyC = g.contract.giruda === 'S' ? { suit: 'D', rank: 14 } : { suit: 'S', rank: 14 };
      const gA = g.contract.giruda !== 'N' ? { suit: g.contract.giruda, rank: 14 } : null;
      call = { mode: act.mode, card: act.card || null,
               hasMighty: g.hands[g.declarer].some(c => E.sameCard(c, mightyC)),
               hasJoker: g.hands[g.declarer].some(c => E.isJoker(c)),
               hasGirudaA: gA ? g.hands[g.declarer].some(c => E.sameCard(c, gA)) : false,
               inDeclHand: act.card ? declHand.some(c => E.sameCard(c, act.card)) : false,
               inFloor: act.card ? floor.some(c => E.sameCard(c, act.card)) : false,
               giruda: g.contract.giruda, count: g.contract.count };
    }
    g.act(act);
  }
  const r = g.result;
  call.realFriend = (r.friend != null && r.friend !== r.declarer);
  call.win = !!r.win;
  call.prize = r.prizes[r.declarer];
  return call;
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
(async () => {
  const N = parseInt(process.argv[2] || '600', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const byCard = {}, byRank = {};
  let n = 0, seed = 700000;
  const cat = { mighty: 0, joker: 0, girudaA: 0, otherHigh: 0, low: 0 };
  const catWin = { mighty: 0, joker: 0, girudaA: 0, otherHigh: 0, low: 0 };
  const catReal = { mighty: 0, joker: 0, girudaA: 0, otherHigh: 0, low: 0 };
  let modeCard = 0, modeFirst = 0, modeNone = 0, selfHand = 0, selfFloor = 0, real = 0;
  const lows = [];                       // 낮은 카드 콜의 맥락 샘플
  // 조커 콜 분해: 주공이 마이티를 쥐었는가 (쥐었으면 마이티 콜 불가 → 조커가 정석)
  const jk = { held: 0, heldWin: 0, notHeld: 0, notHeldWin: 0 };
  const mg = { n: 0, win: 0 };           // 마이티 콜 (마이티 미보유 시 정석)
  const notHeldSamples = [];
  const bothHeld = { n: 0, low: 0, first: 0, other: 0 };
  while (n < N) {
    const r = await play(++seed, ['gambler', 'balanced', 'careful'][n % 3], sess);
    if (!r) continue;
    n++;
    if (r.hasMighty && r.hasJoker) {     // 마이티·조커를 주공이 다 쥔 상황
      bothHeld.n++;
      if (r.mode === 'first') bothHeld.first++;
      else if (r.mode === 'card' && !E.isJoker(r.card) && r.card.rank < 11) bothHeld.low++;
      else bothHeld.other++;
    }
    if (r.mode === 'first') { modeFirst++; continue; }
    if (r.mode === 'none') { modeNone++; continue; }
    modeCard++;
    const k = name(r.card);
    byCard[k] = (byCard[k] || 0) + 1;
    const rk = E.isJoker(r.card) ? 'JOKER' : r.card.rank;
    byRank[rk] = (byRank[rk] || 0) + 1;
    if (r.inDeclHand) selfHand++;
    if (r.inFloor) selfFloor++;
    if (r.realFriend) real++;
    const mighty = r.giruda === 'S' ? { suit: 'D', rank: 14 } : { suit: 'S', rank: 14 };
    let c;
    if (E.sameCard(r.card, mighty)) c = 'mighty';
    else if (E.isJoker(r.card)) c = 'joker';
    else if (r.giruda !== 'N' && r.card.suit === r.giruda && r.card.rank === 14) c = 'girudaA';
    else if (r.card.rank >= 11) c = 'otherHigh';
    else c = 'low';
    cat[c]++; if (r.win) catWin[c]++; if (r.realFriend) catReal[c]++;
    if (c === 'joker') {
      if (r.hasMighty) { jk.held++; if (r.win) jk.heldWin++; }
      else {
        jk.notHeld++; if (r.win) jk.notHeldWin++;
        if (notHeldSamples.length < 12)
          notHeldSamples.push(`기루다${r.giruda}${r.count} 기루다A보유${r.hasGirudaA ? 'Y' : 'N'} ${r.win ? '승' : '패'}`);
      }
    }
    if (c === 'mighty') { mg.n++; if (r.win) mg.win++; }
    if (c === 'low' && lows.length < 25)
      lows.push(`${name(r.card)}(기루다${r.giruda}${r.count}, 마이티보유${r.hasMighty ? 'Y' : 'N'}` +
                ` 조커보유${r.hasJoker ? 'Y' : 'N'} 기루다A보유${r.hasGirudaA ? 'Y' : 'N'}` +
                ` ${r.win ? '승' : '패'})`);
    if (n % 100 === 0) process.stderr.write(`  ${n}/${N}\r`);
  }
  console.log(`\nNN 프렌드 콜 분포 (${MODEL}, 5석 전원 NN, ${n}판)`);
  console.log(`  선언 방식: 카드 ${pct(modeCard, n)}  초구 ${pct(modeFirst, n)}  노프렌드 ${pct(modeNone, n)}`);
  console.log(`  카드콜 중: 주공 자기 손에 있음 ${pct(selfHand, modeCard)}  바닥패에 있음 ${pct(selfFloor, modeCard)}  ` +
              `실제 프렌드 성립 ${pct(real, modeCard)}`);
  console.log(`\n  콜 유형별  (n / 실제프렌드 / 여당승률)`);
  for (const c of ['mighty', 'joker', 'girudaA', 'otherHigh', 'low'])
    console.log(`    ${c.padEnd(10)} ${String(cat[c]).padStart(4)}  ${pct(cat[c], modeCard).padStart(6)}  ` +
      `프렌드성립 ${pct(catReal[c], cat[c]).padStart(6)}  승률 ${pct(catWin[c], cat[c]).padStart(6)}`);
  console.log(`\n  랭크별 빈도`);
  console.log('    ' + Object.entries(byRank).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`).join('  '));
  console.log(`\n  조커 콜 분해 (${jk.held + jk.notHeld}건)`);
  console.log(`    주공이 마이티 보유 → 조커 콜이 정석 : ${jk.held}건  승률 ${pct(jk.heldWin, jk.held)}`);
  console.log(`    주공이 마이티 미보유인데 조커 콜   : ${jk.notHeld}건  승률 ${pct(jk.notHeldWin, jk.notHeld)}`);
  console.log(`    (대조) 마이티 콜                   : ${mg.n}건  승률 ${pct(mg.win, mg.n)}`);
  if (notHeldSamples.length) console.log(`    마이티 미보유 조커콜 사례: ` + notHeldSamples.join(' | '));
  console.log(`\n  주공이 마이티·조커를 모두 쥔 판 ${bothHeld.n}건: ` +
    `낮은카드콜 ${pct(bothHeld.low, bothHeld.n)}  초구 ${pct(bothHeld.first, bothHeld.n)}  기타 ${pct(bothHeld.other, bothHeld.n)}`);
  if (lows.length) console.log(`  낮은카드 콜 사례\n    ` + lows.join('\n    '));
  console.log(`\n  최다 콜 카드 20종`);
  console.log('    ' + Object.entries(byCard).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([k, v]) => `${k}:${v}`).join('  '));
})();
