/**
 * mighty-ai.js — 3티어 AI 통합 진입점
 *
 *   중급(intermediate) 규칙 기반 휴리스틱. 팀이 확정된 뒤에만 협력한다.
 *   고급(advanced)     + 프렌드 미공개 구간의 확률적 아군 추론, 정체 추론 카운터,
 *                        마이티·조커 가드, 낮은 탐색 잡음.
 *   마스터(master)     신경망(mighty_master_v4.onnx). 자가대전 + 휴리스틱 파트너
 *                        혼합 학습. 관측 688차원.
 *
 * 사용:
 *   const AI = require('./mighty-ai.js');
 *   const session = await AI.loadMaster(ort, 'mighty_master_v4.onnx');   // 마스터만 필요
 *   const agent = await AI.createAgent({ tier: 'master', session, ort });
 *   // 게임 루프에서 그 좌석 차례일 때:
 *   game.act(await agent.act(game, seat));
 *
 * 휴리스틱 티어는 session/ort가 필요 없고 persona로 성향을 고른다
 * (gambler 승부사 / balanced 밸런스 / careful 신중파 — 비딩 공격성이 다르다).
 *
 * 성향을 화면에 노출하지 않으려면 createTable을 쓴다. 좌석마다 성향을 무작위로
 * 배정하고 그 배정을 매치(지정 라운드 수) 내내 유지한다:
 *
 *   const table = AI.createTable({ tiers: ['master','advanced','advanced','advanced','advanced'],
 *                                  session, ort });
 *   for (let round = 0; round < ROUNDS; round++) {
 *     table.reset();                       // 라운드 시작 시 내부 버퍼 정리
 *     const game = new E.MightyGame({ seed });
 *     ... game.act(await table.agents[seat].act(game, seat)) ...
 *   }
 *   // 새 게임 → createTable을 다시 불러 새로 배정
 */
