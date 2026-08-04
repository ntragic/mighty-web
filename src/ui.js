/* ============================================================
 *  마이티 UI 드라이버 — 1단계
 * ============================================================ */
'use strict';
const E = globalThis.MightyEngine;

/* ================= i18n ================= */
let LANG = 'ko';
const DEFAULT_NAMES = {
  ko: ['나','서준','하린','도윤','유나'],
  en: ['You','Alex','Robin','Casey','Jordan'],
};
const I18N_EN = {
  // 진영·역할
  '여당':'Attackers', '야당':'Defenders', '주공':'Declarer', '프렌드':'Friend',
  '여당 승리':'Attackers win', '야당 승리':'Defenders win',
  '여당 (주공)':'Attacker (declarer)', '여당 (프렌드)':'Attacker (friend)',
  '여당 (숨은 프렌드)':'Attacker (hidden friend)', '미정 (초구 프렌드)':'Undecided (first-trick friend)',
  '프렌드(비공개)':'Friend (hidden)',
  // 기본 화면
  '마이티':'Mighty', '패스':'Pass', '취소':'Cancel', '없음':'None', '판':'Round',
  '다음 판':'Next round', '최종 결과 보기':'Final results', '시트':'Sheet', '시트 닫기':'Close sheet',
  '누적':'Total', '플레이어':'Player',
  // 공약
  '공약 선언':'Declare bid', '공약 수정':'Revise bid', '노기루다':'No Trump', '노':'NT',
  '스페이드':'Spades', '다이아':'Diamonds', '하트':'Hearts', '클로버':'Clubs',
  '무늬를 선택하면 최소 공약이 자동 지정됩니다.':'Pick a suit and the minimum bid is set automatically.',
  '현재 공약 유지 상태입니다. 그대로 묻기를 눌러도 됩니다.':'Keeping the current bid — you can just bury.',
  // 바닥패
  '바닥패 교환':'Kitty exchange',
  '바닥패 3장이 손패에 합쳐졌습니다(● 표시). 묻을 3장을 선택하세요. 묻은 점수카드는 여당에 귀속됩니다.':
    'The 3 kitty cards joined your hand (marked ●). Choose 3 to bury. Buried point cards go to the Attackers.',
  // 프렌드
  '프렌드 지정':'Choose friend', '조커 프렌드':'Joker friend', '기루다 A':'Trump ace', '기루다 K':'Trump king',
  '초구 프렌드':'First-trick friend', '노프렌드':'No friend', '직접 선택':'Pick a card',
  '자신이 가진 카드는 부를 수 없습니다. 프렌드는 해당 카드가 나올 때 공개됩니다.':
    'You cannot call a card you hold. The friend is revealed when that card is played.',
  '초구를 주공이 승리 — 사실상 노프렌드':'Declarer won the first trick — effectively no friend',
  // 조커
  '조커':'Joker', '조커콜':'Joker Call', '조커콜 선언':'Call the Joker', '그냥 내기':'Play normally',
  '조커 선출 — 요구할 무늬':'Leading the Joker — choose a suit',
  '조커콜! 조커 보유자는 조커를 내야 합니다':'Joker Call! The Joker holder must play it.',
  // 딜미스
  '딜미스':'Misdeal', '딜미스 선언':'Declare misdeal', '딜미스 선언 가능':'Misdeal available',
  '이 패로 진행':'Play this hand',
  // 세팅
  '세팅 — 전승 확정':'Claim — all remaining tricks',
  '자동 진행':'Auto-play', '직접 플레이':'Play it out',
  // 치트시트
  '치트 시트':'Cheat sheet', '내 진영':'Your side', '주요 카드':'Key cards',
  '기루다 현황':'Trump count', '무늬별 잠재 탑카드':'Top card by suit', '트릭별 탑 카드':'Winning card by trick',
  '소진':'gone', '미확정':'unassigned',
  ' · 바닥패에 묻혀 있을 수 있음':' · may be buried in the kitty',
  ' (묻은 바닥패 반영)':' (includes buried kitty)',
  // 설정 섹션·항목
  '프리셋':'Preset', '마이티리그 룰':'Mighty League rules', '표준 룰 (공약 13)':'Standard rules (min bid 13)',
  '커스텀':'Custom', '플레이어':'Players', '내 이름':'Your name', '난이도':'Difficulty',
  '중급':'Intermediate', '고급':'Advanced', '마스터':'Master',
  '중급·고급은 규칙 기반, 마스터는 신경망(16MB 다운로드)':
    'Intermediate/Advanced are rule-based; Master uses a neural network (16 MB)',
  '마스터 AI 로드 실패 — 고급 전략으로 진행합니다':'Master AI unavailable — falling back to Advanced',
  '마스터 AI를 불러오지 못했습니다. 고급 전략으로 대체 진행합니다.':
    'Master AI could not be loaded. Falling back to the Advanced tier.',
  '중수·고수는 진화 학습, 마스터는 신경망(16MB 다운로드)':
    'Intermediate/Expert use evolved strategies; Master uses a neural network (16 MB)',
  '매치 진행':'Match', '진행 방식':'Match format', '정해진 판수':'Fixed rounds', '목표 상금':'Prize target',
  '무제한':'Endless', '라운드 수':'Number of rounds', '누적 상금 도달 시 매치 종료':'Match ends when a player reaches this total',
  '다음 딜러':'Next dealer', '차례로':'Rotate',
  '프렌드 룰: 전 판 프렌드가 딜러 (노프렌드 시 주공)':'Friend rule: last round\u2019s friend deals (declarer if none)',
  '컴퓨터 속도':'Computer speed', '빠름':'Fast', '보통':'Normal', '느림':'Slow',
  '사운드':'Sound', '사운드 테스트':'Test sounds', '사용':'On', '미사용':'Off',
  '비딩':'Bidding', '최소 공약':'Minimum bid', '노기루다 공약 할인':'No-trump bid discount',
  '노기루다는 최소공약을 낮춰 선언':'Lower the minimum bid for no-trump',
  '바닥패 후 공약 수정':'Bid revision after kitty', '무늬 변경 비용':'Suit change cost',
  '노기루다 전환 비용':'Switch-to-NT cost', '딜':'Deal', '딜미스 기준':'Misdeal threshold',
  '선언은 선택제 (비딩 중 또는 공약 확정 후)':'Declaring is optional (during bidding or after the contract)',
  '점수합(J·Q·K·A 1점, 10 0.5점, 조커 −1점) 이하':'Hand value or less (J/Q/K/A = 1, 10 = 0.5, Joker = −1)',
  '조커 · 마이티':'Joker & Mighty', '조커콜 카드':'Joker Call card', '기루다와 겹칠 때':'If it matches trump',
  '조커콜 무늬가 기루다일 경우 대체 카드':'Replacement card when the Joker Call suit is trump',
  '초구 조커콜 금지':'No Joker Call on first trick', '초구 조커 최약':'Joker weakest on first trick',
  '막트릭 조커 최약':'Joker weakest on last trick', '초구 기루다 선출 금지':'No trump lead on first trick',
  '스코어링 (엑셀 리그 수식)':'Scoring (league formula)', '공약 단가':'Per-bid rate',
  '(목표−13) × 단가':'(target − 13) × rate', '초과·미달 단가':'Per-trick rate',
  '(획득−목표) × 단가':'(taken − target) × rate', '노기루다 배수':'No-trump multiplier',
  '상금 캡':'Prize cap', '런은 캡 금액 고정 지급':'A run always pays the cap', '노기루다 캡':'No-trump cap',
  '주공 배분':'Declarer share', '셀프(노프렌드) 배분':'Solo share', '프렌드 배분':'Friend share',
  '설정은 자동 저장되며, 진행 중인 판이 있으면 다음 판부터 적용됩니다. 배분 변경 시 제로섬이 깨질 수 있습니다(주공×n + 프렌드×m − 야당×3).':
    'Settings save automatically and apply from the next round. Changing shares can break the zero-sum balance (declarer×n + friend×m − defenders×3).',
  '룰 변경은 다음 판부터 적용됩니다':'Rule changes apply from the next round',
  '리그 룰로 초기화':'Reset to league rules', '완료':'Done', '룰 설정':'Settings',
  // 마스터 티어
  '마스터 AI 로딩 중…':'Loading Master AI…',
  '마스터 AI 로딩 중… (최초 1회, 약 16MB)':'Loading Master AI… (one-time, ~16 MB)',
  '마스터 AI 준비 완료':'Master AI ready',
  '마스터 AI 로드 실패 — 고수 전략으로 진행합니다':'Master AI unavailable — falling back to Expert',
  '마스터 AI 로드 완료 — 신경망 추론으로 플레이합니다.':'Master AI loaded — playing with neural-network inference.',
  '마스터 AI를 불러오지 못했습니다. 고수 전략으로 대체 진행합니다.':
    'Master AI could not be loaded. Falling back to the Expert strategy.',
  '마스터 AI는 첫 사용 시 모델을 내려받습니다.':'Master AI downloads its model on first use.',
  // 사운드 테스트
  '셔플':'Shuffle', '제출':'Play', '기루다 컷':'Trump cut', '기루다 등장':'First trump',
  '수거':'Collect', '승리':'Win', '패배':'Lose',
  // 기타
  '진행 기록':'Game log', '기록':'Log', '매치 시작':'Start Match', '새 매치':'New match',
  '매치 종료':'Match complete', '이번 판':'This round', '컴퓨터 성향 — ':'Computer styles — ',
  '(나)':' (you)', ' · 런!':' · Run!', ' · 백런!':' · Back run!', ' · 노프렌드':' · no friend',
  ' · 초구(주공 셀프)':' · first trick (declarer solo)',
  '5인 트릭테이킹의 정석, 마이티.':'Mighty — the classic five-player trick-taking game.',
  '당신과 네 명의 컴퓨터 플레이어가 한 테이블에 앉습니다.':'You and four computer players take a seat.',
  '공약을 선언하고, 프렌드를 찾고, 판을 지배하세요.':'Bid, find your friend, and take the table.',
  '언어':'Language', '일반':'General', '게임플레이':'Gameplay', '룰':'Rules',
  '세팅 자동 진행':'Auto-claim',
  '되돌리기':'Undo', '복기':'Replay', '시트':'Sheet', '시트 닫기':'Close',
  '비딩 1회 · 플레이 1회 (라운드마다 초기화, 단축키 Z)':'Once for bidding, once for play (resets each round, key Z)',
  '되돌릴 수 없습니다':'Nothing to undo', '그 수는 둘 수 없습니다':'That move is no longer valid',
  '게임으로':'Back to game', '새 게임':'New game', '게임':'Game',
  '지금 판을 버리고 처음부터 다시 시작합니다.':'Discard the current match and start over.',
  '현재 매치를 끝내고 좌석 성향을 새로 배정합니다.':'Ends the match and reshuffles seat personalities.',
  '진행 중':'in progress', '복기할 라운드가 없습니다':'No round to replay',
  '복기할 트릭이 없습니다':'No tricks to replay', '라운드를 선택하세요':'Choose a round',
  '내보내기':'Export', '전체 내보내기':'Export all', '닫기':'Close', '복사':'Copy',
  '복사했습니다':'Copied', '내보낼 기록이 없습니다':'Nothing to export',
  '전체 복사':'Copy all', '새 창으로 열기':'Open in new tab',
  '직접 선택해 복사하세요':'Select the text and copy manually',
  '팝업이 차단되었습니다':'Popup blocked', '기록을 정리하는 중…':'Preparing the log…',
  '먼저 진행 중인 선택을 마쳐주세요':'Finish the current choice first',
  '기록 생성에 실패했습니다':'Failed to build the log',
  '묻은 카드':'buried', '비딩':'bidding', '플레이':'play',
  '초구 조커로 기루다 지정':'Joker calling trump on first trick',
  '금지하면 초구 기루다 선출 금지 룰을 조커로 우회할 수 없음':
    'Blocking this prevents bypassing the no-trump-lead rule with the Joker',
  '금지':'Blocked', '허용':'Allowed',
  '조커콜 시 마이티 보호':'Mighty protects the Joker',
  '조커 보유자가 마이티를 내어 조커를 지킬 수 있음':
    'The Joker holder may play the Mighty instead to keep the Joker', '남은 트릭 전승이 확정되면 빠르게 자동 마무리':
    'Fast-forward when all remaining tricks are guaranteed',
  '셀프':'Solo', '초구':'First trick',
  '0점':'0', '0.5점':'0.5', '1점':'1',
  // 페르소나
  '승부사':'Gambler', '신중파':'Cautious', '팀플레이어':'Team Player', '독불장군':'Lone Wolf', '밸런스':'Balanced',
};
function t(s){ return (LANG==='en' && I18N_EN[s]!==undefined) ? I18N_EN[s] : s; }
function setLang(L){
  if (L!==LANG){
    LANG = L;
    settings.ui.lang = L;
    document.documentElement.lang = L;
    applyNames(); applyStatic(); saveSettings();
    if (typeof render==='function' && game) render();
    renderLanding();
  }
  if ($('#settings').classList.contains('show')) renderSettings();
  applyStatic();
}
/** 정적 DOM 문구(시작 화면·헤더 등) 갱신 */
function applyStatic(){
  const set=(sel,txt)=>{ const e=$(sel); if(e) e.textContent=txt; };
  set('#log-btn', t('기록'));
  set('#set-btn', t('룰 설정'));
  const cb=$('#cheat-btn'); if(cb) cb.innerHTML=(cheatOpen?t('시트 닫기'):t('시트'))+'<span class="kb">C</span>';
  const ub=$('#undo-btn'); if(ub) ub.innerHTML=t('되돌리기')+'<span class="kb">Z</span>';
  const rb=$('#replay-btn'); if(rb) rb.innerHTML=t('복기')+'<span class="kb">R</span>';
  set('#start-btn', t('매치 시작'));
  set('#start-set-btn', t('룰 설정'));
  set('#set-done', t('완료'));
  set('#set-reset', t('리그 룰로 초기화'));
  const lg=$('#log header span'); if(lg) lg.textContent=t('진행 기록');
  set('#hud .title', LANG==='en' ? 'MIGHTY' : '마이티');
  const h1=$('#start .inner h1'); if(h1) h1.textContent = LANG==='en' ? 'MIGHTY' : '마이티';
  const en=$('#start .en'); if(en) en.textContent = LANG==='en' ? 'FIVE-PLAYER TRICK TAKING' : 'MIGHTY · SOLO TABLE';
  const sh=$('#settings h2'); if(sh) sh.childNodes[0].nodeValue=t('룰 설정')+' ';
  const p=$('#start .inner p');
  if(p) p.innerHTML = t('5인 트릭테이킹의 정석, 마이티.')+'<br>'+
    t('당신과 네 명의 컴퓨터 플레이어가 한 테이블에 앉습니다.')+'<br>'+
    t('공약을 선언하고, 프렌드를 찾고, 판을 지배하세요.');
  document.querySelectorAll('.app-ver').forEach(e=>{ e.textContent = APP_VERSION + ' · ' + APP_BUILD; });
}
function cardLabel(c){ return E.isJoker(c) ? t('조커') : E.cardName(c); }
function gLabel(g){ return LANG==='en' ? (g==='N' ? 'NT' : SUIT_GLYPH[g]) : g2ko(g); }
const TIER_LABEL_KO = { intermediate:'중급', advanced:'고급', master:'마스터' };
function personaLabel(p){ return t(E.PERSONAS[BOT_PERSONAS[p]].label); }
const num = n => n.toLocaleString(LANG==='en'?'en-US':'ko-KR');
/** 보간 문자열 */
const TF = {
  bidBtn:(c,g)=> LANG==='en' ? `Declare ${c}${gLabel(g)}` : `${c}${gLabel(g)} 공약 선언`,
  bidPlan:(c,g)=> LANG==='en'
    ? `Planned: <b style="color:var(--gold)">${c}${gLabel(g)}</b> — pick a higher number above to raise`
    : `선언 예정: <b style="color:var(--gold)">${c}${gLabel(g)}</b> — 숫자를 올리려면 위에서 선택하세요`,
  bidFirst:(m)=> LANG==='en' ? `First bid — minimum is ${m}.` : `첫 공약입니다. 최소 ${m}부터.`,
  bidBest:(nm,c,g)=> LANG==='en' ? `Current high bid: ${nm} ${c}${gLabel(g)}` : `현재 최고 공약: ${nm} ${c}${gLabel(g)}`,
  buryBtn:(n)=> LANG==='en' ? `Bury 3 cards (${n}/3)` : `3장 묻기 (${n}/3)`,
  mightyFriend:(cn)=> LANG==='en' ? `Mighty (${cn})` : `마이티 (${cn})`,
  cardFriend:(cn)=> LANG==='en' ? `${cn} friend` : `${cn} 프렌드`,
  friendCardToast:(cn)=> LANG==='en' ? `Friend card: ${cn}` : `프렌드 카드: ${cn}`,
  friendToast:(m)=> LANG==='en' ? `Friend: ${m}` : `프렌드: ${m}`,
  jokerCallAsk:(cn)=> LANG==='en'
    ? `Declare a Joker Call with ${cn}?<br>Whoever holds the Joker must play it.`
    : `${cn}을(를) 조커콜로 선언할까요?<br>조커 보유자는 조커를 강제로 내야 합니다.`,
  jokerDemand:(s)=> LANG==='en' ? ` (${s} demanded)` : ` (${s} 요구)`,
  suitFollow:()=> LANG==='en' ? 'Other players must follow this suit' : '다른 플레이어는 이 무늬를 따라야 합니다',
  seatMeta:(tk,pt)=> LANG==='en' ? `${tk} tricks · ${pt} pts` : `트릭 ${tk} · ${pt}점`,
  hudRounds:(r,m)=> LANG==='en' ? `<b>${r}</b>/${m} rounds` : `<b>${r}</b>/${m}판`,
  hudTarget:(r,tg)=> LANG==='en' ? `<b>${r}</b> rounds · target +${num(tg)}` : `<b>${r}</b>판 · 목표 +${num(tg)}`,
  hudPlain:(r)=> LANG==='en' ? `<b>${r}</b> rounds` : `<b>${r}</b>판`,
  hudDealer:(prog,nm)=> LANG==='en' ? `${prog} · dealer ${nm}` : `${prog} · 딜러 ${nm}`,
  hudContract:(ct,nm)=> LANG==='en' ? `Bid <b>${ct}</b> · declarer <b>${nm}</b>` : `공약 <b>${ct}</b> · 주공 <b>${nm}</b>`,
  hudScore:(a,q1,d,q2,tn)=> LANG==='en'
    ? `Attackers <b>${a}</b>${q1} / Defenders <b>${d}</b>${q2} · trick ${tn}/10`
    : `여당 <b>${a}</b>${q1} / 야당 <b>${d}</b>${q2} · ${tn}/10트릭`,
  fdHidden:(cn)=> LANG==='en' ? ` · friend <b>${cn}</b> (hidden)` : ` · 프렌드 <b>${cn}</b> (미공개)`,
  fdSelf:(cn)=> LANG==='en' ? ` · friend ${cn} (held by declarer — solo)` : ` · 프렌드 ${cn} (주공 보유·셀프)`,
  fdKnown:(nm)=> LANG==='en' ? ` · friend <b>${nm}</b>` : ` · 프렌드 <b>${nm}</b>`,
  // 공개 후에도 '무슨 카드로 불렀는지'가 판을 읽는 정보라 카드와 이름을 함께 남긴다
  fdKnownCard:(cn,nm)=> LANG==='en' ? ` · friend <b>${cn}</b> → <b>${nm}</b>`
                                    : ` · 프렌드 <b>${cn}</b> → <b>${nm}</b>`,
  fdFirstUnknown:()=> LANG==='en' ? ' · first-trick friend <b>?</b>' : ' · 초구 프렌드 <b>?</b>',
  needPts:(side,have,q,need)=> LANG==='en'
    ? `${side}: <b>${have}</b> pts${q} → <b>${need}</b> to win`
    : `${side}: <b>${have}</b>점 확보${q} → 승리까지 <b>${need}</b>점`,
  needNote:(c,o)=> LANG==='en'
    ? `Attackers need ${c}+, Defenders need ${o}+ · 20 total`
    : `여당은 ${c}점 이상, 야당은 ${o}점 이상 필요 · 총 20점`,
  cheatBase:(decl)=> LANG==='en'
    ? `Excludes played cards and your hand${decl ? ' (includes buried kitty)' : ' · may be buried in the kitty'}`
    : `출현 카드·내 손 제외 기준${decl ? ' (묻은 바닥패 반영)' : ' · 바닥패에 묻혀 있을 수 있음'}`,
  trumpCount:(uns,mine,out)=> LANG==='en'
    ? `Unseen <b>${uns}</b> · in hand <b>${mine}</b> · outstanding <b>${out}</b><br>`
    : `미출현 <b>${uns}</b>장 · 내 손 <b>${mine}</b>장 · 밖 <b>${out}</b>장<br>`,
  trumpTop:(list)=> LANG==='en' ? `Highest outstanding: <b>${list}</b>` : `밖의 상위: <b>${list}</b>`,
  trumpGone:()=> LANG==='en' ? `Outstanding trumps <span class="dead">gone</span>` : `밖 기루다 <span class="dead">소진</span>`,
  trickLine:(n)=> LANG==='en' ? `trick ${n}` : `${n}트릭`,
  logTrick:(n,nm,p)=> LANG==='en' ? `— trick ${n}: <b>${nm}</b> wins (${p} pts)` : `— ${n}트릭: <b>${nm}</b> 승 (${p}점)`,
  logBid:(nm,c,g)=> LANG==='en' ? `<b>${nm}</b> bids <b>${c}${gLabel(g)}</b>` : `<b>${nm}</b> 공약 <b>${c}${gLabel(g)}</b>`,
  logPass:(nm)=> LANG==='en' ? `${nm} passes` : `${nm} 패스`,
  logDeclarer:(nm,ct)=> LANG==='en' ? `<b>${nm}</b> is declarer — ${ct}` : `<b>${nm}</b> 주공 확정 — ${ct}`,
  logExchange:(nm)=> LANG==='en' ? `<b>${nm}</b> exchanged the kitty` : `<b>${nm}</b> 바닥패 교환`,
  logExchangeDone:(nm)=> LANG==='en' ? `<b>${nm}</b> finished the kitty exchange` : `<b>${nm}</b> 바닥패 교환 완료`,
  logRevise:(c,g)=> LANG==='en' ? ` · revised to <b>${c}${gLabel(g)}</b>` : ` · 공약 <b>${c}${gLabel(g)}</b>로 수정`,
  logFriendDecl:(nm,msg)=> LANG==='en' ? `<b>${nm}</b> calls ${msg}` : `<b>${nm}</b> ${msg} 선언`,
  logMisdeal:(nm)=> LANG==='en' ? `<b>${nm}</b> declares a misdeal` : `<b>${nm}</b> 딜미스 선언`,
  logMisdealVal:(nm,v)=> LANG==='en' ? `<b>${nm}</b> declares a misdeal (hand value ${v})` : `<b>${nm}</b> 딜미스 선언 (점수합 ${v})`,
  logMisdealSkip:(nm)=> LANG==='en' ? `<b>${nm}</b> declines the misdeal` : `<b>${nm}</b> 딜미스 포기, 진행`,
  logRoundStart:(r,nm)=> LANG==='en' ? `— <b>Round ${r}</b> begins (dealer ${nm})` : `— <b>${r}판</b> 시작 (딜러 ${nm})`,
  logRoundEnd:(r,v,p)=> LANG==='en' ? `<b>Round ${r}</b> ${v} · prize ${num(p)}` : `<b>${r}판</b> ${v} · 상금 ${num(p)}`,
  logMatchEnd:(nm,tt)=> LANG==='en' ? `— <b>Match complete</b> winner: <b>${nm}</b> (${num(tt)})` : `— <b>매치 종료</b> 우승: <b>${nm}</b> (${num(tt)})`,
  logPlay:(nm,cn,jc,js)=> LANG==='en'
    ? `${nm} ${cn}${jc?' <b>Joker Call!</b>':''}${js?` (${js} demanded)`:''}`
    : `${nm} ${cn}${jc?' <b>조커콜!</b>':''}${js?` (${js} 요구)`:''}`,
  misdealRedeal:(nm)=> LANG==='en' ? `Misdeal by ${nm} — redealing` : `딜미스 선언 (${nm}) — 다시 딜합니다`,
  allPassRedeal:()=> LANG==='en' ? 'Everyone passed — redealing' : '전원 패스 — 다시 딜합니다',
  misdealAsk:(v,th)=> LANG==='en'
    ? `Hand value <b>${v}</b> (threshold ${th} or less)<br>Declare to redeal, or play this hand.`
    : `점수합 <b>${v}</b>점 (기준 ${th} 이하)<br>선언하면 다시 딜하고, 진행하면 이 패로 게임합니다.`,
  claimBody:(nm,side,left,pts)=> LANG==='en'
    ? `<b>${nm}</b> (${side}) takes all <b>${left}</b> remaining tricks.` +
      (pts?`<br><b>${pts}</b> point card(s) go to the ${side}.`:'') + `<br><br>Fast-forward automatically?`
    : `<b>${nm}</b>(${side})가 남은 <b>${left}트릭</b>을 모두 가져갑니다.` +
      (pts?`<br>남은 점수카드 <b>${pts}장</b>이 ${side}에 귀속됩니다.`:'') + `<br><br>빠르게 자동 진행할까요?`,
  claimToast:(nm)=> LANG==='en' ? `Claim — auto-playing for ${nm}` : `세팅 — ${NAMES ? nm : nm} 전승 자동 진행`,
  roundResultTitle:(r)=> LANG==='en' ? `Round ${r} result` : `${r}판 결과`,
  roundResultSub:(ct,nm,fr)=> LANG==='en' ? `Bid ${ct} · declarer ${nm}${fr}` : `공약 ${ct} · 주공 ${nm}${fr}`,
  friendSuffix:(nm)=> LANG==='en' ? ` · friend ${nm}` : ` · 프렌드 ${nm}`,
  noFriendSuffix:()=> LANG==='en' ? ' · no friend' : ' · 노프렌드',
  ptsLine:(a,d,disc,sc,pz)=> LANG==='en'
    ? `Attackers ${a} / Defenders ${d}${disc} · score ${num(sc)} → prize ${num(pz)}`
    : `여당 ${a}점 / 야당 ${d}점${disc} · 점수 ${num(sc)} → 상금 ${num(pz)}`,
  discAttr:(n)=> LANG==='en' ? ` (kitty ${n} pts to Attackers)` : ` (바닥패 ${n}점 여당 귀속)`,
  matchWhyRounds:(n)=> LANG==='en' ? `${n} rounds complete` : `${n}판 종료`,
  matchWhyTarget:(n)=> LANG==='en' ? `Prize target +${num(n)} reached` : `목표 상금 +${num(n)} 달성`,
  matchSub:(why,n)=> LANG==='en' ? `${why} · ${n} rounds total` : `${why} · 총 ${n}판`,
  computerN:(n,label)=> LANG==='en' ? `Computer ${n} <small>${label}</small>` : `컴퓨터 ${n} <small>${label}</small>`,
  logUndo:(g)=> LANG==='en' ? `— undo (${g})` : `— 되돌리기 (${g})`,
  undoDone:(g)=> LANG==='en' ? `Undone: ${g}` : `${g} 되돌렸습니다`,
  exported:(n)=> LANG==='en' ? `Saved ${n}` : `${n} 저장됨`,
  replayItem:(r,c,w)=> LANG==='en' ? `R${r} · ${c} · ${w}` : `${r}판 · ${c} · ${w}`,
  replayHead:(r,c,d,f)=> LANG==='en'
    ? `Replay · Round ${r} — bid <b>${c}</b> · declarer <b>${d}</b> · friend <b>${f}</b>`
    : `복기 · ${r}판 — 공약 <b>${c}</b> · 주공 <b>${d}</b> · 프렌드 <b>${f}</b>`,
  replayProgress:(tn,s,n)=> LANG==='en' ? `trick ${tn} · ${s}/${n}` : `${tn}트릭 · ${s}/${n}`,
  exportOk:(n,c,kb)=> LANG==='en'
    ? `Saved <b>${n}</b> — ${c} round(s), ${kb} KB. If the file didn't appear, copy the text below.`
    : `<b>${n}</b> 저장됨 — ${c}개 라운드, ${kb} KB. 파일이 보이지 않으면 아래 내용을 복사하세요.`,
  exportBlockedFrame:(c,kb)=> LANG==='en'
    ? `Downloads are blocked in this embedded page. ${c} round(s), ${kb} KB — copy the text below or open it in a new tab.`
    : `내장 페이지에서는 다운로드가 막혀 있습니다. ${c}개 라운드, ${kb} KB — 아래 내용을 복사하거나 새 창으로 여세요.`,
  exportBlocked:(c,kb)=> LANG==='en'
    ? `Download unavailable. ${c} round(s), ${kb} KB — copy the text below.`
    : `다운로드를 쓸 수 없습니다. ${c}개 라운드, ${kb} KB — 아래 내용을 복사하세요.`,
};
const tf = (k,...a) => TF[k](...a);

