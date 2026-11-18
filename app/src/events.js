  /* events.js: delegated click / change / key / scroll / resize / hashchange listeners, then boot (runs last) */
  /* ---------- events ---------- */
  document.addEventListener("click", e => {
    const t = e.target, id = t.closest("button,a")?.id;
    const ref = t.closest(".ref");
    if (ref && ref.dataset.to){ closeSheet(); location.hash = ref.dataset.to; return; }
    if (T && T.key === "rumen" && rClick(e)) return;
    if (t.closest("#sheet")) return;
    closeSheet();
    if (t.closest("#pop .goto")){ const n = $("#n" + t.closest(".goto").dataset.n); hidePop(); flash(n); return; }
    if (t.closest("#pop")) return;
    if (t.closest("sup.nn")){ showNote(t.closest("sup.nn")); return; }
    if (t.closest(".w")){ showWord(t.closest(".w")); return; }
    hidePop();
    if (id === "tScript" || id === "sSimp"){ simp = !simp; store.set("simp", simp); return go(); }
    if (id === "tPy" || id === "sPy"){ py = !py; store.set("py", py); return go(); }
    if (id === "tCover" || id === "sCover"){ cover = !cover; store.set("cover", cover); return go(); }
    if (id === "sRlang"){ rlang = rlang === "fr" ? "en" : "fr"; store.set("rlang", rlang); return go(); }
    if (id === "sRtrad"){ rtrad = !rtrad; store.set("rtrad", rtrad); return go(); }
    if (id === "sNight"){ store.set("night", !store.get("night", false)); return go(); }
    if (id === "markdone"){ done[T.key + ":" + L.id] = today(); saveDone(); const y = scrollY; go(); scrollTo(0, y); return; }
    if (id === "undo"){ delete done[T.key + ":" + L.id]; saveDone(); const y = scrollY; go(); scrollTo(0, y); return; }
    if (id === "save"){ const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({app: "wenyan", saved: today(), done}, null, 1)], {type: "application/json"})); a.download = `wenyan-progress-${today()}.json`; a.click(); return; }
    if (id === "load") return $("#file").click();
    const ln = t.closest(".ln"), cy = t.closest(".cy");
    if (ln && cover) $$(`.ln[data-i="${ln.dataset.i}"]`).forEach(x => x.classList.toggle("peek"));
  });
  document.addEventListener("change", async e => {
    if (e.target.id !== "file" || !e.target.files[0]) return;
    try{ const d = JSON.parse(await e.target.files[0].text()); if (d.app !== "wenyan") throw 0;
      // merge: keep the earliest finish date of each lesson (a "deck" in an older file is ignored)
      for (const k in d.done) if (!done[k] || d.done[k] < done[k]) done[k] = d.done[k];
      saveDone(); go();
    }catch(x){ alert("That file is not a Wenyan progress file."); }
  });
  addEventListener("keydown", e => {
    if (e.target.closest("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape"){ hidePop(); closeSheet(); }
    if (L && e.key === "ArrowLeft") $("#prev")?.click();
    if (L && e.key === "ArrowRight") $("#next")?.click();
  });
  // A word pop-up closes once the page has really moved (a few pixels of font-loading shift don't count).
  addEventListener("scroll", () => { if (!pop.classList.contains("note-pop") && Math.abs(scrollY - popY) > 30) hidePop(); }, {passive: true});
  addEventListener("resize", () => { if (L) syncHeights(); });
  addEventListener("hashchange", go);

  (async () => {
    const inline = $("#course-data").textContent.trim();
    course = inline ? JSON.parse(inline) : await (await fetch("course.json")).json();
    if (!store.get("migrated", false)){ store.set("migrated", true); const old = store.get("lesson", null); if (old !== null && !location.hash && course.tracks[0].lessons[old]) location.hash = "wenyan/" + course.tracks[0].lessons[old].id; }
    go();
    if (document.fonts) document.fonts.ready.then(() => { if (L) syncHeights(); });
  })();
