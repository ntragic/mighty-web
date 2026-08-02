// 3티어 상호 벤치마크 (좌석 로테이션, 페어드 시드)
const __path = require('path');
const __P = p => __path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(__P('../src/mighty-engine.js'));
const AI = require(__P('../src/mighty-ai.js'));

async function duel(mkA, mkB, N, seedBase, label){
  let sum=0, n=0, seat=0, declG=0, declW=0;
  const t0=Date.now();
  for (let i=0;i<N;i++){
    const rng=E.makeRng(seedBase+i);
    const g=new E.MightyGame({seed:seedBase+i});
    const agents=[];
    for(let s=0;s<5;s++) agents.push(s===seat ? await mkA(rng) : await mkB(rng, s));
    g.start(Math.floor(rng()*5));
    if (g.phase==='redeal') continue;
    let guard=0;
    while (g.phase!=='done'){
      if (g.phase==='redeal') break;
      const p=g.currentPlayer;
      g.act(await agents[p].act(g, p));
      if (++guard>900) break;
    }
    if (g.phase!=='done') continue;
    sum+=g.result.prizes[seat]; n++;
    if (g.result.declarer===seat){ declG++; if(g.result.win) declW++; }
    seat=(seat+1)%5;
  }
  console.log(`[${label}] ${n}판 · 판당 ${sum/n>0?'+':''}${(sum/n).toFixed(0)} · 주공 ${declG}판 승률 ${declG?(declW/declG*100).toFixed(1):'-'}% · ${((Date.now()-t0)/1000).toFixed(0)}s`);
  return sum/n;
}

(async()=>{
  const N=parseInt(process.argv[2]||'400',10);
  const sess=await AI.loadMaster(ort, __P('../web/model/mighty_master_v4.onnx'));
  const PER=['gambler','balanced','careful'];
  const mkH=(tier)=>async(rng,s=1)=>AI.createAgent({tier, persona:PER[s%3], rng});
  const mkM=async()=>AI.createAgent({tier:'master', session:sess, ort});

  await duel(mkH('advanced'), mkH('intermediate'), N, 61e6, '고급 vs 중급×4');
  await duel(mkM, mkH('intermediate'), N, 62e6, '마스터 vs 중급×4');
  await duel(mkM, mkH('advanced'), N, 63e6, '마스터 vs 고급×4');
})();
