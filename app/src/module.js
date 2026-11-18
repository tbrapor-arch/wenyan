  /* module.js: private-module loader (Mod, moduleTabs, moduleRoute, moduleSettings): extra tabs from a private repo, only where the token can read it */
  /* ---------- private module ---------- */
  // Nothing of the module is in this public page. Its tabs appear only on a device whose saved GitHub token (the one
  // used for sync) can read the private repo; the module and its content come from there, through the GitHub API, and
  // are kept in this browser by content hash so they work offline. Contract: docs/sync-and-private-module.md.
  const Mod = {
    REPO: "tbrapor-arch/wenyan-private", DIR: "module", CACHE: "wenyan-module", KEY: "https://module.invalid/",
    index: null, loaded: null, urls: {}, err: "",
    get on(){ return !!Sync.token && store.get("modOn", false); },
    async box(){ try{ return await caches.open(this.CACHE); }catch(e){ return null; } },   // no Cache API in file://
    async raw(path){
      let r;
      try{
        r = await fetch(`https://api.github.com/repos/${this.REPO}/contents/${this.DIR}/${path.split("/").map(encodeURIComponent).join("/")}`,
          {headers: {Accept: "application/vnd.github.raw", Authorization: "Bearer " + Sync.token, "X-GitHub-Api-Version": "2022-11-28"}, cache: "no-store"});
      }catch(e){ throw new Error("offline"); }
      if (!r.ok){ const e = new Error(r.status === 404 ? "not found: " + path : r.status === 401 ? "token refused" : "GitHub error " + r.status); e.status = r.status; throw e; }
      return r;
    },
    // index.json: can the token read the repo, and what does the module declare? Offline: keep the last answer.
    async check(){
      if (!Sync.token){ store.set("modOn", false); return false; }
      const c = await this.box();
      try{
        const r = await this.raw("index.json"), ix = await r.clone().json();
        this.index = ix; store.set("modOn", true); this.err = "";
        store.set("modTabs", (Array.isArray(ix.tabs) ? ix.tabs : []).filter(t => Array.isArray(t) && /^[a-z][a-z0-9-]*$/.test(t[0])).map(t => [t[0], String(t[1] || ""), String(t[2] || "")]));
        if (c) await c.put(this.KEY + "index.json", r);
      }catch(e){
        // no access is an answer, not an error; anything else (offline, GitHub down) keeps the last answer
        if ([401, 403, 404].includes(e.status)){ store.set("modOn", false); store.set("modTabs", []); this.index = null; this.err = ""; }
        else this.err = String(e.message || e);
      }
      return this.on;
    },
    // a file of the module, kept in the browser cache under its content hash (from index.json): works offline
    async file(path){
      if (!this.index){ const c = await this.box(), hit = c && await c.match(this.KEY + "index.json"); if (hit) this.index = await hit.json(); }
      const sha = this.index && this.index.files && this.index.files[path];
      const key = `${this.KEY}${path}?${sha || "x"}`, c = await this.box();
      const hit = c && sha && await c.match(key);
      if (hit) return hit;
      const r = await this.raw(path);
      if (c && sha){ try{ await c.put(key, r.clone()); }catch(e){} }
      return r;
    },
    async media(path){ if (!this.urls[path]) this.urls[path] = this.file(path).then(r => r.blob()).then(b => URL.createObjectURL(b)); return this.urls[path]; },
    async load(){
      if (this.loaded) return this.loaded;
      return this.loaded = (async () => {
        if (!this.index){
          const c = await this.box(), hit = c && await c.match(this.KEY + "index.json");
          if (hit) this.index = await hit.json(); else { await this.check(); if (!this.index) throw new Error(this.err || "module not available"); }
        }
        const css = document.createElement("style"); css.textContent = await (await this.file("app.css")).text(); document.head.append(css);
        const js = await (await this.file("app.js")).text();
        await new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = URL.createObjectURL(new Blob([js], {type: "text/javascript"})); sc.onload = res; sc.onerror = () => rej(new Error("the module did not run")); document.head.append(sc); });
        if (!window.WenyanModule) throw new Error("the module did not define WenyanModule");
        await window.WenyanModule.init(modLoader());
      })().catch(e => { this.loaded = null; throw e; });
    },
    async show(h){
      const here = location.hash, tab = moduleTabs().find(t => t[0] === h.split("/")[0]) || [h, "", ""];
      const head = `<div class="set"><div class="kicker">${esc(tab[2])}</div><h1>${esc(tab[1])}</h1>`;
      if (!window.WenyanModule) app.innerHTML = head + `<p class="sub">Loading…</p></div>`;
      try{ await this.load(); if (location.hash === here) window.WenyanModule.route(h); }
      catch(e){
        if (location.hash !== here) return;
        app.innerHTML = head + `<div class="empty"><b>Could not load the private module.</b><br>${esc(e.message || e)}. It needs the internet the first time; after that it works offline.
          <p><button class="btn ghost" id="modRetry">Try again</button></p></div></div>`;
        $("#modRetry").onclick = () => this.show(h);
      }
    },
  };
  // what the module receives in init(loader): the files of its repo, and the app's shared pieces (the app's names live
  // inside one closure, not on window: the module gets them here). Optional pieces are there only when the page has them.
  function modLoader(){
    const opt = {};
    if (typeof zhLine === "function") opt.zhLine = zhLine;
    if (typeof zhAdd === "function") opt.zhAdd = zhAdd;
    if (typeof ZH_V !== "undefined") opt.ZH_V = ZH_V;
    if (typeof openCard === "function") opt.openCard = openCard;
    return {
      v: 1, repo: Mod.REPO, index: Mod.index, main: app,
      file: p => Mod.file(p), text: async p => (await Mod.file(p)).text(), json: async p => (await Mod.file(p)).json(), media: p => Mod.media(p),
      app: {openSheet, closeSheet, esc, go: () => route(), store: {get: (k, d) => store.get("mod." + k, d), set: (k, v) => store.set("mod." + k, v)}, ...opt},
    };
  }
  // for the shell: the module's tabs ([key, zh, en]) on this device, and its routes
  function moduleTabs(){ return Mod.on ? store.get("modTabs", []) : []; }
  function moduleRoute(hash){
    const h = String(hash || "").replace(/^#\/?/, "");
    if (!Mod.on || !moduleTabs().some(t => t[0] === h.split("/")[0])) return false;
    Mod.show(h); return true;
  }
  // check again (after a token was saved or removed) and redraw when the tabs changed
  async function moduleCheck(){
    const was = JSON.stringify(moduleTabs());
    await Mod.check();
    if (JSON.stringify(moduleTabs()) !== was && typeof course !== "undefined" && course && !sheetOpen()) rerender();
    moduleShow();
  }

  /* ---------- Settings › the private module's status on this device (container #set-module) ---------- */
  function moduleShow(){ const el = $("#set-module"); if (el) moduleSettings(el); }
  function moduleSettings(el){
    if (!el) return;
    // no token: nothing to say (most users never have a module)
    if (!Sync.token){ el.hidden = true; el.innerHTML = ""; el.dataset.state = "none"; return; }
    el.hidden = false;
    const n = moduleTabs().length, st = Mod.on ? "on" : "off";
    el.dataset.state = st;
    el.innerHTML = `<div class="sync-box"><div class="l">${Mod.on ? "Private module: on this device" : "Private module: not available"}<small>${Mod.on
      ? `${n} extra tab${n === 1 ? "" : "s"}. Kept in this browser once loaded, so it also works offline.`
      : "The saved token cannot read the private repo (it needs Contents: Read on it). Sync does not need it."}${Mod.err && Mod.err !== "offline" ? `<span class="sync-err">${esc(Mod.err)}</span>` : ""}</small></div>
      <div class="sync-btns"><button class="btn ghost" id="modCheck">Check again</button></div></div>`;
    el.onclick = async e => { if (e.target.closest("button")?.id === "modCheck"){ e.target.disabled = true; await moduleCheck(); } };
  }
  // at start: no token, no request. With one, check quietly (the last answer stands while offline), then load the
  // module in the background so its files are cached for offline use even before its tab is opened
  if (Sync.token) setTimeout(() => moduleCheck().then(() => { if (Mod.on) Mod.load().catch(() => {}); }), 0);
