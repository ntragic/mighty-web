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
  '여당 승리':'Attackers win', '야당 승리':'Defenders win', '관전':'Spectate',
  '책사':'Strategist', '수문장':'Gatekeeper', '정석가':'Purist', '선견가':'Foreseer',
  '조율가':'Balancer', '기억가':'Recaller', '수련생':'Apprentice', '규칙기반':'Rule-based',
  '여당 (주공)':'Attacker (declarer)', '여당 (프렌드)':'Attacker (friend)',
  '여당 (숨은 프렌드)':'Attacker (hidden friend)', '미정 (초구 프렌드)':'Undecided (first-trick friend)',
  '프렌드(비공개)':'Friend (hidden)', '(비공개)':'(hidden)',
  // 기본 화면
  '마이티':'Mighty', '패스':'Pass', '취소':'Cancel', '없음':'None', '판':'Round',
  '직접 플레이로 전환합니다':'Switched to manual play',
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
  '내가 가진 카드를 부르면 히든 셀프(단독 여당·상대에겐 비공개)가 됩니다. 프렌드는 해당 카드가 나올 때 공개됩니다.':
    'Calling a card you hold makes it a hidden solo (you play alone; others cannot tell). The friend is revealed when the card is played.',
  '히든 셀프':'Hidden solo', '히든 셀프로 진행':'Go hidden solo',
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
  // v2 AI 복기·코칭
  'AI 복기':'AI Review', '분석 중':'Analyzing', '분석 실패':'Analysis failed',
  '분석은 마스터 모델이 필요합니다':'Analysis requires the Master model',
  '결정적':'Critical', '손해':'Loss', '부정확':'Inaccuracy',
  '표시할 실수가 없습니다 — 좋은 판이었습니다':'No mistakes to show — well played',
  '대안 라인':'Alt line', '실제 라인':'Actual line', '보기':'View', '닫기':'Close',
  '대안 라인(가정)':'alt line (hypothetical)',
  '마스터 기준':'per Master', '회 시뮬':'sims', '승률':'win rate',
  '코칭 (추천과 근거)':'Coaching (suggestion & reason)',
  '초보자 모드':'Beginner mode',
  '규칙 배우기':'Learn the rules', '규칙 튜토리얼':'Rules tutorial',
  '튜토리얼 다시 보기':'Replay the tutorial', '시작하기':'Start playing',
  '이전':'Back', '다음':'Next',
  '추천 수와 그 이유를 매 차례 보여주고, 진행을 느리게 합니다':
    'Shows the suggested move and why on every turn, and slows the pace down',
  '내 차례마다 추천 수와 그 이유를 보여줍니다':'Shows the suggested move and why, on every turn of yours',
  '끔':'Off', '켬':'On', '기대상금':'EV', '평균':'avg',
  '매치 AI 요약':'Match AI summary', '이번 매치 결정적 순간':'Key moments of this match',
  '분석할 라운드가 없습니다':'No rounds to analyze',
  '하이라이트가 없습니다 — 깔끔한 매치였습니다':'No highlights — a clean match',
  '누적':'Lifetime', '내 승률':'my win rate', '주공일 때':'as declarer',
  '분석':'analyzed', '실수':'mistakes',
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
  'AI 모델 로딩 중…':'Loading AI models…',
  'AI 준비 완료':'AI ready',
  'AI 모델을 불러오지 못했습니다. 규칙 기반으로 대체 진행합니다.':
    'Could not load the AI models. Falling back to rule-based play.',
  'AI 모델을 불러오지 못했습니다 — 규칙 기반으로 진행합니다':
    'Could not load the AI models — playing rule-based',
  '세 티어 모두 신경망 — 좌석 수와 세대로 난이도를 조절합니다':
    'All three tiers use neural networks — difficulty scales by seat count and generation',
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
  '플레이 경험 남기기':'Rate this match', '이번 AI와의 플레이는 어땠나요?':'How was this match with the AI?',
  '응답은 이 기기에만 저장됩니다. A/B 그룹은 표시하지 않습니다.':'Your response stays on this device. The A/B group is kept hidden.',
  '프렌드가 필요한 때에 개입했다':'The Friend stepped in at the right time',
  '중요한 카드를 불필요하게 쓰지 않았다':'The AI did not waste important cards',
  'AI의 플레이가 납득 가능했다':'The AI’s play made sense',
  '이 AI와 다시 플레이하고 싶다':'I would play with this AI again',
  '전혀 아니다':'Not at all', '매우 그렇다':'Very much', '건너뛰기':'Skip', '응답 저장':'Save response',
  '응답이 저장되었습니다':'Response saved', '누적 A/B 결과 복사':'Copy all A/B results', '계속':'Continue',
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
  trickN:(n)=> LANG==='en' ? `Trick ${n}` : `트릭 ${n}`,
  roundTrick:(r,tn)=> LANG==='en' ? `R${r} · Trick ${tn}` : `${r}판 · 트릭 ${tn}`,
  altCmpNote:(d)=> LANG==='en'
    ? ` · sims still favor the alt by +${d} on average — this actual line ran above average`
    : ` · 시뮬 평균은 대안이 +${d} 우세 — 이 판의 실제 라인이 평균 이상으로 풀린 경우`,
  altCmpTie:(d)=> LANG==='en'
    ? ` · this line ends the same — the +${d} edge is the 24-sim average, not every line`
    : ` · 이 라인은 결과가 같다 — +${d}는 24회 시뮬의 평균 우세이고, 모든 라인이 이기는 건 아니다`,
  altCmp:(aP,aZ,gP,gZ,dP,dZ)=> LANG==='en'
    ? `actual ${aP} pts · ${aZ} → alt ${gP} pts · ${gZ} (${dP} point cards, ${dZ} prize)`
    : `실제 점수카드 ${aP}장·상금 ${aZ} → 대안 ${gP}장·${gZ} (점수카드 ${dP}장 · 상금 ${dZ})`,
  // v2.2 코칭 근거 버블 — 좌석 가시 정보로만 도출한 룰 기반 근거(전지적 판정 금지)
  selfFriendAsk:(cn)=> LANG==='en'
    ? `You hold ${cn} yourself.<br>Calling it means playing <b>alone</b> — opponents cannot tell there is no friend. Proceed?`
    : `${cn}은(는) 내 손에 있는 카드입니다.<br>부르면 <b>프렌드 없이 단독</b>으로 싸우게 되고, 상대는 그 사실을 알 수 없습니다. 진행할까요?`,
  coachTrumpSweep:(n)=> LANG==='en' ? `Trump sweep — up to ${n} enemy trumps left` : `기루다 정리 — 상대 기루다 최대 ${n}장`,
  coachTopCard:()=> LANG==='en' ? 'Highest live card — keeps the lead' : '현재 최강 — 리드 유지',
  coachSafeLead:()=> LANG==='en' ? 'Safe lead — probe at low risk' : '안전 리드 — 낮은 위험으로 탐색',
  coachMighty:()=> LANG==='en' ? 'Mighty — guaranteed trick' : '마이티 — 확정 트릭',
  coachJoker:()=> LANG==='en' ? 'Joker — takes this trick' : '조커 — 트릭 확보',
  coachJokerCall:()=> LANG==='en' ? 'Joker Call — force the Joker out' : '조커콜 — 상대 조커 강제 처리',
  coachTake:(n)=> LANG==='en'
    ? (n ? `Wins the trick — collects ${n} point card${n>1?'s':''}` : 'Wins the trick — last to play')
    : (n ? `트릭 확보 — 점수카드 ${n}장 회수` : '트릭 확보 — 마지막 순서'),
  coachBest:(n)=> LANG==='en' ? `Winning so far — ${n} still to play` : `현재 최고 — 뒤 ${n}명 남음`,
  coachFeed:()=> LANG==='en' ? 'Ally is winning — feed points' : '아군 우세 — 점수 보태기',
  coachDuck:()=> LANG==='en' ? 'Ally is winning — dump a low card' : '아군 우세 — 낮은 패 처리',
  coachLose:()=> LANG==='en' ? 'Unlikely to win — minimize the loss' : '승산 낮음 — 손실 최소화',
  coachThreats:(list)=> LANG==='en' ? `Still out: ${list}` : `위협 잔존: ${list}`,
  coachNoThreat:()=> LANG==='en' ? 'No higher card left against this' : '위 서열 위협 없음',
  coachHigher:(m)=> LANG==='en' ? `${m} higher in suit` : `위 서열 ${m}장`,
  coachTrumpCut:()=> LANG==='en' ? 'trump cut' : '기루다 컷',
  coachGuard:()=> LANG==='en' ? 'Key card saved — ally already has this trick' : '키카드 보존 — 아군 확보 트릭',
  coachPts:(n,b)=> LANG==='en'
    ? `${n} point card${n>1?'s':''} at stake${b?` · ${b} behind`:''}`
    : `점수카드 ${n}장 걸림${b?` · 뒤 ${b}명`:''}`,
  /* 비딩·바닥패·프렌드 국면 조언 — 규칙기반 조언자의 근거를 말로 편다.
     플레이 국면(coach*)과 달리 '무엇이 좋은 수인가'에 더해 '왜 그 규칙 때문인가'를
     말한다. 규칙을 모르는 사람이 읽는 문장이라 용어를 풀어 쓴다. */
  advBid:(c,g)=> LANG==='en' ? `Suggested — bid ${c}${gLabel(g)}` : `추천 — ${c}${gLabel(g)} 공약`,
  advPass:()=> LANG==='en' ? 'Suggested — pass' : '추천 — 패스',
  advEst:(n)=> LANG==='en' ? `Hand is worth about ${n} points` : `이 손패의 기대 점수 약 ${n}점`,
  advShort:(n)=> LANG==='en' ? `Below the ${n} minimum — passing costs nothing`
                             : `최소 공약 ${n}에 못 미칩니다 — 패스는 손해가 없습니다`,
  advTrumpLen:(g,n)=> LANG==='en' ? `${gLabel(g)} ${n} long — your trump suit`
                                  : `${gLabel(g)} ${n}장 — 기루다로 삼을 무늬`,
  advHasM:()=> LANG==='en' ? 'You hold the Mighty — one trick guaranteed'
                           : '마이티 보유 — 확정 트릭 1장',
  advHasJ:()=> LANG==='en' ? 'You hold the Joker — near-certain trick'
                           : '조커 보유 — 사실상 확정 트릭',
  advAces:(n)=> LANG==='en' ? `${n} side ace${n>1?'s':''} outside trump` : `기루다 밖 A ${n}장`,
  advVoid:(n)=> LANG==='en' ? `${n} empty suit${n>1?'s':''} — you can trump those in`
                            : `빈 무늬 ${n}개 — 기루다로 끊을 수 있습니다`,
  advBidRule:(n)=> LANG==='en'
    ? `A bid promises how many of the ${n} point cards your side will take`
    : `공약은 우리 편이 가져올 점수카드 수 약속입니다 (전체 ${n}장)`,
  advBury:(list)=> LANG==='en' ? `Suggested — bury ${list}` : `추천 — ${list} 묻기`,
  advBuryKeep:()=> LANG==='en' ? 'Point cards (10 J Q K A) and trumps stay in hand'
                               : '점수카드(10 J Q K A)와 기루다는 남깁니다',
  advBuryVoid:()=> LANG==='en' ? 'Emptying a short suit lets you trump it later'
                               : '짧은 무늬를 비우면 나중에 기루다로 끊을 수 있습니다',
  advRevise:(c,g)=> LANG==='en' ? `Also worth revising the bid to ${c}${gLabel(g)}`
                                : `공약을 ${c}${gLabel(g)}로 수정할 만합니다`,
  advFriendCard:(nm)=> LANG==='en' ? `Suggested — call ${nm} as friend` : `추천 — ${nm} 프렌드`,
  advFriendFirst:()=> LANG==='en' ? 'Suggested — first-trick friend' : '추천 — 초구 프렌드',
  advFriendNone:()=> LANG==='en' ? 'Suggested — no friend (go solo)' : '추천 — 노프렌드(단독)',
  advFriendWhy:()=> LANG==='en' ? 'Call the strongest card you do not hold'
                                : '내가 안 가진 카드 중 가장 센 것을 부릅니다',
  advFriendSolo:()=> LANG==='en' ? 'You hold both Mighty and Joker — strong enough alone'
                                 : '마이티와 조커를 모두 쥐었습니다 — 단독으로 충분',
  ruleLead:()=> LANG==='en' ? 'You lead — any card is legal' : '내가 리드 — 아무 카드나 낼 수 있습니다',
  ruleFollow:(g)=> LANG==='en' ? `${gLabel(g)} was led — you must follow suit`
                               : `리드 무늬는 ${gLabel(g)} — 있으면 반드시 따라야 합니다`,
  ruleFree:()=> LANG==='en' ? 'You are void in the led suit — any card is legal'
                            : '리드 무늬가 없습니다 — 아무 카드나 낼 수 있습니다',
  advFriendFirstWhy:()=> LANG==='en'
    ? 'No strong card left to call — whoever wins the first trick becomes your friend'
    : '부를 만한 강한 카드가 없습니다 — 첫 트릭을 가져가는 사람이 프렌드가 됩니다',
  statsLine:(n,w,dn,dw,pz)=> LANG==='en'
    ? `Lifetime ${n} rounds · win ${w}% · declarer ${dw}/${dn} · ${pz}/round`
    : `누적 ${n}판 · 내 승률 ${w}% · 주공일 때 ${dw}/${dn} · 판당 ${pz}`,
  statsMistakes:(m,a)=> LANG==='en' ? ` · ${m} mistakes / ${a} analyzed` : ` · 실수 ${m}건 / 분석 ${a}판`,
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
  // 초구 프렌드는 지목한 카드가 없다. 그래서 공개 후 카드 프렌드와 표시가 같아져
  // "무슨 카드로 불렀는지 사라졌다"로 읽힌다(제보). 방식을 남겨 끝까지 구분한다.
  fdKnownFirst:(nm)=> LANG==='en' ? ` · friend <b>${nm}</b> (first trick)`
                                  : ` · 프렌드 <b>${nm}</b> (초구)`,
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
  nnLoading:(mb)=> LANG==='en' ? `Loading AI models… (one-time, ~${mb} MB)`
                               : `AI 모델 로딩 중… (최초 1회, 약 ${mb}MB)`,
  nnReady:(n)=> LANG==='en' ? `Ready — ${n} of 4 seats play with a neural network.`
                            : `준비 완료 — 네 좌석 중 ${n}자리가 신경망으로 플레이합니다.`,
  nnFirstUse:(mb)=> LANG==='en' ? `Models download on first use (~${mb} MB).`
                                : `첫 사용 시 모델을 내려받습니다(약 ${mb}MB).`,
};
const tf = (k,...a) => TF[k](...a);

