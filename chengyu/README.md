# 成語 module (public)

Lessons of 20 成語 each, in order of modern frequency (`data/chengyu-freq.tsv`), grouped by
pattern or theme inside each band of 100. Spec: `STANDARDS.md` §10.

Built with the rest of the course: `python3 tools/build.py` (the 成語 tab of the app). Example
pinyin: `python3 tools/fill_pinyin.py` (readings it gets wrong go in `tools/chengyu-pinyin-words.yaml`).

## Sources and credits

- Glosses, literal readings, notes and English translations: ours, CC BY-SA 4.0.
- Frequency: [wordfreq](https://github.com/rspeer/wordfreq) (Robyn Speer), data CC BY-SA 4.0;
  novel counts: our own, on public-domain texts.
- Example sentences: [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR) and
  [Chinese Wikipedia](https://zh.wikipedia.org) (CC BY-SA 4.0), article named in `src`. Script
  converted with OpenCC; a sentence trimmed by us is marked with …
- Origins: classical texts, public domain. Each one was checked against a dictionary
  (`checked: moe` = 教育部《成語典》, `dcd` = 中国成语大辞典), but no dictionary text is copied.
