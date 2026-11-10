# Wenyan 文言

An Assimil-style course in **Classical Chinese**, taught entirely through real texts: fables
first (守株待兔, 自相矛盾, 揠苗助長…), then the 論語, 孟子, 莊子, 史記, the 詩經 and the 唐宋
masters. Each lesson has the text with its English translation side by side, numbered notes, a
glossary, and a short exercise built from other real sentences.

Traditional characters by default, with a one-click switch to simplified; Mandarin pinyin
throughout.

## Layout

```
lessons/NNN-slug.yaml   one lesson per file (schema in STANDARDS.md §2; kind: review for review lessons)
tools/build.py          validates lessons, adds simplified forms → app/course.json + dist/wenyan.html
tools/overrides.yaml    fixes for OpenCC in classical contexts
app/index.html          the reader (loads course.json)
dist/wenyan.html        single-file build (data inlined; opens offline)
```

```sh
pip install pyyaml opencc-python-reimplemented
python3 tools/build.py
python3 -m http.server -d app   # or just open dist/wenyan.html
```

In the reader: tap a character for its gloss, tap a superscript number to open its note. In review
lessons, tap a reference (L3 n.5) to jump to that note.
**Cover** blurs the translation the Assimil way: read the Chinese, then tap a line to check.

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

## License

Lessons, notes and translations: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Code: MIT. The classical texts themselves are public domain. See STANDARDS.md §6 for the sources
we use and the ones we never copy from.