// 국면 한정 탐색 설정 — 끄려면 null로 둔다(즉시 이전 동작). 근거는 10~12절.
// gate 1.3: 로짓 1·2위 차가 이보다 작으면 켠다. 0.6에서 넓혔다 — 0.58~1.29 구간도
//   정책 실수율 4.1%에 탐색 2.8~3.6%로 이득이 있었다. 1.3 이상은 정책이 0.5%로
//   이미 정확하고 탐색이 오히려 나빠서(1.9%) 그대로 둔다.
// K 32: 결정화 16벌(대형실수 3.5%)보다 32벌(3.2%)이 낫다. 예산 안에서 잘리므로
//   느린 기기는 자동으로 16벌 수준으로 내려간다.
// budgetMs 2000: 32벌은 1,200ms에서 잘렸다(데스크톱 중앙 1,201ms = 예산 상한).
//   사용자가 사고 시간은 문제없다고 확인해 예산을 올렸다. 느린 기기는 여전히
//   여기서 잘리고 결정화 수만 줄어든다.
// 클래스별 문턱(로짓 1·2위 차가 이보다 작으면 켠다). 근거는 10~13절.
//   weaklead 1.3 · oppwin 1.8 · 주공 0.46 · 프렌드 리드는 문턱 없음(전 구간 이득)
const CLASS_SEARCH = { K: 32, gate: 1.3, gateOppwin: 1.8, gateDeclarer: 0.46,
                       topM: 5, budgetMs: 2000 };
const APP_VERSION = 'v3.0.5';
const APP_BUILD = '2026-09-07 빌드 — 규칙 튜토리얼';
const AB_TEST_ID = 'master-round-robin-v300';
const AB_NEXT_KEY = 'mighty_ab_next_v300';
const AB_FEEDBACK_KEY = 'mighty_ab_feedback_v300';
let abArm = 'N';
let matchFeedback = null;
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
    ui:{ speed:'normal', difficulty:'intermediate', sound:true, lang:null, autoClaim:true, undo:true,
         coach:false, beginner:null, tutorialDone:false },
    _tierV:2,
    names:['나','서준','하린','도윤','유나'],
    engine:{
      minBid:14, noGirudaBidDiscount:0, bidStartsAtDealer:true,
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
// 마지막 트릭에서 5장이 깔린 마무리 국면을 보여주는 시간. 속도 설정·세팅 자동
// 진행과 무관하게 고정한다 — 그 화면이 판의 결말이라 줄일 대상이 아니다.
// 수거 애니메이션 다음은 곧장 결과 화면이다(중간에 빈 판을 보여주지 않는다).
const FINAL_TRICK_HOLD = 1400;
// 비딩 한 수를 보여 주는 시간. 봇이 60ms 간격으로 몰아치면 칩·퍽이 눈에 안 들어온다
// (제보 2026-08-18). 이 예산 안에서 '생각 중'을 잠깐 띄우고, 공약을 그린 뒤 나머지를
// 붙잡는다 — 그래서 비딩 과정과 칩 표시가 같은 속도로 흐른다.
const BID_TURN = () => (claimMode ? 0 :
  ({fast:700, normal:1000, slow:1400})[settings.ui.speed] || 1000);
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
/* 초보자 모드 — 새 화면이 아니라 묶음이다. 켜면 안내가 켜지고 판이 느려진다.
 * 좌석 성향은 여전히 감춘다(CLAUDE.md 규율). 끌 때 나머지를 되돌리지는 않는다 —
 * 그 사이 사용자가 직접 만진 값일 수 있고, 되돌리면 그 조정이 사라진다. */
function applyBeginner(on){
  settings.ui.beginner = !!on;
  if (!on) return;
  settings.ui.coach = true;         // 추천과 근거
  settings.ui.undo = true;          // 되돌리기 — 실수해도 배울 수 있게
  settings.ui.speed = 'slow';       // 봇이 몰아치면 무슨 일이 일어났는지 못 본다
  settings.ui.difficulty = 'intermediate';
  // 치트시트 — 남은 카드를 세는 법을 눈으로 익히게 한다. 다만 좁은 화면에서는
  // 열지 않는다: 390px에서 재보니 시트가 판 전체를 덮어 첫 판을 오히려 가린다.
  // 720px는 모바일 규칙이 갈리는 기존 분기점이다.
  cheatOpen = (typeof window!=='undefined' && window.innerWidth > 720);
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
  b.append(segRow(t('난이도'),t('세 티어 모두 신경망 — 좌석 수와 세대로 난이도를 조절합니다'),
    [{v:'intermediate',l:t('중급')},{v:'advanced',l:t('고급')},{v:'master',l:t('마스터')}],
    ()=>TIER_OF[S.ui.difficulty]||'intermediate',
    v=>{ S.ui.difficulty=v; ensureNN(); }));
  b.append(el('div','hint', masterState==='ready' ? tf('nnReady', nnSeatCount(currentTier()))
    : masterState==='loading' ? t('AI 모델 로딩 중…')
    : masterState==='failed' ? t('AI 모델을 불러오지 못했습니다. 규칙 기반으로 대체 진행합니다.')
    : tf('nnFirstUse', nnSizeMB(currentTier()))));
  // 코칭 — 기본 OFF. 켜면 네 국면 모두에서 추천과 근거를 보여준다.
  // 모델이 없으면 규칙기반으로 돌고, 모델이 오면 플레이 국면 추천만 그쪽으로 바뀐다.
  b.append(segRow(t('코칭 (추천과 근거)'), t('내 차례마다 추천 수와 그 이유를 보여줍니다'),
    [{v:'off',l:t('끔')},{v:'on',l:t('켬')}],
    ()=>S.ui.coach?'on':'off',
    // 끌 때 시트의 조언 상자까지 지우려면 시트를 다시 그려야 한다
    v=>{ S.ui.coach=(v==='on');
         if(S.ui.coach && !S.ui.beginner) ensureMaster();
         renderHand(); renderSheet(); }));
  // 규칙 튜토리얼 — 언제든 다시 볼 수 있게 둔다
  {
    const row=el('div','set-row');
    row.append(el('div','lbl', t('규칙 튜토리얼')));
    const btn=el('button','chip', t('튜토리얼 다시 보기'));
    btn.id='set-tut-btn';
    btn.onclick=()=>openTutorial();
    row.append(btn); b.append(row);
  }
  // 초보자 모드 — 코칭 바로 위에 둔다. 켜면 코칭까지 같이 켜진다.
  b.append(segRow(t('초보자 모드'), t('추천 수와 그 이유를 매 차례 보여주고, 진행을 느리게 합니다'),
    [{v:'off',l:t('끔')},{v:'on',l:t('켬')}],
    ()=>S.ui.beginner?'on':'off',
    v=>{ applyBeginner(v==='on'); renderCheat(); applyStatic(); renderHand(); renderSheet(); }));
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
// 코칭·AI 복기 판정에 쓰는 대표 모델 — 티어와 무관하게 항상 이것으로 판정한다.
// 마스터 티어가 쓰는 세대와 같게 두면 이미 로드한 세션을 재사용해 추가 내려받기가
// 없다. v2.12.0에서 v13 → v16e (JUDGE_ID로 단일화).
const JUDGE_ID='v16e';
/* 티어별 좌석 구성 — 난이도를 실측으로 벌린다.
 *
 * v2.11 이전에는 중급·고급이 규칙기반, 마스터만 신경망이었다. 그런데 사람 자리를
 * 고정 기준 좌석으로 두고 네 좌석을 채워 재보니(tools/research/table_difficulty.js,
 * 3,000판) **규칙기반 두 티어가 구분되지 않았다** — 중급 −3.4±78.6 vs 고급
 * −8.2±79.8. 이름만 다른 같은 난이도였다.
 *
 * 그래서 중급부터 신경망을 넣되 좌석 수로 난이도를 조절한다. 낮을수록 어렵다:
 *   중급  v5 1좌석 + 규칙기반 3   −158.8 ± 75.6   (내려받기 4MB)
 *   고급  v8·v6b 각 2좌석         −249.8 ± 64.4   (13MB)
 *   마스터 v13 + v11ctl 각 2좌석  −316.0 ± 59.6   (13MB)
 * 신경망 좌석을 0→1→2로 늘릴 때 난이도가 크게 움직이고 그 뒤로는 포화한다.
 *
 * 세대 선택 근거(docs/MODELS.md 기력 사다리·docs/difficulty*.txt):
 * - 마스터는 최고 기력 둘. v12(+132.4)가 v13(+123.0)과 동률 1위지만 둘 다
 *   고공약에서 조커를 아끼는 사각이 있다. v11ctl은 판당 40 낮은 대신 공약 20에서
 *   조커를 75.2%로 내는 유일한 모델이고 조커콜 자해도 0%다. 두 조합의 실측
 *   난이도가 −316 vs −318로 구분되지 않아 결함 프로필로 갈랐다.
 * - 고급은 구세대 중 테이블 난이도가 중간인 v8·v6b. v5는 관례를 안 배운 세대라
 *   개인 기량은 낮은데 네 좌석을 채우면 오히려 까다롭다(−278.5).
 * - v9는 v2.10.6에서 고공약 프렌드 결함으로 하차했다.
 *
 * 플레이 중 비노출(비딩 읽힘 방지 — 페르소나와 같은 원칙), 매치 종료 화면에서
 * 사후 공개. 코칭·AI 복기 판정은 티어와 무관하게 항상 대표(JUDGE_ID). */
const NN_POOL={
  v16e:  { file:'./model/mighty_master_v16e.onnx',   nick:'절제가' },
  v8:    { file:'./model/mighty_master_v8.onnx',     nick:'수문장' },
  v6b:   { file:'./model/mighty_master_v6b.onnx',    nick:'기억가' },
  v5:    { file:'./model/mighty_master_v5.onnx',     nick:'수련생' },
};
// 보존 세대(v13 선견가 · v11ctl 조율가) — 배포에서는 내렸지만 파일은 web/model에,
// 이력과 특징은 docs/MODELS.md '보존 세대' 절에 그대로 남겼다. 되돌리는 방법도
// 거기 적어 뒀다. **여기에 파일명을 적지 마라** — 릴리스가 index.html에서 모델
// 파일명을 긁어 번들을 고르므로, 주석에 적어 두기만 해도 배포물이 13MB 커진다.
const HEUR='H';                              // 규칙기반 좌석 표식
const TIER_PLAN={
  intermediate: ['v5',   HEUR,   HEUR,   HEUR  ],
  advanced:     ['v8',   'v6b',  'v8',   'v6b' ],
  master:       ['v16e', 'v16e', 'v16e', 'v16e'],
};
let masterSessions={};                       // id → onnx session (지연 로드 캐시)
let seatModels=[null,null,null,null,null];   // AI 좌석별 pool id 또는 HEUR — 매치 내 고정
function poolOf(id){ return NN_POOL[id]||null; }
/** 티어 좌석 구성. 모르는 티어를 조용히 중급으로 떨어뜨리지 않는다 —
 *  v2.11.0에서 assignSeatModels()를 인자 없이 불러 마스터 판에 중급 구성이
 *  앉는 결함이 났다(제보: 마스터인데 라벨 없는 좌석). 호출부를 바로 드러낸다. */
function planFor(tier){
  const p=TIER_PLAN[tier];
  if (p) return p;
  console.warn('planFor: 알 수 없는 티어', tier, '— 중급 구성으로 대체');
  return TIER_PLAN.intermediate;
}
/** 그 티어가 쓰는 신경망 id 목록 (중복 제거) */
function nnIdsFor(tier){ return [...new Set(planFor(tier).filter(x=>x!==HEUR))]; }
/** 그 티어의 신경망 좌석 수 · 내려받기 용량(MB) — 설정 화면 안내용 */
function nnSeatCount(tier){ return planFor(tier).filter(x=>x!==HEUR).length; }
const NN_MB={ v13:6.5, v11ctl:6.5, v8:6.5, v6b:6.5, v5:4 };
function nnSizeMB(tier){
  const n=nnIdsFor(tier).reduce((a,id)=>a+(NN_MB[id]||6.5),0);
  return Number.isInteger(n) ? n : n.toFixed(1);
}
async function loadPoolModel(id){
  if (masterSessions[id]) return masterSessions[id];
  const m=poolOf(id);
  if (!m) throw new Error('unknown model: '+id);
  masterSessions[id]=await MightyAI.loadMaster(ortLib, m.file);
  return masterSessions[id];
}
/** 매치 시작 시 좌석 배정 + 그 티어에 필요한 모델만 지연 로드 */
async function assignSeatModels(tier){
  const plan=planFor(tier).slice();
  for(let i=plan.length-1;i>0;i--){          // 피셔-예이츠 — 좌석 순서만 섞는다
    const j=Math.floor(Math.random()*(i+1));
    [plan[i],plan[j]]=[plan[j],plan[i]];
  }
  for(let p=1;p<5;p++) seatModels[p]=plan[p-1];
  await Promise.all(nnIdsFor(tier).map(loadPoolModel));
}
const ORT_LOCAL='./ort/ort.wasm.min.js';                      // 번들 동봉(오프라인 가능)
const ORT_CDN='https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';
function loadScript(src){
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src=src; s.onload=res; s.onerror=()=>rej(new Error('script load failed'));
    document.head.appendChild(s);
  });
}
/** onnxruntime 로드 (1회) */
async function ensureOrt(){
  if (ortLib) return ortLib;
  if (!window.ort){
    try{ await loadScript(ORT_LOCAL); }           // 로컬 번들 우선
    catch(e){ await loadScript(ORT_CDN); }        // 없으면 CDN 폴백
  }
  ortLib=window.ort;
  if (!ortLib) throw new Error('onnxruntime unavailable');
  try{
    ortLib.env.wasm.wasmPaths = new URL('./ort/', document.baseURI).href;
    ortLib.env.wasm.numThreads = 1;              // COOP/COEP 헤더 없는 정적 호스팅 대응
  }catch(e){}
  return ortLib;
}
/** 현재 티어가 쓰는 신경망을 로드하고 좌석을 배정한다.
 *  실패하면 그 티어의 규칙기반 좌석으로 떨어진다(게임은 계속 된다). */
