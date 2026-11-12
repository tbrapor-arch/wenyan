"""入門 track: a course from zero to NHSK 4, on the model of Tsheh-tû (STANDARDS.md §13).

Called by tools/build.py. Reads rumen/plan.yaml and rumen/NNN-*.yaml (simplified characters,
mainland standard), and for each lesson:

  - cuts every line into words, longest match on the NHSK list + the course's own words + names
    (a line's `cut` field overrides this, words separated by spaces);
  - splits the line's pinyin into syllables, gives one to each character and checks it against
    pypinyin's readings of that character (tone marks too; 一 and 不 may carry their spoken tone);
  - adds the traditional text (OpenCC s2t on the whole line, then cut at the same places);
  - checks that every word in the dialogue and exercises was taught in this lesson or before
    (names aside), that every new word is used, and counts the new words against the quota;
  - builds the word cards (`dict`): characters in both scripts, pinyin, NHSK level, our French and
    English, the lesson that teaches the word and the lessons that use it. Chinese words in the
    notes get a card too, so they can be tapped.

NHSK = HSK 3.0, syllabus of November 2025 (data/nhsk.tsv). HSK alone always means the 2012 HSK.
"""
import re, unicodedata
from pathlib import Path
import yaml
from opencc import OpenCC
from pypinyin import pinyin, Style
from pypinyin.pinyin_dict import pinyin_dict

ROOT = Path(__file__).resolve().parent.parent
s2t = OpenCC("s2t")
HAN = re.compile(r"[㐀-鿿豈-﫿\U00020000-\U0003ffff〇]")
HANRUN = re.compile(r"[㐀-鿿豈-﫿\U00020000-\U0003ffff〇]+")
GAP = "＿＿"
TOPICS = {"grammar", "vocab", "pron", "culture", "writing"}


def toneless(s):
    s = unicodedata.normalize("NFD", s.lower()).replace("ü", "v")
    return "".join(c for c in s if not unicodedata.combining(c))


SYL = {toneless(p) for v in pinyin_dict.values() for p in v.split(",")} - {"", "m", "n", "ng", "hm", "hng"} | {"r"}
# "r" is the 儿 of Beijing erhua: zhèr = 这 zhè + 儿 r


def split_syllables(word):
    """'Nǐhǎo' -> ['Nǐ', 'hǎo']: longest valid syllable first, backtracking until the word is used up."""
    word = unicodedata.normalize("NFC", word)
    flat = [toneless(c) for c in word]

    def go(i):
        if i == len(word):
            return []
        for j in range(min(len(word), i + 6), i, -1):
            if "".join(flat[i:j]) in SYL:
                rest = go(j)
                if rest is not None:
                    return [word[i:j]] + rest
        return None
    return go(0)


def py_syllables(py):
    """Syllables, each with what came before it in the source: '' (same word), "'" or ' ' (new word)."""
    out = []
    for chunk in re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*", unicodedata.normalize("NFC", py)):
        for pi, part in enumerate(re.split(r"['’]", chunk)):
            s = split_syllables(part)
            if s is None:
                raise ValueError(f"can't split '{part}' into pinyin syllables")
            out += [(x, "" if i else ("'" if pi else " ")) for i, x in enumerate(s)]
    return out


def join_py(sy):
    """A token's syllables, spaced as the line's pinyin spaces them (Wáng Xiǎoyǔ, but tóngshì)."""
    return "".join((sep if i else "") + x for i, (x, sep) in enumerate(sy))


