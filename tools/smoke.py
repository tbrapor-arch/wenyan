#!/usr/bin/env python3
"""Click through the built app in a phone-sized browser: every tab and every lesson, marking each lesson done.

  pip install playwright && playwright install chromium
  make smoke     (builds first, then python3 -I tools/smoke.py [--shots DIR])

Opens the built page, app/dist/index.html (what GitHub Pages serves), and reads app/course.json: both are written by
the build and not committed.

Fails on any JavaScript error, on a lesson that renders no text, and on horizontal page scroll.

Dictionary pass (app/src/dict.js): on every lesson page, taps tappable Chinese words (.ztok) spread over the page
(at least 300 per width), and checks that the sheet opens on that word with at least one layer (the course's gloss or
the automatic one), that a character of a word opens its own card and "‹ Back" returns, and that neither the page nor
the sheet scrolls sideways.
"""
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
shots = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
course = json.loads((ROOT / "app" / "course.json").read_text(encoding="utf-8"))
PAGE = (ROOT / "app" / "dist" / "index.html").as_uri()
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
    page.goto(PAGE)
    for t in course["tracks"]:
        page.goto(PAGE + "#" + t["key"])
        page.wait_for_selector(".thead")
        check(t["key"]); shot(t["key"])
        for l in t["lessons"]:
            page.goto(PAGE + f"#{t['key']}/{l['id']}")
            page.wait_for_selector(".lbar")
            if not page.locator("h1").inner_text().strip():
                errors.append(f"{name} {t['key']}/{l['id']}: no title")
            check(f"{t['key']}/{l['id']}")
            if l["id"] == 1 and t["key"] == "rumen":
                shot("rumen-1")
                page.locator(".tok").first.click(); page.wait_for_selector("#sheet.open"); shot("rumen-1-card")
                page.locator("#sheet .x").click()
                page.locator(".nlink").first.click(); page.wait_for_selector("#sheet.open .ntext"); shot("rumen-1-note")
                page.locator("#sheet .ntext .wt").first.click(); page.wait_for_selector("#sheet.open .wh")
                page.keyboard.press("Escape")
                page.locator("details.allnotes summary").click()
                q = l["exercise"]["choose"][0]
                page.locator(f'.opt[data-q="0"][data-o="{q["opts"].index(q["a"])}"]').click()
                page.wait_for_selector('.q[data-q="0"] .after', state="visible"); shot("rumen-1-practice")
                for b in ("#rMode", "#rScript", "#rLang"):
                    page.locator(b).click(); page.wait_for_selector(".lbar"); check(f"rumen/1 {b}")
                shot("rumen-1-toggled")
                page.locator("#rDone").click(); page.wait_for_selector("#rUndo")
            elif l["id"] == 1:
                shot(f"{t['key']}-1")
                if page.locator(".w").count():
                    page.locator(".w").first.scroll_into_view_if_needed(); page.wait_for_timeout(200)  # a scroll closes the word pop-up
                    page.locator(".w").first.click(); page.wait_for_selector("#pop", state="visible")
                    page.locator("sup.nn").first.click(); page.wait_for_selector("#pop.note-pop"); shot(f"{t['key']}-1-note")
                    page.keyboard.press("Escape")
                page.locator("#markdone").click(); page.wait_for_selector("#undo")
    dict_pass(page, name, check)
    page.goto(PAGE + "#settings")
    page.locator("#sSimp").click(); page.locator("#sNight").click(); check("settings"); shot("settings-night")


TAP_JS = """(n) => {
  const all = [...document.querySelectorAll('#app .ztok')], out = {tapped: 0, bad: [], wide: []};
  const pick = all.length <= n ? all : Array.from({length: n}, (_, i) => all[Math.floor(i * all.length / n)]);
  for (const el of pick) {
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    el.click(); out.tapped++;
    const sh = document.querySelector('#sheet'), zd = sh.querySelector('.zd');
    if (!sh.classList.contains('open') || !zd || zd.dataset.hw !== el.dataset.z || !sh.querySelector('.wh')
        || !(sh.querySelector('.zauto') || sh.querySelector('.zours'))) out.bad.push(el.dataset.z);
    if (sh.scrollWidth > sh.clientWidth + 1) out.wide.push(el.dataset.z);
  }
  document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  return out;
}"""


def dict_pass(page, name, check):
    """tap .ztok words on every lesson page; characters -> back once per track"""
    total = 0
    for t in course["tracks"]:
        backed = False
        for l in t["lessons"]:
            page.goto(PAGE + f"#{t['key']}/{l['id']}")
            page.wait_for_selector(".lbar")
            page.keyboard.press("Escape")
            r = page.evaluate(TAP_JS, 25)
            total += r["tapped"]
            for w in r["bad"][:3]:
                errors.append(f"{name} {t['key']}/{l['id']}: the dictionary sheet did not open on {w}")
            for w in r["wide"][:3]:
                errors.append(f"{name} {t['key']}/{l['id']}: the sheet of {w} scrolls sideways")
            # one real tap (pointer, not script) per page, sheet open: the page must not scroll sideways
            tok = page.locator("#app .ztok").first
            if tok.count():
                page.keyboard.press("Escape"); page.wait_for_timeout(250)
                tok.scroll_into_view_if_needed(); tok.click()
                page.wait_for_selector("#sheet.open .zd")
                check(f"{t['key']}/{l['id']} dictionary sheet")
            multi = page.locator("#app .ztok").filter(has_text=re.compile(r"^..+$"))
            if not backed and multi.count():
                page.keyboard.press("Escape"); page.wait_for_timeout(250)
                w = multi.first.get_attribute("data-z")
                multi.first.scroll_into_view_if_needed(); multi.first.click()
                page.wait_for_selector("#sheet.open .zchar")
                page.locator("#sheet button.zchar").first.click()
                page.wait_for_selector("#sheet .zback")
                page.locator("#sheet .zback").click()
                if page.locator("#sheet .zd").get_attribute("data-hw") != w:
                    errors.append(f"{name} {t['key']}/{l['id']}: Characters -> Back did not return to {w}")
                backed = True
            page.keyboard.press("Escape")
        if not backed:
            errors.append(f"{name} {t['key']}: no word of two characters or more to test Characters -> Back")
    if total < 300:
        errors.append(f"{name}: only {total} dictionary words tapped (want at least 300)")
    print(f"smoke: {name}: {total} dictionary words tapped")


with sync_playwright() as p:
    b = p.chromium.launch()
    run(b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2).new_page(), "phone")
    run(b.new_context(viewport={"width": 1200, "height": 850}).new_page(), "wide")
    b.close()
if errors:
    sys.exit("\n".join(errors))
print("smoke: ok")