const APP_VERSION = 'v1.4.0';
const APP_BUILD = '2026-08-04 빌드 — 마스터 어텐션 인코더';
const HUMAN = 0;
let NAMES = DEFAULT_NAMES.ko.slice();
function isDefaultNames(arr){
  return ['ko','en'].some(L => DEFAULT_NAMES[L].every((n,i)=>String(arr[i]||'')===n));
}
function applyNames(){
  const base = DEFAULT_NAMES[LANG];
  const src = isDefaultNames(settings.names) ? base : settings.names;
  NAMES = src.map((n,i)=>String(n||'').trim().slice(0,10) || base[i]);
  for(let p=0;p<5;p++){ const e=document.querySelector(`#seat-${p} .name`); if(e) e.textContent=NAMES[p]; }
}
const SUIT_GLYPH = { S:'♠', D:'♦', H:'♥', C:'♣', N:'NT' };
const SUIT_RED = { S:false, D:true, H:true, C:false };
const suCls = s => 'su-'+(s||'N');
const $  = s => document.querySelector(s);
const el = (tag, cls, html) => { const d=document.createElement(tag); if(cls) d.className=cls; if(html!==undefined) d.innerHTML=html; return d; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

let game=null, dealer=Math.floor(Math.random()*5), roundNo=0;

/* ---------------- 2단계: 룰 설정 ---------------- */
function defaultSettings(){
  return {
    preset:'league',
    match:{ mode:'rounds', rounds:10, targetPrize:20000, dealerRule:'friend' },
    ui:{ speed:'normal', difficulty:'intermediate', sound:true, lang:null, autoClaim:true, undo:true },
    _tierV:2,
    names:['나','서준','하린','도윤','유나'],
    engine:{
      minBid:14, noGirudaBidDiscount:0,
      allowBidRevise:true, girudaChangeCost:2, toNoGirudaChangeCost:1,
      dealMissEnabled:true, dealMissThreshold:0.5,
      jokerCallEnabled:true, jokerCallBaseSuit:'C', jokerCallAltSuit:'H',
      jokerCallMightyProtect:true, firstTrickJokerNoGiruda:true, firstTrickNoJokerCall:true,
      firstTrickJokerWeak:true, lastTrickJokerWeak:true, firstTrickNoGirudaLead:true,
      scoring:{ perBid:300, perDiff:200, noGirudaMult:2, cap:2000, noGirudaCap:3000,
                declarerShare:2, selfDeclarerShare:4, friendShare:1 },
    },
  };
}
const PRESETS = {
  league:   { label:'마이티리그 룰', patch:{} },
  standard: { label:'표준 룰 (공약 13)', patch:{ minBid:13, noGirudaBidDiscount:1 } },
};
let settings = defaultSettings();
let matchOver = false;
const SPD = () => ({fast:{bot:250,pre:250,show:550,collect:250},
                    normal:{bot:550,pre:450,show:900,collect:340},
                    slow:{bot:900,pre:650,show:1400,collect:420}})[settings.ui.speed];
function buildEngineConfig(){
  const cfg = JSON.parse(JSON.stringify(settings.engine));
  cfg.discardPointsTo = 'declarer';   // 고정 룰: 묻은 점수카드는 여당 귀속
  return cfg;
}
const store = {
  async get(k){
    try{ if (window.storage){ const r = await window.storage.get(k); if (r) return r; } }catch(e){}
    try{ const v = localStorage.getItem(k); return v ? {value:v} : null; }catch(e){ return null; }
  },
  async set(k, v){
    try{ if (window.storage){ await window.storage.set(k, v); return; } }catch(e){}
    try{ localStorage.setItem(k, v); }catch(e){}
  },
};
async function saveSettings(){
  try{ await store.set('mighty-settings', JSON.stringify(settings)); }catch(e){}
}
async function loadSettings(){
  try{
    const r = await store.get('mighty-settings');
    if (r && r.value){
      const s = JSON.parse(r.value);
      const d = defaultSettings();
      if (s.ui && TIER_OF[s.ui.difficulty]) s.ui.difficulty = TIER_OF[s.ui.difficulty];  // v0.14 티어 이관
      settings = { ...d, ...s,
        names:(Array.isArray(s.names)&&s.names.length===5)?s.names:d.names,
        match:{...d.match, ...(s.match||{})}, ui:{...d.ui, ...(s.ui||{})},
        engine:{...d.engine, ...(s.engine||{}), scoring:{...d.engine.scoring, ...((s.engine||{}).scoring||{})}} };
    }
  }catch(e){}
}
function applyPreset(key){
  const d = defaultSettings();
  settings.engine = d.engine;
  Object.assign(settings.engine, PRESETS[key].patch);
  settings.preset = key;
}
/* --- 설정 UI 빌더 --- */
function segRow(label, sub, options, get, set){
  const row = el('div','set-row');
  row.append(el('div','lbl', label + (sub?`<small>${sub}</small>`:'')));
  const seg = el('div','seg');
  for (const o of options){
    const b = el('button','', o.l); if (String(get())===String(o.v)) b.classList.add('on');
    b.onclick = () => { set(o.v); settings.preset='custom'; saveSettings(); renderSettings(); };
    seg.append(b);
  }
  row.append(seg); return row;
}
function stepRow(label, sub, get, set, min, max, step, fmt){
  const row = el('div','set-row');
  row.append(el('div','lbl', label + (sub?`<small>${sub}</small>`:'')));
  const st = el('div','stepper');
  const minus = el('button','','−'), plus = el('button','','+');
  const val = el('div','val', (fmt||(x=>x))(get()));
  minus.onclick = () => { set(Math.max(min, get()-step)); settings.preset='custom'; saveSettings(); renderSettings(); };
  plus.onclick  = () => { set(Math.min(max, get()+step)); settings.preset='custom'; saveSettings(); renderSettings(); };
  st.append(minus,val,plus); row.append(st); return row;
}
const ONOFF = () => [{v:true,l:t('사용')},{v:false,l:t('미사용')}];
let setTab='general';   // general | gameplay | rules
function renderSettings(){
  const b = $('#set-body'); b.innerHTML='';
  const S = settings, e = S.engine, sc = e.scoring;
  // 섹션 탭
  const tabs=el('div','set-tabs');
  for (const [k,label] of [['general','일반'],['gameplay','게임플레이'],['rules','룰']]){
    const btn=el('button','set-tab'+(setTab===k?' on':''), t(label));
    btn.onclick=()=>{ setTab=k; renderSettings(); };
    tabs.append(btn);
  }
  b.append(tabs);
  if (setTab==='general') return renderSetGeneral(b,S);
  if (setTab==='gameplay') return renderSetGameplay(b,S);
  return renderSetRules(b,S,e,sc);
}
function renderSetGeneral(b,S){
  // 언어
  b.append(el('div','set-sec',t('언어')));
  b.append(segRow(t('언어'),'', [{v:'ko',l:'한국어'},{v:'en',l:'English'}],
    ()=>LANG, v=>{ setLang(v); }));
  // 플레이어
  b.append(el('div','set-sec',t('플레이어')));
  for(let p=0;p<5;p++){
    const row=el('div','set-row');
    row.append(el('div','lbl', p===0?t('내 이름'):tf('computerN', p, t(TIER_LABEL_KO[currentTier()]))));
    const inp=document.createElement('input');
    inp.type='text'; inp.maxLength=10; inp.value=NAMES[p]; inp.className='name-input';
    inp.onchange=()=>{ S.names[p]=inp.value; applyNames(); saveSettings(); renderSettings(); render(); };
    row.append(inp); b.append(row);
  }
  b.append(segRow(t('난이도'),t('중급·고급은 규칙 기반, 마스터는 신경망(16MB 다운로드)'),
    [{v:'intermediate',l:t('중급')},{v:'advanced',l:t('고급')},{v:'master',l:t('마스터')}],
    ()=>TIER_OF[S.ui.difficulty]||'intermediate',
    v=>{ S.ui.difficulty=v; if(v==='master') ensureMaster(); else buildAgents(); }));
  if (S.ui.difficulty==='master')
    b.append(el('div','hint', masterState==='ready' ? t('마스터 AI 로드 완료 — 신경망 추론으로 플레이합니다.')
      : masterState==='loading' ? t('마스터 AI 로딩 중…')
      : masterState==='failed' ? t('마스터 AI를 불러오지 못했습니다. 고급 전략으로 대체 진행합니다.')
      : t('마스터 AI는 첫 사용 시 모델을 내려받습니다.')));
  // 사운드·속도
  b.append(el('div','set-sec',t('사운드')));
  b.append(segRow(t('컴퓨터 속도'),'', [{v:'fast',l:t('빠름')},{v:'normal',l:t('보통')},{v:'slow',l:t('느림')}],
    ()=>S.ui.speed, v=>S.ui.speed=v));
  b.append(segRow(t('사운드'),'', ONOFF(), ()=>S.ui.sound, v=>S.ui.sound=(v===true||v==='true')));
  if (S.ui.sound){
    const tr=el('div','set-row'); tr.append(el('div','lbl',t('사운드 테스트')));
    const tc=el('div','seg');
    for (const [k,l] of [['shuffle','셔플'],['deal','딜'],['play','제출'],['trumpCut','기루다 컷'],['firstTrump','기루다 등장'],['mighty','마이티'],['joker','조커'],['jokerCall','조커콜'],['collect','수거'],['winJingle','승리'],['loseJingle','패배']]){
      const btn=el('button','',t(l)); btn.onclick=()=>SFX[k](); tc.append(btn);
    }
    tr.append(tc); b.append(tr);
  }
}
function renderSetGameplay(b,S){
  b.append(el('div','set-sec',t('매치 진행')));
  b.append(segRow(t('진행 방식'),'', [{v:'rounds',l:t('정해진 판수')},{v:'target',l:t('목표 상금')},{v:'free',l:t('무제한')}],
    ()=>S.match.mode, v=>S.match.mode=v));
  if (S.match.mode==='rounds')
    b.append(stepRow(t('라운드 수'),'', ()=>S.match.rounds, v=>S.match.rounds=v, 1, 50, 1,
      x=>LANG==='en'?`${x}`:x+'판'));
  if (S.match.mode==='target')
    b.append(stepRow(t('목표 상금'),t('누적 상금 도달 시 매치 종료'), ()=>S.match.targetPrize, v=>S.match.targetPrize=v, 5000, 100000, 5000, x=>'+'+num(x)));
  b.append(segRow(t('세팅 자동 진행'),t('남은 트릭 전승이 확정되면 빠르게 자동 마무리'), ONOFF(),
    ()=>S.ui.autoClaim!==false, v=>S.ui.autoClaim=(v===true||v==='true')));
  b.append(segRow(t('되돌리기'),t('비딩 1회 · 플레이 1회 (라운드마다 초기화, 단축키 Z)'), ONOFF(),
    ()=>S.ui.undo!==false, v=>{ S.ui.undo=(v===true||v==='true'); refreshTools(); }));
  b.append(segRow(t('다음 딜러'),t('프렌드 룰: 전 판 프렌드가 딜러 (노프렌드 시 주공)'),
    [{v:'friend',l:t('프렌드')},{v:'rotate',l:t('차례로')}],
    ()=>S.match.dealerRule, v=>S.match.dealerRule=v));
}
function renderSetRules(b,S,e,sc){
  b.append(el('div','set-sec',t('프리셋')));
  const pr = el('div','seg'); pr.style.justifyContent='flex-start'; pr.style.padding='6px 0';
  for (const k of Object.keys(PRESETS)){
    const btn = el('button','', t(PRESETS[k].label)); if (S.preset===k) btn.classList.add('on');
    btn.onclick = () => { applyPreset(k); saveSettings(); renderSettings(); };
    pr.append(btn);
  }
  if (S.preset==='custom'){ const c=el('button','',t('커스텀')); c.classList.add('on'); pr.append(c); }
  b.append(pr);
  // 비딩
  b.append(el('div','set-sec',t('비딩')));
  b.append(segRow(t('최소 공약'),'', [{v:13,l:'13'},{v:14,l:'14'}], ()=>e.minBid, v=>e.minBid=v));
  b.append(segRow(t('노기루다 공약 할인'),t('노기루다는 최소공약을 낮춰 선언'), [{v:0,l:t('없음')},{v:1,l:'−1'}],
    ()=>e.noGirudaBidDiscount, v=>e.noGirudaBidDiscount=v));
  b.append(segRow(t('바닥패 후 공약 수정'),'', ONOFF(), ()=>e.allowBidRevise, v=>e.allowBidRevise=(v===true||v==='true')));
  if (e.allowBidRevise){
    b.append(segRow(t('무늬 변경 비용'),'', [{v:1,l:'+1'},{v:2,l:'+2'},{v:3,l:'+3'}], ()=>e.girudaChangeCost, v=>e.girudaChangeCost=v));
    b.append(segRow(t('노기루다 전환 비용'),'', [{v:0,l:'+0'},{v:1,l:'+1'},{v:2,l:'+2'}], ()=>e.toNoGirudaChangeCost, v=>e.toNoGirudaChangeCost=v));
  }
  // 딜
  b.append(el('div','set-sec',t('딜')));
  b.append(segRow(t('딜미스'),t('선언은 선택제 (비딩 중 또는 공약 확정 후)'), ONOFF(), ()=>e.dealMissEnabled, v=>e.dealMissEnabled=(v===true||v==='true')));
  if (e.dealMissEnabled)
    b.append(segRow(t('딜미스 기준'),t('점수합(J·Q·K·A 1점, 10 0.5점, 조커 −1점) 이하'), [{v:0,l:t('0점')},{v:0.5,l:t('0.5점')},{v:1,l:t('1점')}],
      ()=>e.dealMissThreshold, v=>e.dealMissThreshold=v));
  // 조커·마이티
  b.append(el('div','set-sec',t('조커 · 마이티')));
  b.append(segRow(t('조커콜'),'', ONOFF(), ()=>e.jokerCallEnabled, v=>e.jokerCallEnabled=(v===true||v==='true')));
  if (e.jokerCallEnabled){
    b.append(segRow(t('조커콜 카드'),'', [{v:'C',l:'♣3'},{v:'S',l:'♠3'},{v:'D',l:'♦3'},{v:'H',l:'♥3'}],
      ()=>e.jokerCallBaseSuit, v=>{ e.jokerCallBaseSuit=v; if(e.jokerCallAltSuit===v) e.jokerCallAltSuit=(v==='H'?'C':'H'); }));
    b.append(segRow(t('기루다와 겹칠 때'),t('조커콜 무늬가 기루다일 경우 대체 카드'),
      [{v:'S',l:'♠3'},{v:'D',l:'♦3'},{v:'H',l:'♥3'},{v:'C',l:'♣3'}].filter(o=>o.v!==e.jokerCallBaseSuit),
      ()=>e.jokerCallAltSuit, v=>e.jokerCallAltSuit=v));
  }
  b.append(segRow(t('초구 조커콜 금지'),'', ONOFF(), ()=>e.firstTrickNoJokerCall, v=>e.firstTrickNoJokerCall=(v===true||v==='true')));
  b.append(segRow(t('초구 조커 최약'),'', ONOFF(), ()=>e.firstTrickJokerWeak, v=>e.firstTrickJokerWeak=(v===true||v==='true')));
  b.append(segRow(t('막트릭 조커 최약'),'', ONOFF(), ()=>e.lastTrickJokerWeak, v=>e.lastTrickJokerWeak=(v===true||v==='true')));
  b.append(segRow(t('초구 기루다 선출 금지'),'', ONOFF(), ()=>e.firstTrickNoGirudaLead, v=>e.firstTrickNoGirudaLead=(v===true||v==='true')));
  if (e.firstTrickNoGirudaLead)
    b.append(segRow(t('초구 조커로 기루다 지정'),t('금지하면 초구 기루다 선출 금지 룰을 조커로 우회할 수 없음'),
      [{v:false,l:t('금지')},{v:true,l:t('허용')}],
      ()=>!e.firstTrickJokerNoGiruda, v=>e.firstTrickJokerNoGiruda=!(v===true||v==='true')));
  b.append(segRow(t('조커콜 시 마이티 보호'),t('조커 보유자가 마이티를 내어 조커를 지킬 수 있음'), ONOFF(),
    ()=>e.jokerCallMightyProtect!==false, v=>e.jokerCallMightyProtect=(v===true||v==='true')));
  // 스코어링
  b.append(el('div','set-sec',t('스코어링 (엑셀 리그 수식)')));
  b.append(stepRow(t('공약 단가'),t('(목표−13) × 단가'), ()=>sc.perBid, v=>sc.perBid=v, 100, 600, 100));
  b.append(stepRow(t('초과·미달 단가'),t('(획득−목표) × 단가'), ()=>sc.perDiff, v=>sc.perDiff=v, 100, 600, 100));
  b.append(segRow(t('노기루다 배수'),'', [{v:1,l:'×1'},{v:2,l:'×2'},{v:3,l:'×3'}], ()=>sc.noGirudaMult, v=>sc.noGirudaMult=v));
  b.append(stepRow(t('상금 캡'),t('런은 캡 금액 고정 지급'), ()=>sc.cap, v=>sc.cap=v, 1000, 5000, 500, x=>'±'+num(x)));
  b.append(stepRow(t('노기루다 캡'),'', ()=>sc.noGirudaCap, v=>sc.noGirudaCap=v, 1000, 6000, 500, x=>'±'+num(x)));
  b.append(segRow(t('주공 배분'),'', [{v:1,l:'×1'},{v:2,l:'×2'},{v:3,l:'×3'}], ()=>sc.declarerShare, v=>sc.declarerShare=v));
  b.append(segRow(t('셀프(노프렌드) 배분'),'', [{v:2,l:'×2'},{v:4,l:'×4'},{v:6,l:'×6'}], ()=>sc.selfDeclarerShare, v=>sc.selfDeclarerShare=v));
  b.append(segRow(t('프렌드 배분'),'', [{v:0,l:'×0'},{v:1,l:'×1'},{v:2,l:'×2'}], ()=>sc.friendShare, v=>sc.friendShare=v));
  const note = el('div','hint',t('설정은 자동 저장되며, 진행 중인 판이 있으면 다음 판부터 적용됩니다. 배분 변경 시 제로섬이 깨질 수 있습니다(주공×n + 프렌드×m − 야당×3).'));
  note.style.padding='10px 0'; b.append(note);
  // 진행이 꼬였을 때의 탈출구 겸 매치 초기화
  b.append(el('div','set-sec',t('게임')));
  const ngRow = el('div','btnrow'); ngRow.style.margin='4px 0 2px';
  const ng = el('button','btn quiet', t('새 게임'));
  ng.onclick = async ()=>{
    if (modalResolve){ toast(t('먼저 진행 중인 선택을 마쳐주세요')); return; }
    // 확인 모달(#modal, z=40)이 설정 패널(z=70)에 가리므로 패널을 먼저 닫는다
    closeSettingsPanel();
    const ok = (roundNo===0) ||
      await confirmModal(t('새 게임'), t('지금 판을 버리고 처음부터 다시 시작합니다.'), t('새 게임'), t('취소'));
    if (!ok){ openSettings(); return; }
    if (replay) closeReplay();
    buildAgents();
    newMatch();
  };
  ngRow.append(ng); b.append(ngRow);
  b.append(el('div','hint',t('현재 매치를 끝내고 좌석 성향을 새로 배정합니다.')));
}
function openSettings(){ renderSettings(); $('#settings').classList.add('show'); }
function closeSettingsPanel(){ $('#settings').classList.remove('show'); applyNames(); saveSettings(); }
function closeSettings(){
  $('#settings').classList.remove('show');
  applyNames(); buildAgents(); saveSettings();
  if (game && game.phase && game.phase!=='done' && roundNo>0) toast(t('룰 변경은 다음 판부터 적용됩니다'));
}

let totals=[0,0,0,0,0];
let settledRound=false, settleLogged=false;   // 라운드 정산 1회 반영 보장
// 성향은 매치 시작 시 좌석마다 무작위 배정되고 매치 내내 고정된다 (UI에는 노출하지 않음)
let botTable = null;
const TIER_OF = { normal:'intermediate', hard:'advanced', easy:'intermediate',
                  intermediate:'intermediate', advanced:'advanced', master:'master' };
let agents = [null, null, null, null, null];
let agentsReady = false;
/* ---- 마스터 티어(신경망) ---- */
let masterState='idle';       // idle | loading | ready | failed
let masterSess=null, ortLib=null;
const MASTER_MODEL='./model/mighty_master_v6.onnx';
const ORT_LOCAL='./ort/ort.wasm.min.js';                      // 번들 동봉(오프라인 가능)
const ORT_CDN='https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';
function loadScript(src){
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src=src; s.onload=res; s.onerror=()=>rej(new Error('script load failed'));
    document.head.appendChild(s);
  });
}
async function ensureMaster(){
  if (masterState==='ready'||masterState==='loading') return masterState==='ready';
  masterState='loading'; renderSettings();
  toast(t('마스터 AI 로딩 중… (최초 1회, 약 16MB)'), 2600);
  try{
    if (!window.ort){
      try{ await loadScript(ORT_LOCAL); }         // 로컬 번들 우선
      catch(e){ await loadScript(ORT_CDN); }      // 없으면 CDN 폴백
    }
    ortLib=window.ort;
    if (!ortLib) throw new Error('onnxruntime unavailable');
    try{
      ortLib.env.wasm.wasmPaths = new URL('./ort/', document.baseURI).href;
      ortLib.env.wasm.numThreads = 1;            // COOP/COEP 헤더 없는 정적 호스팅 대응
    }catch(e){}
    masterSess=await MightyAI.loadMaster(ortLib, MASTER_MODEL);
    masterState='ready';
    await buildAgents();
    toast(t('마스터 AI 준비 완료'), 1600);
  }catch(e){
    masterState='failed';
    await buildAgents();
    toast(t('마스터 AI 로드 실패 — 고급 전략으로 진행합니다'), 2600);
  }
  renderSettings();
  return masterState==='ready';
}
function masterActive(){ return currentTier()==='master'; }
function currentTier(){
  const d = settings.ui.difficulty || 'intermediate';
  const tier = TIER_OF[d] || 'intermediate';
  if (tier==='master' && masterState!=='ready') return 'advanced';   // 폴백
  return tier;
}
async function buildAgents(reassign){
  const tier = currentTier();
  if (reassign || !botTable || botTable.tier !== tier){
    botTable = await MightyAI.createTable({
      tiers: [tier, tier, tier, tier, tier],
      rng: Math.random, session: masterSess, ort: ortLib,
    });
    botTable.tier = tier;
  }
  for (let p=1; p<5; p++) agents[p] = botTable.agents[p];
  agentsReady = true;
}
let busy=false;        // 봇/애니메이션 진행 중
let ghost=null;        // 트릭 완료 연출용 스냅샷

