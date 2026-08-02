// 모의 리그 — 5인 혼합 테이블에서 티어별 판당 상금 (좌석 로테이션)
const __path = require('path');
const __P = p => __path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(__P('../src/mighty-engine.js'));
const AI = require(__P('../src/mighty-ai.js'));
const PER = ['gambler','balanced','careful'];

(async()=>{
  const N = parseInt(process.argv[2]||'700',10);
  const sess = await AI.loadMaster(ort,__P('../web/model/mighty_master_v4.onnx'));
  // 좌석 구성: 마스터1 · 고급2 · 중급2 (매 판 회전)
  const roles = ['master','advanced','advanced','intermediate','intermediate'];
  const tot = {master:0, advanced:0, intermediate:0};
  const cnt = {master:0, advanced:0, intermediate:0};
  const decl = {master:[0,0], advanced:[0,0], intermediate:[0,0]};
  let off=0, done=0;
  for(let i=0;i<N;i++){
    const rng=E.makeRng(105e6+i);
    const g=new E.MightyGame({seed:105e6+i});
    const seatRole=[];
    const ag=[];
    for(let s=0;s<5;s++){
      const r=roles[(s+off)%5];
      seatRole.push(r);
      ag.push(await AI.createAgent({tier:r, persona:PER[s%3], rng, session:sess, ort}));
    }
    g.start(Math.floor(rng()*5));
    if(g.phase==='redeal') continue;
    let guard=0;
    while(g.phase!=='done'){
      if(g.phase==='redeal') break;
      const p=g.currentPlayer;
      g.act(await ag[p].act(g,p));
      if(++guard>900) break;
    }
    if(g.phase!=='done') continue;
    done++;
    for(let s=0;s<5;s++){
      tot[seatRole[s]]+=g.result.prizes[s];
      cnt[seatRole[s]]++;
      if(g.result.declarer===s){ decl[seatRole[s]][0]++; if(g.result.win) decl[seatRole[s]][1]++; }
    }
    off=(off+1)%5;
  }
  console.log(`\n=== 모의 리그 ${done}판 (마스터1 · 고급2 · 중급2, 좌석 회전) ===`);
  console.log('티어          판당 상금   주공 횟수   주공 승률');
  for(const r of ['master','advanced','intermediate']){
    const label={master:'마스터',advanced:'고급  ',intermediate:'중급  '}[r];
    const dw=decl[r][0]?(decl[r][1]/decl[r][0]*100).toFixed(1)+'%':'-';
    console.log(`${label}        ${(tot[r]/cnt[r]>0?'+':'')}${(tot[r]/cnt[r]).toFixed(0).padStart(6)}   ${String(decl[r][0]).padStart(7)}   ${dw.padStart(7)}`);
  }
  const sum=Object.values(tot).reduce((a,b)=>a+b,0);
  console.log('제로섬 확인:', Math.abs(sum)<1e-6 ? 'OK' : sum);
})();
