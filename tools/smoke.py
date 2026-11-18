#!/usr/bin/env python3
"""Click through the built app at phone (390 px) and desktop width: every tab and every lesson, then in each track a
word card, a note with previous / next, every toolbar switch, Cover tap-to-reveal, a cross-track reference, Settings,
and the migration of the old settings keys.

  pip install playwright && playwright install chromium
  make smoke     (builds first, then python3 -I tools/smoke.py [--shots DIR] [--only phone,wide,…])

Opens the built page, app/dist/index.html (what GitHub Pages serves), and reads app/course.json: both are written by
the build and not committed.

Fails on any JavaScript error, on a lesson that renders no text, on a check that does not hold, and on horizontal
page scroll.

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
TR = {t["key"]: t for t in course["tracks"]}
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

    def expect(cond, what):
        if not cond:
            errors.append(f"{name}: {what}")

    def sheet():
        page.wait_for_selector("#sheet.open")
        page.wait_for_timeout(250)                       # the slide-in
        return page.locator("#sheet")

    def close():
        page.keyboard.press("Escape")
        page.wait_for_selector("#sheet:not(.open)", state="attached")

    def click(sel):
        el = page.locator(sel).first
        el.scroll_into_view_if_needed()
        el.click()

    def toolbar(where):
        """every switch of the bar: the page redraws, the setting cycles through its values and comes back"""
        for b, key, n in (("#tScript", "script", 2), ("#tPy", "pinyin", 3), ("#tLang", "rlang", 2), ("#tCover", "cover", 2)):
            if not page.locator(b).count():
                continue
            setting = lambda: page.evaluate(f"JSON.parse(localStorage.getItem('wy.settings') || '{{}}').{key}")
            start, seen = setting(), []
            for _ in range(n):
                page.locator(b).click(); page.wait_for_selector(".lbar")
                seen.append(setting()); check(f"{where} {b}")
            expect(len(set(map(str, seen))) == n, f"{where} {b}: values {seen}")
            expect(key == "script" or seen[-1] == start, f"{where} {b}: did not come back to {start} ({seen})")
        expect(page.locator("#tLang").count() == (where.startswith("rumen")), f"{where}: language switch where there is one language")
        expect(page.locator("#tPy").count() == (not where.startswith("baihua")), f"{where}: pinyin switch wrong")
        h = page.evaluate("location.hash")                       # the script switch leaves the setting on trad / simp
        page.goto(PAGE + "#settings"); page.locator('[data-act="script"][data-v="src"]').click()
        page.goto(PAGE + h); page.wait_for_selector(".lbar")

    def cover(where, line, target):
        page.locator("#tCover").click(); page.wait_for_selector("html.cover")
        blur = lambda: page.evaluate(f"getComputedStyle(document.querySelector('{target}')).filter")
        expect(blur() != "none", f"{where}: Cover does not blur {target}")
        page.locator(line).first.scroll_into_view_if_needed(); page.wait_for_timeout(250); shot(f"{where.split('/')[0]}-cover")
        click(line); page.wait_for_timeout(250)
        expect(blur() == "none", f"{where}: a tap on the line does not reveal it")
        page.locator("#tCover").click(); page.wait_for_selector("html:not(.cover)")

    def notes(where, opener):
        click(opener); sh = sheet()
        first = sh.locator(".ntag").inner_text()
        expect(page.locator(".noted").count() > 0, f"{where}: the note's line is not highlighted")
        shot(f"{where.split('/')[0]}-note")
        sh.locator(".nrow [data-note]").nth(1).click(); page.wait_for_timeout(100)
        second = sh.locator(".ntag").inner_text()
        expect(second != first and " 2 " in f" {second} ", f"{where}: Next › did not page ({first!r} -> {second!r})")
        sh.locator(".nrow [data-note]").nth(0).click(); page.wait_for_timeout(100)
        expect(sh.locator(".ntag").inner_text() == first, f"{where}: ‹ Previous did not come back")

    page.on("pageerror", lambda e: errors.append(f"{name}: {e}"))
    page.on("console", lambda m: errors.append(f"{name}: console {m.text}") if m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text else None)
    page.goto(PAGE)
    page.evaluate("localStorage.clear()"); page.reload()
    page.wait_for_selector(".thead")
    expect(page.locator('#tabs a[aria-current="page"]').inner_text().startswith("入門"), "a first visit does not open 入門")

    # every tab, every lesson: renders, no sideways scroll, mark as done
    for t in course["tracks"]:
        page.goto(PAGE + "#" + t["key"]); page.wait_for_selector(".thead")
        expect(page.locator('#tabs a[aria-current="page"]').get_attribute("href") == "#" + t["key"], f"#{t['key']}: tab not highlighted")
        check(t["key"]); shot(t["key"])
        for l in t["lessons"]:
            page.goto(PAGE + f"#{t['key']}/{l['id']}"); page.wait_for_selector(".lbar")
            if not page.locator("h1").inner_text().strip():
                errors.append(f"{name} {t['key']}/{l['id']}: no title")
            check(f"{t['key']}/{l['id']}")
            page.locator("#markdone").click(); page.wait_for_selector("#undo")
        page.goto(PAGE + "#" + t["key"]); page.wait_for_selector(".thead")
        expect(page.locator(".tile.done").count() == len(t["lessons"]), f"#{t['key']}: done ticks missing")

    # 入門: word card, card from inside a note (with the way back), notes, switches, Cover, choice, second wave
    page.goto(PAGE + "#rumen/1"); page.wait_for_selector(".lbar"); shot("rumen-1")
    click(".dlg .tok"); sh = sheet(); expect(sh.locator(".wh").count() == 1, "rumen: no word card"); shot("rumen-card")
    expect(sh.locator(".dx").count() == 1, "rumen: card without its .dx block"); close()
    click(".wchip"); sheet(); close()
    notes("rumen/1", ".nlink")
    wt = page.locator("#sheet .ntext .wt")
    if wt.count():
        wt.first.click(); page.wait_for_selector("#sheet .wh"); expect(page.locator("#sheet .sback").count() == 1, "rumen: card from a note has no ‹ Back")
        page.locator("#sheet .sback").click(); page.wait_for_selector("#sheet .ntag")
    close()
    page.locator("#sec-notes summary").click()
    q = TR["rumen"]["lessons"][0]["exercise"]["choose"][0]
    click(f'.opt[data-q="0"][data-o="{q["opts"].index(q["a"])}"]')
    page.wait_for_selector('.q[data-q="0"] .after', state="visible")
    cover("rumen/1", ".sent .tr", ".sent .tr")
    page.locator("#tPy").click()                                           # on tap: first tap shows the pinyin
    expect(page.evaluate("document.documentElement.dataset.py") == "tap", "rumen: pinyin did not go to on tap")
    tok = page.locator(".dlg .tok").first; tok.click()
    expect("show" in tok.get_attribute("class") and not page.locator("#sheet.open").count(), "rumen: on tap, the first tap does not only show the pinyin")
    tok.click(); sheet(); close()
    page.locator("#tPy").click(); page.locator("#tPy").click()
    toolbar("rumen/1"); shot("rumen-1-toggled")
    page.goto(PAGE + "#rumen/1/wave"); page.wait_for_selector(".showzh")
    page.locator(".showzh").first.click(); page.locator("#showAll").click()
    expect(not page.locator(".txt[hidden]").count(), "rumen wave: Show all left lines hidden")
    page.locator("#markdone").click(); page.wait_for_selector("#undo")
    page.keyboard.press("ArrowRight"); page.wait_for_selector('#prev[href="#rumen/1/wave"]')
    page.keyboard.press("ArrowLeft"); page.wait_for_function("location.hash === '#rumen/1/wave'")

    # 文言: glossary word, note pop-up, switches, pinyin on tap, Cover
    page.goto(PAGE + "#wenyan/1"); page.wait_for_selector(".lbar"); shot("wenyan-1")
    click(".page.left .w"); sh = sheet(); expect(sh.locator(".wh").count() == 1, "wenyan: no word card"); shot("wenyan-card"); close()
    click(".wgrid .wchip"); sheet(); close()
    notes("wenyan/1", "sup.nn")
    page.locator("#sheet .goto").click(); page.wait_for_selector("#sheet:not(.open)", state="attached")
    page.locator("#tPy").click(); page.wait_for_selector('html[data-py="tap"]')
    py = page.locator(".page.left .py").first; py.click()
    expect("show" in py.get_attribute("class"), "wenyan: a tap does not show the pinyin line")
    page.locator("#tPy").click(); page.locator("#tPy").click()
    cover("wenyan/1", *((".page.left .en-inline",) * 2 if name == "phone" else (".page.right .en",) * 2))
    toolbar("wenyan/1")
    page.keyboard.press("ArrowRight"); page.wait_for_function("location.hash === '#wenyan/2'")
    page.goto(PAGE + "#wenyan/7"); page.wait_for_selector(".recap"); check("wenyan/7 review")
    click(".refs .ref"); page.wait_for_selector(".note.flash")
    expect(page.evaluate("/^#wenyan\\/\\d+\\/n\\d+$/.test(location.hash)"), "wenyan: a reference does not land on its note")

    # 白話: word card, note, cross-track reference (to a 文言 note), Roots exercise link, Cover
    page.goto(PAGE + "#baihua/1"); page.wait_for_selector(".lbar"); shot("baihua-1")
    click(".page.left .w"); sheet(); shot("baihua-card"); close()
    notes("baihua/1", "sup.nn")
    close()
    cover("baihua/1", *((".page.left .en-inline",) * 2 if name == "phone" else (".page.right .en",) * 2))
    toolbar("baihua/1")
    page.goto(PAGE + "#baihua/1/n5"); page.wait_for_selector("#n5.flash")
    click('.note .ref[data-to^="wenyan/"]'); page.wait_for_function("/^#wenyan\\/\\d+\\/n\\d+$/.test(location.hash)")
    page.wait_for_selector('#tabs a[aria-current="page"][href="#wenyan"]'); page.wait_for_selector(".note.flash"); check("cross-track ref")
    page.goto(PAGE + "#baihua/1"); page.wait_for_selector(".lbar")
    click('.q .ref[data-to^="wenyan/"]'); page.wait_for_function("/^#wenyan\\/\\d+$/.test(location.hash)")

    # 成語: the 成語's card, switches, Cover (tap the card)
    page.goto(PAGE + "#chengyu/1"); page.wait_for_selector(".cys"); shot("chengyu-1")
    click(".cy .cw"); sh = sheet(); expect(sh.locator(".wh").count() == 1, "chengyu: no word card"); shot("chengyu-card"); close()
    cover("chengyu/1", ".cy .xz", ".cy .cr")
    toolbar("chengyu/1")
    check("chengyu/1")

    dict_pass(page, name, check)
    integration(page, name, expect)

    # Settings: every switch, then back to the defaults
    page.goto(PAGE + "#settings"); page.wait_for_selector(".set")
    for act, v in (("script", "simp"), ("pinyin", "off"), ("cover", "on"), ("lang", "en"), ("night", "on")):
        page.locator(f'[data-act="{act}"][data-v="{v}"]').click(); page.wait_for_selector(f'[data-act="{act}"][data-v="{v}"][aria-pressed="true"]')
    expect(page.evaluate("document.documentElement.dataset.theme") == "dark", "settings: night mode not applied")
    expect(page.locator("#set-sync").count() == 1 and page.locator("#set-module").count() == 1, "settings: sync / module containers missing")
    check("settings"); shot("settings-night")
    page.goto(PAGE + "#wenyan/1"); page.wait_for_selector(".lbar"); check("wenyan/1 simplified, night"); shot("wenyan-1-night")
    expect(page.evaluate("(() => { const z = document.querySelector('.page.left .zh').cloneNode(true); z.querySelectorAll('sup').forEach(x => x.remove()); return z.textContent; })()") == TR["wenyan"]["lessons"][0]["lines"][0]["h_s"], "simplified: 文言 not in simplified")
    page.goto(PAGE + "#settings"); page.wait_for_selector(".set")
    for act, v in (("script", "src"), ("pinyin", "above"), ("cover", "off"), ("lang", "fr"), ("night", "off")):
        page.locator(f'[data-act="{act}"][data-v="{v}"]').click(); page.wait_for_selector(f'[data-act="{act}"][data-v="{v}"][aria-pressed="true"]')
    shot("settings")


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
                page.wait_for_selector("#sheet .sback")
                page.locator("#sheet .sback").click()
                if page.locator("#sheet .zd").get_attribute("data-hw") != w:
                    errors.append(f"{name} {t['key']}/{l['id']}: Characters -> Back did not return to {w}")
                backed = True
            page.keyboard.press("Escape")
        if not backed and t["key"] == "wenyan":
            # 文言 is read one character at a time: Characters -> Back from a glossary word's card (its .dx)
            page.goto(PAGE + f"#{t['key']}/1"); page.wait_for_selector(".lbar")
            g = page.locator(".page.left .w").filter(has_text=re.compile(r"^..+$"))
            if g.count():
                w = g.first.inner_text(); g.first.scroll_into_view_if_needed(); g.first.click()
                page.wait_for_selector("#sheet.open .dx [data-zact=word]")
                page.locator("#sheet .dx [data-zact=word]").first.click(); page.wait_for_selector("#sheet .sback")
                page.locator("#sheet .sback").click(); page.wait_for_selector("#sheet .gloss")
                if not page.locator("#sheet .wh").inner_text().startswith(w):
                    errors.append(f"{name} wenyan/1: Characters -> Back did not return to the card of {w}")
                backed = True
                page.keyboard.press("Escape")
        if not backed:
            errors.append(f"{name} {t['key']}: no word of two characters or more to test Characters -> Back")
    if total < 300:
        errors.append(f"{name}: only {total} dictionary words tapped (want at least 300)")
    print(f"smoke: {name}: {total} dictionary words tapped")


def integration(page, name, expect):
    """the three branches together: our gloss before the automatic layer, one way back, the script setting in the
    dictionary, Cover and pinyin on tap with dictionary words, 入門 notes made of course words only"""
    def sheet():
        page.wait_for_selector("#sheet.open"); page.wait_for_timeout(200)

    def close():
        page.keyboard.press("Escape"); page.wait_for_selector("#sheet:not(.open)", state="attached")

    def tap(loc):
        loc.scroll_into_view_if_needed(); loc.click()

    order = """([a, b]) => { const x = document.querySelector('#sheet ' + a), y = document.querySelector('#sheet ' + b);
      return !!(x && y && (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING)); }"""
    page.goto(PAGE + "#settings"); page.wait_for_selector(".set")
    page.evaluate("localStorage.setItem('wy.settings', JSON.stringify({script: 'src', pinyin: 'above', cover: false, rlang: 'fr', night: false}))")
    page.reload(); page.wait_for_selector(".set")
    # 白話: a glossary word (our card): our gloss, then the automatic layer in .dx
    page.goto(PAGE + "#baihua/1"); page.wait_for_selector(".lbar")
    multi = page.locator(".page.left .w").filter(has_text=re.compile(r"^..+$")).first
    w = multi.inner_text(); tap(multi); sheet()
    expect(page.evaluate(order, [".gloss", ".dx .zauto"]), f"baihua: the card of {w} does not show our gloss, then the automatic layer")
    # Characters -> ‹ Back returns to the card, through sheetBack
    page.locator("#sheet .dx button.zchar, #sheet .dx button.zw").first.click(); page.wait_for_selector("#sheet .zd")
    expect(page.locator("#sheet .sback").count() == 1, "baihua: a character of a card has no ‹ Back")
    page.locator("#sheet .sback").click(); page.wait_for_selector("#sheet .gloss")
    expect(page.locator("#sheet .wh").inner_text().startswith(w), f"baihua: ‹ Back did not return to the card of {w}")
    close()
    # a dictionary word the course glosses (入門): "In the course" first, then the automatic layer
    D = TR["rumen"]["dict"]; known = set(D) | {d["t"] for d in D.values() if d.get("t")}
    toks = page.locator(".page.left .ztok")
    k = next((i for i in range(toks.count()) if toks.nth(i).get_attribute("data-z") in known), None)
    expect(k is not None, "baihua: no dictionary word that 入門 glosses")
    if k is not None:
        tap(toks.nth(k)); sheet()
        expect(page.evaluate(order, [".zours", ".zauto"]), "baihua: a word 入門 glosses does not show our gloss first")
        close()
    # Cover: the first tap on a word of a hidden line reveals it, the second opens the dictionary
    page.locator("#tCover").click(); page.wait_for_selector("html.cover")
    tok = page.locator('.page.left .ln[data-i="1"] .ztok').first
    tap(tok); page.wait_for_timeout(150)
    expect(page.locator('.ln[data-i="1"].peek').count() > 0 and not page.locator("#sheet.open").count(), "Cover: the first tap on a word did not only reveal its line")
    tok.click(); sheet(); close()
    page.locator("#tCover").click(); page.wait_for_selector("html:not(.cover)")
    # script = simplified: a 白話 word opens under its simplified headword
    page.evaluate("localStorage.setItem('wy.settings', JSON.stringify({script: 'simp', pinyin: 'above', cover: false, rlang: 'fr', night: false}))")
    page.reload(); page.wait_for_selector(".lbar")
    trad = [l["h"] for l in TR["baihua"]["lessons"][0]["lines"]]
    z = page.evaluate("""trad => { for (const el of document.querySelectorAll('.page.left .ln .ztok')) {
        const i = +el.closest('.ln').dataset.i; if (!trad[i].includes(el.dataset.z)) { el.classList.add('pick'); return el.dataset.z; } } return null; }""", trad)
    expect(z is not None, "simplified: no 白話 word whose form differs")
    if z:
        tap(page.locator(".ztok.pick")); sheet()
        expect(page.locator("#sheet .zd").get_attribute("data-hw") == z and page.evaluate("document.querySelector('#sheet .zd .wh').firstChild.textContent") == z,
               f"simplified: the sheet of {z} does not have the simplified headword")
        close()
    page.evaluate("localStorage.setItem('wy.settings', JSON.stringify({script: 'src', pinyin: 'tap', cover: false, rlang: 'fr', night: false}))")
    page.reload(); page.wait_for_selector(".lbar")
    # 入門: notes are course words only (.wt), whose card has the automatic layer only inside .dx (in French)
    for l in TR["rumen"]["lessons"]:
        page.goto(PAGE + f"#rumen/{l['id']}"); page.wait_for_selector(".lbar")
        n_z, n_wt = page.evaluate("[document.querySelectorAll('#sec-notes .ztok').length, document.querySelectorAll('#sec-notes .wt').length]")
        expect(n_z == 0, f"rumen/{l['id']}: {n_z} Chinese words in the notes that no course card covers")
    page.goto(PAGE + "#rumen/1"); page.wait_for_selector(".lbar")
    page.locator(".nlink").first.click(); sheet()
    wt = page.locator("#sheet .ntext .wt").first
    wt.click(); page.wait_for_selector("#sheet .wh")
    expect(page.evaluate(order, [".gloss", ".dx .zauto"]) and page.locator("#sheet .zauto").count() == page.locator("#sheet .dx .zauto").count(),
           "rumen: a note's word card is not our gloss then the automatic layer inside .dx")
    expect("automatique" in page.locator("#sheet .dx .zlab").first.inner_text().lower(), "rumen: the automatic layer is not in French")
    if shots:
        shots.mkdir(parents=True, exist_ok=True); page.screenshot(path=str(shots / f"{name}-rumen-note-card-dx.png"))
    close()
    # pinyin on tap: a dictionary word (no pinyin above it) opens at once
    q = page.locator(".prac .q .txt .ztok").first
    tap(q); sheet(); expect(page.locator("#sheet .zd").count() == 1, "rumen: pinyin on tap, a dictionary word did not open")
    close()
    page.evaluate("localStorage.setItem('wy.settings', JSON.stringify({script: 'src', pinyin: 'above', cover: false, rlang: 'fr', night: false}))")
    page.reload(); page.wait_for_selector(".lbar")


def migration(page):
    """the old keys become wy.settings once; the done dates stay; a second run changes nothing"""
    page.on("pageerror", lambda e: errors.append(f"migration: {e}"))
    page.goto(PAGE)
    for seed, want in (
        ({"simp": True, "py": False, "rmode": "tap", "cover": True, "rlang": "en", "night": True},
         {"script": "simp", "pinyin": "tap", "cover": True, "rlang": "en", "night": True}),
        ({"rtrad": True, "py": False}, {"script": "trad", "pinyin": "off", "cover": False, "rlang": "fr", "night": False}),
        ({"rmode": "han"}, {"script": "src", "pinyin": "off", "cover": False, "rlang": "fr", "night": False}),
        ({}, {"script": "src", "pinyin": "above", "cover": False, "rlang": "fr", "night": False}),
    ):
        old = {**seed, "done": {"wenyan:1": "2026-01-02", "rumen:52:wave": "2026-03-04"}, "tab": "wenyan"}
        page.evaluate("o => { localStorage.clear(); for (const k in o) localStorage.setItem('wy.' + k, JSON.stringify(o[k])); }", old)
        for i in (1, 2):
            page.reload(); page.wait_for_selector(".thead")
            got = page.evaluate("JSON.parse(localStorage.getItem('wy.settings'))")
            done = page.evaluate("JSON.parse(localStorage.getItem('wy.done'))")
            if got != want:
                errors.append(f"migration {seed} (run {i}): {got} != {want}")
            if done != old["done"]:
                errors.append(f"migration {seed}: done changed: {done}")
        if page.evaluate("document.documentElement.dataset.py") != want["pinyin"] or (page.evaluate("document.documentElement.dataset.theme") == "dark") != want["night"]:
            errors.append(f"migration {seed}: not applied to the page")
        if page.locator(".tile.done").count() != 1:
            errors.append(f"migration {seed}: the 文言 home does not show lesson 1 done")
    # Load: a progress file merges, the earliest date of each lesson wins
    page.goto(PAGE + "#settings"); page.wait_for_selector("#file", state="attached")
    page.set_input_files("#file", files=[{"name": "p.json", "mimeType": "application/json",
        "buffer": json.dumps({"app": "wenyan", "done": {"wenyan:1": "2027-01-01", "wenyan:2": "2025-05-06"}}).encode()}])
    page.wait_for_function("JSON.parse(localStorage.getItem('wy.done'))['wenyan:2'] === '2025-05-06'")
    if page.evaluate("JSON.parse(localStorage.getItem('wy.done'))['wenyan:1']") != "2026-01-02":
        errors.append("Load: the earliest date did not win")
    page.evaluate("localStorage.clear()")


CLASSICAL_SWEEP = """() => {
  // every word of classical text on the page (and, for a 成語, of its origin in the card): no 入門 gloss, no modern example
  const out = {n: 0, bad: []}, sh = document.querySelector('#sheet');
  const test = (el, where) => {
    el.click(); out.n++;
    const zd = sh.querySelector('.zd');
    if (!zd) return out.bad.push(where + ' ' + el.dataset.z + ': no dictionary sheet');
    const ours = zd.querySelector('.zours');
    if (ours && (ours.querySelector('[data-to^="rumen"]') || /入門|入门/.test(ours.textContent))) out.bad.push(where + ' ' + el.dataset.z + ': 入門 gloss "' + ours.textContent.trim() + '"');
    for (const li of zd.querySelectorAll('.zex li'))
      if (li.querySelector('[data-to^="rumen"]') || !li.querySelector('[data-zh="classical"]')) out.bad.push(where + ' ' + el.dataset.z + ': modern example "' + li.textContent.trim().slice(0, 30) + '"');
  };
  const sel = '[data-zh="classical"] .ztok';
  document.querySelectorAll('#app ' + sel).forEach(el => test(el, location.hash));
  document.querySelectorAll('#app .cy .cw').forEach((cw, i) => {
    cw.click(); const n = sh.querySelectorAll(sel).length;
    for (let j = 0; j < n; j++){ document.querySelectorAll('#app .cy .cw')[i].click(); test(sh.querySelectorAll(sel)[j], location.hash + ' origin'); }
  });
  return out;
}"""


def classical_gloss(b):
    """finding 1: inside classical text (文言, 白話 Roots, 成語 origins) the course gloss is the lesson's own, never 入門's,
    and the examples are classical lines only"""
    page = b.new_context(viewport={"width": 1200, "height": 850}).new_page()
    page.on("pageerror", lambda e: errors.append(f"classical: {e}"))
    n = 0
    for t in ("wenyan", "baihua", "chengyu"):
        for l in TR[t]["lessons"]:
            page.goto(PAGE + f"#{t}/{l['id']}"); page.wait_for_selector(".lbar")
            r = page.evaluate(CLASSICAL_SWEEP)
            n += r["n"]
            errors.extend(f"classical: {x}" for x in r["bad"][:5])
            if len(r["bad"]) > 5:
                errors.append(f"classical: {t}/{l['id']}: {len(r['bad']) - 5} more")
    if n < 1000:
        errors.append(f"classical: only {n} classical words tapped")
    page.context.close()
    print(f"smoke: classical: {n} words of classical text tapped, none with a 入門 gloss or a modern example")


def progress_file(b):
    """finding 6: Save writes the done dates only; Load merges them and ignores settings in the file (an older file has
    them): this device's settings stay"""
    page = b.new_context(viewport={"width": 1200, "height": 850}, accept_downloads=True).new_page()
    page.on("pageerror", lambda e: errors.append(f"progress file: {e}"))
    page.goto(PAGE); page.evaluate("localStorage.clear()")
    mine = {"script": "src", "pinyin": "tap", "cover": False, "rlang": "en", "night": False}
    page.evaluate("s => { localStorage.setItem('wy.settings', JSON.stringify(s)); localStorage.setItem('wy.done', JSON.stringify({'wenyan:1': '2026-01-02'})); }", mine)
    page.goto(PAGE + "#settings"); page.reload(); page.wait_for_selector("#save")
    with page.expect_download() as dl:
        page.locator("#save").click()
    saved = json.loads(Path(dl.value.path()).read_text(encoding="utf-8"))
    if "settings" in saved or saved.get("done") != {"wenyan:1": "2026-01-02"} or saved.get("app") != "wenyan":
        errors.append(f"progress file: Save wrote {saved}")
    old = {"app": "wenyan", "done": {"wenyan:2": "2025-05-06"}, "settings": {"script": "simp", "pinyin": "off", "cover": True, "rlang": "fr", "night": True}}
    page.set_input_files("#file", files=[{"name": "p.json", "mimeType": "application/json", "buffer": json.dumps(old).encode()}])
    page.wait_for_function("JSON.parse(localStorage.getItem('wy.done'))['wenyan:2'] === '2025-05-06'")
    got = page.evaluate("JSON.parse(localStorage.getItem('wy.settings'))")
    if got != mine or page.evaluate("document.documentElement.dataset.theme") == "dark":
        errors.append(f"progress file: Load changed this device's settings: {got}")
    page.context.close()
    print("smoke: progress file: Save writes the done dates only; Load keeps this device's settings")


