#!/usr/bin/env python3
"""Draw the app icons (app/pwa/icon-*.png, apple-touch-icon.png) with Chromium: paper ground, red seal, 文言.

  python3 -I tools/make_icons.py     (needs Playwright and a Traditional Chinese serif such as Noto Serif CJK TC)

The colours are the app's (app/src/base.css: --paper #f6f1e7, --seal #a8321e). Full-bleed squares: phones round or
mask the corners themselves; the seal stays inside the central 60 % so the same picture works as a maskable icon.
The icons are committed; run this again only when the design changes.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "pwa"
HTML = '''<html><body style="margin:0"><div id=i style="width:1024px;height:1024px;position:relative;overflow:hidden;
background:#f6f1e7;display:grid;place-items:center">
<div style="width:560px;height:560px;background:#a8321e;border-radius:44px;transform:rotate(-2deg);display:grid;
place-items:center;box-shadow:inset 0 0 0 18px #a8321e,inset 0 0 0 26px #f6f1e7aa">
<div style="font:700 230px/1.04 'Noto Serif CJK TC','Noto Serif TC','Songti TC',serif;color:#f6f1e7;
writing-mode:vertical-rl;letter-spacing:.02em;padding-top:8px">文言</div></div></div></body></html>'''
SIZES = {"icon-1024.png": 1024, "icon-512.png": 512, "icon-192.png": 192, "apple-touch-icon.png": 180}

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, size in SIZES.items():
        p = b.new_page(viewport={"width": 1024, "height": 1024}, device_scale_factor=size / 1024)
        p.set_content(HTML)
        p.wait_for_timeout(100)
        p.locator("#i").screenshot(path=str(OUT / name))
        p.close()
    b.close()
print("icons written to", OUT.relative_to(ROOT))
