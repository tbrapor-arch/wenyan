  /* events.js: the delegated click / change / key / resize / hashchange listeners, then boot (runs last) */
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
  document.addEventListener("change", e => { if (e.target.id === "file" && e.target.files[0]) loadFile(e.target.files[0]); });
  addEventListener("keydown", e => {
    if (e.key === "Escape") return closeSheet();
    if (e.target.closest("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (L && e.key === "ArrowLeft") $("#prev")?.click();
    if (L && e.key === "ArrowRight") $("#next")?.click();
  });
  addEventListener("resize", () => { if ($(".pages")) syncHeights(); });
  addEventListener("hashchange", route);

  (async () => {
    const inline = $("#course-data").textContent.trim();
    course = inline ? JSON.parse(inline) : await (await fetch("course.json")).json();
    // links from the very first version (wy.lesson = an index into the 文言 lessons)
    if (!store.get("migrated", false)){ store.set("migrated", true); const old = store.get("lesson", null); if (old !== null && !location.hash && course.tracks[1].lessons[old]) location.hash = "wenyan/" + course.tracks[1].lessons[old].id; }
    route();
    if (document.fonts) document.fonts.ready.then(() => { if ($(".pages")) syncHeights(); });
  })();