def trad_forms(b):
    """finding 7: 入門 words have the standard traditional form (OpenCC, not the NHSK list's 嵗 䛐 几), so a word
    tapped in traditional text finds its 入門 gloss"""
    D = TR["rumen"]["dict"]
    for s_, t in (("岁", "歲"), ("几", "幾"), ("词", "詞"), ("这里", "這裡"), ("家", "家"), ("和", "和"), ("床", "床"), ("吃", "吃")):
        if s_ in D and D[s_]["t"] != t:
            errors.append(f"trad forms: 入門 {s_} has the traditional form {D[s_]['t']}, not {t}")
    page = b.new_context(viewport={"width": 1200, "height": 850}).new_page()
    page.on("pageerror", lambda e: errors.append(f"trad forms: {e}"))
    page.goto(PAGE); page.evaluate("localStorage.clear()")
    page.goto(PAGE + "#baihua/1"); page.reload(); page.wait_for_selector(".lbar")
    for w, k in (("歲", "岁"), ("幾", "几"), ("詞", "词"), ("這裡", "这里")):
        page.evaluate("w => { document.querySelector('#tx')?.remove(); document.querySelector('#app').insertAdjacentHTML('beforeend', `<p id=\"tx\">他今年十<span class=\"ztok\" data-z=\"${w}\">${w}</span>。</p>`); }", w)
        page.locator("#tx .ztok").click(); page.wait_for_selector("#sheet.open .zd")
        py = page.locator("#sheet .zours .cg-py")
        if not py.count() or py.inner_text() != D[k]["py"]:
            errors.append(f"trad forms: {w} in traditional text has no 入門 gloss")
        page.keyboard.press("Escape")
    page.context.close()
    print("smoke: trad forms: 歲 幾 詞 這裡 find their 入門 gloss in traditional text")


TESTS = {"phone": lambda b: run(b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True).new_page(), "phone"),
         "wide": lambda b: run(b.new_context(viewport={"width": 1200, "height": 850}).new_page(), "wide"),
         "migration": lambda b: migration(b.new_context(viewport={"width": 1200, "height": 850}).new_page()),
         "classical": classical_gloss, "progress_file": progress_file, "trad_forms": trad_forms}
# --only a,b: run only these tests (while working on one)
ONLY = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else list(TESTS)
with sync_playwright() as p:
    b = p.chromium.launch()
    for k in ONLY:
        TESTS[k](b)
    b.close()
if errors:
    sys.exit("\n".join(errors))
print("smoke: ok")