async function ensureNN(){
  const tier = TIER_OF[settings.ui.difficulty] || 'intermediate';
  const need = nnIdsFor(tier);
  if (!need.length){ masterState='ready'; return true; }        // 규칙기반 전용 티어
  if (masterState==='loading') return false;
  if (masterState==='ready' && need.every(id=>masterSessions[id]) && seatModels[1]) return true;
  masterState='loading'; renderSettings();
  toast(tf('nnLoading', nnSizeMB(tier)), 2600);
  try{
    await ensureOrt();
    await assignSeatModels(tier);
    masterState='ready';
    await buildAgents(true);
    toast(t('AI 준비 완료'), 1600);
  }catch(e){
    masterState='failed';
    await buildAgents(true);
    toast(t('AI 모델을 불러오지 못했습니다 — 규칙 기반으로 진행합니다'), 2600);
  }
  renderSettings();
  return masterState==='ready';
}
/** 코칭·AI 복기 판정용 대표 모델(v13) — 티어와 무관하게 항상 같은 저울을 쓴다. */
async function ensureMaster(){
  await ensureNN();
  if (masterSess) return true;
  try{
    await ensureOrt();
    masterSess = masterSessions[JUDGE_ID]
      || await MightyAI.loadMaster(ortLib, NN_POOL[JUDGE_ID].file);
    masterSessions['v13']=masterSess;
    return true;
  }catch(e){ return false; }
}
function masterActive(){ return currentTier()==='master'; }
function currentTier(){
  const d = settings.ui.difficulty || 'intermediate';
  return TIER_OF[d] || 'intermediate';
}
/** 그 티어 좌석이 실제로 신경망을 쓰는가 (로드 실패 시 규칙기반으로 떨어진다) */
function nnSeatsActive(){ return masterState==='ready' && !!seatModels[1]; }
function assignAbArm(){
  if (currentTier()!=='master'){ abArm='N'; matchFeedback=null; return abArm; }
  let next;
  try{ next=localStorage.getItem(AB_NEXT_KEY); }catch(e){}
  if (next!=='A' && next!=='B') next=Math.random()<0.5?'A':'B';
  abArm=next;
  try{ localStorage.setItem(AB_NEXT_KEY, next==='A'?'B':'A'); }catch(e){}
  matchFeedback=null;
  return abArm;
}
function activeClassSearch(){ return currentTier()==='master' && abArm==='A' ? CLASS_SEARCH : null; }
async function buildAgents(reassign){
  const tier = currentTier();
  const useNN = nnSeatsActive();
  const key = tier + (useNN?':nn':'') + (tier==='master'?':ab'+abArm:'');
  if (reassign || !botTable || botTable.tier !== key){
    // 좌석별로 신경망/규칙기반이 섞인다 — NN 좌석은 master 티어 + 그 좌석 세션.
    // 신경망이 안 실린 좌석은 규칙기반으로 간다. 마스터 티어는 규칙기반 등가가
    // 없으므로 고급으로 떨어뜨린다 — 이 폴백이 없으면 모델 로드 전 초기 빌드에서
    // 다섯 좌석 전부 session 없는 master가 되어 createAgent가 던지고, agentsReady가
    // 서지 않아 딜 직후 정지한다(v2.11.0 배포본 결함).
    const base = tier==='master' ? 'advanced' : tier;
    const tiers=[base,base,base,base,base];
    const sessions=[null,null,null,null,null];
    if (useNN) for(let p=1;p<5;p++){
      const id=seatModels[p];
      if (id && id!==HEUR && masterSessions[id]){ tiers[p]='master'; sessions[p]=masterSessions[id]; }
    }
    try{
      botTable = await MightyAI.createTable({
        tiers, rng: Math.random, session: masterSess, ort: ortLib,
        sessions: useNN ? sessions : null,
        // 마스터 티어에서만 국면 한정 탐색을 켠다(v2.14.0). 프렌드가 아군이 이기는
        // 트릭에 개입할지 정하는 자리에서만 발화하고, 정책이 확신하면 건너뛴다 —
        // 딜당 0.69회·데스크톱 0.5초·저사양 1.2초(예산에서 절단). 실측은
        // docs/SESSION-HANDOFF.md 10절.
        classSearch: activeClassSearch(),
      });
    }catch(e){
      // 어떤 이유로든 좌석을 못 만들면 순수 규칙기반으로 되돌린다.
      // 여기서 던지면 agentsReady가 서지 않아 판 자체가 멈춘다.
      masterState='failed';
      botTable = await MightyAI.createTable({
        tiers:[base,base,base,base,base], rng: Math.random,
      });
    }
    botTable.tier = key;
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
      <div class="bidchip" id="bidchip-${p}"></div>
      ${p!==HUMAN?`<div class="backs" id="backs-${p}"></div>`:''}
      <div class="pile" id="pile-${p}"></div>`;
    wrap.append(s);
  }
}
function renderSeats(){
  // 복기 중에는 라이브 게임이 아니라 복기 중인 라운드의 상태를 그린다.
  // (매치 요약·복기에서 다른 판을 열람할 때 주공·프렌드 배지가 라이브 판의
  //  것으로 남아 "역할이 밀려 보이는" 버그의 원인이었다)
  const G = replay ? replay.g : game;
  // 'done'을 포함한다 — 엔진은 마지막 트릭이 끝나는 즉시 phase를 done으로 바꾸므로
  // play만 보면 마지막 트릭을 보여주는 동안 획득 더미와 트릭/점수 표기가 먼저
  // 사라진다(제보 2026-08-11). 라운드가 실제로 끝나는 시점(새 라운드 시작)까지
  // 유지하고, 그때 phase가 bidding이 되며 자연히 지워진다.
  const inPlay = G && (G.phase==='play' || G.phase==='done');
  for(let p=0;p<5;p++){
    const seat=$('#seat-'+p);
    seat.classList.toggle('turn', G && G.currentPlayer===p && G.phase!=='done');
    const meta=$('#meta-'+p);
    if (inPlay){
      meta.textContent=tf('seatMeta', G.play.tricksWon[p], G.play.capturedPoints[p]);
    } else meta.textContent = p!==HUMAN ? t(TIER_LABEL_KO[currentTier()]) : '';
    // 손패 백
    if (p!==HUMAN){
      const bk=$('#backs-'+p); bk.innerHTML='';
      const n=G && G.hands[p] ? G.hands[p].length : 0;
      for(let i=0;i<n;i++) bk.append(el('div','mini'));
    }
    // 배지
    const bd=$('#badges-'+p); bd.innerHTML='';
    if (G && G.declarer===p && G.phase!=='bidding') bd.append(el('span','badge decl',t('주공')));
    if (G && G.friendRevealed && G.friend===p) bd.append(el('span','badge friend',t('프렌드')));
    else if (p===HUMAN && G && G.friendDecl && G.friendDecl.mode==='card' && !G.friendRevealed
             && G.hands[HUMAN].some(c=>E.sameCard(c, G.friendDecl.card)))
      bd.append(el('span','badge friend-secret two', t('프렌드')+'<br>'+t('(비공개)')));
    const tot=totals[p];
    const tb=el('span','badge total'+(tot>0?' plus':tot<0?' minus':''), (tot>0?'+':'')+num(tot));
    bd.append(tb);
    // 획득 점수카드 더미
    const pile=$('#pile-'+p); pile.innerHTML='';
    if (inPlay){
      const cards=G.play.capturedCards[p];
      // 여당(주공·공개된 프렌드)의 더미는 본인에게도 덮어서 표시 (실제 룰)
      const hidden = (p===G.declarer) || (G.friendRevealed && G.friend===p);
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
    return game.friend===null ? t(' · 초구(주공 셀프)') : tf('fdKnownFirst', NAMES[game.friend]);
  }
  if (!game.friendRevealed) return tf('fdHidden', cardLabel(fd.card));
  return game.friend===null ? tf('fdSelf', cardLabel(fd.card))
                           : tf('fdKnownCard', cardLabel(fd.card), NAMES[game.friend]);
}

/* ---------------- 비딩 칩 ----------------
 * 누가 어떤 순서로 공약했는지 좌석 카드 자리에 남긴다. 상태를 따로 들지 않고
 * roundRec.actions에서 파생시킨다 — 되돌리기가 actions를 잘라내므로 칩도 자동으로
 * 맞는다(별도 스냅샷을 두면 어긋날 자리가 생긴다).
 * 칩은 **기록된 즉시** 그린다. v2.13.0에서는 0.5초 간격 공개 큐를 따로 돌렸는데,
 * 봇의 실제 비딩 속도와 큐 속도가 달라 칩이 뒤늦게 떠 상태와 어긋났다(제보 2026-08-18).
 * 대신 비딩 한 수마다 BID_TURN만큼 화면을 잡아 두어 눈으로 따라갈 수 있게 한다.
 * 비딩이 끝나면 잠깐 두고 지운다. */
const BID_CHIP_HOLD = 1200;   // 비딩 종료 후 남겨 두는 시간
let bidChipClear = null;
// 비딩이 끝난 뒤 한 번만 처리했다는 표식. 이게 없으면 플레이 중 render()마다
// 공개 큐가 다시 돌아 칩이 카드 낼 때마다 되살아난다(제보 2026-08-17).
let bidChipsDone = false;

function bidActions(){
  if (!roundRec) return [];
  return roundRec.actions.filter(x => x.ph === 'bidding');
}
/** 타이머·DOM·카운터만 정리한다. bidChipsDone은 건드리지 않는다 —
 *  여기서 되돌리면 플레이 중에 다시 공개가 시작된다. */
function clearBidChips(){
  if (bidChipClear){ clearTimeout(bidChipClear); bidChipClear = null; }
  for (let p = 0; p < 5; p++){
    const c = $('#bidchip-' + p);
    if (c){ c.className = 'bidchip'; c.innerHTML = ''; }
  }
}
/** 새 라운드·되돌리기용 — 표식까지 초기화해 다음 비딩에서 다시 보이게 한다. */
function resetBidChips(){ clearBidChips(); bidChipsDone = false; }
/** 기록된 비딩을 그대로 칩에 반영한다. 같은 좌석이 다시 부르면(수정) 마지막 것만 남는다. */
function paintBidChips(){
  const acts = bidActions();
  const latest = {};                       // 좌석 → {ord, a}
  for (let i = 0; i < acts.length; i++) latest[acts[i].p] = { ord: i + 1, a: acts[i].a };
  const wonBy = (game && game.phase !== 'bidding' && game.declarer != null) ? game.declarer : null;
  for (let p = 0; p < 5; p++){
    const c = $('#bidchip-' + p);
    if (!c) continue;
    const rec = latest[p];
    if (!rec){ c.className = 'bidchip'; c.innerHTML = ''; continue; }
    const a = rec.a;
    let cls = 'bidchip show', label;
    if (a.type === 'pass'){ cls += ' pass'; label = t('패스'); }
    else {
      const g = a.giruda;
      cls += g === 'N' ? ' nt' : (g === 'D' || g === 'H') ? ' red' : ' blk';
      label = (g === 'N' ? 'NT' : SUIT_GLYPH[g]) + a.count;
    }
    if (wonBy === p && a.type !== 'pass') cls += ' won';
    c.className = cls;
    c.innerHTML = `<span class="cl">${label}</span><span class="ord">${rec.ord}</span>`;
  }
}
function renderBidChips(){
  if (replay || !game || !roundRec){ clearBidChips(); return; }
  const acts = bidActions();
  if (!acts.length){ resetBidChips(); return; }
  if (game.phase === 'bidding'){
    bidChipsDone = false;
    paintBidChips();
    return;
  }
  // 비딩이 끝났다. 남은 것을 한 번에 보여주고 잠깐 뒤 지운 다음 **다시 그리지 않는다**.
  // 여기서 빠져나가지 않으면 플레이 중 render()마다 칩이 되살아난다.
  if (bidChipsDone) return;
  bidChipsDone = true;
  paintBidChips();
  const myGen = stateGen;
  bidChipClear = setTimeout(() => {
    bidChipClear = null;
    if (myGen === stateGen) clearBidChips();
  }, BID_CHIP_HOLD);
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
// 카드 착수의 탭 스루 차단 (제보 2026-08-23: 로딩 후 첫 트릭에 패가 저절로 나감).
// click만 보면, 시트(바닥패·프렌드)나 모달이 닫히면서 그 자리에 들어온 카드가
// 직전 탭의 '유령 클릭'을 그대로 받는다 — 주공은 프렌드 지정 직후가 곧 첫 리드라
// 그 한 탭이 첫 트릭 착수가 된다. 수정 전 코드에서 pointerdown 없는 순수 click
// 하나로 카드가 나가는 것을 tests/tapthrough.test.js로 실증했다.
// 그래서 **그 카드 위에서 시작한 포인터**만 착수로 친다. 모달 버튼의 시간 유예
// (MODAL_TAP_GUARD)와 달리 진짜 탭에는 지연이 전혀 없다.
let tapCard=null;
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
    h.dataset.cid=id;                       // v2 코칭 마킹용
    if (phase==='floor' && game.currentPlayer===HUMAN){
      h.classList.add('legal');
      if (game.floorOriginal && game.floorOriginal.some(f=>E.sameCard(f,c)) &&
          !selDiscard.some(s=>E.sameCard(s,c))) h.append(el('div','from-floor'));
      if (selDiscard.some(s=>E.sameCard(s,c))) h.classList.add('sel');
      h.onclick=()=>{ toggleDiscard(c); };
    } else if (legalSet){
      if (legalSet.has(id)){
        h.classList.add('legal');
        h.addEventListener('pointerdown', ()=>{ tapCard=id; });
        h.addEventListener('pointercancel', ()=>{ tapCard=null; });
        h.onclick=()=>{
          if (tapCard!==id) return;      // 이 카드에서 시작하지 않은 탭 = 유령 클릭
          tapCard=null; humanPlay(c);
        };
      }
      else h.classList.add('dim');
    }
    wrap.append(h);
  }
  coachUpdate();                            // v2 코칭 — 켜져 있을 때만 동작
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
  const hide=()=>{ sh.classList.remove('show'); sh.innerHTML=''; };
  if (!game || busy){ hide(); return; }
  const phase=game.phase, cur=game.currentPlayer;
  if (cur!==HUMAN || !['bidding','floor','friend'].includes(phase)){ hide(); return; }
  sh.classList.add('show'); sh.innerHTML='';
  if (phase==='bidding') sheetBidding(sh);
  else if (phase==='floor') sheetFloor(sh);
  else if (phase==='friend') sheetFriend(sh);
}
function sheetBidding(sh){
  const best=game.bidding.best;
  sh.append(el('h3','', t('공약 선언')),
    el('div','hint', best?tf('bidBest', NAMES[best.player], best.count, best.giruda):tf('bidFirst', game.config.minBid)));
  const rec=sheetAdvice(sh);          // 추천은 맨 위에 — 규칙을 모르면 여기부터 읽는다
  const recBid = rec && rec.type==='bid' ? rec : null;
  const suits=el('div','chips');
  for(const g of ['S','D','H','C','N']){
    const b=el('button','chip '+suCls(g)+(bidSel.giruda===g?' on':'')+(recBid&&recBid.giruda===g?' rec':''), g==='N'?t('노기루다'):SUIT_GLYPH[g]+' '+t({S:'스페이드',D:'다이아',H:'하트',C:'클로버'}[g]||''));
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
    const b=el('button','chip'+(bidSel.count===c?' on':'')
      +(recBid&&recBid.giruda===bidSel.giruda&&recBid.count===c?' rec':''), c);
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
  const pass=el('button','btn '+(ready?'quiet':'ghost')+(rec&&rec.type==='pass'?' rec':''),t('패스'));
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
  sheetAdvice(sh);                    // 묻을 3장은 손패에도 AI 표식으로 찍힌다
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
  const rec=sheetAdvice(sh);
  const recCard = rec && rec.mode==='card' ? rec.card : null;
  const quick=el('div','chips');
  const has=c=>hand.some(h=>E.sameCard(h,c));
  const mk=(label,act,on)=>{ const b=el('button','chip'+(on?' rec':''),label); b.onclick=act; return b; };
  quick.append(mk(tf('mightyFriend', cardLabel(m)), ()=>callFriend({type:'friend',mode:'card',card:m},tf('cardFriend', t('마이티'))),
    recCard && E.sameCard(recCard, m)));
  quick.append(mk(t('조커'), ()=>callFriend({type:'friend',mode:'card',card:E.JOKER},t('조커 프렌드')),
    recCard && E.isJoker(recCard)));
  if (game.contract.giruda!=='N'){
    const gA={suit:game.contract.giruda, rank:14};
    if (!E.sameCard(gA,m)) quick.append(mk(t('기루다 A'), ()=>callFriend({type:'friend',mode:'card',card:gA},tf('cardFriend', t('기루다 A'))),
      recCard && E.sameCard(recCard, gA)));
  }
  quick.append(mk(t('초구 프렌드'), ()=>callFriend({type:'friend',mode:'first'},t('초구 프렌드')),
    rec && rec.mode==='first'));
  quick.append(mk(t('노프렌드'), ()=>callFriend({type:'friend',mode:'none'},t('노프렌드')),
    rec && rec.mode==='none'));
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
      b.onclick=()=>callFriend({type:'friend',mode:'card',card},tf('cardFriend', cardLabel(card)));
      ranks.append(b);
    }
    sh.append(ranks);
  }
  sh.append(el('div','hint',t('내가 가진 카드를 부르면 히든 셀프(단독 여당·상대에겐 비공개)가 됩니다. 프렌드는 해당 카드가 나올 때 공개됩니다.')));
}
async function callFriend(act,label){
  // 보유 카드 호출 = 히든 셀프 플레이 — 실수 방지를 위해 확인만 받고 허용한다
  if (act.mode==='card' && game.hands[HUMAN].some(h=>E.sameCard(h,act.card))){
    const gen=stateGen;
    const ok=await confirmModal(t('히든 셀프'),
      tf('selfFriendAsk', cardLabel(act.card)),
      t('히든 셀프로 진행'), t('취소'));
    if (!ok || gen!==stateGen || !game || game.phase!=='friend'
        || game.currentPlayer!==HUMAN) { renderSheet(); return; }
  }
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
// 모달이 뜬 직후의 탭은 무시한다. 카드를 내려고 누르는 순간 세팅 모달이 튀어나오면
// 그 탭이 그대로 주 버튼('자동 진행')에 꽂혀, 그 판 내내 AI가 사람 카드를 낸다
// ("내기도 전에 AI 추천 패가 나간다" 제보 2026-08-23). 모바일에서 특히 잘 난다.
const MODAL_TAP_GUARD = 450;     // ms
let modalShownAt = 0;
const modalTapTooSoon = () => Date.now() - modalShownAt < MODAL_TAP_GUARD;
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
      b.onclick=()=>{ if(modalTapTooSoon()) return; close(); res(g); };
      chips.append(b);
    }
    const cancel=el('button','btn ghost',t('취소')); cancel.style.marginTop='14px';
    cancel.onclick=()=>{ if(modalTapTooSoon()) return; close(); res(null); };
    box.append(chips,cancel);
    modalShownAt = Date.now();
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
    const n=el('button','btn ghost',no); n.onclick=()=>{ if(modalTapTooSoon()) return; close(); res(false); };
    const y=el('button','btn primary',yes); y.onclick=()=>{ if(modalTapTooSoon()) return; close(); res(true); };
    row.append(n,y); box.append(row);
    modalShownAt = Date.now();
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
    // 마지막 트릭은 여기서 판이 끝난다. 5장이 깔린 이 화면이 마무리 국면이라
    // 속도 설정·세팅 자동 진행과 무관하게 더 보여준다(제보: 너무 빨리 사라진다).
    const isFinalTrick = game.phase==='done' || game.play.history.length>=E.HAND_SIZE;
    if (isFinalTrick){
      await sleep(FINAL_TRICK_HOLD);
      if (myGen!==stateGen){ busy=false; return; }
    }
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
    // 마지막 트릭에서 엔진은 _finishGame()으로 바로 빠져 pl.table을 비우지 않는다
    // (mighty-engine.js: trickNo===HAND_SIZE면 table=[] 앞에서 return). 그래서 여기서
    // 그냥 render()하면 방금 수거한 5장이 테이블에 되살아난다(제보 2026-08-11).
    // 룰 구현인 엔진을 건드리지 않고, 마지막 트릭은 빈 테이블로 그린 뒤 곧장
    // 결과 화면으로 넘긴다.
    if (isFinalTrick){
      // 수거 연출(await) 뒤다 — 그 사이 되돌리기가 들어왔으면 여기서 pump를 부르는
      // 순간 봇 루프가 겹친다(제보 2026-08-22와 같은 계열).
      if (myGen!==stateGen){ busy=false; return; }
      ghost={plays:[], winner:null};      // 테이블을 비운 상태로 고정
      render();
      busy=false;
      pump();                              // → showSettlement()
      return;
    }
    render();
    if (game.friendRevealed && game.friendDecl && game.friendDecl.mode==='first' && game.play.history.length===1){
      toast(game.friend===null?t('초구를 주공이 승리 — 사실상 노프렌드'):tf('friendToast', NAMES[game.friend]));
    }
  }
  // 수거 연출까지 끝난 뒤에도 세대를 다시 본다 — 그 사이 되돌리기가 들어오면
  // 여기서 pump를 부르는 순간 봇 루프가 겹친다.
  if (myGen!==stateGen){ busy=false; return; }
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
// 세팅 자동 진행 속도. show는 트릭 5장이 다 깔린 상태를 보여주는 시간이라
// 0에 가까우면 무슨 일이 있었는지 못 보고 지나간다(제보). 나머지는 빠르게 두고
// 이 구간만 살려 둔다.
const CLAIM_SPD={bot:0, pre:60, show:520, collect:0};
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
  const myGen=stateGen;
  // 버튼 배치는 원래 설계를 지킨다 — '자동 진행'이 오른쪽 주 버튼이고, 그게 자연스러운
  // 선택이 되도록 의도한 것이다(2026-08-23 사용자 확인). 오작동은 배치가 아니라
  // 탭 스루가 원인이었고 그건 모달 탭 유예로 막는다.
  confirmModal(t('세팅 — 전승 확정'),
    tf('claimBody', NAMES[p], sideOf(p), left, remainPts),
    t('자동 진행'), t('직접 플레이')).then(auto=>{
      // 되돌리기·새 라운드가 모달을 취소하면 이 콜백이 **나중에** 돈다. 가드가 없으면
      // busy를 내리고 pump를 한 번 더 불러 봇 루프가 둘이 된다(제보 2026-08-22).
      if (myGen!==stateGen) return;
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
async function botThink(p, ms){
  if (claimMode) return;
  const seat=$('#seat-'+p);
  const bub=$(`#seat-${p} .bubble`);
  if (seat) seat.classList.add('thinking');
  if (bub){ bub.innerHTML='<span class="think-dots"><i></i><i></i><i></i></span>'; bub.classList.add('show'); }
  await sleep(ms === undefined ? thinkTime() : ms);
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
    abTest: currentTier()==='master' ? AB_TEST_ID : null,
    abArm: currentTier()==='master' ? abArm : null,
    hands0: g.hands.map(h => h.map(E.cardId)),
    floor0: g.floor.map(E.cardId),
    actions: [], result: null, ts: new Date().toISOString(),
  };
}
/** game.act를 감싸 모든 행동을 기록한다 */
/**
 * 착수를 기록에 남기도록 game.act를 감싼다.
 *
 * **복제본에 딸려가면 안 된다.** 예전 구현은 `const orig = g.act.bind(g)`로 원본에
 * 묶은 화살표 함수를 열거 가능한 자기 속성으로 얹었다. 탐색(PIMC)과 AI 복기는
 * `Object.keys(g)`를 훑어 시뮬레이션 판을 만드는데, 함수는 그대로 복사되므로
 * **시뮬레이션의 sim.act()가 원본 판을 움직이고 기록에 가짜 액션을 쌓았다**.
 * 2026-08-24 실측: 시뮬 착수 한 번에 기록 7→8, 원본 turn 0→1, 테이블 0→1.
 * 마스터 티어 첫 판부터 기록이 깨져 복기가 illegal play로 죽었다 —
 * "패가 저절로 나간다"와 "복기가 안 된다"가 이 한 뿌리에서 나왔다.
 *
 * 두 겹으로 막는다.
 *   1) enumerable:false — Object.keys에 안 걸려 복제본이 아예 가져가지 않는다
 *   2) prototype의 원본을 `this`로 부르고, 기록은 이 인스턴스일 때만 남긴다
 *      — 혹시 복사되더라도 복제본 자신에게 작용하고 기록은 건드리지 않는다
 */