/* ---------------- 카드 렌더 ---------------- */
function cardEl(c){
  if (E.isJoker(c)){
    const d=el('div','cardface joker');
    d.append(el('div','idx','JOKER'), el('div','pip','★'));
    return d;
  }
  const d=el('div','cardface '+suCls(c.suit));
  const rn={11:'J',12:'Q',13:'K',14:'A'}[c.rank]||c.rank;
  d.append(el('div','idx',`${rn}<small>${SUIT_GLYPH[c.suit]}</small>`), el('div','pip',SUIT_GLYPH[c.suit]));
  return d;
}
function suitHtml(g){ return g==='N' ? '<b>노기루다</b>' : `<b class="${SUIT_RED[g]?'':''}">${SUIT_GLYPH[g]}</b>`; }
function contractText(ct){ return ct ? `${ct.count}${gLabel(ct.giruda)}` : ''; }
function g2ko(g){ return {S:'♠',D:'♦',H:'♥',C:'♣',N:'노'}[g]; }
function sortHand(h){
  const order={S:0,D:1,C:2,H:3};
  return h.slice().sort((a,b)=>{
    if (E.isJoker(a)) return 1; if (E.isJoker(b)) return -1;
    if (a.suit!==b.suit) return order[a.suit]-order[b.suit];
    return b.rank-a.rank;
  });
}

