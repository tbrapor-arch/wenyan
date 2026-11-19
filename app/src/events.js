  /* events.js: the delegated click / change / key / resize / hashchange listeners, then boot (runs last) */
  // Cover: a tap on a word of a line whose translation is still hidden first reveals the line; the next tap opens the
  // word (our card, or the dictionary for a .ztok). Same rule as pinyin "on tap": the first tap shows, the next opens.
  function revealFirst(el){
    if (!S.cover || !H.classList.contains("cover") || el.closest("#sheet")) return false;
    const cv = el.closest("[data-cv]"); if (!cv || cv.classList.contains("peek")) return false;
    $$(`[data-cv="${cv.dataset.cv}"]`).forEach(x => x.classList.add("peek"));
    return true;
  }
  document.addEventListener("click", e => {
    const t = e.target;
    if (!t.isConnected || t.closest(".ztok")) return;                 // the dictionary's words: dict.js handles them
    const inSheet = !!t.closest("#sheet");
    if (!inSheet && sheetOpen()) closeSheet();                          // a tap outside the sheet closes it (and still counts)
    const b = t.closest("button,a,.tok,.wt,.w,.cw,sup.nn,[data-cv],.py");
    if (!b) return;
    const ds = b.dataset;
    if (b.classList.contains("x")) return closeSheet();
    if (ds.to && b.tagName === "BUTTON"){ closeSheet(); location.hash = ds.to; return; }
    if (b.matches(".tok,.w,.cw") && revealFirst(b)) return;
    if (b.classList.contains("tok")){
      if (S.pinyin === "tap" && !b.classList.contains("show")) return b.classList.add("show");   // first tap: the pinyin
      return openCard("k", ds.k, b);
    }
    if (ds.k != null) return openCard("k", ds.k, b);
    if (ds.g != null) return openCard("g", ds.g, b);
    if (ds.c != null) return openCard("c", ds.c, b);
    if (ds.note != null) return openNote(+ds.note);
    if (b.classList.contains("py") && S.pinyin === "tap") return b.classList.toggle("show");
    if (ds.jump){ closeSheet(); return jump(ds.jump); }
    if (ds.line){ closeSheet(); const el = $("#line-" + ds.line); el?.classList.add("noted"); return flash(el); }
    const act = ds.act;
    if (act && toggle(act, ds.v)) return;
    if (act === "done" || act === "undo"){ const y = scrollY; markDone(ds.key, act === "done"); route(); return scrollTo(0, y); }
    if (act === "sheetback") return sheetBackFn && sheetBackFn();
    if (act === "show"){ $("#zh-" + ds.i).hidden = false; return b.remove(); }
    if (act === "showall"){ $$(".txt[hidden]").forEach(x => x.hidden = false); return $$(".showzh").forEach(x => x.remove()); }
    if (act === "opt") return rumenOpt(b);
    if (act === "save") return saveFile();
    if (act === "load") return $("#file").click();
    // Cover: tap a line (or a 成語) to see its translation
    const cv = t.closest("[data-cv]");
    if (cv && S.cover && !t.closest("button,a,details")) $$(`[data-cv="${cv.dataset.cv}"]`).forEach(x => x.classList.toggle("peek"));
  });
  /* ---------- keyboard ---------- */
  // Every tappable word and note number (TAP) answers Enter / Space as a tap (so Cover's first-tap and pinyin-on-tap
  // rules hold for the keyboard too). A line is one tab stop, not one per word (a lesson has hundreds): the first word
  // of each block is in the tab order, the arrow keys (← → Home End) move between the words of that block, and the
  // word last reached stays the block's tab stop (roving tabindex).
  const tapBlock = el => el.parentElement && el.parentElement.closest("p,li,td,th,dd,div,h1,h2,h3,blockquote,summary") || el.parentElement;
  function rovingInit(root){
    const groups = new Map();
    for (const el of root.querySelectorAll(TAP)){
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");
      const g = tapBlock(el); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(el);
    }
    for (const els of groups.values()){
      const cur = els.find(x => x.getAttribute("tabindex") === "0" && x.dataset.rv) || els[0];
      for (const x of els){ x.tabIndex = x === cur ? 0 : -1; x.dataset.rv = "1"; }
    }
  }
  let rvQ = false;
  const rvSoon = () => { if (rvQ) return; rvQ = true; queueMicrotask(() => { rvQ = false; rovingInit(document.body); }); };
  new MutationObserver(rvSoon).observe(document.body, {childList: true, subtree: true});
  const focusables = sh => [sh, ...sh.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')].filter(x => x === sh || x.getClientRects().length);
  document.addEventListener("keydown", e => {
    const sh = $("#sheet");
    // Tab stays inside the open sheet
    if (e.key === "Tab"){ tabbing = true; setTimeout(() => { tabbing = false; }); }
    if (e.key === "Tab" && sh && sheetOpen()){
      const fs = focusables(sh), i = fs.indexOf(document.activeElement);
      if (i < 0 || (!e.shiftKey && i === fs.length - 1) || (e.shiftKey && i <= 0)){ e.preventDefault(); (e.shiftKey ? fs[fs.length - 1] : fs[i < 0 ? 0 : fs.length > 1 ? 1 : 0]).focus(); }
      return;
    }
    const t = e.target.closest && e.target.closest(TAP);
    if (!t || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); e.stopPropagation(); t.click(); return; }
    const mv = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: "first", End: "last"}[e.key];
    if (mv === undefined) return;
    e.preventDefault(); e.stopPropagation();   // not the lesson's ← → (previous / next lesson)
    const g = tapBlock(t), els = [...g.querySelectorAll(TAP)].filter(x => tapBlock(x) === g), i = els.indexOf(t);
    const to = mv === "first" ? els[0] : mv === "last" ? els[els.length - 1] : els[Math.max(0, Math.min(els.length - 1, i + mv))];
    if (to && to !== t){ t.tabIndex = -1; to.tabIndex = 0; to.focus(); }
  }, true);
  // and if the focus still gets out of the open sheet (an element the list above missed), it is brought back in
  let tabbing = false;   // only a Tab is pulled back: a tap outside the sheet closes it (events below)
  document.addEventListener("focusin", e => {
    const sh = $("#sheet");
    if (!tabbing || !sh || !sheetOpen() || sh.contains(e.target)) return;
    const fs = focusables(sh); (fs[fs.length > 1 ? 1 : 0] || sh).focus({preventScroll: true});
  });
  document.addEventListener("change", e => { if (e.target.id === "file" && e.target.files[0]) loadFile(e.target.files[0]); });
  addEventListener("keydown", e => {
    if (e.key === "Escape") return closeSheet();
    if (e.target.closest("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (L && e.key === "ArrowLeft") $("#prev")?.click();
    if (L && e.key === "ArrowRight") $("#next")?.click();
  });
  addEventListener("resize", () => { if ($(".pages")) syncHeights(); });
  addEventListener("hashchange", route);
  // another tab of this browser changed the progress: read it again and redraw (after the sheet closes, if one is open)
  addEventListener("storage", e => {
    if (e.key !== null && e.key !== "wy.done" && e.key !== "wy.marks") return;
    doneReload(); if (typeof marksReload === "function") marksReload();
    if (course) redrawLater();
  });

  (async () => {
    const inline = $("#course-data").textContent.trim();
    course = inline ? JSON.parse(inline) : await (await fetch("course.json")).json();
    // links from the very first version (wy.lesson = an index into the 文言 lessons)
    if (!store.get("migrated", false)){ store.set("migrated", true); const old = store.get("lesson", null); if (Number.isInteger(old) && old >= 0 && !location.hash && course.tracks[1].lessons[old]) location.hash = "wenyan/" + course.tracks[1].lessons[old].id; }
    route();
    if (document.fonts) document.fonts.ready.then(() => { if ($(".pages")) syncHeights(); });
  })();
