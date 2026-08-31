'use strict';
const assert=require('assert');
const {summarize}=require('../tools/research/key_decision_audit.js');
const rows=[
  {cls:'keyspend',policyKey:true,targetKey:false,gainPrize:240,targetPolicyRank:6},
  {cls:'keyspend',policyKey:true,targetKey:false,gainPrize:80,targetPolicyRank:2},
  {cls:'keyspend',policyKey:false,targetKey:true,gainPrize:320,targetPolicyRank:4},
  {cls:'weaklead',policyKey:true,targetKey:false,gainPrize:999,targetPolicyRank:9},
];
const s=summarize(rows);
assert.deepStrictEqual(s.spend,{n:2,mean:160,large:1,largeRate:.5});
assert.deepStrictEqual(s.hold,{n:1,mean:320,large:1,largeRate:1});
assert.strictEqual(s.ranked,3);
assert.strictEqual(s.top5,2);
assert.ok(Math.abs(s.top5Recall-2/3)<1e-12);
console.log('key decision audit: 7 passed, 0 failed');