/* ---------------- 로그/토스트 ---------------- */
function logLine(html){
  const li=el('li','',html); $('#log-list').prepend(li);
}
let toastT=null;
function toast(msg, ms=1600){
  const el_=$('#toast'); el_.textContent=msg; el_.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>el_.classList.remove('show'), ms);
}
function bubble(p, text){
  const b=$(`#seat-${p} .bubble`); if(!b) return;
  b.textContent=text; b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'), 1300);
}

/* ---------------- 좌석 렌더 ---------------- */
function buildSeats(){
  const wrap=$('#seats'); wrap.innerHTML='';
  for(let p=0;p<5;p++){
    const s=el('div','seat'); s.id='seat-'+p;
    s.innerHTML=`
      <div class="bubble"></div>
      <div class="plate">
        <div class="avatar">${p===HUMAN?'나':'AI'}</div>
        <div><div class="name">${NAMES[p]}</div><div class="meta" id="meta-${p}"></div></div>
      </div>
      <div class="badges" id="badges-${p}"></div>
      ${p!==HUMAN?`<div class="backs" id="backs-${p}"></div>`:''}
      <div class="pile" id="pile-${p}"></div>`;
    wrap.append(s);
  }
}
function renderSeats(){
  const inPlay = game && game.phase==='play';
  for(let p=0;p<5;p++){
    const seat=$('#seat-'+p);
    seat.classList.toggle('turn', game && game.currentPlayer===p && game.phase!=='done');
    const meta=$('#meta-'+p);
    if (inPlay){
      meta.textContent=tf('seatMeta', game.play.tricksWon[p], game.play.capturedPoints[p]);
    } else meta.textContent = p!==HUMAN ? t(TIER_LABEL_KO[currentTier()]) : '';
    // 손패 백
    if (p!==HUMAN){
      const bk=$('#backs-'+p); bk.innerHTML='';
      const n=game && game.hands[p] ? game.hands[p].length : 0;
      for(let i=0;i<n;i++) bk.append(el('div','mini'));
    }
    // 배지
    const bd=$('#badges-'+p); bd.innerHTML='';
    if (game && game.declarer===p && game.phase!=='bidding') bd.append(el('span','badge decl',t('주공')));
    if (game && game.friendRevealed && game.friend===p) bd.append(el('span','badge friend',t('프렌드')));
    else if (p===HUMAN && game && game.friendDecl && game.friendDecl.mode==='card' && !game.friendRevealed
             && game.hands[HUMAN].some(c=>E.sameCard(c, game.friendDecl.card)))
      bd.append(el('span','badge friend-secret',t('프렌드(비공개)')));
    const tot=totals[p];
    const tb=el('span','badge total'+(tot>0?' plus':tot<0?' minus':''), (tot>0?'+':'')+num(tot));
    bd.append(tb);
    // 획득 점수카드 더미
    const pile=$('#pile-'+p); pile.innerHTML='';
    if (inPlay){
      const cards=game.play.capturedCards[p];
      // 여당(주공·공개된 프렌드)의 더미는 본인에게도 덮어서 표시 (실제 룰)
      const hidden = (p===game.declarer) || (game.friendRevealed && game.friend===p);
      const showFaces = !hidden;
      for(const c of cards){
        if (showFaces){
          const rn={11:'J',12:'Q',13:'K',14:'A'}[c.rank]||c.rank;
          pile.append(el('div','pcard '+suCls(c.suit), `${rn}${SUIT_GLYPH[c.suit]}`));
        } else pile.append(el('div','pcard back','M'));
      }
    }
  }
}

/* ---------------- HUD ---------------- */
function renderHud(){
  const M=settings.match;
  const prog = M.mode==='rounds' ? tf('hudRounds', roundNo, M.rounds)
             : M.mode==='target' ? tf('hudTarget', roundNo, M.targetPrize) : tf('hudPlain', roundNo);
  $('#hud-round').innerHTML = roundNo?tf('hudDealer', prog, NAMES[dealer]):'';
  const ct=game&&game.contract;
  $('#hud-contract').innerHTML = ct?tf('hudContract', contractText(ct), NAMES[game.declarer]):'';
  if (ct) $('#hud-contract').innerHTML += friendDeclText();
  if (game && game.phase==='play'){
    const k=teamPointsKnown();
    $('#hud-score').innerHTML=tf('hudScore', k.ruling, k.friendKnown?'':'+?', k.opp, k.friendKnown?'':'+?', game.play.trickNo);
  } else $('#hud-score').innerHTML='';
}
function teamPointsKnown(){
  // 플레이어(사람) 관점의 공개 정보만 사용: 숨은 프렌드 점수를 유출하지 않음
  const cp=game.play.capturedPoints;
  const known=[game.declarer];
  let ruling=cp[game.declarer], friendKnown=false;
  if (HUMAN===game.declarer && game.discard)
    ruling += game.discard.filter(c=>E.isPointCard(c)).length;  // 여당 귀속 룰: 주공은 묻은 점수 인지
  if (game.friendRevealed){
    if (game.friend!==null){ ruling+=cp[game.friend]; known.push(game.friend); }
    friendKnown=true;
  } else if (game.friendDecl && game.friendDecl.mode==='card' &&
             game.hands[HUMAN].some(c=>E.sameCard(c, game.friendDecl.card))){
    ruling+=cp[HUMAN]; known.push(HUMAN); friendKnown=true; // 내가 숨은 프렌드
  }
  let opp=0, unk=0;
  for(let p=0;p<5;p++){
    if (known.includes(p)) continue;
    if (friendKnown || p===HUMAN) opp+=cp[p]; else unk+=cp[p];
  }
  return {ruling, opp, unk, friendKnown};
}
function friendDeclText(){
  const fd=game.friendDecl;
  if (!fd) return '';
  if (fd.mode==='none') return t(' · 노프렌드');
  if (fd.mode==='first'){
    if (!game.friendRevealed) return tf('fdFirstUnknown');
    return game.friend===null ? t(' · 초구(주공 셀프)') : tf('fdKnown', NAMES[game.friend]);
  }
  if (!game.friendRevealed) return tf('fdHidden', cardLabel(fd.card));
  return game.friend===null ? tf('fdSelf', cardLabel(fd.card))
                           : tf('fdKnownCard', cardLabel(fd.card), NAMES[game.friend]);
}

/* ---------------- 공약 퍽 ---------------- */
let bidFlash=null;   // {player, count, giruda} — 비딩 중 중앙 표시
function announceBid(p, count, giruda){
  const seat=$('#seat-'+p);
  if (seat){ seat.classList.remove('announce'); void seat.offsetWidth; seat.classList.add('announce'); }
  bidFlash={player:p, count, giruda};
  renderPuck();
  const pk=$('#puck'); pk.classList.remove('flash'); void pk.offsetWidth; pk.classList.add('flash');
  setTimeout(()=>{ if(bidFlash && bidFlash.player===p){ bidFlash=null; renderPuck(); } }, 1200);
}
function renderPuck(){
  const pk=$('#puck');
  if (game && game.phase==='bidding' && bidFlash){
    const g=bidFlash.giruda;
    pk.innerHTML=`<div class="top"><span class="g ${suCls(g)}">${g==='N'?'NT':SUIT_GLYPH[g]}</span><span class="c">${bidFlash.count}</span></div>
      <div class="who">${NAMES[bidFlash.player]}</div>`;
    pk.classList.add('show');
    return;
  }
  if (!game || !game.contract || game.phase==='bidding'){ pk.classList.remove('show'); return; }
  const g=game.contract.giruda;
  const fd=game.friendDecl;
  let fk=t('프렌드'), fv=LANG==='en'?'—':'—', fc='dim';
  if (fd){
    if (fd.mode==='none'){ fv=t('노프렌드'); fc='dim'; }
    else if (game.friendRevealed && game.friend!==null){ fv=NAMES[game.friend]; fc='mint'; }
    else if (game.friendRevealed && game.friend===null){ fv=LANG==='en'?'solo':t('셀프'); fc='dim'; }
    else if (fd.mode==='card'){ fv=cardLabel(fd.card); fc='gold'; }
    else if (fd.mode==='first'){ fv=LANG==='en'?'first trick':t('초구'); fc='gold'; }
  }
  pk.innerHTML=`
    <div class="top"><span class="g ${suCls(g)}">${g==='N'?'NT':SUIT_GLYPH[g]}</span><span class="c">${game.contract.count}</span></div>
    <div class="lbl">${LANG==='en'?'CONTRACT':'공약'}</div>
    <div class="rows">
      <div class="row"><span class="k">${t('주공')}</span><span class="v gold">${NAMES[game.declarer]}</span></div>
      <div class="row"><span class="k">${fk}</span><span class="v ${fc}">${fv}</span></div>
    </div>`;
  pk.classList.add('show');
}

/* ---------------- 트릭 렌더 ---------------- */
function renderTrick(){
  const tr=$('#trick'); tr.innerHTML='';
  const plays = ghost ? ghost.plays : (game && game.play ? game.play.table : []);
  const winner = ghost ? ghost.winner : null;
  for(const e of plays){
    const slot=el('div','slot'+(winner===e.player?' win':'')); slot.dataset.s=e.player;
    const c=cardEl(e.card);
    slot.append(c);
    if (e.jokerSuit){
      const tag=el('div','', SUIT_GLYPH[e.jokerSuit]);
      tag.className=suCls(e.jokerSuit);
      tag.style.cssText='position:absolute;top:4px;right:6px;font-size:.75rem;font-weight:700;';
      c.append(tag);
    }
    tr.append(slot);
  }
}

/* ---------------- 손패 렌더 ---------------- */
let selDiscard=[];  // 바닥패 교환 선택
function renderHand(){
  const wrap=$('#hand'); wrap.innerHTML='';
  if (!game || !game.hands[HUMAN]) return;
  const sorted=sortHand(game.hands[HUMAN]);
  const phase=game.phase;
  let legalSet=null;
  if (phase==='play' && game.currentPlayer===HUMAN && !busy){
    legalSet=new Set(game._legalPlays(HUMAN).map(m=>E.cardId(m.card)));
  }
  for(const c of sorted){
    const h=el('div','hcard'); h.append(cardEl(c));
    const id=E.cardId(c);
    if (phase==='floor' && game.currentPlayer===HUMAN){
      h.classList.add('legal');
      if (game.floorOriginal && game.floorOriginal.some(f=>E.sameCard(f,c)) &&
          !selDiscard.some(s=>E.sameCard(s,c))) h.append(el('div','from-floor'));
      if (selDiscard.some(s=>E.sameCard(s,c))) h.classList.add('sel');
      h.onclick=()=>{ toggleDiscard(c); };
    } else if (legalSet){
      if (legalSet.has(id)){ h.classList.add('legal'); h.onclick=()=>humanPlay(c); }
      else h.classList.add('dim');
    }
    wrap.append(h);
  }
}
function toggleDiscard(c){
  const i=selDiscard.findIndex(s=>E.sameCard(s,c));
  if (i>=0) selDiscard.splice(i,1);
  else if (selDiscard.length<3) selDiscard.push(c);
  renderHand(); renderSheet();
}

