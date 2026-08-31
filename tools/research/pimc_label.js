/**
 * 탐색 교사 라벨러 (docs/LOOKAHEAD-PLAN.md 2단계 · ExIt).
 *
 * 자가대전을 돌며 플레이 결정 국면을 샘플링하고, 각 국면에서 PIMC 탐색으로
 * '개선된 행동'을 찾아 jsonl로 남긴다. 파이썬 학습 측이 같은 판을 재현해
 * 관측을 만들고 CE 목표로 쓴다(엔진 파리티가 보장하므로 안전하다).
 *
 * 규칙 기반 conv_target과 달리 **클래스를 사람이 정의하지 않는다** — 컷·조커콜·
 * 기루다 소진이 한 탐색에서 동시에 나온다.
 *
 * 비용 조절: 후보 수(TOPM)와 결정화 수(K)와 롤아웃 깊이(DEPTH)로 조절한다.
 * DEPTH=0이면 끝까지 굴리고, N이면 N트릭만 굴린 뒤 가치 헤드로 평가한다.
 *
 * 사용: node tools/research/pimc_label.js <출력.jsonl> [판수]
 *   env MODEL · SEED_BASE · TOPM(기본 4) · K(기본 32) · DEPTH(기본 3)
 *       SAMPLE(국면 샘플링 확률, 기본 0.25) · MARGIN(정책 1위와 탐색 1위가
 *       같으면 기록하지 않는 최소 이득, 기본 0 = 전부 기록)
 *       JC_SAMPLE(조커콜 국면 샘플링 확률, 기본 1.0) · K_JC(조커콜 국면 결정화 수,
 *       기본 200) — 조커콜은 기회가 1.2만 판에 242회로 극히 드물어 균등
 *       샘플링하면 CE 신호가 컷에 묻힌다(v12에서 실측: 이득형 94.5→85.9%,
 *       자해형 9.1→12.8%로 악화). 과표집하고 결정화도 늘려 라벨 품질을 올린다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v9.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '21000000', 10);
const TOPM = parseInt(process.env.TOPM || '4', 10);
const K = parseInt(process.env.K || '32', 10);
const DEPTH = parseInt(process.env.DEPTH || '3', 10);
const SAMPLE = parseFloat(process.env.SAMPLE || '0.25');
const MARGIN = parseFloat(process.env.MARGIN || '0');
// SPLIT: 결정화 A/B 분리 검증(승자의 저주 제거). 라벨 품질 스위치다.
const SPLIT = process.env.SPLIT === '1';
const JC_SAMPLE = parseFloat(process.env.JC_SAMPLE || '1.0');
const K_JC = parseInt(process.env.K_JC || '200', 10);
// 특수카드 무력화 국면(조커콜·마이티 무늬 리드)은 이득이 여러 트릭 뒤에 실현된다.
// 깊이 3에서 자르면 조커콜 가치가 평균 1,155 과소평가된다(keykill_probe 실측).
// 그래서 이 국면만 끝까지 굴리고(DEPTH_JC=0) 결정화도 크게 준다.
const DEPTH_JC = parseInt(process.env.DEPTH_JC || String(DEPTH), 10);
const KEYKILL_ONLY = process.env.KEYKILL_ONLY === '1';

// --- 복기 기반 재학습 (2026-08-16) ---------------------------------------
// REC_DIR: 복기 내보내기(.md)가 든 디렉터리. 주면 자가대전 대신 그 기록을 재생하며
//   라벨한다. 내보내기에 seed·dealer·cfg·actions가 다 있어 출력 포맷이 그대로 맞는다.
// FORCE_BID: 바닥패 교환 때 공약을 이 값으로 올린다(같은 기루다라 변경 비용 없음).
//   ※ 20 강제는 실패했다(2026-08-16 실측). 계약이 '빡빡한' 게 아니라 '가망 없는'
//     것이 되어 무슨 수를 둬도 같이 지고, 탐색이 수를 구분하지 못한다 —
//     개입 라벨 545건 중 이득>0.05가 4건, 정책 불일치 2.4%. 쓰지 마라.
//     제보 국면은 공약 15에서 판이 진행되며 여유가 0이 된 경우였다. 그런 국면은
//     공약을 올려 만드는 게 아니라 SLACK_MAX로 골라낸다.
// SLACK_MIN·SLACK_MAX: 여당 여유(확보 + 남은 점수 − 공약)로 개입 국면을 거른다.
//   자가대전 실측(371국면): 여유 0 이하가 30.5%, 2 이하가 53.1%. 강제 없이도 충분하다.
//   여유가 음수면 계약이 이미 수학적으로 깨져 무슨 수를 둬도 같이 지므로 제외한다
//   (FORCE_BID=20이 실패한 것과 같은 이유). 표적은 0~2 — 빡빡하지만 가능한 구간.
// CLASS_SAMPLE·K_CLASS: 프렌드 개입 국면(weaklead·oppwin) 과표집. 조커콜에서 쓴
//   JC_SAMPLE·K_JC와 같은 방식이다.
const REC_DIR = process.env.REC_DIR || '';
const FORCE_BID = parseInt(process.env.FORCE_BID || '0', 10);
const CLASS_SAMPLE = parseFloat(process.env.CLASS_SAMPLE || '0');
// CLASS_ONLY: 개입 클래스를 하나로 한정한다(예: weaklead). 표적이 한 클래스일 때
//   다른 클래스 라벨이 섞이면 이동 예산(KL)을 나눠 쓰게 된다.
const CLASS_ONLY = process.env.CLASS_ONLY || '';
const ORT_THREADS = parseInt(process.env.ORT_THREADS || '0', 10);
const K_CLASS = parseInt(process.env.K_CLASS || String(K_JC), 10);
const DEPTH_CLASS = parseInt(process.env.DEPTH_CLASS || '0', 10);
const SLACK_MAX = process.env.SLACK_MAX === undefined ? null : parseInt(process.env.SLACK_MAX, 10);
const SLACK_MIN = process.env.SLACK_MIN === undefined ? null : parseInt(process.env.SLACK_MIN, 10);
// KEY_SAMPLE: 프렌드 키카드(마이티·조커) 소비 국면 표집 확률. 개입 일반보다 좁다.
const KEY_SAMPLE = parseFloat(process.env.KEY_SAMPLE || '0');
// BID_MAX: 이 공약을 넘는 판은 표집하지 않는다. 19·20은 희소하고 계약이 이미
// 깨져 있어 라벨이 퇴화한다(공약 20 강제 545건 중 이득>0.05가 4건이었다).
const BID_MAX = parseInt(process.env.BID_MAX || '99', 10);

/** 여당 여유 = (확보 점수 + 남은 점수) − 공약. 0이면 남은 점수를 전부 먹어야 한다.
 *  전부 공개 정보다 — 획득 더미와 지나간 트릭만 센다. */
