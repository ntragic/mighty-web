/**
 * 키카드 소비율 비교 — 같은 국면에서 여러 모델의 1순위 수가 키카드인 비율.
 *
 * 교사(PIMC) 값이 기준이다. v13 실측: T1 마이티 팔로우에서 교사 9.5% · 정책 19.4%.
 * 라벨 파일의 국면을 그대로 재생해 모델만 갈아끼우므로 국면 집합이 동일하다(페어드).
 *
 * 사용: node tools/research/key_spend_rate.js <모델id...>
 *   예: node tools/research/key_spend_rate.js v13 v16a v16b
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const M = require(P('../../src/mighty-master.js'));
const fs = require('fs');
const A_PLAY0 = 149, A_JS0 = 201, A_JOKER = 205;

const IDS = process.argv.slice(2);
if (!IDS.length) { console.error('모델 id를 하나 이상 달라'); process.exit(1); }

const idxOf = mv => E.isJoker(mv.card)
  ? (mv.jokerSuit ? A_JS0 + ['S', 'D', 'H', 'C'].indexOf(mv.jokerSuit) : A_JOKER)
  : A_PLAY0 + M.cidx(mv.card);

async function topMove(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== obs.length) obs = obs.subarray(0, want);   // 구모델은 앞부분만 읽는다
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  const lg = out.logits.data;
  let best = -1, bv = -Infinity;
  for (let i = 0; i < M.ACTION_DIM; i++) if (mask[i] && lg[i] > bv) { bv = lg[i]; best = i; }
  return best;
}

(async () => {
  const T = P('../../training');
  const files = fs.readdirSync(T).filter(f => /^key_labels_\d+\.jsonl$/.test(f)).sort();
  const rows = [];
  for (const f of files)
    for (const line of fs.readFileSync(path.join(T, f), 'utf8').trim().split('\n'))
      rows.push(JSON.parse(line));
  console.log(`라벨 ${rows.length}건 · 파일 ${files.length}개`);

  const sess = {};
  for (const id of IDS)
    sess[id] = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${id}.onnx`));

  // 버킷: "T1 마이티 팔로우" 등. 교사값도 같이 센다.
  const B = {};
  const bump = (k, who) => { B[k] = B[k] || { n: 0, teacher: 0 };
    B[k][who] = (B[k][who] || 0) + 1; };

  for (const r of rows) {
    let g;
    try {
      g = new E.MightyGame(r.cfg);
      g.start(r.dealer);
      for (const a of r.actions) g.act(a);
      if (g.phase !== 'play' || g.play.turn !== r.seat) continue;
    } catch (e) { continue; }
    const tk = g.play.trickNo;
    if (tk > 2) continue;                       // 결함이 몰린 구간만 본다
    const lead = g.play.table.length === 0 ? '리드' : '팔로우';
    const legal = g._legalPlays(r.seat);
    const kind = mv => E.isJoker(mv.card) ? '조커'
                     : E.sameCard(mv.card, g.mightyCard) ? '마이티' : null;
    const m = new Map(legal.map(mv => [idxOf(mv), kind(mv)]));
    for (const k of ['마이티', '조커']) {
      if (![...m.values()].includes(k)) continue;
      const key = `T${tk} ${k} ${lead}`;
      B[key] = B[key] || { n: 0, teacher: 0 };
      B[key].n++;
      if (m.get(r.target) === k) B[key].teacher++;
      for (const id of IDS) {
        const a = await topMove(sess[id], g, r.seat);
        if (m.get(a) === k) B[key][id] = (B[key][id] || 0) + 1;
      }
    }
  }

  const hdr = ['국면유형'.padEnd(18), 'n'.padStart(5), '교사'.padStart(7)]
    .concat(IDS.map(i => i.padStart(7)));
  console.log('\n' + hdr.join(' '));
  for (const k of Object.keys(B).sort()) {
    const b = B[k];
    if (b.n < 30) continue;
    const cells = [k.padEnd(18), String(b.n).padStart(5),
      `${(100 * b.teacher / b.n).toFixed(1)}%`.padStart(7)];
    for (const id of IDS) cells.push(`${(100 * (b[id] || 0) / b.n).toFixed(1)}%`.padStart(7));
    console.log(cells.join(' '));
  }
  console.log('\n교사에 가까울수록 좋다. v13 기준 결함은 T1 마이티 팔로우(교사 9.5% vs 정책 19.4%).');
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
