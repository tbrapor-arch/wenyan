# Wenyan — course standards

Wenyan teaches Classical Chinese (文言) the Assimil way, but **only through real texts**: every
line a learner reads was written by a pre-modern author. No invented sentences, ever, including
in exercises.

## 1. Reading path

| Stage | Lessons | Texts | Why |
|---|---|---|---|
| I. Fables | 1–20 | 韓非子, 列子, 戰國策, 孟子, 呂氏春秋, 莊子 anecdotes (守株待兔, 自相矛盾, 揠苗助長, 刻舟求劍, 狐假虎威…) | short, self-contained, the core function words come back constantly |
| II. 論語 | 21–40 | selected sayings, grouped by function word / theme | short lines, the backbone of later allusion |
| III. Argument | 41–60 | 孟子, 莊子, 荀子, 韓非子 longer passages | sustained argument, rhetoric |
| IV. Narrative | 61–80 | 左傳, 戰國策, 史記 | history and long-form prose |
| V. Verse & later prose | 81+ | 詩經, 楚辭, 唐宋古文 | rhyme, allusion, imitation of the classics |

Each stage roughly follows the order of 王力《古代漢語》's general-theory chapters (判斷句 → 敘述句 →
否定句 → 疑問句 → 詞類活用 → 代詞 → 連詞介詞 …), introduced through whichever text shows them first.
Every 7th lesson is a **review lesson** (複習): no new text, a recap of the six previous lessons'
notes, plus exercises.

## 2. A lesson

```
lessons/NNN-slug.yaml
```

| Field | Content |
|---|---|
| `id`, `title`, `title_en`, `slug` | `title` is the traditional name of the passage (成語 name when there is one) |
| `source` | `work` (e.g. `韓非子·五蠹`), `author`, `period`, `text_from` (which public-domain edition we copied) |
| `status` | `draft` → `good` → `solid` (see §6) |
| `intro` | 2–4 sentences of English context: who wrote it, why, what to look out for |
| `lines[]` | `h` (traditional text, with its punctuation), `py` (pinyin), `en` (English) |
| `notes[]` | Assimil-style numbered notes: `n`, `line` (index into `lines`), `at` (the characters the note is about), `text` |
| `glossary[]` | `w` (word), `py`, `en` (the sense **in this passage**), optional `sw` (說文 quote), `kx` (康熙 quote), `checked` |
| `exercise[]` | real sentences from other texts re-using the lesson's words: `h`, `py`, `src`, `en` |
| `culture` | optional short cultural note |

**Review lessons** (`kind: review`, every 7th lesson) have no `lines`, `notes` or `glossary`.
Instead, `recap[]` lists the points to revise: `topic`, `text`, `refs` (notes where the point was
taught, as `L3 n.5`) and `examples` (phrases copied from earlier lessons). The build checks that
every ref exists and every example really occurs in an earlier lesson. `exercise[]` works as in
reading lessons, with sentences not used before.

Simplified characters are **never typed by hand**: `tools/build.py` derives them with OpenCC
(`t2s`), so the two scripts can't drift. If OpenCC gets a character wrong for the classical sense,
add an override in `tools/overrides.yaml`.

## 3. Text

- Traditional characters, in the form of the edition we copy (`source.text_from`). We take texts
  only from public-domain transcriptions (zh.wikisource, or an official school edition for short
  passages) and note which one.
- Modern punctuation (，。：；？！「」) as in the edition. When editions differ, follow the
  edition and explain the variant in a note.
- One `line` = one clause or short sentence, so the translation can sit next to it.

## 4. Translation and notes

- **Translation:** two layers, Assimil-style. `en` is natural English. Where the Chinese structure
  matters, add a literal rendering in parentheses: *(lit. "Song people there-was plough-one")*.