function attackSlack(g) {
  const decl = g.declarer;
  const fr = g.friendRevealed ? g.friend : null;
  const got = g.play.capturedPoints[decl] + (fr !== null && fr !== undefined ? g.play.capturedPoints[fr] : 0);
  let played = 0;
  for (const t of g.play.history)
    played += t.plays.filter(e => !E.isJoker(e.card) && e.card.rank >= 10).length;
  for (const e of g.play.table)
    if (!E.isJoker(e.card) && e.card.rank >= 10) played++;
  return got + (20 - played) - g.contract.count;
}

/** 프렌드 키카드 소비 국면인가 — 마이티·조커를 지금 낼 수 있고 선택지가 있다.
 *  2026-08-16 방향 전환: 개입 일반이 아니라 "키카드를 언제 쓰는가"가 표적이다.
 *  주공 의도 읽기(주공이 약해지는 시점·내가 이어받을 카드 유무·공약 붕괴 직전)가
 *  걸리는 지점이라 사람 주공과의 협력 품질을 좌우한다. 좌석 가시 정보만 쓴다. */
function keySpendClass(g, p) {
  if (g.phase !== 'play' || p === g.declarer) return null;
  const fd = g.friendDecl;
  const iAmFriend = fd && fd.mode === 'card' && fd.card &&
    g.hands[p].some(c => E.sameCard(c, fd.card));
  if (!iAmFriend) return null;
  const hasKey = g.hands[p].some(c => E.isJoker(c) || E.sameCard(c, g.mightyCard));
  if (!hasKey) return null;
  const legal = g._legalPlays(p);
  if (legal.length < 2) return null;
  const canSpend = legal.some(mv => E.isJoker(mv.card) || E.sameCard(mv.card, g.mightyCard));
  return canSpend ? 'keyspend' : null;
}

