/**
 * 공약 민감도 탐침 — 프렌드의 '개입' 확률이 공약 숫자에 반응하는가.
 *
 * 제보 2건(2026-08-14 조커 · 2026-08-16 컷)의 공통 주장: 공약 대비 여유가 없으면
 * 프렌드는 더 과감하게 트릭을 먹어야 한다. docs/LOOKAHEAD-PLAN.md의 '고공약 구간
 * 학습 사각' 항목이 조커 한 종류만 봤던 것을, 개입 일반(컷·오버테이크 포함)으로
 * 넓혀 잰다.
 *
 * 방법: 자가대전으로 국면을 모으고, **공약 숫자만 14/16/18/20으로 바꿔** 같은
 * 국면을 다시 인코딩해 개입 확률을 읽는다. 판을 실제로 진행시키지 않으므로
 * 결과론이 섞이지 않는다 — 정책이 계약 난이도를 보는지만 본다.
 *
 * 개입 국면은 두 클래스로 나눈다. 좌석 가시 정보만 쓴다.
 *
 *   CLASS=oppwin (기본) — 현재 테이블 최강이 **아군이 아니다**.
 *   CLASS=weaklead      — 최강이 아군이지만 **확정승이 아니고**(그 카드를 넘길
 *                         미출현 카드가 남았다) 뒤에 둘 이상이 남았다.
 *
 * weaklead를 따로 두는 이유: 2026-08-16 제보(seed 1400945189 9판 트릭6)가 이
 * 클래스였고, oppwin 측정 386건은 그 국면을 아예 세지 않았다. 주공이 약한 카드로
 * 리드한 트릭에서 프렌드가 안 나서는 것은 별개 결함이다.
 *
 * 공통 조건: 내가 프렌드(카드 보유·비주공) · 리드가 아님 · 트릭을 가져올 합법수 존재.
 *
 * 사용: node tools/research/bidsens_probe.js [판수]
 *   env MODELS='v13,v11ctl,v8' · SEED_BASE · PTS_ONLY=1(점수카드 걸린 트릭만)
 *       CLASS=oppwin|weaklead
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const N = parseInt(process.argv[2] || '400', 10);
const MODELS = (process.env.MODELS || 'v13,v11ctl,v8').split(',').map(s => s.trim());
const SEED0 = parseInt(process.env.SEED_BASE || '46000000', 10);
const PTS_ONLY = process.env.PTS_ONLY === '1';
const CLASS = process.env.CLASS || 'oppwin';
const BIDS = [14, 16, 18, 20];
const A_PLAY0 = 149, A_JS0 = 201, A_JOKER = 205;
const PER = ['gambler', 'balanced', 'careful'];

/** 이 수를 내면 현재 테이블 최강을 넘어서는가 */
function winsTrick(g, mv) {
  const pl = g.play;
  const mine = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: pl.turn,
                                 jokerCall: mv.jokerCall }, pl);
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (k[0] > mine[0] || (k[0] === mine[0] && k[1] > mine[1])) return false;
  }
  return true;
}

/** 현재 테이블 최강 항목과 그 서열 */
function tableBest(g) {
  const pl = g.play;
  let best = null, bk = [-2, -1];
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  return { best, bk };
}

/** 현재 테이블 최강이 내 편인가 (프렌드 시점: 주공 또는 공개된 프렌드) */
function allyLeading(g, me) {
  const { best } = tableBest(g);
  if (!best) return false;
  if (best.player === g.declarer) return true;
  return g.friendRevealed && g.friend === best.player && best.player !== me;
}

/** 아군이 최강이지만 확정승이 아닌가 — 내 시점에서 미출현 카드가 그것을 넘길 수 있나 */
function allyBeatable(g, me) {
  const { bk } = tableBest(g);
  const seen = new Set();
  for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of g.play.table) seen.add(E.cardId(e.card));
  for (const c of g.hands[me]) seen.add(E.cardId(c));
  // 리드 무늬를 따를 수 있는 미출현 카드 + 기루다 + 마이티·조커로 넘길 여지
  const led = g.play.ledSuit;
  for (const s of E.SUITS) for (let r = 14; r >= 2; r--) {
    const c = { suit: s, rank: r };
    if (seen.has(E.cardId(c))) continue;
    const k = g._cardStrength({ card: c, player: -1 }, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) return true;
  }
  if (!seen.has(E.JOKER) && led) return true;
  return false;
}

