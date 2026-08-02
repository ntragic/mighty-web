/** 특정 국면에서 키카드 가드의 위협 계산을 그대로 재현해 출력한다. */
'use strict';
const fs=require('fs'), path=require('path'), P=p=>path.join(__dirname,p);
const E=require(P('../../src/mighty-engine.js'));
const NM=['나','서준','하린','도윤','유나'];
const rec=JSON.parse(fs.readFileSync(process.argv[2],'utf8').split('```json')[1].split('```')[0]);
const IDX=parseInt(process.argv[3],10);
const g=new E.MightyGame(rec.cfg); g.start(rec.dealer);
for(let i=0;i<IDX;i++) g.act(rec.actions[i].a);
const seat=rec.actions[IDX].p, pl=g.play, cfg=g.config;
let bk=[-2,-1],best=null;
for(const e of pl.table){const k=g._cardStrength(e,pl); if(k[0]>bk[0]||(k[0]===bk[0]&&k[1]>bk[1])){bk=k;best=e;}}
const seen=new Set();
for(const t of pl.history) for(const e of t.plays) seen.add(E.cardId(e.card));
for(const e of pl.table) seen.add(E.cardId(e.card));
for(const x of g.hands[seat]) seen.add(E.cardId(x));
const gi=g.contract.giruda;
const acted=new Set(pl.table.map(e=>e.player)); acted.add(seat);
let remaining=0; for(let p=0;p<5;p++) if(!acted.has(p)) remaining++;
const lastTrick=pl.trickNo>=10;
const jokerCanWin=!pl.jokerCallActive && !(pl.trickNo===1&&cfg.firstTrickJokerWeak!==false)
                  && !(lastTrick&&cfg.lastTrickJokerWeak!==false);
let ruffPossible=remaining>0;
if(ruffPossible&&pl.ledSuit&&gi!=='N'&&pl.ledSuit!==gi){
  let u=0; for(let r=2;r<=14;r++) if(!seen.has(pl.ledSuit+r)) u++;
  if(u>=remaining) ruffPossible=false;
}
const why=[]; let beaters=0;
if(remaining>0){
  if(bk[0]<4&&!seen.has(E.cardId(g.mightyCard))){beaters++; why.push(`마이티(${E.cardName(g.mightyCard)}) 미출현`);}
  if(bk[0]<3&&jokerCanWin&&!seen.has(E.JOKER)){beaters++; why.push('조커 미출현');}
  if(gi!=='N'&&ruffPossible){let n=0;
    for(let r=2;r<=14;r++){ if(seen.has(gi+r)) continue; if(bk[0]===2?r>bk[1]:bk[0]<=1){beaters++;n++;} }
    if(n) why.push(`기루다 ${n}장`);}
  if(bk[0]===1&&pl.ledSuit){let n=0;
    for(let r=bk[1]+1;r<=14;r++) if(!seen.has(pl.ledSuit+r)){beaters++;n++;}
    if(n) why.push(`리드무늬 상위 ${n}장`);}
}
console.log(`아군 최강: ${NM[best.player]} ${E.cardName(best.card)} [${bk}] · 남은인원 ${remaining}`);
console.log(`기루다 자르기 가능 판정: ${ruffPossible} · 이번 트릭 조커 유효: ${jokerCanWin}`);
console.log(`위협 ${beaters}개 → ${why.join(', ')||'없음'}`);
console.log(`→ ${beaters>0?'"확정승 아님"으로 보고 교체하지 않음':'교체 대상'}`);