/** 프렌드가 선을 잡고 기루다를 든 국면인가 — 기루다 정리 판단 자리다.
 *  실측(2026-08-18): 정책은 가장 낮은 기루다를 39% 던지고 교사는 22%다. 교사는
 *  그 자리에서 다른 무늬를 돌린다(41% 대 정책 28%). 이 습관을 라벨로 옮긴다. */
function trumpLeadClass(g, p) {
  if (g.phase !== 'play' || p === g.declarer) return null;
  if (!g.play || g.play.table.length !== 0) return null;
  const gir = g.contract && g.contract.giruda !== 'N' ? g.contract.giruda : null;
  if (!gir) return null;
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card &&
        g.hands[p].some(c => E.sameCard(c, fd.card)))) return null;
  if (!g.hands[p].some(c => !E.isJoker(c) && c.suit === gir)) return null;
  return g._legalPlays(p).length >= 2 ? 'trumplead' : null;
}

/** 마이티가 아직 안 나왔고 내 손에도 없다 — 배포는 이때 마이티 무늬 리드를 막는다 */
function mightyOut(g, p) {
  if (!g.mightyCard) return false;
  const id = E.cardId(g.mightyCard);
  for (const t of g.play.history) for (const e of t.plays) if (E.cardId(e.card) === id) return false;
  for (const e of g.play.table) if (E.cardId(e.card) === id) return false;
  return !g.hands[p].some(c => E.cardId(c) === id);
}

/** 프렌드 개입 국면인가 — 좌석 가시 정보만 쓴다. 'weaklead' | 'oppwin' | null */
function interveneClass(g, p) {
  if (g.phase !== 'play' || g.play.table.length === 0) return null;
  if (p === g.declarer) return null;
  const fd = g.friendDecl;
  const iAmFriend = fd && fd.mode === 'card' && fd.card &&
    g.hands[p].some(c => E.sameCard(c, fd.card));
  if (!iAmFriend) return null;
  let best = null, bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  if (!best) return null;
  const legal = g._legalPlays(p);
  if (legal.length < 2) return null;
  const canWin = legal.some(mv => {
    const mine = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: p,
                                   jokerCall: mv.jokerCall }, g.play);
    return !(bk[0] > mine[0] || (bk[0] === mine[0] && bk[1] > mine[1]));
  });
  if (!canWin) return null;
  const ally = best.player === g.declarer ||
    (g.friendRevealed && g.friend === best.player && best.player !== p);
  const behind = E.NUM_PLAYERS - 1 - g.play.table.length;
  if (!ally) return 'oppwin';
  return behind >= 2 ? 'weaklead' : null;
}

const SUITS = ['S', 'D', 'H', 'C'];
const allCards = () => {
  const out = [E.JOKER];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) out.push({ suit: s, rank: r });
  return out;
};

function knownTo(g, seat) {
  const seen = new Set();
  for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of g.play.table) seen.add(E.cardId(e.card));
  for (const c of g.hands[seat]) seen.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) seen.add(E.cardId(c));
  return seen;
}

function voidsOf(g) {
  const v = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) v.push(new Set());
  const scan = (plays, led) => {
    if (!led) return;
    for (const e of plays) {
      // 마이티·조커는 팔로우 면제 — 오프수트로 나와도 '무늬 없음'의 근거가 아니다
      if (E.isJoker(e.card) || (g.mightyCard && E.sameCard(e.card, g.mightyCard))) continue;
      if (e.card.suit !== led) v[e.player].add(led);
    }
  };
  for (const t of g.play.history)
    scan(t.plays, t.ledSuit || (t.plays[0] && !E.isJoker(t.plays[0].card) ? t.plays[0].card.suit : null));
  scan(g.play.table, g.play.ledSuit);
  return v;
}

function cloneGame(g) {
  const c = Object.create(Object.getPrototypeOf(g));
  for (const k of Object.keys(g)) {
    const v = g[k];
    c[k] = (typeof v === 'object' && v !== null) ? structuredClone(v) : v;
  }
  return c;
}

