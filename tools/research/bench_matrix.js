/**
 * NN 버전 대결 매트릭스 — 순서쌍 (A,B): A 1좌석(시드별 회전) vs B 4좌석,
 * 같은 시드의 전좌석 B 기준선과 좌석 페어드. 롤별(주공/프렌드/야당) 분해 포함.
 * 전 좌석 배포 가드 체인 ON (배포 동등 조건).
 *
 * 사용: node tools/research/bench_matrix.js [시드수] [모델스펙...]
 *   모델스펙: 이름=경로 (기본: v4,v5,v6b,b4a)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const SEED0 = parseInt(process.env.SEED_BASE || '1700000', 10);
const PER = ['gambler', 'balanced', 'careful'];

const DEFAULT = [
  ['v4', P('../../web/model/mighty_master_v4.onnx')],
  ['v5', P('../../web/model/mighty_master_v5.onnx')],
  ['v6b', P('../../web/model/mighty_master_v6b.onnx')],
  ['b4a', P('../../training/b4a_single.onnx')],
];

async function playRound(seed, sessions) {
  const rng = E.makeRng(seed);
  const g = new E.MightyGame({ seed });
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sessions[s], ort, keyGuard: true }));
  g.start(Math.floor(rng() * E.NUM_PLAYERS));
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    g.act(await ag[p].act(g, p));
  }
  return g.phase === 'done' ? g : null;
}
const roleOf = (g, k) => k === g.result.declarer ? '주공'
  : (g.result.friend !== null && k === g.result.friend) ? '프렌드' : '야당';

(async () => {
  const N = parseInt(process.argv[2] || '250', 10);
  const specs = process.argv.length > 3
    ? process.argv.slice(3).map(x => x.split('=')) : DEFAULT;
  const S = {};
  for (const [nm, pth] of specs) S[nm] = await ort.InferenceSession.create(pth);
  const names = specs.map(x => x[0]);

  // 기준선: 전좌석 B — 시드별 k=i%5 좌석의 상금·역할 기록
  const base = {};
  for (const b of names) {
    base[b] = new Map();
    for (let i = 0; i < N; i++) {
      const seed = SEED0 + i, k = i % 5;
      const g = await playRound(seed, Array(5).fill(S[b]));
      if (g) base[b].set(seed, { prize: g.result.prizes[k], role: roleOf(g, k) });
    }
    process.stderr.write(`baseline ${b} done\n`);
  }

  const st = a => { const n = a.length; if (!n) return { n: 0, m: 0, ci: 0 };
    const m = a.reduce((x, y) => x + y, 0) / n;
    const sd = n > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1)) : 0;
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };

  const results = [];
  for (const a of names) for (const b of names) {
    if (a === b) continue;
    const diffs = [], byRole = { '주공': [], '프렌드': [], '야당': [] };
    for (let i = 0; i < N; i++) {
      const seed = SEED0 + i, k = i % 5;
      const bl = base[b].get(seed);
      if (!bl) continue;
      const seats = Array(5).fill(S[b]); seats[k] = S[a];
      const g = await playRound(seed, seats);
      if (!g) continue;
      const d = g.result.prizes[k] - bl.prize;
      diffs.push(d);
      byRole[roleOf(g, k)].push(d);
    }
    const o = st(diffs);
    results.push({ a, b, o, roles: Object.fromEntries(Object.entries(byRole).map(([r, v]) => [r, st(v)])) });
    process.stderr.write(`${a} vs ${b} done\n`);
  }

  console.log(`\nNN 버전 대결 매트릭스 — A 1좌석 vs B 4좌석 · ${N}시드 좌석 페어드 · 가드 전체 ON`);
  console.log('\n[전체] A좌석 상금 우위 (행=A, 열=B)');
  const cell = (a, b) => { const r = results.find(x => x.a === a && x.b === b);
    return r ? `${r.o.m >= 0 ? '+' : ''}${r.o.m.toFixed(0)}±${r.o.ci.toFixed(0)}` : '—'; };
  console.log('        ' + names.map(x => x.padStart(12)).join(''));
  for (const a of names) console.log(a.padEnd(8) + names.map(b => (a === b ? '·' : cell(a, b)).padStart(12)).join(''));
  console.log('\n[롤별] (n · 우위)');
  for (const r of results) {
    const rr = ['주공', '프렌드', '야당'].map(role => {
      const s = r.roles[role];
      return `${role} ${s.n}판 ${s.m >= 0 ? '+' : ''}${s.m.toFixed(0)}±${s.ci.toFixed(0)}`;
    }).join(' · ');
    console.log(`${r.a} vs ${r.b}: ${rr}`);
  }
})();
