# -*- coding: utf-8 -*-
"""마이티 AI 구조 설명 문서 생성기 — 카드·좌석 그림을 정적 SVG로 구워 넣는다."""
import io, os

import pathlib
OUT = str(pathlib.Path(__file__).resolve().parent.parent / "docs" / "nn-architecture.html")

SUITS = [("S", "♠", "#EAEFF7"), ("D", "♦", "#FF7A85"),
         ("H", "♥", "#FF7A85"), ("C", "♣", "#EAEFF7")]
RANKN = {11: "J", 12: "Q", 13: "K", 14: "A"}
rank_s = lambda r: RANKN.get(r, str(r))


def card(x, y, suit, rank, w=34, h=48, on=True, label=None):
    """카드 한 장 SVG."""
    glyph, col = next((g, c) for s, g, c in SUITS if s == suit) if suit != "JK" else ("★", "#FFC000")
    if suit == "JK":
        glyph, col = "JK", "#FFC000"
    fill = "#F3F6FB" if on else "#16233C"
    ink = "#B3121F" if col == "#FF7A85" and on else ("#1B2840" if on else "#4A5A75")
    if suit == "JK":
        ink = "#8A6A10" if on else "#5A4A20"
    t = rank_s(rank) if suit != "JK" else "JK"
    o = [f'<g><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{fill}" '
         f'stroke="{"#8FA3C4" if on else "#324360"}" stroke-width="1"/>']
    o.append(f'<text x="{x+w/2}" y="{y+h*0.42}" text-anchor="middle" '
             f'font-family="Noto Sans KR,sans-serif" font-size="{13 if suit!="JK" else 11}" '
             f'font-weight="700" fill="{ink}">{t}</text>')
    if suit != "JK":
        o.append(f'<text x="{x+w/2}" y="{y+h*0.80}" text-anchor="middle" '
                 f'font-size="15" fill="{ink}">{glyph}</text>')
    else:
        o.append(f'<text x="{x+w/2}" y="{y+h*0.80}" text-anchor="middle" '
                 f'font-size="13" fill="{ink}">★</text>')
    if label:
        o.append(f'<text x="{x+w/2}" y="{y+h+14}" text-anchor="middle" font-size="10.5" '
                 f'fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">{label}</text>')
    o.append("</g>")
    return "".join(o)


def grid53(x0, y0, lit, cw=26, ch=22, gap=2, show_rank_header=True):
    """53칸 카드 격자. lit = {(suit, rank)} 또는 'JK'."""
    o = []
    if show_rank_header:
        for j, r in enumerate(range(2, 15)):
            o.append(f'<text x="{x0+30+j*(cw+gap)+cw/2}" y="{y0-6}" text-anchor="middle" '
                     f'font-size="10" fill="#7F8C9E" font-family="ui-monospace,monospace">{rank_s(r)}</text>')
    for i, (s, g, c) in enumerate(SUITS):
        yy = y0 + i * (ch + gap)
        o.append(f'<text x="{x0+14}" y="{yy+ch*0.72}" text-anchor="middle" font-size="14" '
                 f'fill="{c}">{g}</text>')
        for j, r in enumerate(range(2, 15)):
            xx = x0 + 30 + j * (cw + gap)
            is_on = (s, r) in lit
            o.append(f'<rect x="{xx}" y="{yy}" width="{cw}" height="{ch}" rx="3" '
                     f'fill="{"#FFC000" if is_on else "#16233C"}" '
                     f'stroke="{"#FFD75E" if is_on else "#2A3A55"}" stroke-width="1"/>')
            o.append(f'<text x="{xx+cw/2}" y="{yy+ch*0.70}" text-anchor="middle" font-size="9.5" '
                     f'fill="{"#3A2E00" if is_on else "#5A6B85"}" '
                     f'font-family="ui-monospace,monospace">{1 if is_on else 0}</text>')
    yy = y0 + 4 * (ch + gap)
    o.append(f'<text x="{x0+14}" y="{yy+ch*0.72}" text-anchor="middle" font-size="11" fill="#FFC000">JK</text>')
    xx = x0 + 30
    on = "JK" in lit
    o.append(f'<rect x="{xx}" y="{yy}" width="{cw}" height="{ch}" rx="3" '
             f'fill="{"#FFC000" if on else "#16233C"}" stroke="{"#FFD75E" if on else "#2A3A55"}" stroke-width="1"/>')
    o.append(f'<text x="{xx+cw/2}" y="{yy+ch*0.70}" text-anchor="middle" font-size="9.5" '
             f'fill="{"#3A2E00" if on else "#5A6B85"}" font-family="ui-monospace,monospace">{1 if on else 0}</text>')
    o.append(f'<text x="{xx+cw+10}" y="{yy+ch*0.72}" font-size="10.5" fill="#7F8C9E" '
             f'font-family="Noto Sans KR,sans-serif">조커 한 칸 — 합쳐서 53칸</text>')
    return "".join(o)


def seat_table(cx, cy, r, names, me=None, labels=None, hi=None):
    """원탁 5인. names[i] 좌석 표기, labels[i] 아래 보조 문구."""
    import math
    o = [f'<circle cx="{cx}" cy="{cy}" r="{r-26}" fill="#0F1A2B" stroke="#324360" stroke-width="1"/>']
    pos = []
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        pos.append((x, y))
    for i, (x, y) in enumerate(pos):
        is_me = (i == me)
        is_hi = hi is not None and i in hi
        fill = "#273E82" if is_me else ("#2E2611" if is_hi else "#16233C")
        stroke = "#78A0FF" if is_me else ("#FFC000" if is_hi else "#324360")
        o.append(f'<circle cx="{x}" cy="{y}" r="27" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>')
        o.append(f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="13" font-weight="700" '
                 f'fill="#EAEFF7" font-family="Noto Sans KR,sans-serif">{names[i]}</text>')
        if labels and labels[i]:
            o.append(f'<text x="{x}" y="{y+46}" text-anchor="middle" font-size="10.5" fill="#7F8C9E" '
                     f'font-family="Noto Sans KR,sans-serif">{labels[i]}</text>')
    return "".join(o), pos


