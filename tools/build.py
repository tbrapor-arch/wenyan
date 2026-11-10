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


def check_review(L, f, by_id):
    """Review lessons: every ref must point at an existing note, every example must be real text."""
    import re
    err = []
    for k in ("id", "slug", "title", "title_en", "status", "recap", "exercise"):
        if k not in L:
            err.append(f"missing {k}")
    for r in L.get("recap", []):
        for ref in r.get("refs", []):
            m = re.fullmatch(r"L(\d+) n\.(\d+)", ref)
            if not m:
                err.append(f"{r['topic']}: bad ref {ref!r} (use 'L3 n.5')")
                continue
            T = by_id.get(int(m[1]))
            if not T or not any(n["n"] == int(m[2]) for n in T.get("notes", [])):
                err.append(f"{r['topic']}: {ref} does not exist")
        earlier = "".join(l["h"] for i, T in by_id.items() if i < L["id"] for l in T.get("lines", []))
        for ex in r.get("examples", []):
            if ex not in earlier:
                err.append(f"{r['topic']}: example {ex} not found in earlier lessons")
    if err:
        sys.exit(f"{f.name}:\n  " + "\n  ".join(err))


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
    files = sorted((ROOT / "lessons").glob("*.yaml"))
    loaded = [(f, yaml.safe_load(f.read_text(encoding="utf-8"))) for f in files]
    by_id = {L["id"]: L for _, L in loaded}
    for f, L in loaded:
        if L.get("kind") == "review":
            check_review(L, f, by_id)
            L["title_s"] = s(L["title"])
            for r in L["recap"]:
                r["examples_s"] = [s(x) for x in r.get("examples", [])]
            for e in L["exercise"]:
                e["h_s"] = s(e["h"])
            lessons.append(L)
            continue
        check(L, f)
        L["title_s"] = s(L["title"])
        L["source"]["work_s"] = s(L["source"]["work"])
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
