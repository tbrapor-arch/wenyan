#!/usr/bin/env python3
"""Build app/course.json and dist/wenyan.html from the three tracks.

  lessons/*.yaml   文言  classical reading lessons   (STANDARDS.md §2)
  baihua/*.yaml    白話  modern written Chinese      (STANDARDS.md §11)
  chengyu/*.yaml   成語  frequency-ordered idioms    (STANDARDS.md §10)

Adds simplified forms (field + "_s") with OpenCC t2s, applying tools/overrides.yaml afterwards,
and validates every lesson. Cross-references ("文言 L1 n.4", "L3 n.5") must point at a note
that exists; exercise sentences with a `ref` must be lines of the lesson they name.

  pip install pyyaml opencc-python-reimplemented
  python3 tools/build.py
"""
import json, re, sys
from pathlib import Path
import yaml
from opencc import OpenCC

ROOT = Path(__file__).resolve().parent.parent
cc = OpenCC("t2s")
OVR = yaml.safe_load((ROOT / "tools" / "overrides.yaml").read_text(encoding="utf-8")) or {}
STATUS = {"draft", "good", "solid"}
TRACKS = [
    {"key": "wenyan", "dir": "lessons", "zh": "文言", "en": "Classical",
     "about": "Classical Chinese through real texts: fables first, then the 論語, argument, narrative and verse."},
    {"key": "baihua", "dir": "baihua", "zh": "白話", "en": "Modern prose",
     "about": "The written language beyond HSK 5: public-domain essays and fiction, read for the "
              "literary words that textbooks stop before."},
    {"key": "chengyu", "dir": "chengyu", "zh": "成語", "en": "Idioms",
     "about": "成語 in order of modern frequency, twenty at a time, grouped by pattern."},
]
REF = re.compile(r"(?:(文言|白話) )?L(\d+) n\.(\d+)")
errors = []


def s(t):
    out = cc.convert(t)
    for k, v in OVR.items():
        out = out.replace(cc.convert(k), v)
    return out


def fail(f, msg):
    errors.append(f"{f.name}: {msg}")


def load(d):
    files = sorted((ROOT / d).glob("*.yaml")) if (ROOT / d).is_dir() else []
    return [(f, yaml.safe_load(f.read_text(encoding="utf-8"))) for f in files]


def check_refs(text, own, f, where, tracks):
    """Every 'L3 n.5' / '文言 L3 n.5' in a note or recap must exist."""
    names = {"文言": "wenyan", "白話": "baihua"}
    for m in REF.finditer(text or ""):
        T = tracks[names.get(m[1], own)].get(int(m[2]))
        if not T or not any(n["n"] == int(m[3]) for n in T.get("notes", [])):
            fail(f, f"{where}: {m[0]} does not exist")


def check_reading(L, f, need_py):
    for k in ("id", "slug", "title", "title_en", "source", "status", "lines", "notes", "glossary"):
        if k not in L:
            fail(f, f"missing {k}")
            return
    if L["status"] not in STATUS:
        fail(f, f"status must be one of {sorted(STATUS)}")
    n = len(L["lines"])
    for i, l in enumerate(L["lines"]):
        if "h" not in l or "en" not in l or (need_py and "py" not in l):
            fail(f, f"line {i}: needs h, en" + (", py" if need_py else ""))
    for x in L["notes"]:
        if not 0 <= x["line"] < n:
            fail(f, f"note {x['n']}: line {x['line']} out of range")
        elif x["at"] not in L["lines"][x["line"]]["h"]:
            fail(f, f"note {x['n']}: '{x['at']}' not in line {x['line']}")
    text = "".join(l["h"] for l in L["lines"])
    for g in L["glossary"]:
        if g["w"] not in text:
            fail(f, f"glossary {g['w']} not in text")
    if L["status"] in ("good", "solid"):
        for g in L["glossary"]:
            if not set(g.get("checked") or []) & {"wikt", "cyz"}:
                fail(f, f"status {L['status']} but {g['w']} not checked against wikt or cyz")
    todo = [g["w"] for g in L["glossary"] if not g.get("checked")]
    if todo:
        print(f"{f.name}: {len(todo)} unchecked gloss(es): {' '.join(todo)}")


def check_review(L, f, by_id):
    for k in ("id", "slug", "title", "title_en", "status", "recap", "exercise"):
        if k not in L:
            fail(f, f"missing {k}")
            return
    earlier = "".join(l["h"] for i, T in by_id.items() if i < L["id"] for l in T.get("lines", []))
    for r in L["recap"]:
        for ref in r.get("refs", []):
            if not re.fullmatch(r"L\d+ n\.\d+", ref):
                fail(f, f"{r['topic']}: bad ref {ref!r} (use 'L3 n.5')")
        for ex in r.get("examples", []):
            if ex not in earlier:
                fail(f, f"{r['topic']}: example {ex} not found in earlier lessons")


