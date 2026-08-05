// V(s) 캘리브레이션 — 인간(마스터) 좌석 결정 시점 V vs 최종 상금
'use strict';
const path=require('path'), ort=require('onnxruntime-node');
const E=require(path.join(__dirname,'../../src/mighty-engine.js'));
const AI=require(path.join(__dirname,'../../src/mighty-ai.js'));
const M=require(path.join(__dirname,'../../src/mighty-master.js'));
const MODEL=path.join(__dirname,'../../web/model/mighty_master_v6.onnx');
(async()=>{
  const sess=await ort.InferenceSession.create(MODEL);
  const PER=['gambler','balanced','careful'];
  const rows=[]; let seat=0;
  for(let i=0;i<200;i++){
    const rng=E.makeRng(880000+i), g=new E.MightyGame({seed:880000+i});
    const ag=[];
    for(let s=0;s<5;s++) ag.push(s===seat
      ? await AI.createAgent({tier:'master',session:sess,ort,keyGuard:true})
      : await AI.createAgent({tier:'advanced',persona:PER[s%3],rng}));
    g.start(Math.floor(rng()*5));
    const vs=[]; let guard=0;
    while(g.phase!=='done'&&g.phase!=='redeal'){
      const p=g.currentPlayer;
      if(g.phase==='play'&&p===seat){
        const obs=M.encodeObs(g,p), mask=M.legalMask(g);
        const want=M.modelObsDim(sess);
        const o=obs.length===want?obs:obs.slice(0,want);
        const r=await sess.run({obs:new ort.Tensor('float32',o,[1,want]),
          mask:new ort.Tensor('bool',mask,[1,209])});
        vs.push({t:g.play.trickNo, v:r.value.data[0]});
      }
      g.act(await ag[p].act(g,p));
      if(++guard>900) break;
    }
    if(g.phase==='done') for(const x of vs) rows.push({...x, y:g.result.prizes[seat]/2000});
    if(g.phase==='done') seat=(seat+1)%5;
  }
  const n=rows.length;
  const mx=rows.reduce((a,r)=>a+r.v,0)/n, my=rows.reduce((a,r)=>a+r.y,0)/n;
  let sxy=0,sx=0,sy=0; for(const r of rows){sxy+=(r.v-mx)*(r.y-my); sx+=(r.v-mx)**2; sy+=(r.y-my)**2;}
  console.log(`표본 ${n} | 상관 ${(sxy/Math.sqrt(sx*sy)).toFixed(3)}`);
  for(const lo of [1,4,7,10]){
    const g2=rows.filter(r=>r.t>=lo&&r.t<lo+3); if(!g2.length) continue;
    let s2=0,c=0; for(const r of g2){s2+=Math.abs(r.v-r.y); c+=((r.v>0)===(r.y>0))?1:0;}
    console.log(`트릭 ${lo}-${lo+2}  MAE ${(s2/g2.length).toFixed(3)}  승패방향일치 ${(100*c/g2.length).toFixed(0)}% (n=${g2.length})`);
  }
})();
