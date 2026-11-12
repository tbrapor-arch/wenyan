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
| Private 成語 | 教育部《成語典》, 中国成语大辞典 | CC BY-ND 3.0 TW / © — **private repo only** | checking 成語 origins (§10), the private 成語 tab (§9) |

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
Classical texts are public domain. The 成語 dictionary data (§9) stays in the private repo and is
not covered by these licenses.

## 9. 成語 tab (private)

The 成語 tab lives in the **private build only**, because both of its dictionaries are licensed
for private use only. The public course still links to 成語 through its own lessons.

### Sources, shown side by side

| Panel | Source | Rule |
|---|---|---|
| 教育部《成語典》 | `data/chengyu/moe.jsonl` (+ appendix) | CC BY-ND: shown **verbatim**, never edited or mixed with our notes, credited "中華民國教育部《成語典》, CC BY-ND 3.0 TW". |
| 中国成语大辞典 | `data/chengyu/dacidian.jsonl` | Shown as is. Its source passages are checked against the classical text before being reused in a lesson. |
| Our notes | the deck item (`note`) | Written by us in English. They may summarise either dictionary, never paste from it. |

A card shows the headword (in the book's script, with the other script below), the pinyin, the MOE
釋義 and 典源 with its story, the 大辞典 text, the user's sentence(s) from the book, and our note.
When the source passage is in a lesson (e.g. 守株待兔 → L1), the card links to it.

### Tiers

| Tier | Meaning | Shown by default |
|---|---|---|
| `core` | one of the 1,568 MOE 主條 (full usage notes and examples) | yes |
| `moe` | in the MOE main text (5,153 entries) | yes |
| `common` | in 2 or more of the lists | yes |
| `rare` | in one list only | yes, marked |
| `noise` | stoplist or AABB/ABAB reduplication, unless `core` | hidden |

### Deck format: `chengyu-deck/1`

Shujia (or `tools/chengyu.py scan`) writes one file per book; Wenyan imports it as a deck.
Items are ordered by **first appearance**, so the learner can study a book's 成語 ahead of
reading it.

```json
{
  "format": "chengyu-deck/1",
  "book": {"title": "红楼梦", "author": "曹雪芹", "file": "hlm.txt", "script": "simp",
           "chapters": ["第一回 …", "…"], "length": 2600000},
  "created": "2026-11-08",
  "settings": {"min_len": 4, "main_only": false},
  "items": [{
    "w": "守株待兔",           "t": "守株待兔", "s": "守株待兔", "py": "shǒu zhū dài tù",
    "count": 1,
    "first": {"chapter": "第一章", "ci": 0, "pos": 10, "sentence": "他整天守株待兔，一毛不拔。"},
    "hits":  [ /* up to 5, same shape as first */ ],
    "refs":  {"moe": [39], "moe_app": [5192], "dcd": [13295]},
    "tier":  "core",
    "status": "new"
  }]
}
```

- `w` is the form as it appears in the book; `t` / `s` are both scripts; `s` is the key.
- `pos` is a character offset in the whole book, `ci` the chapter index.
- `refs` point into the private data files, so a deck stays small and never copies dictionary text.
- `status`: `new` → `learning` → `known`, or `ignored`. Wenyan writes it back; Shujia can read it to
  highlight unknown 成語 while reading.
- Optional, written by Wenyan: `note` (our English note), `due` (next review date).
- Matching is by longest match on the simplified form, so a book in either script works.

## 10. 成語 module (public)

A separate track from the reading lessons, built on frequency. Public, CC BY-SA 4.0.

### Order

- **Frequency list:** `data/chengyu-freq.tsv` ranks 22,029 成語 (every 4+ character expression in
  the MOE 成語典 main text or the 中国成语大辞典, minus reduplications and the stoplist) by modern
  frequency from **wordfreq** (CC BY-SA), with a second count from our own classic-novel corpus.
  About 2,400 are common in modern use (Zipf ≥ 2); 4,521 have a modern figure at all.
- **Lessons of 20.** Take the next 100 by frequency, review out the non-成語 (十字路口, 三位一體,
  新陳代謝, 獨立自主 were dropped from the first 100), then split them into 5 lessons by **pattern or
  theme**: mirror frames (一X一Y, 無X無Y…), numbers, classical function words (所, 而, 之, 以, 於),
  negation, images. Grouping helps memory; frequency decides what comes first.
- **Story 成語** (守株待兔, 刻舟求劍…) sit lower in the list (~1,000–3,500). They are taught with
  their fable in the main course, and the 成語 module links to that lesson instead of retelling it.

### Lesson file

```
chengyu/NN-slug.yaml
```

| Field | Content |
|---|---|
| `id`, `slug`, `title`, `title_en`, `status`, `intro` | as in reading lessons |
| `frames[]` | the patterns the lesson teaches: `f` (e.g. `一X一Y`), `en`, `ex` (items using it) |
| `items[].w` | traditional headword (simplified is derived) |
| `py` | mainland standard reading, citation tones (no 一/不 sandhi) |
| `py_tw` | Taiwan standard reading, only when it differs (熟 shóu, 微 wéi, 息 xí…) |
| `lit` | literal, character by character, hyphenated: `one-mould-one-shape` |
| `en` | the meaning, our English |
| `note` | optional: a classical word or construction, a usage point, the story in one line |
| `origin` | optional: `work`, `text` (the classical phrase, public domain), `checked` (`moe` / `dcd`) |
| `ex` | one real sentence: `h` (as found, either script, quoted), `py` (pinyin), `py_auto` (true until checked by hand), `src` (`tatoeba` or `wikipedia: Title`), `en` (our translation) |

Rules:
- **Example sentences are real**, from Tatoeba (CC BY 2.0 FR) or Chinese Wikipedia (CC BY-SA), or
  from a public-domain novel. Trimmed sentences are marked with …; nothing else is changed.
  `wenyan-private/tools/check_chengyu_lessons.py` checks every example against the sentence pool.
- **Sentence pinyin** is generated by `tools/fill_pinyin.py`: syllables separated as in the reading
  lessons, citation tones, the 成語 with its checked reading, names joined and capitalised from
  `tools/chengyu-pinyin-words.yaml` (add any word pypinyin gets wrong there). It stays `py_auto: true`
  until checked by hand, and the reader marks it AUTO.
- **In the app** (成語 tab, §12): the reading lessons' two-column card. Each 成語 is two rows,
  成語 | meaning (note, origin), then example | translation; on a phone they stack in that order.
  Cover blurs the right column; tap a 成語 to check.
- **Origins** are only given when a dictionary confirms them; the checker matches the quoted
  phrase against the MOE 典源 or the 大辞典 text. The phrase is the classical original, never the
  dictionary's wording.
- Glosses and notes are ours. Never paste the MOE or 大辞典 definitions into the public module.
- `tools/build.py` adds the simplified forms and the example's traditional form (`h_t`, OpenCC
  s2tw, so 為 and 裡 come out in the Taiwan standard), and fails if an example lacks its 成語.

