/**
 * 은닉도 데이터 덤프 — 공개 정보만으로 프렌드 좌석을 맞히는 관전자용.
 *
 * 측정 좌석이 프렌드(카드 프렌드, 주공 아님)가 된 판에서, 프렌드가 아직 공개되지
 * 않은 각 트릭 종료 시점마다 후보 4좌석(주공 제외)의 공개 특징 벡터와 정답을 남긴다.
 * 특징은 전부 공개 로그에서 계산한다 — 손패·바닥패 미사용.
 *
 * 사용: node tools/research/observer_dump.js [판수] > out.jsonl
 *   env MODEL=경로 · TIER=master|advanced · SRC=라벨
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v4.onnx');
const TIER = process.env.TIER || 'master';
const SRC = process.env.SRC || TIER;
const PER = ['gambler', 'balanced', 'careful'];

/** 완료 트릭 이력에서 후보 좌석의 공개 특징 8종 */
function feats(g, cand) {
  const pl = g.play, gi = g.contract.giruda, decl = g.declarer;
  const f = { nGi: 0, ptToDecl: 0, won: 0, led: 0, ptAny: 0, offPt: 0, trumpOver: 0, follow: 0 };
  for (const t of pl.history) {
    const declWon = t.winner === decl;
    for (let j = 0; j < t.plays.length; j++) {
      const e = t.plays[j];
      if (e.player !== cand) continue;
      const c = e.card;
      f.follow++;
      if (j === 0) f.led++;
      if (!E.isJoker(c) && gi !== 'N' && c.suit === gi) {
        f.nGi++;
        // 주공이 이미 이기고 있는데 그 위에 기루다를 얹었나 (야당스러운 행동)
        if (j > 0 && t.winner === cand && t.plays.slice(0, j).some(x => x.player === decl)) f.trumpOver++;
      }
      if (E.isPointCard(c)) {
        f.ptAny++;
        if (declWon && cand !== t.winner) f.ptToDecl++;
        if (!declWon && cand !== t.winner) f.offPt++;
      }
    }
    if (t.winner === cand) f.won++;
  }
  return [f.nGi, f.ptToDecl, f.won, f.led, f.ptAny, f.offPt, f.trumpOver, pl.history.length];
}

(async () => {
  const N = parseInt(process.argv[2] || '2000', 10);
  const sess = TIER === 'master' ? await ort.InferenceSession.create(MODEL) : null;
  let seat = 0, out = 0;

  for (let i = 0; i < N; i++) {
    const rng = E.makeRng(900000 + i);
    const g = new E.MightyGame({ seed: 900000 + i });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++) ag.push(s === seat
      ? (TIER === 'master'
          ? await AI.createAgent({ tier: 'master', session: sess, ort, keyGuard: true })
          : await AI.createAgent({ tier: TIER, persona: 'balanced', rng }))
      : await AI.createAgent({ tier: TIER === 'master' ? 'advanced' : TIER, persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));

    let guard = 0;
    const rows = [];
    while (g.phase !== 'done' && g.phase !== 'redeal') {
      const before = g.play ? g.play.history.length : 0;
      const revBefore = g.friendRevealed;
      g.act(await ag[g.currentPlayer].act(g, g.currentPlayer));
      // 트릭이 막 완료됐고 그 시점까지 미공개면 스냅샷
      if (g.play && g.play.history.length > before && !revBefore && !g.friendRevealed
          && g.declarer !== null) {
        const cands = [];
        for (let p = 0; p < E.NUM_PLAYERS; p++) if (p !== g.declarer) cands.push(p);
        rows.push({ t: g.play.history.length, cands: cands.map(p => feats(g, p)), seats: cands });
      }
      if (++guard > 900) break;
    }
    if (g.phase === 'done' && g.friend === seat && g.friend !== g.declarer
        && g.friendDecl && g.friendDecl.mode === 'card') {
      for (const r of rows) {
        const label = r.seats.indexOf(g.friend);
        if (label < 0) continue;
        console.log(JSON.stringify({ src: SRC, seed: 900000 + i, t: r.t, x: r.cands, y: label }));
        out++;
      }
    }
    if (g.phase === 'done') seat = (seat + 1) % E.NUM_PLAYERS;
  }
  console.error(`rows=${out}`);
})();
