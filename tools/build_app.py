#!/usr/bin/env python3
"""Join the app: app/index.template.html + the parts in app/src/ + the course -> one self-contained page.

  app/dist/index.html   what GitHub Pages serves (python3 -m http.server -d app/dist)
  dist/wenyan.html      the same file, kept under its old name (opens offline, is what gets shared)

Called by tools/build.py once the course is validated. The parts are joined in the order of PARTS, the CSS inside the
one <style>, the JS inside the one closure the template opens, so every part sees the others' names (no modules, no
bundler). One concern per part: see app/src/README.md.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "app" / "src"
TEMPLATE = ROOT / "app" / "index.template.html"
OUTS = [ROOT / "app" / "dist" / "index.html", ROOT / "dist" / "wenyan.html"]

# The join order, here and nowhere else. CSS: later rules win ties. JS: events.js boots the app, so it stays last.
PARTS = {
    "css": ["base.css", "lesson.css", "chengyu.css", "settings.css", "rumen.css", "sheet.css", "dict.css"],
    "js": ["core.js", "track.js", "route.js", "home.js", "toolbar.js", "lesson.js", "chengyu.js", "sheet.js", "rumen.js",
           "dict.js", "settings.js", "sync.js", "module.js", "events.js"],
}
SLOTS = {"css": "/*__CSS__*/", "js": "/*__JS__*/", "data": "/*__DATA__*/"}


def join(kind):
    return "".join((SRC / p).read_text(encoding="utf-8") for p in PARTS[kind]).rstrip("\n")


def page(course):
    tpl = TEMPLATE.read_text(encoding="utf-8")
    for k, slot in SLOTS.items():
        assert tpl.count(slot) == 1, f"{TEMPLATE.name}: needs exactly one {slot}"
    # the data goes into <script type="application/json">: every '<' is escaped (still valid JSON, the same string
    # once parsed), so no '</script' or '<!--' in the text can end or confuse the block
    fill = {"css": join("css"), "js": join("js"),
            "data": json.dumps(course, ensure_ascii=False).replace("<", "\\u003c")}
    # one pass over the template only: a slot name inside a part or the data is left alone
    out, rest = [], tpl
    for k in sorted(SLOTS, key=lambda k: tpl.index(SLOTS[k])):
        head, rest = rest.split(SLOTS[k], 1)
        out += [head, fill[k]]
    return "".join(out + [rest])


def build(course):
    html = page(course)
    for out in OUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        print(f"single file -> {out.relative_to(ROOT)} ({len(html.encode()) // 1024} KB)")


if __name__ == "__main__":
    # rejoin the page from the last course build (app/course.json), without validating the lessons again
    build(json.loads((ROOT / "app" / "course.json").read_text(encoding="utf-8")))
