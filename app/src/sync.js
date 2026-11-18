  /* sync.js: installed app (service worker), progress sync between devices through a secret gist: Sync, syncTouch, syncSettings */
  /* ---------- installed app ---------- */
  // Only the published site links a manifest (tools/site.py). The single file (dist/wenyan.html, file://) and
  // app/dist/index.html have none: no service worker and no sync there.
  const HOSTED = !!document.querySelector('link[rel="manifest"]');
  if (HOSTED && "serviceWorker" in navigator && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)))
    navigator.serviceWorker.register("sw.js").catch(() => {});

  /* ---------- progress as sync sees it ---------- */
  // wy.done is unchanged: lesson key -> finish date. Beside it, wy.marks: lesson key -> +time (ms) when last marked
  // done, -time when last undone. On a merge the later change wins, so an Undo on one device is not brought back by
  // the copy on another. Marks are kept by comparing wy.done with them (stampMarks), so whatever writes wy.done
  // (a button, a progress file) needs no change: syncTouch() right after a change gives it the time of the change.
  const progDone = () => typeof getProgress === "function" ? getProgress().done || {}
    : (typeof done === "object" && done) || store.get("done", {});
  function putDone(merged){
    if (typeof setProgress === "function") return setProgress({done: merged}, {replace: true});
    if (typeof done === "object" && done){ for (const k in done) if (!(k in merged)) delete done[k]; Object.assign(done, merged); }
    store.set("done", merged);
  }
  // like done, marks are read again from storage before each change: another tab may have stamped some since
  let marks = null;
  const marksReload = () => { const m = store.get("marks", null); return marks = m && typeof m === "object" && !Array.isArray(m) ? m : null; };
  function stampMarks(){
    marksReload();
    // monotonic: a new stamp is later than every mark already known here (this device's and those merged from the
    // gist), so a device whose clock is behind another's still has its Undo win over an earlier "done"
    const top = Math.max(0, ...Object.values(marks || {}).filter(t => typeof t === "number" && isFinite(t)).map(Math.abs));
    const d = progDone(), now = Math.max(Date.now(), top + 1);
    let ch = false;
    // first time: lessons finished before marks were kept count as older than any Undo made since
    if (!marks || typeof marks !== "object"){ marks = {}; for (const k in d) marks[k] = 1; ch = true; }
    for (const k in d) if (!(marks[k] > 0)){ marks[k] = now; ch = true; }
    for (const k in marks) if (marks[k] > 0 && !(k in d)){ marks[k] = -now; ch = true; }
    if (ch) store.set("marks", marks);
  }
  // what goes to the gist (settings are not synced: they belong to the device, as in Tsheh-tû)
  function syncData(){ stampMarks(); return {app: "wenyan", v: 2, at: new Date().toISOString(), done: {...progDone()}, marks: {...marks}}; }
  // another copy into this one: for done / undone the later mark wins; a lesson done on both keeps the earliest date
  function syncMerge(d){
    if (!d || d.app !== "wenyan") throw new Error("not a Wenyan progress copy");
    stampMarks();
    const out = {...progDone()};
    for (const [k, t] of Object.entries(d.marks || {})) if (typeof t === "number" && Math.abs(t) > Math.abs(marks[k] || 0)) marks[k] = t;
    for (const [k, v] of Object.entries(d.done || {})) if (v && (!out[k] || v < out[k])) out[k] = v;
    for (const k in out) if (marks[k] < 0) delete out[k];
    for (const k in out) if (!(marks[k] > 0)) marks[k] = 1;            // a copy from before marks: older than any Undo
    for (const k in marks) if (marks[k] > 0 && !out[k]) out[k] = today(); // marked done with no date anywhere
    store.set("marks", marks);
    putDone(out);
  }

  /* ---------- sync between devices: progress kept in a secret GitHub gist ---------- */
  // The token (fine-grained, Gists: Read and write) stays in this browser and goes only to api.github.com.
  // Pull + merge when the app opens, push a few seconds after each change, pull again when the app comes back to the
  // screen (at most every 2 minutes) or back online, and send a change still waiting when the app is put away.
  const Sync = {
    FILE: "wenyan-progress.json", timer: null, busy: false, again: false, merging: false, last: "",
    get token(){ return store.get("gistToken", ""); }, get id(){ return store.get("gistId", ""); },
    get on(){ return HOSTED && !!this.token; },
    async api(path, opts = {}){
      let r;
      try{
        r = await fetch("https://api.github.com" + path, {...opts, cache: "no-store", headers: {Accept: "application/vnd.github+json",
          Authorization: "Bearer " + this.token, "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? {"Content-Type": "application/json"} : {})}});
      }catch(e){ throw new Error("offline"); }
      if (!r.ok){
        const e = new Error(r.status === 401 ? "token refused" : r.status === 404 ? "not found"
          : r.status === 403 && r.headers.get("x-ratelimit-remaining") === "0" ? "GitHub rate limit, try later"
          : r.status === 403 ? "token not allowed (it needs Gists: Read and write)" : "GitHub error " + r.status);
        e.status = r.status; throw e;
      }
      return r.status === 204 ? null : r.json();
    },
    async findOrCreate(){
      if (this.id) return this.id;
      for (let page = 1; page <= 5; page++){
        const list = await this.api(`/gists?per_page=100&page=${page}`);
        const g = list.find(x => x.files && x.files[this.FILE]);
        if (g){ store.set("gistId", g.id); return g.id; }
        if (list.length < 100) break;
      }
      const g = await this.api("/gists", {method: "POST", body: JSON.stringify({public: false, description: "文言 Wenyan progress",
        files: {[this.FILE]: {content: JSON.stringify(syncData())}}})});
      store.set("gistId", g.id); return g.id;
    },
    snap(){ const d = syncData(); delete d.at; return JSON.stringify(d); },
    // true when the other devices' copy changed something here
    async pull(){
      let g;
      try{ g = await this.api("/gists/" + await this.findOrCreate()); }
      catch(e){ if (e.status !== 404 || !this.id) throw e; store.set("gistId", ""); g = await this.api("/gists/" + await this.findOrCreate()); }  // gist deleted: find or make another
      const f = g.files && g.files[this.FILE];
      let text = f && f.content;
      if (f && f.truncated){
        let r; try{ r = await fetch(f.raw_url, {cache: "no-store"}); }catch(e){ throw new Error("offline"); }
        if (!r.ok) throw new Error("GitHub error " + r.status); text = await r.text();
      }
      if (!text) return false;
      const before = this.snap();
      this.merging = true;   // the merge saves its result: that is not a new change to push again
      try{ syncMerge(JSON.parse(text)); } finally { this.merging = false; }
      return this.snap() !== before;
    },
    async push(){
      await this.api("/gists/" + await this.findOrCreate(), {method: "PATCH", body: JSON.stringify({files: {[this.FILE]: {content: JSON.stringify(syncData())}}})});
    },
    // resolves to true when progress from another device arrived (the page on screen may need redrawing)
    async run(){
      if (!this.on) return false;
      if (this.busy){ this.again = true; return false; }
      clearTimeout(this.timer); this.timer = null;
      if (navigator.onLine === false){ store.set("syncErr", "offline"); syncShow(); return false; }
      this.busy = true; this.again = false; syncShow();
      let changed = false;
      try{ changed = await this.pull(); await this.push(); this.last = this.snap(); store.set("syncAt", Date.now()); store.set("syncErr", ""); }
      catch(e){ store.set("syncErr", String(e.message || e)); }
      finally{ this.busy = false; }
      if (this.again){ this.again = false; this.soon(); }   // a change made during this run was not in what it pushed
      syncShow();
      return changed;
    },
    soon(){
      if (!this.on || this.merging) return;
      if (this.busy){ this.again = true; return; }
      clearTimeout(this.timer); this.timer = setTimeout(() => this.run().then(ch => { if (ch) syncRedraw(); }), 4000);
    },
  };
  // after any change to the progress (or to settings: those are not synced, so nothing is sent)
  function syncTouch(){
    stampMarks();
    if (Sync.on && !Sync.merging && Sync.snap() !== Sync.last) Sync.soon();
  }
  // until the shell sends every change of wy.done through markDone (which calls syncTouch), watch the writes here
  if (typeof markDone !== "function"){ const set0 = store.set; store.set = (k, v) => { set0.call(store, k, v); if (k === "done") syncTouch(); }; }
  stampMarks();
  // redraw after other devices' progress arrived, without disturbing what is being read (not with a sheet open):
  // the shell's rerender (route.js) keeps the scroll position
  function syncRedraw(){
    if (typeof course === "undefined" || !course) return;
    if (sheetOpen()){ redrawLater(); return syncShow(); }
    rerender();
  }
  document.addEventListener("visibilitychange", () => {
    if (!Sync.on) return;
    if (document.visibilityState === "hidden"){ if (Sync.timer) Sync.run(); return; }
    if (Date.now() - store.get("syncAt", 0) > 120e3) Sync.run().then(ch => { if (ch) syncRedraw(); });
  });
  addEventListener("online", () => { if (Sync.on) Sync.run().then(ch => { if (ch) syncRedraw(); }); });
  addEventListener("offline", () => { if (Sync.on){ store.set("syncErr", "offline"); syncShow(); } });
  if (Sync.on) setTimeout(() => Sync.run().then(ch => { if (ch) syncRedraw(); }), 0);

  /* ---------- Settings › Sync between devices (rendered into the container #set-sync) ---------- */
  function syncState(){
    if (!HOSTED) return "file";
    const err = store.get("syncErr", "");
    if (err === "token refused") return "refused";
    if (!Sync.token) return "off";
    if (Sync.busy) return "busy";
    if (err === "offline" || navigator.onLine === false) return "offline";
    return "on";
  }
  const syncWhen = t => t ? new Date(t).toLocaleString("en-GB", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}) : "never";
  function syncShow(){ const el = $("#set-sync"); if (el) syncSettings(el); if (typeof moduleShow === "function") moduleShow(); }
  function syncSettings(el){
    if (!el) return;
    const st = syncState(), err = store.get("syncErr", ""), at = store.get("syncAt", 0);
    const form = (label) => `<form class="sync-form" id="syncForm"><input id="syncToken" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" aria-label="GitHub token">
        <button class="btn" type="submit">${label}</button></form>`;
    const how = `<ol class="sync-how"><li>On GitHub: Settings › Developer settings › Personal access tokens › <b>Fine-grained tokens</b> › Generate.
        Account permissions: <b>Gists: Read and write</b>. Nothing else is needed for sync.</li><li>Paste the token here, on each device.</li></ol>`;
    const off = `<button class="btn ghost" id="syncOff">Stop syncing on this device</button>`;
    const S = {
      file: `<div class="l">Sync works in the published app<small>Open <b>tbrapor-arch.github.io/wenyan</b> to sync through your GitHub account. This file keeps its progress in this browser only: use Save / Load.</small></div>`,
      off: `<div class="l">Not connected<small>Keep the same progress on your phone and your computer, through your GitHub account (free). Lessons done and undone are merged; settings stay on each device.</small></div>${how}${form("Connect")}
        <small class="sync-note">The token is kept in this browser only and sent only to GitHub.</small>`,
      refused: `<div class="l">Token refused<small>GitHub refused ${Sync.token ? "the saved token: it has expired or was revoked" : "that token: check that it was copied whole and has Gists: Read and write"}. Make a new one and paste it here.</small></div>${form(Sync.token ? "Replace" : "Connect")}${Sync.token ? `<div class="sync-btns">${off}</div>` : ""}`,
      offline: `<div class="l">Offline<small>Last sync ${esc(syncWhen(at))}. Changes are kept here and sent when you are back online.</small></div><div class="sync-btns"><button class="btn ghost" id="syncNow">Sync now</button>${off}</div>`,
      busy: `<div class="l">Syncing…<small>Last sync ${esc(syncWhen(at))}.</small></div>`,
      on: `<div class="l">Connected<small>Last sync ${esc(syncWhen(at))}. Your progress is kept in a secret gist and merged when the app opens and after each change.${err ? `<span class="sync-err">Last attempt failed: ${esc(err)}</span>` : ""}</small></div>
        <div class="sync-btns"><button class="btn ghost" id="syncNow">Sync now</button>${off}</div>`,
    };
    el.dataset.state = st;
    el.innerHTML = `<div class="sync-box">${S[st]}</div>`;
    el.onsubmit = async e => {
      if (e.target.id !== "syncForm") return;
      e.preventDefault();
      const t = $("#syncToken").value.trim(); if (!t) return;
      store.set("gistToken", t); store.set("gistId", ""); store.set("syncErr", ""); store.set("syncAt", 0);
      const ch = await Sync.run();
      if (store.get("syncErr", "") === "token refused") store.set("gistToken", "");
      if (typeof moduleCheck === "function") await moduleCheck();
      if (ch) syncRedraw(); syncShow();
    };
    el.onclick = async e => {
      const id = e.target.closest("button")?.id;
      if (id === "syncNow"){ const ch = await Sync.run(); if (ch) syncRedraw(); }
      if (id === "syncOff"){ ["gistToken", "gistId", "syncErr", "syncAt"].forEach(k => store.set(k, k === "syncAt" ? 0 : "")); if (typeof moduleCheck === "function") await moduleCheck(); syncShow(); rerender(); }
    };
  }
