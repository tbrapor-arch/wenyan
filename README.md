# Wenyan 文言

An Assimil-style course in **Classical Chinese**, taught entirely through real texts: fables
first (守株待兔, 自相矛盾, 揠苗助長…), then the 論語, 孟子, 莊子, 史記, the 詩經 and the 唐宋
masters. Each lesson has the text with its English translation side by side, numbered notes, a
glossary, and a short exercise built from other real sentences.

Traditional characters by default, with a one-click switch to simplified; Mandarin pinyin
throughout.

## Four tracks, one app

| Tab | Track | Folder | What |
|---|---|---|---|
| 入門 | Start | `rumen/` | Mandarin from zero to NHSK 4, 100 Assimil-style dialogue lessons, notes in French or English (§13) |
| 文言 | Classical | `lessons/` | fables first, then the 論語 and on (STANDARDS §1–7) |
| 白話 | Modern prose | `baihua/` | the written language beyond HSK 5 (2012 lists), through public-domain essays and fiction (§11) |
| 成語 | Idioms | `chengyu/` | by modern frequency, twenty at a time (§10) |

HSK = the 2012 test, NHSK = HSK 3.0 (2025 syllabus); never "old" or "new".

Plus **設定** (script, pinyin, cover, 入門 language, night mode, progress file, sync between devices).

## Layout

```
rumen/plan.yaml         入門: the 100 planned lessons (§13)
rumen/NNN-slug.yaml     入門 lessons (§13)
lessons/NNN-slug.yaml   文言 lessons (schema in STANDARDS.md §2; kind: review for review lessons)
baihua/NNN-slug.yaml    白話 lessons (§11)
chengyu/NN-slug.yaml    成語 lessons (§10)

tools/build.py          validates everything, adds simplified forms, builds the dictionary table → app/course.json
tools/build_app.py      joins app/index.template.html + app/src/ (order: PARTS) → app/dist/index.html + dist/wenyan.html
tools/zh_words.py       the dictionary: cuts every Chinese text of the app into words, reads them, builds the table
                        the page carries (Tsheh-tû's port of the Shūjià reader's model; python3 -I tools/zh_words.py 句子)
tools/rumen.py          入門: word cut, pinyin check, NHSK counts, word cards
tools/rumen_quote.py    入門: quotes one-line YAML values (French « : » breaks plain YAML)
tools/overrides.yaml    fixes for OpenCC in classical contexts
tools/fill_pinyin.py    pinyin for 成語 example sentences (+ tools/chengyu-pinyin-words.yaml)
tools/site.py           the published site in _site/: CSP, manifest, icons, service worker
tools/make_icons.py     draws the icons in app/pwa/
tools/smoke.py          clicks through the built app at phone and desktop width, taps dictionary words
tools/smoke_services.py tests the published site: offline, CSP, single file, sync and module loader (fake GitHub API)

app/index.template.html the page skeleton
app/src/                the app's CSS and JS, one concern per part (app/src/README.md)
app/pwa/                manifest, offline service worker, icons
docs/sync-and-private-module.md  offline app, sync between devices, the private-module contract

data/nhsk.tsv           NHSK word list (HSK 3.0, 2025 syllabus)
data/chengyu-freq.tsv   22,029 成語 ranked by modern frequency (wordfreq) + classic-novel counts
data/fetch.sh           downloads CC-CEDICT, jieba and HSK lists into data/raw (make data)

built, never committed: app/course.json, app/dist/index.html (single file, data and dictionary inlined),
dist/wenyan.html (the same file, opens offline), _site/ (what GitHub Pages serves), data/raw/, data/build/
```

```sh
pip install -r requirements.txt
make data      # download the dictionary sources into data/raw (needs npm, curl, git); make app runs it first
make app       # validate, build the dictionary and app/dist/index.html (python3 -I tools/build.py)
make test      # validate only
make site      # the published site in _site/ (CSP, manifest, icons, service worker)
make smoke     # make site, then tools/smoke.py and tools/smoke_services.py (needs playwright)
python3 -m http.server -d _site    # or app/dist, or just open dist/wenyan.html
```

A push to `main` builds the app and publishes `_site/` on GitHub Pages (`.github/workflows/pages.yml`): an
installable app that works offline, with optional sync of progress between devices through a secret GitHub gist
(docs/sync-and-private-module.md).

## Using it

Tap a word for its card, a superscript number for its note, a reference (L3 n.5, 文言 L1 n.4) to jump to that note.
**Every Chinese word is tappable**: our own gloss comes first, then the dictionary: the reading in that sentence and
the CC-CEDICT senses (automatic, not checked by a person; classical text one character at a time, with the modern
sense flagged as such), its characters, other cuts, other lines of the course that use it, its NHSK / HSK level. The
table is built with the app: no dictionary is fetched at run time. **Cover** blurs the translation the Assimil way:
read the Chinese, then tap a line to check (the first tap on a word of a hidden line reveals it). **Mark as done**
ticks the lesson on its tile.

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

The dictionary built into the page (`make data`, never committed) uses
[CC-CEDICT](https://cc-cedict.org/wiki/) (MDBG, CC BY-SA 4.0: pinyin and English senses),
[jieba](https://github.com/fxsjy/jieba)'s dictionary and idf weights (MIT: word frequencies for the cut),
[complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT: HSK levels and readings) and
[hsk-3-vocabulary](https://github.com/bezlant/hsk-3-vocabulary) (CC BY-SA 4.0: NHSK levels, data/nhsk.tsv).
