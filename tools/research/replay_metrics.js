/* E4 — 실플레이 리플레이(export MD)에서 경험 지표를 계산한다.
 *
 * 게임 내 "내보내기"가 만든 MD의 재현용 원본 JSON을 파싱해 라운드를 재구성하고,
 * 시뮬레이션 지표(E1 스위트)와 같은 정의로 잰다. 좌석 그룹 분리:
 *   AI(1~4) — 마스터 정책의 실플레이 행동 (릴리스 전후 비교 대상)
 *   인간(0) — 참고용 (같은 정의로 잰 플레이어 자신의 지표)
 *
 * 지표: 보태기·헌납(공개 전/후), 기루다 응답(sigW 조건), 키카드 낭비(narrow/broad).
 * 판정은 전지적(로컬 리플레이라 전 손패 재구성 가능) — 채점 전용, E1과 동일 정의.
 *
 * 사용: node tools/research/replay_metrics.js file1.md file2.md ...
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const E = require(P('../../src/mighty-engine.js'));

const strength = (g, e, pl) => g._cardStrength(e, pl);
const stronger = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

function lockedTrick(g, seat) {
  const pl = g.play;
  if (!pl || pl.table.length === 0) return null;
  const decl = g.declarer, fr = g.friend;
  if (decl == null) return null;
  const team = p => (p === decl || (fr !== null && p === fr)) ? 'R' : 'O';
  let best = null, bk = [-2, -1];
  for (const e of pl.table) { const k = strength(g, e, pl); if (stronger(k, bk)) { bk = k; best = e; } }
  if (!best || best.player === seat) return null;
  const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
  for (let p = 0; p < E.NUM_PLAYERS; p++) {
    if (acted.has(p)) continue;
    for (const m of g._legalPlays(p)) {
      const k = strength(g, { player: p, card: m.card, jokerSuit: m.jokerSuit, jokerCall: m.jokerCall }, pl);
      if (stronger(k, bk)) return null;
    }
  }
  return { allyWins: team(best.player) === team(seat), best, bk };
}

function isTopOfSuit(g, seat, card) {
  if (E.isJoker(card)) return true;
  for (let p = 0; p < E.NUM_PLAYERS; p++)
    for (const x of g.hands[p]) {
      if (p === seat && E.sameCard(x, card)) continue;
      if (E.isJoker(x) || x.suit !== card.suit) continue;
      if (x.rank > card.rank) return false;
    }
  return true;
}

function newAgg() {
  const z = () => ({ o: 0, y: 0 });   // 기회/실행
  return { addPre: z(), addPost: z(), feedPre: z(), feedPost: z(), sig: z(),
           kwN: z(), kwB: z(), decisions: 0 };
}

/** 한 리플레이를 재구성하며 좌석 그룹별 지표 누적 */
function measure(rec, aggAI, aggHU) {
  const g = new E.MightyGame(rec.cfg);
  g.start(rec.dealer);
  for (const step of rec.actions) {
    const p = g.currentPlayer;
    if (step.p !== undefined && step.p !== p)
      throw new Error(`desync: 기록 좌석 ${step.p} ≠ 엔진 ${p}`);
    const agg = p === 0 ? aggHU : aggAI;
    if (g.phase === 'play' && step.a && step.a.type === 'play') {
      agg.decisions++;
      const gi = g.contract ? g.contract.giruda : 'N';
      const isKey = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
      const legal = g._legalPlays(p);
      const c = step.a.card;
      const playedPt = E.isPointCard(c) && !isKey(c);
      const lock = lockedTrick(g, p);

      // sigW: 프렌드가, 주공이 기루다 리드로 현재 이기고 있을 때 점수 응답
      if (g.friendRevealed && g.friend === p && gi !== 'N' && g.play.table.length) {
        const lead = g.play.table[0];
        let bk = [-2, -1], bp = -1;
        for (const e of g.play.table) { const k = strength(g, e, g.play); if (stronger(k, bk)) { bk = k; bp = e.player; } }
        if (lead.player === g.declarer && !E.isJoker(lead.card) && lead.card.suit === gi
            && bp === g.declarer) {
          const pts = legal.some(m => E.isPointCard(m.card) && !isKey(m.card));
          const non = legal.some(m => !E.isPointCard(m.card) && !isKey(m.card));
          if (pts && non) { agg.sig.o++; if (playedPt) agg.sig.y++; }
        }
      }

      if (lock) {
        const rev = g.friendRevealed;
        // 보태기/헌납
        const pts = legal.filter(m => E.isPointCard(m.card) && !isKey(m.card));
        const non = legal.filter(m => !E.isPointCard(m.card) && !isKey(m.card));
        if (lock.allyWins) {
          const safe = pts.filter(m => !isTopOfSuit(g, p, m.card));
          if (safe.length && non.length) {
            const k = rev ? agg.addPost : agg.addPre;
            k.o++; if (playedPt) k.y++;
          }
        } else if (pts.length && non.length) {
          const k = rev ? agg.feedPost : agg.feedPre;
          k.o++; if (playedPt) k.y++;
        }
        // 키카드 낭비 (keywaste_true 정의)
        if (g.hands[p].some(isKey) && legal.some(m => !isKey(m.card))) {
          agg.kwN.o++; if (isKey(c)) agg.kwN.y++;
        }
        const wf = x => isKey(x) || (gi !== 'N' && !E.isJoker(x) && x.suit === gi)
                        || (!lock.allyWins && E.isPointCard(x));
        if (legal.some(m => wf(m.card)) && legal.some(m => !wf(m.card))) {
          agg.kwB.o++; if (wf(c)) agg.kwB.y++;
        }
      }
    }
    g.act(step.a);
  }
  return g;
}

function fmt(z) { return z.o ? `${z.y}/${z.o} (${(100 * z.y / z.o).toFixed(0)}%)` : '0/0'; }
function report(label, a) {
  console.log(`\n[${label}] 플레이 결정 ${a.decisions}`);
  console.log(`  보태기      공개 전 ${fmt(a.addPre)} · 공개 후 ${fmt(a.addPost)}   [높을수록 관례적]`);
  console.log(`  헌납        공개 전 ${fmt(a.feedPre)} · 공개 후 ${fmt(a.feedPost)}  [낮을수록 좋음]`);
  console.log(`  기루다 응답 ${fmt(a.sig)}                        [높을수록 관례적]`);
  console.log(`  키카드 낭비 마이티·조커 ${fmt(a.kwN)} · 넓은 정의 ${fmt(a.kwB)}  [낮을수록 좋음]`);
}

const files = process.argv.slice(2);
if (!files.length) { console.error('사용: node replay_metrics.js <export.md>...'); process.exit(1); }
const aggAI = newAgg(), aggHU = newAgg();
const meta = {};
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const m = txt.split('```json')[1];
  if (!m) { console.error(`JSON 블록 없음: ${f}`); continue; }
  const rec = JSON.parse(m.split('```')[0]);
  const g = measure(rec, aggAI, aggHU);
  const ok = g.phase === 'done';
  meta[rec.version] = (meta[rec.version] || 0) + 1;
  console.log(`${path.basename(f)}  v=${rec.version} tier=${rec.tier} → ${ok ? '재구성 완료' : '미완주:' + g.phase}` +
    (ok ? ` · 상금 ${g.result.prizes.join('/')}` : ''));
}
console.log(`\n버전 구성: ${Object.entries(meta).map(([k, v]) => `${k}×${v}`).join(', ')}`);
report('AI 좌석(마스터) 1~4', aggAI);
report('인간 좌석 0 (참고)', aggHU);