# ─────────────────────────────────────────────────────────────
H = io.StringIO()
W = H.write

W('''<meta charset="utf-8">
<title>마이티 AI는 어떻게 카드를 고르는가 — 그림으로 보는 구조</title>
<style>
  :root{--deep:#111B2A;--panel:#1B2840;--inner:#0F1A2B;--line:#324360;
    --peri:#78A0FF;--amber:#FFC000;--cyan:#5BD8FF;--steel:#9DC3E6;
    --frost:#EAEFF7;--slate:#AEBACB;--dim:#7F8C9E}
  *{box-sizing:border-box}
  body{margin:0;background:var(--deep);color:var(--frost);
    font-family:"Noto Sans KR","Noto Sans",system-ui,sans-serif;
    letter-spacing:-.01em;line-height:1.68;font-size:15.5px}
  .wrap{max-width:1180px;margin:0 auto;padding:56px 28px 96px}
  .slide{background:var(--panel);border:1px solid var(--line);border-radius:11px;
    padding:34px 34px 38px;margin:0 0 26px}
  .kicker{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--peri);
    text-transform:uppercase;margin:0 0 10px}
  h1{font-size:38px;font-weight:700;letter-spacing:-.02em;margin:0 0 16px;line-height:1.24}
  h2{font-size:25px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px;line-height:1.32}
  h3{font-size:16px;font-weight:700;margin:28px 0 10px;color:var(--steel)}
  p{margin:0 0 13px;color:var(--slate)}
  .lead{color:var(--frost);font-size:16.5px}
  .sub{color:var(--dim);font-size:14px;margin:0 0 22px}
  b{color:var(--frost)}
  code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:var(--cyan)}
  .scroll{overflow-x:auto}
  svg{display:block;max-width:100%;height:auto}
  table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:600px}
  th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--peri);font-weight:700;font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}
  td{color:var(--slate)} td strong{color:var(--frost)}
  .num{font-family:ui-monospace,monospace;color:var(--frost);white-space:nowrap}
  .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}
  .grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:14px}
  .card{background:var(--inner);border:1px solid var(--line);border-radius:9px;padding:16px 18px}
  .card .t{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--dim);text-transform:uppercase;margin:0 0 6px}
  .card .v{font-size:27px;font-weight:700;color:var(--frost);letter-spacing:-.02em;line-height:1.1}
  .card .n{font-size:12.5px;color:var(--dim);margin-top:5px}
  .card p:last-child{margin-bottom:0}
  .note{background:var(--inner);border:1px solid var(--line);border-radius:9px;
    padding:16px 19px;margin:20px 0 0;font-size:14px;color:var(--slate)}
  .math{background:var(--inner);border:1px solid var(--line);border-radius:9px;
    padding:15px 19px;margin:14px 0;font-family:ui-monospace,monospace;font-size:14px;
    color:var(--frost);text-align:center;letter-spacing:0}
  .math small{display:block;font-family:"Noto Sans KR",sans-serif;font-size:12.5px;
    color:var(--dim);margin-top:8px;letter-spacing:-.01em}
  .legend{display:flex;flex-wrap:wrap;gap:16px;margin:12px 0 0;font-size:12.5px;color:var(--dim)}
  .legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
  .tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;padding:2px 9px;
    border-radius:20px;border:1px solid var(--line);color:var(--slate)}
  .tag.on{border-color:#3C6B45;background:#16241A;color:#8FD69C}
  .tag.off{border-color:#5A4420;background:#2E2611;color:var(--amber)}
  .foot{color:var(--dim);font-size:12.5px;text-align:center;margin-top:34px}
  ol.steps{counter-reset:s;list-style:none;padding:0;margin:18px 0 0}
  ol.steps li{position:relative;padding:0 0 0 46px;margin:0 0 16px;color:var(--slate)}
  ol.steps li::before{counter-increment:s;content:counter(s);position:absolute;left:0;top:1px;
    width:30px;height:30px;border-radius:50%;background:#16233C;border:1px solid #3A4E80;
    color:var(--peri);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
  ol.steps li>b:first-child{display:block;color:var(--frost);font-size:16px;margin-bottom:2px}
</style>
<div class="wrap">
''')

# ── 표지 ───────────────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">마이티 웹 게임 · v2.9.0 · 2026-08-09</p>
  <h1>AI는 어떻게 낼 카드를 고르는가</h1>
  <p class="lead">이 문서는 수식을 최소한만 쓴다. 필요한 수학은 <b>벡터</b>(숫자를 한 줄로 늘어놓은 것),
  <b>행렬 곱셈</b>, 그리고 <b>확률</b> 정도다. 나머지는 카드와 좌석 그림으로 설명한다.</p>
''')

# 4단계 요약 그림
W('<div class="scroll"><svg viewBox="0 0 1080 210" role="img" aria-label="네 단계 요약">')
W('<style>.s4{fill:#0F1A2B;stroke:#324360;stroke-width:1}.s4t{fill:#EAEFF7;font:700 15px "Noto Sans KR",sans-serif}'
  '.s4s{fill:#7F8C9E;font:12px "Noto Sans KR",sans-serif}.s4n{fill:#78A0FF;font:700 26px ui-monospace,monospace}</style>')
W('<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">'
  '<path d="M0 0 L9 4.5 L0 9 z" fill="#78A0FF"/></marker></defs>')
steps = [("1", "본다", "게임판을 숫자 1,630개로", "손패·나온 카드·좌석 이력"),
         ("2", "점수 매긴다", "209개 선택지에 점수", "행렬 곱셈 3번"),
         ("3", "고른다", "낼 수 없는 건 제외", "남은 것 중 최고점"),
         ("4", "검사한다", "규칙 6개로 되짚어 본다", "명백한 손해면 교체")]
for i, (n, t, s1, s2) in enumerate(steps):
    x = 14 + i * 268
    W(f'<rect class="s4" x="{x}" y="28" width="236" height="120" rx="9"/>')
    W(f'<text class="s4n" x="{x+20}" y="66">{n}</text>')
    W(f'<text class="s4t" x="{x+56}" y="66">{t}</text>')
    W(f'<text class="s4s" x="{x+20}" y="98">{s1}</text>')
    W(f'<text class="s4s" x="{x+20}" y="120">{s2}</text>')
    if i < 3:
        W(f'<path d="M{x+240} 88 H{x+262}" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
W('<text class="s4s" x="14" y="184">1~3은 신경망이 한다. 4는 사람이 쓴 규칙이다. 이 문서는 네 단계를 차례로 뜯어본다.</text>')
W('</svg></div>')

W('''  <div class="grid3" style="margin-top:24px">
    <div class="card"><p class="t">AI가 보는 숫자</p><p class="v">1,630개</p><p class="n">한 수를 둘 때마다 새로 만든다</p></div>
    <div class="card"><p class="t">고를 수 있는 것</p><p class="v">209가지</p><p class="n">비딩·바닥패·프렌드·카드 전부 합쳐</p></div>
    <div class="card"><p class="t">신경망 크기</p><p class="v">159만</p><p class="n">곱하고 더하는 숫자의 개수</p></div>
  </div>
