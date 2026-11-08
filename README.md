# Wenyan 文言

An Assimil-style course in **Classical Chinese**, taught entirely through real texts: fables
first (守株待兔, 自相矛盾, 揠苗助長…), then the 論語, 孟子, 莊子, 史記, the 詩經 and the 唐宋
masters. Each lesson has the text with its English translation side by side, numbered notes, a
glossary, and a short exercise built from other real sentences.

Traditional characters by default, with a one-click switch to simplified; Mandarin pinyin
throughout.

## Layout

```
lessons/NNN-slug.yaml   one lesson per file (schema in STANDARDS.md §2)
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

In the reader: tap a character for its gloss, tap a superscript number to jump to its note.
**Cover** blurs the translation the Assimil way: read the Chinese, then tap a line to check.

## Status

| # | Lesson | Source | Status |
|---|---|---|---|
| 1 | 守株待兔 | 韓非子·五蠹 | draft (5 glosses awaiting a Wiktionary check) |

## License

Lessons, notes and translations: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Code: MIT. The classical texts themselves are public domain. See STANDARDS.md §6 for the sources
we use and the ones we never copy from.
