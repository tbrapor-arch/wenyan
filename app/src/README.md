# app/src: the parts of the page

The app is one page. `tools/build_app.py` (called by `make app`) joins `app/index.template.html` and these parts
into `app/dist/index.html`, with the course data inlined, and copies it to `dist/wenyan.html`.

- The CSS parts go, in order, into the template's one `<style>` (`/*__CSS__*/`).
- The JS parts go, in order, into the one closure the template opens (`(() => { /*__JS__*/ })();`). Every part sees
  every other part's names: no modules, no bundler, no `import`. A part's top-level code runs at load, in join order;
  `events.js` boots the app, so it stays last.
- The order is the `PARTS` list in `tools/build_app.py`, and only there.

**One concern per part.** New code goes in the part that owns its concern, or in a new part added to `PARTS`. A part
starts with a one-line comment saying what it owns.

| # | CSS part | Owns |
|---|---|---|
| 1 | `base.css` | colours and fonts (light / night), page frame, top bar and tabs, shared pieces (buttons, seal, badges), track home and its tiles, reduced motion |
| 2 | `lesson.css` | lesson bar, the lesson page of every track (hero, two pages, notes, word chips, exercises, recap, finish), pinyin modes, Cover |
| 3 | `chengyu.css` | 成語: patterns, the two-row 成語 card |
| 4 | `settings.css` | Settings page, its sync and private-module rows |
| 5 | `rumen.css` | 入門 only: section chips, second wave, dialogue with speakers, words with pinyin above, note numbers, multiple choice, NHSK bars |
| 6 | `sheet.css` | bottom sheet (word card, note, "‹ Back to …") |
| 7 | `dict.css` | dictionary: tappable words (`.ztok`), the dictionary sheet (`.zd`), its layer inside curated cards (`.dx`) |

| # | JS part | Owns |
|---|---|---|
| 1 | `core.js` | `$`, `$$`, `store`, `esc`, `today`, `han`, `md`, `flash`, `jump`, state (`course`, `T`, `L`, `SIMP`, settings `S`), the settings migration, `Z`, `t_` / `UI`, `tx`, progress (`done`, `isDone`, `markDone`, `getProgress`, `setProgress`) |
| 2 | `track.js` | `CFG`: what each track's lessons are made of (script, pinyin, languages, sections, notes, words, exercises, Cover) |
| 3 | `route.js` | `TABS`, `parseHash`, `currentTab`, `drawTabs`, `route`, `rerender` |
| 4 | `home.js` | the track home of every track (`showHome`, tiles), `sealHTML` |
| 5 | `toolbar.js` | the lesson bar (`toolbar`) and the switches (`toggle`), shared with Settings |
| 6 | `lesson.js` | the lesson page (`showLesson`, `hero`, `finish`), the sections `SEC` (`pages`, `notes`, `words`, `practice`, `recap`, `culture`), `markLine`, word chips, `syncHeights` |
| 7 | `chengyu.js` | 成語 sections: `frames`, `cards` |
| 8 | `sheet.js` | bottom sheet: `openSheet`, `closeSheet`, `sheetOpen`, `sheetReveal`, the one way back (`sheetCur`, `sheetBack`); the word card (`openCard`, `cardHTML`, its `.dx` = `dictExtra`), the note (`openNote`), `courseGloss(word, classical)` (our gloss, for the dictionary sheet; classical: the lesson's own only) |
| 9 | `rumen.js` | 入門 only: its strings, tokens (`sentHTML`), its word cards (`rumenCard`, `rumenKey`) and the words in its notes (`rumenRun`), dialogue and second wave, new words, multiple choice, NHSK bars and the 100-lesson plan (`rumenHome`) |
| 10 | `dict.js` | dictionary (table built by `tools/zh_words.py`): `dictScript`, `dictLang` (read `SIMP` / `S` / `lang()`), `zhCut`, `zhLine`, `zhLineClassical`, `zhPieces`, `zhHTML`, `openZh`, `openZhWord`, `dictExtra`, `zhAdd`, `ZH_V`, `DICT_CREDIT`; the delegated `.ztok` click / key handler |
| 11 | `settings.js` | Settings page, progress file (Save / Load) |
| 12 | `sync.js` | installed app (service worker registration, published site only); sync between devices through a secret gist: `Sync`, `wy.marks`, `syncTouch`, `syncSettings` (docs/sync-and-private-module.md) |
| 13 | `module.js` | private-module loader: `Mod`, `moduleTabs`, `moduleRoute`, `moduleSettings` (docs/sync-and-private-module.md) |
| 14 | `events.js` | the delegated click / change / key / resize / hashchange listeners (`revealFirst`: Cover's first tap), then boot |

**A new track** is a `CFG` entry (and its sections in `SEC` if it needs new ones), not a new page function.
Every plain Chinese text goes through `han(text, classical)` (or `md`, whose Chinese runs go through it; a line drawn
in pieces through `zhPieces`, cut once); every write to `done` through `markDone`, which calls sync's `syncTouch`.
Sync reads `getProgress()` and writes back with `setProgress(obj, {replace: true})`; it redraws with `rerender()`
unless a sheet is open. A private module's tabs come from `moduleTabs()` (before Settings) and its routes from
`moduleRoute()`, asked before the track lookup.
