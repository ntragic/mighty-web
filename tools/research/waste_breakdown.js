/**
 * 가드 ON 상태에서 남는 키카드 낭비를 "무엇을 몰라서 틀렸나" 축으로 분해한다.
 *
 * 판정(기회·낭비)은 keywaste_true.js와 완전히 동일한 전지적 정의를 쓴다.
 * 전지적 판정은 채점용일 뿐이고, 분해 축은 "그 좌석이 볼 수 있었던 정보"다.
 * 목적은 가드에 규칙을 더 붙이는 게 아니라, 정책이 어떤 추론을 못 해서
 * 낭비했는지 — 즉 관측에 무엇이 빠졌는지 — 를 특정하는 것이다.
 *
 * 사용: node tools/research/waste_breakdown.js [판수] [상대티어]
 *   env MODEL=경로  로 모델 지정
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v4.onnx');
const PER = ['gambler', 'balanced', 'careful'];

const strength = (g, e, pl) => g._cardStrength(e, pl);
const stronger = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

/** keywaste_true.js와 동일 — 전지적으로 이 트릭이 이미 결판났는가 */
function lockedTrick(g, seat) {
  const pl = g.play;
  if (!pl || pl.table.length === 0) return null;
  const decl = g.declarer, fr = g.friend;
  if (decl == null) return null;
  const team = p => (p === decl || (fr !== null && p === fr)) ? 'R' : 'O';
  let best = null, bk = [-2, -1];
  for (const e of pl.table) { const k = strength(g, e, pl); if (stronger(k, bk)) { bk = k; best = e; } }
  if (!best || best.player === seat) return null;
  const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
  for (let p = 0; p < E.NUM_PLAYERS; p++) {
    if (acted.has(p)) continue;
    for (const m of g._legalPlays(p)) {
      const k = strength(g, { player: p, card: m.card, jokerSuit: m.jokerSuit, jokerCall: m.jokerCall }, pl);
      if (stronger(k, bk)) return null;
    }
  }
  return { allyWins: team(best.player) === team(seat), bestPlayer: best.player };
}

const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '—';
function table(title, counts, total) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log('\n' + title);
  for (const [k, v] of rows) {
    const bar = '█'.repeat(Math.round(28 * v / (rows[0][1] || 1)));
    console.log(`  ${k.padEnd(22)} ${String(v).padStart(4)}  ${pct(v, total).padStart(6)}  ${bar}`);
  }
}