- **Notes:** each note explains one thing, in this order of priority:
  1. a word whose classical meaning differs from modern Chinese (古今詞義, e.g. 走 = *run*);
  2. a grammatical construction (有…者, 為…所…, A，B也);
  3. a function word (之, 其, 而, 以, 也, 矣, 焉, 者, 所);
  4. a cultural or historical point.
  A construction is fully explained the first time it appears, then only referenced
  ("→ L1 n.3"). Notes cite the general analysis of 王力《古代漢語》 by topic, not its wording.
- **Characters of interest:** when the simplified form merges several classical words
  (复 = 復/複/覆, 后 = 后/後, 云 = 云/雲, 余 = 余/餘…), say so in a note the first time.

## 5. Readings

- **Mandarin pinyin** for every line and every glossary word, with the classical reading where it
  differs (e.g. 說 shuì "to persuade", 女 rǔ "you", 耒 lěi). Tone marks, words joined as in
  ordinary pinyin, proper names capitalised.
- **Rhyme**, the same way 王力's textbook handles it: only in verse (詩經, 楚辭, 賦, later poetry).
  Rhyme words are marked, and the note gives their Old Chinese rhyme group (王力's 韻部 names:
  之部, 幽部, 魚部…). Middle Chinese is given only when a Tang-or-later rhyme needs it, taken from
  Wiktionary. Prose lessons have no rhyme notes.

## 6. Dictionary and sources

| Layer | Source | License | Use |
|---|---|---|---|
| Main | **Wiktionary** (zh / en, via kaikki.org dumps) | CC BY-SA | classical senses, quotes, Middle/Old Chinese |
| Fallback | **Unihan** | Unicode license (free) | a gloss and reading for every character |
| Words & 成語 | **CC-CEDICT**, **Chinese Notes** | CC BY-SA 3.0 | multi-character expressions |
| Tradition | **說文解字**, **康熙字典** | public domain | the `sw` / `kx` line on key characters |
| Private check | 古汉语常用字字典 (4th ed.), 王力《古代漢語》 | © — **private repo only** | gloss verification |

Rules:
- Glossary `en` is written by us, choosing the one sense that fits the passage. Never paste a
  dictionary definition.
- **Never** copy text, notes or translations from ctext.org or from CC BY-NC textbooks (e.g. the
  Rebus *Introduction to Classical Chinese*): their non-commercial licenses aren't compatible
  with CC BY-SA. We can read them; we don't copy them.
- `sw` / `kx` quotes must be checked against a transcription before `checked` includes `sw`.
- `checked` lists what a gloss was verified against: `wikt`, `cyz` (古汉语常用字字典, private),
  `sw`.

**Status:**
- `draft`: written, not yet checked.
- `good`: every gloss has `checked: [cyz]` or `[wikt]`, and every 說文 quote is verified.
- `solid`: also re-read against 王力's notes for the same passage, where the textbook has it.

## 7. Exercises

3–6 sentences from **other** real texts that reuse the lesson's words or construction, with
`src` (book · chapter). The learner translates them; the answers are shown on tap. Only quote
sentences checked against a transcription.

## 8. License

Course content (`lessons/`, notes, translations): **CC BY-SA 4.0**. Code (`tools/`, `app/`): MIT.
Classical texts are public domain.

## 11. 白話 track: the written language beyond the old HSK 5

A third track beside 文言 and 成語, for a reader who has finished the textbooks and wants to read
novels.

**Which HSK.** "HSK 5" in this course always means the **old HSK 5** (HSK 2.0, official 2012
lists: 2,500 words cumulative), the level the course was designed for. The HSK has since been
rebuilt into nine levels (HSK 3.0, first exams 2026) with larger lists, so a new "HSK 5" is a
different and bigger level. Never write a bare "HSK 5": say "old HSK 5". What stands between the two is not grammar but the **written register**
(書面語): one-character classical words living on inside modern ones (隙地, 夜闌), written function
words (如何, 然而, 固然, 令, 於), and four-character phrasing. The track teaches it the same way as
the rest of the course: **real texts only**.

### Texts

- Modern authors **dead for 70 years or more** (public domain in France and in China): 魯迅,
  許地山, 朱自清, 蕭紅, 郁達夫, 徐志摩, 聞一多, 夏丏尊, 梁啟超… Then the classic vernacular novels.
  Check the author's death year before starting a lesson; 老舍, 沈從文, 巴金, 張愛玲 are **not** free yet.
