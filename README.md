# Wenyan 文言

An Assimil-style course in **Classical Chinese**, taught entirely through real texts: fables
first (守株待兔, 自相矛盾, 揠苗助長…), then the 論語, 孟子, 莊子, 史記, the 詩經 and the 唐宋
masters. Each lesson has the text with its English translation side by side, numbered notes, a
glossary, and a short exercise built from other real sentences.

Traditional characters by default, with a one-click switch to simplified; Mandarin pinyin
throughout.

## Three tracks, one app

| Tab | Track | Folder | What |
|---|---|---|---|
| 文言 | Classical | `lessons/` | fables first, then the 論語 and on (STANDARDS §1–7) |
| 白話 | Modern prose | `baihua/` | the written language beyond the old HSK 5 (2012 lists), through public-domain essays and fiction (§11) |
| 成語 | Idioms | `chengyu/` | by modern frequency, twenty at a time (§10) |

Plus **設定** (script, pinyin, cover, night mode, progress file).

## Layout

```
lessons/NNN-slug.yaml   文言 lessons (schema in STANDARDS.md §2; kind: review for review lessons)
baihua/NNN-slug.yaml    白話 lessons (§11)
chengyu/NN-slug.yaml    成語 lessons (§10)
tools/build.py          validates everything, adds simplified forms → app/course.json + dist/wenyan.html
tools/smoke.py          clicks through the built app at phone and desktop width
tools/overrides.yaml    fixes for OpenCC in classical contexts
tools/fill_pinyin.py    pinyin for 成語 example sentences (+ tools/chengyu-pinyin-words.yaml)
data/chengyu-freq.tsv   22,029 成語 ranked by modern frequency (wordfreq) + classic-novel counts
app/index.html          the app (loads course.json)
dist/wenyan.html        single-file build (data inlined; opens offline)
```

```sh
pip install pyyaml opencc-python-reimplemented
python3 tools/build.py
python3 -m http.server -d app   # or just open dist/wenyan.html
python3 tools/smoke.py          # needs playwright
```

Tap a word for its gloss, a superscript number for its note, a reference (L3 n.5, 文言 L1 n.4) to
jump to that note. **Cover** blurs the translation the Assimil way: read the Chinese, then tap a
line to check. **Mark as done** ticks the lesson on its tile.

## Status

| # | Lesson | Source | Status |
|---|---|---|---|
| 1 | 守株待兔 | 韓非子·五蠹 | draft: 5 glosses await a Wiktionary check |
| 2 | 自相矛盾 | 韓非子·難一 | draft: 1 gloss pending |
| 3 | 揠苗助長 | 孟子·公孫丑上 | draft: 6 glosses pending |
| 4 | 刻舟求劍 | 呂氏春秋·察今 | draft: 1 gloss pending |
| 5 | 畫蛇添足 | 戰國策·齊策二 | draft: 3 glosses pending |
| 6 | 狐假虎威 | 戰國策·楚策一 | draft: 8 glosses pending; text and notes match 王力《古代漢語》 |
| 7 | 複習一 | review of 1–6 | draft |
| 白話 1 | 落花生 | 許地山, 1922 | draft: text compared with the edition by an automated reader; 38 glosses unchecked |
| 成語 1–10 | the 200 most frequent 成語 | wordfreq ranking | draft: every example and origin passes the private checker; example pinyin generated (AUTO) |

## License

Lessons, notes and translations: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Code: MIT. The classical texts themselves are public domain. See STANDARDS.md §6 for the sources
we use and the ones we never copy from.
