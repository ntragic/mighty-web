# -*- coding: utf-8 -*-
"""nn-architecture.html을 슬라이드별 PNG로 굽는다 (itch.io 설명란 붙여넣기용)."""
import re, os, subprocess, sys
from PIL import Image

import pathlib
ROOT = str(pathlib.Path(__file__).resolve().parent.parent)
SRC = os.path.join(ROOT, "docs/nn-architecture.html")
OUT = os.path.join(ROOT, "docs/slides")
import tempfile
TMP = tempfile.mkdtemp(prefix="nnslides-")
BG = (17, 27, 42)  # --deep

os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

html = open(SRC, encoding="utf-8").read()
head = html.split('<div class="wrap">')[0]
sections = re.findall(r'<section class="slide">.*?</section>', html, re.S)
print("슬라이드", len(sections))

# 슬라이드 폭에 맞춘 래퍼 — 여백을 줄여 이미지가 꽉 차게
head = head.replace(".wrap{max-width:1180px;margin:0 auto;padding:56px 28px 96px}",
                    ".wrap{max-width:1180px;margin:0 auto;padding:0}")
head = head.replace(".slide{background:var(--panel);border:1px solid var(--line);border-radius:11px;\n"
                    "    padding:34px 34px 38px;margin:0 0 26px}",
                    ".slide{background:var(--panel);border:0;border-radius:0;padding:38px 40px 42px;margin:0}")

for i, sec in enumerate(sections, 1):
    p = os.path.join(TMP, f"s{i:02d}.html")
    open(p, "w", encoding="utf-8").write(head + '<div class="wrap">' + sec + "</div>")
    png = os.path.join(OUT, f"slide-{i:02d}.png")
    subprocess.run(["chromium", "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", "--window-size=1180,2400",
                    f"--screenshot={png}", "--virtual-time-budget=3000",
                    "file://" + p], capture_output=True)
    im = Image.open(png).convert("RGB")
    w, h = im.size
    # 아래쪽 배경색 영역을 잘라낸다
    px = im.load()
    last = h - 1
    while last > 0:
        row_bg = all(abs(px[x, last][c] - BG[c]) < 6 for x in range(0, w, 37) for c in range(3))
        if not row_bg:
            break
        last -= 1
    im.crop((0, 0, w, min(h, last + 24))).save(png)
    print(f"  slide-{i:02d}.png  {im.size[0]}×{min(h, last+24)}")
