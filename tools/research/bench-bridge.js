// 락스텝 벤치 브리지: stdin JSON 명령 → JS 엔진 실행/휴리스틱 행동 반환
'use strict';
const E = require('../../src/mighty-engine.js');
const rl = require('readline').createInterface({ input: process.stdin });
let g = null, agent = null;
const ser = c => E.isJoker(c) ? 'JOKER' : c.suit + c.rank;
const parseCard = s => s === 'JOKER' ? E.JOKER : { suit: s[0], rank: +s.slice(1) };
const de = a => {
  const o = { type: a.type };
  if (a.type === 'bid') { o.count = a.count; o.giruda = a.giruda; }
  if (a.type === 'exchange') { o.discard = a.discard.map(parseCard); if (a.revise) o.revise = a.revise; }
  if (a.type === 'friend') { o.mode = a.mode; if (a.card) o.card = parseCard(a.card); }
  if (a.type === 'play') { o.card = parseCard(a.card); if (a.jokerSuit) o.jokerSuit = a.jokerSuit; if (a.jokerCall) o.jokerCall = true; }
  return o;
};
const serAct = a => {
  const r = { type: a.type };
  if (a.type === 'bid') { r.count = a.count; r.giruda = a.giruda; }
  if (a.type === 'exchange') { r.discard = a.discard.map(ser); if (a.revise) r.revise = a.revise; }
  if (a.type === 'friend') { r.mode = a.mode; if (a.card) r.card = ser(a.card); }
  if (a.type === 'play') { r.card = ser(a.card); if (a.jokerSuit) r.jokerSuit = a.jokerSuit; if (a.jokerCall) r.jokerCall = true; }
  return r;
};
const state = () => ({
  phase: g.phase,
  current: (g.phase !== 'done' && g.phase !== 'redeal') ? g.currentPlayer : null,
  prizes: g.phase === 'done' ? g.result.prizes : null,
  win: g.phase === 'done' ? g.result.win : null,
  declarer: g.phase === 'done' ? g.result.declarer : null,
});
rl.on('line', line => {
  const m = JSON.parse(line);
  let resp;
  try {
    if (m.op === 'new') {
      g = new E.MightyGame({ seed: m.seed });
      agent = new E.HeuristicAgent(E.PERSONAS[m.persona || 'balanced'], g.rng);
      const dealer = Math.floor(g.rng() * E.NUM_PLAYERS);
      g.start(dealer);
      resp = { dealer, ...state() };
    } else if (m.op === 'heur') {
      const a = agent.act(g);
      g.act(a);
      resp = { action: serAct(a), ...state() };
    } else if (m.op === 'apply') {
      g.act(de(m.action));
      resp = state();
    } else resp = { error: 'bad op' };
  } catch (e) { resp = { error: String(e) }; }
  process.stdout.write(JSON.stringify(resp) + '\n');
});
