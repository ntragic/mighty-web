// mighty-master.js 인코더 파리티용 브리지
'use strict';
const E = require('../src/mighty-engine.js');
const M = require('../src/mighty-master.js');
const rl = require('readline').createInterface({ input: process.stdin });
let g = null, agent = null, pending = null;
const ser = c => E.isJoker(c) ? 'JOKER' : c.suit + c.rank;
const parseCard = s => s === 'JOKER' ? E.JOKER : { suit: s[0], rank: +s.slice(1) };
const serAct = a => {
  const r = { type: a.type };
  if (a.type === 'bid') { r.count = a.count; r.giruda = a.giruda; }
  if (a.type === 'exchange') { r.discard = a.discard.map(ser); if (a.revise) r.revise = a.revise; }
  if (a.type === 'friend') { r.mode = a.mode; if (a.card) r.card = ser(a.card); }
  if (a.type === 'play') { r.card = ser(a.card); if (a.jokerSuit) r.jokerSuit = a.jokerSuit; if (a.jokerCall) r.jokerCall = true; }
  return r;
};
const state = () => ({ phase: g.phase, current: (g.phase !== 'done' && g.phase !== 'redeal') ? g.currentPlayer : null });
rl.on('line', line => {
  const m = JSON.parse(line);
  let resp;
  try {
    if (m.op === 'new') {
      g = new E.MightyGame({ seed: m.seed });
      agent = new E.HeuristicAgent(E.PERSONAS.balanced, g.rng);
      const dealer = Math.floor(g.rng() * E.NUM_PLAYERS);
      g.start(dealer);
      resp = { dealer, ...state() };
    } else if (m.op === 'decide') {        // 행동 계산만 (적용 보류)
      pending = agent.act(g);
      resp = { action: serAct(pending) };
    } else if (m.op === 'commit') {        // 보류 행동 적용
      g.act(pending); pending = null;
      resp = state();
    } else if (m.op === 'obs') {
      const pick = (m.pick || []).map(parseCard);
      resp = { obs: Array.from(M.encodeObs(g, m.seat, pick)),
               mask: Array.from(M.legalMask(g, pick)) };
    } else resp = { error: 'bad op' };
  } catch (e) { resp = { error: String(e), stack: e.stack }; }
  process.stdout.write(JSON.stringify(resp) + '\n');
});
