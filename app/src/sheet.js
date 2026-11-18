  /* sheet.js: the bottom sheet of every track: openSheet, closeSheet, sheetBack, sheetCur; the word card (openCard,
     cardHTML, glossCard, cyCard), the note (openNote), courseGloss (our gloss of a word, for the dictionary's sheet) */
  // what the sheet shows, {label, open}, so that a card opened from inside it can offer "‹ Back to …"; openSheet clears
  // it: read it before calling openSheet, and set it after if your sheet can be come back to
  let sheetCur = null, sheetBackFn = null;
  const sheetOpen = () => $("#sheet").classList.contains("open");
  function openSheet(html){
    const sh = $("#sheet"); sh.innerHTML = `<div class="grab"></div>` + html; sheetCur = sheetBackFn = null;
    sh.classList.add("open"); sh.setAttribute("aria-hidden", "false"); sh.scrollTop = 0;
  }
  function closeSheet(){
    const sh = $("#sheet"); if (!sh) return;
    sh.classList.remove("open"); sh.setAttribute("aria-hidden", "true"); sheetCur = sheetBackFn = null;
    $$(".tok.sel,.ztok.sel,.w.sel,.wchip.sel,.cw.sel").forEach(x => x.classList.remove("sel")); $$(".noted").forEach(x => x.classList.remove("noted"));
    $$("sup.nn.on").forEach(x => x.classList.remove("on"));
  }
  // the sheet covers the bottom of the screen: bring the word tapped on the page above it
  function sheetReveal(el){
    const sh = $("#sheet"); if (!sh || !el || sh.contains(el)) return;
    const r = el.getBoundingClientRect(), lim = innerHeight - sh.offsetHeight - 12;
    if (r.bottom > lim && r.top > 60) scrollBy({top: Math.min(r.bottom - lim, r.top - 60), behavior: "smooth"});
  }
  // a "‹ Back to …" line at the top of the sheet now open: fn reopens what was there
  function sheetBack(label, fn){
    const sh = $("#sheet"); if (!sh || !fn) return;
    sheetBackFn = fn; sh.querySelector(".sback")?.remove();
    sh.querySelector(".grab").insertAdjacentHTML("afterend", `<button class="sback" data-act="sheetback">‹ ${esc(t_("back"))} ${esc(label)}</button>`);
  }

  // one word card for every track. d: {main, other (the other script), py, lv (badge HTML), gloss, src (where an
  // automatic gloss comes from), sw (說文), secs ([title, html]), taught, seen, chars (chip buttons), word, sentence}
  function cardHTML(d){
    const chips = xs => `<div class="chips">${xs.join("")}</div>`;
    return `<div class="top"><div class="hd"><div class="wh">${esc(d.main)}${d.other && d.other !== d.main ? `<small>${esc(d.other)}</small>` : ""}</div>
        <div class="wp">${esc(d.py || "")} ${d.lv || ""}</div></div><button class="x" aria-label="Close">×</button></div>
      ${d.gloss ? `<h3>${t_("meaning")}</h3><div class="gloss">${esc(d.gloss)}</div>${d.src ? `<div class="src">${esc(d.src)}</div>` : ""}` : ""}
      ${d.sw ? `<h3>${t_("sw")}</h3><div class="swq">${esc(d.sw)}</div>` : ""}
      ${(d.secs || []).map(([h, html]) => `<h3>${esc(h)}</h3>${html}`).join("")}
      ${d.taught && d.taught.length ? `<h3>${t_("taught")}</h3>${chips(d.taught)}` : ""}
      ${d.seen && d.seen.length ? `<h3>${t_("usedIn")}</h3>${chips(d.seen)}` : ""}
      ${d.chars && d.chars.length ? `<h3>${t_("chars")}</h3>${chips(d.chars)}` : ""}
      <div class="dx">${typeof dictExtra === "function" ? dictExtra(d.word, d.sentence || "", {noChars: !!(d.chars && d.chars.length)}) : ""}</div>`;
  }
  // a glossary word of the 文言 / 白話 lesson on screen
  function glossCard(gi){
    const g = L && L.glossary && L.glossary[gi]; if (!g) return null;
    return {main: Z(g, "w"), other: SIMP ? g.w : g.w_s, word: Z(g, "w"), py: g.py, lv: g.hsk ? `<span class="lv off">HSK ${g.hsk}</span>` : "", gloss: g.en, sw: g.sw};
  }
  // a 成語 of the lesson on screen: readings, literal sense, meaning, note, origin
  function cyCard(i){
    const it = L && L.items && L.items[i]; if (!it) return null;
    return {main: Z(it, "w"), other: SIMP ? it.w : it.w_s, word: Z(it, "w"), py: it.py + (it.py_tw ? ` · TW ${it.py_tw}` : ""), gloss: it.en,
      src: it.lit ? "lit. " + it.lit : "", secs: [...(it.note ? [["Note", `<p class="ntext">${md(it.note, "wenyan")}</p>`]] : []),
        ...(it.origin ? [["Origin · " + it.origin.work, `<div class="swq"${CL(true)}>${han(Z(it.origin, "text"), true)}</div>`]] : [])]};
  }
  // kind "k": a 入門 word (rumenCard); "g": a glossary word; "c": a 成語. el: what was tapped (its sentence goes to dictExtra)
  function openCard(kind, key, el){
    const prev = el && el.closest("#sheet") && sheetOpen() ? sheetCur : null;
    const d = kind === "k" ? rumenCard(key) : kind === "c" ? cyCard(+key) : glossCard(+key); if (!d) return;
    d.sentence = (el && el.closest("[data-zhs]")?.dataset.zhs) || "";
    $$(".tok.sel,.w.sel,.wchip.sel,.cw.sel").forEach(x => x.classList.remove("sel"));
    openSheet(cardHTML(d));
    if (el && !el.closest("#sheet")){ el.classList.add("sel"); sheetReveal(el); }
    sheetCur = {label: d.main, open: () => openCard(kind, key)};
    if (prev) sheetBack(prev.label, prev.open);
  }
  // note i of the lesson on screen, with previous / next; the line it is about is highlighted
  function openNote(i){
    const n = L && L.notes && L.notes[i]; if (!n) return;
    const total = L.notes.length;
    $$(".noted").forEach(x => x.classList.remove("noted")); $$("sup.nn.on").forEach(x => x.classList.remove("on"));
    openSheet(`<div class="top"><div class="hd"><span class="ntag">${t_("note")} ${n.n} ${t_("of")} ${total}${n.topic ? ` · ${esc(t_("topics")[n.topic] || n.topic)} · ${t_("line")} ${n.line}` : ""}</span>
        ${n.at ? `<div class="nat"${CL(CFG[T.key].classical)}>${han(Z(n, "at"), CFG[T.key].classical)}</div>` : ""}</div><button class="x" aria-label="Close">×</button></div>
      <p class="ntext nbody">${noteText(n)}</p>
      <div class="nrow"><button class="btn ghost" data-note="${i - 1}" ${i < 1 ? "disabled" : ""}>${t_("prev")}</button>
        <button class="btn" data-note="${i + 1}" ${i >= total - 1 ? "disabled" : ""}>${t_("nextN")}</button>
        <button class="btn ghost goto" data-jump="n${n.n}">${t_("allNotesGo")}</button></div>`);
    sheetCur = {label: `${t_("note").toLowerCase()} ${n.n}`, open: () => openNote(i)};
    const ln = T.key === "rumen" ? $$(`#line-${n.line}`) : $$(`.ln[data-i="${n.line}"]`);
    ln.forEach(x => x.classList.add("noted")); $$(`sup.nn[data-note="${i}"]`).forEach(x => x.classList.add("on"));
    // bring the line into view above the sheet
    const r = ln[0] && ln[0].getBoundingClientRect();
    if (r && (r.top < 110 || r.bottom > innerHeight * .45)) scrollTo(0, scrollY + r.top - 120);
  }
  // Our own gloss of a word (either script), for the dictionary's sheet to show first: the glossary entry or 成語 of
  // the lesson on screen, else the 入門 word, with the lesson that teaches it. {html, key, py} or null.
  // classical (a word tapped in classical text): only the lesson's own glossary or 成語, never the modern 入門 layer.
  function courseGloss(word, classical){
    if (!word) return null;
    const chip = (to, label) => `<button class="ref" data-to="${to}">${esc(label)}</button>`;
    const box = (py, gloss, ch) => `<div class="cg"><span class="cg-py">${esc(py)}</span> <span class="cg-g">${esc(gloss)}</span> ${ch}</div>`;
    const here = L && T && T.key !== "rumen" ? `${T.key}/${L.id}` : "";
    const g = L && (L.glossary || []).find(x => x.w === word || x.w_s === word);
    if (g) return {key: `${T.key}:${L.id}:${g.w}`, py: g.py, html: box(g.py, g.en, chip(here, `${T.zh} L${L.id}`))};
    const it = L && (L.items || []).find(x => x.w === word || x.w_s === word);
    if (it) return {key: `chengyu:${L.id}:${it.w}`, py: it.py, html: box(it.py, it.en, chip(here, `成語 L${L.id}`))};
    if (classical) return null;
    const k = rumenKey(word), D = track("rumen").dict, d = k && D[k];
    if (!d) return null;
    const gl = d[lang()] || d.en || d.auto || "";
    return gl ? {key: "rumen:" + k, py: d.py, html: box(d.py, gl, d.first ? chip(`rumen/${d.first}`, `入門 L${d.first}`) : "")} : null;
  }
  // swipe the sheet down to close it (phones): past 90 px, or a quick flick
  (() => {
    const sh = $("#sheet"); if (!sh) return;
    let y0 = 0, t0 = 0, dy = 0, drag = false, armed = false;
    sh.addEventListener("touchstart", e => { if (e.touches.length > 1) return; armed = sh.scrollTop <= 0; drag = false; dy = 0; y0 = e.touches[0].clientY; t0 = Date.now(); }, {passive: true});
    sh.addEventListener("touchmove", e => {
      if (!armed) return;
      dy = e.touches[0].clientY - y0;
      if (!drag){ if (dy > 8 && sh.scrollTop <= 0){ drag = true; sh.style.transition = "none"; } else { if (dy < 0) armed = false; return; } }
      e.preventDefault(); sh.style.transform = `translate(-50%,${Math.max(0, dy)}px)`;
    }, {passive: false});
    const end = () => { if (!drag){ armed = false; return; } const fast = dy > 40 && dy / Math.max(1, Date.now() - t0) > .5;
      sh.style.transition = ""; sh.style.transform = ""; drag = armed = false; if (dy > 90 || fast) closeSheet(); };
    sh.addEventListener("touchend", end); sh.addEventListener("touchcancel", end);
  })();