function instrument(g){
  if (g.__inst) return;
  const base = Object.getPrototypeOf(g).act;      // 엔진 원본 act
  Object.defineProperty(g, '__inst', { value: true, enumerable: false, configurable: true });
  Object.defineProperty(g, 'act', {
    enumerable: false, configurable: true, writable: true,
    value: function(action){
      if (roundRec && this === g)
        roundRec.actions.push({ p: this.currentPlayer, ph: this.phase, a: JSON.parse(JSON.stringify(action)) });
      return base.call(this, action);
    },
  });
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
  roundRec.analysis = null;          // 라인이 바뀌므로 분석 캐시 무효
  roundRec.statsCounted = false;
  game = g2; instrument(game);
  undoUsed[gp]++;
  selDiscard = []; bidSel = {giruda:null,count:null}; reviseSel = {on:false,giruda:null,count:null};
  friendCustom = false; ghost = null; busy = false;
  claimMode = false; claimShown = false; bidFlash = null; resetBidChips();
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
/* ---------------- v2 세션 통계 (localStorage 누적) ---------------- */
const STATS_KEY='mighty_stats_v1';
function loadStats(){
  const d={rounds:0,wins:0,declR:0,declW:0,prize:0,crit:0,loss:0,anR:0};
  try{ return {...d, ...JSON.parse(localStorage.getItem(STATS_KEY)||'{}')}; }
  catch(e){ return d; }
}
let lifeStats=loadStats();
function saveStats(){ try{ localStorage.setItem(STATS_KEY, JSON.stringify(lifeStats)); }catch(e){} }
/** 분석 완료된 라운드의 하이라이트를 누적 통계에 1회만 반영 */
function statsFromAnalysis(rec){
  if (!rec.analysis || rec.statsCounted) return;
  rec.statsCounted=true;
  lifeStats.anR++;
  for (const h of rec.analysis.highlights){
    if (h.grade==='결정적') lifeStats.crit++;
    else if (h.grade==='손해') lifeStats.loss++;
  }
  saveStats();
}
function statsLineHtml(){
  const s2=lifeStats;
  if (!s2.rounds) return '';
  const w=(100*s2.wins/s2.rounds).toFixed(0);
  const pz=(s2.prize/s2.rounds>=0?'+':'')+Math.round(s2.prize/s2.rounds);
  let txt=tf('statsLine', s2.rounds, w, s2.declR, s2.declW, pz);
  if (s2.anR) txt+=tf('statsMistakes', s2.crit+s2.loss, s2.anR);
  return `<div class="an-sub stats-line">${txt}</div>`;
}

/* ---------------- v2 AI 복기 (분석·하이라이트) ---------------- */
let analysisBusy=false;

/** 좌석별 분석 캐시 — 나(HUMAN)는 rec.analysis(통계 연동), AI 좌석은 rec.analysisAI[s] */
function analysisOf(rec, seat){
  return seat===HUMAN ? rec.analysis : (rec.analysisAI ? rec.analysisAI[seat] : null);
}

async function openAnalysis(rec, seat){
  if (!rec){ toast(t('복기할 라운드가 없습니다')); return; }
  if (seat===undefined) seat=HUMAN;
  const box=$('#modal-box');
  box.innerHTML=`<h2>${t('AI 복기')}</h2>
    <div class="chips" id="an-seats" style="margin:6px 0"></div>
    <div class="sub" id="an-status">${t('분석 중')}…</div>
    <div id="an-body"></div>
    <div class="btnrow"><button class="btn ghost" id="an-close">${t('닫기')}</button></div>`;
  // 관전 복기 — AI 좌석의 결정도 같은 파이프라인으로 분석 (증류 후보 축적용)
  const chips=$('#an-seats');
  for(let s2=0;s2<E.NUM_PLAYERS;s2++){
    const b=el('button','chip'+(s2===seat?' on':''), NAMES[s2]);
    b.onclick=()=>{ if(!analysisBusy && s2!==seat) openAnalysis(rec, s2); };
    chips.append(b);
  }
  $('#modal').classList.add('show');
  // 닫으면 정산 화면으로 복귀 (정산 반영은 settledRound 가드로 중복 없음)
  $('#an-close').onclick=()=>{ if (game && game.phase==='done') showSettlement();
                               else $('#modal').classList.remove('show'); };
  if (!analysisOf(rec, seat)){
    if (analysisBusy) return;
    analysisBusy=true;
    try{
      if (!await ensureMaster()){ $('#an-status').textContent=t('분석은 마스터 모델이 필요합니다'); return; }
      const tick=()=>new Promise(r=>setTimeout(r,0));   // 프레임 양보 (메인 스레드 청크 실행)
      const st=()=>$('#an-status');
      const res=await MightyAnalysis.analyzeRound(masterSess, ortLib, rec, seat,
        { topK:5, n:24, seed:(rec.seed>>>0)||7, tick,
          onProgress:(d,n)=>{ const s=st(); if(s) s.textContent=`${t('분석 중')}… ${d}/${n}`; } });
      if (seat===HUMAN) rec.analysis=res;
      else { if(!rec.analysisAI) rec.analysisAI={}; rec.analysisAI[seat]=res; }
    }catch(e){
      const s=$('#an-status'); if(s) s.textContent=t('분석 실패');
      analysisBusy=false; return;
    }
    analysisBusy=false;
    if (seat===HUMAN) statsFromAnalysis(rec);
  }
  renderAnalysis(rec, seat);
}

function renderAnalysis(rec, seat){
  if (seat===undefined) seat=HUMAN;
  const res=analysisOf(rec, seat), body=$('#an-body'), st=$('#an-status');
  if (!res || !body) return;
  if (st) st.textContent='';
  // EV 곡선 — 인간 결정 시점의 좌석 기대상금 (마스터 가치망 기준)
  const W=560, H=96, pad=8;
  const pts=res.evCurve;
  let svg='';
  if (pts.length>1){
    const x=i=>pad+(W-2*pad)*i/(pts.length-1);
    const y=v=>{ const c=Math.max(-1,Math.min(1,v)); return H/2-(H/2-pad)*c; };
    const line=pts.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
    const marks=res.highlights.map(h=>{
      const i=pts.findIndex(p=>p.idx===h.idx); if(i<0) return '';
      const cls=h.grade==='결정적'?'#ff8a80':h.grade==='손해'?'#ffcf7a':'#aeb6c0';
      return `<circle cx="${x(i).toFixed(1)}" cy="${y(pts[i].v).toFixed(1)}" r="5" fill="${cls}"/>`;
    }).join('');
    svg=`<svg id="an-ev" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line x1="${pad}" y1="${H/2}" x2="${W-pad}" y2="${H/2}" stroke="rgba(255,255,255,.15)"/>
      <path d="${line}" fill="none" stroke="var(--gold)" stroke-width="2"/>
      ${marks}</svg>
      <div class="an-sub">${t('기대상금')} — ${t('마스터 기준')}</div>`;
  }
  const cards=res.highlights.length ? res.highlights.map((h,i)=>{
    const cls=h.grade==='결정적'?'g-crit':h.grade==='손해'?'g-loss':'g-slip';
    const wr=`${t('승률')} ${h.flip.act.win}/${h.flip.act.n} → ${h.flip.alt.win}/${h.flip.alt.n} · ${h.flip.act.n}${t('회 시뮬')}`;
    return `<div class="an-card"><span class="an-badge ${cls}">${t(h.grade)}</span>
      <div class="an-main">${tf('trickN', h.trick)} · ${h.actual} → ${h.alt}<span class="an-d">+${num(h.lineGain)}</span>
        <div class="an-sub">${wr} · ${t('평균')} +${num(h.dPrize)}</div></div>
      <button class="btn quiet" data-hl="${i}">${t('보기')}</button></div>`;
  }).join('') : `<div class="an-sub" style="margin-top:10px">${t('표시할 실수가 없습니다 — 좋은 판이었습니다')}</div>`;
  body.innerHTML=svg+cards;
  body.querySelectorAll('button[data-hl]').forEach(b=>{
    b.onclick=()=>openHighlight(rec, res.highlights[parseInt(b.dataset.hl,10)], seat);
  });
}
/** 액션 인덱스 → 플레이 스텝 인덱스 */
function stepIndexOfAction(rec, actIdx){
  const ps=rec.actions.findIndex(x=>x.ph==='play');
  let n=0;
  for (let i=ps;i<actIdx;i++) if (rec.actions[i].ph==='play') n++;
  return n;
}

function openHighlight(rec, h, seat){
  if (seat===undefined) seat=HUMAN;
  $('#modal').classList.remove('show');
  startReplay(rec);
  if (!replay) return;
  toggleReplayPlay(false);
  const ghostRec={ ...rec, actions:h.ghost.actions, result:h.ghost.result, analysis:null };
  // 라인 결과 비교 — 분석 좌석 팀의 점수카드 수와 그 좌석 상금 (대안 라인은 한 판 기준)
  let cmp=null;
  const aR=rec.result, gR=h.ghost && h.ghost.result;
  if (aR && gR){
    const ruling=(seat===replay.declarer || (replay.friend!==null && seat===replay.friend));
    cmp={ aPts: ruling?aR.yeodangPoints:aR.yadangPoints,
          gPts: ruling?gR.yeodangPoints:gR.yadangPoints,
          aPrize:aR.prizes[seat], gPrize:gR.prizes[seat] };
    // 대표 라인이 실제보다 낮거나 같으면 — 카드의 기대상금(시뮬 평균)과
    // 이 한 판의 결과가 왜 다른지/같은지 병기한다.
    cmp.note = (cmp.gPrize - cmp.aPrize) < 0;
    cmp.tie  = (cmp.gPrize - cmp.aPrize) === 0;
  }
  replay.hl={ h, rec, ghostRec, alt:false, cmp, seat };
  jumpToHighlight();
}

/** 현재 라인(실제/대안)에서 하이라이트 직전으로 이동 후, 잠깐 멈췄다 강조 재생 */
function jumpToHighlight(){
  const hl=replay && replay.hl; if(!hl) return;
  const rec2=hl.alt ? hl.ghostRec : hl.rec;
  if (replay.timer){ clearTimeout(replay.timer); replay.timer=null; }
  replay.playing=false; replay.ghost=null;
  replay.rec=rec2;
  replay.playStart=rec2.actions.findIndex(x=>x.ph==='play');
  replay.steps=rec2.actions.slice(replay.playStart).filter(x=>x.ph==='play');
  replay.g=rebuildGame(rec2, replay.playStart);
  replay.step=0;
  const target=stepIndexOfAction(rec2, hl.h.idx);
  while (replay.step<target && replay.step<replay.steps.length){
    replay.g.act(replay.steps[replay.step].a); replay.step++;
  }
  replay.emphStep=target;                 // 이 스텝을 밟는 순간 강조
  renderReplay();
  setTimeout(()=>{
    if (replay && replay.hl && replay.step===target) replayStepForward();
  }, 900);
}

function toggleAltLine(){
  const hl=replay && replay.hl; if(!hl) return;
  hl.alt=!hl.alt;
  jumpToHighlight();
}

/* ---------------- v2 코칭 (마스터 추천 카드 + 근거 버블) ---------------- */
/* ---------------- 규칙기반 조언자 ----------------
 * 코칭은 지금까지 마스터 모델이 있어야만 돌았고, 플레이 국면만 다뤘다. 초보자에게
 * 16MB 내려받기를 강요하면 첫 판을 두기도 전에 이탈하고, 정작 막막한 공약 선언·
 * 바닥패 묻기·프렌드 지정에는 아무 안내가 없었다.
 *
 * 규칙기반 고급 에이전트는 네 국면 전부에 답을 내고, evalHand가 근거를 성분으로
 * 쪼개 놓아(기루다 길이·마이티/조커 보유·사이드 A·보이드) 그대로 말로 풀 수 있다.
 * 신경망 추천은 왜 그런지를 말해주지 못하므로, 설명이 필요한 국면에서는 이쪽이 낫다.
 *
 * 성향은 밸런스 고정, rng는 고정 시드다 — 같은 자리에서 추천이 흔들리면 신뢰가 깨진다.
 * 매번 새로 만드는 이유도 그것이다(rng 상태가 넘어가면 재렌더마다 답이 달라진다).
 */
function ruleAdvice(){
  if (!game) return null;
  try{
    const ag=new E.HeuristicAgent(E.PERSONAS.balanced, E.makeRng(0x4D2), {tier:'advanced'});
    return { ag, act: ag.act(game) };
  }catch(e){ return null; }        // 조언은 조용히 실패한다 — 게임은 계속돼야 한다
}

/** 기루다가 정해지기 전에도 마이티는 정해진다 — 기루다가 스페이드면 다이아 A. */
function mightyFor(g){ return g==='S' ? {suit:'D',rank:14} : {suit:'S',rank:14}; }

/** 공약 근거로 쓸 손패 성분. evalHand가 보는 것과 같은 관점으로 센다. */
function handShape(hand, g){
  const m=mightyFor(g), by={S:0,D:0,H:0,C:0};
  let aces=0, hasM=false, hasJ=false;
  for(const c of hand){
    if (E.isJoker(c)){ hasJ=true; continue; }
    by[c.suit]++;
    if (E.sameCard(c,m)) hasM=true;
    else if (c.rank===14 && c.suit!==g) aces++;
  }
  let voids=0;
  if (g!=='N') for(const s of E.SUITS) if (s!==g && by[s]===0) voids++;
  return { aces, hasM, hasJ, voids, len: g==='N' ? 0 : by[g] };
}

function adviceBidding(ag, act){
  const hand=game.hands[HUMAN], R=[];
  if (act.type!=='bid'){
    const best=ag.bestGiruda(hand, game);
    R.push(TF.advPass(), TF.advEst(Math.max(0, Math.round(best.est))),
           TF.advShort(game.config.minBid));
  } else {
    const g=act.giruda, sh=handShape(hand, g);
    R.push(TF.advBid(act.count, g), TF.advEst(Math.round(ag.evalHand(hand, g, game).est)));
    if (g!=='N' && sh.len) R.push(TF.advTrumpLen(g, sh.len));
    if (sh.hasM) R.push(TF.advHasM());
    if (sh.hasJ) R.push(TF.advHasJ());
    if (sh.aces) R.push(TF.advAces(sh.aces));
    if (sh.voids) R.push(TF.advVoid(sh.voids));
  }
  R.push(TF.advBidRule(E.TOTAL_POINT_CARDS));
  return R;
}

function adviceFloor(act){
  const R=[TF.advBury(act.discard.map(cardLabel).join(' ')),
           TF.advBuryKeep(), TF.advBuryVoid()];
  if (act.revise) R.push(TF.advRevise(act.revise.count, act.revise.giruda));
  return R;
}

function adviceFriend(act){
  if (act.mode==='none') return [TF.advFriendNone(), TF.advFriendSolo()];
  if (act.mode==='first') return [TF.advFriendFirst(), TF.advFriendFirstWhy()];
  return [TF.advFriendCard(cardLabel(act.card)), TF.advFriendWhy()];
}

/** 시트 맨 위 조언 상자. 추천 액션을 돌려줘 칩 강조에 쓴다. */
function sheetAdvice(sh){
  if (!settings.ui.coach) return null;
  const adv=ruleAdvice(); if (!adv) return null;
  const act=adv.act;
  let lines=null;
  if (game.phase==='bidding') lines=adviceBidding(adv.ag, act);
  else if (game.phase==='floor' && act.type==='exchange') lines=adviceFloor(act);
  else if (game.phase==='friend' && act.type==='friend') lines=adviceFriend(act);
  if (!lines) return null;
  const box=el('div','coach-note');
  box.append(el('div','ch', lines[0]));
  for (const l of lines.slice(1)) box.append(el('div','cb', l));
  sh.append(box);
  return act;
}

let coachGen=0;
let coachTipEl=null;
function coachTipHide(){ if(coachTipEl){ coachTipEl.remove(); coachTipEl=null; } }
function coachTipShow(anchor, lines){
  coachTipHide();
  if (!lines.length) return;
  const d=el('div'); d.id='coach-tip';
  d.innerHTML=lines.map(s=>`<div>${s}</div>`).join('');
  document.body.append(d);
  const r=anchor.getBoundingClientRect();
  let x=r.left+r.width/2-d.offsetWidth/2;
  x=Math.max(8, Math.min(window.innerWidth-d.offsetWidth-8, x));
  d.style.left=x+'px';
  d.style.top=Math.max(8, r.top-d.offsetHeight-26)+'px';
  d._anchor=anchor;
  coachTipEl=d;
}
window.addEventListener('resize', ()=>{
  if (coachTipEl && coachTipEl._anchor && coachTipEl._anchor.isConnected)
    coachTipShow(coachTipEl._anchor, [...coachTipEl.children].map(e=>e.innerHTML));
  else coachTipHide();
});

/* ---------- 실제로 보이는 화면 높이 ----------
 * 모바일 브라우저의 주소창·하단 툴바는 화면을 갉아먹는데, CSS의 100vh는 그걸
 * 모른다(툴바가 접힌 큰 화면 기준). 그래서 맨 아래에 놓인 손패가 툴바 뒤로
 * 숨는다. 앱을 전환했다 돌아오면 브라우저가 다시 재보고 정상으로 보이던 것도
 * 같은 이유 — 레이아웃이 아니라 '높이 측정'이 어긋난 상태였다.
 * visualViewport는 지금 이 순간 실제로 보이는 높이를 준다. 그걸 정본으로 쓰고,
 * 값이 바뀔 때마다 다시 심는다. 100dvh는 이 API가 없는 구형 브라우저용 폴백. */
function syncViewportHeight(){
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  if (h > 0) document.documentElement.style.setProperty('--vvh', h + 'px');
}
syncViewportHeight();
window.addEventListener('resize', syncViewportHeight);
window.addEventListener('orientationchange', syncViewportHeight);
window.addEventListener('pageshow', syncViewportHeight);
// 탭 복귀 시점 — 사용자가 '전환 후 돌아오면 보인다'고 한 그 순간에도 다시 잰다
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) syncViewportHeight(); });
if (window.visualViewport){
  window.visualViewport.addEventListener('resize', syncViewportHeight);
  window.visualViewport.addEventListener('scroll', syncViewportHeight);
}

