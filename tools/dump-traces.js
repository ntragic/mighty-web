// JS 엔진에서 완주 게임 트레이스 덤프 (Python 파리티 검증용)
const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
const fs = require('fs');
const E = require(__P('../src/mighty-engine.js'));
const N = parseInt(process.argv[2] || '300', 10);
const out = [];
let seed = 42000;
while (out.length < N) {
  const s = seed++;
  const g = new E.MightyGame({ seed: s });
  const rng = g.rng;
  const agent = new E.HeuristicAgent(E.PERSONAS.balanced, rng);
  const dealer = Math.floor(rng() * 5);
  g.start(dealer);
  if (g.phase === 'redeal') continue;
  const actions = [];
  const ser = c => E.isJoker(c) ? 'JOKER' : c.suit + c.rank;
  let guard = 0, failed = false;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal') { failed = true; break; }
    const a = agent.act(g);
    const rec = { type: a.type };
    if (a.type === 'bid') { rec.count = a.count; rec.giruda = a.giruda; }
    if (a.type === 'exchange') {
      rec.discard = a.discard.map(ser);
      if (a.revise) rec.revise = a.revise;
    }
    if (a.type === 'friend') { rec.mode = a.mode; if (a.card) rec.card = ser(a.card); }
    if (a.type === 'play') {
      rec.card = ser(a.card);
      if (a.jokerSuit) rec.jokerSuit = a.jokerSuit;
      if (a.jokerCall) rec.jokerCall = true;
    }
    actions.push(rec);
    g.act(a);
    if (++guard > 500) { failed = true; break; }
  }
  if (failed) continue;
  const r = g.result;
  out.push({ seed: s, dealer, actions,
    result: { declarer: r.declarer, friend: r.friend, contract: r.contract,
      yeodangPoints: r.yeodangPoints, win: r.win, score: r.score, prize: r.prize,
      prizes: r.prizes, tricksWon: r.tricksWon, capturedPoints: r.capturedPoints } });
}
fs.writeFileSync(__P('../training/traces.jsonl'), out.map(o => JSON.stringify(o)).join('\n'));
console.log('dumped', out.length, 'traces');