## 11. 白話 track: the written language beyond HSK 5

A third track beside 文言 and 成語, for a reader who has finished the textbooks and wants to read
novels.

**Which HSK.** Two names, never mixed (user, 2026-11-13): **HSK** is the 2012 test (six levels,
HSK 5 = 2,500 words cumulative), the level this track starts from; **NHSK** is HSK 3.0, the nine-level
test of the November 2025 syllabus (NHSK 5 = 3,600 words). Never write "old HSK" or "new HSK".
What stands between HSK 5 and novels is not grammar but the **written register**
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
| `glossary[]` | words **not in the HSK 1–5 lists** (2012), or used in an unusual sense, with `py`. A word that *is* in those lists stays only if a note teaches it (既然, 然而…) and carries `hsk: N` (its HSK level); the app shows it apart, under "Already in HSK 1–5". Check every new lesson against the 2012 lists |
| `exercise[]` | "Roots": the classical sentences behind the lesson's written words. `h` + `ref: 文言 L2` + `tests`; the sentence must be a run of lines of that lesson (quotation marks aside), and the build copies its pinyin and translation from there. Sentences from outside the course need `src`, `en` and a checked transcription, as in §7 |

`checked` works as in §6. For modern words `cyz` applies only when the classical sense is the one
in the passage (夜闌, 賤價); otherwise `wikt`.