/** 추천 수의 근거 — HUMAN 시점 가시 정보만 사용(출현 카드·내 손·주공이면 묻은 패).
 *  상대 손패·비공개 프렌드 등 전지적 정보는 쓰지 않는다. */
function coachReasons(g, act, guardFired){
  const R=[];
  const pl=g.play, gi=g.contract.giruda, c=act.card;
  const isJk=E.isJoker(c), isMighty=!isJk && E.sameCard(c, g.mightyCard);
  const seen=new Set();
  for(const tr of pl.history) for(const e of tr.plays) seen.add(E.cardId(e.card));
  for(const e of pl.table) seen.add(E.cardId(e.card));
  for(const h of g.hands[HUMAN]) seen.add(E.cardId(h));
  if (HUMAN===g.declarer && g.discard) for(const d of g.discard) seen.add(E.cardId(d));
  const out=id=>!seen.has(id);
  const jokerWeak = pl.jokerCallActive ||
    (g.config.firstTrickJokerWeak && pl.trickNo===1) ||
    (g.config.lastTrickJokerWeak && pl.trickNo===E.HAND_SIZE);
  const behind=E.NUM_PLAYERS-1-pl.table.length;
  const tablePts=pl.table.filter(e=>E.isPointCard(e.card)).length;
  let trumpOut=0;
  if (gi!=='N') for(let r=2;r<=14;r++) if(out(gi+r)) trumpOut++;

  // 아군 판별(가시 정보만): 주공이면 공개된 프렌드, 내가 프렌드(카드 보유 또는 공개)면 주공
  let ally=null;
  if (HUMAN===g.declarer){ if (g.friendRevealed && g.friend!==null) ally=g.friend; }
  else if ((g.friendRevealed && g.friend===HUMAN) ||
           (g.friendDecl && g.friendDecl.mode==='card' && g.friendDecl.card &&
            g.hands[HUMAN].some(h=>E.sameCard(h,g.friendDecl.card)))) ally=g.declarer;

  // 현재 테이블 서열 비교 (엔진의 트릭 판정 로직 재사용)
  const myStr=g._cardStrength({player:HUMAN, card:c, jokerSuit:act.jokerSuit}, pl);
  let bestStr=[-2,-1], bestP=null;
  for(const e of pl.table){
    const k=g._cardStrength(e, pl);
    if (k[0]>bestStr[0]||(k[0]===bestStr[0]&&k[1]>bestStr[1])){ bestStr=k; bestP=e.player; }
  }
  const beats=myStr[0]>bestStr[0]||(myStr[0]===bestStr[0]&&myStr[1]>bestStr[1]);

  // 1줄: 판단
  if (act.jokerCall) R.push(TF.coachJokerCall());
  else if (isMighty) R.push(TF.coachMighty());
  else if (isJk && !jokerWeak) R.push(TF.coachJoker());
  else if (pl.table.length===0){
    // '기루다 정리'는 여당(주공/확인된 프렌드) 관점 문구 — 야당 기루다 리드에 붙이면 오해
    const iAtt = HUMAN===g.declarer || (ally!==null && ally===g.declarer);
    if (gi!=='N' && c.suit===gi && trumpOut>0 && iAtt) R.push(TF.coachTrumpSweep(trumpOut));
    else {
      let higher=0;
      for(let r=c.rank+1;r<=14;r++) if(out(c.suit+r)) higher++;
      R.push(higher===0 ? TF.coachTopCard() : TF.coachSafeLead());
    }
  } else if (beats){
    R.push(behind===0 ? TF.coachTake(tablePts) : TF.coachBest(behind));
  } else if (ally!==null && bestP===ally){
    R.push(E.isPointCard(c) ? TF.coachFeed() : TF.coachDuck());
  } else R.push(TF.coachLose());

  // 2줄: 위협 (내 카드를 이길 수 있는 미출현 카드)
  // 리드하거나 현재 이기는 중일 때만 — 버리는 패·마지막 순서엔 무의미라 생략
  if (!isMighty && !(isJk && !jokerWeak) &&
      (pl.table.length===0 || (beats && behind>0))){
    const th=[];
    if (out(E.cardId(g.mightyCard))) th.push(t('마이티'));
    if (out(E.JOKER) && !jokerWeak) th.push(t('조커'));
    if (!isJk){
      let higher=0;
      for(let r=c.rank+1;r<=14;r++) if(out(c.suit+r)) higher++;
      if (higher>0) th.push(TF.coachHigher(higher));
      if (gi!=='N' && c.suit!==gi && trumpOut>0 && (pl.table.length===0 || behind>0))
        th.push(TF.coachTrumpCut());
    }
    R.push(th.length ? TF.coachThreats(th.join(' · ')) : TF.coachNoThreat());
  }

  // 3줄: 가드 발동 또는 걸린 점수
  if (guardFired) R.push(TF.coachGuard());
  else {
    const pts=tablePts+(E.isPointCard(c)?1:0);
    if (pts>0 && pl.table.length>0) R.push(TF.coachPts(pts, behind));
  }
  return R.slice(0,3);
}

