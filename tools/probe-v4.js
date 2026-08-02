const __path = require('path');
const __P = p => __path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(__P('../src/mighty-engine.js'));
const AI = require(__P('../src/mighty-ai.js'));
const PER = ['gambler','balanced','careful'];

function certainAllyWin(g, p){
  const pl = g.play;
  if (!pl || pl.table.length === 0) return false;
  let best=null, bk=[-2,-1];
  for (const e of pl.table){ const k=g._cardStrength(e,pl); if(k[0]>bk[0]||(k[0]===bk[0]&&k[1]>bk[1])){bk=k;best=e;} }
  const mine = (p===g.declarer) || (g.friend===p);
  if (!mine) return false;
  if (!(best.player===g.declarer || best.player===g.friend) || best.player===p) return false;
  const seen=new Set();
  for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of pl.table) seen.add(E.cardId(e.card));
  for (const x of g.hands[p]) seen.add(E.cardId(x));
  if (p===g.declarer && g.discard) for (const x of g.discard) seen.add(E.cardId(x));
  const gi=g.contract.giruda; let b=0;
  if (bk[0]<4 && !seen.has(E.cardId(g.mightyCard))) b++;
  if (bk[0]<3 && !seen.has(E.JOKER) && !pl.jokerCallActive) b++;
  if (gi!=='N') for(let r=2;r<=14;r++){ if(seen.has(gi+r)) continue; if(bk[0]===2 ? r>bk[1] : bk[0]<=1) b++; }
  if (bk[0]===1 && pl.ledSuit) for(let r=bk[1]+1;r<=14;r++) if(!seen.has(pl.ledSuit+r)) b++;
  return b===0;
}

(async()=>{
  const N=parseInt(process.argv[2]||'900',10);
  const sess=await AI.loadMaster(ort,__P('../web/model/mighty_master_v4.onnx'));
  let declMisdeal=0, nonDeclMisdeal=0;
  let mWaste=0, mOpp=0, jWaste=0, jOpp=0, jWeakDump=0;
  let seat=0;
  for(let i=0;i<N;i++){
    const rng=E.makeRng(101e6+i);
    const g=new E.MightyGame({seed:101e6+i});
    const ag=[];
    for(let s=0;s<5;s++) ag.push(s===seat
      ? await AI.createAgent({tier:'master', session:sess, ort})
      : await AI.createAgent({tier:'advanced', persona:PER[s%3], rng}));
    g.start(Math.floor(rng()*5));
    if(g.phase==='redeal') continue;
    let guard=0;
    while(g.phase!=='done'){
      if(g.phase==='redeal'){
        const r=g.redealReason;
        if(r && r.type==='dealMiss' && r.player===seat){ if(g.declarer===seat) declMisdeal++; else nonDeclMisdeal++; }
        break;
      }
      const p=g.currentPlayer;
      let track=null;
      if(p===seat && g.phase==='play' && certainAllyWin(g,p)){
        const alts=g._legalPlays(p).filter(m=>!E.sameCard(m.card,g.mightyCard) && !E.isJoker(m.card));
        if(alts.length){
          const jokerWeak=(g.config.firstTrickJokerWeak && g.play.trickNo===1) ||
                          (g.config.lastTrickJokerWeak && g.play.trickNo===10) || g.play.jokerCallActive;
          track={ hasM:g.hands[p].some(c=>E.sameCard(c,g.mightyCard)),
                  hasJ:g.hands[p].some(E.isJoker), jokerWeak };
          if(track.hasM) mOpp++;
          if(track.hasJ && !track.jokerWeak) jOpp++;
        }
      }
      const act=await ag[p].act(g,p);
      if(track && act.type==='play'){
        if(E.sameCard(act.card,g.mightyCard)) mWaste++;
        else if(E.isJoker(act.card)){ if(track.jokerWeak) jWeakDump++; else jWaste++; }
      }
      g.act(act);
      if(++guard>900) break;
    }
    seat=(seat+1)%5;
  }
  console.log('딜미스 — 주공일 때', declMisdeal, '(0이어야 정상) / 비주공일 때', nonDeclMisdeal, '(합법 플레이)');
  console.log('마이티 낭비   :', mWaste+'/'+mOpp, mOpp?('('+(mWaste/mOpp*100).toFixed(1)+'%)'):'');
  console.log('강한 조커 낭비:', jWaste+'/'+jOpp, jOpp?('('+(jWaste/jOpp*100).toFixed(1)+'%)'):'');
  console.log('약한 조커 안전투기(정상):', jWeakDump);
})();