</section>
''')

# ── 좌석: rel 인코딩 ───────────────────────────────────
W('''<section class="slide">
  <p class="kicker">준비 · 좌석을 세는 법</p>
  <h2>AI는 "3번 좌석"이라고 외우지 않는다</h2>
  <p class="sub">사람은 "왼쪽 사람"이라고 말한다. AI도 같다. 좌석을 절대 번호가 아니라
  <b>자기 기준 거리</b>로 센다. 이렇게 하면 어느 자리에 앉든 배운 것을 그대로 쓸 수 있다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 330" role="img" aria-label="좌석 상대 인코딩">
''')
g, _ = seat_table(240, 160, 108, ["A", "B", "C", "D", "E"], me=0,
                  labels=["나 = 0", "1", "2", "3", "4"])
W(g)
W('<text x="240" y="312" text-anchor="middle" font-size="13" font-weight="700" fill="#EAEFF7" '
  'font-family="Noto Sans KR,sans-serif">A가 볼 때</text>')
g, _ = seat_table(800, 160, 108, ["A", "B", "C", "D", "E"], me=2,
                  labels=["3", "4", "나 = 0", "1", "2"])
W(g)
W('<text x="800" y="312" text-anchor="middle" font-size="13" font-weight="700" fill="#EAEFF7" '
  'font-family="Noto Sans KR,sans-serif">C가 볼 때</text>')
W('<text x="530" y="120" text-anchor="middle" font-size="13" fill="#78A0FF" font-weight="700" '
  'font-family="Noto Sans KR,sans-serif">같은 판,</text>')
W('<text x="530" y="146" text-anchor="middle" font-size="13" fill="#78A0FF" font-weight="700" '
  'font-family="Noto Sans KR,sans-serif">다른 번호</text>')
W('<text x="530" y="182" text-anchor="middle" font-size="11.5" fill="#7F8C9E" '
  'font-family="Noto Sans KR,sans-serif">번호 = (그 사람 − 나 + 5) mod 5</text>')
W('</svg></div>')
W('''  <div class="note"><b>왜 중요한가.</b> 좌석을 절대 번호로 넣으면 AI는 "3번 자리에서 이기는 법"과
  "4번 자리에서 이기는 법"을 따로 배워야 한다. 상대 번호로 넣으면 한 번 배운 것이 다섯 자리에 전부 쓰인다.
  같은 이유로 사람도 "내 왼쪽"으로 기억하지 "3번 의자"로 기억하지 않는다.</div>
</section>
''')

# ── 1단계 관측: 카드 격자 ──────────────────────────────
hand = {("S", 14), ("S", 9), ("S", 3), ("D", 13), ("D", 5),
        ("H", 12), ("H", 7), ("C", 11), ("C", 6), "JK"}
W('''<section class="slide">
  <p class="kicker">1단계 · 본다</p>
  <h2>카드를 숫자로 적는 법 — 켜기와 끄기</h2>
  <p class="sub">카드는 52장 + 조커 1장이다. 칸을 53개 만들어 놓고 <b>있으면 1, 없으면 0</b>을 적는다.
  그게 전부다. 아래는 손패 10장을 적은 모습이다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 260" role="img" aria-label="손패 53칸 표기">
''')
# 실제 카드 그림
for i, (s, r) in enumerate([("S", 14), ("S", 9), ("S", 3), ("D", 13), ("D", 5),
                            ("H", 12), ("H", 7), ("C", 11), ("C", 6)]):
    W(card(20 + i * 42, 24, s, r))
W(card(20 + 9 * 42, 24, "JK", 0))
W('<text x="20" y="98" font-size="12.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">내 손패 10장</text>')
W('<path d="M200 108 V132" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
W('<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">'
  '<path d="M0 0 L9 4.5 L0 9 z" fill="#78A0FF"/></marker></defs>')
W(grid53(430, 40, hand))
W('<text x="430" y="248" font-size="12.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '53칸 중 10칸이 1 — 이 줄 하나가 관측의 &quot;hand53&quot; 블록이다</text>')
W('</svg></div>')
W('''  <p>이런 53칸짜리 표가 관측 안에 여러 개 들어간다. 각각 묻는 질문이 다르다.</p>
  <div class="grid3">
    <div class="card"><p class="t">hand53</p><p class="v">53</p><p class="n">내 손에 있는 카드</p></div>
    <div class="card"><p class="t">played53</p><p class="v">53</p><p class="n">지금까지 나온 카드 전부</p></div>
    <div class="card"><p class="t">friend_card53</p><p class="v">53</p><p class="n">프렌드로 지목된 카드</p></div>
    <div class="card"><p class="t">table 4×54</p><p class="v">216</p><p class="n">이번 트릭에서 네 사람이 낸 카드</p></div>
    <div class="card"><p class="t">discard54</p><p class="v">54</p><p class="n">주공이 묻은 바닥패 (주공만 채워짐)</p></div>
    <div class="card"><p class="t">discard_pick54</p><p class="v">54</p><p class="n">바닥패 교환 중 고르는 중인 카드</p></div>
  </div>
  <div class="note"><b>규칙 하나.</b> 남의 손패는 절대 넣지 않는다. AI가 보는 것은
  <b>그 좌석에 앉은 사람이 실제로 볼 수 있는 것</b>뿐이다. 바닥패도 주공 자리에서만 채워진다.
  이걸 어기면 AI는 사람이 못 하는 판단을 배우고, 그런 AI는 상대해도 배울 게 없다.</div>
