// v4 성향 프로파일 — 휴리스틱 페르소나와 대비
const __path = require('path');
const __P = p => __path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(__P('../src/mighty-engine.js'));
const AI = require(__P('../src/mighty-ai.js'));
const MY = require(__P('../src/mighty-ai.js'));
const PER = ['gambler','balanced','careful'];

async function profile(makeMe, N, seedBase, label){
  const st = {
    games:0, bidTurns:0, bidMade:0, passes:0, bids:[], giruda:{S:0,D:0,H:0,C:0,N:0},
    declG:0, declW:0, declPts:0, self:0, friendCard:{mighty:0,joker:0,trumpA:0,other:0,first:0,none:0},
    asFriend:0, friendFeed:0, friendFeedOpp:0,
    asOpp:0, oppLeak:0, oppLeakOpp:0, jokerCalls:0, jokerCallOpp:0,
    runs:0, backRuns:0, mightyTrick:[], jokerTrick:[], prize:0, n:0,
  };
  let seat=0;
  for(let i=0;i<N;i++){
    const rng=E.makeRng(seedBase+i);
    const g=new E.MightyGame({seed:seedBase+i});
    const ag=[];
    for(let s=0;s<5;s++) ag.push(s===seat ? await makeMe()
      : await AI.createAgent({tier:'advanced', persona:PER[s%3], rng}));
    g.start(Math.floor(rng()*5));
    if(g.phase==='redeal') continue;
    let guard=0;
    while(g.phase!=='done'){
      if(g.phase==='redeal') break;
      const p=g.currentPlayer;
      const ph=g.phase;
      // 조커콜 기회
      let jcOpp=false;
      if(p===seat && ph==='play' && g.play.table.length===0){
        jcOpp = g._legalPlays(p).some(m=>m.jokerCall);
        if(jcOpp) st.jokerCallOpp++;
      }
      // 아군/적군 트릭 점수 투입 기회
      let feedCtx=null;
      if(p===seat && ph==='play' && g.play.table.length>0){
        const pl=g.play;
        let best=null,bk=[-2,-1];
        for(const e of pl.table){const k=g._cardStrength(e,pl); if(k[0]>bk[0]||(k[0]===bk[0]&&k[1]>bk[1])){bk=k;best=e;}}
        const mine=(p===g.declarer)||(g.friend===p);
        const winnerMine=(best.player===g.declarer)||(best.player===g.friend);
        const legal=g._legalPlays(p);
        const canPoint=legal.some(m=>E.isPointCard(m.card));
        const canNon=legal.some(m=>!E.isPointCard(m.card));
        if(canPoint&&canNon){
          if(mine&&winnerMine&&best.player!==p){ feedCtx='feed'; st.friendFeedOpp++; }
          else if(mine!==winnerMine){ feedCtx='leak'; st.oppLeakOpp++; }
        }
      }
      const act=await ag[p].act(g,p);
      if(p===seat){
        if(ph==='bidding'){
          st.bidTurns++;
          if(act.type==='bid'){ st.bidMade++; st.bids.push(act.count); st.giruda[act.giruda]++; }
          else if(act.type==='pass') st.passes++;
        }
        if(ph==='friend'){
          const m=act.mode;
          if(m==='first') st.friendCard.first++;
          else if(m==='none') st.friendCard.none++;
          else if(E.isJoker(act.card)) st.friendCard.joker++;
          else if(E.sameCard(act.card,g.mightyCard)) st.friendCard.mighty++;
          else if(g.contract.giruda!=='N'&&act.card.rank===14&&act.card.suit===g.contract.giruda) st.friendCard.trumpA++;
          else st.friendCard.other++;
        }
        if(ph==='play'&&act.type==='play'){
          if(jcOpp&&act.jokerCall) st.jokerCalls++;
          if(feedCtx==='feed'&&E.isPointCard(act.card)) st.friendFeed++;
          if(feedCtx==='leak'&&E.isPointCard(act.card)) st.oppLeak++;
          if(E.sameCard(act.card,g.mightyCard)) st.mightyTrick.push(g.play.trickNo);
          if(E.isJoker(act.card)) st.jokerTrick.push(g.play.trickNo);
        }
      }
      g.act(act);
      if(++guard>900) break;
    }
    if(g.phase!=='done'){ continue; }
    st.games++; st.n++;
    st.prize+=g.result.prizes[seat];
    if(g.result.declarer===seat){
      st.declG++; st.declPts+=g.result.yeodangPoints;
      if(g.result.win) st.declW++;
      if(g.result.friend===null) st.self++;
      if(g.result.run) st.runs++;
      if(g.result.backRun) st.backRuns++;
    } else if(g.result.friend===seat) st.asFriend++;
    else st.asOpp++;
    seat=(seat+1)%5;
  }
  const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'-';
  const pct=(a,b)=>b?(a/b*100).toFixed(1)+'%':'-';
  console.log(`\n===== ${label} (${st.n}판) =====`);
  console.log(`판당 상금 ${st.prize/st.n>0?'+':''}${(st.prize/st.n).toFixed(0)}`);
  console.log(`[비딩]   차례 ${st.bidTurns} · 공약 시도 ${pct(st.bidMade,st.bidTurns)} · 평균 공약 ${avg(st.bids)} · 최고 ${st.bids.length?Math.max(...st.bids):'-'}`);
  console.log(`         기루다 분포 ` + Object.entries(st.giruda).map(([k,v])=>`${k}:${pct(v,st.bidMade)}`).join(' '));
  console.log(`[주공]   비율 ${pct(st.declG,st.n)} · 승률 ${pct(st.declW,st.declG)} · 평균 여당점수 ${st.declG?(st.declPts/st.declG).toFixed(1):'-'} · 셀프 ${pct(st.self,st.declG)} · 런 ${pct(st.runs,st.declG)}`);
  console.log(`         프렌드 선택 ` + Object.entries(st.friendCard).map(([k,v])=>`${k}:${v}`).join(' '));
  console.log(`[협력]   아군 트릭에 점수 투입 ${pct(st.friendFeed,st.friendFeedOpp)} (${st.friendFeed}/${st.friendFeedOpp})`);
  console.log(`[수비]   적 트릭에 점수 헌납 ${pct(st.oppLeak,st.oppLeakOpp)} (${st.oppLeak}/${st.oppLeakOpp}) · 조커콜 사용 ${pct(st.jokerCalls,st.jokerCallOpp)}`);
  console.log(`[타이밍] 마이티 평균 트릭 ${avg(st.mightyTrick)} · 조커 평균 트릭 ${avg(st.jokerTrick)}`);
  return st;
}

(async()=>{
  const N=parseInt(process.argv[2]||'700',10);
  const sess=await AI.loadMaster(ort,__P('../web/model/mighty_master_v4.onnx'));
  const sessMy=await MY.loadMaster(ort,__P('../web/model/mighty_master_v4.onnx'));
  await profile(()=>AI.createAgent({tier:'master', session:sess, ort}), N, 103e6, 'v4 마스터 (순수 NN)');
  await profile(()=>MY.createAgent({tier:'master', session:sessMy, ort}), N, 103e6, 'v4 + 비딩 위임(구 임시조치)');
  for (const per of ['gambler','balanced','careful'])
    await profile(()=>AI.createAgent({tier:'advanced', persona:per, rng:Math.random}), N, 103e6, `고급 휴리스틱 · ${per}`);
})();
