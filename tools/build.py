#!/usr/bin/env python3
"""Build app/course.json from lessons/*.yaml.

Adds simplified forms (field + "_s") for every Chinese text field with OpenCC t2s, applying
tools/overrides.yaml ({trad: simp}) afterwards. Validates the lesson schema (STANDARDS.md §2).

  pip install pyyaml opencc-python-reimplemented
  python3 tools/build.py
"""
import json, sys
from pathlib import Path
import yaml
from opencc import OpenCC

ROOT = Path(__file__).resolve().parent.parent
cc = OpenCC("t2s")
OVR = yaml.safe_load((ROOT / "tools" / "overrides.yaml").read_text(encoding="utf-8")) or {}
STATUS = {"draft", "good", "solid"}


def s(t):
    out = cc.convert(t)
    for k, v in OVR.items():
        out = out.replace(cc.convert(k), v)
    return out


def check(L, f):
    err = []
    for k in ("id", "slug", "title", "title_en", "source", "status", "lines", "notes", "glossary"):
        if k not in L:
            err.append(f"missing {k}")
    if L.get("status") not in STATUS:
        err.append(f"status must be one of {STATUS}")
    n = len(L.get("lines", []))
    for x in L.get("notes", []):
        if not 0 <= x["line"] < n:
            err.append(f"note {x['n']}: line {x['line']} out of range")
        elif x["at"] not in L["lines"][x["line"]]["h"]:
            err.append(f"note {x['n']}: '{x['at']}' not in line {x['line']}")
    text = "".join(l["h"] for l in L.get("lines", []))
    for g in L.get("glossary", []):
        if g["w"] not in text:
            err.append(f"glossary {g['w']} not in text")
    if L.get("status") in ("good", "solid"):
        for g in L["glossary"]:
            if not set(g.get("checked") or []) & {"wikt", "cyz"}:
                err.append(f"status {L['status']} but {g['w']} not checked against wikt or cyz")
    todo = [g["w"] for g in L.get("glossary", []) if not g.get("checked")]
    if todo:
        print(f"{f.name}: unchecked glosses: {' '.join(todo)}")
    if err:
        sys.exit(f"{f.name}:\n  " + "\n  ".join(err))


def main():
    lessons = []
    for f in sorted((ROOT / "lessons").glob("*.yaml")):
        L = yaml.safe_load(f.read_text(encoding="utf-8"))
        check(L, f)
        L["title_s"] = s(L["title"])
        for l in L["lines"]:
            l["h_s"] = s(l["h"])
        for x in L["notes"]:
            x["at_s"] = s(x["at"])
        for g in L["glossary"]:
            g["w_s"] = s(g["w"])
        for e in L.get("exercise", []):
            e["h_s"] = s(e["h"])
        lessons.append(L)
    out = ROOT / "app" / "course.json"
    out.write_text(json.dumps({"lessons": lessons}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(lessons)} lesson(s) -> {out.relative_to(ROOT)}")
    # Single-file version (data inlined) for offline use / previews.
    page = (ROOT / "app" / "index.html").read_text(encoding="utf-8")
    data = json.dumps({"lessons": lessons}, ensure_ascii=False).replace("</", "<\\/")
    page = page.replace('<script id="course-data" type="application/json"></script>',
                        f'<script id="course-data" type="application/json">{data}</script>')
    (ROOT / "dist").mkdir(exist_ok=True)
    (ROOT / "dist" / "wenyan.html").write_text(page, encoding="utf-8")
    print("single file -> dist/wenyan.html")


if __name__ == "__main__":
    main()