/* ---------------- 액션 시트 ---------------- */
let bidSel={giruda:null,count:null};
let reviseSel={on:false, giruda:null, count:null};
function renderSheet(){
  const sh=$('#sheet');
  if (!game || busy){ sh.classList.remove('show'); return; }
  const phase=game.phase, cur=game.currentPlayer;
  if (cur!==HUMAN || !['bidding','floor','friend'].includes(phase)){ sh.classList.remove('show'); return; }
  sh.classList.add('show'); sh.innerHTML='';
  if (phase==='bidding') sheetBidding(sh);
  else if (phase==='floor') sheetFloor(sh);
  else if (phase==='friend') sheetFriend(sh);
}
function sheetBidding(sh){
  const best=game.bidding.best;
  sh.append(el('h3','', t('공약 선언')),
    el('div','hint', best?tf('bidBest', NAMES[best.player], best.count, best.giruda):tf('bidFirst', game.config.minBid)));
  const suits=el('div','chips');
  for(const g of ['S','D','H','C','N']){
    const b=el('button','chip '+suCls(g)+(bidSel.giruda===g?' on':''), g==='N'?t('노기루다'):SUIT_GLYPH[g]+' '+t({S:'스페이드',D:'다이아',H:'하트',C:'클로버'}[g]||''));
    b.onclick=()=>{
      bidSel.giruda=g;
      const av=game.legalActions().filter(a=>a.type==='bid'&&a.giruda===g).map(a=>a.count);
      bidSel.count = av.length ? Math.min(...av) : null;   // 최소 필요 공약 자동 선택
      renderSheet();
    };
    suits.append(b);
  }
  sh.append(suits);
  const counts=el('div','chips');
  const legal=game.legalActions().filter(a=>a.type==='bid');
  const av=g=>legal.filter(a=>a.giruda===g).map(a=>a.count);
  const list=bidSel.giruda?av(bidSel.giruda):[];
  const lo=game.config.minBid - game.config.noGirudaBidDiscount;
  for(let c=lo;c<=20;c++){
    const b=el('button','chip'+(bidSel.count===c?' on':''), c);
    b.disabled=!list.includes(c);
    b.onclick=()=>{ bidSel.count=c; renderSheet(); };
    counts.append(b);
  }
  sh.append(counts);
  if (bidSel.giruda && bidSel.count)
    sh.append(el('div','hint', tf('bidPlan', bidSel.count, bidSel.giruda)));
  const row=el('div','btnrow');
  if (game.dealMissEligible(HUMAN)){
    const dm=el('button','btn quiet',t('딜미스'));
    dm.onclick=()=>humanAct({type:'dealMiss'}, tf('logMisdealVal', NAMES[HUMAN], E.dealMissValue(game.hands[HUMAN])));
    row.append(dm);
  }
  const ready=!!(bidSel.giruda&&bidSel.count);
  const pass=el('button','btn '+(ready?'quiet':'ghost'),t('패스'));
  pass.onclick=()=>humanAct({type:'pass'}, tf('logPass', NAMES[HUMAN]));
  const go=el('button','btn primary'+(ready?' ready':''), ready?tf('bidBtn', bidSel.count, bidSel.giruda):t('공약 선언'));
  go.disabled=!ready;
  go.onclick=()=>{
    const c=bidSel.count, gg=bidSel.giruda;
    humanAct({type:'bid',count:c,giruda:gg}, tf('logBid', NAMES[HUMAN], c, gg));
    announceBid(HUMAN, c, gg);
  };
  row.append(pass,go); sh.append(row);
  if (!bidSel.giruda) sh.append(el('div','hint',t('무늬를 선택하면 최소 공약이 자동 지정됩니다.')));
}
function sheetFloor(sh){
  sh.append(el('h3','',t('바닥패 교환')),
    el('div','hint',t('바닥패 3장이 손패에 합쳐졌습니다(● 표시). 묻을 3장을 선택하세요. 묻은 점수카드는 여당에 귀속됩니다.')));
  // 공약 수정
  const cur=game.contract;
  const revRow=el('div','chips');
  const revBtn=el('button','chip'+(reviseSel.on?' on':''),t('공약 수정'));
  revBtn.onclick=()=>{
    reviseSel.on=!reviseSel.on;
    if (reviseSel.on){ reviseSel.giruda=cur.giruda; reviseSel.count=cur.count; } // 기본: 현재 공약 유지
    renderSheet();
  };
  revRow.append(revBtn);
  sh.append(revRow);
  if (reviseSel.on){
    const suits=el('div','chips');
    for(const g of ['S','D','H','C','N']){
      const min = g===cur.giruda?cur.count : cur.count+(g==='N'?game.config.toNoGirudaChangeCost:game.config.girudaChangeCost);
      const b=el('button','chip '+suCls(g)+(reviseSel.giruda===g?' on':''), (g==='N'?t('노'):SUIT_GLYPH[g])+`·${min}+`);
      b.disabled=min>20;
      b.onclick=()=>{ reviseSel.giruda=g; reviseSel.count=min; renderSheet(); }; // 최소값 자동 선택
      suits.append(b);
    }
    sh.append(suits);
    if (reviseSel.giruda){
      const g=reviseSel.giruda;
      const min = g===cur.giruda?cur.count : cur.count+(g==='N'?game.config.toNoGirudaChangeCost:game.config.girudaChangeCost);
      const counts=el('div','chips');
      for(let c=min;c<=20;c++){
        const b=el('button','chip'+(reviseSel.count===c?' on':''),c);
        b.onclick=()=>{ reviseSel.count=c; renderSheet(); };
        counts.append(b);
      }
      sh.append(counts);
    }
  }
  if (reviseSel.on)
    sh.append(el('div','hint', reviseSel.giruda===cur.giruda&&reviseSel.count===cur.count
      ? t('현재 공약 유지 상태입니다. 그대로 묻기를 눌러도 됩니다.')
      : tf('bidPlan', reviseSel.count, reviseSel.giruda)));
  const row=el('div','btnrow');
  const go=el('button','btn primary',tf('buryBtn', selDiscard.length));
  go.disabled=selDiscard.length!==3;
  go.onclick=()=>{
    const act={type:'exchange', discard:selDiscard.slice()};
    let msg=tf('logExchangeDone', NAMES[HUMAN]);
    const changed = reviseSel.on && reviseSel.giruda && reviseSel.count &&
      !(reviseSel.giruda===cur.giruda && reviseSel.count===cur.count);
    if (changed){ act.revise={count:reviseSel.count,giruda:reviseSel.giruda}; msg+=tf('logRevise', reviseSel.count, reviseSel.giruda); }
    selDiscard=[]; reviseSel={on:false,giruda:null,count:null};
    humanAct(act, msg);
  };
  row.append(go); sh.append(row);
}
let friendCustom=false, friendSuit='S';
function sheetFriend(sh){
  sh.append(el('h3','',t('프렌드 지정')));
  const hand=game.hands[HUMAN];
  const m=game.mightyCard;
  const quick=el('div','chips');
  const has=c=>hand.some(h=>E.sameCard(h,c));
  const mk=(label,act,dis)=>{ const b=el('button','chip',label); b.disabled=!!dis; b.onclick=act; return b; };
  quick.append(mk(tf('mightyFriend', cardLabel(m)), ()=>callFriend({type:'friend',mode:'card',card:m},tf('cardFriend', t('마이티'))), has(m)));
  quick.append(mk(t('조커'), ()=>callFriend({type:'friend',mode:'card',card:E.JOKER},t('조커 프렌드')), has(E.JOKER)));
  if (game.contract.giruda!=='N'){
    const gA={suit:game.contract.giruda, rank:14};
    if (!E.sameCard(gA,m)) quick.append(mk(t('기루다 A'), ()=>callFriend({type:'friend',mode:'card',card:gA},tf('cardFriend', t('기루다 A'))), has(gA)));
  }
  quick.append(mk(t('초구 프렌드'), ()=>callFriend({type:'friend',mode:'first'},t('초구 프렌드'))));
  quick.append(mk(t('노프렌드'), ()=>callFriend({type:'friend',mode:'none'},t('노프렌드'))));
  quick.append(mk(t('직접 선택')+(friendCustom?' ▲':' ▼'), ()=>{ friendCustom=!friendCustom; renderSheet(); }));
  sh.append(quick);
  if (friendCustom){
    const suits=el('div','chips');
    for(const g of ['S','D','H','C']){
      const b=el('button','chip '+suCls(g)+(friendSuit===g?' on':''), SUIT_GLYPH[g]);
      b.onclick=()=>{ friendSuit=g; renderSheet(); };
      suits.append(b);
    }
    sh.append(suits);
    const ranks=el('div','chips');
    for(const r of [14,13,12,11,10,9,8,7,6,5,4,3,2]){
      const card={suit:friendSuit, rank:r};
      const b=el('button','chip '+suCls(friendSuit), {11:'J',12:'Q',13:'K',14:'A'}[r]||r);
      b.disabled=hand.some(h=>E.sameCard(h,card));
      b.onclick=()=>callFriend({type:'friend',mode:'card',card},tf('cardFriend', cardLabel(card)));
      ranks.append(b);
    }
    sh.append(ranks);
  }
  sh.append(el('div','hint',t('자신이 가진 카드는 부를 수 없습니다. 프렌드는 해당 카드가 나올 때 공개됩니다.')));
}
function callFriend(act,label){
  friendCustom=false;
  humanAct(act, tf('logFriendDecl', NAMES[HUMAN], label));
  const fd=game.friendDecl;
  if (fd.mode==='card') toast(tf('friendCardToast', cardLabel(fd.card)));
}

/* ---------------- 사람 액션 ---------------- */
function humanAct(action, logHtml){
  try{ game.act(action); }
  catch(e){ toast(t('그 수는 둘 수 없습니다')); busy=false; render(); pump(); return; }
  if (logHtml) logLine(logHtml);
  bidSel={giruda:null,count:null};
  render(); pump();
}
async function humanPlay(card){
  const myGen=stateGen;                       // 모달 대기 중 되돌리기·새 라운드가 끼어들 수 있다
  const stale = () => myGen!==stateGen || !game || game.phase!=='play' ||
                      game.play.turn!==HUMAN || !game.hands[HUMAN].some(c=>E.sameCard(c,card));
  if (stale()) return;
  const leading = game.play.table.length===0;
  let action={type:'play', card};
  if (E.isJoker(card) && leading){
    const s=await pickSuit(t('조커 선출 — 요구할 무늬'));
    if (!s || stale()) { render(); pump(); return; }
    action.jokerSuit=s;
  }
  if (leading && E.sameCard(card, game.jokerCallCard) &&
      game._legalPlays(HUMAN).some(m=>m.jokerCall && E.sameCard(m.card,card))){
    // 조커콜이 의미 있는 상황일 때만 묻는다 (조커가 이미 나왔거나 내가 들고 있으면 무의미)
    if (jokerCallUseful()){
      const jc=await confirmModal(t('조커콜'), tf('jokerCallAsk', cardLabel(card)), t('조커콜 선언'), t('그냥 내기'));
      if (jc===null || stale()) { render(); pump(); return; }
      if (jc) action.jokerCall=true;
    }
  }
  // 최종 합법성 재확인 (엔진 예외 대신 조용히 무시)
  const ok = game._legalPlays(HUMAN).some(m =>
    E.sameCard(m.card, action.card) &&
    (!!m.jokerCall === !!action.jokerCall) &&
    (m.jokerSuit===undefined || m.jokerSuit===action.jokerSuit));
  if (!ok){ render(); pump(); return; }
  await playWithAnimation(HUMAN, action);
}

/** 조커콜이 실효성 있는가 — 내 시점 공개 정보만 사용 */
function jokerCallUseful(){
  if (!game || !game.play) return false;
  if (game.hands[HUMAN].some(E.isJoker)) return false;              // 내가 조커 보유 → 무의미
  for (const tr of game.play.history) for (const e of tr.plays) if (E.isJoker(e.card)) return false;
  for (const e of game.play.table) if (E.isJoker(e.card)) return false;   // 이미 출현 → 무의미
  if (HUMAN===game.declarer && game.discard && game.discard.some(E.isJoker)) return false; // 내가 묻음
  return true;
}

/* ---------------- 모달 유틸 ---------------- */
let modalResolve = null;         // 열려 있는 모달을 외부에서 취소하기 위한 핸들
function cancelOpenModal(){
  if (modalResolve){ const r=modalResolve; modalResolve=null; $('#modal').classList.remove('show'); r(null); }
}
function pickSuit(title){
  return new Promise(res=>{
    modalResolve = res;
    const box=$('#modal-box');
    box.innerHTML=`<h2>${title}</h2><div class="sub">${tf('suitFollow')}</div>`;
    const chips=el('div','chips');
    for(const g of ['S','D','H','C']){
      const b=el('button','chip '+suCls(g), SUIT_GLYPH[g]+' '+t({S:'스페이드',D:'다이아',H:'하트',C:'클로버'}[g]));
      b.style.fontSize='1rem';
      b.onclick=()=>{ close(); res(g); };
      chips.append(b);
    }
    const cancel=el('button','btn ghost',t('취소')); cancel.style.marginTop='14px';
    cancel.onclick=()=>{ close(); res(null); };
    box.append(chips,cancel);
    $('#modal').classList.add('show');
    function close(){ modalResolve=null; $('#modal').classList.remove('show'); }
  });
}
function confirmModal(title, html, yes, no){
  return new Promise(res=>{
    modalResolve = res;
    const box=$('#modal-box');
    box.innerHTML=`<h2>${title}</h2><div class="sub">${html}</div>`;
    const row=el('div','btnrow');
    const n=el('button','btn ghost',no); n.onclick=()=>{ close(); res(false); };
    const y=el('button','btn primary',yes); y.onclick=()=>{ close(); res(true); };
    row.append(n,y); box.append(row);
    $('#modal').classList.add('show');
    function close(){ modalResolve=null; $('#modal').classList.remove('show'); }
  });
}

/* ---------------- 플레이 + 애니메이션 ---------------- */
function seatAnchor(p){
  const s=$('#seat-'+p);
  const r=s.getBoundingClientRect();
  return {x:r.left+r.width/2, y:r.top+r.height/2};
}
function slotAnchor(p){
  // 슬롯 위치 계산: 임시 슬롯 생성해 측정
  const tr=$('#trick');
  const tmp=el('div','slot'); tmp.dataset.s=p; tmp.style.visibility='hidden';
  tr.append(tmp);
  const r=tmp.getBoundingClientRect(); tmp.remove();
  return {x:r.left+r.width/2, y:r.top+r.height/2, rot:{0:0,1:-7,2:-3,3:3,4:7}[p]};
}
async function playWithAnimation(p, action){
  const myGen=stateGen;
  busy=true; renderSheet();
  const completesTrick = game.play.table.length===4;
  const ledBefore = game.play.ledSuit, tlenBefore = game.play.table.length;
  try{ game.act(action); }
  catch(e){ toast(t('그 수는 둘 수 없습니다')); busy=false; render(); pump(); return; }
  const played = action.card;
  // 사운드: 특이 상황 우선순위
  {
    const g=game.contract.giruda;
    if (action.jokerCall) SFX.jokerCall();
    if (E.isJoker(played)) SFX.joker();
    else if (E.sameCard(played, game.mightyCard)) SFX.mighty();
    else if (g!=='N' && played.suit===g){
      if (!trumpSeenThisRound){ trumpSeenThisRound=true; SFX.firstTrump(); }
      else if (tlenBefore>0 && ledBefore && ledBefore!==g) SFX.trumpCut();
      else SFX.play();
    } else SFX.play();
  }
  logLine(tf('logPlay', `<b>${NAMES[p]}</b>`, cardLabel(played), !!action.jokerCall, action.jokerSuit?SUIT_GLYPH[action.jokerSuit]:''));
  if (action.jokerCall) toast(t('조커콜! 조커 보유자는 조커를 내야 합니다'));

  if (completesTrick){
    const h=game.play.history[game.play.history.length-1];
    ghost={plays:h.plays, winner:null};
  }
  // 비행 애니메이션 (세팅 자동 진행 중에는 생략)
  if (!REDUCED && !claimMode){
    const from=seatAnchor(p), to=slotAnchor(p);
    const f=cardEl(played); f.classList.add('fly');
    f.style.left='0px'; f.style.top='0px';
    f.style.transform=`translate(${from.x-32}px, ${from.y-45}px) scale(.6)`;
    $('#fx').append(f);
    requestAnimationFrame(()=>{ f.style.transform=`translate(${to.x-32}px, ${to.y-45}px) rotate(${to.rot}deg)`; });
    await sleep(300); f.remove();
  }
  render();
  if (myGen!==stateGen){ busy=false; return; }
  if (completesTrick){
    const h=game.play.history[game.play.history.length-1];
    await sleep(claimSpeed().pre);
    if (myGen!==stateGen){ busy=false; return; }
    ghost={plays:h.plays, winner:h.winner};
    renderTrick();
    logLine(tf('logTrick', h.trickNo, NAMES[h.winner], h.points));
    await sleep(claimSpeed().show);
    // 수거 애니메이션
    if (!REDUCED && !claimMode){
      const to=seatAnchor(h.winner);
      document.querySelectorAll('#trick .slot').forEach(sl=>{
        const r=sl.getBoundingClientRect();
        const f=sl.firstChild; if(!f) return;
        f.classList.add('fly');
        f.style.position='fixed'; f.style.left='0'; f.style.top='0'; f.style.margin='0';
        f.style.transform=`translate(${r.left}px, ${r.top}px)`;
        $('#fx').append(f);
        requestAnimationFrame(()=>{ f.style.transform=`translate(${to.x-28}px, ${to.y-40}px) scale(.3)`; f.style.opacity='0'; });
        setTimeout(()=>f.remove(), claimSpeed().collect);
      });
      await sleep(claimSpeed().collect);
    }
    SFX.collect();
    ghost=null;
    render();
    if (game.friendRevealed && game.friendDecl && game.friendDecl.mode==='first' && game.play.history.length===1){
      toast(game.friend===null?t('초구를 주공이 승리 — 사실상 노프렌드'):tf('friendToast', NAMES[game.friend]));
    }
  }
  busy=false;
  render(); pump();
}

/* ---------------- 사운드 (Web Audio 합성) ---------------- */
const SFX = (() => {
  let ctx = null;
  const on = () => settings.ui.sound !== false;
  function ac(){
    try{
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }catch(e){ return null; }
  }
  function tone({f=440, f2=null, type='sine', dur=0.18, vol=0.25, delay=0}){
    const c=ac(); if(!c||!on()) return;
    try{
      const t0=c.currentTime+delay;
      const o=c.createOscillator(), g=c.createGain();
      o.type=type; o.frequency.setValueAtTime(f,t0);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0+dur);
      g.gain.setValueAtTime(0,t0);
      g.gain.linearRampToValueAtTime(vol,t0+0.012);
      g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0+dur+0.02);
    }catch(e){}
  }
  function noiseBurst({dur=0.05, vol=0.3, delay=0, hp=1200, lp=6000}){
    const c=ac(); if(!c||!on()) return;
    try{
      const t0=c.currentTime+delay;
      const len=Math.max(1,Math.floor(c.sampleRate*dur));
      const buf=c.createBuffer(1,len,c.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const src=c.createBufferSource(); src.buffer=buf;
      const h=c.createBiquadFilter(); h.type='highpass'; h.frequency.value=hp;
      const l=c.createBiquadFilter(); l.type='lowpass'; l.frequency.value=lp;
      const g=c.createGain(); g.gain.value=vol;
      src.connect(h).connect(l).connect(g).connect(c.destination);
      src.start(t0);
    }catch(e){}
  }
  return {
    on,
    unlock(){ ac(); },
    shuffle(){ for(let i=0;i<9;i++) noiseBurst({dur:0.045, vol:0.22, delay:i*0.05+Math.random()*0.012, hp:900+Math.random()*1200, lp:6500}); },
    deal(){ for(let i=0;i<5;i++){ noiseBurst({dur:0.03, vol:0.2, delay:i*0.07, hp:2200, lp:8000}); tone({f:660+i*40, dur:0.04, vol:0.05, delay:i*0.07, type:'triangle'}); } },
    play(){ noiseBurst({dur:0.035, vol:0.28, hp:1800, lp:7500}); tone({f:170, dur:0.07, vol:0.12, type:'sine'}); },
    trumpCut(){ noiseBurst({dur:0.035, vol:0.25, hp:1800, lp:7500}); tone({f:294, f2:588, dur:0.16, vol:0.2, type:'sawtooth'}); tone({f:440, f2:880, dur:0.14, vol:0.1, type:'triangle', delay:0.05}); },
    firstTrump(){ tone({f:523, dur:0.12, vol:0.16, type:'triangle'}); tone({f:659, dur:0.12, vol:0.16, type:'triangle', delay:0.09}); tone({f:784, dur:0.2, vol:0.18, type:'triangle', delay:0.18}); },
    mighty(){ tone({f:98, dur:0.4, vol:0.3, type:'sawtooth'}); tone({f:196, dur:0.4, vol:0.18, type:'sawtooth'}); tone({f:392, f2:784, dur:0.3, vol:0.1, type:'triangle', delay:0.08}); },
    joker(){ tone({f:440, f2:560, dur:0.09, vol:0.2, type:'sine'}); tone({f:560, f2:392, dur:0.13, vol:0.2, type:'sine', delay:0.09}); tone({f:392, f2:660, dur:0.12, vol:0.16, type:'sine', delay:0.22}); },
    jokerCall(){ tone({f:880, dur:0.09, vol:0.22, type:'square'}); tone({f:880, dur:0.12, vol:0.22, type:'square', delay:0.15}); },
    collect(){ noiseBurst({dur:0.22, vol:0.16, hp:300, lp:2400}); tone({f:520, f2:260, dur:0.2, vol:0.08, type:'sine'}); },
    winJingle(){ [523,659,784,1047].forEach((f,i)=>tone({f, dur:0.16, vol:0.18, type:'triangle', delay:i*0.11})); },
    loseJingle(){ [392,330,262].forEach((f,i)=>tone({f, dur:0.2, vol:0.16, type:'sine', delay:i*0.13})); },
  };
})();
let trumpSeenThisRound=false;

