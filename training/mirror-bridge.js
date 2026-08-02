/**
 * Phase 2 학습용 미러 브리지.
 * Python 엔진이 권위(authoritative)이고, 이 프로세스는 같은 시드로 게임을 미러링하며
 * 휴리스틱 좌석의 행동만 계산해 돌려준다. 엔진 파리티가 검증돼 있으므로 두 엔진은
 * 같은 행동열에서 같은 상태를 유지한다(매 라운드 phase/turn 동기 검증).
 *
 * 프로토콜 (stdin/stdout, 줄단위 JSON) — 라운드당 1회 왕복:
 *   IN  {new:[{env,seed,hseats:{seat:{persona,tier}}}], apply:[{env,a}], ask:[env,...]}
 *   OUT {acts:[{env,action}], sync:[{env,phase,cur}]}
 */
'use strict';
const E = require('../src/mighty-engine.js');
const M = require('../src/mighty-master.js');
const rl = require('readline').createInterface({ input: process.stdin });

const envs = new Map();   // env → {g, agents:{seat:agent}, pick:[]}
const ser = c => E.isJoker(c) ? 'JOKER' : c.suit + c.rank;
const serAct = a => {
  const r = { type: a.type };
  if (a.type === 'bid') { r.count = a.count; r.giruda = a.giruda; }
  if (a.type === 'exchange') { r.discard = a.discard.map(ser); if (a.revise) r.revise = a.revise; }
  if (a.type === 'friend') { r.mode = a.mode; if (a.card) r.card = ser(a.card); }
  if (a.type === 'play') {
    r.card = ser(a.card);
    if (a.jokerSuit) r.jokerSuit = a.jokerSuit;
    if (a.jokerCall) r.jokerCall = true;
  }
  return r;
};

function makeEnv(spec) {
  const g = new E.MightyGame({ seed: spec.seed });
  const agents = {};
  for (const [seat, cfg] of Object.entries(spec.hseats)) {
    agents[+seat] = new E.HeuristicAgent(E.PERSONAS[cfg.persona], g.rng,
                                        { tier: cfg.tier });
  }
  const dealer = Math.floor(g.rng() * E.NUM_PLAYERS);
  g.start(dealer);
  envs.set(spec.env, { g, agents, pick: [] });
}

rl.on('line', line => {
  let out;
  try {
    const m = JSON.parse(line);
    for (const spec of m.new || []) makeEnv(spec);
    // 역할 확정 후 좌석 재배정 (휴리스틱은 상태를 안 들고 있어 도중 교체가 안전하다)
    for (const spec of m.assign || []) {
      const st = envs.get(spec.env);
      st.agents = {};
      for (const [seat, cfg] of Object.entries(spec.hseats))
        st.agents[+seat] = new E.HeuristicAgent(E.PERSONAS[cfg.persona], st.g.rng,
                                                { tier: cfg.tier });
    }
    for (const { env, a } of m.apply || []) {
      const st = envs.get(env);
      const act = M.actionToEngine(a, st.g, st.pick);   // floor는 3장 모일 때까지 null
      if (act) st.g.act(act);
    }
    const acts = [];
    for (const env of m.ask || []) {
      const st = envs.get(env);
      const seat = st.g.currentPlayer;
      const agent = st.agents[seat];
      if (!agent) throw new Error(`env ${env}: seat ${seat} has no heuristic agent`);
      const a = agent.act(st.g);
      st.g.act(a);
      acts.push({ env, action: serAct(a) });
    }
    const sync = [];
    for (const env of m.sync || []) {
      const st = envs.get(env);
      const ph = st.g.phase;
      sync.push({ env, phase: ph,
                  cur: (ph === 'done' || ph === 'redeal') ? null : st.g.currentPlayer });
    }
    for (const env of m.drop || []) envs.delete(env);
    out = { acts, sync };
  } catch (e) {
    out = { error: String(e), stack: (e.stack || '').split('\n').slice(0, 3).join(' | ') };
  }
  process.stdout.write(JSON.stringify(out) + '\n');
});