(async () => {
  const N = parseInt(process.argv[2] || '600', 10);
  const oppTier = process.argv[3] || 'advanced';
  const sess = await ort.InferenceSession.create(MODEL);

  let opps = 0, wastes = 0, rounds = 0, seat = 0;
  const byWhy = {}, byKind = {}, byLockView = {}, byTeamKnow = {}, byPos = {}, byTrick = {}, byOwner = {};
  const byVerdict = {}, byPts = {};
  let gen = 0;
  const genKind = {}, genLockView = {}, genTeam = {}, genPos = {};
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const samples = [];

  for (let i = 0; i < N; i++) {
    const rng = E.makeRng(900000 + i);
    const g = new E.MightyGame({ seed: 900000 + i });
    const trace = {};
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++) ag.push(s === seat
      ? await AI.createAgent({ tier: 'master', session: sess, ort, keyGuard: true, guardTrace: trace })
      : await AI.createAgent({ tier: oppTier, persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));

    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal') {
      const p = g.currentPlayer;
      const gi0 = g.contract ? g.contract.giruda : 'N';
      const isKey = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
      let lock = null, wf = null, chance = false, snap = null;
      if (g.phase === 'play' && p === seat) lock = lockedTrick(g, p);
      if (lock) {
        const legal = g._legalPlays(p);
        // keywaste_true의 '넓은 정의'와 동일
        wf = c => isKey(c) || (gi0 !== 'N' && !E.isJoker(c) && c.suit === gi0)
                  || (!lock.allyWins && E.isPointCard(c));
        if (legal.some(m => wf(m.card)) && legal.some(m => !wf(m.card))) {
          chance = true; opps++;
          // 현재 최강 및 '더 싼 카드로도 이길 수 있었나' 판정
          let bk = [-2, -1];
          for (const e of g.play.table) { const k = strength(g, e, g.play); if (stronger(k, bk)) bk = k; }
          const beatsIt = m => stronger(
            strength(g, { player: p, card: m.card, jokerSuit: m.jokerSuit, jokerCall: m.jokerCall }, g.play), bk);
          snap = { pos: g.play.table.length + 1, trick: g.play.trickNo,
                   revealed: !!g.friendRevealed, seed: 900000 + i,
                   // 낭비 카드가 아니면서 이 트릭을 이기는 대안이 있었는가
                   cheapWin: legal.some(m => !wf(m.card) && beatsIt(m)),
                   tablePts: g.play.table.filter(e => E.isPointCard(e.card)).length };
        }
      }
      for (const k of Object.keys(trace)) delete trace[k];
      const act = await ag[p].act(g, p);

      if (chance && act.type === 'play' && wf(act.card)) {
        wastes++;
        const c = act.card;
        const kind = isKey(c) ? (E.isJoker(c) ? '조커' : '마이티')
          : (gi0 !== 'N' && c.suit === gi0) ? '기루다' : '점수카드';
        bump(byWhy, trace.why || '(추적없음)');
        bump(byKind, kind);
        bump(byOwner, lock.allyWins ? '아군이 잠금' : '야당이 잠금');
        // 좌석이 볼 수 있는 정보로도 '결판났다'고 알 수 있었나
        bump(byLockView, trace.lockedForOthers === true ? '알 수 있었다'
          : trace.lockedForOthers === false ? '위협이 남아 보였다' : '(미평가)');
        bump(byTeamKnow, trace.winnerIsOpp === null ? '팀 모름'
          : trace.winnerIsOpp === true ? '야당임을 앎' : '아군임을 앎');
        bump(byPos, `${snap.pos}번째로 냄`);
        bump(byTrick, `트릭 ${String(snap.trick).padStart(2)}`);
        // 진짜 낭비인가 — 트릭을 이겼다면, 더 싼 카드로도 이길 수 있었을 때만 낭비다
        const justified = trace.iWin === true && !snap.cheapWin;
        bump(byVerdict, trace.iWin === true
          ? (snap.cheapWin ? '이겼다 · 싼 카드로도 이길 수 있었다(낭비)'
                           : '이겼다 · 이 카드라야 이겼다(정당)')
          : '못 이긴 트릭에 태움(낭비)');
        if (!justified) {
          gen++;
          bump(genKind, kind);
          bump(genLockView, trace.lockedForOthers === true ? '알 수 있었다(학습가능)'
            : trace.lockedForOthers === false ? '위협이 남아 보였다(추론부족)' : '(미평가)');
          bump(genTeam, trace.winnerIsOpp === null ? '팀 모름'
            : trace.winnerIsOpp === true ? '야당임을 앎' : '아군임을 앎');
          bump(genPos, `${snap.pos}번째로 냄`);
        }
        bump(byPts, `테이블 점수카드 ${snap.tablePts}장`);
        if (samples.length < 25) samples.push({ ...snap, kind, why: trace.why,
          lockedView: trace.lockedForOthers, team: trace.winnerIsOpp,
          protective: trace.protective, iWin: trace.iWin,
          threats: (trace.threatKinds || []).length, ally: lock.allyWins });
      }
      g.act(act);
      if (++guard > 900) break;
    }
    if (g.phase !== 'done') continue;
    rounds++;
    seat = (seat + 1) % E.NUM_PLAYERS;
  }

  console.log(`\n모델 ${path.basename(MODEL)} · ${rounds}판 · 상대 ${oppTier} · 가드 ON`);
  console.log(`기회 ${opps} · 낭비 ${wastes} (${pct(wastes, opps)})`);
  table('★ 실제로 낭비였나 (싼 대안으로도 이겼는지 기준)', byVerdict, wastes);
  console.log(`\n=== 진짜 낭비 ${gen}건 (기회 대비 ${pct(gen, opps)}, 판당 ${(gen/rounds).toFixed(3)}회) ===`);
  table('  낭비된 카드', genKind, gen);
  table('  좌석 정보로 결판을 알 수 있었나', genLockView, gen);
  table('  팀 인지 상태', genTeam, gen);
  table('  트릭 내 순번', genPos, gen);
  table('가드가 통과시킨 이유', byWhy, wastes);
  table('결정 시점 테이블 위 점수카드', byPts, wastes);
  table('낭비된 카드', byKind, wastes);
  table('트릭을 잠근 쪽', byOwner, wastes);
  table('좌석 정보로 결판을 알 수 있었나', byLockView, wastes);
  table('팀 인지 상태', byTeamKnow, wastes);
  table('트릭 내 순번', byPos, wastes);
  table('트릭 번호', byTrick, wastes);
  console.log('\n표본 (앞 25건)');
  for (const s of samples) console.log('  ' + JSON.stringify(s));
})();