/* ---------------- 치트시트 HUD ---------------- */
let cheatOpen=false;
function humanSideText(){
  if (!game || !game.friendDecl) return null;
  if (HUMAN===game.declarer) return {t:t('여당 (주공)'), c:'ruling'};
  const fd=game.friendDecl;
  if (game.friendRevealed) return game.friend===HUMAN ? {t:t('여당 (프렌드)'), c:'ruling'} : {t:t('야당'), c:'opp'};
  if (fd.mode==='card')
    return game.hands[HUMAN].some(c=>E.sameCard(c,fd.card)) ? {t:t('여당 (숨은 프렌드)'), c:'ruling'} : {t:t('야당'), c:'opp'};
  if (fd.mode==='first') return {t:t('미정 (초구 프렌드)'), c:'tbd'};
  return {t:t('야당'), c:'opp'};
}
function renderCheat(){
  const box=$('#cheat');
  if (!cheatOpen){ box.classList.remove('show'); return; }
  box.classList.add('show');
  if (!game || !game.contract || !['play','done'].includes(game.phase) && game.phase!=='friend'){
    box.innerHTML='<h4>'+t('치트 시트')+'</h4>'+(LANG==='en'?'Details appear once the contract is set.':'공약 확정 후 정보가 표시됩니다.');
    if (game && game.contract) {} else return;
  }
  if (!game.contract){ return; }
  const ct=game.contract, g=ct.giruda;
  let s=`<h4>${t('내 진영')}</h4>`;
  const side=humanSideText();
  if (side) s+=`<span class="side-tag ${side.c}">${side.t}</span><br>`;
  if (game.phase==='play'){
    const k=teamPointsKnown();
    const needR=Math.max(0, ct.count - k.ruling);
    const needO=Math.max(0, (21-ct.count) - k.opp);
    const q = k.friendKnown?'':(LANG==='en'?` (+${k.unk} unassigned)`:` (+미확정 ${k.unk})`);
    s+=tf('needPts', t('여당'), k.ruling, q, needR)+'<br>';
    s+=tf('needPts', t('야당'), k.opp, q, needO);
    s+=`<div class="hint" style="padding-top:2px">${tf('needNote', ct.count, 21-ct.count)}</div>`;
  }
  // 주요 카드 현황
  const played=[];
  if (game.play){
    for(const t of game.play.history) for(const e of t.plays) played.push(e.card);
    for(const e of game.play.table) played.push(e.card);
  }
  const gone=c=>played.some(x=>E.sameCard(x,c));
  const keyCards=[{n:t('마이티'), c:game.mightyCard},{n:t('조커'), c:E.JOKER}];
  if (g!=='N'){
    const gA={suit:g,rank:14};
    if (!E.sameCard(gA, game.mightyCard)) keyCards.push({n:t('기루다 A'), c:gA});
    keyCards.push({n:t('기루다 K'), c:{suit:g,rank:13}});
  }
  keyCards.push({n:t('조커콜'), c:game.jokerCallCard});
  s+=`<h4>${t('주요 카드')}</h4>`+keyCards.map(k=>{
    const nm=E.isJoker(k.c)?t('조커'):cardLabel(k.c);
    return `<span class="${gone(k.c)?'dead':''}">${k.n} ${nm}</span>`;
  }).join(' · ');
  // 기루다 현황 + 무늬별 잠재 탑카드 (내 시점의 공개 정보만 사용)
  if (game.play){
    const rn=r=>({11:'J',12:'Q',13:'K',14:'A'}[r]||r);
    const seen=new Set(played.map(c=>E.cardId(c)));
    for(const c of game.hands[HUMAN]) seen.add(E.cardId(c));
    const iAmDecl = HUMAN===game.declarer;
    if (iAmDecl && game.discard) for(const c of game.discard) seen.add(E.cardId(c));
    const outTop=(su,n)=>{ const acc=[]; for(let r=14;r>=2&&acc.length<n;r--){ if(!seen.has(su+r)) acc.push(rn(r)); } return acc; };
    if (g!=='N'){
      const playedG=played.filter(c=>!E.isJoker(c)&&c.suit===g).length;
      const mineG=game.hands[HUMAN].filter(c=>!E.isJoker(c)&&c.suit===g).length;
      const discG=iAmDecl&&game.discard?game.discard.filter(c=>c.suit===g).length:0;
      const outside=13-playedG-mineG-discG;
      const tops=outTop(g,3);
      s+=`<h4>${t('기루다 현황')} (${SUIT_GLYPH[g]})</h4>`;
      s+=tf('trumpCount', 13-playedG, mineG, outside);
      s+=tops.length?tf('trumpTop', tops.join(' · ')):tf('trumpGone');
    }
    s+=`<h4>${t('무늬별 잠재 탑카드')}</h4>`+E.SUITS.map(su=>{
      const tp=outTop(su,1);
      return `<span class="tc ${suCls(su)}">${SUIT_GLYPH[su]}</span> ${tp.length?('<b>'+tp[0]+'</b>'):'<span class="dead">'+t('소진')+'</span>'}${su===g?' <span style="color:var(--gold)">★</span>':''}`;
    }).join(' · ');
    s+=`<div class="hint" style="padding-top:2px">${tf('cheatBase', iAmDecl)}</div>`;
  }
  // 트릭별 탑 카드
  if (game.play && game.play.history.length){
    s+=`<h4>${t('트릭별 탑 카드')}</h4>`;
    for(const h of game.play.history){
      const top=h.plays.find(e=>e.player===h.winner).card;
      const nm=E.isJoker(top)?t('조커'):cardLabel(top);
      const red=!E.isJoker(top)&&SUIT_RED[top.suit];
      s+=`<div class="tline"><span>${tf('trickLine', h.trickNo)}</span><span class="tc ${E.isJoker(top)?'su-N':suCls(top.suit)}">${nm}</span><span>${NAMES[h.winner]}${h.points?` · ${h.points}${LANG==='en'?'p':'점'}`:''}</span></div>`;
    }
  }
  box.innerHTML=s;
}

/* ---------------- 세팅(전승 확정) 자동 플레이 ---------------- */
let claimMode=false, claimShown=false, claimBy=null;
const CLAIM_SPD={bot:0, pre:0, show:16, collect:0};
function claimSpeed(){ return claimMode ? CLAIM_SPD : SPD(); }
function sideOf(p){
  if (p===game.declarer) return t('여당');
  if (game.friendRevealed && game.friend===p) return t('여당');
  if (game.friendDecl && game.friendDecl.mode==='card' &&
      game.hands[p] && game.hands[p].some(c=>E.sameCard(c, game.friendDecl.card))) return t('여당');
  return t('야당');
}
function checkClaim(){
  if (claimShown || !game || game.phase!=='play') return false;
  if (settings.ui.autoClaim===false) return false;          // 옵션: 자동 세팅 미사용
  if (11-game.play.trickNo <= 1) return false;              // 마지막 트릭은 그냥 마무리
  const p=game.play.turn;
  if (!game.claimEligible(p)) return false;
  claimShown=true; claimBy=p;
  const left=11-game.play.trickNo;
  const pts=[]; // 남은 점수카드 수
  let remainPts=0;
  for(let q=0;q<5;q++) for(const c of game.hands[q]) if(E.isPointCard(c)) remainPts++;
  busy=true; renderSheet();
  confirmModal(t('세팅 — 전승 확정'),
    tf('claimBody', NAMES[p], sideOf(p), left, remainPts),
    t('자동 진행'), t('직접 플레이')).then(auto=>{
      claimMode=!!auto;
      busy=false;
      if (claimMode) toast(tf('claimToast', NAMES[p]), 1400);
      render(); pump();
    });
  return true;
}
function autoPickForHuman(){
  const legal=game._legalPlays(HUMAN);
  // 세팅 상황: 어떤 카드든 승리 보장 → 낮은 카드부터 소진 (조커 선출은 무늬 자동)
  const scored=legal.map(m=>{
    const c=m.card;
    let v = E.isJoker(c) ? 100 : (E.sameCard(c, game.mightyCard) ? 99 : c.rank);
    return {m, v};
  }).sort((a,b)=>a.v-b.v);
  const mv=scored[0].m;
  const act={type:'play', card:mv.card};
  if (mv.jokerSuit) act.jokerSuit=mv.jokerSuit;
  return act;
}

/** 비딩 시 '고민하는' 연출 — 좌석 강조 + 말풍선 점 애니메이션 */
function thinkTime(){
  const base={fast:[160,340], normal:[520,1150], slow:[900,1800]}[settings.ui.speed]||[520,1150];
  return base[0] + Math.random()*(base[1]-base[0]);
}
async function botThink(p){
  if (claimMode) return;
  const seat=$('#seat-'+p);
  const bub=$(`#seat-${p} .bubble`);
  if (seat) seat.classList.add('thinking');
  if (bub){ bub.innerHTML='<span class="think-dots"><i></i><i></i><i></i></span>'; bub.classList.add('show'); }
  await sleep(thinkTime());
  if (seat) seat.classList.remove('thinking');
  if (bub) bub.classList.remove('show');
}


/* ================= 라운드 기록 · 되돌리기 · 복기 ================= */
let stateGen = 0;               // undo 시 증가 → 진행 중인 봇/애니메이션 콜백 무효화
let roundRec = null;            // 현재 라운드 기록
let matchLog = [];              // 완료된 라운드 기록 모음
let undoUsed = { bidding: 0, play: 0 };
let replay = null;              // 복기 상태

function recStart(seed, cfg, dealer, g){
  roundRec = {
    round: roundNo, seed, dealer, cfg: JSON.parse(JSON.stringify(cfg)),
    version: APP_VERSION, tier: currentTier(), names: NAMES.slice(),
    hands0: g.hands.map(h => h.map(E.cardId)),
    floor0: g.floor.map(E.cardId),
    actions: [], result: null, ts: new Date().toISOString(),
  };
}
/** game.act를 감싸 모든 행동을 기록한다 */
function instrument(g){
  if (g.__inst) return;
  g.__inst = true;
  const orig = g.act.bind(g);
  g.act = (action) => {
    if (roundRec) roundRec.actions.push({ p: g.currentPlayer, ph: g.phase, a: JSON.parse(JSON.stringify(action)) });
    return orig(action);
  };
}
/** 기록에서 게임을 재구성 (upto개 행동까지 적용) */
function rebuildGame(rec, upto){
  const g = new E.MightyGame(rec.cfg);
  g.start(rec.dealer);
  const n = (upto === undefined) ? rec.actions.length : upto;
  for (let i = 0; i < n; i++) g.act(rec.actions[i].a);
  return g;
}

/* ---------------- 되돌리기 ---------------- */
function undoGroup(){ return (game && game.phase === 'bidding') ? 'bidding' : 'play'; }
function lastHumanIdx(group){
  if (!roundRec) return -1;
  for (let i = roundRec.actions.length - 1; i >= 0; i--){
    const x = roundRec.actions[i];
    if (x.p !== HUMAN) continue;
    const gp = (x.ph === 'bidding') ? 'bidding' : 'play';
    if (gp === group) return i;
  }
  return -1;
}
function canUndo(){
  if (settings.ui.undo === false) return false;
  if (!game || !roundRec || replay) return false;
  if (!['bidding','floor','friend','dealMissWindow','play'].includes(game.phase)) return false;
  const gp = undoGroup();
  if (undoUsed[gp] >= 1) return false;
  return lastHumanIdx(gp) >= 0;
}
async function doUndo(){
  if (!canUndo()) { toast(t('되돌릴 수 없습니다')); return; }
  stateGen++;                     // 진행 중인 봇 턴·애니메이션 취소
  cancelOpenModal();              // 열려 있던 선택 모달도 닫는다
  const gp = undoGroup();
  const idx = lastHumanIdx(gp);
  const g2 = rebuildGame(roundRec, idx);
  roundRec.actions.length = idx;
  game = g2; instrument(game);
  undoUsed[gp]++;
  selDiscard = []; bidSel = {giruda:null,count:null}; reviseSel = {on:false,giruda:null,count:null};
  friendCustom = false; ghost = null; busy = false;
  claimMode = false; claimShown = false; bidFlash = null;
  logLine(tf('logUndo', gp === 'bidding' ? t('비딩') : t('플레이')));
  toast(tf('undoDone', gp === 'bidding' ? t('비딩') : t('플레이')), 1500);
  render(); pump();
}

