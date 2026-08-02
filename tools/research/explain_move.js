/**
 * 복기 md의 특정 착수를 재현해 그 시점 정책 분포를 본다.
 * 사용: node tools/research/explain_move.js <복기.md> <행동인덱스>
 *   행동인덱스 생략 시 play 페이즈 액션을 순번과 함께 나열한다.
 */
'use strict';
const fs=require('fs'), path=require('path'), P=p=>path.join(__dirname,p);
const E=require(P('../../src/mighty-engine.js'));
const M=require(P('../../src/mighty-master.js'));
const AI=require(P('../../src/mighty-ai.js'));
const ort=require('onnxruntime-node');
const MODEL=process.env.MODEL||P('../../web/model/mighty_master_v4.onnx');
const NM=['나','서준','하린','도윤','유나'];

const md=fs.readFileSync(process.argv[2],'utf8');
const rec=JSON.parse(md.split('```json')[1].split('```')[0]);
const rebuild=n=>{ const g=new E.MightyGame(rec.cfg); g.start(rec.dealer);
  for(let i=0;i<n;i++) g.act(rec.actions[i].a); return g; };

if (process.argv[3]===undefined){
  let tn=1, cnt=0;
  rec.actions.forEach((x,i)=>{ if(x.ph!=='play') return;
    console.log(`${String(i).padStart(3)}  트릭${tn} ${NM[x.p].padEnd(3)} ${x.a.card?E.cardName(x.a.card):x.a.type}`);
    if(++cnt%5===0) tn++; });
  process.exit(0);
}
const IDX=parseInt(process.argv[3],10);
(async()=>{
  const g=rebuild(IDX), seat=rec.actions[IDX].p, pl=g.play;
  console.log(`트릭 ${pl.trickNo} · ${NM[seat]} 차례 · 기루다 ${g.contract.giruda} · 리드무늬 ${pl.ledSuit}`);
  console.log(`프렌드 공개 ${g.friendRevealed}${g.friendRevealed?` (${g.friend===null?'셀프':NM[g.friend]})`:''} · 주공 ${NM[g.declarer]}`);
  console.log(`테이블: ${pl.table.map(e=>`${NM[e.player]} ${E.cardName(e.card)}`).join(' / ')}`);
  console.log(`손패: ${g.hands[seat].map(E.cardName).join(' ')}`);
  // 현재 최강과, 각 합법수가 이길 수 있는지
  let bk=[-2,-1], best=null;
  for(const e of pl.table){ const k=g._cardStrength(e,pl);
    if(k[0]>bk[0]||(k[0]===bk[0]&&k[1]>bk[1])){bk=k;best=e;} }
  if(best) console.log(`현재 최강: ${NM[best.player]} ${E.cardName(best.card)} [${bk}]`);
  const sess=await ort.InferenceSession.create(MODEL);
  let obs=M.encodeObs(g,seat,[]); const mask=M.legalMask(g,[]);
  const want=M.modelObsDim(sess); if(want!==obs.length) obs=obs.subarray(0,want);
  const out=await sess.run({obs:new ort.Tensor('float32',obs,[1,obs.length]),
                            mask:new ort.Tensor('bool',mask,[1,209])});
  const lg=out.logits.data; const idx=[]; for(let i=0;i<209;i++) if(mask[i]) idx.push(i);
  let mx=-Infinity; for(const i of idx) mx=Math.max(mx,lg[i]);
  let z=0; const pr={}; for(const i of idx){const e=Math.exp(lg[i]-mx); pr[i]=e; z+=e;}
  const rows=idx.map(i=>{ const a=M.actionToEngine(i,g,[]);
    let win='';
    if(a&&a.card&&best){ const k=g._cardStrength({player:seat,card:a.card,jokerSuit:a.jokerSuit},pl);
      win=(k[0]>bk[0]||(k[0]===bk[0]&&k[1]>bk[1]))?'이김':'짐'; }
    return {n:a&&a.card?E.cardName(a.card):String(i), p:pr[i]/z, win};
  }).sort((a,b)=>b.p-a.p);
  console.log('\n정책 분포:');
  for(const r of rows) console.log(`  ${r.n.padEnd(6)} ${(r.p*100).toFixed(1).padStart(5)}%  ${r.win}`);
  const ag=await AI.createAgent({tier:'master',session:sess,ort});
  console.log(`\n가드 적용 최종: ${E.cardName((await ag.act(g,seat)).card)}`);
})();
