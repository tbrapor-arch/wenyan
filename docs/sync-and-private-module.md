# Offline app, sync between devices, and the optional private module

The published app (https://tbrapor-arch.github.io/wenyan/) is the built page plus what `tools/site.py` adds
(`make site`, run by the workflow): a Content Security Policy, a manifest, icons and an offline service worker.
The single file `dist/wenyan.html` stays a plain page: it opens offline from disk, with no service worker and no sync
(the code checks for the manifest link that only the published page has).

## Offline app
- `app/pwa/sw.js`: the page itself is the offline copy (network first, so new lessons arrive as soon as you are
  online; the cached copy when offline). The page holds all the course data, so that one file is the whole app.
- Fonts: the page uses Google Fonts (Noto Serif TC / SC, Source Serif 4). The service worker keeps every font file it
  has served (cache first) and answers the fonts' stylesheet from its cache. Before the first online visit, or in the
  single file offline, the text falls back to the system's own Chinese serif (`--zh` in `app/src/base.css`).
- `api.github.com` is left alone by the service worker: sync talks to GitHub live, and the private module keeps its
  own files in the page's cache.
- Icons: `python3 -I tools/make_icons.py` (paper ground, red seal with 文言); the PNGs are committed.

## Sync
In the app: Settings › Sync between devices (published app only).
1. GitHub › Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate. Name it
   `wenyan sync`; set an expiry and a reminder.
2. Account permissions › **Gists: Read and write**. Nothing else is needed for sync alone.
3. Paste the token on each device and press Connect. The app finds or creates a secret gist with one file,
   `wenyan-progress.json`, and merges when the app opens, a few seconds after each change, when it comes back to the
   screen (at most every 2 minutes) and when the network returns; a change still waiting is sent when the app is put
   away.
4. Merge: for done / undone the latest change wins (`marks`, timestamps), so an Undo on one device is not brought back
   by another; a lesson done on both keeps the earliest finish date. Settings are not synced (they belong to each
   device).
5. The token stays in that browser (localStorage `wy.gistToken`) and is sent only to `api.github.com`. Settings shows:
   not connected / connected (last sync time) / token refused (expired or revoked: make a new one) / offline.
6. Backup without GitHub: Settings › Save / Load a progress file.

### Progress format
- `wy.done` (unchanged): `{"wenyan:3": "2026-11-02", "rumen:5:wave": "2026-11-10", …}`, lesson key → finish date.
- `wy.marks` (new): lesson key → `+ms` when last marked done, `−ms` when last undone (`Date.now()`). Kept by
  comparing `wy.done` with it (`stampMarks` in `app/src/sync.js`). Every write to `wy.done` goes through the shell's
  `markDone(key, on, quiet)` (`app/src/core.js`), which calls `syncTouch()` (quiet: a merge, from a file or from sync,
  stamps nothing new by itself). `done` and `marks` are read again from storage before every change (`doneReload`,
  `marksReload`), and a `storage` event from another tab of the same browser reloads them and redraws the page (after
  the sheet closes, `redrawLater`), so two tabs never write back each other's old copy. Sync reads `getProgress()` and writes its merged copy with
  `setProgress({done}, {replace: true})` (done becomes exactly that copy, removals included); Load uses
  `setProgress(file)`, which merges (earliest date). The first time, lessons already done get `+1`: older than any Undo.
- The gist file: `{"app": "wenyan", "v": 2, "at": ISO time, "done": {…}, "marks": {…}}`. A copy without `marks`
  (a progress file, an older app) merges as before: earliest date, and its lessons count as older than any Undo.

## Optional private module (generic)
The app can load extra tabs from the private repo `tbrapor-arch/wenyan-private`. They appear only on a device whose
saved token can read that repo; nothing of the module is in this repo or in the published page. For that the token
also needs **Repository access: wenyan-private** with **Contents: Read** (a token for sync alone is not enough).

Loader contract (`Mod` in `app/src/module.js`):
- `module/index.json` in the private repo: `{"files": {"app.js": "<hash>", "app.css": "<hash>", …}, "tabs": [["key",
  "中文", "English"], …]}`. `files` maps each file of `module/` to a hash of its content (any string that changes when
  the file changes); `tabs` are the tabs the module adds (key: lowercase letters, digits, `-`), shown before Settings.
- The app asks for `module/index.json` through the GitHub API with the saved token when it opens (no token: no
  request at all). 200: the module is on for this device; 401 / 403 / 404: off; no network: the last answer stands.
- `app.css` and `app.js` (and any file the module asks for) are fetched through the API, kept in the browser cache
  under their hash (so they work offline once loaded), the CSS added as a `<style>`, the JS run as a `blob:` script.
  The module is loaded in the background when the app opens, so it is cached before its tab is first opened.
- `app.js` must define `window.WenyanModule = {init(loader), route(hash)}`. `init` is called once (may return a
  promise); `route(hash)` each time one of its tabs is shown, with the hash without `#` (`books`, `books/3`, …). The
  module draws into `loader.main` (the page's `<main>`).
- `loader`: `v` (1), `repo`, `index`, `main`, `file(path)` → Response, `text(path)`, `json(path)`, `media(path)` →
  `blob:` URL, and `app`, the app's shared pieces (the app's names live in one closure, not on `window`):
  - `openSheet(html)`, `closeSheet()`: the bottom sheet; `esc(text)`: HTML-escape; `go()`: redraw the current route (the shell's `route()`);
    `store.get(k, d)` / `store.set(k, v)`: the module's own keys in localStorage (prefixed `wy.mod.`).
  - when the page has them: `zhLine(text)` (HTML: the text unaltered, its words as tappable spans that open the
    dictionary sheet), `zhAdd({qt, w, x})` (adds the module's own words, `w`, and readings, `x`, made by the public
    `tools/zh_words.py`, to the app's dictionary; refused when `qt` differs from the page's), `ZH_V` (the
    dictionary's version: use `zhLine` / `zhAdd` only when it is present), `openZhWord(word)` (the dictionary sheet
    of a word), `openCard("k", word)` (the card of a 入門 word). The module
    falls back to plain text when they are missing (an older cached app page).
- Settings › the module's status on this device (on / not available, Check again); nothing is shown without a token.

Keep this document generic: do not describe the module's content here.

## Content Security Policy
`tools/site.py` puts a CSP in the published page: only the page's own inline script (by hash, recomputed at each
build), `blob:` scripts (the module), Google Fonts (stylesheet and files) and GitHub's API (`api.github.com`, and
`gist.githubusercontent.com` for a large gist) are allowed; no forms are sent anywhere. The module must therefore not
rely on `eval`, inline `<script>` or `on…=` attributes. A new outside source (script, API, frame) has to be added to
the list in `tools/site.py`, or the browser refuses it.

## Tests
`make smoke` runs `tools/smoke_services.py` after `tools/smoke.py`: service worker and offline reload, no CSP
violation on any route, the single file as `file://`, sync and the module loader against a fake `api.github.com`
(never a real token). Screenshots of Settings at 390 px go to `/tmp/shots-services/`.
