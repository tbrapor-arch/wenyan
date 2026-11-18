  /* route.js: TABS, parseHash, currentTab, drawTabs, route (draws the page for the hash), rerender */
  // #rumen · #rumen/12 · #rumen/52/wave · #wenyan/3 · #baihua/1/n5 (a note) · #chengyu/3 · #settings
  const TABS = [["rumen", "入門", "Start"], ["wenyan", "文言", "Classical"], ["baihua", "白話", "Prose"], ["chengyu", "成語", "Idioms"],
                ["settings", "設定", "Settings"]];
  // a private module's tabs (module.js) go before Settings; they are never stored as the last tab
  const allTabs = () => [...TABS.slice(0, -1), ...(typeof moduleTabs === "function" ? moduleTabs() : []), TABS[TABS.length - 1]];
  const parseHash = () => { const p = location.hash.replace(/^#\/?/, "").split("/"); return {key: p[0], id: p[1] ? +p[1] : null, sub: p[2] || null}; };
  // the last track tab (wy.tab): one of the four tracks, else 入門 (a stored value that is not a track is ignored)
  const lastTab = () => { const t = store.get("tab", "rumen"); return TABS.some(x => x[0] === t && t !== "settings") ? t : "rumen"; };
  // every route maps to a tab, so a redrawn tab bar keeps its highlight
  function currentTab(){ const k = parseHash().key; return allTabs().some(t => t[0] === k) ? k : lastTab(); }
  function drawTabs(tab){
    $("#tabs").innerHTML = allTabs().map(([k, zh, en]) => `<a href="#${k}" ${k === tab ? 'aria-current="page"' : ""}><b>${esc(zh)}</b>${esc(en)}</a>`).join("");
  }
  function route(){
    sheetRedraw = false; closeSheet();    // this draws the page anyway
    const r = parseHash();
    H.dataset.theme = S.night ? "dark" : "light"; H.dataset.py = S.pinyin; H.classList.toggle("cover", S.cover);
    T = L = null; SIMP = false;
    if (r.key && !TABS.some(t => t[0] === r.key)){
      drawTabs(currentTab());
      if (typeof moduleRoute === "function" && moduleRoute(location.hash.replace(/^#/, ""))) return;
    }
    const tab = TABS.some(t => t[0] === r.key) ? r.key : lastTab();
    drawTabs(tab);
    if (tab === "settings"){ H.classList.remove("simp"); return showSettings(); }
    store.set("tab", tab);
    T = track(tab) || course.tracks[0]; SIMP = showsSimp(T); H.classList.toggle("simp", SIMP);
    L = r.id ? T.lessons.find(l => l.id === r.id) || null : null;
    if (!L){ showHome(); return scrollTo(0, 0); }
    showLesson(r.sub === "wave" && CFG[T.key].wave ? true : false);
    if (r.sub && r.sub !== "wave") jump(r.sub); else scrollTo(0, 0);
  }
  // redraw the page after a switch, staying where we were
  function rerender(){ const y = scrollY; if (/\/n\d+$/.test(location.hash)) history.replaceState(null, "", location.hash.replace(/\/n\d+$/, "")); route(); scrollTo(0, y); }