function determinize(g, seat, rnd) {
  const known = knownTo(g, seat);
  const pool = allCards().filter(c => !known.has(E.cardId(c)));
  const need = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) if (p !== seat) need.push({ seat: p, n: g.hands[p].length });
  const kittyN = (seat === g.declarer || !g.discard) ? 0 : g.discard.length;
  if (need.reduce((a, b) => a + b.n, 0) + kittyN !== pool.length) return null;
  const vd = voidsOf(g);
  const order = need.slice().sort((a, b) => vd[b.seat].size - vd[a.seat].size);
  for (let attempt = 0; attempt < 40; attempt++) {
    const bag = pool.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const assign = new Map();
    let ok = true;
    for (const { seat: p, n } of order) {
      const take = [];
      for (let i = 0; i < bag.length && take.length < n; i++) {
        const c = bag[i];
        if (!E.isJoker(c) && vd[p].has(c.suit)) continue;
        take.push(c); bag[i] = null;
      }
      if (take.length < n) { ok = false; break; }
      for (let i = bag.length - 1; i >= 0; i--) if (bag[i] === null) bag.splice(i, 1);
      assign.set(p, take);
    }
    if (!ok || bag.length !== kittyN) continue;
    const clone = cloneGame(g);
    for (const [p, cards] of assign) clone.hands[p] = cards;
    if (kittyN) clone.discard = bag;
    return clone;
  }
  return null;
}

/** 가치 헤드로 국면 평가 (깊이 제한 롤아웃의 말단) */
async function valueOf(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  return out.value ? out.value.data[0] : 0;
}