(function () {
'use strict';
const E = (typeof require !== 'undefined') ? require('./mighty-engine.js') : window.MightyEngine;
const M = (typeof require !== 'undefined') ? require('./mighty-master.js') : window.MightyMaster;

const TIERS = ['intermediate', 'advanced', 'master'];
const TIER_LABEL = { intermediate: '중급', advanced: '고급', master: '마스터' };

/**
 * 키카드 가드레일 — 아군이 '확정으로' 이기고 있는 트릭에 마이티·조커를 버리는 명백한
 * 낭비를 막는다. 대안이 있을 때만 발동하며, 아군이 이미 확정승이므로 트릭 손실이 없다.
 * (v3 모델이 드물게 파트너의 조커 선에 마이티를 얹던 사례 대응)
 */
function keyCardGuard(game, seat, action, trace) {
  const T = (why, extra) => { if (trace) Object.assign(trace, { why }, extra); };
  try {
    if (!action || action.type !== 'play' || game.phase !== 'play') { T('not-play'); return action; }
    const pl = game.play;
    if (!pl || pl.table.length === 0) { T('lead'); return action; }
    const c = action.card;
    const g = game.contract ? game.contract.giruda : 'N';
    const cfg = game.config || {};
    const isKey = x => E.isJoker(x) || E.sameCard(x, game.mightyCard);
    const isTrump = x => g !== 'N' && !E.isJoker(x) && x.suit === g;

    // 현재 최강
    let best = null, bk = [-2, -1];
    for (const e of pl.table) {
      const k = game._cardStrength(e, pl);
      if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
    }
    if (!best) { T('no-best'); return action; }
    const beats = (card, jokerSuit) => {
      const k = game._cardStrength({ player: seat, card, jokerSuit }, pl);
      return k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]);
    };
    const iWin = beats(c, action.jokerSuit);

    // 남은 사람이 현재 최강을 넘길 수 있는가 (내 정보 기준, 보수적으로)
    const seen = new Set();
    for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
    for (const e of pl.table) seen.add(E.cardId(e.card));
    for (const x of game.hands[seat]) seen.add(E.cardId(x));
    if (seat === game.declarer && game.discard) for (const x of game.discard) seen.add(E.cardId(x));
    const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
    let remaining = 0;
    for (let p = 0; p < E.NUM_PLAYERS; p++) if (!acted.has(p)) remaining++;
    const myK = game._cardStrength({ player: seat, card: c, jokerSuit: action.jokerSuit }, pl);
    const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
    // 남은 사람이 낼 수 있는 위협들을 모은다 (내 정보 기준, 보수적)
    const threats = [];
    if (remaining > 0) {
      const lastTrick = pl.trickNo >= 10;
      const jokerCanWin = !pl.jokerCallActive &&
        !(pl.trickNo === 1 && cfg.firstTrickJokerWeak !== false) &&
        !(lastTrick && cfg.lastTrickJokerWeak !== false);
      let ruffPossible = true;
      if (pl.ledSuit && g !== 'N' && pl.ledSuit !== g) {
        let unseenLed = 0;
        for (let r = 2; r <= 14; r++) if (!seen.has(pl.ledSuit + r)) unseenLed++;
        if (unseenLed >= remaining) ruffPossible = false;
      }
      if (!seen.has(E.cardId(game.mightyCard))) threats.push([4, 0]);
      if (jokerCanWin && !seen.has(E.JOKER)) threats.push([3, 0]);
      if (g !== 'N' && ruffPossible)
        for (let r = 2; r <= 14; r++) if (!seen.has(g + r)) threats.push([2, r]);
      if (pl.ledSuit)
        for (let r = 2; r <= 14; r++) if (!seen.has(pl.ledSuit + r)) threats.push([1, r]);
    }
    const realThreats = threats.filter(t => gt(t, bk));
    const lockedForOthers = realThreats.length === 0;
    // 내 카드가 실제로 막아낼 수 있는 위협만이 그 카드를 낼 이유가 된다
    const protective = realThreats.some(t => gt(myK, t));

    // 팀 인지 (내가 아는 범위)
    const iAmDecl = seat === game.declarer;
    const iAmFriend = (game.friendRevealed && game.friend === seat) ||
      (game.friendDecl && game.friendDecl.mode === 'card' && game.friendDecl.card &&
       game.hands[seat].some(x => E.sameCard(x, game.friendDecl.card)));
    const iAmRuling = iAmDecl || iAmFriend;
    let winnerIsOpp = null;                       // null이면 모른다
    if (best.player === game.declarer) winnerIsOpp = !iAmRuling;
    else if (game.friendRevealed) {
      const w = (game.friend !== null && best.player === game.friend);
      winnerIsOpp = iAmRuling ? !w : w;
    }

    // 두 가지 낭비를 막는다.
    //  A) 아군이 확정으로 이기는 트릭을 내가 덮는 경우 — 마이티·조커·기루다를 태운다
    //  B) 어차피 못 이기는 트릭에 비싼 카드를 내는 경우 — 승패와 무관하게 손해
    const keyOrTrump = x => isKey(x) || isTrump(x);
    // 진단용 상태 — 판정에는 쓰지 않는다
    if (trace) Object.assign(trace, {
      iWin, protective, winnerIsOpp, lockedForOthers, remaining,
      threatKinds: realThreats.map(t => t[0]),
    });
    let wasteful;
    if (iWin) {
      if (protective) { T('iWin-protective'); return action; }
      if (winnerIsOpp !== false) {
        T(winnerIsOpp === null ? 'iWin-team-unknown' : 'iWin-over-opponent');
        return action;
      }
      wasteful = keyOrTrump;                      // 점수 카드는 아군 트릭이라 문제없다
    } else {
      wasteful = x => keyOrTrump(x) ||
        (lockedForOthers && winnerIsOpp === true && E.isPointCard(x));
    }
    if (!wasteful(c)) { T('not-wasteful-by-guard'); return action; }

    const alts = game._legalPlays(seat).filter(m =>
      !m.jokerCall && !wasteful(m.card) && !beats(m.card, m.jokerSuit));
    if (!alts.length) { T('no-cheap-alt'); return action; }
    const cost = m => (m.card.rank || 0) + (E.isPointCard(m.card) ? 30 : 0);
    alts.sort((a, b) => cost(a) - cost(b));
    T('intervened');
    return { type: 'play', card: alts[0].card };
  } catch (e) { T('error'); return action; }
}

