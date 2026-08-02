'use strict';
const fs = require('fs');
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const AI = require('../../src/mighty-ai.js');
const ort = require('onnxruntime-node');
const MODEL = '/home/sparkadmin/workplace_ydkwon/Mighty_game/web/model/mighty_master_v4.onnx';

const md = fs.readFileSync('/home/sparkadmin/.claude/uploads/f78d8f05-9137-4349-8bff-144ed47bd179/92772397-mightyround9seed314689481.md','utf8');
const rec = JSON.parse(md.split('```json')[1].split('```')[0]);

function rebuild(upto){
  const g = new E.MightyGame(rec.cfg);
  g.start(rec.dealer);
  for (let i=0;i<upto;i++) g.act(rec.actions[i].a);
  return g;
}
const IDX = rec.actions.findIndex((x,i)=> x.ph==='play' && x.p===3);   // 도윤의 첫 플레이
const g = rebuild(IDX);
const nm = ['나','서준','하린','도윤','유나'];
console.log(`페이즈 ${g.phase} · 차례 ${nm[g.currentPlayer]} · 트릭 ${g.play.trickNo}`);
console.log('기루다', g.contract.giruda, '· 마이티', E.cardName(g.mightyCard),
            '· 프렌드카드', E.cardName(g.friendDecl.card), '· 공개됨', g.friendRevealed);
console.log('테이블:', g.play.table.map(e=>`${nm[e.player]} ${E.cardName(e.card)}`).join(' / '));
console.log('도윤 손패:', g.hands[3].map(E.cardName).join(' '));

const legal = g._legalPlays(3);
console.log('합법수:', legal.map(m=>E.cardName(m.card)).join(' '));

// NN 확률 분포
(async () => {
  const sess = await ort.InferenceSession.create(MODEL);
  let obs = M.encodeObs(g, 3, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess); if (want !== obs.length) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, obs.length]),
    mask: new ort.Tensor('bool', mask, [1, 209]),
  });
  const lg = out.logits.data;
  const idx = []; for (let i=0;i<209;i++) if (mask[i]) idx.push(i);
  let mx=-Infinity; for(const i of idx) mx=Math.max(mx,lg[i]);
  let z=0; const p={}; for(const i of idx){ const e=Math.exp(lg[i]-mx); p[i]=e; z+=e; }
  const rows = idx.map(i=>{
    const act = M.actionToEngine(i, g, []);
    return { name: act && act.card ? E.cardName(act.card) : String(i), pr: p[i]/z };
  }).sort((a,b)=>b.pr-a.pr);
  console.log('\nNN 선택 확률:');
  for (const r of rows) console.log(`  ${r.name.padEnd(6)} ${(r.pr*100).toFixed(1)}%`);

  // 가드가 개입하는지
  const agent = await AI.createAgent({ tier:'master', session: sess, ort });
  const chosen = await agent.act(g, 3);
  console.log('\n가드 적용 후 실제 착수:', E.cardName(chosen.card));
  const raw = M.actionToEngine(await M.chooseAction(sess, ort, g, 3, []), g, []);
  console.log('가드 없는 원 선택   :', E.cardName(raw.card));
})();

// ---- 가드 내부 계산 재현 (src/mighty-ai.js keyCardGuard와 동일 로직)
setTimeout(()=>{
  const pl = g.play, seat = 3;
  let best=null, bk=[-2,-1];
  for (const e of pl.table){ const k=g._cardStrength(e,pl);
    if (k[0]>bk[0]||(k[0]===bk[0]&&k[1]>bk[1])){ bk=k; best=e; } }
  console.log(`\n[가드 재현] 현재 최강: ${nm[best.player]} ${E.cardName(best.card)} 강도=[${bk}]`);
  const seen=new Set();
  for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of pl.table) seen.add(E.cardId(e.card));
  for (const x of g.hands[seat]) seen.add(E.cardId(x));
  const gi=g.contract.giruda; let beaters=0; const why=[];
  if (bk[0]<4 && !seen.has(E.cardId(g.mightyCard))){ beaters++; why.push('마이티'); }
  if (bk[0]<3 && !seen.has(E.JOKER) && !pl.jokerCallActive){ beaters++; why.push('조커'); }
  if (gi!=='N'){ let n=0;
    for (let r=2;r<=14;r++){ if (seen.has(gi+r)) continue;
      if (bk[0]===2 ? r>bk[1] : bk[0]<=1){ beaters++; n++; } }
    if (n) why.push(`미출현 기루다 ${n}장`); }
  if (bk[0]===1 && pl.ledSuit){ let n=0;
    for (let r=bk[1]+1;r<=14;r++) if (!seen.has(pl.ledSuit+r)){ beaters++; n++; }
    if (n) why.push(`리드무늬 상위 ${n}장`); }
  console.log(`[가드 재현] 잠재적 역전 카드 ${beaters}개 → ${why.join(', ')||'없음'}`);
  console.log(`[가드 재현] beaters>0 이므로 "확정승 아님"으로 보고 교체하지 않음`);
  // 실제로 남은 플레이어가 기루다를 낼 수 있었나
  const acted = new Set(pl.table.map(e=>e.player)); acted.add(seat);
  const rest = [0,1,2,3,4].filter(p=>!acted.has(p));
  console.log(`[사실 확인] 아직 안 낸 사람: ${rest.map(p=>nm[p]).join(',')} · ` +
    rest.map(p=>`${nm[p]} 리드무늬(${pl.ledSuit}) 보유 ${g.hands[p].some(c=>!E.isJoker(c)&&c.suit===pl.ledSuit)?'예→기루다 불가':'아니오'}`).join(' / '));
  console.log(`[사실 확인] 1트릭 조커 약화 설정: firstTrickJokerWeak=${g.config.firstTrickJokerWeak}`);
}, 1500);