/* ---------------- 복기 ---------------- */
function replayableRecords(){
  const list = matchLog.slice();
  // 진행 중인 라운드도 (트릭이 하나라도 있으면) 복기 대상에 포함한다
  if (roundRec && !roundRec.result && roundRec.actions.some(x=>x.ph==='play')) list.push(roundRec);
  return list;
}
function openReplayPicker(){
  if (modalResolve){ toast(t('먼저 진행 중인 선택을 마쳐주세요')); return; }
  const list = replayableRecords();
  if (!list.length){ toast(t('복기할 라운드가 없습니다')); return; }
  if (list.length === 1) return startReplay(list[list.length-1]);
  const box = $('#modal-box');
  box.innerHTML = `<h2>${t('복기')}</h2><div class="sub">${t('라운드를 선택하세요')}</div>`;
  const wrap = el('div','chips'); wrap.style.marginTop='10px';
  list.slice().reverse().forEach(r=>{
    const b = el('button','chip', tf('replayItem', r.round, contractOf(r),
      r.result ? (r.result.win ? t('여당') : t('야당')) : t('진행 중')));
    b.onclick = ()=>{ $('#modal').classList.remove('show'); startReplay(r); };
    wrap.append(b);
  });
  box.append(wrap);
  const row = el('div','btnrow'); row.style.marginTop='12px';
  const c = el('button','btn ghost', t('취소')); c.onclick=()=>$('#modal').classList.remove('show');
  row.append(c); box.append(row);
  $('#modal').classList.add('show');
}
function contractOf(r){
  if (!r.contract) {
    const g = rebuildGame(r);
    r.contract = g.contract ? `${g.contract.count}${gLabel(g.contract.giruda)}` : '-';
    r.declarerSeat = g.declarer; r.friendSeat = g.friend;
  }
  return r.contract;
}
function startReplay(rec){
  if (!rec) { toast(t('복기할 라운드가 없습니다')); return; }
  const full = rebuildGame(rec);
  if (!full.play || !full.play.history.length){ toast(t('복기할 트릭이 없습니다')); return; }
  // 플레이 시작 시점까지 적용한 뒤 카드 단위로 진행
  const playStart = rec.actions.findIndex(x => x.ph === 'play');
  if (playStart < 0){ toast(t('복기할 트릭이 없습니다')); return; }
  replay = {
    rec, playStart, step: 0,
    steps: rec.actions.slice(playStart).filter(x => x.ph === 'play'),
    g: rebuildGame(rec, playStart),
    playing: false, timer: null,
    declarer: full.declarer, friend: full.friend,
    contract: full.contract, friendDecl: full.friendDecl,
  };
  document.body.classList.add('replaying');
  $('#replay-head').classList.add('show');
  $('#replay-bar').classList.add('show');
  renderReplay();
  toggleReplayPlay(true);
}
function closeReplay(){
  if (replay && replay.timer) clearTimeout(replay.timer);
  replay = null;
  document.body.classList.remove('replaying');
  $('#replay-head').classList.remove('show');
  $('#replay-bar').classList.remove('show');
  document.querySelectorAll('.rhand').forEach(e=>e.remove());
  render();
  resumeGame();
}
/** 복기·내보내기 등으로 멈춘 진행을 되살린다. 정산 단계면 정산 화면을 다시 띄운다. */
function resumeGame(){
  if (!game || replay) return;
  if (game.phase === 'done'){ showSettlement(); return; }   // 워치독이 손대지 않는 구간
  busy = false;
  stateGen++;                    // 복기 중 예약됐던 봇 콜백을 무효화하고 새로 건다
  pump();
}
/** 한 수 진행. @returns {ok, completed} — completed면 그 수로 트릭이 끝났다 */
function replayStepForward(){
  if (!replay) return { ok:false, completed:false };
  if (replay.step >= replay.steps.length){ toggleReplayPlay(false); return { ok:false, completed:false }; }
  const g = replay.g;
  const completes = (g.phase==='play' && g.play.table.length === E.NUM_PLAYERS - 1);
  replay.ghost = null;                       // 새 카드가 나오면 이전 트릭 잔상 제거
  g.act(replay.steps[replay.step].a);
  replay.step++;
  if (completes && g.play && g.play.history.length){
    // 마지막 카드까지 보이도록 완성된 트릭을 붙잡아 둔다
    const h = g.play.history[g.play.history.length-1];
    replay.ghost = { plays: h.plays.slice(), winner: h.winner, trickNo: h.trickNo, points: h.points };
  }
  renderReplay();
  return { ok:true, completed: completes };
}
function replayRestart(){
  if (!replay) return;
  if (replay.timer){ clearTimeout(replay.timer); replay.timer=null; }
  replay.playing = false; replay.stepping = false; replay.ghost = null;
  replay.g = rebuildGame(replay.rec, replay.playStart);
  replay.step = 0;
  renderReplay();
}
/** 다음 트릭을 순서대로 빠르게 보여준 뒤 일시정지 상태로 둔다 */
async function replayNextTrick(){
  if (!replay || replay.stepping) return;
  toggleReplayPlay(false);
  replay.stepping = true;
  renderReplay();
  const step = Math.max(70, Math.round(SPD().bot * 0.35));   // 자동 재생보다 빠르게
  let guard = 0;
  while (replay && replay.step < replay.steps.length && guard++ < E.NUM_PLAYERS + 1){
    const r = replayStepForward();
    if (!r.ok) break;
    if (r.completed) break;                                   // 트릭 완성 → 붙잡고 정지
    await sleep(step);
    if (!replay) return;
  }
  if (replay){ replay.stepping = false; renderReplay(); }
}
function toggleReplayPlay(on){
  if (!replay) return;
  replay.playing = (on === undefined) ? !replay.playing : on;
  if (replay.timer){ clearTimeout(replay.timer); replay.timer = null; }
  if (replay.playing){
    const tick = ()=>{
      if (!replay || !replay.playing) return;
      const r = replayStepForward();
      if (!r.ok){ replay.playing = false; renderReplay(); return; }
      // 트릭을 끝낸 수는 '다른 카드와 같은 노출 시간 + 승자 확인 시간'만큼 붙잡는다
      replay.timer = setTimeout(tick, r.completed ? SPD().bot + SPD().show : SPD().bot);
    };
    replay.timer = setTimeout(tick, SPD().bot);
  }
  renderReplay();
}
function renderReplay(){
  if (!replay) return;
  const g = replay.g;
  // 헤드: 공약·주공·프렌드
  const fd = replay.friendDecl;
  const fTxt = !fd ? '-' : fd.mode==='none' ? t('노프렌드')
    : fd.mode==='first' ? (replay.friend===null? t('셀프') : NAMES[replay.friend])
    : (replay.friend===null ? `${cardLabel(fd.card)} (${t('셀프')})` : `${cardLabel(fd.card)} → ${NAMES[replay.friend]}`);
  $('#replay-head').innerHTML = tf('replayHead', replay.rec.round,
    `${replay.contract.count}${gLabel(replay.contract.giruda)}`, NAMES[replay.declarer], fTxt);
  // 테이블 — 트릭이 막 끝났으면 그 트릭을 그대로 붙잡아 보여준다
  const tr = $('#trick'); tr.innerHTML='';
  const gh = replay.ghost;
  const table = gh ? gh.plays : (g.phase==='play' ? g.play.table : []);
  for (const e of table){
    const slot = el('div','slot'+(gh && gh.winner===e.player ? ' win' : ''));
    slot.dataset.s = e.player;
    const c = cardEl(e.card);
    if (e.jokerSuit){
      const tag=el('div', suCls(e.jokerSuit), SUIT_GLYPH[e.jokerSuit]);
      tag.style.cssText='position:absolute;top:4px;right:6px;font-size:.75rem;font-weight:700;';
      c.append(tag);
    }
    slot.append(c);
    tr.append(slot);
  }
  // 각 좌석 손패 공개
  document.querySelectorAll('.rhand').forEach(e=>e.remove());
  for (let p=0;p<5;p++){
    const seat = $('#seat-'+p); if (!seat) continue;
    const hand = el('div','rhand');
    const cards = sortHand(g.hands[p] || []);
    for (const c of cards){
      const rn = E.isJoker(c) ? 'JK' : ({11:'J',12:'Q',13:'K',14:'A'}[c.rank]||c.rank)+SUIT_GLYPH[c.suit];
      hand.append(el('div','rcard '+(E.isJoker(c)?'su-N':suCls(c.suit)), rn));
    }
    seat.append(hand);
    const bk = $('#backs-'+p); if (bk) bk.style.display='none';
    seat.classList.toggle('turn', gh ? (gh.winner===p) : (g.phase==='play' && g.play.turn===p));
  }
  // 획득 점수·HUD
  if (g.phase==='play' || g.phase==='done'){
    for (let p=0;p<5;p++){
      const meta = $('#meta-'+p);
      if (meta) meta.textContent = tf('seatMeta', g.play.tricksWon[p], g.play.capturedPoints[p]);
    }
  }
  renderHandReplay(g);
  // 컨트롤 바
  const bar = $('#replay-bar'); bar.innerHTML='';
  const mk=(label,fn,cls)=>{ const b=el('button',cls||'',label); b.onclick=fn; return b; };
  bar.append(mk('⏮', replayRestart));
  bar.append(mk(replay.playing?'⏸':'▶', ()=>toggleReplayPlay(), 'primary'));
  bar.append(mk('⏭', replayNextTrick));
  const tn = gh ? gh.trickNo : (g.phase==='play' ? g.play.trickNo : 10);
  const info = el('div','info', tf('replayProgress', Math.min(tn,10), replay.step, replay.steps.length));
  if (gh) info.innerHTML += `<br><span style="color:var(--gold)">${NAMES[gh.winner]}${gh.points?' +'+gh.points:''}</span>`;
  bar.append(info);
  bar.append(mk(t('내보내기'), ()=>exportRound(replay.rec)));
  bar.append(mk(t('게임으로'), closeReplay, 'primary'));
}
function renderHandReplay(g){
  const wrap = $('#hand'); wrap.innerHTML='';
  for (const c of sortHand(g.hands[HUMAN]||[])){
    const h = el('div','hcard'); h.append(cardEl(c)); wrap.append(h);
  }
}

/* ---------------- 내보내기 ---------------- */
function cardsKo(ids){ return ids.map(id => id==='JOKER' ? t('조커') : cardLabel(E.isJoker(id)?E.JOKER:{suit:id[0],rank:+id.slice(1)})).join(' '); }
function buildReportMd(rec){
  const g = rebuildGame(rec);
  const L=[];
  const nm = i => rec.names[i] || ('P'+i);
  L.push(`# 마이티 복기 — ${rec.round}${LANG==='en'?' round':'판'} (seed ${rec.seed})`);
  L.push('');
  L.push(`- 버전: ${rec.version} · 난이도: ${rec.tier} · 딜러: ${nm(rec.dealer)}`);
  L.push(`- 기록 시각: ${rec.ts}`);
  if (g.contract) L.push(`- 공약: **${g.contract.count}${gLabel(g.contract.giruda)}** · 주공: **${nm(g.declarer)}**` +
    ` · 프렌드: ${g.friendDecl ? (g.friendDecl.mode==='card' ? cardLabel(g.friendDecl.card) : g.friendDecl.mode) : '-'}` +
    `${g.friend!==null&&g.friend!==undefined ? ` (${nm(g.friend)})` : ` (${t('셀프')})`}`);
  L.push('');
  L.push('## 딜 직후 손패');
  for (let p=0;p<5;p++) L.push(`- ${nm(p)}: ${cardsKo(rec.hands0[p])}`);
  L.push(`- 바닥패: ${cardsKo(rec.floor0)}`);
  L.push('');
  L.push('## 비딩');
  for (const x of rec.actions){
    if (x.ph !== 'bidding') continue;
    L.push(`- ${nm(x.p)}: ` + (x.a.type==='bid' ? `${x.a.count}${gLabel(x.a.giruda)}` : x.a.type==='dealMiss' ? t('딜미스') : t('패스')));
  }
  const ex = rec.actions.find(x=>x.ph==='floor' && x.a.type==='exchange');
  if (ex) L.push(`- ${t('바닥패 교환')}: ${t('묻은 카드')} ${cardsKo(ex.a.discard.map(c=>typeof c==='string'?c:E.cardId(c)))}` +
    (ex.a.revise?` · ${t('공약 수정')} ${ex.a.revise.count}${gLabel(ex.a.revise.giruda)}`:''));
  L.push('');
  L.push('## 트릭');
  L.push('| # | ' + [0,1,2,3,4].map(nm).join(' | ') + ' | 승자 | 점수 |');
  L.push('|---|' + '---|'.repeat(7));
  for (const h of g.play.history){
    const cells = new Array(5).fill('');
    for (const e of h.plays){
      cells[e.player] = cardLabel(e.card) + (e.jokerSuit?`(${SUIT_GLYPH[e.jokerSuit]})`:'') + (e.jokerCall?'!':'');
      if (e.player === h.leader) cells[e.player] = '**'+cells[e.player]+'**';
    }
    L.push(`| ${h.trickNo} | ${cells.join(' | ')} | ${nm(h.winner)} | ${h.points} |`);
  }
  L.push('');
  const r = g.result;
  if (r){
    L.push('## 결과');
    L.push(`- 여당 ${r.yeodangPoints} / 야당 ${r.yadangPoints}` + (r.discardPoints?` (바닥패 ${r.discardPoints})`:''));
    L.push(`- ${r.win?'여당 승':'야당 승'}${r.run?' · 런':''}${r.backRun?' · 백런':''} · 점수 ${r.score} → 상금 ${r.prize}`);
    L.push(`- 배분: ` + r.prizes.map((v,i)=>`${nm(i)} ${v>0?'+':''}${v}`).join(' · '));
  }
  L.push('');
  L.push('## 재현용 원본');
  L.push('```json');
  L.push(JSON.stringify({ seed: rec.seed, dealer: rec.dealer, version: rec.version, tier: rec.tier,
                          cfg: rec.cfg, actions: rec.actions }, null, 1));
  L.push('```');
  return L.join('\n');
}
/**
 * itch.io는 게임을 sandbox iframe에 넣기 때문에 앵커 다운로드가 조용히 무시될 수 있다.
 * a.click()은 차단돼도 예외를 던지지 않으므로, 사전에 지원 여부를 판정한다.
 */