(async () => {
  const OUT = process.argv[2] || 'pimc_labels.jsonl';
  // 복기 모드면 판 수는 기록 수로 정해진다
  const RECS = [];
  if (REC_DIR) {
    for (const f of fs.readdirSync(REC_DIR).sort()) {
      if (!f.endsWith('.md')) continue;
      const raw = fs.readFileSync(path.join(REC_DIR, f), 'utf8');
      for (const m of raw.matchAll(/```json\n([\s\S]*?)\n```/g)) {
        try {
          const r = JSON.parse(m[1]);
          if (r && r.actions && r.cfg) RECS.push(r);
        } catch (e) { /* 기록이 아닌 코드블록은 건너뛴다 */ }
      }
    }
    console.error(`복기 기록 ${RECS.length}건 로드 (${REC_DIR})`);
  }
  const N = REC_DIR ? RECS.length : parseInt(process.argv[3] || '300', 10);
  // ORT_THREADS: 배치 1 추론이라 스레드를 늘려도 이득이 없고, 갈래를 병렬로 돌리면
  // 서로 코어를 뺏어 3갈래가 단일 실행보다 5배 느려진다(2026-08-17 실측).
  // 병렬 라벨링에서는 갈래당 2~4로 묶어라.
  const sess = await ort.InferenceSession.create(MODEL, ORT_THREADS
    ? { intraOpNumThreads: ORT_THREADS, interOpNumThreads: 1 } : undefined);
  const ws = fs.createWriteStream(OUT);
  let seedCounter = 12345;
  const rnd = () => { seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff;
    return seedCounter / 0x7fffffff; };

  // 롤아웃용 에이전트 — 배포 경로 그대로(가드 포함)가 평가자다
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));

  let labeled = 0, changed = 0, jcLabeled = 0, clsLabeled = 0, forced = 0, splitDrop = 0;
  for (let i = 0; i < N; i++) {
    const R = REC_DIR ? RECS[i] : null;
    const seed = R ? R.seed : SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame(R ? R.cfg : { seed });
    g.start(R ? R.dealer : Math.floor(rng() * E.NUM_PLAYERS));
    const actions = [];
    let guard = 0, step = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      // 복기 모드는 기록된 착수를 그대로 흘린다 — 나머지 경로는 자가대전과 같다
      let act = R ? (step < R.actions.length ? R.actions[step++].a : null)
                  : await ag[p].act(g, p);
      if (!act) break;
      // 공약 강제: 바닥패 교환에 revise를 실어 계약만 올린다(기루다 동일 → 비용 0)
      if (!R && FORCE_BID && g.phase === 'floor' && act.type === 'exchange'
          && !act.revise && g.contract && g.contract.count < FORCE_BID) {
        act = { ...act, revise: { count: FORCE_BID, giruda: g.contract.giruda } };
        forced++;
      }
      // 특수카드 무력화 국면인가 — 조커콜(조커 무력화) 또는 확정 야당의
      // 마이티 무늬 리드(마이티 무력화). 드물고 결정적이라 과표집한다.
      let isJC = false;
      if (g.phase === 'play' && g.play.table.length === 0) {
        const legal = g._legalPlays(p);
        const fd = g.friendDecl;
        const holdsFriendCard = fd && fd.mode === 'card' && fd.card &&
          g.hands[p].some(c => E.sameCard(c, fd.card));
        const oppSeat = p !== g.declarer && !holdsFriendCard &&
          !(g.friendRevealed && p === g.friend);
        if (legal.some(m => m.jokerCall)) isJC = true;
        if (!isJC && oppSeat && !g.hands[p].some(c => E.isJoker(c))) {
          const seen = new Set();
          for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
          for (const c of g.hands[p]) seen.add(E.cardId(c));
          const ms = g.mightyCard.suit;
          if (!seen.has(E.cardId(g.mightyCard)) &&
              legal.some(m => !m.jokerCall && !E.isJoker(m.card) && m.card.suit === ms
                              && !E.sameCard(m.card, g.mightyCard)))
            isJC = true;                    // 마이티 끌어내기 가능 국면
        }
      }
      // 프렌드 개입 국면 — 조커콜과 같은 이유로 드물고 결정적이라 따로 표집한다
      // KEY_SAMPLE>0이면 키카드 소비 국면을 우선 잡는다(개입 일반보다 좁고 중요하다)
      let cls = (KEY_SAMPLE > 0 && rnd() < KEY_SAMPLE) ? keySpendClass(g, p) : null;
      if (!cls) cls = CLASS_SAMPLE > 0
        ? (CLASS_ONLY === 'trumplead' ? trumpLeadClass(g, p) : interveneClass(g, p)) : null;
      if (cls && CLASS_ONLY && cls !== CLASS_ONLY) cls = null;
      const slack = cls ? attackSlack(g) : null;
      if (cls && SLACK_MAX !== null && slack > SLACK_MAX) cls = null;   // 여유가 넉넉하면 제외
      if (cls && SLACK_MIN !== null && slack < SLACK_MIN) cls = null;   // 이미 깨진 계약도 제외
      if (cls && g.contract && g.contract.count > BID_MAX) cls = null;  // 희소 고공약 포기
      const isKey = cls === 'keyspend' && !isJC;      // 선택 시점에 KEY_SAMPLE로 이미 걸렀다
      const isCls = !!cls && !isJC;
      const take = g.phase === 'play' && act.type === 'play' &&
        (isJC ? rnd() < JC_SAMPLE
              : isKey ? true
              : isCls ? rnd() < CLASS_SAMPLE
              : (!KEYKILL_ONLY && !CLASS_SAMPLE && !KEY_SAMPLE && rnd() < SAMPLE));
      if (take) {
        const kUse = isJC ? K_JC : isCls ? K_CLASS : K;
        const dUse = isJC ? DEPTH_JC : isCls ? DEPTH_CLASS : DEPTH;
        // 후보 — 정책 상위 TOPM
        let obs = M.encodeObs(g, p, []);
        const mask = M.legalMask(g, []);
        const want = M.modelObsDim(sess);
        if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
        const out = await sess.run({
          obs: new ort.Tensor('float32', obs, [1, want]),
          mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
        });
        const lg = out.logits.data;
        const idx = [];
        for (let a = 0; a < M.ACTION_DIM; a++) if (mask[a]) idx.push(a);
        idx.sort((a, b) => lg[b] - lg[a]);
        const cands = idx.slice(0, TOPM);
        if (cands.length > 1) {
          const dets = [];
          for (let k = 0; k < kUse; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
          if (dets.length >= 8) {
            const scores = [];
            for (const ci of cands) {
              let sum = 0, n = 0, sumA = 0, nA = 0, sumB = 0, nB = 0;
              for (let di = 0; di < dets.length; di++) {
                const sim = cloneGame(dets[di]);
                const a0 = M.actionToEngine(ci, sim, []);
                if (!a0) continue;
                try { sim.act(a0); } catch (e) { continue; }
                const stopTrick = sim.play ? sim.play.trickNo + dUse : 99;
                let gd = 0;
                while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200) {
                  if (dUse > 0 && sim.play && sim.play.trickNo >= stopTrick
                      && sim.play.table.length === 0) break;      // 트릭 경계에서 절단
                  const q = sim.currentPlayer;
                  sim.act(await ag[q].act(sim, q));
                }
                const v = sim.phase === 'done'
                  ? sim.result.prizes[p] / M.PRIZE_SCALE          // 가치 헤드와 같은 스케일
                  : await valueOf(sess, sim, p);
                sum += v; n++;
                if (di % 2) { sumB += v; nB++; } else { sumA += v; nA++; }
              }
              if (n) scores.push({ i: ci, v: sum / n,
                                   a: nA ? sumA / nA : null, b: nB ? sumB / nB : null });
            }
            if (scores.length > 1) {
              scores.sort((a, b) => b.v - a.v);
              const best = scores[0], polTop = cands[0];
              const polScore = scores.find(x => x.i === polTop);
              const gain = polScore ? best.v - polScore.v : 0;
              if (best.i !== polTop) changed++;
              // SPLIT=1: 결정화를 A/B로 갈라 **A에서 고르고 B에서 검증**한다.
              // 같은 표본에서 고르고 재면 표본 최대가 위로 편향돼(승자의 저주)
              // 노이즈로 뽑힌 수가 정답으로 들어간다 — 그런 라벨을 학습하면
              // in-sample만 오르고 새 국면은 그대로다(2026-08-17 홀드아웃 실측:
              // 학습 81% · 홀드아웃 57.3%로 앵커 58.2%보다도 낮았다).
              // 배포가 막은 수를 정답으로 넣지 않는다 — 마이티 무늬 리드는 사람
              // 정석으로 억제 중이라(v2.15.0), 교사가 권해도 학습시키면 규칙과
              // 싸우는 모델이 된다.
              const bannedTarget = (idx) => {
                if (!g.mightyCard || g.play.table.length !== 0 || !mightyOut(g, p)) return false;
                const a = M.actionToEngine(idx, g, []);
                return !!(a && a.card && !E.isJoker(a.card) && a.card.suit === g.mightyCard.suit);
              };
              let gainB = null, splitOk = true;
              if (SPLIT) {
                const ok = scores.filter(s => s.a !== null && s.b !== null);
                const bA = ok.length > 1 ? ok.reduce((x, y) => (y.a > x.a ? y : x)) : null;
                const pB = bA ? ok.find(s => s.i === polTop) : null;
                if (!bA || !pB || bA.i === polTop) splitOk = false;
                else {
                  gainB = bA.b - pB.b;               // 고른 뒤 다른 표본에서 잰 이득
                  if (gainB < MARGIN) splitOk = false;
                  else if (bannedTarget(bA.i)) splitOk = false;   // 억제 중인 수는 안 배운다
                  else best.i = bA.i;                // 목표도 A에서 고른 수로 바꾼다
                }
                if (!splitOk) splitDrop++;
              }
              if (splitOk && gain >= MARGIN) {
                ws.write(JSON.stringify({
                  seed, dealer: g.dealer, cfg: g.config, upto: actions.length, seat: p,
                  target: best.i, policyTop: polTop, gain: +(gainB === null ? gain : gainB).toFixed(4),
                  targetPolicyRank: cands.indexOf(best.i) + 1,
                  legalCount: idx.length, candidateCount: cands.length,
                  gainRaw: gainB === null ? undefined : +gain.toFixed(4), jc: isJC ? 1 : 0,
                  cls: cls || undefined, slack: slack === null ? undefined : slack,
                  src: R ? 'replay' : (FORCE_BID ? 'forcedbid' : 'selfplay'),
                  bid: g.contract ? g.contract.count : undefined,
                  actions: actions.map(a => JSON.parse(JSON.stringify(a))),
                }) + '\n');
                labeled++;
                if (isJC) jcLabeled++;
                if (isCls) clsLabeled++;
              }
            }
          }
        }
      }
      actions.push(JSON.parse(JSON.stringify(act)));
      g.act(act);
    }
    if ((i + 1) % 25 === 0)
      process.stderr.write(`  ${i + 1}/${N}판 · 라벨 ${labeled} · 정책과 다른 목표 ${changed}\n`);
  }
  ws.end();
  if (SPLIT) console.log(`검증 탈락 ${splitDrop}건 (A에서 고른 수가 B에서 못 이김) ` +
    `· 생존율 ${(100 * labeled / Math.max(1, labeled + splitDrop)).toFixed(1)}%`);
  console.log(`라벨 ${labeled}건 (조커콜 ${jcLabeled} · 프렌드 개입 ${clsLabeled}` +
    (forced ? ` · 공약강제 ${forced}판` : '') + `) · 정책 1위와 다른 목표 ` +
    `${changed}건 (${(100 * changed / Math.max(1, labeled)).toFixed(1)}%) → ${OUT}`);
})();