async function coachUpdate(){
  const gen=++coachGen;
  document.querySelectorAll('#hand .hcard.coach').forEach(e=>e.classList.remove('coach'));
  coachTipHide();
  if (!settings.ui.coach || !game || replay) return;
  if (game.currentPlayer!==HUMAN || busy) return;

  // 바닥패: 묻을 3장을 손패에 찍는다. 근거는 시트의 조언 상자가 말한다.
  if (game.phase==='floor'){
    const adv=ruleAdvice();
    if (adv && adv.act.type==='exchange') for (const c of adv.act.discard) markCoach(E.cardId(c));
    return;
  }
  if (game.phase!=='play') return;

  // 모델이 아직 없으면 비워두는 대신 규칙기반 추천을 먼저 보여준다. 16MB를
  // 기다리는 동안 아무 안내도 못 받던 구간이 여기였다. 모델이 오면 갈아끼운다.
  if (!masterSess){
    const adv=ruleAdvice();
    if (adv && adv.act.type==='play')
      markCoach(E.cardId(adv.act.card),
                beginnerPlayRule().concat(coachReasons(game, adv.act, false)));
    if (!settings.ui.beginner) ensureMaster();   // 초보자에게 16MB를 강요하지 않는다
    return;
  }
  try{
    // 마스터 좌석의 실제 플레이 경로와 완전히 동일해야 한다:
    // chooseAction(정책) → actionToEngine → keyCardGuard(낭비 차단 후처리).
    // 이전 구현은 가드를 건너뛴 원시 argmax를 보여줘 실제 마스터가 내지 않을
    // 낭비 수를 추천했다(실플레이 제보).
    const a=await MightyMaster.chooseAction(masterSess, ortLib, game, HUMAN, []);
    if (gen!==coachGen || !game || game.phase!=='play' || game.currentPlayer!==HUMAN) return;
    const raw=MightyMaster.actionToEngine(a, game, []);
    if (!raw || raw.type!=='play') return;
    const kg=MightyAI.keyCardGuard(game, HUMAN, raw);   // 문구 판정용(가드 체인은 아래 한 줄)
    const act=await MightyAI.applyGuards(masterSess, ortLib, game, HUMAN, raw);
    if (gen!==coachGen || !game || game.phase!=='play' || game.currentPlayer!==HUMAN) return;
    const guardFired=!E.sameCard(raw.card, kg.card);   // 키카드 가드만 별도 문구
    markCoach(E.cardId(act.card),
              beginnerPlayRule().concat(coachReasons(game, act, guardFired)));
  }catch(e){ /* 코칭은 조용히 실패 */ }
}

/** 초보자 모드에서만 붙는 규칙 한 줄. coachReasons는 건드리지 않는다 —
 *  그 함수의 출력 계약(1~3줄)에 기대는 곳이 있다(tests/smoke.test.js). */
function beginnerPlayRule(){
  if (!settings.ui.beginner || !game || game.phase!=='play') return [];
  const pl=game.play;
  if (!pl.table.length) return [TF.ruleLead()];
  const led=pl.ledSuit;
  if (!led) return [];
  return [game.hands[HUMAN].some(c=>!E.isJoker(c) && c.suit===led)
    ? TF.ruleFollow(led) : TF.ruleFree()];
}

/** 손패의 그 카드에 AI 표식을 찍고, 근거가 있으면 버블까지 띄운다. */
function markCoach(cid, lines){
  const elc=document.querySelector(`#hand .hcard[data-cid="${cid}"]`);
  if (!elc) return;
  elc.classList.add('coach');
  if (lines && lines.length) coachTipShow(elc, lines);
}

