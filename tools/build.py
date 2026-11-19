#!/usr/bin/env python3
"""Build app/course.json and the app (app/dist/index.html, dist/wenyan.html) from the four tracks.

  lessons/*.yaml   文言  classical reading lessons   (STANDARDS.md §2)
  baihua/*.yaml    白話  modern written Chinese      (STANDARDS.md §11)
  chengyu/*.yaml   成語  frequency-ordered idioms    (STANDARDS.md §10)
  rumen/*.yaml     入門  from zero to NHSK 4          (STANDARDS.md §13, tools/rumen.py)

Adds simplified forms (field + "_s") with OpenCC t2s, applying tools/overrides.yaml afterwards,
and validates every lesson. Cross-references ("文言 L1 n.4", "L3 n.5") must point at a note
that exists; exercise sentences with a `ref` must be lines of the lesson they name.

  pip install -r requirements.txt
  make app      (python3 -I tools/build.py)
  make test     (python3 -I tools/build.py --check: validate only, write nothing)

The page itself is joined by tools/build_app.py from app/index.template.html and app/src/.
"""
import json, re, sys
from pathlib import Path
import yaml
from opencc import OpenCC
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rumen import Rumen
import build_app
import zh_words

ROOT = Path(__file__).resolve().parent.parent
cc = OpenCC("t2s")
tw = OpenCC("s2tw")      # 成語 example sentences are stored as found; this gives their traditional form
OVR = yaml.safe_load((ROOT / "tools" / "overrides.yaml").read_text(encoding="utf-8")) or {}
STATUS = {"draft", "good", "solid"}
TRACKS = [
    {"key": "rumen", "dir": "rumen", "zh": "入門", "en": "Start",
     "about": "Mandarin from zero, the Assimil way: 100 lessons that follow Marc through a year in Beijing, "
              "up to NHSK 4 (2,000 words). Explanations in French or English."},
    {"key": "wenyan", "dir": "lessons", "zh": "文言", "en": "Classical",
     "about": "Classical Chinese through real texts: fables first, then the 論語, argument, narrative and verse."},
    {"key": "baihua", "dir": "baihua", "zh": "白話", "en": "Modern prose",
     "about": "The written language beyond HSK 5 (the 2012 level, 2,500 words): "
              "public-domain essays and fiction, read for the literary words that textbooks stop before."},
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
    files = sorted((ROOT / d).glob("[0-9]*.yaml")) if (ROOT / d).is_dir() else []
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
    for g in L["glossary"]:
        if "hsk" in g and g["hsk"] not in range(1, 7):
            fail(f, f"glossary {g['w']}: hsk must be an HSK (2012) level 1–6")
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
    for fr in L.get("frames", []):
        fr["f_s"] = s(fr["f"])
        fr["ex_s"] = [s(x) for x in fr.get("ex", [])]
    for it in L["items"]:
        for k in ("w", "py", "lit", "en", "ex"):
            if k not in it:
                fail(f, f"item {it.get('w', '?')}: missing {k}")
        if "w" in it:
            it["w_s"] = s(it["w"])
        if it.get("origin"):
            it["origin"]["text_s"] = s(it["origin"]["text"])
        ex = it.get("ex")
        if ex:
            for k in ("h", "src", "en"):
                if k not in ex:
                    fail(f, f"item {it['w']}: example missing {k}")
            ex["h_t"], ex["h_s"] = tw.convert(ex.get("h", "")), cc.convert(ex.get("h", ""))
            if ex["h_s"].find(cc.convert(it.get("w", ""))) < 0:
                fail(f, f"item {it['w']}: the example does not contain the 成語")


HAN_RUN = re.compile(r"[㐀-鿿豈-﫿\U00020000-\U0003134f]")
s2t = OpenCC("s2tw")
# Paths (track.key.key…, lists skipped) of the texts shown one character at a time: classical Chinese (STANDARDS §2),
# the classical sentences behind 白話 words ("Roots") and the classical origin of a 成語. Everything else is cut into words.
CLASSICAL = re.compile(r"^wenyan\.|^baihua\.lessons\.exercise\.|^chengyu\.lessons\.items\.origin\.text")
# Course words (glossaries, 成語, 入門 word cards): in the table even where the cut does not find them, so a curated
# card can show the automatic layer too (dictExtra in app/src/dict.js); a word CC-CEDICT lacks gets its parts.
WORDS = re.compile(r"^(wenyan|baihua)\.lessons\.glossary\.w(_s)?$|^chengyu\.lessons\.items\.w(_s)?$|"
                   r"^rumen\.lessons\.(words\.(w|t)|names\.w)$|^rumen\.dict\.[^.]+\.(s|t)$")
SKIP = re.compile(r"\.(py|py_tw|title_py|ref|slug|status|checked|key)$")


def zh_texts(course):
    """every Chinese text the app shows -> (modern texts, classical texts, course words), each text also in the other
    script (the app shows both; a derived field may be missing)"""
    modern, classical, words = {}, {}, {}
    def walk(o, path):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{path}.{k}")
        elif isinstance(o, list):
            for v in o:
                walk(v, path)
        elif isinstance(o, str) and HAN_RUN.search(o) and not SKIP.search(path):
            if WORDS.search(path):
                words[o] = 1
            (classical if CLASSICAL.search(path) else modern)[o] = 1
    for t in course["tracks"]:
        walk(t, t["key"])
    # 入門 multiple choice: the app cuts the question once, whole, with the answer in the gap (chooseFull in
    # app/src/rumen.js), so that full sentence is the text checked
    for L in course["tracks"][0]["lessons"]:
        for e in (L.get("exercise") or {}).get("choose", []):
            for h, opts in ((e["h"], e["opts"]), (e.get("h_t"), e.get("opts_t"))):
                if h and opts:
                    modern[h.replace("＿＿", opts[e["opts"].index(e["a"])])] = 1
    for d in (modern, classical, words):
        for x in list(d):
            for y in (s(x), cc.convert(x), s2t.convert(x)):
                d.setdefault(y, 1)
    return list(modern), list(classical), list(words)


def zh_table(course, write=True):
    """the dictionary of the app's Chinese (tools/zh_words.py): DATA.zh, zhx, zhqt, zhm, zhp; fails when the browser's
    cut would differ from the build's"""
    gone = zh_words.missing()
    if gone:
        sys.exit("make app needs the dictionary sources: " + ", ".join(gone) + " are missing. Run `make data` first "
                 "(downloads CC-CEDICT, jieba and complete-hsk-vocabulary into data/raw).")
    modern, classical, words = zh_texts(course)
    lex = zh_words.Lexicon()
    for t in modern:
        lex.add(t)
    for t in classical:
        lex.add(t, classical=True)
    for w in words:
        lex.add_word(w)
    course["zh"], course["zhx"], course["zhqt"] = lex.table(), lex.exceptions(), zh_words.model().QT
    course["zhm"], course["zhp"] = lex.meta(), lex.parts()
    cl = set(classical)
    bad = zh_words.check(modern + classical, course["zh"], course["zhx"], cl - set(modern)) \
        + zh_words.check([t for t in classical if t in modern], course["zh"], course["zhx"], cl)
    kb = lambda o: len(json.dumps(o, ensure_ascii=False).encode()) // 1024
    print(f"dictionary: {len(course['zh'])} words ({kb(course['zh'])} KB), readings set by the sentence in "
          f"{len(course['zhx'])} runs ({kb(course['zhx'])} KB), meta {kb(course['zhm'])} KB, {len(course['zhp'])} "
          f"course words shown as parts; {len(modern)} modern + {len(classical)} classical texts; "
          f"{bad} shown differently by the browser")
    if bad:
        sys.exit("zh_words: the browser would cut or read some texts differently (see above)")
    zh_check_js(course, modern, classical)
    if not write:
        return
    (ROOT / "data" / "build").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "build" / "zh-texts.json").write_text(json.dumps({"modern": modern, "classical": classical},
                                                                     ensure_ascii=False), encoding="utf-8")