/**
 * 탑 리드 가드 — 주공이 기루다 리드를 골랐고, 내 최고 기루다 위 서열이 밖에 없으며,
 * 상대 기루다가 남아 있으면 최고 기루다로 교체한다("확실한 정리 + 프렌드 신호").
 * 인증: 같은 딜 페어드 개입 2,400시드 — 발화 판 +167±114 · 전체 +58±40 ·
 * 여당 승수 +15/645 (docs/trump-lead-results.txt, 2026-08-07).
 * 좌석 가시 정보만 사용. 리드 무늬 선택은 강제하지 않는다(any 변형 미인증).
 * 롤백: createAgent({topGuard:false}) 또는 v2.2.0 스테이지 재배포(MODELS.md 참조).
 */
function topLeadGuard(game, seat, action) {
  try {
    if (!action || action.type !== 'play' || game.phase !== 'play') return action;
    if (seat !== game.declarer) return action;
    const pl = game.play;
    if (!pl || pl.table.length !== 0 || action.jokerCall) return action;
    const g = game.contract ? game.contract.giruda : 'N';
    if (g === 'N') return action;
    const c = action.card;
    if (E.isJoker(c) || c.suit !== g) return action;   // 기루다 리드 결정에만 개입
    const myTr = game.hands[seat].filter(x => !E.isJoker(x) && x.suit === g)
      .sort((a, b) => b.rank - a.rank);
    if (!myTr.length) return action;
    const top = myTr[0];
    if (E.sameCard(c, top)) return action;             // 이미 최고 기루다
    const seen = new Set();
    for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
    for (const x of game.hands[seat]) seen.add(E.cardId(x));
    if (game.discard) for (const x of game.discard) seen.add(E.cardId(x));
    let outTop = 0, outAny = 0;
    for (let r = 2; r <= 14; r++)
      if (!seen.has(g + r)) { outAny++; if (r > top.rank) outTop++; }
    if (outTop > 0 || outAny === 0) return action;     // 위 서열 잔존 / 정리 대상 없음
    if (!game._legalPlays(seat).some(m => !m.jokerCall && !m.jokerSuit && E.sameCard(m.card, top)))
      return action;                                    // 초구 기루다 금지 등
    return { type: 'play', card: top };
  } catch (e) { return action; }
}

/**
 * 야당 기루다 헌납 가드 — 공개 후 야당이, 여당이 현재 최강인 '기루다 리드' 트릭에
 * 이기지도 못할 점수 기루다를 태울 때 최저 비점수 기루다로 교체한다.
 * 점수 기루다는 이후 야당이 이기는 트릭에 보태야 한다(2026-08-08 실플레이 제보:
 * 주공 ♥A 트릭에 ♥Q — 같은 딜 롤아웃 −942/판).
 * 인증: 전좌석 마스터 2,400시드 페어드 — 발화 판 주공 상금 −895±446,
 * 전체 −19.5±11.1, 여당 승수 −6/40 (docs/tfeed-cert*.txt).
 * 팀 판정은 가시 정보만(프렌드 공개 후 한정). 롤백: createAgent({feedGuard:false}).
 */
