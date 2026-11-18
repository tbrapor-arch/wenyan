  /* rumen.js: 入門 strings, words, notes, rHome, rBar, rLesson, rFinish, rJump, openCard, openNote, rClick */
  /* ---------- 入門: Mandarin from zero, in the Tsheh-tû layout ---------- */
  const RL = {
    fr: {lesson: "Leçon", review: "Révision", start: "Commencer", cont: "Continuer", next: "Leçon suivante", nextL: "Prochaine leçon",
         startHere: "Pour commencer", done: "terminées", plan: "Les 100 leçons", planned: "à venir", dialogue: "Dialogue", notes: "Notes",
         allNotes: "Toutes les notes", words: "Mots nouveaux", practice: "Exercices", translate: "Traduisez", choose: "Choisissez le bon mot",
         answer: "Réponse", note: "Note", of: "sur", line: "ligne", prev: "‹ Précédente", nextN: "Suivante ›", taught: "Appris en leçon",
         usedIn: "Aussi dans", chars: "Caractères", meaning: "Sens", name: "nom propre", outside: "hors NHSK", auto: "Liste NHSK (anglais)",
         wave: "Deuxième vague", waveDo: "Avec cette leçon, refaites la leçon {n} en sens inverse : lisez la traduction, dites le chinois.",
         waveIntro: "Chaque ligne montre la traduction. Dites-la en chinois à voix haute, puis touchez « Voir le chinois » pour vérifier.",
         showZh: "Voir le chinois", showAll: "Tout afficher", markDone: "Marquer comme terminée", finished: "Leçon finie ?",
         keep: "Marquez-la pour garder votre place.", doneOn: "Terminée le", undo: "Annuler", cover: "Cacher la traduction",
         topics: {grammar: "grammaire", vocab: "vocabulaire", pron: "prononciation", culture: "culture", writing: "écriture"},
         about: "Le mandarin depuis zéro, à la manière d'Assimil : 100 leçons qui suivent Marc pendant un an à Pékin, jusqu'au NHSK 4 (2 000 mots).",
         nhsk: "Mots appris (leçons terminées)", lit: "litt."},
    en: {lesson: "Lesson", review: "Review", start: "Start", cont: "Continue", next: "Next lesson", nextL: "Next lesson",
         startHere: "Start here", done: "done", plan: "The 100 lessons", planned: "to come", dialogue: "Dialogue", notes: "Notes",
         allNotes: "All notes", words: "New words", practice: "Practice", translate: "Translate", choose: "Pick the right word",
         answer: "Answer", note: "Note", of: "of", line: "line", prev: "‹ Previous", nextN: "Next ›", taught: "Taught in lesson",
         usedIn: "Also in", chars: "Characters", meaning: "Meaning", name: "name", outside: "not in NHSK", auto: "NHSK list (English)",
         wave: "Second wave", waveDo: "With this lesson, also redo lesson {n} the other way round: read the translation, say the Chinese.",
         waveIntro: "Each line shows the translation. Say it in Chinese out loud, then tap “Show Chinese” to check.",
         showZh: "Show Chinese", showAll: "Show all", markDone: "Mark as done", finished: "Finished the lesson?",
         keep: "Mark it done to keep your place.", doneOn: "Done on", undo: "Undo", cover: "Hide the translation",
         topics: {grammar: "grammar", vocab: "vocabulary", pron: "pronunciation", culture: "culture", writing: "writing"},
         about: "Mandarin from zero, the Assimil way: 100 lessons following Marc through a year in Beijing, up to NHSK 4 (2,000 words).",
         nhsk: "Words learned (lessons done)", lit: "lit."}
  };
  const t_ = k => RL[rlang][k];
  const R = (o, k) => rtrad && o[k + "_t"] != null ? o[k + "_t"] : o[k];   // simplified is the text; traditional is derived
  const RT = o => o[rlang];                                                 // our French or English
  let RW = {}, RD = {}, RIDX = null;                                        // rendered words; dictionary; script index
  const rDict = () => track("rumen").dict;
  // a word on screen: characters with the pinyin above
  const tokHTML = (tok, i) => tok.k ? `<span class="tok" tabindex="0" data-k="${esc(tok.k)}"><ruby>${esc(R(tok, "s") || tok.s)}<rt>${esc(tok.p || "")}</rt></ruby></span>` : esc(rtrad ? tok.t : tok.s);
  const sentHTML = toks => toks.map(x => tokHTML({...x, s_t: x.t})).join("");
  // Chinese words inside a note are tappable too (longest match on the course's word cards)
  function noteHTML(txt){
    const D = rDict();
    if (!RIDX || RIDX.trad !== rtrad){ RIDX = {trad: rtrad, m: {}}; for (const k in D) RIDX.m[rtrad ? D[k].t : k] = k; }
    let h = esc(txt).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(?<!文言 |白話 )\bL(\d+) n\.(\d+)/g, (m, l, n) => `<button class="ref" data-to="rumen/${l}/n${n}">${rlang === "fr" ? "L" + l + " n." + n : m}</button>`);
    return h.replace(/[㐀-鿿豈-﫿]+/g, run => {
      let out = "", i = 0;
      let buf = "";   // TEMP wiring: the Chinese no word card covers goes to the dictionary
      while (i < run.length){
        let j = Math.min(run.length, i + 8);
        for (; j > i + 1; j--) if (RIDX.m[run.slice(i, j)]) break;
        const w = run.slice(i, j), k = RIDX.m[w];
        if (k){ out += zhLine(buf) + `<span class="wt" data-k="${esc(k)}">${esc(w)}</span>`; buf = ""; } else buf += w; i = j;
      }
      return out + zhLine(buf);
    });
  }
  const lvHTML = d => d.name ? `<span class="lv off">${t_("name")}</span>` : d.lvl ? `<span class="lv">NHSK ${esc(d.lvl)}</span>` : `<span class="lv off">${t_("outside")}</span>`;
  const plan = () => track("rumen").plan;
  const rTitle = p => rtrad ? (p.zh_t || p.zh) : p.zh;

  function rHome(){
    const tr = track("rumen"), ls = tr.lessons, byId = Object.fromEntries(ls.map(l => [l.id, l]));
    const nDone = ls.filter(l => isDone(tr, l)).length, next = ls.find(l => !isDone(tr, l));
    // NHSK words from the lessons marked done
    const got = {1: 0, 2: 0, 3: 0, 4: 0};
    ls.filter(l => isDone(tr, l)).forEach(l => (l.words || []).forEach(w => { if (got[w.lvl] != null) got[w.lvl]++; }));
    const cov = ["1", "2", "3", "4"].map(k => `<span>NHSK ${k}</span><span class="bar"><i style="width:${Math.min(100, 100 * got[k] / tr.nhsk_total[k])}%"></i></span><span>${got[k]} / ${tr.nhsk_total[k]}</span>`).join("");
    app.innerHTML = `<section class="thead">${sealHTML("入門")}<div><div class="kicker">${rlang === "fr" ? "Débutant" : "Start"}</div><h1>${rtrad ? "入門" : "入门"}</h1><p>${esc(t_("about"))}</p></div></section>
      ${next ? `<div class="next"><div class="t"><div class="kicker">${nDone ? t_("nextL") : t_("startHere")} · ${next.id}</div>
          <div class="zh1">${esc(R(next, "title"))}</div><div class="te">${esc(next["title_" + rlang])}</div></div>
          <a class="btn red" href="#rumen/${next.id}">${nDone ? t_("cont") : t_("start")}</a></div>` : ""}
      <div class="prog">${nDone} / ${ls.length} ${t_("done")}</div>
      <div class="cov" aria-label="${esc(t_("nhsk"))}">${cov}</div>
      <h2>${t_("plan")}</h2>
      <div class="grid">${plan().map(p => { const l = byId[p.id];
        if (p.review) return `<${l ? `a href="#rumen/${p.id}"` : "div"} class="tile rev ${l ? (isDone(tr, l) ? "done" : "") : "planned"}"><div class="n">${p.id} · ${t_("review").toUpperCase()}</div><div class="z">復習</div></${l ? "a" : "div"}>`;
        return l ? `<a class="tile ${isDone(tr, l) ? "done" : ""}" href="#rumen/${p.id}"><div class="n">${p.id}</div><div class="z">${esc(R(l, "title"))}</div><div class="te">${esc(l["title_" + rlang])}</div></a>`
          : `<div class="tile planned"><div class="n">${p.id} · ${t_("planned")}</div><div class="z">${esc(rTitle(p))}</div><div class="te">${esc(p[rlang])}</div></div>`; }).join("")}</div>
      <footer>NHSK = HSK 3.0, syllabus of November 2025 (word list: github.com/bezlant/hsk-3-vocabulary, CC BY-SA 4.0). Course content CC BY-SA 4.0 · code MIT.</footer>`;
    scrollTo(0, 0);
  }

  function rBar(){
    const tr = track("rumen"), i = tr.lessons.indexOf(L), p = tr.lessons[i - 1], n = tr.lessons[i + 1];
    const modeLabel = {py: "拼音", tap: "拼音 ☝", han: rtrad ? "漢字" : "汉字"}[rmode];
    return `<div class="lbar">
      <a class="ic" href="#rumen" aria-label="Back">←</a>
      <div class="ttl">${t_("lesson")} ${L.id} ·<b>${esc(R(L, "title"))}</b></div>
      <a class="ic" id="prev" ${p ? `href="#rumen/${p.id}"` : 'aria-disabled="true"'} aria-label="Previous lesson">‹</a>
      <a class="ic" id="next" ${n ? `href="#rumen/${n.id}"` : 'aria-disabled="true"'} aria-label="Next lesson">›</a>
      <div class="toggles">
        <button class="tg" id="rMode" title="Pinyin above / on tap / characters only">${modeLabel}</button>
        <button class="tg" id="rScript" title="Simplified / traditional">${rtrad ? "繁 → 简" : "简 → 繁"}</button>
        <button class="tg" id="rLang">${rlang === "fr" ? "FR → EN" : "EN → FR"}</button>
        <button class="tg" id="tCover" aria-pressed="${cover}" title="${esc(t_("cover"))}">Cover</button>
      </div></div>`;
  }
  function rLesson(wave){
    const tr = track("rumen"), notesBy = {};
    (L.notes || []).forEach((n, i) => (notesBy[n.line] ||= []).push(i));
    const who = [...new Set(L.lines.map(l => l.who))];
    const trHTML = l => `<div class="tr">${esc(RT(l))}${l["lit_" + rlang] ? `<span class="lit">${esc(l["lit_" + rlang])}</span>` : ""}</div>`;
    const w = L.id - 49, waveL = L.id >= 50 && tr.lessons.find(l => l.id === w);
    const ex = L.exercise || {};
    app.innerHTML = rBar() + `<section class="hero">${sealHTML(R(L, "title"))}<div><div class="kicker">${wave ? t_("wave") + " · " : ""}${t_("lesson")} ${L.id}${L.kind === "review" ? " · " + t_("review") : ""}</div>
        <h1>${zhLine(R(L, "title"))}</h1><div class="sub">${esc(L.title_py)} — ${esc(L["title_" + rlang])}</div></div></section>
      <div class="meta"><span class="badge" title="draft → good → solid">${esc(L.status)}</span></div>
      ${wave ? `<p class="setting">${esc(t_("waveIntro"))}</p>` : (L.setting ? `<p class="setting">${esc(RT(L.setting))}</p>` : "")}
      ${!wave && waveL ? `<a class="wavecard" href="#rumen/${w}/wave"><span class="kicker">${t_("wave")}${done["rumen:" + w + ":wave"] ? " · ✓" : ""}</span><br>${esc(t_("waveDo").replace("{n}", w))}</a>` : ""}
      ${wave ? "" : `<nav class="lnav">${[["dlg", t_("dialogue"), 1], ["sec-notes", t_("notes"), L.notes?.length], ["sec-words", t_("words"), L.words?.length], ["sec-ex", t_("practice"), ex.translate || ex.choose]].filter(c => c[2]).map(([id, x]) => `<button data-jump="${id}">${x}</button>`).join("")}</nav>`}
      ${L.recap ? `<h2>${t_("review")}</h2><div class="recap">${L.recap.map((r, i) => `<div class="rc"><span class="num">${i + 1}</span><div><p class="ntext">${noteHTML(rtrad ? r[rlang + "_t"] : r[rlang])}</p></div></div>`).join("")}</div>` : ""}
      <h2 id="dlg">${t_("dialogue")}</h2>
      <div class="dlg">${L.lines.map((l, li) => `<div class="sent" id="line-${l.n}">
        <div class="who">${l.who ? `<span class="av ${["", "b", "c"][who.indexOf(l.who) % 3]}">${esc([...R(l, "who")][0])}</span>${esc(R(l, "who"))}` : ""}<span class="n">${l.n}</span></div>
        ${wave ? `${trHTML(l)}<button class="showzh" data-show="${li}">${t_("showZh")}</button><div class="txt" id="zh-${li}" hidden>${sentHTML(l.toks)}</div>`
          : `<div class="txt">${sentHTML(l.toks)}</div>${trHTML(l)}`}
        ${wave ? "" : `<div class="under">${(notesBy[l.n] || []).map(k => `<button class="nlink" data-note="${k}" aria-label="${t_("note")} ${k + 1}">${k + 1}</button>`).join("")}</div>`}
      </div>`).join("")}</div>
      ${wave ? `<div class="row" style="border:0"><button class="btn ghost" id="showAll">${t_("showAll")}</button></div>` : `
      ${L.notes && L.notes.length ? `<details class="allnotes" id="sec-notes"><summary>${t_("allNotes")} (${L.notes.length})</summary>
        ${L.notes.map((n, i) => `<div class="rnote" id="n${n.n}"><span class="num">${n.n}</span><span class="tag">${esc(t_("topics")[n.topic] || n.topic)} · <button class="ref" data-line="${n.line}">${t_("line")} ${n.line}</button></span>
          <p class="ntext">${noteHTML(rtrad ? n[rlang + "_t"] : n[rlang])}</p></div>`).join("")}</details>` : ""}
      ${L.words && L.words.length ? `<h2 id="sec-words">${t_("words")} · ${L.words.length}</h2>
        <div class="wgrid">${L.words.map(x => `<button class="wchip" data-k="${esc(x.w)}"><b>${esc(rtrad ? x.t : x.w)}</b><span class="r">${esc(x.py)}${x.lvl ? `<span class="lv">NHSK ${esc(x.lvl)}</span>` : `<span class="lv off">${t_("outside")}</span>`}</span><span class="g">${esc(RT(x))}</span></button>`).join("")}</div>` : ""}
      ${ex.translate || ex.choose ? `<h2 id="sec-ex">${t_("practice")}</h2><div class="prac">
        ${ex.translate ? `<div class="ntag">1 · ${t_("translate")}</div>${ex.translate.map(e => `<div class="q"><div class="txt">${sentHTML(e.toks)}</div>
          <details class="ans"><summary>${t_("answer")}</summary><p>${esc(RT(e))}</p></details></div>`).join("")}` : ""}
        ${ex.choose ? `<div class="ntag">2 · ${t_("choose")}</div>${ex.choose.map((e, qi) => `<div class="q" data-q="${qi}"><div class="txt">${R(e, "h").split("＿＿").map(zhLine).join('<span class="gap">？</span>')}</div>
          <div class="opts">${(rtrad ? e.opts_t : e.opts).map((o, oi) => `<button class="opt" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join("")}</div>
          <div class="after" hidden><div class="txt">${sentHTML(e.toks)}</div><div>${esc(RT(e))}</div></div></div>`).join("")}` : ""}
      </div>` : ""}`}
      ${rFinish(wave)}
      <footer>${rlang === "fr" ? "Dialogues écrits pour le cours" : "Dialogues written for the course"} · CC BY-SA 4.0 · NHSK list: bezlant/hsk-3-vocabulary, CC BY-SA 4.0.</footer>`;
  }
  function rFinish(wave){
    const key = "rumen:" + L.id + (wave ? ":wave" : ""), d = done[key], tr = track("rumen"), n = tr.lessons[tr.lessons.indexOf(L) + 1];
    return `<div class="finish"><div class="msg">${d ? `<b>${t_("doneOn")}</b> ${esc(d)}.` : `<b>${t_("finished")}</b><small>${t_("keep")}</small>`}</div>
      ${d ? `<button class="btn ghost" id="rUndo" data-key="${key}">${t_("undo")}</button>` : `<button class="btn red" id="rDone" data-key="${key}">${t_("markDone")}</button>`}
      ${n && !wave ? `<a class="btn ghost" href="#rumen/${n.id}">${t_("next")} ›</a>` : ""}</div>`;
  }
  function rJump(id){
    const el = $("#" + id); if (!el) return;
    if (el.closest("details")) el.closest("details").open = true;
    flash(el);
  }

  function openCard(k){
    const D = rDict(), d = D[k]; if (!d) return;
    const main = rtrad ? d.t : d.s, other = rtrad ? d.s : d.t;
    const gloss = d[rlang] || d.en || "";
    const chars = [...d.s].length > 1 ? [...d.s].map(c => D[c] ? `<button data-k="${esc(c)}"><span class="han">${esc(rtrad ? D[c].t : c)}</span> ${esc(D[c].py)}${D[c][rlang] || D[c].en ? " · " + esc(D[c][rlang] || D[c].en) : ""}</button>` : "").join("") : "";
    const seen = (d.seen || []).filter(x => x !== d.first && x !== L?.id);
    openSheet(`<div class="top"><div class="hd"><div class="wh">${esc(main)}${other !== main ? `<small>${esc(other)}</small>` : ""}</div>
        <div class="wp">${esc(d.py)} ${lvHTML(d)}</div></div><button class="x" aria-label="Close">×</button></div>
      ${gloss ? `<h3>${t_("meaning")}</h3><div class="gloss">${esc(gloss)}</div>` : d.auto ? `<h3>${t_("meaning")}</h3><div class="gloss">${esc(d.auto)}</div><div class="src">${t_("auto")}</div>` : ""}
      ${d.first ? `<h3>${t_("taught")}</h3><div class="chips"><button data-to="rumen/${d.first}">${t_("lesson")} ${d.first}</button></div>` : ""}
      ${seen.length ? `<h3>${t_("usedIn")}</h3><div class="chips">${seen.map(x => `<button data-to="rumen/${x}">${t_("lesson")} ${x}</button>`).join("")}</div>` : ""}
      ${chars ? `<h3>${t_("chars")}</h3><div class="chips">${chars}</div>` : ""}
      <div class="dx">${dictExtra(main)}</div>`);   // TEMP wiring
  }
  function openNote(i){
    const n = L.notes[i], total = L.notes.length;
    $$(".sent.noted").forEach(x => x.classList.remove("noted")); $("#line-" + n.line)?.classList.add("noted");
    openSheet(`<div class="top"><div class="hd"><span class="ntag">${t_("note")} ${i + 1} ${t_("of")} ${total} · ${esc(t_("topics")[n.topic] || n.topic)} · ${t_("line")} ${n.line}</span></div><button class="x" aria-label="Close">×</button></div>
      <p class="ntext" style="font-size:16.5px">${noteHTML(rtrad ? n[rlang + "_t"] : n[rlang])}</p>
      <div class="nrow"><button class="btn ghost" data-note="${i - 1}" ${i < 1 ? "disabled" : ""}>${t_("prev")}</button>
        <button class="btn" data-note="${i + 1}" ${i >= total - 1 ? "disabled" : ""}>${t_("nextN")}</button></div>`);
  }
  // a click inside 入門; returns true when handled
  function rClick(e){
    const t = e.target, b = t.closest("button,a,.tok,.wt,.tr");
    if (!b) return false;
    if (b.classList.contains("x")){ closeSheet(); return true; }
    if (b.dataset.to && b.tagName === "BUTTON" && !b.classList.contains("ref")){ closeSheet(); location.hash = b.dataset.to; return true; }
    if (b.classList.contains("tok")){
      if (rmode === "tap" && !b.classList.contains("show")){ b.classList.add("show"); return true; }
      $$(".tok.sel").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); openCard(b.dataset.k); return true;
    }
    if (b.classList.contains("wt") || b.classList.contains("wchip") || (b.dataset.k && b.closest("#sheet"))){ openCard(b.dataset.k); return true; }
    if (b.dataset.note != null && b.tagName === "BUTTON"){ openNote(+b.dataset.note); return true; }
    if (b.dataset.line){ closeSheet(); const el = $("#line-" + b.dataset.line); el?.classList.add("noted"); flash(el); return true; }
    if (b.dataset.jump){ rJump(b.dataset.jump); return true; }
    if (b.classList.contains("tr") && cover){ b.classList.toggle("peek"); return true; }
    if (b.dataset.show){ $("#zh-" + b.dataset.show).hidden = false; b.remove(); return true; }
    if (b.id === "showAll"){ $$(".txt[hidden]").forEach(x => x.hidden = false); $$(".showzh").forEach(x => x.remove()); return true; }
    if (b.classList.contains("opt")){
      const e2 = L.exercise.choose[+b.dataset.q], q = b.closest(".q"), right = +b.dataset.o === e2.opts.indexOf(e2.a);
      if (q.dataset.ok) return true;
      b.classList.add(right ? "ok" : "no");
      if (right){ q.dataset.ok = 1; q.querySelectorAll(".gap").forEach(g => g.textContent = rtrad ? e2.opts_t[e2.opts.indexOf(e2.a)] : e2.a); q.querySelector(".after").hidden = false; }
      return true;
    }
    if (b.id === "rMode"){ rmode = {py: "tap", tap: "han", han: "py"}[rmode]; store.set("rmode", rmode); go(); return true; }
    if (b.id === "rScript" || b.id === "sRtrad"){ rtrad = !rtrad; store.set("rtrad", rtrad); go(); return true; }
    if (b.id === "rLang" || b.id === "sRlang"){ rlang = rlang === "fr" ? "en" : "fr"; store.set("rlang", rlang); go(); return true; }
    if (b.id === "rDone"){ done[b.dataset.key] = today(); saveDone(); const y = scrollY; go(); scrollTo(0, y); return true; }
    if (b.id === "rUndo"){ delete done[b.dataset.key]; saveDone(); const y = scrollY; go(); scrollTo(0, y); return true; }
    return false;
  }