</section>
''')

# ── 관측 전체 구성 ─────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">1단계 · 본다</p>
  <h2>1,630개는 어디에 쓰이나</h2>
  <p class="sub">앞의 53칸 표들과 몇십 개의 숫자를 <b>한 줄로 이어 붙인 것</b>이 관측이다.
  줄 하나의 길이가 1,630. 아래 띠의 가로 길이가 그대로 차지하는 칸 수다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 268" role="img" aria-label="관측 구성 비중">
''')
blocks = [("계약·역할", 116, "#273E82", "누가 주공인지, 기루다는 뭔지, 프렌드 선언은 뭐였는지"),
          ("내 패·이번 트릭", 396, "#3A5DBF", "내 손패와 지금 테이블에 깔린 카드"),
          ("가시 집계", 94, "#78A0FF", "안 나온 카드 수, 누가 어떤 무늬가 떨어졌는지"),
          ("좌석 이력", 64, "#5BD8FF", "각자 지금까지 무슨 무늬를 몇 장 냈는지"),
          ("패 강도", 18, "#9DC3E6", "무늬별로 내가 최강인지"),
          ("키카드 정황", 37, "#FFC000", "마이티·조커가 어디 있을 것 같은지"),
          ("룰", 14, "#8A7A3F", "이 판의 규칙 설정값"),
          ("트릭 기록", 891, "#1B3A5C", "지난 트릭 10판을 한 판씩 통째로")]
total = sum(b[1] for b in blocks)
x = 20
scale = 1010 / total
for name, n, col, desc in blocks:
    w = n * scale
    W(f'<rect x="{x:.1f}" y="30" width="{w:.1f}" height="54" fill="{col}" stroke="#111B2A" stroke-width="1.5"/>')
    x += w
W(f'<text x="20" y="106" font-size="11.5" fill="#7F8C9E" font-family="ui-monospace,monospace">← 전체 1,630칸 →</text>')
y = 134
for i, (name, n, col, desc) in enumerate(blocks):
    yy = y + (i % 4) * 30
    xx = 20 if i < 4 else 540
    W(f'<rect x="{xx}" y="{yy-11}" width="12" height="12" rx="3" fill="{col}"/>')
    W(f'<text x="{xx+20}" y="{yy}" font-size="12.5" font-weight="700" fill="#EAEFF7" '
      f'font-family="Noto Sans KR,sans-serif">{name}</text>')
    W(f'<text x="{xx+128}" y="{yy}" font-size="12" fill="#7F8C9E" font-family="ui-monospace,monospace">{n}</text>')
    W(f'<text x="{xx+176}" y="{yy}" font-size="12" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">{desc}</text>')
W('</svg></div>')
W('''  <div class="note"><b>절반 이상이 &quot;지난 트릭 기록&quot;이다.</b> 891칸.
  마이티는 정보 게임이라 "누가 언제 무엇을 냈나"가 손패 추정의 거의 전부다. 다음 장에서 이 블록만 따로 본다.</div>
</section>
''')

# ── 트릭 토큰 ──────────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">1단계 · 본다</p>
  <h2>트릭 한 판을 숫자 81개로</h2>
  <p class="sub">트릭은 다섯 명이 <b>순서대로</b> 한 장씩 내는 한 묶음이다. 순서가 의미를 갖는다 —
  첫 번째로 낸 카드와 마지막으로 낸 카드는 뜻이 다르다. 그래서 트릭 하나를 통째로 한 덩어리로 적는다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 300" role="img" aria-label="트릭 토큰 구성">