class Rumen:
    def __init__(self, fail):
        self.fail = fail
        self.nhsk = {}
        for line in (ROOT / "data" / "nhsk.tsv").read_text(encoding="utf-8").splitlines()[2:]:
            s, t, py, lvl, en = line.split("\t")
            self.nhsk.setdefault(s, {"t": t, "py": py, "lvl": lvl, "en": en})
        self.plan = yaml.safe_load((ROOT / "rumen" / "plan.yaml").read_text(encoding="utf-8"))["lessons"]
        k = 0
        for p in self.plan:          # quota: 14 new words in the first text lesson, 32 in the last
            if not p.get("review"):
                p["zh_t"] = s2t.convert(p["zh"])
                k += 1
                p["quota"] = round(14 + 18 * (k - 1) / 85)
        self.quota = {p["id"]: p.get("quota", 0) for p in self.plan}
        self.dict, self.known, self.names = {}, set(), {}
        self.lex = set(self.nhsk)

    # ---------- words
    def cut(self, h, cut=None, lex=None):
        """Longest match. Lines are cut on the words taught so far (+ names), so an NHSK compound
        not taught yet (个人 in 几个人) can't swallow two taught words; notes are cut on all of NHSK."""
        lex = self.lex if lex is None else lex
        if cut:
            toks = cut.split()
            if "".join(toks) != h:
                raise ValueError(f"cut '{cut}' does not give back the line")
            return toks
        out, i = [], 0
        while i < len(h):
            if HAN.match(h[i]):
                for j in range(min(len(h), i + 8), i, -1):
                    if h[i:j] in lex or h[i:j] in self.names or j == i + 1:
                        out.append(h[i:j]); i = j; break
            else:
                j = i
                while j < len(h) and not HAN.match(h[j]):
                    j += 1
                out.append(h[i:j]); i = j
        return out

    def card(self, w, lesson):
        d = self.dict.get(w)
        if not d:
            n = self.nhsk.get(w, {})
            d = self.dict[w] = {"s": w, "t": n.get("t") or s2t.convert(w), "lvl": n.get("lvl"),
                                "py": n.get("py") or " ".join(x[0] for x in pinyin(w, style=Style.TONE)),
                                "auto": n.get("en", ""), "seen": []}
            if w in self.names:
                d.update(name=True, py=self.names[w]["py"], fr=self.names[w]["fr"], en=self.names[w]["en"])
        if lesson not in d["seen"]:
            d["seen"].append(lesson)
        return d

    def sentence(self, f, L, where, h, py, cut=None, check=True, intro=()):
        """Cut a sentence into tokens with their pinyin and traditional form."""
        try:
            words = self.cut(h, cut, self.known | set(intro))
        except ValueError as e:
            self.fail(f, f"{where}: {e}"); return []
        sy = []
        if py is not None:
            try:
                sy = py_syllables(py)
            except ValueError as e:
                self.fail(f, f"{where}: {e}"); return []
            nh = len(HAN.findall(h))
            if len(sy) != nh:
                self.fail(f, f"{where}: {nh} characters but {len(sy)} pinyin syllables ({' '.join(x for x, _ in sy)})"); return []
            for c, (s, _) in zip(HAN.findall(h), sy):
                reads = pinyin(c, style=Style.TONE, heteronym=True)[0]
                if (c == "儿") != (s == "r") and s == "r":
                    self.fail(f, f"{where}: erhua r on {c}, not on 儿")
                elif c == "儿" and s == "r":
                    pass
                elif toneless(s) not in {toneless(r) for r in reads}:
                    self.fail(f, f"{where}: {c} read '{s}', pypinyin knows {'/'.join(reads)}")
                elif s.lower() not in reads and toneless(s) != s.lower() and c not in "一不":
                    print(f"{f.name}: {where}: {c} '{s}'? pypinyin gives {'/'.join(reads)}")
        t = s2t.convert(h)
        if len(t) != len(h):
            self.fail(f, f"{where}: traditional form changes the length"); return []
        out, pos, k = [], 0, 0
        for w in words:
            tok = {"s": w, "t": t[pos:pos + len(w)]}
            pos += len(w)
            n = len(HAN.findall(w))
            if n:
                tok["p"] = join_py(sy[k:k + n]) if sy else ""
                k += n
                tok["k"] = w
                self.card(w, L["id"])
                if check and w not in self.names and w not in self.known and w not in intro:
                    self.warn.setdefault(w, []).append(where)
            out.append(tok)
        return out

    def note_text(self, txt, L):
        """French or English with Chinese words in it: every Han run is cut and gets cards."""
        for run in HANRUN.findall(txt or ""):
            for w in self.cut(run):
                self.card(w, L["id"])
        return s2t.convert(txt or "")

    # ---------- lessons
    def lesson(self, f, L):
        for k in ("id", "slug", "title", "title_py", "title_fr", "title_en", "status", "lines"):
            if k not in L:
                self.fail(f, f"missing {k}"); return
        review = L.get("kind") == "review"
        self.warn = {}
        for n in L.get("names", []):
            self.names[n["w"]] = n
        intro = {w["w"]: w for w in L.get("words", [])}
        if review and intro:
            self.fail(f, "a review lesson teaches no new words")
        self.lex |= set(intro) | set(self.names)
        for w in intro:
            if w in self.known:
                self.fail(f, f"word {w} was already taught")
        L["title_t"] = s2t.convert(L["title"])
        nlines = {l.get("n") for l in L["lines"]}
        for l in L["lines"]:
            for k in ("n", "h", "py", "fr", "en"):
                if k not in l:
                    self.fail(f, f"line {l.get('n')}: missing {k}")
            if "who" in l:
                l["who_t"] = s2t.convert(l["who"])
            l["toks"] = self.sentence(f, L, f"line {l['n']}", l["h"], l["py"], l.get("cut"), intro=intro)
        for x in L.get("notes", []):
            if x.get("line", 0) not in nlines | {0}:
                self.fail(f, f"note {x.get('n')}: no line {x.get('line')}")
            if x.get("topic") not in TOPICS:
                self.fail(f, f"note {x.get('n')}: topic must be one of {sorted(TOPICS)}")
            for k in ("fr", "en"):
                if k not in x:
                    self.fail(f, f"note {x.get('n')}: missing {k}")
                x[k + "_t"] = self.note_text(x.get(k), L)
        for r in L.get("recap", []):
            for k in ("fr", "en"):
                r[k + "_t"] = self.note_text(r.get(k), L)
        ex = L.get("exercise") or {}
        for i, e in enumerate(ex.get("translate", [])):
            e["toks"] = self.sentence(f, L, f"translate {i + 1}", e["h"], e.get("py"), intro=intro)
        for i, e in enumerate(ex.get("choose", [])):
            if GAP not in e["h"] or e["a"] not in e["opts"]:
                self.fail(f, f"choose {i + 1}: needs {GAP} in h and the answer among opts")
                continue
            full = e["h"].replace(GAP, e["a"])
            e["toks"] = self.sentence(f, L, f"choose {i + 1}", full, e.get("py"), intro=intro)
            e["h_t"] = s2t.convert(e["h"])
            e["opts_t"] = [s2t.convert(o) for o in e["opts"]]
        used = {t.get("k") for l in L["lines"] for t in l["toks"]}
        for w, x in intro.items():
            if w not in used:
                self.fail(f, f"new word {w} is not used in the dialogue as a word of its own")
            for k in ("fr", "en"):
                if k not in x:
                    self.fail(f, f"new word {w}: missing {k}")
            d = self.card(w, L["id"])
            n = self.nhsk.get(w, {})
            x.setdefault("py", n.get("py", ""))
            x["t"], x["lvl"] = d["t"], n.get("lvl")
            d.update(py=x["py"], fr=x["fr"], en=x["en"], first=L["id"])
            d.pop("auto", None)
        if self.warn:
            msg = "; ".join(f"{w} ({', '.join(v)})" for w, v in self.warn.items())
            (self.fail if L["status"] != "draft" else lambda f, m: print(f"{f.name}: {m}"))(f, f"not taught yet: {msg}")
        self.known |= set(intro)
        lv = {}
        for x in intro.values():
            lv[x["lvl"] or "–"] = lv.get(x["lvl"] or "–", 0) + 1
        print(f"入門 L{L['id']}: {len(intro)} new words (quota {self.quota.get(L['id'], '?')}) · "
              + " ".join(f"NHSK{k} {v}" if k != "–" else f"outside NHSK {v}" for k, v in sorted(lv.items())))

    def track(self, loaded):
        for f, L in sorted(loaded, key=lambda x: x[1]["id"]):
            self.lesson(f, L)
        notes = {(L["id"], x["n"]) for _, L in loaded for x in L.get("notes", [])}
        for f, L in loaded:            # "L2 n.3" in a note must point at a note that exists
            for x in L.get("notes", []) + L.get("recap", []):
                for m in re.finditer(r"(?<!文言 )(?<!白話 )\bL(\d+) n\.(\d+)", (x.get("fr") or "") + " " + (x.get("en") or "")):
                    if (int(m[1]), int(m[2])) not in notes:
                        self.fail(f, f"{m[0]} does not exist")
        cov = {}
        for w in self.known:
            lvl = self.nhsk.get(w, {}).get("lvl")
            if lvl in ("1", "2", "3", "4"):
                cov[lvl] = cov.get(lvl, 0) + 1
        tot = {}
        for v in self.nhsk.values():
            tot[v["lvl"]] = tot.get(v["lvl"], 0) + 1
        print("入門 NHSK coverage: " + " · ".join(f"NHSK{k} {cov.get(k, 0)}/{tot[k]}" for k in "1234"))
        for d in self.dict.values():
            if d.get("auto") == "":
                d.pop("auto")
        return {"plan": self.plan, "dict": self.dict, "nhsk_total": {k: tot[k] for k in "1234"}}
