  /* home.js: track home (文言, 白話, 成語), sealHTML */
  /* ---------- track home ---------- */
  const sealHTML = (t, cls = "") => { const cs = [...t].filter(c => /\p{Script=Han}/u.test(c)).slice(0, 4); return `<div class="seal ${cs.length < 2 ? "one" : ""} ${cls}" aria-hidden="true">${cs.map(c => `<span>${esc(c)}</span>`).join("")}</div>`; };
  function home(){
    const ls = T.lessons, nDone = ls.filter(l => isDone(T, l)).length, next = ls.find(l => !isDone(T, l));
    let body;
    if (!ls.length) body = `<div class="empty"><b>No ${esc(T.zh)} lessons in this build yet.</b><br>
      The tab is ready: put the lesson files in <code>${T.key === "wenyan" ? "lessons" : T.key}/</code> and run <code>python3 tools/build.py</code>.</div>`;
    else body = `
      ${next ? `<div class="next"><div class="t"><div class="kicker">${nDone ? "Next lesson" : "Start here"} · ${next.id}</div>
          <div class="zh1">${esc(Z(next, "title"))}</div><div class="te">${esc(next.title_en)}</div></div>
          <a class="btn red" href="#${T.key}/${next.id}">${nDone ? "Continue" : "Start"}</a></div>`
        : `<div class="next"><div class="t"><div class="kicker">All done</div><div class="te">Every lesson written so far is marked as done.</div></div></div>`}
      <div class="prog">${nDone} of ${ls.length} done</div>
      <h2>Lessons</h2>
      <div class="grid">${ls.map(l => `<a class="tile ${isDone(T, l) ? "done" : ""} ${l.kind === "review" ? "rev" : ""}" href="#${T.key}/${l.id}">
        <div class="n">${l.id}${l.kind === "review" ? " · REVIEW" : ""}</div><div class="z">${esc(Z(l, "title"))}</div><div class="te">${esc(l.title_en)}</div></a>`).join("")}</div>`;
    app.innerHTML = `<section class="thead">${sealHTML(T.zh)}<div><div class="kicker">${esc(T.en)}</div><h1>${esc(T.zh)}</h1><p>${esc(T.about)}</p></div></section>${body}
      <footer>Course content CC BY-SA 4.0 · code MIT · classical and pre-1950s texts are in the public domain.</footer>`;
    scrollTo(0, 0);
  }
