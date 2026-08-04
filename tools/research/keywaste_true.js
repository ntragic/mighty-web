/**
 * 키카드 낭비 실측 (전지적 판정).
 * 기존 수용 기준은 "확정승"을 은닉 정보 기준 휴리스틱으로 판정해 가드와 같은 사각을 공유한다.
 * 여기서는 모든 손패를 보고 "남은 사람 중 누구도 아군의 현재 최강 카드를 넘길 수 없다"를
 * 정확히 계산해 기회를 세고, 그 트릭에 마이티·조커를 낸 경우를 낭비로 센다.
 *
 * 사용: node tools/research/keywaste_true.js [판수] [상대티어]
 *   env KEY_GUARD=off 로 가드 해제 비교
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v4.onnx');
const PER = ['gambler','balanced','careful'];
const GUARD = process.env.KEY_GUARD !== 'off';

const strength = (g, e, pl) => g._cardStrength(e, pl);
const stronger = (a,b) => a[0]>b[0] || (a[0]===b[0] && a[1]>b[1]);

/** 지금 트릭에서 아군이 최강이고, 남은 사람 누구도 그것을 넘길 수 '없는'가 (전지적) */
function lockedTrick(g, seat){
  const pl = g.play;
  if (!pl || pl.table.length === 0) return null;
  const decl = g.declarer, fr = g.friend;
  if (decl == null) return null;
  const team = p => (p===decl || (fr!==null && p===fr)) ? 'R' : 'O';
  // 팀 확정은 전지적으로 안다 (측정 전용)
  let best=null, bk=[-2,-1];
  for (const e of pl.table){ const k=strength(g,e,pl); if (stronger(k,bk)){ bk=k; best=e; } }
  if (!best || best.player===seat) return null;
  // 나 이후에 낼 사람들이 실제로 넘길 수 있는가
  const acted = new Set(pl.table.map(e=>e.player)); acted.add(seat);
  for (let p=0;p<E.NUM_PLAYERS;p++){
    if (acted.has(p)) continue;
    for (const m of g._legalPlays(p)){
      const k = strength(g, {player:p, card:m.card, jokerSuit:m.jokerSuit, jokerCall:m.jokerCall}, pl);
      if (stronger(k, bk)) return null;                  // 넘길 수 있다 → 확정 아님
    }
  }
  return { allyWins: team(best.player) === team(seat) };
}

(async () => {
  const N = parseInt(process.argv[2]||'600',10);
  const oppTier = process.argv[3]||'advanced';
  const sess = await ort.InferenceSession.create(MODEL);
  let opp=0, waste=0, oppB=0, wasteB=0, rounds=0, seat=0, prize=0, n=0;
  const t0=Date.now();
  for (let i=0;i<N;i++){
    const SB=parseInt(process.env.SEED_BASE||'900000',10);
    const rng=E.makeRng(SB+i);
    const g=new E.MightyGame({seed:SB+i});
    const ag=[];
    for (let s=0;s<E.NUM_PLAYERS;s++) ag.push(s===seat
      ? await AI.createAgent({tier:'master', session:sess, ort, keyGuard:GUARD})
      : await AI.createAgent({tier:oppTier, persona:PER[s%3], rng}));
    g.start(Math.floor(rng()*E.NUM_PLAYERS));
    let guard=0;
    while (g.phase!=='done' && g.phase!=='redeal'){
      const p=g.currentPlayer;
      let chance=false, chanceB=false, wf=null;
      const gi0 = g.contract ? g.contract.giruda : 'N';
      const isKey = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
      let lock=null;
      if (g.phase==='play' && p===seat) lock = lockedTrick(g,p);
      if (lock){
        const legal = g._legalPlays(p);
        if (g.hands[p].some(isKey) && legal.some(m=>!isKey(m.card))){ chance=true; opp++; }
        // 넓은 정의: 승부가 끝난 트릭에 기루다·키카드를 태우면 낭비.
        // 점수카드는 아군이 이기면 우리 점수라 낭비가 아니고, 야당이 이길 때만 헌납이다.
        const wasteful = c => isKey(c) || (gi0!=='N' && !E.isJoker(c) && c.suit===gi0)
                              || (!lock.allyWins && E.isPointCard(c));
        if (legal.some(m=>wasteful(m.card)) && legal.some(m=>!wasteful(m.card))){
          chanceB=true; oppB++; wf=wasteful;
        }
      }
      const act=await ag[p].act(g,p);
      if (act.type==='play'){
        if (chance && isKey(act.card)) waste++;
        if (chanceB && wf(act.card)) wasteB++;
      }
      g.act(act);
      if (++guard>900) break;
    }
    if (g.phase!=='done') continue;
    rounds++; prize+=g.result.prizes[seat]; n++;
    seat=(seat+1)%E.NUM_PLAYERS;
  }
  console.log(`키카드 낭비 실측 (전지적) — 가드 ${GUARD?'ON':'OFF'} · ${rounds}판 · ${((Date.now()-t0)/1000).toFixed(0)}s`);
  const pc=(a,b)=>b?(a/b*100).toFixed(2)+'%':'—';
  const seP=(a,b)=>{ if(!b) return '—'; const q=a/b; return (Math.sqrt(q*(1-q)/b)*100).toFixed(2); };
  console.log(`  마이티·조커      ${pc(waste,opp)} ± ${seP(waste,opp)}  [${waste}/${opp}]`);
  console.log(`  +기루다(야당승 시 점수) ${pc(wasteB,oppB)} ± ${seP(wasteB,oppB)}  [${wasteB}/${oppB}]`);
  console.log(`  판당 상금 ${prize/n>=0?'+':''}${(prize/n).toFixed(0)}`);
})();