function tfeedGuard(game, seat, action) {
  try {
    if (!action || action.type !== 'play' || game.phase !== 'play' || action.jokerCall) return action;
    if (!game.friendRevealed) return action;
    if (seat === game.declarer || seat === game.friend) return action;
    const pl = game.play;
    if (!pl || !pl.table.length) return action;
    const g = game.contract ? game.contract.giruda : 'N';
    if (g === 'N' || pl.ledSuit !== g) return action;
    const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
    let bk = [-2, -1], bp = -1;
    for (const e of pl.table) {
      const k = game._cardStrength(e, pl);
      if (gt(k, bk)) { bk = k; bp = e.player; }
    }
    if (!(bp === game.declarer || (game.friend !== null && bp === game.friend))) return action;
    const c = action.card;
    const isKey = x => E.isJoker(x) || E.sameCard(x, game.mightyCard);
    if (E.isJoker(c) || isKey(c) || c.suit !== g || !E.isPointCard(c)) return action;
    if (gt(game._cardStrength({ player: seat, card: c }, pl), bk)) return action;  // 이기는 수면 존중
    const alt = game._legalPlays(seat).filter(m => !m.jokerCall && !E.isJoker(m.card)
      && !isKey(m.card) && m.card.suit === g && !E.isPointCard(m.card)
      && !gt(game._cardStrength({ player: seat, card: m.card }, pl), bk));
    if (!alt.length) return action;
    alt.sort((a, b) => a.card.rank - b.card.rank);
    return { type: 'play', card: alt[0].card };
  } catch (e) { return action; }
}

/**
 * 야당 기루다 리드 가드 — 확정 야당(카드 프렌드 판에서 프렌드 카드 미보유·비주공)이
 * 기루다를 리드하기로 하면, 같은 정책의 차선 비기루다 리드로 교체한다.
 * 야당의 기루다 리드는 주공의 기루다 정리를 대신 해주는 수 (2026-08-08 제보:
 * 야당 트릭2 ♣2 리드 — 4후보 중 최하).
 * 인증: 전좌석 마스터 2,400시드 페어드 — 발화 판 주공 상금 −178±136,
 * 전체 −46±35, 여당 승수 −19/462 (docs/dlead-cert*.txt).
 * 교체 수를 정책 로짓에서 뽑으므로 발화 시에만 추론 1회 추가(판당 0.27회).
 * 롤백: createAgent({dleadGuard:false}).
 */
function dleadCond(game, seat, action) {
  if (!action || action.type !== 'play' || game.phase !== 'play' || action.jokerCall) return false;
  if (seat === game.declarer) return false;
  const pl = game.play;
  if (!pl || pl.table.length !== 0) return false;
  const g = game.contract ? game.contract.giruda : 'N';
  if (g === 'N') return false;
  const c = action.card;
  if (E.isJoker(c) || E.sameCard(c, game.mightyCard) || c.suit !== g) return false;
  const fd = game.friendDecl;
  if (!fd || fd.mode !== 'card' || !fd.card) return false;   // 야당 확정이 가능한 판만
  if (game.hands[seat].some(x => E.sameCard(x, fd.card))) return false;
  if (game.friendRevealed && game.friend === seat) return false;
  return true;
}
async function dleadGuard(session, ort, game, seat, action) {
  try {
    if (!session || !ort || !dleadCond(game, seat, action)) return action;
    let obs = M.encodeObs(game, seat, []);
    const mask = M.legalMask(game, []);
    const want = M.modelObsDim(session);
    if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
    const out = await session.run({
      obs: new ort.Tensor('float32', obs, [1, want]),
      mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
    });
    const logits = out.logits.data;
    const gi = game.contract.giruda;
    let best = -1, bv = -Infinity;
    for (let i = 0; i < M.ACTION_DIM; i++) {
      if (!mask[i] || i === 206) continue;                     // 조커콜 제외
      if (i >= 149 && i < 201 && M.idxCard(i - 149).suit === gi) continue;   // 기루다 제외
      if (i >= 201 && i < 205 && ['S','D','H','C'][i - 201] === gi) continue; // 조커 기루다 요구 제외
      if (logits[i] > bv) { bv = logits[i]; best = i; }
    }
    if (best < 0) return action;
    const alt = M.actionToEngine(best, game, []);
    return (alt && alt.type === 'play') ? alt : action;
  } catch (e) { return action; }
}

/**
 * 주공 점수 기루다 리드 가드 — 주공이 '그 카드 위 서열이 밖에 남은' 상태에서
 * 점수 기루다(10·J·Q·K·A)를 리드하면, 같은 정책의 차선(해당 클래스 제외 argmax)
 * 으로 교체한다. 위 서열에 잡히며 점수만 헌납하는 리드 차단.
 * 인증(v7=b4a 기준, 2,400시드 페어드): 발화 판 +213±169 · 전체 +34 · 승수 +14/299.
 * v6b에서는 중립(+73±172) — v7 배포와 함께만 유효한 모델 전용 가드
 * (docs/c1-cert*.txt). 발화 시에만 재추론 1회. 롤백: createAgent({c1Guard:false}).
 */