''')
trick = [("D", 5, "B가 리드"), ("D", 13, "C"), ("D", 3, "D"), ("S", 14, "E · 마이티"), ("D", 9, "A")]
for i, (s, r, lab) in enumerate(trick):
    W(card(30 + i * 76, 26, s, r, w=52, h=72, label=lab))
W('<rect x="14" y="14" width="400" height="112" rx="9" fill="none" stroke="#3A4E80" stroke-width="1.4"/>')
W('<text x="440" y="56" font-size="13" font-weight="700" fill="#EAEFF7" '
  'font-family="Noto Sans KR,sans-serif">트릭 1판</text>')
W('<text x="440" y="80" font-size="12" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '누가 몇 번째로</text>')
W('<text x="440" y="98" font-size="12" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '무엇을 냈나</text>')
W('<path d="M418 70 H432" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
# 81 구성
W('<rect x="640" y="18" width="404" height="112" rx="9" fill="#0F1A2B" stroke="#324360"/>')
W('<text x="658" y="44" font-size="12.5" font-weight="700" fill="#EAEFF7" font-family="Noto Sans KR,sans-serif">'
  '숫자 81개</text>')
W('<text x="658" y="68" font-size="12" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '낸 순서 5명 × 15 = 75</text>')
W('<text x="672" y="88" font-size="11.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '(있음1 · 좌석5 · 무늬4 · 랭크1 · 조커/마이티/점수/기루다4)</text>')
W('<text x="658" y="112" font-size="12" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '+ 이긴 사람 5 + 몇 번째 트릭 1 = 81</text>')
# 11개 토큰 스택
for i in range(11):
    xx = 30 + i * 92
    fill = "#16233C" if i < 10 else "#2E2611"
    stroke = "#324360" if i < 10 else "#FFC000"
    W(f'<rect x="{xx}" y="180" width="78" height="52" rx="6" fill="{fill}" stroke="{stroke}"/>')
    lab = f"트릭 {i+1}" if i < 10 else "진행중"
    W(f'<text x="{xx+39}" y="204" text-anchor="middle" font-size="11.5" font-weight="700" fill="#EAEFF7" '
      f'font-family="Noto Sans KR,sans-serif">{lab}</text>')
    W(f'<text x="{xx+39}" y="222" text-anchor="middle" font-size="10.5" fill="#7F8C9E" '
      f'font-family="ui-monospace,monospace">81</text>')
W('<text x="30" y="262" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '11덩어리 × 81 = 891칸. 아직 안 한 트릭은 전부 0으로 둔다.</text>')
W('<text x="30" y="286" font-size="12" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '이 11덩어리만 신경망에서 특별 취급을 받는다 — 다음 장의 &quot;서로 쳐다보기&quot;.</text>')
W('</svg></div>')
W('</section>\n')

# ── 2단계 신경망 ───────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">2단계 · 점수 매긴다</p>
  <h2>신경망은 큰 곱셈표다</h2>
  <p class="sub">고등학교 수학으로 정확히 말할 수 있다. 관측 1,630개를 세로로 세운 벡터라 하면,
  신경망이 하는 일은 <b>행렬을 곱하고, 음수를 0으로 만들고, 다시 곱하는 것</b>의 반복이다.</p>
  <div class="math">
    y = ReLU( W x + b )
    <small>x = 들어온 숫자들 · W = 곱셈표(행렬) · b = 더하는 값 · ReLU(t) = max(t, 0), 즉 음수면 0</small>
  </div>
  <p>이걸 세 번 반복한다. 매번 숫자 개수가 512개로 줄었다가 유지된다.
  마지막에 512개를 209개로 한 번 더 곱하면, 그게 <b>209가지 선택지의 점수</b>다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 300" role="img" aria-label="신경망 층 구조">
''')
layers = [("관측", "1,630", "#273E82"), ("+트릭 요약", "1,694", "#2F4A96"),
          ("1층", "512", "#3A5DBF"), ("2층", "512", "#4E74D4"), ("3층", "512", "#78A0FF")]