/** 매치 전 라운드 통합 AI 요약 — 결정적 순간 상위 3선 */
async function openMatchSummary(){
  const recs=matchLog.filter(r=>r.result);
  if (!recs.length){ toast(t('분석할 라운드가 없습니다')); return; }
  const box=$('#modal-box');
  box.innerHTML=`<h2>${t('매치 AI 요약')}</h2><div class="sub" id="an-status"></div><div id="an-body"></div>
    <div class="btnrow"><button class="btn ghost" id="an-close">${t('닫기')}</button></div>`;
  $('#modal').classList.add('show');
  $('#an-close').onclick=()=>showFinal();
  if (!await ensureMaster()){ const st=$('#an-status'); if(st) st.textContent=t('분석은 마스터 모델이 필요합니다'); return; }
  const tick=()=>new Promise(r=>setTimeout(r,0));
  for (let i=0;i<recs.length;i++){
    const rec=recs[i];
    if (rec.analysis) continue;
    const st=$('#an-status'); if(st) st.textContent=`${t('분석 중')}… ${i+1}/${recs.length}`;
    try{
      rec.analysis=await MightyAnalysis.analyzeRound(masterSess, ortLib, rec, HUMAN,
        { topK:5, n:24, seed:(rec.seed>>>0)||7, tick });
      statsFromAnalysis(rec);
    }catch(e){ /* 한 라운드 실패는 건너뛴다 */ }
  }
  { const st=$('#an-status'); if(st) st.textContent=''; }
  const rank={ '결정적':0, '손해':1, '부정확':2 };
  const all=[];
  for (const rec of recs)
    for (const h of (rec.analysis ? rec.analysis.highlights : [])) all.push({ rec, h });
  all.sort((a,b)=> (rank[a.h.grade]-rank[b.h.grade]) || (b.h.lineGain-a.h.lineGain));
  const top=all.slice(0,3);
  const body=$('#an-body'); if (!body) return;
  body.innerHTML = top.length
    ? `<div class="sub" style="margin-top:6px">${t('이번 매치 결정적 순간')}</div>` + top.map((x,i)=>{
        const cls=x.h.grade==='결정적'?'g-crit':x.h.grade==='손해'?'g-loss':'g-slip';
        return `<div class="an-card"><span class="an-badge ${cls}">${t(x.h.grade)}</span>
          <div class="an-main">${tf('roundTrick', x.rec.round, x.h.trick)} · ${x.h.actual} → ${x.h.alt}<span class="an-d">+${num(x.h.lineGain)}</span>
            <div class="an-sub">${t('승률')} ${x.h.flip.act.win}/${x.h.flip.act.n} → ${x.h.flip.alt.win}/${x.h.flip.alt.n} · ${x.h.flip.act.n}${t('회 시뮬')} · ${t('평균')} +${num(x.h.dPrize)}</div></div>
          <button class="btn quiet" data-ms="${i}">${t('보기')}</button></div>`;
      }).join('')
    : `<div class="an-sub" style="margin-top:10px">${t('하이라이트가 없습니다 — 깔끔한 매치였습니다')}</div>`;
  body.querySelectorAll('button[data-ms]').forEach(b=>{
    b.onclick=()=>{ const x=top[parseInt(b.dataset.ms,10)]; openHighlight(x.rec, x.h); };
  });
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
  const ab=$('#rp-alt'); if (ab) ab.remove();
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
/** 한 트릭 뒤로 — 트릭 경계(5수 단위)로 되감아 그 트릭이 완성된 화면에서 정지 */
function replayPrevTrick(){
  if (!replay || replay.stepping) return;
  toggleReplayPlay(false);
  const s = replay.step;
  const target = (s % E.NUM_PLAYERS === 0)
    ? Math.max(0, s - E.NUM_PLAYERS)
    : Math.floor(s / E.NUM_PLAYERS) * E.NUM_PLAYERS;
  replay.ghost = null;
  replay.g = rebuildGame(replay.rec, replay.playStart);
  replay.step = 0;
  while (replay.step < target){
    replay.g.act(replay.steps[replay.step].a);
    replay.step++;
  }
  // 경계에서는 직전 트릭을 완성 상태로 붙잡아 보여준다 (앞으로 재생과 동일한 화면)
  const hist = replay.g.play && replay.g.play.history;
  if (replay.step > 0 && hist && hist.length){
    const h = hist[hist.length - 1];
    replay.ghost = { plays: h.plays, winner: h.winner };
  }
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
  renderSeats();                    // 좌석 배지·트릭 수·더미를 복기 상태로
  // 헤드: 공약·주공·프렌드
  const fd = replay.friendDecl;
  const fTxt = !fd ? '-' : fd.mode==='none' ? t('노프렌드')
    : fd.mode==='first' ? (replay.friend===null? t('셀프') : NAMES[replay.friend])
    : (replay.friend===null ? `${cardLabel(fd.card)} (${t('셀프')})` : `${cardLabel(fd.card)} → ${NAMES[replay.friend]}`);
  $('#replay-head').innerHTML = tf('replayHead', replay.rec.round,
    `${replay.contract.count}${gLabel(replay.contract.giruda)}`, NAMES[replay.declarer], fTxt)
    + (replay.hl && replay.hl.alt ? ` · <span class="alt-tag">${t('대안 라인(가정)')}</span>` : '')
    + (replay.hl && replay.hl.seat!==undefined && replay.hl.seat!==HUMAN
        ? ` · <span class="alt-tag">${t('관전')}: ${NAMES[replay.hl.seat]}</span>` : '')
    + (replay.hl && replay.hl.cmp ? (()=>{ const c=replay.hl.cmp;
        const sg=v=>(v>0?'+':'')+num(v);
        return `<br><span class="alt-cmp">${tf('altCmp', c.aPts, sg(c.aPrize), c.gPts, sg(c.gPrize),
                sg(c.gPts-c.aPts), sg(c.gPrize-c.aPrize))
                + (c.note ? tf('altCmpNote', num(replay.hl.h.dPrize))
                   : c.tie ? tf('altCmpTie', num(replay.hl.h.dPrize)) : '')}</span>`; })() : '');
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
    // 하이라이트 강조 — 결정적 수를 밟은 직후, 그 카드를 확대·EV 표시
    if (replay.hl && replay.step===replay.emphStep+1 && e.player===HUMAN){
      c.classList.add('emph');
      const d=replay.hl.h.lineGain;
      slot.append(el('div','ev-chip', `${t('기대상금')} ${replay.hl.alt?'+':'−'}${num(d)}`));
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
  bar.append(mk('↺', replayRestart));
  bar.append(mk('⏮', replayPrevTrick));
  bar.append(mk(replay.playing?'⏸':'▶', ()=>toggleReplayPlay(), 'primary'));
  bar.append(mk('⏭', replayNextTrick));
  const tn = gh ? gh.trickNo : (g.phase==='play' ? g.play.trickNo : 10);
  const info = el('div','info', tf('replayProgress', Math.min(tn,10), replay.step, replay.steps.length));
  if (gh) info.innerHTML += `<br><span style="color:var(--gold)">${NAMES[gh.winner]}${gh.points?' +'+gh.points:''}</span>`;
  bar.append(info);
  // 하이라이트 모드 — 라인 전환 버튼 (바 재구축 이후에 넣어야 살아남는다)
  if (replay.hl){
    const ab=mk(replay.hl.alt ? t('실제 라인') : t('대안 라인'), toggleAltLine,
                replay.hl.alt ? '' : 'primary');
    ab.id='rp-alt';
    bar.append(ab);
  }
  // 하이라이트 복기 중에는 항상 '실제' 기록을 내보낸다. 대안 라인(replay.rec가
  // ghostRec인 상태)을 그대로 내보내면 시뮬 라인이 실제 기록처럼 저장된다 —
  // 트릭 절반이 가상인데 겉보기 구분이 없어 제보 혼선의 원인이었다.
  bar.append(mk(t('내보내기'), ()=>exportRound(replay.hl ? replay.hl.rec : replay.rec)));
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
  if (rec.abTest) L.push(`- A/B 테스트: ${rec.abTest} · 그룹: ${rec.abArm}`);
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
  if (rec.analysis && rec.analysis.highlights.length){
    L.push('');
    L.push('## AI 하이라이트 (마스터 기준)');
    for (const h of rec.analysis.highlights)
      L.push(`- 트릭 ${h.trick} [${h.grade}] ${h.actual} → ${h.alt} · 라인 이득 +${h.lineGain}` +
             ` (시뮬 평균 +${h.dPrize}) · 승률 ${h.flip.act.win}/${h.flip.act.n} → ${h.flip.alt.win}/${h.flip.alt.n}`);
  }
  // 관전 복기(AI 좌석) 결과 — 증류 후보 축적용. 분석한 좌석만 실린다.
  if (rec.analysisAI) for (const s of Object.keys(rec.analysisAI)){
    const an=rec.analysisAI[s];
    if (!an || !an.highlights.length) continue;
    L.push('');
    L.push(`## 관전 복기 — ${nm(+s)} (마스터 기준)`);
    for (const h of an.highlights)
      L.push(`- 트릭 ${h.trick} [${h.grade}] ${h.actual} → ${h.alt} · 라인 이득 +${h.lineGain}` +
             ` (시뮬 평균 +${h.dPrize}) · 승률 ${h.flip.act.win}/${h.flip.act.n} → ${h.flip.alt.win}/${h.flip.alt.n}`);
  }
  L.push('');
  L.push('## 재현용 원본');
  L.push('```json');
  L.push(JSON.stringify({ seed: rec.seed, dealer: rec.dealer, version: rec.version, tier: rec.tier,
                          abTest: rec.abTest, abArm: rec.abArm, abFeedback: rec.abFeedback,
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
// 감시 타이머 한도. 탐색을 켜면 봇 한 턴이 길어진다 — 생각 550 + 탐색 최대 1,894
// + 비행 300 + 트릭 연출 1,690이면 4.4초다(브라우저 실측). 3,500ms 고정이던 시절엔
// 정상 진행 중에 워치독이 발동해 stateGen을 올리고 봇 루프를 다시 깔았다.
// 그러면 진행 중이던 턴이 무효화되고 새 루프가 겹쳐 카드가 저절로 나가거나
// 되돌리기가 안 먹는 것처럼 보인다(제보 2026-08-22).
// A/B의 차이는 탐색 여부 하나로 제한한다. B도 같은 한도를 써서 기기 성능이나
// 워치독 재시작이 결과에 섞이지 않게 한다.
const WATCHDOG_MS = () => 3500 + (CLASS_SEARCH ? 2 * (CLASS_SEARCH.budgetMs || 0) : 0);
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
  }, WATCHDOG_MS());
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
  renderSeats(); renderHud(); renderPuck(); renderBidChips();
  renderTrick(); renderHand(); renderSheet(); renderCheat();
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
      // 가드가 먼저다. 무효화된 콜백이 busy를 내리면 살아 있는 루프와 겹친다.
      if (myGen!==stateGen) return;
      busy=false;
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
    setTimeout(()=>{ if (myGen===stateGen) botStep(); }, game.phase==='bidding' ? 0 : claimSpeed().bot);
  }
}
// 봇 루프 계측. 되돌리기·감시 타이머가 새 루프를 깔면 무효화된 옛 루프가 아직
// await에 걸려 있을 수 있다 — 그 겹침 자체는 정상이고 옛 루프는 다음 가드에서 끝난다.
// **진짜 불변식은 "무효화된 루프가 착수까지 가지 않는다"** 이므로 그걸 따로 센다.
// staleActs가 0이 아니면 가드가 뚫린 것이고, 그때 카드가 저절로 나간다.
let botChains = 0, botChainsMax = 0, staleActs = 0;
async function botStep(){
  botChains++; if (botChains > botChainsMax) botChainsMax = botChains;
  try { return await botStepInner(); } finally { botChains--; }
}
async function botStepInner(){
  const myGen=stateGen;
  const p=game.currentPlayer;
  const phase=game.phase;
  if (!agentsReady || !agents[p]) await buildAgents();
  const turn = BID_TURN();
  if (phase==='bidding') await botThink(p, turn * 0.3);
  if (myGen!==stateGen){ busy=false; return; }
  let action;
  try{ action = await agents[p].act(game, p); }
  catch(e){
    // 신경망 좌석이 실패하면 티어와 무관하게 규칙기반으로 떨어뜨리고 다시 만든다.
    // (v2.11.0에서 중급·고급에도 NN 좌석이 생겼는데 이 복구가 마스터 전용이라
    //  실패 시 같은 에이전트를 다시 불러 또 던지고 판이 멈췄다.)
    if (masterState==='ready'||masterState==='loading'){ masterState='failed'; await buildAgents(true); }
    action = await agents[p].act(game, p);
  }
  if (myGen!==stateGen){ busy=false; return; }
  if (phase==='bidding'){
    game.act(action);
    if (action.type==='pass'){ bubble(p,t('패스')); logLine(tf('logPass', NAMES[p]));
      const st=$('#seat-'+p); if(st){ st.classList.remove('announce'); void st.offsetWidth; st.classList.add('announce'); } }
    else { announceBid(p, action.count, action.giruda); logLine(tf('logBid', NAMES[p], action.count, action.giruda)); }
    render();                                   // 칩·퍽을 먼저 그리고
    await sleep(turn * 0.7);                    // 눈으로 따라갈 시간을 준다
    if (myGen!==stateGen){ busy=false; return; }
    busy=false;
    // busy를 내린 **뒤** 한 번 더 그린다. renderSheet는 busy면 시트를 숨기므로,
    // 여기서 다시 그리지 않으면 마지막 AI 공약 뒤 내 차례가 와도 비딩 시트가
    // 숨은 채로 남는다(v2.15.1 회귀, 모바일에서 제보).
    render();
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
    if (myGen!==stateGen){ staleActs++; busy=false; return; }   // 여기까지 오면 가드가 뚫린 것
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
    lifeStats.rounds++; if (humanWin) lifeStats.wins++;
    if (HUMAN===r.declarer){ lifeStats.declR++; if (r.win) lifeStats.declW++; }
    lifeStats.prize+=r.prizes[HUMAN];
    saveStats();
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
    <div class="btnrow grid2"><button class="btn quiet" id="ai-rv-btn">${t('AI 복기')}</button><button class="btn quiet" id="rv-btn">${t('복기')}</button><button class="btn quiet" id="ex-btn">${t('내보내기')}</button><button class="btn primary" id="next-btn"></button></div>`;
  const M=settings.match;
  matchOver = (M.mode==='rounds' && roundNo>=M.rounds) ||
              (M.mode==='target' && Math.max(...totals)>=M.targetPrize);
  $('#next-btn').textContent = matchOver ? t('최종 결과 보기') : t('다음 판');
  $('#modal').classList.add('show');
  const rvb=$('#rv-btn'), exb=$('#ex-btn'), arb=$('#ai-rv-btn');
  if (rvb) rvb.onclick=()=>{ $('#modal').classList.remove('show'); startReplay(matchLog[matchLog.length-1]); };
  if (arb) arb.onclick=()=>openAnalysis(matchLog[matchLog.length-1]);
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
  let s=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`;
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
  return `<div id="fin-chart">${s}</div>`;
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

/* ---------------- 마스터 AI A/B 플레이 경험 ---------------- */
const AB_QUESTIONS = [
  ['friendTiming','프렌드가 필요한 때에 개입했다'],
  ['keyDiscipline','중요한 카드를 불필요하게 쓰지 않았다'],
  ['predictability','AI의 플레이가 납득 가능했다'],
  ['playAgain','이 AI와 다시 플레이하고 싶다'],
];
function abEligible(){ return currentTier()==='master' && (abArm==='A' || abArm==='B'); }
function loadAbFeedbacks(){
  try{ const list=JSON.parse(localStorage.getItem(AB_FEEDBACK_KEY)||'[]'); return Array.isArray(list)?list:[]; }
  catch(e){ return []; }
}
function copyAbResults(){
  const text=JSON.stringify({ schema:1, testId:AB_TEST_ID, responses:loadAbFeedbacks() }, null, 2);
  let done=false;
  const fallback=()=>{
    const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
    ta.select(); try{ done=document.execCommand('copy'); }catch(e){} ta.remove();
    toast(done?t('복사했습니다'):t('직접 선택해 복사하세요'), 1800);
  };
  try{
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(()=>toast(t('복사했습니다'),1800)).catch(fallback);
    else fallback();
  }catch(e){ fallback(); }
}
function saveAbFeedback(ratings){
  const order=[0,1,2,3,4].sort((a,b)=>totals[b]-totals[a]);
  const payload={
    schema:1, testId:AB_TEST_ID, arm:abArm, version:APP_VERSION,
    timestamp:new Date().toISOString(), language:LANG, tier:currentTier(),
    rounds:roundNo, humanPrize:totals[HUMAN], humanRank:order.indexOf(HUMAN)+1,
    ratings,
  };
  matchFeedback=payload;
  for(const rec of matchLog) rec.abFeedback=payload;
  if (roundRec) roundRec.abFeedback=payload;
  try{
    const list=loadAbFeedbacks();
    list.push(payload);
    localStorage.setItem(AB_FEEDBACK_KEY, JSON.stringify(list.slice(-200)));
  }catch(e){}
  return payload;
}
function showAbThanks(after){
  const box=$('#modal-box');
  box.innerHTML=`<h2>${t('응답이 저장되었습니다')}</h2>
    <div class="sub">${t('응답은 이 기기에만 저장됩니다. A/B 그룹은 표시하지 않습니다.')}</div>
    <div class="btnrow"><button class="btn ghost" id="ab-copy">${t('누적 A/B 결과 복사')}</button><button class="btn primary" id="ab-continue">${t('계속')}</button></div>`;
  $('#ab-copy').onclick=()=>copyAbResults();
  $('#ab-continue').onclick=()=>{ $('#modal').classList.remove('show'); after ? after() : showFinal(false); };
}
function openAbSurvey(after){
  if (!abEligible()){ if (after) after(); return; }
  if (matchFeedback){ showAbThanks(after); return; }
  const box=$('#modal-box');
  box.innerHTML=`<h2>${t('이번 AI와의 플레이는 어땠나요?')}</h2>
    <div class="sub">${t('응답은 이 기기에만 저장됩니다. A/B 그룹은 표시하지 않습니다.')}</div>
    <form id="ab-form">${AB_QUESTIONS.map(([key,label])=>`
      <fieldset class="ab-question"><legend>${t(label)}</legend>
        <div class="ab-scale"><span>${t('전혀 아니다')}</span><div>${[1,2,3,4,5].map(n=>`<label><input type="radio" name="${key}" value="${n}" required><span>${n}</span></label>`).join('')}</div><span>${t('매우 그렇다')}</span></div>
      </fieldset>`).join('')}
      <div class="btnrow"><button class="btn ghost" type="button" id="ab-skip">${t('건너뛰기')}</button><button class="btn primary" type="submit">${t('응답 저장')}</button></div>
    </form>`;
  $('#modal').classList.add('show');
  $('#ab-skip').onclick=()=>{ $('#modal').classList.remove('show'); after ? after() : showFinal(false); };
  $('#ab-form').onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget), ratings={};
    for(const [key] of AB_QUESTIONS) ratings[key]=Number(fd.get(key));
    saveAbFeedback(ratings); showAbThanks(after);
  };
}

/* ---------------- 최종 결과 ---------------- */
function showFinal(writeLog=true){
  const box=$('#modal-box');
  const order=[0,1,2,3,4].sort((a,b)=>totals[b]-totals[a]);
  const M=settings.match;
  const why = M.mode==='rounds' ? tf('matchWhyRounds', M.rounds) : tf('matchWhyTarget', M.targetPrize);
  box.innerHTML=`<div class="final-head"><h2>${t('매치 종료')}</h2><div class="sub">${tf('matchSub', why, roundNo)}</div></div>
    <div class="final-layout">
      <div class="final-ranks">
        ${order.map((p,i)=>`<div class="rank-row${i===0?' first':''}">
          <div class="no">${i+1}</div><span class="sw" style="background:${FIN_COLORS[p]}"></span>
          <div class="nm">${NAMES[p]}${p===HUMAN?t('(나)'):
            (nnSeatsActive()?` <span class="style-tag">${t(poolOf(seatModels[p])?poolOf(seatModels[p]).nick:'규칙기반')}</span>`:'')}</div>
          <div class="amt ${totals[p]>0?'pos':totals[p]<0?'neg':''}">${totals[p]>0?'+':''}${num(totals[p])}</div>
        </div>`).join('')}
        ${statsLineHtml()}
      </div>
      <div class="final-trend">${buildFinalChart()}</div>
    </div>
    <div class="final-footer">
      ${abEligible()?`<button class="ab-cta" id="final-ab">${t('플레이 경험 남기기')} <span>1–5</span></button>`:''}
      <div class="btnrow grid2"><button class="btn quiet" id="final-ai">${t('매치 AI 요약')}</button><button class="btn ghost" id="final-exp">${t('전체 내보내기')}</button><button class="btn ghost" id="final-set">${t('룰 설정')}</button><button class="btn primary" id="rematch-btn">${t('새 매치')}</button></div>
    </div>`;
  $('#modal').classList.add('show');
  animateFinalChart();
  if (writeLog) logLine(tf('logMatchEnd', NAMES[order[0]], totals[order[0]]));
  $('#rematch-btn').onclick=()=>{
    if (abEligible() && !matchFeedback){ openAbSurvey(newMatch); return; }
    $('#modal').classList.remove('show'); newMatch();
  };
  const fab=$('#final-ab'); if (fab) fab.onclick=()=>openAbSurvey();
  $('#final-set').onclick=()=>openSettings();
  const fe=$('#final-exp'); if (fe) fe.onclick=()=>exportMatch();
  const fa=$('#final-ai'); if (fa) fa.onclick=()=>openMatchSummary();
}
function newMatch(){
  matchHistory=[];
  assignAbArm();
  // v2.8: 매치마다 좌석 모델(성향) 재추첨 — 로드는 비동기, 완료 전엔 규칙기반 폴백.
  // 티어를 반드시 넘긴다. v2.11.0에서 인자 없이 불러 planFor(undefined)가 중급
  // 구성으로 떨어졌고, 마스터를 골라도 v5 한 좌석 + 규칙기반 셋이 앉았다.
  if (masterState==='ready') assignSeatModels(currentTier()).then(()=>buildAgents(true));
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
  claimMode=false; claimShown=false; claimBy=null; bidFlash=null; resetBidChips();
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

/* ---------------- 규칙 튜토리얼 ----------------
 * 마이티를 모르는 사람이 첫 판 전에 읽는 여덟 장. 텍스트는 src/tutorial.js에 있다.
 * 게임 모달(#modal)·내보내기 오버레이(#expmodal)와 섞지 않고 자체 오버레이를 쓴다 —
 * v1.2.2에서 그 둘을 섞어 게임이 멈춘 적이 있다. 게임 상태를 건드리지 않으므로
 * 진행 중에 열어도 판에 영향이 없다.
 */
let tutStep=0;
function tutSlides(){
  try{ return globalThis.MightyTutorial ? MightyTutorial.slides(LANG) : []; }
  catch(e){ return []; }
}
/** 서술형 표기를 엔진 카드로 옮긴다. 튜토리얼이 엔진 로드 순서에 얽히지 않게 한다. */
function tutCard(d){ return d==='JK' ? E.JOKER : { suit:d.s, rank:d.r }; }
function openTutorial(){
  if (!tutSlides().length) return;
  tutStep=0;
  $('#settings').classList.remove('show');   // 설정에서 열었을 때 두 겹으로 쌓이지 않게
  $('#tut').classList.add('show');
  renderTutorial();
}
/** 완주든 중도 이탈이든 '봤다'로 친다 — 안 그러면 매번 다시 권하게 된다. */
function closeTutorial(){
  $('#tut').classList.remove('show');
  settings.ui.tutorialDone=true; saveSettings(); renderLanding();
}
function renderTutorial(){
  const list=tutSlides();
  if (!list.length){ closeTutorial(); return; }
  tutStep=Math.max(0, Math.min(list.length-1, tutStep));
  const sl=list[tutStep];
  $('#tut-title').textContent=sl.title;
  const b=$('#tut-body'); b.innerHTML=''; b.scrollTop=0;
  for (const line of sl.body) b.append(el('p','tut-p', line));
  if (sl.cards && sl.cards.length){
    const row=el('div','tut-cards');
    const hi=new Set(sl.hi||[]);
    sl.cards.forEach((d,i)=>{
      const c=cardEl(tutCard(d));
      if (hi.has(i)) c.classList.add('win');   // 어느 카드가 이겼는지 그림이 말하게
      row.append(c);
    });
    b.append(row);
  }
  if (sl.note) b.append(el('div','tut-note', sl.note));
  const dots=$('#tut-dots'); dots.innerHTML='';
  for (let i=0;i<list.length;i++){
    const d=el('span','tut-dot'+(i===tutStep?' on':''));
    d.onclick=()=>{ tutStep=i; renderTutorial(); };
    dots.append(d);
  }
  const prev=$('#tut-prev'), next=$('#tut-next');
  prev.textContent=t('이전'); prev.disabled = tutStep===0;
  next.textContent = tutStep===list.length-1 ? t('시작하기') : t('다음');
}
function tutNext(){
  const list=tutSlides();
  if (tutStep>=list.length-1) closeTutorial();
  else { tutStep++; renderTutorial(); }
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
  // 초보자 모드를 맨 위에 둔다 — 처음 온 사람이 가장 먼저 만나야 할 선택이다
  box.append(mk(t('초보자 모드'), [{v:'off',l:t('끔')},{v:'on',l:t('켬')}],
    ()=>settings.ui.beginner?'on':'off', v=>applyBeginner(v==='on')));
  box.append(el('div','land-note', t('추천 수와 그 이유를 매 차례 보여주고, 진행을 느리게 합니다')));
  box.append(mk(t('언어'), [{v:'ko',l:'한국어'},{v:'en',l:'English'}], ()=>LANG, v=>setLang(v)));
  box.append(mk(t('난이도'), [{v:'intermediate',l:t('중급')},{v:'advanced',l:t('고급')},{v:'master',l:t('마스터')}],
    ()=>TIER_OF[settings.ui.difficulty]||'intermediate',
    v=>{ settings.ui.difficulty=v; saveSettings(); ensureNN(); }));
  // 규칙을 모르는 사람에게는 '규칙 배우기'가 주 버튼이어야 한다. 한 번 보고 나면
  // 보조 버튼으로 내려간다 — 이미 아는 사람에게 계속 권하지 않는다.
  const learn=$('#tut-btn'), start=$('#start-btn');
  if (learn && start){
    const lead = !!settings.ui.beginner && !settings.ui.tutorialDone;
    learn.className = 'btn ' + (lead ? 'primary' : 'ghost');
    start.className = 'btn ' + (lead ? 'ghost' : 'primary');
  }
}

/* ---------------- 초기화 ---------------- */
globalThis.MUI = { get game(){return game}, get busy(){return busy},
  get botChainsMax(){return botChainsMax}, get staleActs(){return staleActs},
  resetBotChains(){ botChainsMax = botChains; staleActs = 0; }, get roundRec(){return roundRec}, get masterState(){return masterState}, ensureMaster, ensureNN, get seatModels(){return seatModels.slice()}, get settings(){return settings}, get matchOver(){return matchOver}, get replay(){return replay}, get totals(){return totals.slice()}, get matchLog(){return matchLog}, get roundNo(){return roundNo}, get abArm(){return abArm}, get matchFeedback(){return matchFeedback}, get abFeedbacks(){return loadAbFeedbacks()}, humanAct, playWithAnimation, startRound, newMatch, openSettings, openAnalysis, openHighlight, toggleAltLine, openMatchSummary, openAbSurvey, saveAbFeedback, startReplay, coachReasons, openTutorial, closeTutorial, get tutStep(){return tutStep}, tutSlides, get lifeStats(){return {...lifeStats}} };
document.querySelectorAll('.app-ver').forEach(e=>{ e.textContent = APP_VERSION + ' · ' + APP_BUILD; });
buildSeats();
loadSettings().then(()=>{
  const saved = settings.ui.lang;
  LANG = saved || ((navigator.language||'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  settings.ui.lang = LANG;
  document.documentElement.lang = LANG;
  // 처음 온 사람에게는 초보자 모드를 기본으로 켠다. 한 번이라도 직접 정했으면 그 선택을 따른다.
  if (settings.ui.beginner===null) applyBeginner(lifeStats.rounds===0);
  applyNames(); applyStatic(); renderLanding();
  buildAgents().then(()=>ensureNN());          // 전 티어가 신경망을 쓴다 — 티어에 맞는 모델만 로드
});
$('#start-btn').onclick=()=>{ SFX.unlock(); $('#start').style.display='none'; newMatch(); };
renderLanding();
$('#tut-btn').onclick=()=>openTutorial();
$('#tut-close').onclick=()=>closeTutorial();
$('#tut-prev').onclick=()=>{ if(tutStep>0){ tutStep--; renderTutorial(); } };
$('#tut-next').onclick=()=>tutNext();
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
    // 자동 진행이 켜져 있으면 빠져나올 길을 준다 — 실수로 켜졌을 때 되돌리기 말고는
    // 방법이 없었다(제보 2026-08-23).
    else if (claimMode){ claimMode=false; toast(t('직접 플레이로 전환합니다')); render(); pump(); }
  }
  else if (replay && k===' '){ ev.preventDefault(); toggleReplayPlay(); }
});
$('#log-btn').onclick=()=>$('#log').classList.add('open');
$('#log-close').onclick=()=>$('#log').classList.remove('open');
