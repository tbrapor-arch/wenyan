  /* core.js: DOM helpers, store, esc, today, han, md, flash / jump, state (course, T, L, S, done), settings and their
     one-time migration, Z (script), t_ (UI strings), progress (markDone, getProgress, setProgress) */
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const H = document.documentElement, app = $("#app");
  const store = {
    get(k, d){ try{ const v = localStorage.getItem("wy." + k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem("wy." + k, JSON.stringify(v)); }catch(e){} },
    has(k){ try{ return localStorage.getItem("wy." + k) !== null; }catch(e){ return false; } }
  };
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const touch = () => typeof syncTouch === "function" && syncTouch();

  // Chinese text that is not made of our own tokens: the dictionary's tappable words (dict.js) when it is there.
  // classical: one character at a time (文言 lines and exercises, 成語 origins, the Roots of 白話).
  const han = (text, classical) => classical && typeof zhLineClassical === "function" ? zhLineClassical(text)
    : typeof zhLine === "function" ? zhLine(text) : esc(text);
  const HANRUN = /[㐀-鿿豈-﫿\u{20000}-\u{3ffff}〇]+/gu;
  // **bold**, *italic*, cross-references (L3 n.5 · 文言 L1 n.4) as buttons, Chinese runs through zh (default: han,
  // one character at a time in a classical track: everything in 文言 is classical, as the build's dictionary check has it).
  const REF = /((?:(文言|白話|入門) )?\bL(\d+) n\.(\d+))/, TRACK_OF = {"文言": "wenyan", "白話": "baihua", "入門": "rumen"};
  function md(t, own = T && T.key, zh = run => han(run, !!(T && CFG[T.key].classical))){
    const p = String(t ?? "").split(REF);
    let out = "";
    for (let i = 0; i < p.length; i += 5){
      out += esc(p[i]).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(HANRUN, zh);
      if (i + 1 < p.length) out += `<button class="ref" data-to="${TRACK_OF[p[i + 2]] || own}/${p[i + 3]}/n${p[i + 4]}">${esc(p[i + 1])}</button>`;
    }
    return out;
  }
  function flash(n){ if (!n) return; n.scrollIntoView({behavior: "smooth", block: "center"}); n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash"); }
  // jump to a section or note of the page (opens the folded list it sits in)
  function jump(id){ const el = document.getElementById(id); if (!el) return; const d = el.closest("details") || (el.tagName === "DETAILS" ? el : null); if (d) d.open = true; flash(el); }

  /* ---------- state ---------- */
  let course, T = null, L = null;          // the course; the track and lesson on screen
  let SIMP = false;                        // the track on screen is shown in simplified characters
  const track = k => course.tracks.find(t => t.key === k);

  // Settings: one object, wy.settings. script: "src" (each track as written: 入門 简, the others 繁) | "trad" | "simp";
  // pinyin: "above" | "tap" | "off"; rlang: 入門 explanations "fr" | "en".
  const SET0 = {script: "src", pinyin: "above", cover: false, rlang: "fr", night: false};
  const clean = s => ({script: ["src", "trad", "simp"].includes(s.script) ? s.script : "src",
    pinyin: ["above", "tap", "off"].includes(s.pinyin) ? s.pinyin : "above", cover: !!s.cover,
    rlang: s.rlang === "en" ? "en" : "fr", night: !!s.night});
  // Once: the old keys (wy.simp, wy.rtrad, wy.py, wy.rmode, wy.cover, wy.rlang, wy.night) become wy.settings. They are
  // left in place and only read while wy.settings does not exist, so running this twice changes nothing; wy.done is
  // not touched (same key, same format).
  function migrateSettings(){
    const s = store.get("settings", null);
    if (s && typeof s === "object") return clean({...SET0, ...s});
    const simp = store.get("simp", false) === true, rtrad = store.get("rtrad", false) === true;
    const out = clean({
      // 文言 / 白話 / 成語 simplified (simp) or 入門 traditional (rtrad); both on: the later setting (rtrad) wins
      script: rtrad ? "trad" : simp ? "simp" : "src",
      // 入門's three-way switch if it was ever used, else the 文言 / 成語 pinyin on / off
      pinyin: store.has("rmode") ? {py: "above", tap: "tap", han: "off"}[store.get("rmode")] : store.get("py", true) === false ? "off" : "above",
      cover: store.get("cover", false) === true, rlang: store.get("rlang", "fr"), night: store.get("night", false) === true});
    store.set("settings", out);
    return out;
  }
  let S = migrateSettings();
  function saveSettings(){ store.set("settings", S); touch(); }
  // the script a track is shown in
  const showsSimp = t => S.script === "simp" || (S.script === "src" && CFG[t.key].src === "simp");
  // a field in the script on screen: field_s (simplified, in tracks written in traditional) or field_t (the reverse)
  const Z = (o, k) => { if (!o) return ""; const src = T ? CFG[T.key].src : "trad", alt = src === "trad" ? (SIMP ? "_s" : "") : (SIMP ? "" : "_t");
    return alt && o[k + alt] != null ? o[k + alt] : o[k]; };

  // UI strings: French only in 入門 when its explanations are in French; rumen.js adds its own.
  const UI = {
    en: {lesson: "Lesson", review: "Review", start: "Start", cont: "Continue", nextLesson: "Next lesson", startHere: "Start here",
         allDone: "All done", allDoneText: "Every lesson written so far is marked as done.", count: (a, b) => `${a} of ${b} done`,
         lessons: "Lessons", notes: "Notes", allNotes: "All notes", allNotesGo: "All notes ↓", note: "Note", of: "of", line: "line",
         prev: "‹ Previous", nextN: "Next ›", answer: "Answer", practises: "Practises", open: "open", meaning: "Meaning",
         taught: "Taught in lesson", usedIn: "Also in", chars: "Characters", markDone: "Mark as done", finished: "Finished reading?",
         keep: "Mark it done to keep your place.", doneOn: "Done on", undo: "Undo", cover: "Hide the translation; tap a line to check",
         back: "Back to", card: "the card", thisLesson: "This lesson", sw: "說文",
         topics: {grammar: "grammar", vocab: "vocabulary", pron: "pronunciation", culture: "culture", writing: "writing"}},
    fr: {lesson: "Leçon", review: "Révision", start: "Commencer", cont: "Continuer", nextLesson: "Prochaine leçon", startHere: "Pour commencer",
         allDone: "Tout est fait", allDoneText: "Toutes les leçons écrites sont terminées.", count: (a, b) => `${a} / ${b} terminées`,
         lessons: "Leçons", notes: "Notes", allNotes: "Toutes les notes", allNotesGo: "Toutes les notes ↓", note: "Note", of: "sur", line: "ligne",
         prev: "‹ Précédente", nextN: "Suivante ›", answer: "Réponse", practises: "Travaille", open: "ouvrir", meaning: "Sens",
         taught: "Appris en leçon", usedIn: "Aussi dans", chars: "Caractères", markDone: "Marquer comme terminée", finished: "Leçon finie ?",
         keep: "Marquez-la pour garder votre place.", doneOn: "Terminée le", undo: "Annuler", cover: "Cacher la traduction",
         back: "Retour à", card: "la fiche", thisLesson: "Cette leçon", sw: "說文",
         topics: {grammar: "grammaire", vocab: "vocabulaire", pron: "prononciation", culture: "culture", writing: "écriture"}}
  };
  const lang = () => T && CFG[T.key].langs.length > 1 ? S.rlang : "en";
  const t_ = k => UI[lang()][k] ?? UI.en[k];
  const tx = (o, k = "") => o[k + lang()] ?? o[k + "en"];      // our translation of a line, a note…, in the language on screen

  /* ---------- progress: the done dates ---------- */
  // keys: "wenyan:3", "rumen:12", "rumen:52:wave" (the second wave of 入門 52) → "YYYY-MM-DD"
  // done is this page's copy of wy.done. Another tab of the same browser may have written wy.done since: every write
  // and every read for sync starts from what is stored (doneReload), so no tab writes back an old copy; the storage
  // event (events.js) reloads it and redraws.
  const done = {};
  function doneReload(){
    const d = store.get("done", {});
    for (const k of Object.keys(done)) delete done[k];
    if (d && typeof d === "object" && !Array.isArray(d)) for (const k in d) if (typeof d[k] === "string") done[k] = d[k];
    return done;
  }
  doneReload();
  const isDone = (t, l) => !!done[t.key + ":" + l.id];
  // every write to done goes through here. on: true (today), a date "YYYY-MM-DD", or false (undo); quiet: no syncTouch
  // (a merge from a file or from sync)
  function markDone(key, on, quiet){ doneReload(); if (on) done[key] = typeof on === "string" ? on : today(); else delete done[key]; store.set("done", done); if (!quiet) touch(); }
  // the progress: the done dates only. Settings belong to the device: neither a progress file nor sync carries them.
  const getProgress = () => ({done: {...doneReload()}});
  // merge (a progress file): the earliest finish date of each lesson wins. {replace: true} (sync, which has already
  // merged with its done / undone marks): done becomes exactly obj.done, removals included. Settings in obj (an
  // older progress file has them) are ignored: this device's are kept.
  function setProgress(obj, opt = {}){
    const d = obj && obj.done && typeof obj.done === "object" ? obj.done : {};
    doneReload();
    if (opt.replace){
      for (const k of Object.keys(done)) if (typeof d[k] !== "string") markDone(k, false, true);
      for (const k in d) if (typeof d[k] === "string" && done[k] !== d[k]) markDone(k, d[k], true);
    } else for (const k in d) if (typeof d[k] === "string" && (!done[k] || d[k] < done[k])) markDone(k, d[k], true);
  }
