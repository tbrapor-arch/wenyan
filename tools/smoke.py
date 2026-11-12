#!/usr/bin/env python3
"""Click through the built app in a phone-sized browser: every tab and every lesson, marking each lesson done.

  pip install playwright && playwright install chromium
  python3 tools/build.py && python3 tools/smoke.py [--shots DIR]

Fails on any JavaScript error, on a lesson that renders no text, and on horizontal page scroll.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
shots = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
course = json.loads((ROOT / "app" / "course.json").read_text(encoding="utf-8"))
errors = []


def run(page, name):
    def shot(tag):
        if shots:
            shots.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(shots / f"{name}-{tag}.png"))

    def check(where):
        w = page.evaluate("[document.documentElement.scrollWidth, innerWidth]")
        if w[0] > w[1] + 1:
            errors.append(f"{name} {where}: page scrolls sideways ({w[0]} > {w[1]})")

    page.on("pageerror", lambda e: errors.append(f"{name}: {e}"))
    page.on("console", lambda m: errors.append(f"{name}: console {m.text}") if m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text else None)
    page.goto((ROOT / "dist" / "wenyan.html").as_uri())
    for t in course["tracks"]:
        page.goto((ROOT / "dist" / "wenyan.html").as_uri() + "#" + t["key"])
        page.wait_for_selector(".thead")
        check(t["key"]); shot(t["key"])
        for l in t["lessons"]:
            page.goto((ROOT / "dist" / "wenyan.html").as_uri() + f"#{t['key']}/{l['id']}")
            page.wait_for_selector(".lbar")
            if not page.locator("h1").inner_text().strip():
                errors.append(f"{name} {t['key']}/{l['id']}: no title")
            check(f"{t['key']}/{l['id']}")
            if l["id"] == 1:
                shot(f"{t['key']}-1")
                if page.locator(".w").count():
                    page.locator(".w").first.scroll_into_view_if_needed(); page.wait_for_timeout(200)  # a scroll closes the word pop-up
                    page.locator(".w").first.click(); page.wait_for_selector("#pop", state="visible")
                    page.locator("sup.nn").first.click(); page.wait_for_selector("#pop.note-pop"); shot(f"{t['key']}-1-note")
                    page.keyboard.press("Escape")
                page.locator("#markdone").click(); page.wait_for_selector("#undo")
    page.goto((ROOT / "dist" / "wenyan.html").as_uri() + "#settings")
    page.locator("#sSimp").click(); page.locator("#sNight").click(); check("settings"); shot("settings-night")


with sync_playwright() as p:
    b = p.chromium.launch()
    run(b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2).new_page(), "phone")
    run(b.new_context(viewport={"width": 1200, "height": 850}).new_page(), "wide")
    b.close()
if errors:
    sys.exit("\n".join(errors))
print("smoke: ok")
