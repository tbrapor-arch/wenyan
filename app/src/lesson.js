  /* lesson.js: the one lesson page of every track: showLesson, hero, finish, the sections (SEC) CFG names, markLine,
     word chips, exercises (translate on tap), recap, syncHeights */
  const zs = t => ` data-zhs="${esc(t)}"`;                        // the sentence a tapped word sits in (word card, dictExtra)
  const CL = on => on ? ' data-zh="classical"' : "";
  function showLesson(wave){
    const c = CFG[T.key], secs = wave ? c.wavebody : L.kind === "review" && c.review ? c.review : c.body;
    app.innerHTML = toolbar(wave) + hero(wave) + secs.map(s => SEC[s](wave)).join("") + finish(wave) + `<footer>${c.footer(L, wave)}</footer>`;
    if ($(".pages")) syncHeights();
  }
  function hero(wave){
    const c = CFG[T.key];
    return `<section class="hero">${sealHTML(Z(L, "title"))}<div><div class="kicker">${c.kicker(L, wave)}</div>
        <h1>${esc(Z(L, "title"))}</h1><div class="sub">${L.title_py ? esc(L.title_py) + " — " : ""}${esc(tx(L, "title_"))}</div></div></section>
      ${L.intro ? `<p class="intro">${md(L.intro)}</p>` : ""}<div class="meta">${c.meta ? c.meta(L) : ""}<span class="badge" title="draft → good → solid">${esc(L.status)}</span></div>`;
  }
  function finish(wave){
    const key = `${T.key}:${L.id}${wave ? ":wave" : ""}`, d = done[key], n = T.lessons[T.lessons.indexOf(L) + 1];
    return `<div class="finish"><div class="msg">${d ? `<b>${t_("doneOn")}</b> ${esc(d)}.` : `<b>${t_("finished")}</b><small>${t_("keep")}</small>`}</div>
      ${d ? `<button class="btn ghost" id="undo" data-act="undo" data-key="${key}">${t_("undo")}</button>` : `<button class="btn red" id="markdone" data-act="done" data-key="${key}">${t_("markDone")}</button>`}
      ${n && !wave ? `<a class="btn ghost" href="#${T.key}/${n.id}">${t_("nextLesson")} ›</a>` : ""}</div>`;
  }

  // Glossary words (longest match first) as tappable words, note numbers after the characters they are about; the
  // rest of the line is the dictionary's words of the whole line (zhPieces: cut once, so a word keeps the reading the
  // whole sentence gives it), else han() in runs.
  function markLine(line, i, classical){
    const t = Z(line, "h"), ends = {};
    const words = L.glossary.map((g, gi) => ({w: Z(g, "w"), gi})).filter(x => x.w).sort((a, b) => b.w.length - a.w.length);
    L.notes.forEach((n, ni) => { if (n.line !== i) return; const at = Z(n, "at"), p = t.indexOf(at); if (p >= 0) (ends[p + at.length - 1] ||= []).push(ni); });
    const piece = typeof zhPieces === "function" ? zhPieces(t, classical) : (a, b) => han(t.slice(a, b), classical);
    let out = "", p0 = -1, k = 0;
    const flush = end => { if (p0 >= 0) out += piece(p0, end); p0 = -1; };
    while (k < t.length){
      const m = words.find(x => t.startsWith(x.w, k)), len = m ? m.w.length : 1;
      if (m){ flush(k); out += `<span class="w" data-g="${m.gi}">${esc(t.slice(k, k + len))}</span>`; } else if (p0 < 0) p0 = k;
      for (let j = k; j < k + len; j++) if (ends[j]){ flush(j + 1); out += ends[j].map(ni => `<sup class="nn" data-note="${ni}" role="button" aria-label="${t_("note")} ${L.notes[ni].n}">${L.notes[ni].n}</sup>`).join(""); }
      k += len;
    }
    flush(t.length);
    return out;
  }
  // a word chip (new words, glossary): {attr: 'data-k="…"' or 'data-g="…"', w, py, lv, g, sw, known}
  const chipHTML = x => `<button class="wchip ${x.known ? "known" : ""}" ${x.attr}><b>${esc(x.w)}</b><span class="r">${esc(x.py)}${x.lv || ""}</span><span class="g">${esc(x.g)}</span>
    ${x.sw ? `<span class="sw"><b>說文</b>${esc(x.sw)}</span>` : ""}</button>`;
  const glossChips = gs => `<div class="wgrid">${gs.map(g => chipHTML({attr: `data-g="${L.glossary.indexOf(g)}"`, w: Z(g, "w"), py: g.py,
    lv: g.hsk ? `<span class="lv off">HSK ${g.hsk}</span>` : "", g: g.en, sw: g.sw, known: !!g.hsk})).join("")}</div>`;
  const noteText = n => md(n.text != null ? n.text : Z(n, lang()), T.key, CFG[T.key].zhRun);
  function exTranslate(e){
    const c = CFG[T.key], cl = !!(c.classical || c.rootsClassical), h = e.toks ? null : Z(e, "h");
    return `<div class="q">${e.toks ? `<div class="txt"${zs(e.toks.map(x => SIMP ? x.s : x.t).join(""))}>${sentHTML(e.toks)}</div>` : `<div class="txt"${CL(cl)}${zs(h)}>${han(h, cl)}</div>`}
      ${e.py && !e.toks ? `<div class="py">${esc(e.py)}</div>` : ""}
      ${e.src ? `<div class="src">${esc(e.src)}${e.to ? ` · <button class="ref" data-to="${e.to.track}/${e.to.id}">${t_("open")}</button>` : ""}</div>` : ""}
      <details class="ans"><summary>${t_("answer")}</summary><p>${esc(tx(e))}</p>${e.tests ? `<p class="tests">${t_("practises")}: ${md(e.tests, T.key, run => han(run, cl))}</p>` : ""}</details></div>`;
  }

  // The sections a lesson is made of, in the order CFG gives (rumen.js and chengyu.js add theirs).
  const SEC = {
    // the text and its translation, side by side (one column on a phone, the translation under each line)
    pages(){
      const c = CFG[T.key], cl = !!c.classical;
      return `<h2>Text</h2><div class="pages ${c.prose ? "prose" : ""}">
        <div class="page left">${L.lines.map((l, i) => `<div class="ln ${l.p ? "p" : ""}" data-i="${i}" data-cv="${i}"><div class="zh"${CL(cl)}${zs(Z(l, "h"))}>${markLine(l, i, cl)}</div>
          ${l.py ? `<div class="py">${esc(l.py)}</div>` : ""}<div class="en-inline cvt">${esc(l.en)}</div></div>`).join("")}</div>
        <div class="page right">${L.lines.map((l, i) => `<div class="ln ${l.p ? "p" : ""}" data-i="${i}" data-cv="${i}"><div class="en cvt">${esc(l.en)}</div>
          ${l.lit ? `<div class="lit cvt">lit. ${esc(l.lit)}</div>` : ""}</div>`).join("")}</div>
      </div>`;
    },
    // every note of the lesson: open under the text (文言, 白話) or folded (入門, whose notes open from the line numbers)
    notes(){
      if (!L.notes || !L.notes.length) return "";
      const list = `<div class="notes">${L.notes.map(n => `<div class="note" id="n${n.n}"><span class="num">${n.n}</span><p>
        ${n.topic ? `<span class="tag">${esc(t_("topics")[n.topic] || n.topic)} · <button class="ref" data-line="${n.line}">${t_("line")} ${n.line}</button></span>` : ""}
        ${n.at ? `<span class="at"${CL(CFG[T.key].classical)}>${han(Z(n, "at"), CFG[T.key].classical)}</span>` : ""}<span class="ntext">${noteText(n)}</span></p></div>`).join("")}</div>`;
      return CFG[T.key].notes === "folded" ? `<details class="allnotes" id="sec-notes"><summary>${t_("allNotes")} (${L.notes.length})</summary>${list}</details>`
        : `<h2 id="sec-notes">${t_("notes")}</h2>${list}`;
    },
    words(){
      const w = CFG[T.key].words;
      if (w === "grid") return rumenWords();
      if (w === "glossary") return `<h2 id="sec-words">Glossary</h2>${glossChips(L.glossary)}`;
      const known = L.glossary.filter(g => g.hsk);
      return `<h2 id="sec-words">Words beyond HSK 5</h2>${glossChips(L.glossary.filter(g => !g.hsk))}
        ${known.length ? `<h2>Already in HSK 1–5 · here for the notes</h2>${glossChips(known)}` : ""}`;
    },
    // exercises: translate (answer on tap), then multiple choice (入門)
    practice(){
      const c = CFG[T.key], ex = L.exercise; if (!ex) return "";
      const tr = Array.isArray(ex) ? ex : ex.translate || [], ch = Array.isArray(ex) ? [] : ex.choose || [];
      if (!tr.length && !ch.length) return "";
      const many = c.ex.length > 1;
      return `<h2 id="sec-ex">${esc(c.exTitle ? c.exTitle(L) : t_("practice"))}</h2><div class="prac">
        ${tr.length ? (many ? `<div class="ntag">1 · ${t_("translate")}</div>` : "") + tr.map(exTranslate).join("") : ""}
        ${ch.length ? (many ? `<div class="ntag">2 · ${t_("choose")}</div>` : "") + ch.map(exChoose).join("") : ""}</div>`;
    },
    // review lessons: the points to revise, with examples and the notes that taught them
    recap(){
      if (!L.recap) return "";
      const c = CFG[T.key], cl = !!c.classical;
      return `<h2>${T.key === "rumen" ? t_("review") : "What you've learned"}</h2><div class="recap">${L.recap.map((r, i) => `<div class="rc"><span class="num">${i + 1}</span><div>
        ${r.topic ? `<h3>${md(r.topic)}</h3>` : ""}<p class="ntext">${r.text != null ? md(r.text) : md(Z(r, lang()), T.key, c.zhRun)}</p>
        ${r.examples ? `<div class="rx"${CL(cl)}>${(SIMP ? r.examples_s : r.examples).map(x => `<span>${han(x, cl)}</span>`).join("")}</div>` : ""}
        ${r.refs ? `<div class="refs">${r.refs.map(x => md(x)).join("")}</div>` : ""}</div></div>`).join("")}</div>`;
    },
    culture: () => L.culture ? `<h2>Context</h2><div class="culture">${md(L.culture)}</div>` : ""
  };
  // keep left / right lines aligned on wide screens
  function syncHeights(){
    const left = $$(".page.left .ln"), right = $$(".page.right .ln");
    left.forEach((l, i) => { l.style.minHeight = ""; right[i].style.minHeight = ""; });
    if (innerWidth <= 720) return;
    left.forEach((l, i) => { const h = Math.max(l.offsetHeight, right[i].offsetHeight); l.style.minHeight = right[i].style.minHeight = h + "px"; });
  }
