/**
 * mighty-master.js — 마스터 티어(신경망) 브라우저 통합 모듈
 * mighty_encode.py의 관측(606)/행동(209) 인코딩 JS 포트.
 * 사용 (onnxruntime-web):
 *   const M = require('./mighty-master.js');           // 또는 ESM 번들
 *   const sess = await ort.InferenceSession.create('mighty_master.onnx');
 *   const a = await M.chooseAction(sess, ort, game, seat, pickBuffer);
 *   const act = M.actionToEngine(a, game, pickBuffer); // null이면 (floor 선택 누적 중) 재호출
 *   if (act) game.act(act);
 * Python 대비 파리티: parity_encode.py 로 검증.
 */
(function () {
'use strict';
const E = (typeof require !== 'undefined') ? require('./mighty-engine.js')
                                           : window.MightyEngine;
const { SUITS, JOKER, NUM_PLAYERS, isJoker, cardId, sameCard, dealMissValue } = E;
const isPoint = c => !isJoker(c) && c.rank >= 10;
const GIRUDA5 = SUITS.concat(['N']);
const SUIT_IDX = { S: 0, D: 1, H: 2, C: 3 };

let _ablateFrev = false;
const setAblateFrev = v => { _ablateFrev = !!v; };

const cidx = c => isJoker(c) ? 52 : SUIT_IDX[c.suit] * 13 + (c.rank - 2);
const idxCard = i => i === 52 ? JOKER : { suit: SUITS[Math.floor(i / 13)], rank: i % 13 + 2 };

// ---- 행동 공간 (mighty_encode.py와 동일) ----
const A_PASS = 0, A_BID0 = 1, A_DISC0 = 41, A_FRIEND0 = 94,
      A_FRIEND_FIRST = 147, A_FRIEND_NONE = 148, A_PLAY0 = 149,
      A_PLAY_JOKER_SUIT0 = 201, A_PLAY_JOKER = 205, A_PLAY_JOKERCALL = 206,
      A_DEALMISS = 207, A_PROCEED = 208, ACTION_DIM = 209;

// ---- 관측 레이아웃 ----
const _sec = [['phase5',5],['hand53',53],['giruda6',6],['count8',8],['declarer_rel6',6],
  ['friend_mode4',4],['friend_card53',53],['friend_rev_rel7',7],['friend_know2',2],
  ['bid_ctx13',13],['bid_active5',5],['trick11',11],['led5',5],['jokercall_ctx3',3],
  ['table4x54',216],['played53',53],['suit_counts8',8],['captured10',10],['void4x4',16],
  ['discard54',54],['key_cards4',4],['team_pts3',3],['discard_pick54',54],
  ['dealer_rel5',5],['dm_ctx2',2],
  ['hist_suit16',16],['hist_max16',16],['hist_trump4',4],['hist_lead20',20],
  ['hist_key8',8],['suit_strength16',16],['trump_strength2',2],
  // v5: 룰 파라미터 블록. 관측 끝에 붙였으므로 앞 688만 쓰는 v4 모델은 그대로 동작한다.
  // v5: 키카드 판단 근거 (현재 트릭 상태 · 무늬별 바깥 최고 · 키카드 소재 추론)
  ['trick_ctx20',20],['top_out8',8],['key_cand9',9],
  ['rule_ctx14',14],
  // Phase B: 트릭 토큰 시퀀스(완료10+진행1, 토큰당 81) — v6 어텐션 모델 전용.
  // 앞 739만 읽는 v5 이하 모델은 그대로 동작한다. python encode와 반드시 동일.
  ['trick_tok891',891],
  // v16: 주공 의도 추론 파생량. 원재료(공약·획득점수·탑카드)는 이미 있었으나
  // 뺄셈·집계·소재추정이 없어 신경망이 매번 다시 만들어야 했다. 관측 끝에 붙여
  // 앞 1630만 읽는 v15 이하 모델은 그대로 동작한다. python encode와 반드시 동일.
  ['slack4',4],['table_pts3',3],['suit_top_cand16',16]];
const O = {}; let _d = 0;
for (const [name, n] of _sec) { O[name] = _d; _d += n; }
const OBS_DIM = _d;   // 702 (v4 모델은 앞 688)

/** 가치 헤드 출력 스케일 — value는 좌석 관점 기대상금/2000이다
 *  (training/mighty_encode.py의 PRIZE_SCALE·export_onnx.py 주석과 같은 값).
 *  깊이 제한 롤아웃에서 종료 상금과 가치 헤드를 섞어 평균낼 때 반드시 이걸로 나눈다 —
 *  섞인 스케일은 이득값을 국면 사이에서 비교할 때(--weight-by-gain) 편향이 된다. */
const PRIZE_SCALE = 2000;

/** 룰 설정 → 관측값. training/mighty_encode.py encode_rules와 반드시 같아야 한다. */
function encodeRules(cfg) {
  const sc = (cfg && cfg.scoring) || {};
  const num = (v, d) => (v === undefined || v === null ? d : v);
  const dp = num(cfg && cfg.discardPointsTo, 'declarer');
  const bool = (v, d) => ((v === undefined ? d : v) ? 1 : 0);
  return [
    (num(cfg && cfg.minBid, 14) - 12) / 8,
    num(cfg && cfg.noGirudaBidDiscount, 0) / 2,
    bool(cfg && cfg.dealMissEnabled, true),
    num(cfg && cfg.dealMissThreshold, 0.5),
    bool(cfg && cfg.declarerCanDealMiss, false),
    bool(cfg && cfg.jokerCallEnabled, true),
    bool(cfg && cfg.jokerCallMightyProtect, true),
    bool(cfg && cfg.firstTrickJokerWeak, true),
    bool(cfg && cfg.lastTrickJokerWeak, true),
    dp === 'declarer' ? 1 : 0,
    dp === 'defenders' ? 1 : 0,
    num(sc.perDiff, 200) / (num(sc.perBid, 300) || 300),
    num(sc.noGirudaMult, 2) / 3,
    num(sc.friendShare, 1) / 2,
  ];
}

function encodeObs(game, me, pickBuffer) {
  const o = new Float32Array(OBS_DIM);
  const g = game, ph = g.phase;
  o[O.phase5 + ['bidding','floor','friend','dealMissWindow','play'].indexOf(ph)] = 1;
  const dmv = dealMissValue(g.hands[me]);
  o[O.dm_ctx2 + 0] = Math.max(-1, Math.min(1, dmv / 3));
  o[O.dm_ctx2 + 1] = g.dealMissEligible(me) ? 1 : 0;
  for (const c of g.hands[me]) o[O.hand53 + cidx(c)] = 1;
  const rel = p => ((p - me) % NUM_PLAYERS + NUM_PLAYERS) % NUM_PLAYERS;
  o[O.dealer_rel5 + rel(g.dealer)] = 1;

  const ct = g.contract;
  if (ct) {
    o[O.giruda6 + GIRUDA5.indexOf(ct.giruda)] = 1;
    o[O.count8 + Math.min(7, Math.max(0, ct.count - 13))] = 1;
    o[O.declarer_rel6 + rel(g.declarer)] = 1;
    if (g.hands[me].some(c => sameCard(c, g.mightyCard))) o[O.key_cards4 + 2] = 1;
    if (g.hands[me].some(c => sameCard(c, g.jokerCallCard))) o[O.jokercall_ctx3 + 1] = 1;
  } else {
    o[O.giruda6 + 5] = 1;
    o[O.declarer_rel6 + 5] = 1;
  }
  if (g.hands[me].some(isJoker)) { o[O.key_cards4 + 3] = 1; o[O.jokercall_ctx3 + 2] = 1; }

  const fd = g.friendDecl;
  if (fd == null) o[O.friend_mode4 + 0] = 1;
  else {
    o[O.friend_mode4 + { card: 1, first: 2, none: 3 }[fd.mode]] = 1;
    if (fd.mode === 'card' && fd.card) {
      o[O.friend_card53 + cidx(fd.card)] = 1;
      if (g.hands[me].some(c => sameCard(c, fd.card))) o[O.friend_know2 + 0] = 1;
    }
  }
  if (g.friendRevealed) {
    o[O.friend_rev_rel7 + 0] = 1;
    if (g.friend == null) o[O.friend_rev_rel7 + 6] = 1;
    else o[O.friend_rev_rel7 + 1 + rel(g.friend)] = 1;
  }
  if (me === (g.declarer != null ? g.declarer : -1) || o[O.friend_know2] ||
      (g.friendRevealed && g.friend === me)) o[O.friend_know2 + 1] = 1;

  if (ph === 'bidding') {
    const b = g.bidding;
    if (b.best) {
      o[O.bid_ctx13 + 0] = (b.best.count - 13) / 7;
      o[O.bid_ctx13 + 1 + GIRUDA5.indexOf(b.best.giruda)] = 1;
      o[O.bid_ctx13 + 7 + rel(b.best.player)] = 1;
    } else o[O.bid_ctx13 + 12] = 1;
    for (let p = 0; p < NUM_PLAYERS; p++) if (b.active[p]) o[O.bid_active5 + rel(p)] = 1;
  }

  const played = [];
  const voidM = Array.from({ length: NUM_PLAYERS }, () => [0, 0, 0, 0]);
  if (ph === 'play') {
    const pl = g.play;
    o[O.trick11 + pl.trickNo - 1] = 1;
    o[O.trick11 + 10] = pl.trickNo / 10;
    if (pl.ledSuit) o[O.led5 + SUIT_IDX[pl.ledSuit]] = 1;
    else o[O.led5 + 4] = 1;
    if (pl.jokerCallActive) o[O.jokercall_ctx3 + 0] = 1;
    for (let r = 1; r < NUM_PLAYERS; r++) o[O.table4x54 + (r - 1) * 54 + 53] = 1;
    for (const e of pl.table) {
      const r = rel(e.player);
      if (r !== 0) {
        o[O.table4x54 + (r - 1) * 54 + 53] = 0;
        o[O.table4x54 + (r - 1) * 54 + cidx(e.card)] = 1;
      }
    }
    for (const t of pl.history) {
      const p0 = t.plays[0];
      const led = p0.jokerSuit || (isJoker(p0.card) ? null : p0.card.suit);
      for (const e of t.plays) {
        played.push(e.card);
        const c = e.card;
        if (led && !isJoker(c) && c.suit !== led && !sameCard(c, g.mightyCard))
          voidM[e.player][SUIT_IDX[led]] = 1;
      }
    }
    for (const e of pl.table) played.push(e.card);
    for (const c of played) o[O.played53 + cidx(c)] = 1;
    for (let r = 1; r < NUM_PLAYERS; r++) {
      const p = (me + r) % NUM_PLAYERS;
      for (let s = 0; s < 4; s++) o[O.void4x4 + (r - 1) * 4 + s] = voidM[p][s];
    }
    for (let r = 0; r < NUM_PLAYERS; r++) {
      const p = (me + r) % NUM_PLAYERS;
      o[O.captured10 + r] = pl.capturedPoints[p] / 20;
      o[O.captured10 + 5 + r] = pl.tricksWon[p] / 10;
    }
    const known = [g.declarer];
    let ruling = pl.capturedPoints[g.declarer], fknown = false;
    if (g.friendRevealed) {
      if (g.friend != null) { ruling += pl.capturedPoints[g.friend]; known.push(g.friend); }
      fknown = true;
    } else if (o[O.friend_know2 + 0]) {
      ruling += pl.capturedPoints[me]; known.push(me); fknown = true;
    }
    let opp = 0, unk = 0;
    for (let p = 0; p < NUM_PLAYERS; p++) {
      if (known.includes(p)) continue;
      if (fknown || p === me) opp += pl.capturedPoints[p];
      else unk += pl.capturedPoints[p];
    }
    o[O.team_pts3 + 0] = ruling / 20; o[O.team_pts3 + 1] = opp / 20; o[O.team_pts3 + 2] = unk / 20;
  }

  const seen = new Set(played.map(cardId));
  for (const c of g.hands[me]) seen.add(cardId(c));
  if (g.declarer === me && g.discard) {
    for (const c of g.discard) seen.add(cardId(c));
    for (const c of g.discard) o[O.discard54 + cidx(c)] = 1;
    o[O.discard54 + 53] = g.discard.filter(isPoint).length / 3;
  }
  for (let si = 0; si < 4; si++) {
    const s = SUITS[si];
    let out = 0;
    for (let r = 2; r <= 14; r++) if (!seen.has(s + r)) out++;
    const mine = g.hands[me].filter(c => !isJoker(c) && c.suit === s).length;
    o[O.suit_counts8 + si] = out / 13;
    o[O.suit_counts8 + 4 + si] = mine / 13;
  }
  if (ct) o[O.key_cards4 + 0] = seen.has(cardId(g.mightyCard)) ? 0 : 1;
  o[O.key_cards4 + 1] = seen.has(JOKER) ? 0 : 1;

  // 실험용 특징 차단 (기본 off, 브라우저 동작에는 영향 없음)
  if (_ablateFrev) for (let i = 0; i < 7; i++) o[O.friend_rev_rel7 + i] = 0;

  // ---- v3: 좌석별 이력 요약 ----
  if (ph === 'play') {
    const pl = g.play;
    const gir = ct ? ct.giruda : null;
    const groups = pl.history.map(t => [t.plays, t.plays[0].player]);
    groups.push([pl.table, pl.table.length ? pl.table[0].player : null]);
    for (const [plays, leader] of groups) {
      if (plays.length && leader !== null) {
        const p0 = plays[0];
        const lsuit = p0.jokerSuit || (isJoker(p0.card) ? null : p0.card.suit);
        const rl = rel(leader);
        if (rl !== 0) {
          o[O.hist_lead20 + 16 + (rl - 1)] += 0.1;
          if (lsuit) o[O.hist_lead20 + (rl - 1) * 4 + SUIT_IDX[lsuit]] += 0.2;
        }
      }
      for (const e of plays) {
        const r = rel(e.player);
        if (r === 0) continue;
        const c = e.card;
        if (isJoker(c)) { o[O.hist_key8 + (r - 1) * 2 + 1] = 1; continue; }
        if (ct && sameCard(c, g.mightyCard)) o[O.hist_key8 + (r - 1) * 2] = 1;
        const si = SUIT_IDX[c.suit];
        o[O.hist_suit16 + (r - 1) * 4 + si] += 0.2;
        const mi = O.hist_max16 + (r - 1) * 4 + si;
        o[mi] = Math.max(o[mi], (c.rank - 2) / 12);
        if (gir && gir !== 'N' && c.suit === gir) o[O.hist_trump4 + (r - 1)] += 0.2;
      }
    }
    const clamp = (start, n) => {
      for (let i = start; i < start + n; i++) o[i] = Math.min(1, Math.max(0, o[i]));
    };
    clamp(O.hist_suit16, 16); clamp(O.hist_trump4, 4); clamp(O.hist_lead20, 20);
  }

  // ---- v3: 무늬별 자기 패 상대 강도 ----
  for (let si = 0; si < 4; si++) {
    const s = SUITS[si];
    const mine = g.hands[me].filter(c => !isJoker(c) && c.suit === s)
                            .map(c => c.rank).sort((a, b) => b - a);
    const outr = [];
    for (let r = 2; r <= 14; r++) if (!seen.has(s + r)) outr.push(r);
    const base = O.suit_strength16 + si * 4;
    if (!mine.length) { o[base + 2] = 1; continue; }
    o[base + 0] = (!outr.length || mine[0] > Math.max(...outr)) ? 1 : 0;
    const top3 = outr.concat(mine).sort((a, b) => b - a).slice(0, 3);
    o[base + 1] = top3.filter(r => mine.includes(r)).length / 3;
    o[base + 3] = mine.length / (mine.length + outr.length);
  }
  if (ct && ct.giruda !== 'N') {
    const gg = ct.giruda;
    const mt = g.hands[me].filter(c => !isJoker(c) && c.suit === gg).length;
    let ot = 0;
    for (let r = 2; r <= 14; r++) if (!seen.has(gg + r)) ot++;
    if (mt + ot) o[O.trump_strength2 + 0] = mt / (mt + ot);
    o[O.trump_strength2 + 1] = mt > ot ? 1 : 0;
  }

  if (pickBuffer && pickBuffer.length) {
    o[O.discard_pick54 + 53] = pickBuffer.length / 3;
    for (const c of pickBuffer) o[O.discard_pick54 + cidx(c)] = 1;
  }
  // --- v5 추론 블록 ---
  if (ph === 'play') {
    const pl2 = game.play;
    const acted = new Set(pl2.table.map(e => e.player));
    let rem = 0;
    for (let p = 0; p < 5; p++) if (p !== me && !acted.has(p)) rem++;
    o[O.trick_ctx20 + Math.min(4, rem)] = 1;
    let best = null, bk = [-2, -1];
    for (const e of pl2.table) {
      const k = game._cardStrength(e, pl2);
      if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
    }
    if (!best) o[O.trick_ctx20 + 10] = 1;
    else {
      o[O.trick_ctx20 + 5 + rel(best.player)] = 1;
      const tier = (bk[0] >= 1 && bk[0] <= 4) ? bk[0] : 0;
      o[O.trick_ctx20 + 11 + tier] = 1;
      o[O.trick_ctx20 + 16] = bk[1] / 14;
      const decl = game.declarer;
      const iRuling = (me === decl) || (game.friendRevealed && game.friend === me) ||
        (game.friendDecl && game.friendDecl.mode === 'card' && game.friendDecl.card &&
         game.hands[me].some(x => sameCard(x, game.friendDecl.card)));
      let wo = null;
      if (best.player === decl) wo = !iRuling;
      else if (game.friendRevealed) {
        const w = (game.friend !== null && best.player === game.friend);
        wo = iRuling ? !w : w;
      }
      o[O.trick_ctx20 + 17 + (wo === null ? 2 : (wo ? 1 : 0))] = 1;
    }
    for (let si = 0; si < 4; si++) {
      const su = SUITS[si];
      let topOut = 0;
      for (let r = 14; r >= 2; r--) if (!seen.has(su + r)) { topOut = r; break; }
      o[O.top_out8 + si] = topOut / 14;
      let mineTop = 0;
      for (const c of game.hands[me]) if (!isJoker(c) && c.suit === su && c.rank > mineTop) mineTop = c.rank;
      o[O.top_out8 + 4 + si] = (mineTop && mineTop > topOut) ? 1 : 0;
    }
    const mSeen = seen.has(cardId(game.mightyCard));
    const jSeen = seen.has('JOKER');
    const mSuit = SUIT_IDX[game.mightyCard.suit];
    // 프렌드 선언 함의 — 마이티/조커 프렌드 선언은 주공의 해당 카드 부재를,
    // 공개 후엔 프렌드의 보유를 확정한다 (python encode와 반드시 동일)
    const fd2 = game.friendDecl;
    const fr2 = game.friendRevealed ? game.friend : null;
    const mDeclNo = !!(fd2 && fd2.mode === 'card' && fd2.card && !isJoker(fd2.card)
      && sameCard(fd2.card, game.mightyCard));
    const jDeclNo = !!(fd2 && fd2.mode === 'card' && fd2.card && isJoker(fd2.card));
    for (let r = 1; r < 5; r++) {
      const p = (me + r) % 5;
      let mCan = !(mSeen || voidM[p][mSuit]);
      let jCan = !jSeen;
      if (p === game.declarer) {
        if (mDeclNo) mCan = false;
        if (jDeclNo) jCan = false;
      }
      if (fr2 !== null && !mSeen && mDeclNo) mCan = (p === fr2);
      if (fr2 !== null && !jSeen && jDeclNo) jCan = (p === fr2);
      o[O.key_cand9 + (r - 1)] = mCan ? 1 : 0;
      o[O.key_cand9 + 4 + (r - 1)] = jCan ? 1 : 0;
    }
    o[O.key_cand9 + 8] = game.hands[me].length / 10;
  }

  // ---- v16: 주공 의도 추론 파생량 (python encode와 반드시 동일) ----
  if (ph === 'play' && ct) {
    const pl4 = game.play;
    // (1) 공약 여유 — "공약 − 여당 확보 − 남은 점수". 재료는 count8·team_pts3에
    //     있었지만 뺄셈이 없었다. 0 이하면 남은 점수를 전부 먹어야 한다.
    let playedPts = 0;
    for (const t of pl4.history)
      for (const e of t.plays) if (!isJoker(e.card) && e.card.rank >= 10) playedPts++;
    for (const e of pl4.table) if (!isJoker(e.card) && e.card.rank >= 10) playedPts++;
    const leftPts = 20 - playedPts;
    // 여당 확보 점수 — 내 시점에서 확정된 것만 센다(team_pts3와 같은 규칙)
    const declP = game.declarer;
    let rulingPts = pl4.capturedPoints[declP];
    if (game.friendRevealed && game.friend != null && game.friend !== declP)
      rulingPts += pl4.capturedPoints[game.friend];
    else if (game.friendDecl && game.friendDecl.mode === 'card' && game.friendDecl.card &&
             me !== declP && game.hands[me].some(c => sameCard(c, game.friendDecl.card)))
      rulingPts += pl4.capturedPoints[me];
    const slack = rulingPts + leftPts - ct.count;
    o[O.slack4 + 0] = Math.min(1, Math.max(0, (slack + 10) / 20));   // 부호 있는 여유
    o[O.slack4 + 1] = slack <= 0 ? 1 : 0;                            // 한 장도 못 잃는다
    o[O.slack4 + 2] = leftPts / 20;
    o[O.slack4 + 3] = Math.min(1, Math.max(0, ct.count - rulingPts) / 20); // 더 필요한 점수

    // (2) 이번 트릭에 걸린 점수 — table4x54에 카드로만 있어 매번 세야 했다.
    let tp = 0;
    for (const e of pl4.table) if (!isJoker(e.card) && e.card.rank >= 10) tp++;
    o[O.table_pts3 + 0] = tp / 5;
    if (tp > 0) {
      let best = null, bk = [-2, -1];
      for (const e of pl4.table) {
        const k = game._cardStrength(e, pl4);
        if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
      }
      if (best) {
        const ally = best.player === declP ||
          (game.friendRevealed && game.friend === best.player && best.player !== me);
        o[O.table_pts3 + (ally ? 2 : 1)] = 1;    // 1=뺏기는 중 · 2=아군이 먹는 중
      }
    }

    // (3) 무늬별 탑카드 소재 추정 — top_out8은 "밖에 무엇이 남았나"까지만 말하고
    //     누가 들고 있을 법한지는 없었다. key_cand9의 무늬판이다.
    const seen2 = new Set();
    for (const t of pl4.history) for (const e of t.plays) seen2.add(cardId(e.card));
    for (const e of pl4.table) seen2.add(cardId(e.card));
    for (const c of game.hands[me]) seen2.add(cardId(c));
    if (me === declP && game.discard) for (const c of game.discard) seen2.add(cardId(c));
    for (let si = 0; si < 4; si++) {
      const su = SUITS[si];
      let topOut = 0;
      for (let r = 14; r >= 2; r--) if (!seen2.has(su + r)) { topOut = r; break; }
      for (let r = 1; r < 5; r++) {
        const p = (me + r) % 5;
        o[O.suit_top_cand16 + si * 4 + (r - 1)] = (topOut && !voidM[p][si]) ? 1 : 0;
      }
    }
  }

  // ---- Phase B: 트릭 토큰 (python encode의 트릭 토큰 절과 반드시 동일) ----
  if (ph === 'play') {
    const pl3 = game.play;
    const gir2 = ct ? ct.giruda : null;
    const toks = pl3.history.slice(0, 10).map(t => [t.plays, t.winner]);
    toks.push([pl3.table, null]);
    for (let ti = 0; ti < toks.length; ti++) {
      const base = O.trick_tok891 + ti * 81;
      const plays = toks[ti][0], winner = toks[ti][1];
      for (let j = 0; j < Math.min(5, plays.length); j++) {
        const eb = base + j * 15, e = plays[j], c = e.card;
        o[eb + 0] = 1;
        o[eb + 1 + rel(e.player)] = 1;
        if (!isJoker(c)) {
          o[eb + 6 + SUIT_IDX[c.suit]] = 1;
          o[eb + 10] = c.rank / 14;
        } else o[eb + 11] = 1;
        if (ct && sameCard(c, game.mightyCard)) o[eb + 12] = 1;
        if (isPoint(c)) o[eb + 13] = 1;
        if (gir2 && gir2 !== 'N' && !isJoker(c) && c.suit === gir2) o[eb + 14] = 1;
      }
      if (winner !== null && winner !== undefined) o[base + 75 + rel(winner)] = 1;
      o[base + 80] = (ti + 1) / 10;
    }
  }

  const rv = encodeRules(game.config);
  for (let i = 0; i < rv.length; i++) o[O.rule_ctx14 + i] = rv[i];
  return o;
}

function legalMask(game, pickBuffer) {
  const g = game, m = new Uint8Array(ACTION_DIM);
  const ph = g.phase;
  if (ph === 'bidding') {
    m[A_PASS] = 1;    // 실룰: 패스 항상 허용 (학습용 강제입찰 없음)
    for (const a of g.legalActions()) {
      if (a.type === 'bid' && a.count >= 13 && a.count <= 20)
        m[A_BID0 + GIRUDA5.indexOf(a.giruda) * 8 + (a.count - 13)] = 1;
      else if (a.type === 'dealMiss') m[A_DEALMISS] = 1;
    }
  } else if (ph === 'dealMissWindow') {
    m[A_DEALMISS] = 1; m[A_PROCEED] = 1;
  } else if (ph === 'floor') {
    const picked = (pickBuffer || []).slice();
    for (const c of g.hands[g.declarer]) {
      const i = picked.findIndex(x => sameCard(c, x));
      if (i >= 0) { picked.splice(i, 1); continue; }
      m[A_DISC0 + cidx(c)] = 1;
    }
  } else if (ph === 'friend') {
    for (let i = 0; i < 53; i++) m[A_FRIEND0 + i] = 1;
    m[A_FRIEND_FIRST] = 1; m[A_FRIEND_NONE] = 1;
  } else if (ph === 'play') {
    for (const mv of g.legalActions()) {
      if (isJoker(mv.card)) {
        if (mv.jokerSuit) m[A_PLAY_JOKER_SUIT0 + SUIT_IDX[mv.jokerSuit]] = 1;
        else m[A_PLAY_JOKER] = 1;
      } else if (mv.jokerCall) m[A_PLAY_JOKERCALL] = 1;
      else m[A_PLAY0 + cidx(mv.card)] = 1;
    }
  }
  return m;
}

/**
 * 프렌드 콜 후처리 모드. 학습된 정책은 판당 한 번뿐인 프렌드 선언에 학습 신호가 희박해
 * 주공이 마이티를 못 쥔 상황에서 마이티를 안 부르는 콜을 낸다 — 그러면 마이티가 81% 확률로
 * 야당에 떨어진다. 배포 측 후처리로 이 경우만 마이티 콜로 되돌린다.
 *   'off'   후처리 없음 (학습 정책 그대로)
 *   'joker' 조커 콜일 때만 교정
 *   'all'   마이티 아닌 카드 콜 전부 교정 (기본)
 */
let _friendCallFix = (typeof process !== 'undefined' && process.env && process.env.FRIEND_FIX) || 'all';
function setFriendCallFix(mode) { _friendCallFix = mode; }

/** 프렌드 카드 콜 교정. 주공이 마이티 보유 시엔 손대지 않는다(마이티 콜=셀프라 불가). */
function fixFriendCall(card, game) {
  if (_friendCallFix === 'off') return card;
  const mc = game.mightyCard;
  if (sameCard(card, mc)) return card;
  if (_friendCallFix === 'joker' && !isJoker(card)) return card;
  const decl = game.declarer;
  if (decl == null || game.hands[decl].some(c => sameCard(c, mc))) return card;
  return mc;
}

/** 행동 int → 엔진 act 객체. floor에선 3장 모일 때까지 null 반환(pickBuffer 누적). */
function actionToEngine(a, game, pickBuffer) {
  if (a === A_PASS) return { type: 'pass' };
  if (a === A_DEALMISS) return { type: 'dealMiss' };
  if (a === A_PROCEED) return { type: 'proceed' };
  if (a >= A_BID0 && a < A_DISC0) {
    const x = a - A_BID0;
    return { type: 'bid', count: x % 8 + 13, giruda: GIRUDA5[Math.floor(x / 8)] };
  }
  if (a >= A_DISC0 && a < A_FRIEND0) {
    pickBuffer.push(idxCard(a - A_DISC0));
    if (pickBuffer.length < 3) return null;
    const discard = pickBuffer.slice(); pickBuffer.length = 0;
    return { type: 'exchange', discard };
  }
  if (a === A_FRIEND_FIRST) return { type: 'friend', mode: 'first' };
  if (a === A_FRIEND_NONE) return { type: 'friend', mode: 'none' };
  if (a >= A_FRIEND0 && a < A_FRIEND_FIRST)
    return { type: 'friend', mode: 'card', card: fixFriendCall(idxCard(a - A_FRIEND0), game) };
  if (a === A_PLAY_JOKER) return { type: 'play', card: JOKER };
  if (a >= A_PLAY_JOKER_SUIT0 && a < A_PLAY_JOKER_SUIT0 + 4)
    return { type: 'play', card: JOKER, jokerSuit: SUITS[a - A_PLAY_JOKER_SUIT0] };
  if (a === A_PLAY_JOKERCALL)
    return { type: 'play', card: game.jokerCallCard, jokerCall: true };
  if (a >= A_PLAY0 && a < A_PLAY_JOKER_SUIT0)
    return { type: 'play', card: idxCard(a - A_PLAY0) };
  throw new Error('bad action ' + a);
}

/** onnxruntime-web 세션으로 greedy 행동 선택 */
/** 모델이 기대하는 관측 길이 (구버전 606 모델 호환 — v3 특징은 뒤에 붙였다) */
function modelObsDim(sess) {
  const meta = sess.inputMetadata;
  if (Array.isArray(meta)) {
    const m = meta.find(x => x.name === 'obs');
    const d = m && m.shape && m.shape[1];
    if (typeof d === 'number') return d;
  }
  return OBS_DIM;
}

async function chooseAction(sess, ort, game, seat, pickBuffer) {
  let obs = encodeObs(game, seat, pickBuffer);
  const mask = legalMask(game, pickBuffer);
  const want = modelObsDim(sess);
  if (want !== OBS_DIM) obs = obs.subarray(0, want);   // 구버전 모델은 앞부분만 사용
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, ACTION_DIM]),
  });
  const logits = out.logits.data;
  let best = -1, bv = -Infinity;
  for (let i = 0; i < ACTION_DIM; i++)
    if (mask[i] && logits[i] > bv) { bv = logits[i]; best = i; }
  return best;
}

const api = { OBS_DIM, ACTION_DIM, PRIZE_SCALE, encodeObs, legalMask, actionToEngine, chooseAction, modelObsDim,
              cidx, idxCard, setAblateFrev, setFriendCallFix };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else window.MightyMaster = api;

})();
