  /* rumen.js: what only 入門 has: its strings, words with pinyin above (tokens), its word cards and the words inside
     its notes, the dialogue with speakers and the second wave, new words, multiple choice, NHSK bars, the 100-lesson plan */
  Object.assign(UI.fr, {plan: "Les 100 leçons", planned: "à venir", dialogue: "Dialogue", words: "Mots nouveaux", practice: "Exercices",
    translate: "Traduisez", choose: "Choisissez le bon mot", name: "nom propre", outside: "hors NHSK", auto: "Liste NHSK (anglais)",
    wave: "Deuxième vague", waveDo: "Avec cette leçon, refaites la leçon {n} en sens inverse : lisez la traduction, dites le chinois.",
    waveIntro: "Chaque ligne montre la traduction. Dites-la en chinois à voix haute, puis touchez « Voir le chinois » pour vérifier.",
    showZh: "Voir le chinois", showAll: "Tout afficher", homeKicker: "Débutant", written: "Dialogues écrits pour le cours",
    about: "Le mandarin depuis zéro, à la manière d'Assimil : 100 leçons qui suivent Marc pendant un an à Pékin, jusqu'au NHSK 4 (2 000 mots).",
    nhsk: "Mots appris (leçons terminées)"});
  Object.assign(UI.en, {plan: "The 100 lessons", planned: "to come", dialogue: "Dialogue", words: "New words", practice: "Practice",
    translate: "Translate", choose: "Pick the right word", name: "name", outside: "not in NHSK", auto: "NHSK list (English)",
    wave: "Second wave", waveDo: "With this lesson, also redo lesson {n} the other way round: read the translation, say the Chinese.",
    waveIntro: "Each line shows the translation. Say it in Chinese out loud, then tap “Show Chinese” to check.",
    showZh: "Show Chinese", showAll: "Show all", homeKicker: "Start", written: "Dialogues written for the course",
    about: "Mandarin from zero, the Assimil way: 100 lessons following Marc through a year in Beijing, up to NHSK 4 (2,000 words).",
    nhsk: "Words learned (lessons done)"});
  CFG.rumen.zhRun = rumenRun;

  // a word on screen: characters with the pinyin above (punctuation and spaces as they are)
  const tokHTML = tok => tok.k ? `<span class="tok" tabindex="0" data-k="${esc(tok.k)}"><ruby>${esc(SIMP ? tok.s : tok.t)}<rt>${esc(tok.p || "")}</rt></ruby></span>` : esc(SIMP ? tok.s : tok.t);
  const sentHTML = toks => toks.map(tokHTML).join("");
  const sentText = toks => toks.map(x => SIMP ? x.s : x.t).join("");
  // the course's words, by either script
  let RIDX = null;
  function rumenKey(w){
    if (!RIDX){ const D = track("rumen").dict; RIDX = {}; for (const k in D) RIDX[k] = k; for (const k in D) if (!RIDX[D[k].t]) RIDX[D[k].t] = k; }
    return RIDX[w] || null;
  }
  // Chinese inside a 入門 note: the course's words (longest match) open their card, the rest goes through han()
  function rumenRun(run){
    const a = [...run]; let out = "", plain = "", i = 0;
    while (i < a.length){
      let j = Math.min(a.length, i + 8);
      for (; j > i + 1; j--) if (rumenKey(a.slice(i, j).join(""))) break;
      const w = a.slice(i, j).join(""), k = rumenKey(w);
      if (k){ if (plain) out += han(plain); plain = ""; out += `<span class="wt" data-k="${esc(k)}">${esc(w)}</span>`; } else plain += w;
      i = j;
    }
    return out + (plain ? han(plain) : "");
  }
  const lvHTML = d => d.name ? `<span class="lv off">${t_("name")}</span>` : d.lvl ? `<span class="lv">NHSK ${esc(d.lvl)}</span>` : `<span class="lv off">${t_("outside")}</span>`;
  // the card of a 入門 word: both scripts, pinyin, NHSK level, our gloss (else the NHSK list's English, marked), the
  // lesson that teaches it, the lessons that use it, its characters
  function rumenCard(k){
    const D = track("rumen").dict, d = D[k]; if (!d) return null;
    const lg = lang(), gloss = d[lg] || d.en || "", main = SIMP ? d.s : d.t;
    const lz = x => `<button data-to="rumen/${x}">${T && T.key === "rumen" ? t_("lesson") : "入門"} ${x}</button>`;
    return {main, other: SIMP ? d.t : d.s, word: main, py: d.py, lv: lvHTML(d), gloss: gloss || d.auto || "", src: !gloss && d.auto ? t_("auto") : "",
      taught: d.first ? [lz(d.first)] : [], seen: (d.seen || []).filter(x => x !== d.first && x !== (L && L.id)).map(lz),
      chars: [...d.s].length > 1 ? [...d.s].filter(c => D[c]).map(c => `<button data-k="${esc(c)}"><span class="han">${esc(SIMP ? c : D[c].t)}</span> ${esc(D[c].py)}${D[c][lg] || D[c].en ? " · " + esc(D[c][lg] || D[c].en) : ""}</button>`) : []};
  }

  // the dialogue (or, on a second-wave page, the translation with "Show Chinese" under it)
  function rumenDialogue(wave){
    const notesBy = {}, who = [...new Set(L.lines.map(l => l.who))], lg = lang();
    (L.notes || []).forEach((n, i) => (notesBy[n.line] ||= []).push(i));
    const trHTML = (l, cv) => `<div class="tr ${cv ? "cvt" : ""}">${esc(tx(l))}${l["lit_" + lg] ? `<span class="lit">${esc(l["lit_" + lg])}</span>` : ""}</div>`;
    return `<h2 id="dlg">${t_("dialogue")}</h2>
      <div class="dlg">${L.lines.map((l, li) => `<div class="sent" id="line-${l.n}" ${wave ? "" : `data-cv="${li}"`}>
        <div class="who">${l.who ? `<span class="av ${["", "b", "c"][who.indexOf(l.who) % 3]}">${esc([...Z(l, "who")][0])}</span>${esc(Z(l, "who"))}` : ""}<span class="n">${l.n}</span></div>
        ${wave ? `${trHTML(l)}<button class="showzh" data-act="show" data-i="${li}">${t_("showZh")}</button><div class="txt" id="zh-${li}" hidden${zs(sentText(l.toks))}>${sentHTML(l.toks)}</div>`
          : `<div class="txt"${zs(sentText(l.toks))}>${sentHTML(l.toks)}</div>${trHTML(l, true)}`}
        ${wave ? "" : `<div class="under">${(notesBy[l.n] || []).map(k => `<button class="nlink" data-note="${k}" aria-label="${t_("note")} ${k + 1}">${k + 1}</button>`).join("")}</div>`}
      </div>`).join("")}</div>
      ${wave ? `<div class="row" style="border:0"><button class="btn ghost" id="showAll" data-act="showall">${t_("showAll")}</button></div>` : ""}`;
  }
  function rumenWords(){
    if (!L.words || !L.words.length) return "";
    return `<h2 id="sec-words">${t_("words")} · ${L.words.length}</h2><div class="wgrid">${L.words.map(x => chipHTML({attr: `data-k="${esc(x.w)}"`,
      w: SIMP ? x.w : x.t, py: x.py, lv: x.lvl ? `<span class="lv">NHSK ${esc(x.lvl)}</span>` : `<span class="lv off">${t_("outside")}</span>`, g: tx(x)})).join("")}</div>`;
  }
  // multiple choice: a right answer fills the gap and shows the whole sentence with its pinyin and translation
  // The question is cut once, whole, with the answer in the gap (as the build checks it: chooseFull), and the gap is
  // drawn inside that cut, so the words on each side of it are the words of the full sentence.
  const chooseFull = (h, a) => h.split("＿＿").join(a);
  function chooseHTML(e){
    const h = Z(e, "h"), a = Z(e, "opts")[e.opts.indexOf(e.a)] ?? "", full = chooseFull(h, a), P = zhPieces(full), parts = h.split("＿＿");
    let out = "", at = 0;
    parts.forEach((p, i) => { out += P(at, at + p.length); at += p.length; if (i < parts.length - 1){ out += '<span class="gap">？</span>'; at += a.length; } });
    return out;
  }
  const exChoose = (e, qi) => `<div class="q" data-q="${qi}"><div class="txt"${zs(chooseFull(Z(e, "h"), Z(e, "opts")[e.opts.indexOf(e.a)] ?? ""))}>${chooseHTML(e)}</div>
    <div class="opts">${Z(e, "opts").map((o, oi) => `<button class="opt" data-act="opt" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join("")}</div>
    <div class="after" hidden><div class="txt"${zs(sentText(e.toks))}>${sentHTML(e.toks)}</div><div>${esc(tx(e))}</div></div></div>`;
  function rumenOpt(b){
    const e = L.exercise.choose[+b.dataset.q], q = b.closest(".q"), ai = e.opts.indexOf(e.a);
    if (q.dataset.ok) return;
    b.classList.add(+b.dataset.o === ai ? "ok" : "no");
    if (+b.dataset.o === ai){ q.dataset.ok = 1; q.querySelectorAll(".gap").forEach(g => g.textContent = Z(e, "opts")[ai]); q.querySelector(".after").hidden = false; }
  }
  Object.assign(SEC, {
    dialogue: rumenDialogue,
    setting: wave => wave ? `<p class="setting">${esc(t_("waveIntro"))}</p>` : L.setting ? `<p class="setting">${esc(tx(L.setting))}</p>` : "",
    // from lesson 50: redo lesson N − 49 the other way round
    wavecard(){ const w = L.id - CFG.rumen.wave, wl = L.id > CFG.rumen.wave && T.lessons.find(l => l.id === w);
      return wl ? `<a class="wavecard" href="#rumen/${w}/wave"><span class="kicker">${t_("wave")}${done["rumen:" + w + ":wave"] ? " · ✓" : ""}</span><br>${esc(t_("waveDo").replace("{n}", w))}</a>` : ""; },
    lnav(){ const ex = L.exercise || {};
      return `<nav class="lnav">${[["dlg", t_("dialogue"), 1], ["sec-notes", t_("notes"), L.notes && L.notes.length], ["sec-words", t_("words"), L.words && L.words.length], ["sec-ex", t_("practice"), ex.translate || ex.choose]]
        .filter(c => c[2]).map(([id, x]) => `<button data-jump="${id}">${x}</button>`).join("")}</nav>`; }
  });

  // the 入門 home: NHSK 1–4 bars (the words of the lessons marked done), the grid of the 100 planned lessons
  function rumenHome(){
    const ls = T.lessons, byId = Object.fromEntries(ls.map(l => [l.id, l])), got = {1: 0, 2: 0, 3: 0, 4: 0};
    ls.filter(l => isDone(T, l)).forEach(l => (l.words || []).forEach(w => { if (got[w.lvl] != null) got[w.lvl]++; }));
    const cov = ["1", "2", "3", "4"].map(k => `<span>NHSK ${k}</span><span class="bar"><i style="width:${Math.min(100, 100 * got[k] / T.nhsk_total[k])}%"></i></span><span>${got[k]} / ${T.nhsk_total[k]}</span>`).join("");
    return {kicker: t_("homeKicker"), title: SIMP ? "入门" : "入門", about: t_("about"), gridTitle: t_("plan"),
      extra: `<div class="cov" aria-label="${esc(t_("nhsk"))}">${cov}</div>`,
      tiles: T.plan.map(p => { const l = byId[p.id]; return p.review ? {id: p.id, l, rev: true, z: "復習"} : {id: p.id, l, z: l ? Z(l, "title") : Z(p, "zh"), te: l ? tx(l, "title_") : p[lang()]}; }),
      footer: "NHSK = HSK 3.0, syllabus of November 2025 (word list: github.com/bezlant/hsk-3-vocabulary, CC BY-SA 4.0). Course content CC BY-SA 4.0 · code MIT."};
  }
