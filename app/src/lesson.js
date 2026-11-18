  /* lesson.js: 文言 / 白話 lesson (bar, finish, markLine, exercise, glossary, review), syncHeights, word / note pop-up, flash */
  /* ---------- lesson ---------- */
  function bar(){
    const i = T.lessons.indexOf(L), p = T.lessons[i - 1], n = T.lessons[i + 1], reading = T.key !== "chengyu" && L.kind !== "review";
    return `<div class="lbar">
      <a class="ic" href="#${T.key}" aria-label="Back to ${esc(T.en)} lessons">←</a>
      <div class="ttl">${esc(T.zh)} ${L.id} ·<b>${esc(Z(L, "title"))}</b></div>
      <a class="ic" id="prev" ${p ? `href="#${T.key}/${p.id}"` : 'aria-disabled="true"'} aria-label="Previous lesson">‹</a>
      <a class="ic" id="next" ${n ? `href="#${T.key}/${n.id}"` : 'aria-disabled="true"'} aria-label="Next lesson">›</a>
      <div class="toggles">
        <button class="tg" id="tScript" aria-pressed="${simp}" title="Traditional / simplified">${simp ? "简 → 繁" : "繁 → 简"}</button>
        ${T.key === "wenyan" || T.key === "chengyu" ? `<button class="tg" id="tPy" aria-pressed="${py}">Pinyin</button>` : ""}
        ${reading ? `<button class="tg" id="tCover" aria-pressed="${cover}" title="Hide the English; tap a line to check">Cover</button>` : ""}
      </div></div>`;
  }
  function finish(){
    const d = done[T.key + ":" + L.id], i = T.lessons.indexOf(L), n = T.lessons[i + 1];
    return `<div class="finish"><div class="msg">${d ? `<b>Done</b> on ${esc(d)}.` : `<b>Finished reading?</b><small>Mark it done to keep your place.</small>`}</div>
      ${d ? `<button class="btn ghost" id="undo">Undo</button>` : `<button class="btn red" id="markdone">Mark as done</button>`}
      ${n ? `<a class="btn ghost" href="#${T.key}/${n.id}">Next lesson ›</a>` : ""}</div>`;
  }
  // Mark glossary words (longest match first) and note anchors in a line.
  function markLine(line, i){
    const t = Z(line, "h");
    const words = L.glossary.map((g, gi) => ({w: Z(g, "w"), gi})).sort((a, b) => b.w.length - a.w.length);
    const ends = {};
    L.notes.filter(n => n.line === i).forEach(n => { const at = Z(n, "at"), p = t.indexOf(at); if (p >= 0) (ends[p + at.length - 1] ||= []).push(n.n); });
    let out = "", k = 0, buf = "";
    const flush = () => { out += T.key === "wenyan" ? zhLineClassical(buf) : zhLine(buf); buf = ""; };   // TEMP wiring
    while (k < t.length){
      const m = words.find(x => t.startsWith(x.w, k)), len = m ? m.w.length : 1, seg = t.slice(k, k + len);
      if (m){ flush(); out += `<span class="w" data-g="${m.gi}">${esc(seg)}</span>`; } else buf += seg;
      for (let j = k; j < k + len; j++) if (ends[j]){ flush(); out += ends[j].map(n => `<sup class="nn" data-n="${n}">${n}</sup>`).join(""); }
      k += len;
    }
    flush();
    return out;
  }
  const exerciseHTML = title => L.exercise ? `<h2>${title}</h2><div class="ex">${L.exercise.map(e => `
    <div class="e"><div class="zh" data-zh="classical">${zhLineClassical(Z(e, "h"))}</div>${e.py ? `<div class="py">${esc(e.py)}</div>` : ""}
    <div class="src">${esc(e.src)}${e.to ? ` · <button class="ref" data-to="${e.to.track}/${e.to.id}">open</button>` : ""}</div>
    <details><summary>Answer</summary><p>${esc(e.en)}</p>${e.tests ? `<p class="tests">Practises: ${esc(e.tests)}</p>` : ""}</details></div>`).join("")}</div>` : "";

  const glHTML = (gs, known) => `<div class="gl ${known ? "known" : ""}">${gs.map(g => `<div class="g"><span class="c ztok" tabindex="0" role="button" data-z="${esc(Z(g, "w"))}"${T.key === "wenyan" ? ' data-c="1"' : ""}>${esc(Z(g, "w"))}</span><span class="p">${esc(g.py)}${g.hsk ? ` · HSK ${g.hsk}` : ""}</span><span class="d">${esc(g.en)}</span>
    ${g.sw ? `<div class="sw"><b>說文</b>${esc(g.sw)}</div>` : ""}</div>`).join("")}</div>`;
  function lesson(){
    if (T.key === "chengyu") return chengyuLesson();
    const hero = (k, extra = "") => `<section class="hero">${sealHTML(Z(L, "title"))}<div><div class="kicker">${k}</div>
      <h1>${T.key === "wenyan" ? zhLineClassical(Z(L, "title")) : zhLine(Z(L, "title"))}</h1><div class="sub">${esc(L.title_py || "")}${L.title_py ? " — " : ""}${esc(L.title_en)}</div></div></section>
      ${L.intro ? `<p class="intro">${zhHTML(md(L.intro, T.key), T.key === "wenyan")}</p>` : ""}<div class="meta">${extra}<span class="badge" title="draft → good → solid">${esc(L.status)}</span></div>`;
    if (L.kind === "review"){
      app.innerHTML = bar() + hero(`Lesson ${L.id} · Review`) + `<h2>What you've learned</h2>
        <div class="recap">${L.recap.map((r, i) => `<div class="rc"><span class="num">${i + 1}</span><div>
          <h3>${zhHTML(md(r.topic, T.key), 1)}</h3><p>${zhHTML(md(r.text, T.key), 1)}</p>
          ${r.examples ? `<div class="rx" data-zh="classical">${(simp ? r.examples_s : r.examples).map(x => `<span>${zhLineClassical(x)}</span>`).join("")}</div>` : ""}
          <div class="refs">${(r.refs || []).map(x => md(x, T.key)).join("")}</div></div></div>`).join("")}</div>
        ${exerciseHTML("Exercise · translate")}${finish()}<footer>Exercise texts: public domain. Course content CC BY-SA 4.0.</footer>`;
      return;
    }
    const prose = T.key === "baihua";
    app.innerHTML = bar() + hero(`Lesson ${L.id} · ${esc(prose ? L.source.author : Z(L.source, "work"))}`, `${esc(prose ? Z(L.source, "work") : L.source.author)} · ${esc(L.source.period)}`) + `
      <h2>Text</h2>
      <div class="pages ${prose ? "prose" : ""}">
        <div class="page left">${L.lines.map((l, i) => `<div class="ln ${l.p ? "p" : ""}" data-i="${i}"><div class="zh">${markLine(l, i)}</div>
          ${l.py ? `<div class="py">${esc(l.py)}</div>` : ""}<div class="en-inline">${esc(l.en)}</div></div>`).join("")}</div>
        <div class="page right">${L.lines.map((l, i) => `<div class="ln ${l.p ? "p" : ""}" data-i="${i}"><div class="en">${esc(l.en)}</div>
          ${l.lit ? `<div class="lit">lit. ${esc(l.lit)}</div>` : ""}</div>`).join("")}</div>
      </div>
      <h2>Notes</h2>
      <div class="notes">${L.notes.map(n => `<div class="note" id="n${n.n}"><span class="num">${n.n}</span><p><span class="at">${zhHTML(esc(Z(n, "at")), T.key === "wenyan")}</span>${zhHTML(md(n.text, T.key), T.key === "wenyan")}</p></div>`).join("")}</div>
      ${prose ? `<h2>Words beyond HSK 5</h2>${glHTML(L.glossary.filter(g => !g.hsk))}
        ${L.glossary.some(g => g.hsk) ? `<h2>Already in HSK 1–5 · here for the notes</h2>${glHTML(L.glossary.filter(g => g.hsk), true)}` : ""}`
        : `<h2>Glossary</h2>${glHTML(L.glossary)}`}
      ${exerciseHTML(prose ? "Roots · the classical sentences behind these words" : "Exercise · translate")}
      ${L.culture ? `<h2>Context</h2><div class="culture">${zhHTML(md(L.culture, T.key), 1)}</div>` : ""}
      ${finish()}
      <footer>Text: public domain (${esc(L.source.text_from)}). Course content CC BY-SA 4.0.</footer>`;
    syncHeights();
  }
  // Keep left/right lines aligned on wide screens.
  function syncHeights(){
    const left = $$(".page.left .ln"), right = $$(".page.right .ln");
    left.forEach((l, i) => { l.style.minHeight = ""; right[i].style.minHeight = ""; });
    if (innerWidth <= 720) return;
    left.forEach((l, i) => { const h = Math.max(l.offsetHeight, right[i].offsetHeight); l.style.minHeight = right[i].style.minHeight = h + "px"; });
  }

  /* ---------- pop-ups ---------- */
  let popY = 0;
  function place(el){
    pop.style.display = "block"; popY = scrollY;
    const r = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + "px";
    pop.style.top = Math.max(8, r.bottom + 8 + ph > innerHeight ? r.top - ph - 8 : r.bottom + 8) + "px";
  }
  function showWord(el){
    const g = L.glossary[+el.dataset.g];
    $$(".w.on,sup.nn.on").forEach(x => x.classList.remove("on")); el.classList.add("on");
    pop.className = "";
    pop.innerHTML = `<span class="c">${esc(Z(g, "w"))}</span><span class="p">${esc(g.py)}</span><div>${esc(g.en)}</div>${g.sw ? `<div class="sw">說文：${esc(g.sw)}</div>` : ""}`;
    place(el);
  }
  function showNote(el){
    const n = L.notes.find(x => x.n === +el.dataset.n);
    $$(".w.on,sup.nn.on").forEach(x => x.classList.remove("on")); el.classList.add("on");
    pop.className = "note-pop";
    pop.innerHTML = `<div class="nh"><span class="num">${n.n}</span><span class="c">${esc(Z(n, "at"))}</span></div>
      <div class="nb">${md(n.text, T.key)}</div><button class="goto" data-n="${n.n}">All notes ↓</button>`;
    place(el);
  }
  function hidePop(){ pop.style.display = "none"; pop.className = ""; $$(".w.on,sup.nn.on").forEach(x => x.classList.remove("on")); }
  // TEMP wiring: the course's own gloss of a word, for the dictionary sheet (agent A's courseGloss replaces this)
  function courseGloss(w){
    const tr = typeof T !== "undefined" && T;
    if (tr && L && L.glossary){ const g = L.glossary.find(g => g.w === w || g.w_s === w); if (g) return {html: `<b>${esc(g.py)}</b> ${esc(g.en)}`, key: "g:" + w}; }
    if (tr && L && L.items){ const it = L.items.find(i => i.w === w || i.w_s === w); if (it) return {html: `<b>${esc(it.py)}</b> ${esc(it.en)}`, key: "c:" + w}; }
    const D = course.tracks[0].dict || {}, d = D[w] || Object.values(D).find(x => x.t === w);
    if (d && (d.fr || d.en)) return {html: `<b>${esc(d.py)}</b> ${esc((rlang === "fr" && d.fr) || d.en)}`, key: "r:" + w};
    return null;
  }
  function flash(n){ if (!n) return; n.scrollIntoView({behavior: "smooth", block: "center"}); n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash"); }
