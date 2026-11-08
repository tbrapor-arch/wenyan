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