async function c1Guard(session, ort, game, seat, action) {
  try {
    if (!session || !ort || !action || action.type !== 'play' || game.phase !== 'play'
        || action.jokerCall || seat !== game.declarer) return action;
    const pl = game.play;
    if (!pl || pl.table.length !== 0) return action;
    const gi = game.contract ? game.contract.giruda : 'N';
    if (gi === 'N') return action;
    const c = action.card;
    if (E.isJoker(c) || E.sameCard(c, game.mightyCard) || c.suit !== gi || !E.isPointCard(c)) return action;
    const seen = new Set();
    for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
    for (const x of game.hands[seat]) seen.add(E.cardId(x));
    if (game.discard) for (const x of game.discard) seen.add(E.cardId(x));
    let higher = false;
    for (let r = c.rank + 1; r <= 14; r++) if (!seen.has(gi + r)) { higher = true; break; }
    if (!higher) return action;                        // 탑이면 정당 (topLeadGuard 영역)
    let obs = M.encodeObs(game, seat, []);
    const mask = M.legalMask(game, []);
    const want = M.modelObsDim(session);
    if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
    const out = await session.run({
      obs: new ort.Tensor('float32', obs, [1, want]),
      mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
    });
    const logits = out.logits.data;
    let best = -1, bv = -Infinity;
    for (let i = 0; i < M.ACTION_DIM; i++) {
      if (!mask[i] || i === 206) continue;
      if (i >= 149 && i < 201) {
        const cd = M.idxCard(i - 149);
        if (cd.suit === gi && E.isPointCard(cd) && !E.sameCard(cd, game.mightyCard)) {
          let h2 = false;
          for (let r = cd.rank + 1; r <= 14; r++) if (!seen.has(gi + r)) { h2 = true; break; }
          if (h2) continue;                            // 클래스 액션 제외
        }
      }
      if (logits[i] > bv) { bv = logits[i]; best = i; }
    }
    if (best < 0) return action;
    const alt = M.actionToEngine(best, game, []);
    return (alt && alt.type === 'play') ? alt : action;
  } catch (e) { return action; }
}

/**
 * 확정승 컷 가드 — 공개 후, 리드 무늬 보이드인 좌석이 상대팀이 최강인 점수
 * 트릭을 두고 비기루다 버림을 선택하면, '가시 확정승'인 최저 기루다 컷으로
 * 교체한다. keyCardGuard(아끼기)의 역방향 — 먹어야 할 때 먹는다.
 * 인증(v7, 1,600시드 페어드): 발화 좌석 상금 +533±166, 두 배치 단독 유의
 * (+401±265 / +634±210 — docs/c5-cert.txt). 제보 seed 746746024 트릭7
 * (♠6 버림 대 ♦6 컷, +1,150/판)에서 출발. 교사 결정론 — 차기 증류 클래스.
 * 롤백: createAgent({cutGuard:false}).
 */
