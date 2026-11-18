  /* route.js: TABS, route, drawTabs, go */
  /* ---------- routing ---------- */
  // Every route maps to a tab here, so a redrawn tab bar keeps its highlight.
  const TABS = [["rumen", "入門", "Start"], ["wenyan", "文言", "Classical"], ["baihua", "白話", "Prose"], ["chengyu", "成語", "Idioms"],
                ["settings", "設定", "Settings"]];
  const route = () => { const p = location.hash.replace(/^#\/?/, "").split("/"); return {tab: TABS.some(t => t[0] === p[0]) ? p[0] : store.get("tab", "rumen"), id: p[1] ? +p[1] : null, note: p[2] || null}; };
  function drawTabs(tab){
    $("#tabs").innerHTML = TABS.map(([k, zh, en]) => `<a href="#${k}" ${k === tab ? 'aria-current="page"' : ""}><b>${zh}</b>${en}</a>`).join("");
  }
  function go(){
    hidePop(); closeSheet();
    const r = route();
    H.classList.toggle("simp", simp); H.classList.toggle("nopy", !py); H.classList.toggle("cover", cover);
    H.dataset.theme = store.get("night", false) ? "dark" : "light";
    H.classList.toggle("rm-han", r.tab === "rumen" && rmode === "han"); H.classList.toggle("rm-tap", r.tab === "rumen" && rmode === "tap");
    drawTabs(r.tab); L = null;
    if (r.tab === "settings") return settings();
    store.set("tab", r.tab);
    T = track(r.tab); L = r.id ? T.lessons.find(l => l.id === r.id) : null;
    if (!L) return T.key === "rumen" ? rHome() : home();
    if (T.key === "rumen"){ rLesson(r.note === "wave"); if (r.note && r.note !== "wave") rJump(r.note); else scrollTo(0, 0); return; }
    lesson();
    if (r.note){ const n = $("#" + r.note); if (n){ n.scrollIntoView({block: "center"}); n.classList.add("flash"); } }
    else scrollTo(0, 0);
  }
