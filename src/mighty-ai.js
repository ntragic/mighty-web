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
        const guarded = a => {
          let x = (opts.keyGuard === false ? a
            : keyCardGuard(game, seat, a, opts.guardTrace));
          if (opts.topGuard !== false) x = topLeadGuard(game, seat, x);
          return x;
        };
        for (let guard = 0; guard < 8; guard++) {
          const a = await M.chooseAction(session, ort, game, seat, pick);
          const act = M.actionToEngine(a, game, pick);
          if (act) return guarded(act);   // null이면 교환 카드 누적 중 → 다시 고른다
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
          personas = null, revealPersona = false } = opts;
  const seats = opts.seats || E.NUM_PLAYERS;
  const tierAt = s => (Array.isArray(tiers) ? tiers[s] : tiers);
  const assigned = [], agents = [];
  for (let s = 0; s < seats; s++) {
    const tier = tierAt(s);
    // 마스터는 성향 개념이 없다
    const persona = tier === 'master' ? null
      : (personas ? personas[s] : PERSONA_KEYS[Math.floor(rng() * PERSONA_KEYS.length)]);
    assigned.push(persona);
    agents.push(await createAgent({ tier, persona: persona || 'balanced',
                                    rng, session, ort, revealPersona }));
  }
  return {
    seats, agents,
    personas: assigned.slice(),
    /** 라운드 시작 시 호출 — 좌석 배정은 그대로 두고 내부 버퍼만 비운다. */
    reset() { for (const a of agents) if (a.reset) a.reset(); },
  };
}

const api = { createAgent, createTable, loadMaster, keyCardGuard, topLeadGuard,
              TIERS, TIER_LABEL, PERSONA_KEYS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else window.MightyAI = api;

})();
