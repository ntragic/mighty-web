/** accept-v4의 "NN 주공 딜미스" 항목이 실제로 주공의 딜미스인지 확인한다. */
'use strict';
const path=require('path'), P=p=>path.join(__dirname,p);
const ort=require('onnxruntime-node');
const E=require(P('../../src/mighty-engine.js'));
const AI=require(P('../../src/mighty-ai.js'));
const PER=['gambler','balanced','careful'];
(async()=>{
  const sess=await ort.InferenceSession.create(P('../../web/model/mighty_master_v4.onnx'));
  let seat=0, asDecl=0, asOther=0, total=0;
  for(let i=0;i<900;i++){
    const rng=E.makeRng(1000+i), g=new E.MightyGame({seed:1000+i});
    const ag=[];
    for(let s=0;s<5;s++) ag.push(s===seat
      ? await AI.createAgent({tier:'master',session:sess,ort})
      : await AI.createAgent({tier:'advanced',persona:PER[s%3],rng}));
    g.start(Math.floor(rng()*5));
    let guard=0;
    while(g.phase!=='done'&&g.phase!=='redeal'){
      const p=g.currentPlayer;
      g.act(await ag[p].act(g,p));
      if(++guard>900) break;
    }
    if(g.phase==='redeal'&&g.redealReason&&g.redealReason.type==='dealMiss'&&g.redealReason.player===seat){
      total++;
      if(g.declarer===seat) asDecl++; else asOther++;
    }
    if(g.phase==='done'||g.phase==='redeal') seat=(seat+1)%5;
  }
  console.log(`NN 좌석 딜미스 선언 ${total}회 — 주공일 때 ${asDecl}회 / 주공 아닐 때 ${asOther}회`);
  console.log(`엔진 설정 declarerCanDealMiss = ${new E.MightyGame({}).config.declarerCanDealMiss}`);
})();