function canDownload(){
  try{
    if (typeof Blob !== 'function' || !URL.createObjectURL) return false;
    const a = document.createElement('a');
    if (!('download' in a)) return false;
    // sandbox iframe에서 allow-downloads가 없으면 다운로드가 막힌다
    try{
      const fr = window.frameElement;
      if (fr && fr.hasAttribute && fr.hasAttribute('sandbox')){
        const s = fr.getAttribute('sandbox') || '';
        if (!/allow-downloads/.test(s)) return false;
      }
    }catch(e){ /* cross-origin이면 접근 불가 — 아래 iframe 판정으로 넘어간다 */ }
    return true;
  }catch(e){ return false; }
}
function inIframe(){ try{ return window.self !== window.top; }catch(e){ return true; } }
function download(name, text){
  if (!canDownload()) return false;
  try{
    const blob = new Blob([text], {type:'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel='noopener';
    a.style.display='none';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 2000);
    return true;
  }catch(e){ return false; }
}
function exportRound(rec){
  if (!rec){ toast(t('내보낼 기록이 없습니다')); return; }
  const md = buildReportMd(rec);
  deliverExport(`mighty-round${rec.round}-seed${rec.seed}.md`, md, 1);
}
function exportMatch(){
  const list = replayableRecords();
  if (!list.length){ toast(t('내보낼 기록이 없습니다')); return; }
  toast(t('기록을 정리하는 중…'), 1500);
  // 라운드가 많으면 생성에 시간이 걸린다 — 토스트를 먼저 그리고 넘긴다
  setTimeout(()=>{
    let md;
    try{ md = list.map(r=>buildReportMd(r)).join('\n\n---\n\n'); }
    catch(e){ toast(t('기록 생성에 실패했습니다')); return; }
    deliverExport(`mighty-match-${new Date().toISOString().slice(0,10)}.md`, md, list.length);
  }, 30);
}
/** 다운로드를 시도하되, 되든 안 되든 복사 가능한 창을 함께 제공한다 */
function deliverExport(name, md, count){
  const ok = download(name, md);
  showExportModal(name, md, count, ok);
}
function showExportModal(name, md, count, downloaded){
  const box = $('#expmodal-box');
  const kb = Math.max(1, Math.round(md.length/1024));
  const sub = downloaded
    ? tf('exportOk', name, count, kb)
    : (inIframe() ? tf('exportBlockedFrame', count, kb) : tf('exportBlocked', count, kb));
  box.innerHTML = `<h2>${t('내보내기')}</h2><div class="sub">${sub}</div>`;
  const ta = document.createElement('textarea');
  ta.value = md; ta.readOnly = false;
  ta.style.cssText='width:100%;height:40vh;margin:10px 0;background:rgba(0,0,0,.3);color:var(--txt);border:1px solid var(--panel-line);border-radius:10px;padding:10px;font-size:.7rem;font-family:monospace;white-space:pre;overflow:auto';
  box.append(ta);
  const row = el('div','btnrow');
  const cl = el('button','btn ghost', t('닫기'));
  cl.onclick=()=>{ $('#expmodal').classList.remove('show'); render(); pump(); };
  const cp = el('button','btn primary', t('전체 복사'));
  cp.onclick = async ()=>{
    let done=false;
    try{ if (navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(md); done=true; } }catch(e){}
    if (!done){ ta.focus(); ta.select(); try{ done = document.execCommand('copy'); }catch(e){} }
    toast(done ? t('복사했습니다') : t('직접 선택해 복사하세요'), 2000);
  };
  row.append(cl, cp);
  if (!downloaded){
    const rt = el('button','btn ghost', t('새 창으로 열기'));
    rt.onclick = ()=>{
      try{
        const wnd = window.open('', '_blank');
        if (wnd){ wnd.document.write('<pre style="white-space:pre-wrap;word-break:break-word">'+
          md.replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</pre>'); wnd.document.close(); }
        else toast(t('팝업이 차단되었습니다'));
      }catch(e){ toast(t('팝업이 차단되었습니다')); }
    };
    row.insertBefore(rt, cp);
  }
  box.append(row);
  $('#expmodal').classList.add('show');
  setTimeout(()=>{ try{ ta.focus(); ta.setSelectionRange(0,0); }catch(e){} }, 50);
}
/** 진행이 멈춘 채 busy만 남는 상황을 감지해 복구한다 (내보내기·복기 등 외부 조작 후 대비) */
let watchdogTimer = null;
function armWatchdog(){
  if (watchdogTimer) clearTimeout(watchdogTimer);
  if (!game || replay) return;
  const gen = stateGen;
  const sig = game.phase + ':' + game.currentPlayer + ':' +
              (game.play ? game.play.trickNo + '/' + game.play.table.length : '');
  watchdogTimer = setTimeout(()=>{
    if (!game || replay || gen !== stateGen) return;
    const now = game.phase + ':' + game.currentPlayer + ':' +
                (game.play ? game.play.trickNo + '/' + game.play.table.length : '');
    const modalOpen = $('#modal').classList.contains('show') || $('#expmodal').classList.contains('show');
    if (now === sig && !modalOpen && !modalResolve && game.phase !== 'done'){
      const stuckBot = game.currentPlayer !== HUMAN;          // 봇 차례인데 진행이 없다
      if (busy || stuckBot){
        busy = false;
        stateGen++;                 // 새 세대로 봇 턴을 확실히 재예약한다
        render(); pump();
      }
    }
  }, 3500);
}
function refreshTools(){
  armWatchdog();
  const u = $('#undo-btn'); if (u){ u.disabled = !canUndo(); }
  const r = $('#replay-btn'); if (r){ r.disabled = replayableRecords().length===0 || !!replay; }
}

/* ---------------- 게임 루프 ---------------- */
function render(){
  if (replay){ renderReplay(); refreshTools(); return; }
  document.querySelectorAll('.rhand').forEach(e=>e.remove());
  for (let p=1;p<5;p++){ const bk=$('#backs-'+p); if (bk) bk.style.display=''; }
  renderSeats(); renderHud(); renderPuck(); renderTrick(); renderHand(); renderSheet(); renderCheat();
  refreshTools();
}
function pump(){
  if (!game) return;
  if (game.phase==='redeal'){
    const rs=game.redealReason;
    toast(rs.type==='dealMiss'?tf('misdealRedeal', NAMES[rs.player]):tf('allPassRedeal'), 1800);
    setTimeout(()=>{ startRound(false); }, 1500);
    return;
  }
  if (game.phase==='done'){ showSettlement(); return; }
  if (game.phase==='play' && game.play.table.length===0 && !busy && checkClaim()) return;
  const cur=game.currentPlayer;
  if (claimMode && game.phase==='play' && cur===HUMAN && !busy){
    busy=true; renderSheet();
    const myGen=stateGen;
    setTimeout(async()=>{
      busy=false;
      if (myGen!==stateGen) return;
      if (!claimMode || !game || game.phase!=='play' || game.play.turn!==HUMAN){ pump(); return; }
      await playWithAnimation(HUMAN, autoPickForHuman());
    }, CLAIM_SPD.bot);
    return;
  }
  if (game.phase==='dealMissWindow' && cur===HUMAN && !busy){
    const v=E.dealMissValue(game.hands[HUMAN]);
    confirmModal(t('딜미스 선언 가능'),
      tf('misdealAsk', v, game.config.dealMissThreshold),
      t('딜미스 선언'), t('이 패로 진행')).then(claim=>{
        humanAct({type: claim?'dealMiss':'proceed'},
          claim?tf('logMisdeal', NAMES[HUMAN]):tf('logMisdealSkip', NAMES[HUMAN]));
      });
    return;
  }
  if (cur!==HUMAN && !busy){
    busy=true; renderSheet();
    const myGen = stateGen;
    setTimeout(()=>{ if (myGen===stateGen) botStep(); }, game.phase==='bidding' ? 60 : claimSpeed().bot);
  }
}
async function botStep(){
  const myGen=stateGen;
  const p=game.currentPlayer;
  const phase=game.phase;
  if (!agentsReady || !agents[p]) await buildAgents();
  if (phase==='bidding') await botThink(p);
  if (myGen!==stateGen){ busy=false; return; }
  let action;
  try{ action = await agents[p].act(game, p); }
  catch(e){
    if (masterActive()){ masterState='failed'; await buildAgents(); }
    action = await agents[p].act(game, p);
  }
  if (myGen!==stateGen){ busy=false; return; }
  if (phase==='bidding'){
    game.act(action);
    if (action.type==='pass'){ bubble(p,t('패스')); logLine(tf('logPass', NAMES[p]));
      const st=$('#seat-'+p); if(st){ st.classList.remove('announce'); void st.offsetWidth; st.classList.add('announce'); } }
    else { announceBid(p, action.count, action.giruda); logLine(tf('logBid', NAMES[p], action.count, action.giruda)); }
    busy=false; render();
    if (game.phase==='floor' ) logLine(tf('logDeclarer', NAMES[game.declarer], contractText(game.contract)));
    pump(); return;
  }
  if (phase==='floor'){
    game.act(action);
    logLine(tf('logExchange', NAMES[p]));
    busy=false; render(); pump(); return;
  }
  if (phase==='dealMissWindow'){
    game.act(action);
    if (action.type==='dealMiss'){ logLine(tf('logMisdeal', NAMES[p])); }
    busy=false; render(); pump(); return;
  }
  if (phase==='friend'){
    game.act(action);
    const fd=game.friendDecl;
    const msg=fd.mode==='card'?tf('cardFriend', cardLabel(fd.card)):fd.mode==='first'?t('초구 프렌드'):t('노프렌드');
    bubble(p,msg); logLine(tf('logFriendDecl', NAMES[p], msg));
    toast(tf('friendToast', msg));
    busy=false; render(); pump(); return;
  }
  if (phase==='play'){
    busy=false;
    await playWithAnimation(p, {type:'play', ...action});
    return;
  }
}

/* ---------------- 정산 ---------------- */
let matchHistory=[];   // 라운드별 누적 상금 스냅샷 (최종 차트용)
function showSettlement(){
  const r=game.result;
  const v=r.win?t('여당 승리'):t('야당 승리');
  const humanIsAttacker = (HUMAN===r.declarer||HUMAN===r.friend);
  const humanWin = humanIsAttacker===r.win;
  // 총점·기록·효과음은 라운드당 한 번만. 복기 후 정산 화면을 다시 띄워도 중복 반영되지 않는다.
  if (!settledRound){
    settledRound = true;
    if (roundRec && !roundRec.result){
      roundRec.result = JSON.parse(JSON.stringify(r));
      matchLog.push(roundRec);
    }
    for(let p=0;p<5;p++) totals[p]+=r.prizes[p];
    matchHistory.push(totals.slice());
    if (humanWin) SFX.winJingle(); else SFX.loseJingle();
  }
  const box=$('#modal-box');
  box.innerHTML=`
    <h2>${tf('roundResultTitle', roundNo)}</h2>
    <div class="sub">${tf('roundResultSub', contractText(r.contract), NAMES[r.declarer], r.friend!==null?tf('friendSuffix', NAMES[r.friend]):tf('noFriendSuffix'))}</div>
    <div class="verdict ${humanWin?'win':'lose'}">${v}${r.run?t(' · 런!'):''}${r.backRun?t(' · 백런!'):''}</div>
    <div class="sub">${tf('ptsLine', r.yeodangPoints, r.yadangPoints, r.discardPoints?tf('discAttr', r.discardPoints):'', r.score, r.prize)}</div>
    <table><tr><th>${t('플레이어')}</th><th>${LANG==='en'?'Role':'역할'}</th><th style="text-align:right">${t('이번 판')}</th><th style="text-align:right">${t('누적')}</th></tr>
    ${[0,1,2,3,4].map(p=>{
      const role=p===r.declarer?t('주공'):p===r.friend?t('프렌드'):t('야당');
      const d=r.prizes[p];
      return `<tr><td>${NAMES[p]}</td><td>${role}</td>
        <td class="num ${d>0?'pos':d<0?'neg':''}">${d>0?'+':''}${num(d)}</td>
        <td class="num ${totals[p]>0?'pos':totals[p]<0?'neg':''}">${totals[p]>0?'+':''}${num(totals[p])}</td></tr>`;
    }).join('')}</table>
    <div class="btnrow"><button class="btn quiet" id="rv-btn">${t('복기')}</button><button class="btn quiet" id="ex-btn">${t('내보내기')}</button><button class="btn primary" id="next-btn"></button></div>`;
  const M=settings.match;
  matchOver = (M.mode==='rounds' && roundNo>=M.rounds) ||
              (M.mode==='target' && Math.max(...totals)>=M.targetPrize);
  $('#next-btn').textContent = matchOver ? t('최종 결과 보기') : t('다음 판');
  $('#modal').classList.add('show');
  const rvb=$('#rv-btn'), exb=$('#ex-btn');
  if (rvb) rvb.onclick=()=>{ $('#modal').classList.remove('show'); startReplay(matchLog[matchLog.length-1]); };
  if (exb) exb.onclick=()=>exportRound(matchLog[matchLog.length-1]);
  $('#next-btn').onclick=()=>{
    $('#modal').classList.remove('show');
    if (matchOver){ showFinal(); return; }
    // 딜러 룰: 전 라운드 프렌드가 딜러 (노프렌드/셀프면 주공)
    if (settings.match.dealerRule==='friend') dealer = (r.friend!==null ? r.friend : r.declarer);
    else dealer=(dealer+1)%5;
    startRound(true);
  };
  if (!settleLogged){ settleLogged = true; logLine(tf('logRoundEnd', roundNo, v, r.prize)); }
}

/* ---------------- 최종 결과 차트 ---------------- */
const FIN_COLORS=['#DFAF4F','#7FC7A4','#98B8F2','#F5A15E','#ED8B88'];
function niceStep(range){
  const raw=range/4, p=Math.pow(10,Math.floor(Math.log10(raw)));
  for (const m of [1,2,2.5,5,10]) if (raw<=m*p) return m*p;
  return 10*p;
}
function buildFinalChart(){
  const hist=[[0,0,0,0,0], ...matchHistory];    // 0판 기준선 포함
  const n=hist.length;
  const W=372,H=190,P={l:40,r:10,t:10,b:20};
  let lo=Math.min(0,...hist.flat()), hi=Math.max(0,...hist.flat());
  if (hi-lo<100){ hi+=500; lo-=500; }
  const span0=hi-lo; hi+=span0*0.06; lo-=span0*0.06;
  const X=i=>P.l+(W-P.l-P.r)*(n<=1?0:i/(n-1));
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-lo)/(hi-lo));
  let s=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  // 그리드 + 눈금 (동적 범위)
  const step=niceStep(hi-lo);
  for(let v=Math.ceil(lo/step)*step; v<=hi; v+=step){
    s+=`<line class="fin-grid" x1="${P.l}" y1="${Y(v).toFixed(1)}" x2="${W-P.r}" y2="${Y(v).toFixed(1)}"/>`;
    s+=`<text class="fin-tick" x="${P.l-4}" y="${(Y(v)+3).toFixed(1)}" text-anchor="end">${(v/1000).toFixed(Math.abs(v)<1000&&v!==0?1:0)}k</text>`;
  }
  s+=`<line class="fin-zero" x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}"/>`;
  // 라운드 x 눈금 (최대 10개 샘플)
  const xstep=Math.max(1, Math.ceil((n-1)/10));
  for(let i=0;i<n;i+=xstep){
    if(i===0) continue;
    s+=`<text class="fin-tick" x="${X(i).toFixed(1)}" y="${H-6}" text-anchor="middle">${i}</text>`;
  }
  // 플레이어 라인 (순위 낮은 순으로 그려 1위가 위에)
  const order=[0,1,2,3,4].sort((a,b)=>totals[a]-totals[b]);
  for(const p of order){
    const d=hist.map((row,i)=>`${i===0?'M':'L'}${X(i).toFixed(1)} ${Y(row[p]).toFixed(1)}`).join(' ');
    s+=`<path class="fin-line" data-p="${p}" stroke="${FIN_COLORS[p]}" d="${d}"/>`;
    s+=`<circle class="fin-dot" data-p="${p}" fill="${FIN_COLORS[p]}" r="3.2" cx="${X(n-1).toFixed(1)}" cy="${Y(hist[n-1][p]).toFixed(1)}" opacity="0"/>`;
  }
  s+='</svg>';
  const legend=[0,1,2,3,4].map(p=>
    `<span><span class="sw" style="background:${FIN_COLORS[p]}"></span>${NAMES[p]} <b class="${totals[p]>0?'pos':totals[p]<0?'neg':''}">${totals[p]>0?'+':''}${num(totals[p])}</b></span>`).join('');
  return `<div id="fin-chart">${s}</div><div class="fin-legend">${legend}</div>`;
}
function animateFinalChart(){
  const paths=document.querySelectorAll('#fin-chart .fin-line');
  const dots=document.querySelectorAll('#fin-chart .fin-dot');
  if (REDUCED){ dots.forEach(d=>d.setAttribute('opacity','1')); return; }
  let i=0;
  paths.forEach(path=>{
    let len=600;
    try{ len=path.getTotalLength(); }catch(e){ dots.forEach(d=>d.setAttribute('opacity','1')); return; }
    path.style.strokeDasharray=len;
    path.style.strokeDashoffset=len;
    path.style.transition=`stroke-dashoffset 1.1s cubic-bezier(.3,.7,.3,1) ${i*0.18}s`;
    i++;
  });
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    paths.forEach(p=>{ p.style.strokeDashoffset='0'; });
    setTimeout(()=>dots.forEach(d=>{ d.style.transition='opacity .3s'; d.setAttribute('opacity','1'); }), 900+paths.length*180);
  }));
}

/* ---------------- 최종 결과 ---------------- */
function showFinal(){
  const box=$('#modal-box');
  const order=[0,1,2,3,4].sort((a,b)=>totals[b]-totals[a]);
  const M=settings.match;
  const why = M.mode==='rounds' ? tf('matchWhyRounds', M.rounds) : tf('matchWhyTarget', M.targetPrize);
  box.innerHTML=`<h2>${t('매치 종료')}</h2><div class="sub">${tf('matchSub', why, roundNo)}</div>
    ${buildFinalChart()}
    <div style="margin:4px 0 18px">
    ${order.map((p,i)=>`<div class="rank-row${i===0?' first':''}">
      <div class="no">${i+1}</div><div class="nm">${NAMES[p]}${p===HUMAN?t('(나)'):''}</div>
      <div class="amt ${totals[p]>0?'pos':totals[p]<0?'neg':''}">${totals[p]>0?'+':''}${num(totals[p])}</div>
    </div>`).join('')}</div>
    <div class="btnrow"><button class="btn ghost" id="final-exp">${t('전체 내보내기')}</button><button class="btn ghost" id="final-set">${t('룰 설정')}</button><button class="btn primary" id="rematch-btn">${t('새 매치')}</button></div>`;
  $('#modal').classList.add('show');
  animateFinalChart();
  logLine(tf('logMatchEnd', NAMES[order[0]], totals[order[0]]));
  $('#rematch-btn').onclick=()=>{ $('#modal').classList.remove('show'); newMatch(); };
  $('#final-set').onclick=()=>openSettings();
  const fe=$('#final-exp'); if (fe) fe.onclick=()=>exportMatch();
}
function newMatch(){
  matchHistory=[];
  buildAgents(true);                      // 매치마다 좌석 성향 재배정
  matchLog = [];
  totals=[0,0,0,0,0]; roundNo=0; matchOver=false;
  dealer=Math.floor(Math.random()*5);
  startRound(true);
}

/* ---------------- 라운드 시작 ---------------- */
function startRound(inc){
  if (inc!==false) roundNo++;
  selDiscard=[]; bidSel={giruda:null,count:null}; reviseSel={on:false,giruda:null,count:null};
  friendCustom=false; ghost=null; busy=false;
  claimMode=false; claimShown=false; claimBy=null; bidFlash=null;
  if (botTable && botTable.reset) botTable.reset();
  trumpSeenThisRound=false;
  const cfg = buildEngineConfig();
  cfg.seed = (Math.random()*2147483647)|0;   // 복기·되돌리기를 위한 재현 시드
  undoUsed = { bidding:0, play:0 };
  settledRound=false; settleLogged=false;
  stateGen++; cancelOpenModal();
  game=new E.MightyGame(cfg);
  game.start(dealer);
  recStart(cfg.seed, cfg, dealer, game);
  instrument(game);
  SFX.shuffle(); setTimeout(()=>SFX.deal(), 480);
  render();
  logLine(tf('logRoundStart', roundNo, NAMES[dealer]));
  pump();
}

/* ---------------- 랜딩 옵션 (언어·난이도) ---------------- */
function renderLanding(){
  const box=$('#landing-opts'); if(!box) return;
  box.innerHTML='';
  const mk=(label, opts, get, set)=>{
    const row=el('div','land-row');
    row.append(el('div','land-lbl', label));
    const seg=el('div','land-seg');
    for(const o of opts){
      const b=el('button','', o.l);
      if (String(get())===String(o.v)) b.classList.add('on');
      b.onclick=()=>{ set(o.v); saveSettings(); renderLanding(); };
      seg.append(b);
    }
    row.append(seg); return row;
  };
  box.append(mk(t('언어'), [{v:'ko',l:'한국어'},{v:'en',l:'English'}], ()=>LANG, v=>setLang(v)));
  box.append(mk(t('난이도'), [{v:'intermediate',l:t('중급')},{v:'advanced',l:t('고급')},{v:'master',l:t('마스터')}],
    ()=>TIER_OF[settings.ui.difficulty]||'intermediate',
    v=>{ settings.ui.difficulty=v; saveSettings(); if(v==='master') ensureMaster(); else buildAgents(); }));
}

/* ---------------- 초기화 ---------------- */
globalThis.MUI = { get game(){return game}, get busy(){return busy}, get masterState(){return masterState}, ensureMaster, get settings(){return settings}, get matchOver(){return matchOver}, get replay(){return replay}, get totals(){return totals.slice()}, get matchLog(){return matchLog}, get roundNo(){return roundNo}, humanAct, playWithAnimation, startRound, newMatch, openSettings };
document.querySelectorAll('.app-ver').forEach(e=>{ e.textContent = APP_VERSION + ' · ' + APP_BUILD; });
buildSeats();
loadSettings().then(()=>{
  const saved = settings.ui.lang;
  LANG = saved || ((navigator.language||'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  settings.ui.lang = LANG;
  document.documentElement.lang = LANG;
  applyNames(); applyStatic(); renderLanding();
  buildAgents().then(()=>{ if(settings.ui.difficulty==='master') ensureMaster(); });
});
$('#start-btn').onclick=()=>{ SFX.unlock(); $('#start').style.display='none'; newMatch(); };
renderLanding();
$('#start-set-btn').onclick=()=>openSettings();
$('#set-btn').onclick=()=>openSettings();
$('#set-close').onclick=()=>closeSettings();
$('#set-done').onclick=()=>closeSettings();
$('#set-reset').onclick=()=>{ applyPreset('league'); settings.match=defaultSettings().match; settings.ui=defaultSettings().ui; saveSettings(); renderSettings(); };
$('#cheat-btn').onclick=()=>{ cheatOpen=!cheatOpen; renderCheat(); applyStatic(); };
$('#undo-btn').onclick=()=>doUndo();
$('#replay-btn').onclick=()=>openReplayPicker();
addEventListener('keydown', ev=>{
  const tag=(ev.target&&ev.target.tagName)||'';
  if (tag==='INPUT'||tag==='TEXTAREA'||ev.ctrlKey||ev.metaKey||ev.altKey) return;
  const k=ev.key.toLowerCase();
  if (k==='z'){ ev.preventDefault(); doUndo(); }
  else if (k==='r'){ ev.preventDefault(); if(replay) closeReplay(); else openReplayPicker(); }
  else if (k==='c'){ ev.preventDefault(); cheatOpen=!cheatOpen; renderCheat(); applyStatic(); }
  else if (k==='escape'){
    if ($('#expmodal').classList.contains('show')){ $('#expmodal').classList.remove('show'); render(); pump(); }
    else if (replay) closeReplay();
  }
  else if (replay && k===' '){ ev.preventDefault(); toggleReplayPlay(); }
});
$('#log-btn').onclick=()=>$('#log').classList.add('open');
$('#log-close').onclick=()=>$('#log').classList.remove('open');