function cutGuard(game, seat, action) {
  try {
    if (!action || action.type !== 'play' || game.phase !== 'play'
        || action.jokerCall || !game.friendRevealed) return action;
    const pl = game.play;
    if (!pl || !pl.table.length) return action;
    const gi = game.contract ? game.contract.giruda : 'N';
    if (gi === 'N') return action;
    const c = action.card;
    if (E.isJoker(c) || E.sameCard(c, game.mightyCard)) return action;
    if (c.suit === gi || pl.ledSuit === gi) return action;         // 이미 컷 / 기루다 팔로우
    if (game.hands[seat].some(x => !E.isJoker(x) && x.suit === pl.ledSuit)) return action;
    if (pl.table.filter(e => E.isPointCard(e.card)).length < 1) return action;
    const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
    let bk = [-2, -1], bp = -1;
    for (const e of pl.table) {
      const k = game._cardStrength(e, pl);
      if (gt(k, bk)) { bk = k; bp = e.player; }
    }
    const iAmRuling = seat === game.declarer || seat === game.friend;
    const bestRuling = bp === game.declarer || (game.friend !== null && bp === game.friend);
    if (iAmRuling === bestRuling) return action;                   // 아군 최강이면 방치 정당
    const seen = new Set();
    for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
    for (const e of pl.table) seen.add(E.cardId(e.card));
    for (const x of game.hands[seat]) seen.add(E.cardId(x));
    if (seat === game.declarer && game.discard) for (const x of game.discard) seen.add(E.cardId(x));
    const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
    let remaining = 0;
    for (let p = 0; p < E.NUM_PLAYERS; p++) if (!acted.has(p)) remaining++;
    const cfg = game.config || {};
    const jokerCanWin = !pl.jokerCallActive &&
      !(pl.trickNo === 1 && cfg.firstTrickJokerWeak !== false) &&
      !(pl.trickNo >= 10 && cfg.lastTrickJokerWeak !== false);
    const threats = [];
    if (remaining > 0) {
      if (!seen.has(E.cardId(game.mightyCard))) threats.push([4, 0]);
      if (jokerCanWin && !seen.has(E.JOKER)) threats.push([3, 0]);
      for (let r = 2; r <= 14; r++) if (!seen.has(gi + r)) threats.push([2, r]);
    }
    const myTr = game.hands[seat]
      .filter(x => !E.isJoker(x) && x.suit === gi && !E.sameCard(x, game.mightyCard))
      .sort((a, b) => a.rank - b.rank);
    for (const tc of myTr) {
      const k = game._cardStrength({ player: seat, card: tc }, pl);
      if (!gt(k, bk)) continue;
      if (threats.some(t => gt(t, k))) continue;                   // 뒤 위협에 잡힘
      if (!game._legalPlays(seat).some(m => !m.jokerCall && E.sameCard(m.card, tc))) continue;
      return { type: 'play', card: tc };                           // 최저 확정승 컷
    }
    return action;
  } catch (e) { return action; }
}

/**
 * 배포 가드 체인 — 정책 argmax 결과에 후처리 가드를 정해진 순서로 적용한다.
 * 실플레이 에이전트·코칭·AI 복기 시뮬이 **전부 이 함수 하나**를 쓴다. 체인을
 * 세 곳에 복사해 두면 한 곳만 구버전으로 남는다(코칭 정합 버그 실적).
 *
 * 가드별로 opts.xxxGuard=false로 끈다. c1Guard만 반대로 기본 OFF다 —
 * v9 가드 스윕에서 이득 근거가 소멸(−92±261 중립)했고 발화 시 재추론 비용만
 * 남아서, 켜려면 명시적으로 {c1Guard:true}를 준다(docs/GUARDS.md).
 *
 * opts.guardCount에 객체를 주면 가드별 발화 횟수를 센다(진단 전용,
 * tools/research/guard_fire.js).
 */
async function applyGuards(session, ort, game, seat, action, opts = {}) {
  const cnt = opts.guardCount || null;
  const tally = (name, before, after) => {
    if (cnt && before !== after) cnt[name] = (cnt[name] || 0) + 1;
    return after;
  };
  let x = (opts.keyGuard === false ? action
    : tally('key', action, keyCardGuard(game, seat, action, opts.guardTrace)));
  if (opts.topGuard !== false) x = tally('top', x, topLeadGuard(game, seat, x));
  if (opts.feedGuard !== false) x = tally('tfeed', x, tfeedGuard(game, seat, x));
  if (opts.cutGuard !== false) x = tally('cut', x, cutGuard(game, seat, x));
  if (opts.dleadGuard !== false) x = tally('dlead', x, await dleadGuard(session, ort, game, seat, x));
  if (opts.c1Guard === true) x = tally('c1', x, await c1Guard(session, ort, game, seat, x));
  return x;
}