## 12. The app

One page, four tracks, five tabs: **入門 · 文言 · 白話 · 成語 · 設定**. `tools/build.py` reads
`rumen/`, `lessons/`, `baihua/` and `chengyu/` and writes `app/course.json` and the single file
`dist/wenyan.html`.

- **Track home:** "next lesson" card, count done, a tile per lesson (✓ when done, dashed for reviews).
- **Lesson:** a bar that stays on top (back, previous / next, also ← → keys; 繁/简, Pinyin, Cover),
  then the page as before. Cross-references in notes are buttons, across tracks too.
- **Mark as done** dates the lesson (✓ on its tile); Undo removes the date. There is no review deck:
  review happens by reading, with the 7th-lesson reviews and the "Roots" exercises.
- **Always light**; night mode is a switch in Settings. Progress (the done dates) lives in the browser; Settings
  saves and loads it as a file (loading merges: earliest finish date).
- Routes: `#rumen`, `#rumen/52/wave`, `#wenyan`, `#baihua/1`, `#baihua/1/n5`, `#settings`. A first visit opens 入門. Every route maps to a tab
  in `TABS`, so the tab bar keeps its highlight.
- `python3 tools/smoke.py` clicks through every tab and lesson at phone and desktop width.


## 13. 入門 track: Mandarin from zero to NHSK 4

A course for friends who start from nothing, on the model of a 100-lesson Assimil, laid out like
Tsheh-tû. It is the one place in Wenyan with **invented texts**: the dialogues are written for the
course, because a beginner can't read real texts yet. Everything else stays: the build checks the
text, notes are numbered, and every 7th lesson is a review.

**Which HSK.** **NHSK** = HSK 3.0, final syllabus of November 2025 (NHSK 1–4 = 300, 500, 1,000,
2,000 words cumulative). **HSK** = the 2012 test. Never "old" / "new". The word list is
`data/nhsk.tsv` (from github.com/bezlant/hsk-3-vocabulary, CC BY-SA 4.0).

### Target and pace

- **100 lessons, 86 with a dialogue, 14 reviews** (7, 14, … 98). End: **NHSK 4**, ~2,000 words.
- New words per dialogue lesson grow from 14 to 32 (`tools/rumen.py` computes each lesson's quota
  from its place in `rumen/plan.yaml`). Milestones: NHSK 1 ≈ L21, NHSK 2 ≈ L35, NHSK 3 ≈ L63,
  NHSK 4 = L100. The build prints each lesson's count against its quota, by NHSK level, and the
  course's NHSK 1–4 coverage. Words outside NHSK are allowed (names of dishes, places) but count.
- **Second wave** from lesson 50: with lesson N, redo lesson N − 49 the other way round
  (`#rumen/1/wave`: translation shown, "Show Chinese" per line). Done separately.
- Grammar follows the NHSK grammar syllabus, loosely; `plan.yaml` gives each lesson its points.
- **Story:** Marc (马克), from Lyon, spends a year in Beijing; 王小雨 (colleague), 李老师 (teacher),
  张伟 (colleague, later flatmate). Lessons grow from 8 lines to about 20.

### Lesson file