/** 국면의 개입 확률: 트릭을 가져오는 수들의 정책 확률 합 */
async function interveneProb(sess, g, me, bid) {
  const saved = g.contract.count;
  g.contract.count = bid;
  let obs = M.encodeObs(g, me, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  g.contract.count = saved;
  const lg = out.logits.data;
  const legal = g._legalPlays(me);
  const items = legal.map(mv => {
    let i;
    if (E.isJoker(mv.card)) i = mv.jokerSuit ? A_JS0 + ['S', 'D', 'H', 'C'].indexOf(mv.jokerSuit) : A_JOKER;
    else i = A_PLAY0 + M.cidx(mv.card);
    return { i, win: winsTrick(g, mv) };
  }).filter(x => x.i >= 0 && mask[x.i]);
  if (!items.length) return null;
  const mx = Math.max(...items.map(x => lg[x.i]));
  const ex = items.map(x => Math.exp(lg[x.i] - mx));
  const sum = ex.reduce((a, b) => a + b, 0);
  let p = 0;
  items.forEach((x, k) => { if (x.win) p += ex[k] / sum; });
  return p;
}

(async () => {
  const sess = {};
  for (const id of MODELS) {
    sess[id] = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${id}.onnx`));
  }
  // 국면 수집은 첫 모델의 자가대전으로 한다 — 모든 모델이 같은 국면을 본다.
  const gen = MODELS[0];
  const acc = {};                       // model → bid → {sum, n}
  for (const id of MODELS) { acc[id] = {}; for (const b of BIDS) acc[id][b] = { s: 0, n: 0 }; }
  let states = 0, deals = 0;

  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let p = 0; p < E.NUM_PLAYERS; p++) {
      ag.push(await AI.createAgent({ tier: 'master', session: sess[gen], ort, rng,
                                     persona: PER[p % 3] }));
    }
    g.start(i % E.NUM_PLAYERS);
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const me = g.currentPlayer;
      if (g.phase === 'play' && g.play.table.length > 0 && me !== g.declarer) {
        const iAmFriend = g.friendDecl && g.friendDecl.mode === 'card'
          && g.hands[me].some(c => E.sameCard(c, g.friendDecl.card));
        const behind = E.NUM_PLAYERS - 1 - g.play.table.length;
        const inClass = CLASS === 'weaklead'
          ? (allyLeading(g, me) && behind >= 2 && allyBeatable(g, me))
          : !allyLeading(g, me);
        if (iAmFriend && inClass) {
          const legal = g._legalPlays(me);
          const canWin = legal.some(mv => winsTrick(g, mv));
          const pts = g.play.table.filter(e => !E.isJoker(e.card) && e.card.rank >= 10).length;
          if (canWin && legal.length > 1 && (!PTS_ONLY || pts > 0)) {
            states++;
            for (const id of MODELS) {
              for (const b of BIDS) {
                const p = await interveneProb(sess[id], g, me, b);
                if (p !== null) { acc[id][b].s += p; acc[id][b].n++; }
              }
            }
          }
        }
      }
      g.act(await ag[me].act(g, me));
    }
    if (g.phase === 'done') deals++;
  }

  console.log(`클래스 ${CLASS} · 국면 수집 ${deals}딜 · 프렌드 개입 가능 국면 ${states}개` +
              (PTS_ONLY ? ' (점수카드 걸린 트릭만)' : ''));
  console.log('\n모델      공약14   공약16   공약18   공약20   단조?');
  for (const id of MODELS) {
    const v = BIDS.map(b => acc[id][b].n ? acc[id][b].s / acc[id][b].n : NaN);
    const mono = v.every((x, k) => k === 0 || x >= v[k - 1] - 1e-9);
    console.log(`  ${id.padEnd(7)} ` + v.map(x => `${(x * 100).toFixed(1)}%`.padStart(7)).join('  ') +
                `   ${mono ? '예' : '아니오'}`);
  }
  console.log('\n공약이 오를수록 여유가 줄어 프렌드는 더 적극적으로 트릭을 먹어야 한다 —');
  console.log('값이 오른쪽으로 갈수록 커져야 정상이다.');
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
