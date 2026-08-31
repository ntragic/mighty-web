/**
 * 키카드 양방향 regret + topM 회수율 감사.
 *
 * pimc_label.js가 만든 split-sample 라벨을 읽는다. 정책이 키카드를 썼고 교사가
 * 보존했으면 spend regret, 정책이 보존했고 교사가 사용했으면 hold regret이다.
 * gain은 별도 결정화 절반에서 검증된 값이며 상금 단위로 환산한다.
 *
 * top5 recall은 TOPM>5로 새 라벨을 만들었을 때만 계산할 수 있다:
 *   TOPM=12 SPLIT=1 KEY_SAMPLE=1 node tools/research/pimc_label.js /tmp/key-audit.jsonl 200
 *   node tools/research/key_decision_audit.js /tmp/key-audit.jsonl
 * 파일을 생략하면 training/key_labels_*.jsonl을 읽는다(기존 파일은 regret만 계산).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');

function mean(xs){ return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function pct(n,d){ return d ? (100*n/d).toFixed(1)+'%' : '—'; }
function summarize(rows){
  const spend=[], hold=[]; let ranked=0, top5=0;
  for(const r of rows){
    if(r.cls!=='keyspend') continue;
    if(Number.isFinite(r.targetPolicyRank)){
      ranked++; if(r.targetPolicyRank<=5) top5++;
    }
    if(r.policyKey && !r.targetKey) spend.push(r.gainPrize);
    else if(!r.policyKey && r.targetKey) hold.push(r.gainPrize);
  }
  const stat=xs=>({ n:xs.length, mean:mean(xs), large:xs.filter(x=>x>=200).length,
                    largeRate:xs.length?xs.filter(x=>x>=200).length/xs.length:0 });
  return { spend:stat(spend), hold:stat(hold), ranked, top5,
           top5Recall:ranked?top5/ranked:null };
}
function keyAt(g, idx){
  const a=M.actionToEngine(idx,g,[]);
  return !!(a && a.card && (E.isJoker(a.card) || E.sameCard(a.card,g.mightyCard)));
}
function enrich(r){
  const g=new E.MightyGame(r.cfg); g.start(r.dealer);
  for(const a of r.actions) g.act(a);
  return { ...r, policyKey:keyAt(g,r.policyTop), targetKey:keyAt(g,r.target),
           gainPrize:Number(r.gain||0)*M.PRIZE_SCALE };
}
function defaultFiles(){
  const dir=path.join(__dirname,'../../training');
  return fs.readdirSync(dir).filter(f=>/^key_labels_\d+\.jsonl$/.test(f)).sort()
    .map(f=>path.join(dir,f));
}
function readRows(files){
  const rows=[];
  for(const file of files) for(const line of fs.readFileSync(file,'utf8').split('\n')){
    if(!line.trim()) continue;
    try{ rows.push(enrich(JSON.parse(line))); }catch(e){}
  }
  return rows;
}

if(require.main===module){
  const files=process.argv.slice(2); const use=files.length?files:defaultFiles();
  const rows=readRows(use), s=summarize(rows);
  const line=(name,x)=>console.log(`${name}: n=${x.n} · 평균 regret ${x.mean.toFixed(1)} · 대형(≥200) ${x.large}/${x.n} (${pct(x.large,x.n)})`);
  console.log(`키카드 의사결정 감사 · 라벨 ${rows.length}건 · 파일 ${use.length}개`);
  line('spend — 써서 손해',s.spend);
  line('hold  — 안 써서 손해',s.hold);
  console.log(s.ranked
    ? `top5 oracle recall: ${s.top5}/${s.ranked} (${pct(s.top5,s.ranked)})`
    : 'top5 oracle recall: 순위 메타데이터 없음 — TOPM>5로 라벨을 다시 생성해야 함');
}
module.exports={summarize};
