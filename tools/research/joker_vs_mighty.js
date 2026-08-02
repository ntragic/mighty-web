/** "아군 확정승 + 조커 보유 + 마이티 미출현" 국면의 빈도와 그때의 선택을 센다. */
'use strict';
const path=require('path'), P=p=>path.join(__dirname,p);
const ort=require('onnxruntime-node');
const E=require(P('../../src/mighty-engine.js'));
const AI=require(P('../../src/mighty-ai.js'));
const PER=['gambler','balanced','careful'];
const strength=(g,e,pl)=>g._cardStrength(e,pl);
const stronger=(a,b)=>a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1]);
function allyLocked(g,seat){
  const pl=g.play; if(!pl||!pl.table.length) return false;
  const decl=g.declarer, fr=g.friend;
  const team=p=>(p===decl||(fr!==null&&p===fr))?'R':'O';
  if(team(seat)!=='R') return false;
  let best=null,bk=[-2,-1];
  for(const e of pl.table){const k=strength(g,e,pl); if(stronger(k,bk)){bk=k;best=e;}}
  if(!best||team(best.player)!=='R'||best.player===seat) return false;
  const acted=new Set(pl.table.map(e=>e.player)); acted.add(seat);
  for(let p=0;p<5;p++){ if(acted.has(p)) continue;
    for(const m of g._legalPlays(p)){
      const k=strength(g,{player:p,card:m.card,jokerSuit:m.jokerSuit},pl);
      if(stronger(k,bk)) return false; } }
  return true;
}
(async()=>{
  const N=parseInt(process.argv[2]||'3000',10);
  const sess=await ort.InferenceSession.create(P('../../web/model/mighty_master_v4.onnx'));
  let seat=0, chance=0, playedJoker=0, rounds=0;
  for(let i=0;i<N;i++){
    const rng=E.makeRng(900000+i), g=new E.MightyGame({seed:900000+i});
    const ag=[];
    for(let s=0;s<5;s++) ag.push(s===seat
      ? await AI.createAgent({tier:'master',session:sess,ort})
      : await AI.createAgent({tier:'advanced',persona:PER[s%3],rng}));
    g.start(Math.floor(rng()*5));
    let guard=0;
    while(g.phase!=='done'&&g.phase!=='redeal'){
      const p=g.currentPlayer; let hit=false;
      if(g.phase==='play'&&p===seat&&g.hands[p].some(E.isJoker)&&allyLocked(g,p)){
        // 마이티가 내 시점에서 미출현인가 (가드가 위협으로 세던 조건)
        const seen=new Set();
        for(const t of g.play.history) for(const e of t.plays) seen.add(E.cardId(e.card));
        for(const e of g.play.table) seen.add(E.cardId(e.card));
        for(const x of g.hands[p]) seen.add(E.cardId(x));
        const alts=g._legalPlays(p).filter(m=>!E.isJoker(m.card)&&!E.sameCard(m.card,g.mightyCard));
        if(!seen.has(E.cardId(g.mightyCard))&&alts.length){ hit=true; chance++; }
      }
      const act=await ag[p].act(g,p);
      if(hit&&act.type==='play'&&E.isJoker(act.card)) playedJoker++;
      g.act(act);
      if(++guard>900) break;
    }
    if(g.phase==='done'){ rounds++; seat=(seat+1)%5; }
  }
  const pct=(a,b)=>b?(a/b*100).toFixed(1)+'%':'—';
  console.log(`"아군 확정승 + 조커 보유 + 마이티 미출현" 국면 ${chance}회 / ${rounds}판`);
  console.log(`  그중 조커를 낸 비율 ${pct(playedJoker,chance)} [${playedJoker}/${chance}]`);
})();