def resolve_exercise(e, f, tracks):
    """`ref: 文言 L2` = the sentence is a run of lines of that lesson: check it, borrow py / en."""
    m = re.fullmatch(r"(文言|白話) L(\d+)", e.get("ref", ""))
    if not m:
        fail(f, f"exercise {e.get('h')}: bad ref {e.get('ref')!r} (use '文言 L2')")
        return
    T = tracks[{"文言": "wenyan", "白話": "baihua"}[m[1]]].get(int(m[2]))
    lines = (T or {}).get("lines", [])
    bare = lambda t: re.sub("[「」『』]", "", t)  # a quoted line is the same sentence without its quotes
    unq = lambda t: t.strip('"')
    for a in range(len(lines)):
        for b in range(a + 1, len(lines) + 1):
            if bare("".join(l["h"] for l in lines[a:b])) == bare(e["h"]):
                e.setdefault("py", " ".join(l["py"] for l in lines[a:b] if l.get("py")))
                e.setdefault("en", unq(" ".join(l["en"] for l in lines[a:b])))
                e.setdefault("src", f"{T['source']['work']} · {m[0]}")
                e["to"] = {"track": {"文言": "wenyan", "白話": "baihua"}[m[1]], "id": int(m[2])}
                return
    fail(f, f"exercise {e['h']}: not a run of lines of {m[0]}")


def simp_reading(L):
    L["title_s"] = s(L["title"])
    if L.get("kind") == "review":
        for r in L["recap"]:
            r["examples_s"] = [s(x) for x in r.get("examples", [])]
    else:
        L["source"]["work_s"] = s(L["source"]["work"])
        for l in L["lines"]:
            l["h_s"] = s(l["h"])
        for x in L["notes"]:
            x["at_s"] = s(x["at"])
        for g in L["glossary"]:
            g["w_s"] = s(g["w"])
    for e in L.get("exercise", []):
        e["h_s"] = s(e["h"])


def check_chengyu(L, f):
    for k in ("id", "slug", "title", "title_en", "status", "items"):
        if k not in L:
            fail(f, f"missing {k}")
            return
    L["title_s"] = s(L["title"])
    for it in L["items"]:
        for k in ("w", "py", "en"):
            if k not in it:
                fail(f, f"item {it.get('w', '?')}: missing {k}")
        if "w" in it:
            it["w_s"] = s(it["w"])


def main():
    loaded = {t["key"]: load(t["dir"]) for t in TRACKS}
    tracks = {k: {L["id"]: L for _, L in v} for k, v in loaded.items()}
    for key in ("wenyan", "baihua"):
        for f, L in loaded[key]:
            if L.get("kind") == "review":
                check_review(L, f, tracks[key])
                for r in L.get("recap", []):
                    for ref in r.get("refs", []):
                        check_refs(ref, key, f, r.get("topic", "recap"), tracks)
            else:
                check_reading(L, f, need_py=key == "wenyan")
                for x in L.get("notes", []):
                    check_refs(x.get("text"), key, f, f"note {x.get('n')}", tracks)
            for e in L.get("exercise", []):
                if "ref" in e:
                    resolve_exercise(e, f, tracks)
                for k in ("h", "src", "en"):
                    if k not in e:
                        fail(f, f"exercise {e.get('h', '?')}: missing {k}")
    for f, L in loaded["chengyu"]:
        check_chengyu(L, f)
    if errors:
        sys.exit("\n".join(errors))
    for key in ("wenyan", "baihua"):
        for _, L in loaded[key]:
            simp_reading(L)

    course = {"tracks": [{"key": t["key"], "zh": t["zh"], "en": t["en"], "about": t["about"],
                          "lessons": sorted((L for _, L in loaded[t["key"]]), key=lambda L: L["id"])}
                         for t in TRACKS]}
    out = ROOT / "app" / "course.json"
    out.write_text(json.dumps(course, ensure_ascii=False, indent=1), encoding="utf-8")
    print(" · ".join(f"{t['zh']} {len(t['lessons'])}" for t in course["tracks"]), f"-> {out.relative_to(ROOT)}")
    # Single-file version (data inlined): opens offline, and is what gets shared.
    page = (ROOT / "app" / "index.html").read_text(encoding="utf-8")
    slot = '<script id="course-data" type="application/json"></script>'
    assert slot in page, "app/index.html lost its course-data slot"
    data = json.dumps(course, ensure_ascii=False).replace("</", "<\\/")
    (ROOT / "dist").mkdir(exist_ok=True)
    (ROOT / "dist" / "wenyan.html").write_text(
        page.replace(slot, f'<script id="course-data" type="application/json">{data}</script>'), encoding="utf-8")
    print("single file -> dist/wenyan.html")


if __name__ == "__main__":
    main()
