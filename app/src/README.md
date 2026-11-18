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
| 1 | `base.css` | colours and fonts (light / night), page frame, top bar and tabs, shared pieces (buttons, seal, badges), track home, reduced motion |
| 2 | `lesson.css` | lesson bar, 文言 / 白話 reading lesson (pages, notes, glossary, exercise, finish), word / note pop-up |
| 3 | `chengyu.css` | 成語 lesson |
| 4 | `settings.css` | Settings page |
| 5 | `rumen.css` | 入門 lesson (dialogue, words with pinyin, notes, new words, practice, NHSK bars) |
| 6 | `sheet.css` | bottom sheet (word card, note) |
| 7 | `dict.css` | dictionary (empty for now) |

| # | JS part | Owns |
|---|---|---|
| 1 | `core.js` | `$`, `$$`, `store`, `esc`, `md`, `today`, state (`course`, `T`, `L`, settings, `done`), `Z`, `track`, `isDone`, `saveDone` |
| 2 | `route.js` | `TABS`, `route`, `drawTabs`, `go` |
| 3 | `home.js` | track home (文言, 白話, 成語), `sealHTML` |
| 4 | `lesson.js` | 文言 / 白話 lesson (`bar`, `finish`, `markLine`, exercise, glossary, review), `syncHeights`, word / note pop-up, `flash` |
| 5 | `chengyu.js` | 成語 lesson |
| 6 | `sheet.js` | bottom sheet: `openSheet`, `closeSheet` |
| 7 | `rumen.js` | 入門: strings (`RL`), words and notes, `rHome`, `rBar`, `rLesson`, `rFinish`, `rJump`, `openCard`, `openNote`, `rClick` |
| 8 | `dict.js` | dictionary: `zhCut`, `zhLine`, `openZh` (empty for now) |
| 9 | `settings.js` | Settings page |
| 10 | `sync.js` | installed app (service worker registration, published site only); sync between devices through a secret gist: `Sync`, `wy.marks`, `syncTouch`, `syncSettings` (docs/sync-and-private-module.md) |
| 11 | `module.js` | private-module loader: `Mod`, `moduleTabs`, `moduleRoute`, `moduleSettings` (docs/sync-and-private-module.md) |
| 12 | `events.js` | the delegated click / change / key / scroll / resize / hashchange listeners, then boot |
