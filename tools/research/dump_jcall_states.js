/**
 * 조커콜 국면 덤프 — 자가대전을 돌며 "여당 좌석이 조커콜을 낼 수 있는" 순간마다
 * 그 시점 액션 열과 JS 가드 판정을 jsonl로 남긴다. 파이썬 증류 교사와의 판정
 * 일치 검사(training/parity_jcall.py)에 쓴다.
 *
 * 사용: node tools/research/dump_jcall_states.js [판수] > training/jcall_states.jsonl
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v9.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '8300000', 10);

(async () => {
  const N = parseInt(process.argv[2] || '1500', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  let dumped = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', rng, session: sess, ort }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    const actions = [];
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const act = await ag[p].act(g, p);
      if (g.phase === 'play') {
        const call = g._legalPlays(p).find(m => m.jokerCall);
        if (call) {
          // 조커콜 액션을 가정하고 가드에 물어본다 (교사도 같은 가정으로 판정)
          const probe = { type: 'play', card: call.card, jokerCall: true };
          const res = AI.jokerCallGuard(g, p, probe);
          const fires = res !== probe;
          process.stdout.write(JSON.stringify({
            seed, upto: actions.length, seat: p,
            cfg: g.config, dealer: g.dealer,
            actions: actions.map(a => JSON.parse(JSON.stringify(a))),
            jsFires: fires,
            jsCard: fires ? [res.card.suit, res.card.rank] : null,
          }) + '\n');
          dumped++;
        }
      }
      actions.push(JSON.parse(JSON.stringify(act)));
      g.act(act);
    }
  }
  process.stderr.write(`덤프 ${dumped}건 / ${N}판\n`);
})();
