  /* home.js: the track home (next lesson card, count done, tile grid) for every track, sealHTML */
  const sealHTML = (t, cls = "") => { const cs = [...t].filter(c => /\p{Script=Han}/u.test(c)).slice(0, 4); return `<div class="seal ${cs.length < 2 ? "one" : ""} ${cls}" aria-hidden="true">${cs.map(c => `<span>${esc(c)}</span>`).join("")}</div>`; };
  // a tile: {id, l (the lesson, if written), rev, z, te}; a tile without a lesson is greyed (planned, not written yet)
  const tileHTML = x => { const tag = x.l ? `a href="#${T.key}/${x.id}"` : "div", st = x.l ? (isDone(T, x.l) ? "done" : "") : "planned";
    return `<${tag} class="tile ${st} ${x.rev ? "rev" : ""}"><div class="n">${x.id}${x.rev ? " · " + t_("review").toUpperCase() : x.l ? "" : " · " + t_("planned")}</div>
      <div class="z">${esc(x.z)}</div>${x.te ? `<div class="te">${esc(x.te)}</div>` : ""}</${x.l ? "a" : "div"}>`; };
  // what a track's home shows; 入門 overrides it (rumenHome in rumen.js)
  const HOME0 = () => ({kicker: T.en, title: T.zh, about: T.about, extra: "",
    tiles: T.lessons.map(l => ({id: l.id, l, rev: l.kind === "review", z: Z(l, "title"), te: l.title_en})),
    footer: "Course content CC BY-SA 4.0 · code MIT · classical and pre-1950s texts are in the public domain."});
  function showHome(){
    const c = CFG[T.key], h = {...HOME0(), ...(c.home ? c.home() : {})}, ls = T.lessons;
    const nDone = ls.filter(l => isDone(T, l)).length, next = ls.find(l => !isDone(T, l));
    let body;
    if (!ls.length) body = `<div class="empty"><b>No ${esc(T.zh)} lessons in this build yet.</b><br>
      The tab is ready: put the lesson files in <code>${T.key === "wenyan" ? "lessons" : T.key}/</code> and run <code>make app</code>.</div>`;
    else body = `
      ${next ? `<div class="next"><div class="t"><div class="kicker">${nDone ? t_("nextLesson") : t_("startHere")} · ${next.id}</div>
          <div class="zh1">${esc(Z(next, "title"))}</div><div class="te">${esc(tx(next, "title_"))}</div></div>
          <a class="btn red" href="#${T.key}/${next.id}">${nDone ? t_("cont") : t_("start")}</a></div>`
        : `<div class="next"><div class="t"><div class="kicker">${t_("allDone")}</div><div class="te">${t_("allDoneText")}</div></div></div>`}
      <div class="prog">${t_("count")(nDone, ls.length)}</div>${h.extra}
      <h2>${esc(h.gridTitle || t_("lessons"))}</h2>
      <div class="grid">${h.tiles.map(tileHTML).join("")}</div>`;
    app.innerHTML = `<section class="thead">${sealHTML(T.zh)}<div><div class="kicker">${esc(h.kicker)}</div><h1>${esc(h.title)}</h1><p>${esc(h.about)}</p></div></section>${body}
      <footer>${h.footer}</footer>`;
  }
