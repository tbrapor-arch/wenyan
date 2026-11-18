  /* chengyu.js: 成語 lesson */
  function chengyuLesson(){
    const auto = '<span class="auto" title="Generated pinyin, not yet checked by hand">AUTO</span>';
    const sent = (x, it) => { const w = esc(Z(it, "w")); return esc(simp ? x.h_s : x.h_t).split(w).join(`<mark>${w}</mark>`); };
    app.innerHTML = bar() + `<section class="hero">${sealHTML(Z(L, "title"))}<div><div class="kicker">成語 · Lesson ${L.id}</div>
        <h1>${esc(Z(L, "title"))}</h1><div class="sub">${L.title_py ? esc(L.title_py) + " — " : ""}${esc(L.title_en)}</div></div></section>
      ${L.intro ? `<p class="intro">${md(L.intro, T.key)}</p>` : ""}<div class="meta"><span class="badge">${esc(L.status)}</span></div>
      ${L.frames?.length ? `<h2>Patterns</h2><div class="frames">${L.frames.map(f => `<div class="frame"><b>${esc(Z(f, "f"))}</b><span>${esc(f.en)}</span>
        <span class="fx">${esc((simp && f.ex_s ? f.ex_s : f.ex).join("、"))}</span></div>`).join("")}</div>` : ""}
      <h2>${L.items.length} 成語</h2>
      <div class="cys">${L.items.map((it, i) => { const x = it.ex || {}, o = it.origin; return `<div class="cy">
        <div class="cyr"><div class="cl"><div class="hw"><span class="cn">${i + 1}</span>${esc(Z(it, "w"))}<span class="alt">${esc(simp ? it.w : it.w_s)}</span></div>
          <div class="py">${esc(it.py)}${it.py_tw ? `<small>TW ${esc(it.py_tw)}</small>` : ""}</div>${it.lit ? `<div class="lit">${esc(it.lit)}</div>` : ""}</div>
        <div class="cr"><div class="mean">${esc(it.en)}</div>${it.note ? `<div class="nt">${md(it.note, "wenyan")}</div>` : ""}
          ${o ? `<div class="or"><span class="zh">${esc(Z(o, "text"))}</span> <span class="ow">— ${esc(o.work)}</span></div>` : ""}</div></div>
        <div class="cyr"><div class="cl"><div class="xz">${sent(x, it)}</div>${x.py ? `<div class="py">${esc(x.py)}${x.py_auto ? auto : ""}</div>` : ""}</div>
        <div class="cr"><div class="xe">${esc(x.en)}</div><div class="xs">${esc(x.src)}</div></div></div></div>`; }).join("")}</div>
      ${finish()}<footer>Examples: Tatoeba (CC BY 2.0 FR), Chinese Wikipedia (CC BY-SA 4.0). Frequency: wordfreq (CC BY-SA 4.0). Course content CC BY-SA 4.0.</footer>`;
  }
