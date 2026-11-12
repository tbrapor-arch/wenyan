#!/usr/bin/env python3
"""Add pinyin to 成語 example sentences that don't have one yet (chengyu/*.yaml, `ex.py`).

- Syllables are separated by spaces, as in the reading lessons; known names are joined and
  capitalised. Readings come from pypinyin's phrase dictionary, with particles (的 地 得 了 着…)
  set to the neutral tone when they stand alone.
- The 成語 itself takes the item's checked reading (`py`), so only the rest is automatic.
- Tones are citation tones (no 一/不 sandhi), as everywhere in Wenyan.
- Every generated line is marked `py_auto: true` until someone checks it; remove the flag after
  checking. Existing `py` values are never overwritten.

Usage: python3 tools/fill_pinyin.py [--force]
"""
import re, sys
from pathlib import Path
import opencc, yaml
from pypinyin import pinyin, Style
from pypinyin.seg.mmseg import seg

ROOT = Path(__file__).resolve().parent.parent
t2s = opencc.OpenCC("t2s")
PUNCT = {"，": ",", "。": ".", "！": "!", "？": "?", "、": ",", "：": ":", "；": ";",
         "“": "“", "”": "”", "「": "“", "」": "”", "『": "‘", "』": "’",
         "《": "«", "》": "»", "（": "(", "）": ")", "…": "…", "—": "—", "·": "·"}
OPEN = set("“‘«(")
# particles that stand alone after segmentation: neutral tone
NEUTRAL = {"的": "de", "地": "de", "得": "de", "了": "le", "着": "zhe", "吗": "ma", "呢": "ne",
           "吧": "ba", "啊": "a", "们": "men", "著": "zhe"}
# transliterated names common in Tatoeba: one word, capitalised
NAMES = {"汤姆": "Tāngmǔ", "玛丽": "Mǎlì", "约翰": "Yuēhàn", "吉姆": "Jímǔ", "东京": "Dōngjīng",
         "日本": "Rìběn", "中国": "Zhōngguó", "法国": "Fǎguó", "德语": "Déyǔ", "法语": "Fǎyǔ",
         "日语": "Rìyǔ", "汉语": "Hànyǔ", "英国": "Yīngguó", "美国": "Měiguó"}


WORDS = dict(NAMES)
_wf = ROOT / "tools" / "chengyu-pinyin-words.yaml"
if _wf.exists():
    WORDS.update(yaml.safe_load(_wf.read_text(encoding="utf-8")) or {})
CITATION = {"一": "yī", "不": "bù"}          # no tone sandhi in Wenyan


def sentence_py(h, w, w_py):
    """Syllables separated by spaces (as in the reading lessons); names joined and capitalised."""
    s = t2s.convert(h)
    n = [0]
    def curly(m):
        n[0] += 1
        return "\u201c" if n[0] % 2 else "\u201d"
    s = re.sub('"', curly, s)                                   # ASCII quotes → curly pairs
    key = t2s.convert(w)
    protect = [key] + sorted(WORDS, key=len, reverse=True)
    pat = re.compile("(" + "|".join(map(re.escape, protect)) + ")")
    tokens = []
    for part in pat.split(s):
        if not part:
            continue
        if part == key:
            tokens.append(("zh", w_py))
            continue
        if part in WORDS:
            tokens.append(("zh", WORDS[part]))
            continue
        if tokens and tokens[-1][1] == w_py and part[0] in "地得的":     # 成語 + 地/得/的
            tokens.append(("zh", "de"))
            part = part[1:]
            if not part:
                continue
        for run in re.findall(r"[\u3400-\u9fff]+|[^\u3400-\u9fff]+", part):
            if re.fullmatch(r"[\u3400-\u9fff]+", run):
                syl = [x[0] for x in pinyin(run, style=Style.TONE)]     # context-aware readings
                single = set()
                i = 0
                for word in seg.cut(run):                                # which chars stand alone
                    if len(word) == 1:
                        single.add(i)
                    i += len(word)
                for i, ch in enumerate(run):
                    if ch in CITATION:
                        syl[i] = CITATION[ch]
                    elif i in single and ch in NEUTRAL:
                        syl[i] = NEUTRAL[ch]
                tokens.append(("zh", " ".join(syl)))
            else:
                for t in re.findall(r"[A-Za-z0-9][A-Za-z0-9'\-.]*|\s+|.", run):
                    if t.strip() == "":
                        continue
                    if t in PUNCT or t in ",.!?:;\"'()":
                        tokens.append(("p", PUNCT.get(t, t)))
                    else:
                        tokens.append(("lat", t))
    text = ""
    for kind, v in tokens:
        if kind == "p":
            if v[0] in OPEN:
                text += (" " if text and not text.endswith(" ") else "") + v
            else:
                text = text.rstrip() + v + " "
        else:
            if text and not text.endswith((" ",) + tuple(OPEN)):
                text += " "
            text += v
    text = re.sub(r"\s+", " ", text).strip()
    # capital at the start and after . ! ? (also just inside an opening quote)
    return re.sub(r"(^|[.!?…]\s+)([\u201c\u2018\u00ab(]?)(\w)",
                  lambda m: m.group(1) + m.group(2) + m.group(3).upper(), text)


def main():
    force = "--force" in sys.argv
    for f in sorted((ROOT / "chengyu").glob("[0-9]*.yaml")):
        src = f.read_text(encoding="utf-8")
        d = yaml.safe_load(src)
        n = 0
        for it in d["items"]:
            ex = it.get("ex")
            if not ex or (ex.get("py") and not force):
                continue
            py = sentence_py(ex["h"], it["w"], it["py"]).replace("\\", "\\\\").replace('"', '\\"')
            # insert into the flow mapping right after the h: value
            hq = ex["h"].replace("\\", "\\\\").replace('"', '\\"')
            pat = re.compile(r"(ex: \{h: \"?" + re.escape(hq) + r"\"?, )(py: \".*?\", py_auto: true, )?")
            src, k = pat.subn(lambda m: m.group(1) + f'py: "{py}", py_auto: true, ', src, count=1)
            n += k
        yaml.safe_load(src)                      # refuse to write a broken file
        f.write_text(src, encoding="utf-8")
        print(f"{f.name}: {n} sentences")


if __name__ == "__main__":
    main()