`rumen/NNN-slug.yaml`, **simplified characters, mainland standard**; traditional is derived
(OpenCC s2t on the whole line). Explanations in **French and English** (`fr`, `en` everywhere).

| Field | Content |
|---|---|
| `id`, `slug`, `status` | as in §2 |
| `title`, `title_py`, `title_fr`, `title_en` | |
| `setting` | `fr`, `en`: where we are, one or two sentences |
| `names[]` | `w`, `py`, `fr`, `en`: people and places; never counted as words |
| `lines[]` | `n`, `who` (speaker), `h`, `py` (the whole line), `fr`, `en`, optional `lit_fr` / `lit_en` (word for word), optional `cut` (the line's words separated by spaces, when the automatic cut is wrong) |
| `notes[]` | `n`, `line` (a line's `n`; 0 = general), `topic` (`grammar`, `vocab`, `pron`, `culture`, `writing`), `fr`, `en`. A point is explained once, then referenced: `L1 n.4` (the build checks it exists) |
| `words[]` | the lesson's new words: `w`, `py`, `fr`, `en` (our gloss, the sense used here). The NHSK level is added by the build |
| `exercise.translate[]` | `h`, `py`, `fr`, `en`: sentences built only from words taught so far |
| `exercise.choose[]` | multiple choice: `h` with `＿＿` for the gap, `opts`, `a` (the answer), `py` of the full sentence, `fr`, `en` |
| `recap[]` | review lessons only: `fr`, `en` (with `L3 n.5` references); a review dialogue teaches no new word |

### Rules the build enforces

- **Words.** Each line is cut into words, longest match on the words taught so far + names
  (so an NHSK compound not taught yet, 个人 in 几个人, can't swallow two taught words). Notes are cut
  on all of NHSK, so any Chinese word in a note gets a card.
  Every word in a dialogue or an exercise must be taught in this lesson or an earlier one
  (a warning in `draft`, an error from `good` up). Every new word must be used in the dialogue as a
  word of its own, and is taught only once.
- **Pinyin.** Words joined as in ordinary pinyin, sentence capitals, proper names capitalised.
  Dictionary tones, with two exceptions written as spoken: 不 bú and 一 yí / yì before the tones that
  change them. Third-tone sandhi (你好 ní hǎo) is not written; L1 n.2 explains it. Neutral tones
  unmarked (xièxie, péngyou). The build splits the line into syllables, gives one to each character,
  and checks it against pypinyin's readings. An apostrophe separates ambiguous syllables (Lǐ'áng).
- **YAML.** French punctuation (« : ») breaks plain YAML values: run `python3 tools/rumen_quote.py
  rumen/*.yaml` after writing a lesson, which quotes every one-line `h`, `py`, `fr`, `en`, `lit_*`.
- **Erhua.** 这儿 zhèr: the "r" counts as the syllable of 儿 (the build checks it sits on 儿).
- **Simplified only** in the files. If OpenCC gets a traditional character wrong, fix it in the
  build, never by hand.

### In the app (Tsheh-tû layout)

- Home: next lesson, progress, NHSK 1–4 bars (words of the lessons marked done), the grid of the
  100 planned lessons (written ones open; the rest greyed with their planned title).
- Lesson: bar with **拼音** (above / on tap / characters only), **简/繁**, **FR/EN**, **Cover** (blurs the
  translation; tap to check). Dialogue lines with the speaker, the words with pinyin above, the
  translation and word-for-word line, and the note numbers under each line.
- **Tap a word** (in the dialogue, an exercise, the new-word grid, or **inside a note**) for its card in
  a bottom sheet: both scripts, pinyin, NHSK level, our gloss (else the NHSK list's English, marked),
  the lesson that teaches it, the lessons that use it, its characters.
- **Tap a note number** for the note in the sheet, with previous / next; the line is highlighted.
- Practice: translate (answer on tap), then multiple choice (a right answer fills the gap and shows the
  full sentence with pinyin and translation).
