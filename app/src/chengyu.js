  /* chengyu.js: the 成語 lesson's sections: patterns (frames) and the two-row 成語 card */
  // Each 成語 is two rows: 成語 | meaning (note, origin), then example | translation; on a phone they stack in that
  // order. Cover blurs the right column; tap a 成語's card to check, its headword for its word card.
  Object.assign(SEC, {
    frames: () => L.frames && L.frames.length ? `<h2>Patterns</h2><div class="frames">${L.frames.map(f => `<div class="frame"><b>${esc(Z(f, "f"))}</b><span>${esc(f.en)}</span>
      <span class="fx">${han((SIMP && f.ex_s ? f.ex_s : f.ex).join("、"))}</span></div>`).join("")}</div>` : "",
    cards(){
      const auto = '<span class="auto" title="Generated pinyin, not yet checked by hand">AUTO</span>';
      // the example as found, the 成語 in it marked, the rest through han()
      const sent = (x, it) => { const w = Z(it, "w"), h = SIMP ? x.h_s : x.h_t; return h.split(w).map(p => han(p)).join(`<mark>${esc(w)}</mark>`); };
      return `<h2>${L.items.length} 成語</h2>
      <div class="cys">${L.items.map((it, i) => { const x = it.ex || {}, o = it.origin; return `<div class="cy" data-cv="${i}">
        <div class="cyr"><div class="cl"><div class="hw"><span class="cn">${i + 1}</span><span class="cw" data-c="${i}" role="button" tabindex="0">${esc(Z(it, "w"))}</span><span class="alt">${esc(SIMP ? it.w : it.w_s)}</span></div>
          <div class="py">${esc(it.py)}${it.py_tw ? `<small>TW ${esc(it.py_tw)}</small>` : ""}</div>${it.lit ? `<div class="lit">${esc(it.lit)}</div>` : ""}</div>
        <div class="cr cvt"><div class="mean">${esc(it.en)}</div>${it.note ? `<div class="nt">${md(it.note, "wenyan")}</div>` : ""}
          ${o ? `<div class="or"><span class="zh"${CL(true)}>${han(Z(o, "text"), true)}</span> <span class="ow">— ${esc(o.work)}</span></div>` : ""}</div></div>
        <div class="cyr"><div class="cl"><div class="xz"${zs(SIMP ? x.h_s : x.h_t)}>${x.h_t ? sent(x, it) : ""}</div>${x.py ? `<div class="py">${esc(x.py)}${x.py_auto ? auto : ""}</div>` : ""}</div>
        <div class="cr cvt"><div class="xe">${esc(x.en)}</div><div class="xs">${esc(x.src)}</div></div></div></div>`; }).join("")}</div>`;
    }
  });
