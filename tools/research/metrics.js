/**
 * 전략 지표 관측기 (0단계 + 프렌드 협력 확장).
 * 플레이 중 각 결정 시점을 기록해두고, 게임 종료 후 정답(주공/프렌드)으로 평가한다.
 * 프렌드·야당의 "협력다운 협력"을 승률과 별개로 계량하기 위한 것.
 *
 *   const ob = new Metrics();
 *   ...루프에서 g.act(a) 직전:  ob.record(g, action)
 *   ...게임 종료 후:            ob.finish(g) → 좌석별 지표 (+ .pre/.post 프렌드 공개 전후 분리)
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const isPoint = c => !E.isJoker(c) && c.rank >= 10;

function stubPl(t) {
  const p0 = t.plays[0];
  return {
    ledSuit: p0.jokerSuit || (E.isJoker(p0.card) ? null : p0.card.suit),
    trickNo: t.trickNo,
    jokerCallActive: t.plays.some(x => x.jokerCall),
  };
}
const stronger = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

const COUNTERS = ['missWin', 'missChance', 'waste', 'wasteChance', 'keyWaste', 'keyChance',
                  'trumpPull', 'trumpLead', 'trumpPlayed', 'leads', 'teamLeadWin',
                  'steal', 'stealChance', 'feed', 'feedChance',
                  'keyPlay', 'keyTrickSum', 'mightyPlay', 'mightyTrickSum',
                  'jokerPlay', 'jokerTrickSum', 'trumpLeadChance', 'trumpLeadForgone',
                  'jokerCall', 'jokerCallChance'];
const mk = () => { const o = {}; for (const k of COUNTERS) o[k] = 0; return o; };

class Metrics {
  constructor() { this.decisions = []; }

  /** g.act 직전 호출. play 페이즈만 기록한다. */
  record(g, action) {
    if (g.phase !== 'play') return;
    const pl = g.play;
    this.decisions.push({
      trickNo: pl.trickNo,
      seat: pl.turn,
      leading: pl.table.length === 0,
      revealed: !!g.friendRevealed,
      card: action.card,
      jokerSuit: action.jokerSuit || null,
      jokerCall: !!action.jokerCall,
      jokerOut: !pl.history.some(t => t.plays.some(e => E.isJoker(e.card))) &&
                !pl.table.some(e => E.isJoker(e.card)),
      legal: g.legalActions().map(m => ({ card: m.card, jokerSuit: m.jokerSuit || null })),
    });
  }

  /** 종료 후 좌석별 지표. 팀 정답으로 평가. */
  finish(g) {
    const r = g.result;
    const decl = r.declarer, fr = (r.friend != null && r.friend !== decl) ? r.friend : null;
    const team = p => (p === decl || p === fr) ? 'ruling' : 'opp';
    const out = {};
    for (let p = 0; p < E.NUM_PLAYERS; p++) {
      out[p] = Object.assign({ role: p === decl ? 'declarer' : (p === fr ? 'friend' : 'defender') },
                             mk());
      out[p].pre = mk(); out[p].post = mk();
    }
    const giruda = g.contract.giruda;

    // 트릭별 "프렌드 공개 여부": 그 트릭 리드 시점의 상태로 판정
    const revealAt = {};
    for (const d of this.decisions)
      if (revealAt[d.trickNo] === undefined && d.leading) revealAt[d.trickNo] = d.revealed;
    const add = (p, key, v, tno) => {
      const m = out[p]; m[key] += v;
      (revealAt[tno] ? m.post : m.pre)[key] += v;
    };

    for (const t of g.play.history) {
      const pl = stubPl(t);
      const key = e => g._cardStrength(e, pl);
      let winKey = [-2, -1];
      for (const e of t.plays) if (stronger(key(e), winKey)) winKey = key(e);
      const tno = t.trickNo;

      for (const e of t.plays) {
        // 카드 소모 성향 (리드 포함)
        if (giruda !== 'N' && !E.isJoker(e.card) && e.card.suit === giruda)
          add(e.player, 'trumpPlayed', 1, tno);
        if (E.isJoker(e.card) || E.sameCard(e.card, g.mightyCard)) {
          add(e.player, 'keyPlay', 1, tno);
          add(e.player, 'keyTrickSum', tno, tno);
        }
        if (E.sameCard(e.card, g.mightyCard)) {
          add(e.player, 'mightyPlay', 1, tno); add(e.player, 'mightyTrickSum', tno, tno);
        }
        if (E.isJoker(e.card)) {
          add(e.player, 'jokerPlay', 1, tno); add(e.player, 'jokerTrickSum', tno, tno);
        }

        if (e.player === t.plays[0].player) continue;   // 리드는 제외 (기루다 뽑기는 낭비 아님)
        // 아군이 내 카드 없이도 이겼을 트릭인가 (자원 낭비 판정 기준)
        let bestOther = [-2, -1], bestOtherP = null;
        for (const x of t.plays) {
          if (x.player === e.player) continue;
          const k = key(x);
          if (stronger(k, bestOther)) { bestOther = k; bestOtherP = x.player; }
        }
        const allyBest = bestOtherP !== null && team(bestOtherP) === team(e.player);
        const allyWouldWin = allyBest;
        // 핸드오프 §6-8: 아군 확정승 트릭에 마이티·조커 투입 (임계 1% 미만)
        if (allyWouldWin && t.winner === bestOtherP) {
          add(e.player, 'keyChance', 1, tno);
          if (E.isJoker(e.card) || E.sameCard(e.card, g.mightyCard)) add(e.player, 'keyWaste', 1, tno);
        }
        // 팀내부 트릭 탈취: 아군이 최강인데 내가 덮어 이김
        if (allyBest) {
          add(e.player, 'stealChance', 1, tno);
          if (t.winner === e.player) add(e.player, 'steal', 1, tno);
        }
        // 아군 승 트릭 점수 공급
        if (t.winner !== e.player && team(t.winner) === team(e.player)) {
          add(e.player, 'feedChance', 1, tno);
          if (isPoint(e.card)) add(e.player, 'feed', 1, tno);
        }
        if (allyWouldWin) {
          add(e.player, 'wasteChance', 1, tno);
          const c = e.card;
          const strong = E.isJoker(c) || E.sameCard(c, g.mightyCard) ||
                         (giruda !== 'N' && !E.isJoker(c) && c.suit === giruda) ||
                         (!E.isJoker(c) && c.rank >= 13);
          if (strong) add(e.player, 'waste', 1, tno);
        }
      }

      const leader = t.plays[0].player;
      add(leader, 'leads', 1, tno);
      if (team(t.winner) === team(leader)) add(leader, 'teamLeadWin', 1, tno);
      const ledCard = t.plays[0].card;
      if (giruda !== 'N' && !E.isJoker(ledCard) && ledCard.suit === giruda) {
        add(leader, 'trumpLead', 1, tno);
        // 기루다 리드로 상대 기루다를 뽑아냈는가
        const pulled = t.plays.some(e => e.player !== leader &&
          team(e.player) !== team(leader) && !E.isJoker(e.card) && e.card.suit === giruda);
        if (pulled) add(leader, 'trumpPull', 1, tno);
      }

      // 리드 기회에 기루다를 들고도 다른 무늬로 리드했는가 (기루다 정리 회피)
      for (const d of this.decisions) {
        if (d.trickNo !== tno || !d.leading || giruda === 'N') continue;
        const hasTrump = d.legal.some(mv => !E.isJoker(mv.card) && mv.card.suit === giruda);
        if (!hasTrump) continue;
        add(d.seat, 'trumpLeadChance', 1, tno);
        if (E.isJoker(d.card) || d.card.suit !== giruda) add(d.seat, 'trumpLeadForgone', 1, tno);
      }

      // 먹을 수 있었는데 상대에게 넘긴 트릭
      for (const d of this.decisions) {
        if (d.trickNo !== tno) continue;
        const couldWin = d.legal.some(mv => {
          const k = key({ player: d.seat, card: mv.card, jokerSuit: mv.jokerSuit });
          return stronger(k, winKey) || (k[0] === winKey[0] && k[1] === winKey[1]);
        });
        if (!couldWin) continue;
        add(d.seat, 'missChance', 1, tno);
        if (team(t.winner) !== team(d.seat)) add(d.seat, 'missWin', 1, tno);
        if (d.leading && d.jokerOut && team(d.seat) === 'opp') {
          add(d.seat, 'jokerCallChance', 1, tno);
          if (d.jokerCall) add(d.seat, 'jokerCall', 1, tno);
        }
      }
    }
    return out;
  }
}

module.exports = { Metrics, COUNTERS };