def zh_check_js(course, modern, classical):
    """run app/src/dict.js's own zhCut in Node on every text and compare with the build (skipped without node)"""
    import shutil, subprocess
    node = shutil.which("node")
    if not node:
        print("dictionary: no node on PATH, the check of app/src/dict.js itself is skipped (the Python one ran)")
        return
    want = {"m": [[t, zh_words.analyse(t)] for t in modern], "c": [[t, zh_words.analyse(t, True)] for t in classical]}
    data = {k: course[k] for k in ("zh", "zhx", "zhqt", "zhm", "zhp")}
    js = (ROOT / "app" / "src" / "dict.js").read_text(encoding="utf-8")
    prog = """
const fs = require("fs"), inp = JSON.parse(fs.readFileSync(0, "utf8"));
const course = inp.data, esc = t => String(t ?? ""), $ = () => null, $$ = () => [];
const document = {addEventListener(){}};
""" + js + """
const norm = c => c.map(t => typeof t === "string" ? t : [t[0], t[1] || null]);
let bad = 0;
for (const [k, cl] of [["m", false], ["c", true]]) for (const [t, want] of inp.want[k]) {
  if (JSON.stringify(norm(zhCut(t, cl))) !== JSON.stringify(want)) { if (++bad <= 5) console.log("differs: " + t.slice(0, 60)); }
}
console.log(bad);
"""
    r = subprocess.run([node, "-e", prog], input=json.dumps({"data": data, "want": want}, ensure_ascii=False),
                       capture_output=True, text=True, encoding="utf-8")
    out = r.stdout.strip().splitlines()
    if r.returncode or not out or out[-1] != "0":
        sys.exit("dictionary: app/src/dict.js cuts or reads texts differently from the build\n" + r.stdout + r.stderr)
    print(f"dictionary: app/src/dict.js (Node) cuts and reads all {len(modern) + len(classical)} texts as the build")


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
    rumen = Rumen(fail).track(loaded["rumen"])
    if errors:
        sys.exit("\n".join(errors))
    check = "--check" in sys.argv
    if check:
        print("check: ok")
        # make test: also the browser's own cut (app/src/dict.js in Node) when Node and the dictionary sources are here
        import shutil
        if not shutil.which("node") or zh_words.missing():
            print("check: no node or no data/raw, the browser cut check is skipped (make app runs it)")
            return
    for key in ("wenyan", "baihua"):
        for _, L in loaded[key]:
            simp_reading(L)

    course = {"tracks": [{"key": t["key"], "zh": t["zh"], "en": t["en"], "about": t["about"],
                          "lessons": sorted((L for _, L in loaded[t["key"]]), key=lambda L: L["id"])}
                         for t in TRACKS]}
    course["tracks"][0].update(rumen)
    # The dictionary: every Chinese text of the app made tappable (tools/zh_words.py, app/src/dict.js).
    zh_table(course, write=not check)
    if check:
        return
    out = ROOT / "app" / "course.json"
    out.write_text(json.dumps(course, ensure_ascii=False, indent=1), encoding="utf-8")
    print(" · ".join(f"{t['zh']} {len(t['lessons'])}" for t in course["tracks"]), f"-> {out.relative_to(ROOT)}")
    # Single-file version (data inlined): opens offline, and is what gets shared and served.
    build_app.build(course)


if __name__ == "__main__":
    main()