/** onnxruntime 세션 생성 (마스터 티어 전용). ort는 호출자가 넘긴다. */
async function loadMaster(ort, modelPath = 'mighty_master_v4.onnx') {
  return ort.InferenceSession.create(modelPath);
}

/**
 * 좌석에 앉힐 에이전트를 만든다.
 * 반환 객체의 act(game, seat)는 항상 엔진에 그대로 넣을 수 있는 액션을 돌려준다
 * (바닥패 교환의 부분 선택은 내부에서 3장까지 모아 처리).
 */
async function createAgent(opts = {}) {
  const { tier = 'intermediate', persona = 'balanced', rng = Math.random,
          session = null, ort = null, revealPersona = false } = opts;
  if (!TIERS.includes(tier)) throw new Error('unknown tier: ' + tier);

  if (tier === 'master') {
    if (!session || !ort) throw new Error('master 티어에는 {session, ort}가 필요하다');
    const pick = [];
    return {
      tier, label: TIER_LABEL[tier],
      reset() { pick.length = 0; },
      async act(game, seat) {
        if (seat === undefined) seat = game.currentPlayer;
        for (let guard = 0; guard < 8; guard++) {
          const a = await M.chooseAction(session, ort, game, seat, pick);
          const act = M.actionToEngine(a, game, pick);
          // null이면 교환 카드 누적 중 → 다시 고른다
          if (act) return applyGuards(session, ort, game, seat, act, opts);
        }
        throw new Error('master: 액션 확정 실패');
      },
    };
  }

  const agent = new E.HeuristicAgent(E.PERSONAS[persona], rng, { tier });
  return {
    tier, label: TIER_LABEL[tier],
    // 성향은 기본적으로 감춘다 — 화면에 새어나가면 상대를 읽는 단서가 된다.
    ...(revealPersona ? { persona } : {}),
    reset() {},
    async act(game) { return agent.act(game); },
  };
}

/** 학습·배포 표준 성향 3종. team·loner는 하위호환용이라 배정에서 뺀다. */
const PERSONA_KEYS = ['gambler', 'balanced', 'careful'];

/**
 * 매치 단위 좌석 배정표. 좌석마다 성향을 무작위로 뽑아 매치 내내 고정한다.
 * 라운드가 바뀌어도 같은 좌석은 같은 성향이고, 새 게임에서 다시 부르면 새로 뽑힌다.
 * 좌석별 성향은 table.personas로만 볼 수 있다(진단·재현용, UI 노출 금지).
 *
 * opts.tiers  좌석별 티어 배열 또는 단일 문자열
 * opts.personas  배정을 직접 지정(재현용). 생략하면 무작위.
 */
async function createTable(opts = {}) {
  const { tiers = 'advanced', rng = Math.random, session = null, ort = null,
          personas = null, revealPersona = false, sessions = null } = opts;
  const seats = opts.seats || E.NUM_PLAYERS;
  const tierAt = s => (Array.isArray(tiers) ? tiers[s] : tiers);
  const assigned = [], agents = [];
  for (let s = 0; s < seats; s++) {
    const tier = tierAt(s);
    // 마스터는 성향 개념이 없다
    const persona = tier === 'master' ? null
      : (personas ? personas[s] : PERSONA_KEYS[Math.floor(rng() * PERSONA_KEYS.length)]);
    assigned.push(persona);
    // v2.8: 혼합 운영 — 좌석별 모델 세션(성향차)을 허용한다
    agents.push(await createAgent({ tier, persona: persona || 'balanced',
                                    rng, session: (sessions && sessions[s]) || session,
                                    ort, revealPersona }));
  }
  return {
    seats, agents,
    personas: assigned.slice(),
    /** 라운드 시작 시 호출 — 좌석 배정은 그대로 두고 내부 버퍼만 비운다. */
    reset() { for (const a of agents) if (a.reset) a.reset(); },
  };
}

const api = { createAgent, createTable, loadMaster, applyGuards,
              keyCardGuard, topLeadGuard, tfeedGuard, dleadGuard, c1Guard, cutGuard,
              TIERS, TIER_LABEL, PERSONA_KEYS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else window.MightyAI = api;

})();