- `source.text_from` names the edition and the date it was compared. A text is typed in only
  after a line-by-line comparison with that edition. Never convert a simplified transcription
  to traditional and call it the text: OpenCC cannot know 著/着, 裡/裏, 吃/喫, and modern editions
  differ in wording (the first 落花生 we found differed from the second in 25 places).
- Republican-era spelling (罷 = 吧, 麼 = 嗎, 底 = 的, 那末, 牠, 伊) is kept as the edition has it and
  explained in a note the first time.

### Path

| Stage | Texts | Why |
|---|---|---|
| I. Short essays | 許地山 落花生, 朱自清 匆匆 / 背影 / 春, 魯迅 一件小事, 夏丏尊 | one sitting each, plain syntax, the core written words |
| II. Stories | 魯迅 孔乙己, 故鄉, 社戲; 蕭紅 呼蘭河傳 (excerpts); 郁達夫 | narrative, dialogue, description; several lessons per text |
| III. Classic novels | 儒林外史, 紅樓夢, 水滸傳, 西遊記 (famous scenes) | older vernacular; where 成語 are densest |
| IV. Half-classical | 梁啟超 少年中國說, 聊齋誌異 | the meeting point with the 文言 track |

A long text is cut into lessons of 20–30 lines at paragraph breaks. Every 7th lesson is a review.

### Lesson file

`baihua/NNN-slug.yaml`, the same schema as a reading lesson (§2), with these differences:

| Field | Difference |
|---|---|
| `lines[]` | one **sentence** per line; no `py` (the learner reads characters; readings are on the words). `p: true` starts a paragraph. `lit` only where the structure needs it |
| `notes[]` | priority: 1. a written word or function word and the classical word inside it, with a link to the 文言 note that teaches it (`→ 文言 L1 n.4`; the build checks the note exists); 2. a period spelling or usage; 3. a 成語 or four-character phrase; 4. culture |
| `glossary[]` | words **not in the old HSK 1–5 lists** (2012), or used in an unusual sense, with `py`. A word that *is* in those lists stays only if a note teaches it (既然, 然而…) and carries `hsk: N` (its old level); the app shows it apart, under "Already in old HSK 1–5". Check every new lesson against the 2012 lists |
| `exercise[]` | "Roots": the classical sentences behind the lesson's written words. `h` + `ref: 文言 L2` + `tests`; the sentence must be a run of lines of that lesson (quotation marks aside), and the build copies its pinyin and translation from there. Sentences from outside the course need `src`, `en` and a checked transcription, as in §7 |

`checked` works as in §6. For modern words `cyz` applies only when the classical sense is the one
in the passage (夜闌, 賤價); otherwise `wikt`.

## 12. The app

One page, three tracks, four tabs: **文言 · 白話 · 成語 · 設定**. `tools/build.py` reads
`lessons/`, `baihua/` and `chengyu/` and writes `app/course.json` and the single file
`dist/wenyan.html`.

- **Track home:** "next lesson" card, count done, a tile per lesson (✓ when done, dashed for reviews).
- **Lesson:** a bar that stays on top (back, previous / next, also ← → keys; 繁/简, Pinyin, Cover),
  then the page as before. Cross-references in notes are buttons, across tracks too.
- **Mark as done** dates the lesson (✓ on its tile); Undo removes the date. There is no review deck:
  review happens by reading, with the 7th-lesson reviews and the "Roots" exercises.
- **Always light**; night mode is a switch in Settings. Progress (the done dates) lives in the browser; Settings
  saves and loads it as a file (loading merges: earliest finish date).
- Routes: `#wenyan`, `#baihua/1`, `#baihua/1/n5`, `#settings`. Every route maps to a tab
  in `TABS`, so the tab bar keeps its highlight.
- `python3 tools/smoke.py` clicks through every tab and lesson at phone and desktop width.

