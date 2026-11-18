  /* dict.js: dictionary: zhCut, zhLine, zhLineClassical, zhHTML, the dictionary sheet (openZh, openZhWord), dictExtra, zhAdd, DICT_CREDIT */
  /* ---------- dictionary (tools/zh_words.py builds the table; this repeats its cut) ----------
     DATA.zh  = {word: "score|pinyin<TAB>senses" lines, the default reading first; "score|=w": the lines of w}
     DATA.zhx = {run key: "token.line,…"}: the words whose reading in that run of Han characters is not line 0
     DATA.zhqt: the constant the cut subtracts per word; DATA.zhm = {word: "i n4 h3 o發/髮"}; DATA.zhp = {word: "parts"}
     The browser cuts each run again with the build's rule (highest total of word scores minus zhqt, the longer
     first word on a tie): `make app` fails if a text would be cut or read differently. The text is never altered:
     only its words are wrapped in spans. Automatic, not checked by a person. */

  // The two settings the dictionary reads, from the shell (core.js): the script on screen ("s" | "t": the track's
  // own script when Settings say "as written", SIMP), and the language of its labels (French only in 入門 with French
  // explanations, lang()). Off a track (Settings, a module tab): the script setting itself, English.
  function dictScript(){ try{ return T ? (SIMP ? "s" : "t") : S.script === "simp" ? "s" : "t"; }catch(e){ return "t"; } }
  function dictLang(){ try{ return lang() === "fr" ? "fr" : "en"; }catch(e){ return "en"; } }

  const DICT_CREDIT = "Dictionary: CC-CEDICT (MDBG, CC BY-SA 4.0), word frequencies from jieba (MIT), HSK lists from complete-hsk-vocabulary (MIT); cut and readings are automatic.";
  const ZH_V = 2;   // table format (Tsheh-tû's): a private module adds its own words only to a page that has this one
  const ZH_RUN = /([\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{3134f}]+)/u, ZH_HAN = /^[\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{3134f}]$/u;
  let ZH = null, ZHX = {}, ZHM = {}, ZHP = {}, ZH_QT = 0, ZH_REV = null;
  function zhData(){   // the course is parsed at boot (events.js): read the tables on first use
    if (ZH) return true;
    const c = (typeof course !== "undefined" && course) || null;
    if (!c) return false;
    ZH = c.zh || {}; ZHX = c.zhx || {}; ZHM = c.zhm || {}; ZHP = c.zhp || {}; ZH_QT = c.zhqt || 0;
    return true;
  }
  // a private module's words ({qt, w, x}, built by the same zh_words.py): added, never replacing the page's
  function zhAdd(t){
    if (!zhData() || !t || t.qt !== ZH_QT) return false;
    for (const k in t.w || {}) if (!(k in ZH)) ZH[k] = t.w[k];
    for (const k in t.x || {}) if (!(k in ZHX)) ZHX[k] = t.x[k];
    for (const k in t.m || {}) if (!(k in ZHM)){ ZHM[k] = t.m[k]; ZH_REV = null; }
    for (const k in t.p || {}) if (!(k in ZHP)) ZHP[k] = t.p[k];
    return true;
  }
  const zhBody = w => { const e = ZH[w]; if (e === undefined) return ""; const b = e.slice(e.indexOf("|") + 1); return b[0] === "=" ? zhBody(b.slice(1)) : b; };
  const zhTap = w => ZH[w] !== undefined && zhBody(w) !== "";
  function zhKey(t){ let h = 0x811c9dc5, n = 0; for (const c of t){ h = Math.imul(h ^ c.codePointAt(0), 0x01000193) >>> 0; n++; } return h.toString(36) + "." + n.toString(36); }
  // one run of Han characters -> its words (the build's dynamic programme, integer scores)
  function zhCutRun(cs){
    const n = cs.length, best = new Array(n + 1).fill(0), step = new Array(n + 1).fill(1);
    for (let i = n - 1; i >= 0; i--){
      let b = null;
      for (let k = Math.min(8, n - i); k > 0; k--){
        const e = ZH[cs.slice(i, i + k).join("")];
        if (e === undefined && k > 1) continue;
        const c = (e === undefined ? 0 : parseInt(e, 10)) - ZH_QT + best[i + k];
        if (b === null || c > b){ b = c; step[i] = k; }
      }
      best[i] = b;
    }
    const out = [];
    for (let i = 0; i < n; i += step[i]) out.push(cs.slice(i, i + step[i]).join(""));
    return out;
  }
  // text -> [string | [word, reading line]]; classical: one character at a time, default readings
  function zhCut(text, classical){
    const out = [], put = x => { if (out.length && typeof out[out.length - 1] === "string") out[out.length - 1] += x; else out.push(x); };
    if (!zhData()) return [String(text ?? "")];
    String(text ?? "").split(ZH_RUN).forEach((part, j) => {
      if (!part) return;
      if (j % 2 === 0) return put(part);
      const toks = [];
      for (const w of classical ? [...part] : zhCutRun([...part])) if (zhTap(w)){ toks.push([w, 0]); out.push(toks[toks.length - 1]); } else put(w);
      const x = !classical && ZHX[zhKey(part)];
      if (x) x.split(",").forEach(y => { const [a, b] = y.split(".").map(v => parseInt(v, 36)); if (toks[a]) toks[a][1] = b; });
    });
    return out;
  }
  const zhTok = (t, c) => `<span class="ztok" tabindex="0" role="button" data-z="${esc(t[0])}"${t[1] ? ` data-r="${t[1]}"` : ""}${c ? ' data-c="1"' : ""}>${esc(t[0])}</span>`;
  // Chinese text -> HTML: the text unaltered, each word a focusable span (role=button) that opens the dictionary
  function zhLine(text){ return zhCut(text).map(t => typeof t === "string" ? esc(t) : zhTok(t)).join(""); }
  // classical Chinese: never cut into words (the lesson's glossary is the authority), one character at a time
  function zhLineClassical(text){ return zhCut(text, true).map(t => typeof t === "string" ? esc(t) : zhTok(t, 1)).join(""); }
  // HTML already escaped (md() output) -> the same HTML with the Chinese of its text tappable; tags and buttons kept
  function zhHTML(html, classical){
    let skip = 0;
    return String(html ?? "").split(/(<[^>]*>)/).map(p => {
      if (p[0] === "<"){ if (/^<(button|a)\b/i.test(p)) skip++; else if (/^<\/(button|a)>/i.test(p)) skip = Math.max(0, skip - 1); return p; }
      if (skip || !ZH_RUN.test(p)) return p;
      return p.split(ZH_RUN).map((q, j) => j % 2 ? (classical ? zhLineClassical(q) : zhLine(q)) : q).join("");
    }).join("");
  }

  /* ---------- what a word shows ---------- */
  const zhLines = w => zhBody(w).split("\n").filter(Boolean).map(l => { const i = l.indexOf("\t"); return [l.slice(0, i), l.slice(i + 1)]; });
  function zhMeta(w){
    if (!ZH_REV){ ZH_REV = {}; for (const k in ZHM) for (const t of ZHM[k].split(" ")) if (t[0] === "o") for (const x of t.slice(1).split("/")) (ZH_REV[x] ||= []).push(k); }
    const own = (k) => { const m = {}; for (const t of (ZHM[k] || "").split(" ")) if (t) m[t[0]] = t.slice(1); return m; };
    const m = own(w), other = [...new Set([...(m.o ? m.o.split("/") : []), ...(ZH_REV[w] || [])])].filter(x => x !== w);
    for (const x of other){ const y = own(x); if (!m.n && y.n) m.n = y.n; if (!m.h && y.h) m.h = y.h; }
    return {idiom: "i" in m, nhsk: m.n || null, hsk: m.h || null, other};
  }
  const ZH_TONE = {a: "āáǎàa", e: "ēéěèe", i: "īíǐìi", o: "ōóǒòo", u: "ūúǔùu", "ü": "ǖǘǚǜü"};
  function zhMarks(num){   // CC-CEDICT "zhong1 guo2" -> "zhōng guó" (for cross-references inside senses)
    return num.split(/\s+/).map(s => {
      const m = s.replace(/u:/g, "ü").replace(/U:/g, "Ü").match(/^([A-Za-zü]+)([1-5])$/); if (!m) return s;
      const b = m[1], t = +m[2] - 1, low = b.toLowerCase();
      let i = low.includes("a") ? low.indexOf("a") : low.includes("e") ? low.indexOf("e") : low.includes("ou") ? low.indexOf("o") : Math.max(...[..."iouü"].map(v => low.lastIndexOf(v)));
      if (i < 0) return b;
      const mk = ZH_TONE[low[i]][t];
      return b.slice(0, i) + (b[i] !== low[i] ? mk.toUpperCase() : mk) + b.slice(i + 1);
    }).join(" ");
  }
  // "個|个[ge4]" -> 個 gè (the script shown), each form a tappable word
  function zhXref(d){
    const sc = dictScript();
    return esc(d).replace(/([^\s|\[\],;:()]*)(?:\|([^\s|\[\],;:()]+))?\[([A-Za-z:1-5 \-]+)\]/g, (m, a, b, p) => {
      const py = p.replace(/[A-Za-z:]+[1-5]/g, zhMarks);
      if (!a) return `[${py}]`;   // "also pr. [yi1mo2-yi1yang4]"
      const w = b && sc === "s" ? b : a;
      return `<span class="zx">${zhTap(w) ? `<button class="zw" data-zact="word" data-zw="${esc(w)}">${esc(w)}</button>` : esc(w)} <i>${py}</i></span>`;
    });
  }
  const DL = {
    en: {auto: "Automatic · CC-CEDICT", autoNote: "Cut and reading chosen by the program, not checked by a person. CC-CEDICT, CC BY-SA 4.0.",
         classical: "Modern Mandarin (CC-CEDICT) — may not be the classical sense", classicalNote: "Read one character at a time: the lesson's glossary and notes give the classical sense.",
         here: "Here", dict: "Dictionary", other: "Other readings", cl: "Classifier", parts: "Not in CC-CEDICT: its parts", chars: "Characters",
         cuts: "Other cuts", cutsPrev: "Start one character earlier", cutsNext: "Start one character later", ex: "Examples in the course", more: "more",
         level: "Level", listen: "Listen", close: "Close", chengyu: "成語 lesson", wenyan: "文言 lesson", ours: "In the course", none: "No entry",
         noEx: "No other line of the course has this word yet.", idiom: "成語", sensesEn: ""},
    fr: {auto: "Automatique · CC-CEDICT", autoNote: "Découpage et lecture choisis par le programme, non vérifiés. CC-CEDICT, CC BY-SA 4.0.",
         classical: "Mandarin moderne (CC-CEDICT) — pas forcément le sens classique", classicalNote: "Lu caractère par caractère : le glossaire et les notes de la leçon donnent le sens classique.",
         here: "Ici", dict: "Dictionnaire", other: "Autres lectures", cl: "Classificateur", parts: "Absent de CC-CEDICT : ses parties", chars: "Caractères",
         cuts: "Autres découpages", cutsPrev: "Commencer un caractère plus tôt", cutsNext: "Commencer un caractère plus loin", ex: "Exemples dans le cours", more: "de plus",
         level: "Niveau", listen: "Écouter", close: "Fermer", chengyu: "Leçon de 成語", wenyan: "Leçon de 文言", ours: "Dans le cours", none: "Pas d'entrée",
         noEx: "Aucune autre ligne du cours n'a encore ce mot.", idiom: "成語", sensesEn: " (anglais, CC-CEDICT)"}
  };
  const dl = k => DL[dictLang()][k];
  const zhPy = p => p.split(" ").map((y, i) => (i && /^[aeoāáǎàēéěèōóǒò]/i.test(y) ? "'" : "") + y).join("");   // dì èr -> dì'èr
  // a reading line -> HTML: pinyin, numbered senses, classifier line
  function zhSenseHTML(line){
    const ss = line[1].split("/").filter(Boolean), cl = ss.filter(s => s.startsWith("CL:")).map(s => s.slice(3)), d = ss.filter(s => !s.startsWith("CL:"));
    return `<div class="zent"><div class="zpy" lang="zh-Latn-pinyin">${esc(zhPy(line[0]))}</div>
      <ol class="${d.length === 1 ? "one" : ""}">${d.map(s => `<li>${zhXref(s)}</li>`).join("")}</ol>
      ${cl.length ? `<div class="zcl">${dl("cl")}: ${cl.map(zhXref).join(", ")}</div>` : ""}</div>`;
  }
  // the word's position in its run: from a sentence (dictExtra), or from the page around a .ztok
  function zhCtxIn(sentence, w){
    const s = String(sentence || ""), i = s.indexOf(w); if (i < 0) return null;
    const parts = s.split(ZH_RUN); let pos = 0;
    for (let j = 0; j < parts.length; j++){ const p = parts[j]; if (j % 2 && i >= pos && i + w.length <= pos + p.length) return {run: p, start: [...p.slice(0, i - pos)].length}; pos += p.length; }
    return null;
  }
  function zhCtxEl(el){
    const isTok = n => n && (n.nodeType === 3 || (n.nodeType === 1 && n.classList.contains("ztok")));
    const hanTail = t => { const m = t.match(/[\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{3134f}]+$/u); return m ? m[0] : ""; };
    const hanHead = t => { const m = t.match(/^[\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{3134f}]+/u); return m ? m[0] : ""; };
    let before = "", after = "";
    for (let n = el.previousSibling; isTok(n); n = n.previousSibling){ const t = n.textContent, h = hanTail(t); before = h + before; if (h !== t) break; }
    for (let n = el.nextSibling; isTok(n); n = n.nextSibling){ const t = n.textContent, h = hanHead(t); after += h; if (h !== t) break; }
    return {run: before + el.textContent + after, start: [...before].length};
  }
  // "Other cuts" (Shūjià's "Autres découpages"): the words of the table that start where this one starts
  const zhStarts = (run, s) => { const cs = [...run], out = []; for (let k = Math.min(8, cs.length - s); k > 0; k--){ const w = cs.slice(s, s + k).join(""); if (zhTap(w)) out.push(w); } return out; };
  function zhCutsHTML(w, ctx, classical){
    if (!ctx) return "";
    const cs = [...ctx.run], list = zhStarts(ctx.run, ctx.start);
    const can = d => { for (let s = ctx.start + d; s >= 0 && s < cs.length; s += d) if (zhStarts(ctx.run, s).length) return s; return -1; };
    const p = can(-1), n = can(1);
    if (list.length < 2 && p < 0 && n < 0) return "";
    const a = (s, x) => `data-zrun="${esc(ctx.run)}" data-zs="${s}"${classical ? ' data-zc="1"' : ""}${x ? ` data-zw="${esc(x)}"` : ""}`;
    return `<h3>${dl("cuts")}</h3><div class="chips zcuts">
      <button class="zsh" data-zact="shift" ${a(p)} ${p < 0 ? "disabled" : ""} title="${dl("cutsPrev")}" aria-label="${dl("cutsPrev")}">‹</button>
      ${list.map(x => `<button data-zact="word" ${a(ctx.start, x)} aria-pressed="${x === w}"><span class="han">${esc(x)}</span> ${esc(zhPy((zhLines(x)[0] || [""])[0]))}</button>`).join("")}
      <button class="zsh" data-zact="shift" ${a(n)} ${n < 0 ? "disabled" : ""} title="${dl("cutsNext")}" aria-label="${dl("cutsNext")}">›</button></div>`;
  }
  // the automatic layer (CC-CEDICT) + characters + other cuts: the sheet's middle, and dictExtra()
  function zhAutoHTML(w, o){
    const L0 = zhLines(w), r = Math.min(o.r || 0, Math.max(0, L0.length - 1)), cls = o.classical;
    const S = L0.length ? [L0[r], ...L0.filter((y, i) => i !== r)] : [];
    let h = "";
    if (S.length){
      h += `<div class="zauto ${cls ? "zclass" : ""}"><div class="zlab">${cls ? dl("classical") : dl("auto")}</div>
        <h3>${cls || S.length < 2 ? dl("dict") : dl("here")}${dl("sensesEn")}</h3>${zhSenseHTML(S[0])}
        ${S.length > 1 ? `<h3>${dl("other")}</h3>${S.slice(1).map(zhSenseHTML).join("")}` : ""}
        <div class="src">${cls ? dl("classicalNote") : dl("autoNote")}</div></div>`;
    } else if (ZHP[w]){
      const ps = ZHP[w].split(" ");
      h += `<div class="zauto"><div class="zlab">${dl("auto")}</div><h3>${dl("parts")}${dl("sensesEn")}</h3><div class="zparts">${ps.map(p => {
        const l = zhLines(p)[0], d = l ? l[1].split("/").filter(s => !s.startsWith("CL:")).slice(0, 2).join("; ") : "";
        return `<div class="zpart">${l ? `<button class="zw" data-zact="word" data-zw="${esc(p)}">${esc(p)}</button>` : `<span class="han">${esc(p)}</span>`} <span class="zpy">${l ? esc(zhPy(l[0])) : ""}</span> ${esc(d)}</div>`; }).join("")}</div>
        <div class="src">${dl("autoNote")}</div></div>`;
    } else return "";
    const cs = [...w];
    const run = o.ctx ? o.ctx.run : w, at = o.ctx ? o.ctx.start : 0;
    if (cs.length > 1 && cs.length <= 8 && !(ZHP[w] && !L0.length && ZHP[w].split(" ").every(p => [...p].length === 1))) h += `<h3>${dl("chars")}</h3><div class="zchars">${cs.map((c, i) => { const l = zhLines(c)[0];
      return l ? `<button class="zchar" data-zact="word" data-zw="${esc(c)}" data-zrun="${esc(run)}" data-zs="${at + i}"${cls ? ' data-zc="1"' : ""}><span class="han">${esc(c)}</span><span class="d"><b>${esc(l[0])}</b> ${esc(l[1].split("/").filter(s => !s.startsWith("CL:")).slice(0, 3).join("; ").slice(0, 90))}</span></button>`
        : `<span class="zchar"><span class="han">${esc(c)}</span></span>`; }).join("")}</div>`;
    h += zhCutsHTML(w, o.ctx, cls);
    return h;
  }
  // HTML of the automatic layer for a curated card (agent A appends it in <div class="dx">); "" when the table lacks it
  function dictExtra(word, sentence){
    if (!zhData() || !word || (!zhTap(word) && !ZHP[word])) return "";
    let r = 0;
    if (sentence){ const t = zhCut(sentence).find(t => typeof t !== "string" && t[0] === word); if (t) r = t[1]; }
    return zhAutoHTML(word, {r, ctx: zhCtxIn(sentence, word)});
  }

  /* ---------- examples: other lines of the course (real lines only) ---------- */
  let ZH_LINES = null;
  function zhCourseLines(){
    if (ZH_LINES) return ZH_LINES;
    ZH_LINES = [];
    for (const tr of course.tracks) for (const l of tr.lessons){
      const at = `${tr.zh} L${l.id}`;
      if (tr.key === "rumen") (l.lines || []).forEach(x => ZH_LINES.push({v: [x.h, (x.toks || []).map(t => t.t ?? t.s).join("")], to: `rumen/${l.id}/line-${x.n}`, at}));
      else if (tr.key === "chengyu") (l.items || []).forEach(it => it.ex && ZH_LINES.push({v: [it.ex.h_t, it.ex.h_s], to: `chengyu/${l.id}`, at}));
      else (l.lines || []).forEach(x => ZH_LINES.push({v: [x.h, x.h_s], to: `${tr.key}/${l.id}`, at, c: tr.key === "wenyan"}));
    }
    return ZH_LINES;
  }
  const zhHan = t => (String(t || "").match(/[\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{3134f}]/gu) || []).join("");
  function zhExamplesHTML(w, skip){
    const sc = dictScript(), hits = [];
    for (const x of zhCourseLines()){
      const vs = x.v.filter(Boolean), v = vs.find(t => t.includes(w)); if (!v) continue;
      if (skip && vs.some(t => { const h = zhHan(t); return h === skip || (skip.length >= 4 && (h.includes(skip) || skip.includes(h))); })) continue;   // the line the word was tapped in
      if (!x.c && !ZHP[w] && !zhCut(v).some(t => typeof t !== "string" && t[0] === w)) continue;   // modern: the word, not a piece of another
      const pref = sc === "s" ? vs[vs.length - 1] : vs[0];
      hits.push({...x, t: pref.includes(w) ? pref : v});
    }
    if (!hits.length) return `<h3>${dl("ex")}</h3><div class="src">${dl("noEx")}</div>`;
    const show = hits.slice(0, 5).map(x => {
      const body = x.c || ZHP[w] ? x.t.split(w).map(zhLineClassical).join(`<mark>${zhLineClassical(w)}</mark>`)
        : zhCut(x.t).map(t => typeof t === "string" ? esc(t) : t[0] === w ? `<mark>${zhTok(t)}</mark>` : zhTok(t)).join("");
      return `<li><span class="zh"${x.c ? ' data-zh="classical"' : ""}>${body}</span> <button class="zgo" data-zact="go" data-to="${esc(x.to)}">${esc(x.at)}</button></li>`;
    }).join("");
    return `<h3>${dl("ex")}</h3><ul class="zex">${show}</ul>${hits.length > 5 ? `<div class="src">+ ${hits.length - 5} ${dl("more")}</div>` : ""}`;
  }
  // 成語 lesson that has this 成語, 文言 lesson titled with it
  function zhLessonChips(w){
    let out = [];
    for (const tr of course.tracks){
      if (tr.key === "chengyu") for (const l of tr.lessons) if ((l.items || []).some(it => it.w === w || it.w_s === w)) out.push([`chengyu/${l.id}`, `${dl("chengyu")} ${l.id}`]);
      if (tr.key === "wenyan") for (const l of tr.lessons) if (l.title === w || l.title_s === w) out.push([`wenyan/${l.id}`, `${dl("wenyan")} ${l.id}`]);
    }
    const here = location.hash.replace(/^#\/?/, "").split("/").slice(0, 2).join("/");
    out = out.filter(([to]) => to !== here);
    return out.length ? `<div class="chips zles">${out.map(([to, x]) => `<button data-zact="go" data-to="${to}">${esc(x)} ›</button>`).join("")}</div>` : "";
  }

  /* ---------- the sheet ---------- */
  const zhSay = () => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
  // The way back is the shell's (sheet.js): a word opened from inside the sheet (a character, another cut, a word of
  // an example or of a note) reads sheetCur before openSheet clears it, and offers "‹ Back to …" through sheetBack.
  function openZhWord(w, o = {}){
    if (!zhData()) return;
    const sh = $("#sheet"), inside = (!!(o.from && sh && sh.contains(o.from)) || !!o.inside) && sheetOpen();
    const prev = inside ? sheetCur : null;
    const cls = !!o.classical, m = zhMeta(w), L0 = zhLines(w), r = Math.min(o.r || 0, Math.max(0, L0.length - 1));
    const gl = typeof courseGloss === "function" ? courseGloss(w) : null;
    const py = L0.length ? zhPy(L0[r][0]) : ZHP[w] ? ZHP[w].split(" ").map(p => (zhLines(p)[0] || [""])[0]).join(" ") : "";
    const idiom = !cls && (m.idiom || L0.some(l => /\(idiom\b/.test(l[1])));
    const lv = [m.nhsk ? `NHSK ${m.nhsk.replace("-", "–")}` : "", m.hsk ? `HSK ${m.hsk}` : ""].filter(Boolean);
    const html = `<div class="zd" data-hw="${esc(w)}"><div class="top"><div class="hd"><div class="wh" lang="zh">${esc(w)}${m.other.length ? `<small>${esc(m.other.join(" · "))}</small>` : ""}${idiom ? `<span class="zbadge">${dl("idiom")}</span>` : ""}</div>
        <div class="wp" lang="zh-Latn-pinyin">${esc(py)}</div></div>
        ${zhSay() ? `<button class="x zsay" data-zact="say" data-zw="${esc(w)}" aria-label="${dl("listen")}" title="${dl("listen")}">▶</button>` : ""}
        <button class="x" data-zact="close" aria-label="${dl("close")}">×</button></div>
      ${gl && gl.html ? `<h3>${dl("ours")}</h3><div class="zours">${gl.html}</div>` : ""}
      ${zhAutoHTML(w, {r, classical: cls, ctx: o.ctx}) || `<div class="src">${dl("none")}</div>`}
      ${zhExamplesHTML(w, o.skip || (o.ctx && o.ctx.run.length >= 4 ? o.ctx.run : ""))}
      ${lv.length ? `<h3>${dl("level")}</h3><div class="zlv">${lv.map(x => `<span class="badge">${x}</span>`).join(" ")}</div>` : ""}
      ${zhLessonChips(w)}
      <div class="src zcredit">${esc(DICT_CREDIT)}</div></div>`;
    openSheet(html);
    sheetCur = {label: w, open: () => openZhWord(w, {...o, from: null, inside: false})};
    if (prev) sheetBack(prev.label, prev.open);
  }
  function openZh(el){
    if (!zhData()) return;
    const w = el.dataset.z, cls = el.dataset.c === "1" || !!el.closest('[data-zh="classical"]');
    $$(".ztok.sel").forEach(y => y.classList.remove("sel")); el.classList.add("sel");
    const blk = el.closest("p, li, td, div");   // the line it was tapped in: not an example of itself
    openZhWord(w, {r: +el.dataset.r || 0, classical: cls, ctx: zhCtxEl(el), from: el, skip: blk && !blk.closest("#sheet") ? zhHan(blk.textContent) : ""});
    const sh = $("#sheet");   // the sheet covers the bottom of the screen: bring the tapped word above it
    if (sh && !sh.contains(el)){ const r = el.getBoundingClientRect(), lim = innerHeight - sh.offsetHeight - 12; if (r.bottom > lim && r.top > 60) scrollBy({top: Math.min(r.bottom - lim, r.top - 60), behavior: "smooth"}); }
  }
  function zhSpeak(w, btn){
    if (!zhSay() || !w) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w), v = speechSynthesis.getVoices().find(x => /^zh[-_]CN/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^zh/i.test(x.lang));
    if (v) u.voice = v;
    u.lang = v ? v.lang : "zh-CN"; u.rate = .85;
    if (btn){ btn.classList.add("on"); u.onend = u.onerror = () => btn.classList.remove("on"); }
    speechSynthesis.speak(u);
  }
  function zhAct(b){
    const a = b.dataset.zact, inside = !!b.closest("#sheet");
    if (a === "close") return closeSheet();
    if (a === "say") return zhSpeak(b.dataset.zw, b);
    if (a === "go"){ closeSheet(); location.hash = b.dataset.to; return; }
    const cls = b.dataset.zc === "1" || !!b.closest(".zclass");
    const ctx = b.dataset.zrun != null ? {run: b.dataset.zrun, start: +b.dataset.zs} : null;
    if (a === "shift"){ const w = zhStarts(ctx.run, ctx.start)[0]; if (w) openZhWord(w, {classical: cls, ctx, inside}); return; }
    if (a === "word") openZhWord(b.dataset.zw, {classical: cls, ctx: ctx || {run: b.dataset.zw, start: 0}, inside});
  }
  // One delegated handler for every .ztok and every dictionary button, wherever it is drawn (pages, cards, the sheet).
  // Capture phase, propagation stopped: the page's own click rules (close the sheet on an outside tap…) do not run.
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest(".ztok, [data-zact]");
    if (!t || t.disabled) return;
    e.stopPropagation(); e.preventDefault();
    if (t.classList.contains("ztok")) openZh(t); else zhAct(t);
  }, true);
  document.addEventListener("keydown", e => {
    const t = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest(".ztok");
    if (t){ e.preventDefault(); e.stopPropagation(); openZh(t); }
  }, true);