for i, (name, n, col) in enumerate(layers):
    x = 24 + i * 150
    hgt = 168 if i < 2 else 96
    W(f'<rect x="{x}" y="{40 + (0 if i < 2 else 36)}" width="96" height="{hgt}" rx="7" fill="{col}" '
      f'stroke="#111B2A" stroke-width="1.5"/>')
    W(f'<text x="{x+48}" y="{34}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#EAEFF7" '
      f'font-family="Noto Sans KR,sans-serif">{name}</text>')
    W(f'<text x="{x+48}" y="{124 + (0 if i < 2 else 8)}" text-anchor="middle" font-size="15" font-weight="700" '
      f'fill="#0F1A2B" font-family="ui-monospace,monospace">{n}</text>')
    if i < 4:
        W(f'<path d="M{x+100} 124 H{x+142}" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
        if i >= 1:
            W(f'<text x="{x+121}" y="112" text-anchor="middle" font-size="10.5" fill="#7F8C9E" '
              f'font-family="Noto Sans KR,sans-serif">곱셈</text>')
            W(f'<text x="{x+121}" y="146" text-anchor="middle" font-size="10.5" fill="#7F8C9E" '
              f'font-family="Noto Sans KR,sans-serif">+ReLU</text>')
# 헤드
W('<rect x="800" y="40" width="120" height="60" rx="7" fill="#0F1A2B" stroke="#324360"/>')
W('<text x="860" y="66" text-anchor="middle" font-size="12.5" font-weight="700" fill="#EAEFF7" '
  'font-family="Noto Sans KR,sans-serif">선택지 점수</text>')
W('<text x="860" y="88" text-anchor="middle" font-size="13" fill="#78A0FF" font-family="ui-monospace,monospace">209</text>')
W('<rect x="800" y="116" width="120" height="60" rx="7" fill="#0F1A2B" stroke="#324360"/>')
W('<text x="860" y="142" text-anchor="middle" font-size="12.5" font-weight="700" fill="#EAEFF7" '
  'font-family="Noto Sans KR,sans-serif">판세 점수</text>')
W('<text x="860" y="164" text-anchor="middle" font-size="13" fill="#78A0FF" font-family="ui-monospace,monospace">1</text>')
W('<path d="M724 124 H792 V70 H796" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
W('<path d="M792 124 H796" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
W('<path d="M792 124 V146 H796" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
W('<text x="24" y="236" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '&quot;판세 점수&quot;는 이 판이 내게 얼마나 유리한지를 하나의 숫자로 답한 것. 복기에서 &quot;이 수로 판세가 얼마나 나빠졌나&quot;를 잴 때 쓴다.</text>')
W('<text x="24" y="262" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '곱셈표 칸 수를 전부 세면 1,594,107개. 가장 큰 표가 1,694 × 512 = 867,328칸이다.</text>')
W('<text x="24" y="288" font-size="12" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '요즘 언어 모델은 이 수가 수천억이다. 이건 브라우저에서 즉시 돌아야 해서 일부러 작게 만든 크기다.</text>')
W('</svg></div>')
W('</section>\n')

# ── 어텐션 ─────────────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">2단계 · 점수 매긴다</p>
  <h2>트릭 기록만 따로, "서로 쳐다보게" 한다</h2>
  <p class="sub">앞 장의 곱셈표는 891칸을 <b>그냥 늘어선 숫자</b>로 취급한다.
  하지만 트릭은 서로 관계가 있다 — 3번 트릭에서 누가 기루다를 썼는지가 7번 트릭 판단을 바꾼다.
  그래서 11덩어리를 따로 빼서 서로 참조하게 만든 뒤, 요약 64개로 줄여 다시 합친다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 250" role="img" aria-label="어텐션 구조">
''')
for i in range(11):
    xx = 24 + i * 62
    W(f'<rect x="{xx}" y="46" width="48" height="40" rx="6" fill="#16233C" stroke="#3A4E80"/>')
    W(f'<text x="{xx+24}" y="71" text-anchor="middle" font-size="11" fill="#AEBACB" '
      f'font-family="ui-monospace,monospace">T{i+1}</text>')
# 참조선
import math
for a, b in [(0, 4), (2, 7), (5, 9), (1, 8), (3, 10), (6, 9)]:
    x1, x2 = 24 + a * 62 + 24, 24 + b * 62 + 24
    mid = (x1 + x2) / 2
    W(f'<path d="M{x1} 46 Q {mid} 8 {x2} 46" fill="none" stroke="#5BD8FF" stroke-width="1.1" opacity=".55"/>')
W('<text x="24" y="104" font-size="12" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '각 트릭이 다른 트릭을 쳐다본다 (어텐션 2층 · 4갈래)</text>')
W('<rect x="24" y="128" width="200" height="52" rx="7" fill="#0F1A2B" stroke="#324360"/>')
W('<text x="124" y="150" text-anchor="middle" font-size="12.5" font-weight="700" fill="#EAEFF7" '
  'font-family="Noto Sans KR,sans-serif">평균 내서 요약</text>')
W('<text x="124" y="170" text-anchor="middle" font-size="12" fill="#78A0FF" '
  'font-family="ui-monospace,monospace">숫자 64개</text>')
W('<path d="M228 154 H268" stroke="#78A0FF" stroke-width="1.6" marker-end="url(#a1)"/>')
W('<rect x="274" y="128" width="260" height="52" rx="7" fill="#16233C" stroke="#3A4E80"/>')
W('<text x="404" y="150" text-anchor="middle" font-size="12.5" font-weight="700" fill="#EAEFF7" '
  'font-family="Noto Sans KR,sans-serif">관측 1,630 + 요약 64</text>')
W('<text x="404" y="170" text-anchor="middle" font-size="12" fill="#78A0FF" '
  'font-family="ui-monospace,monospace">= 1,694칸으로 곱셈표에 투입</text>')
W('<text x="24" y="218" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '나머지 블록(손패·집계 등)은 이미 요약된 값이라 이 처리를 하지 않는다. 순서 구조가 없기 때문이다.</text>')
W('</svg></div>')
W('</section>\n')

# ── 3단계 고르기: 마스크 + 온도 ────────────────────────
W('''<section class="slide">
  <p class="kicker">3단계 · 고른다</p>
  <h2>낼 수 없는 카드부터 지운다</h2>
  <p class="sub">209개 점수가 나왔다고 아무거나 낼 수는 없다. 마이티 규칙상 <b>무늬를 따라야 하면 따라야 한다</b>.
  그래서 불가능한 선택지의 점수를 −∞ 로 덮어쓴다. 그러면 절대 뽑히지 않는다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 220" role="img" aria-label="합법수 마스킹">
''')
# 리드 무늬 ♦ 상황, 손패 중 ♦만 합법
hand2 = [("D", 13, True), ("D", 5, True), ("S", 14, False), ("S", 9, False),
         ("H", 12, False), ("C", 6, False), ("JK", 0, True)]
W('<text x="24" y="34" font-size="13" font-weight="700" fill="#EAEFF7" font-family="Noto Sans KR,sans-serif">'
  '상황 — 앞사람이 ♦를 냈다. 내 손패:</text>')
for i, (s, r, ok) in enumerate(hand2):
    x = 24 + i * 62
    W(card(x, 50, s, r, w=48, h=66, on=True))
    if not ok:
        W(f'<rect x="{x}" y="50" width="48" height="66" rx="5" fill="#111B2A" opacity=".72"/>')
        W(f'<path d="M{x+10} 60 L{x+38} 106 M{x+38} 60 L{x+10} 106" stroke="#C00000" stroke-width="2.4"/>')
    W(f'<text x="{x+24}" y="134" text-anchor="middle" font-size="10.5" '
      f'fill="{"#8FD69C" if ok else "#7F8C9E"}" font-family="Noto Sans KR,sans-serif">'
      f'{"낼 수 있음" if ok else "−∞"}</text>')
W('<text x="24" y="176" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '♦가 손에 있으면 ♦를 내야 한다 — 조커는 예외적으로 언제든 낼 수 있다.</text>')
W('<text x="24" y="200" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '남은 것 중 점수가 가장 높은 하나를 고른다. 이것이 실제 대국에서 AI가 쓰는 방식이다.</text>')
W('</svg></div>')

W('''  <h3>온도 — 최고점만 고를까, 가끔 딴 것도 고를까</h3>
  <p>같은 점수라도 &quot;확률로 바꾸는 방법&quot;이 하나 더 있다. 점수를 <b>T</b>로 나눈 뒤 확률로 바꾼다.
  T가 작을수록 1등에 확률이 쏠린다. 학습할 때는 T=1로 두고 일부러 다양하게 시도하게 하고,
  실제 대국에서는 항상 1등만 고른다.</p>
  <div class="math">
    확률(i) ∝ exp( 점수(i) ÷ T )
    <small>T = 1 이면 골고루 · T가 0에 가까우면 1등만 · 실제 대국은 1등 고정(argmax)</small>
  </div>
  <div class="scroll"><svg viewBox="0 0 1060 264" role="img" aria-label="온도별 확률 분포">
''')
scores = [3.0, 2.4, 1.8, 1.0, 0.2]
labels = ["♦K", "♦5", "조커", "♦3", "♦2"]


def softmax(sc, t):
    ex = [math.exp(s / t) for s in sc]
    z = sum(ex)
    return [e / z for e in ex]


for k, (t, title) in enumerate([(1.0, "T = 1 · 학습"), (0.5, "T = 0.5 · 복기 롤아웃"), (0.01, "1등 고정 · 실제 대국")]):
    ox = 24 + k * 350
    ps = softmax(scores, t)
    W(f'<text x="{ox}" y="26" font-size="12.5" font-weight="700" fill="#EAEFF7" '
      f'font-family="Noto Sans KR,sans-serif">{title}</text>')
    for i, p in enumerate(ps):
        by = 44 + i * 32
        W(f'<text x="{ox}" y="{by+15}" font-size="11.5" fill="#AEBACB" '
          f'font-family="Noto Sans KR,sans-serif">{labels[i]}</text>')
        W(f'<rect x="{ox+40}" y="{by}" width="220" height="20" rx="3" fill="#16233C"/>')
        W(f'<rect x="{ox+40}" y="{by}" width="{max(1.5, p*220):.1f}" height="20" rx="3" '
          f'fill="{"#FFC000" if i == 0 else "#3A5DBF"}"/>')
        W(f'<text x="{ox+270}" y="{by+15}" font-size="11" fill="#7F8C9E" '
          f'font-family="ui-monospace,monospace">{p*100:.0f}%</text>')
W('<text x="24" y="216" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '복기가 &quot;이 수가 손해였다&quot;를 판정할 때도 앞을 여러 번 시뮬레이션한다. 그때 T=1로 두면 양쪽 다 실제보다 못 두는 세계를 재게 된다 —</text>')
W('<text x="24" y="240" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  'v2.9.0에서 T를 0.5로 내리자 잘못된 지적이 111건 중 15건에서 110건 중 8건으로 줄었다.</text>')
W('</svg></div>')
W('</section>\n')

# ── 4단계 가드 ─────────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">4단계 · 검사한다</p>
  <h2>사람이 보면 바로 아는 실수를 규칙으로 막는다</h2>
  <p class="sub">신경망은 &quot;이겼다&quot;는 결과만 보고 배운다. 그래서 <b>어차피 이긴 트릭에 마이티를 버려도</b>
  결과가 같으니 고칠 이유를 못 느낀다. 사람 눈에는 치명적으로 어색한 장면이다. 이런 자리를 규칙 6개가 받친다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 250" role="img" aria-label="키카드 가드 예시">
''')
W('<text x="24" y="28" font-size="13" font-weight="700" fill="#EAEFF7" font-family="Noto Sans KR,sans-serif">'
  '예시 — 아군이 이미 확실히 이긴 트릭</text>')
for i, (s, r, lab) in enumerate([("H", 3, "상대"), ("H", 6, "상대"), ("JK", 0, "아군 조커 — 확정승")]):
    W(card(24 + i * 96, 44, s, r, w=62, h=84, label=lab))
W('<text x="330" y="76" font-size="12.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">내 차례. 무엇을 낼까?</text>')
W(card(330, 92, "S", 14, w=62, h=84, label="마이티 — 낭비"))
W('<path d="M400 134 H436" stroke="#C00000" stroke-width="2" marker-end="url(#a1)"/>')
W(card(444, 92, "C", 2, w=62, h=84, label="가드가 바꾼 수"))
W('<text x="530" y="122" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '아군이 이미 이겼으니 마이티를 쓸 이유가 없다.</text>')
W('<text x="530" y="146" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '가드는 이럴 때만, 그것도 대안이 있을 때만 바꾼다.</text>')
W('<text x="530" y="170" font-size="12.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '판정에 쓰는 정보는 그 좌석이 볼 수 있는 것뿐 — 남의 손패를 훔쳐보지 않는다.</text>')
W('<text x="24" y="222" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '가드 6개는 순서대로 한 번씩 검사한다. 대부분의 수는 아무 가드도 건드리지 않고 그대로 나간다.</text>')
W('</svg></div>')

W('''  <h3>가드 6개 — 무엇을 잡고, 요즘 얼마나 발동하나</h3>
  <div class="scroll"><table>
    <tr><th>가드</th><th>상태</th><th>잡는 장면</th><th>v9에서 발동</th></tr>
    <tr><td><strong>key</strong></td><td><span class="tag on">ON</span></td>
      <td>이미 이긴 트릭에 마이티·조커를 버림</td><td class="num">1.31%</td></tr>
    <tr><td><strong>top</strong></td><td><span class="tag on">ON</span></td>
      <td>주공이 기루다를 낼 때 낮은 것부터 던짐</td><td class="num">0.00%</td></tr>
    <tr><td><strong>tfeed</strong></td><td><span class="tag on">ON</span></td>
      <td>못 이길 트릭에 점수 기루다를 태움</td><td class="num">0.00%</td></tr>
    <tr><td><strong>cut</strong></td><td><span class="tag on">ON</span></td>
      <td>먹을 수 있는 점수 트릭을 그냥 넘김</td><td class="num">0.08%</td></tr>
    <tr><td><strong>dlead</strong></td><td><span class="tag on">ON</span></td>
      <td>야당이 기루다를 리드해 주공을 도와줌</td><td class="num">0.37%</td></tr>
    <tr><td><strong>c1</strong></td><td><span class="tag off">기본 OFF</span></td>
      <td>주공이 잡힐 자리에 점수 기루다를 리드</td><td class="num">0.19%</td></tr>
  </table></div>
  <div class="note"><b>0%가 좋은 신호다.</b> top과 tfeed는 요즘 한 번도 발동하지 않는다 —
  그 실수를 신경망이 이미 안 하기 때문이다. 가드를 학습에 녹여 넣는 작업(&quot;증류&quot;)이 성공하면
  발동률이 떨어진다. cut은 0.50% → 0.16% → 0.08%로 줄어드는 중이고, 0이 아니라서 아직 남겨 둔다.</div>
</section>
''')

# ── 학습 ───────────────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">배경 · 어떻게 배웠나</p>
  <h2>혼자 수십만 판을 두면서 배운다</h2>
  <p class="sub">사람 기보를 쓰지 않는다. AI 다섯이 서로 붙어 판을 만들고,
  이긴 쪽의 선택은 확률을 올리고 진 쪽은 내린다. 여기에 두 가지를 더 얹는다.</p>
  <ol class="steps">
    <li><b>혼자 두기 (강화학습)</b>
      기력의 대부분이 여기서 나온다. 보상은 판당 상금 하나. 다만 승패가 같으면 배울 게 없어서,
      &quot;이긴 판에서의 낭비&quot;는 스스로 못 고친다.</li>
    <li><b>정답지 주기 (관례 증류)</b>
      검증을 통과한 상황에 한해 &quot;이 자리에서는 이 카드&quot;라는 정답을 알려주고 맞히게 한다.
      현재 5개 상황만 정답지가 있다 — 아무 상황이나 넣지 않는 이유는 다음 장에 있다.</li>
    <li><b>곁다리 문제 풀리기 (보조 예측)</b>
      &quot;마이티는 누가 들고 있을까?&quot; 같은 질문을 같이 풀게 한다.
      직접 점수와 상관없지만, 이걸 맞히려면 정보를 기억해야 하므로 판단이 좋아진다.
      v9에서 이 문제를 추가하자 마이티 위치 맞히기가 <b>29% → 75%</b>로 올랐다.</li>
  </ol>
  <div class="note"><b>정답지를 넣을 때의 함정.</b> 정답지와 혼자 두기를 동시에 세게 돌리면
  기존 실력이 무너진다. 그래서 정답지를 넣는 동안은 혼자 두기를 잠깐 끄고,
  &quot;원래 자신과 너무 달라지지 마라&quot;는 제약(앵커)을 함께 건다. 한 번에 20분이면 끝난다.</div>
</section>
''')

# ── 인증 ───────────────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">배경 · 무엇을 고칠지 정하는 법</p>
  <h2>&quot;이 수 이상한데&quot;는 증거가 아니다</h2>
  <p class="sub">이상해 보이는 장면을 발견해도 바로 고치지 않는다. <b>같은 패를 두 번 돌린다</b> —
  한 번은 그대로, 한 번은 그 수만 바꿔서. 상금 차이가 확실할 때만 고친다.</p>
  <div class="scroll"><svg viewBox="0 0 1060 240" role="img" aria-label="페어드 인증">
''')
W('<rect x="24" y="24" width="470" height="150" rx="9" fill="#0F1A2B" stroke="#324360"/>')
W('<text x="44" y="52" font-size="13" font-weight="700" fill="#EAEFF7" font-family="Noto Sans KR,sans-serif">'
  'A · 그대로 둔 판</text>')
W('<text x="44" y="78" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '같은 시드 · 같은 손패 · 전부 AI</text>')
W('<text x="44" y="112" font-size="22" font-weight="700" fill="#78A0FF" font-family="ui-monospace,monospace">'
  '평균 상금 X</text>')
W('<rect x="518" y="24" width="470" height="150" rx="9" fill="#16233C" stroke="#3A4E80"/>')
W('<text x="538" y="52" font-size="13" font-weight="700" fill="#EAEFF7" font-family="Noto Sans KR,sans-serif">'
  'B · 그 수만 바꾼 판')
W('</text><text x="538" y="78" font-size="12.5" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '나머지 조건은 A와 완전히 동일</text>')
W('<text x="538" y="112" font-size="22" font-weight="700" fill="#FFC000" font-family="ui-monospace,monospace">'
  '평균 상금 Y</text>')
W('<text x="44" y="146" font-size="11.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '무작위 요소를 완전히 맞춰야 비교가 성립한다</text>')
W('<text x="538" y="146" font-size="11.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '차이 Y − X 가 오차범위를 넘는가?</text>')
W('<text x="24" y="206" font-size="13.5" fill="#EAEFF7" font-family="Noto Sans KR,sans-serif" font-weight="700">'
  '지금까지 승격 5건 · 기각 13건.</text>')
W('<text x="230" y="206" font-size="13" fill="#AEBACB" font-family="Noto Sans KR,sans-serif">'
  '눈에 명백해 보였는데 평균은 반대였던 경우가 여럿 있었다.</text>')
W('<text x="24" y="230" font-size="12.5" fill="#7F8C9E" font-family="Noto Sans KR,sans-serif">'
  '가장 최근 사례: 2,400판에서는 +287로 이득처럼 보였지만 9,000판으로 늘리자 −101이 나와 기각됐다. 표본이 적으면 부호조차 뒤집힌다.</text>')
W('</svg></div>')
W('</section>\n')

# ── 마지막: 세 화면 ────────────────────────────────────
W('''<section class="slide">
  <p class="kicker">정리 · 같은 두뇌, 세 곳에서</p>
  <h2>대국·코칭·복기가 같은 경로를 쓴다</h2>
  <div class="grid3" style="margin-top:6px">
    <div class="card"><p class="t">대국</p><p class="v">4좌석</p>
      <p class="n">AI 자리마다 v9·v8·v7 중 하나를 뽑아 앉힌다. 어느 자리가 누구인지는 판이 끝나야 공개한다 —
      미리 알면 비딩을 읽을 수 있다.</p></div>
    <div class="card"><p class="t">코칭</p><p class="v">추천 1수</p>
      <p class="n">내 차례에 AI가 낼 카드를 보여준다. 판정은 항상 대표 모델(v9)로 통일한다.</p></div>
    <div class="card"><p class="t">복기</p><p class="v">ΔEV → 시뮬</p>
      <p class="n">판세 점수로 의심 구간을 걸러낸 뒤, 그 자리에서만 앞을 24번 시뮬레이션해 손해를 확인한다.</p></div>
  </div>
  <div class="note"><b>왜 굳이 한 경로로 합쳤나.</b> 예전에는 세 화면이 각자 검사 규칙을 복사해 갖고 있었다.
  가드를 하나 추가할 때 한 곳을 빠뜨리자 코칭만 옛날 판단을 보여주는 버그가 났다.
  v2.9.0에서 규칙 체인을 함수 하나로 합쳐 구조적으로 막았다.</div>
</section>

<p class="foot">마이티 웹 게임 v2.9.0 · 모든 수치는 실측 — docs/GUARDS.md · docs/rollout-temp.txt ·
docs/c4-cert-v9.txt · training/ckpt_v9</p>
</div>
''')

import re as _re
html = H.getvalue()
# stroke만 있고 fill이 없는 path는 브라우저 기본 fill(검정)이 칠해진다 — 전부 fill="none"
html = _re.sub(r'<path (?![^>]*fill=)([^>]*stroke=)', r'<path fill="none" \1', html)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write(html)
print("wrote", OUT, len(H.getvalue()), "bytes")
