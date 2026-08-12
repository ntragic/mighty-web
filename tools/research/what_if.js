/**
 * 반사실 재생 — 복기의 한 착수만 바꿔 끝까지 돌리고 결과를 비교한다.
 *
 * 실제 라인은 기록 그대로 재생하고, 대안 라인은 지정한 착수만 교체한 뒤 남은
 * 수를 전좌석 마스터(argmax·가드 포함, 배포와 같은 경로)로 이어 둔다. 남은 패가
 * 강제인 종반에는 결정론이라 그대로 결론이 난다.
 *
 * 사용: node tools/research/what_if.js <복기.md> <착수인덱스> <대안카드>
 *   대안카드 표기: S14 D10 C3 JOKER  (무늬 SDHC + 랭크 2~14)
 *   env MODEL
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v13.onnx');
const NM = ['나', '서준', '하린', '도윤', '유나'];

const parseCard = (s) => {
  if (s.toUpperCase() === 'JOKER') return E.JOKER;
  const suit = s[0].toUpperCase();
  const rank = parseInt(s.slice(1), 10);
  return { suit, rank };
};

(async () => {
  const md = fs.readFileSync(process.argv[2], 'utf8');
  const rec = JSON.parse(md.split('```json')[1].split('```')[0]);
  const IDX = parseInt(process.argv[3], 10);
  const alt = parseCard(process.argv[4]);
  const sess = await ort.InferenceSession.create(MODEL);

  const rebuild = (n) => {
    const g = new E.MightyGame(rec.cfg);
    g.start(rec.dealer);
    for (let i = 0; i < n; i++) g.act(rec.actions[i].a);
    return g;
  };

  const seat = rec.actions[IDX].p;
  const before = rebuild(IDX);
  console.log(`착수 ${IDX} · 트릭 ${before.play.trickNo} · ${NM[seat]} 차례`);
  console.log(`손패: ${before.hands[seat].map(E.cardName).join(' ')}`);
  console.log(`실제: ${E.cardName(rec.actions[IDX].a.card)} → 대안: ${E.cardName(alt)}`);

  // 실제 라인 — 기록 그대로
  const real = rebuild(rec.actions.length);
  // 대안 라인 — 그 착수만 교체 후 마스터로 이어 둔다
  const g = rebuild(IDX);
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));
  g.act({ type: 'play', card: alt });
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 200)
    g.act(await ag[g.currentPlayer].act(g, g.currentPlayer));

  const show = (label, gg) => {
    if (gg.phase !== 'done') { console.log(`${label}: 미완주`); return null; }
    const r = gg.result;
    console.log(`${label} — 여당 ${r.yeodang}점 · ${r.win ? '여당 승' : '야당 승'} · ` +
      `상금 ${r.prize} · 좌석별 ${r.prizes.map((x, i) => `${NM[i]} ${x >= 0 ? '+' : ''}${x}`).join(' · ')}`);
    return r;
  };
  const a = show('실제  ', real);
  const b = show('대안  ', g);
  if (a && b) {
    const d = b.prizes[seat] - a.prizes[seat];
    console.log(`\n${NM[seat]} 좌석 상금 차이 ${d >= 0 ? '+' : ''}${d} · 여당 점수 ${a.yeodang} → ${b.yeodang}`);
    console.log(d === 0 ? '→ 결과 동일 — 손해가 아니었다'
      : d > 0 ? '→ 대안이 나았다' : '→ 실제 수가 나았다');
    console.log('\n대안 라인 트릭:');
    for (const t of g.play.history.slice(before.play.trickNo - 1)) {
      console.log(`  트릭${t.trickNo} ${t.plays.map(e => `${NM[e.player]} ${E.cardName(e.card)}`).join(' / ')}`
        + ` → ${NM[t.winner]} (${t.plays.filter(e => E.isPointCard(e.card)).length}점)`);
    }
  }
})();
