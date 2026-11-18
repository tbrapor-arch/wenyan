  /* toolbar.js: the lesson bar of every track (back, previous / next, script, pinyin, language, Cover) and its switches */
  const PYLABEL = {above: "拼音", tap: "拼音 ☝", off: ""};
  function toolbar(wave){
    const c = CFG[T.key], i = T.lessons.indexOf(L), p = T.lessons[i - 1], n = T.lessons[i + 1], suf = wave ? "/wave" : "";
    const nav = (x, id, label, ch) => `<a class="ic" id="${id}" ${x ? `href="#${T.key}/${x.id}${suf}"` : 'aria-disabled="true"'} aria-label="${label}">${ch}</a>`;
    return `<div class="lbar">
      <a class="ic" href="#${T.key}" aria-label="Back to the ${esc(T.en)} lessons">←</a>
      <div class="ttl">${esc(c.barName())} ${L.id} ·<b>${esc(Z(L, "title"))}</b></div>
      ${nav(p, "prev", "Previous lesson", "‹")}${nav(n, "next", "Next lesson", "›")}
      <div class="toggles">
        <button class="tg" id="tScript" data-act="script" title="Traditional / simplified">${SIMP ? "简 → 繁" : "繁 → 简"}</button>
        ${c.py !== "none" ? `<button class="tg" id="tPy" data-act="pinyin" aria-pressed="${S.pinyin !== "off"}" title="Pinyin: shown / on tap / off">${PYLABEL[S.pinyin] || (SIMP ? "汉字" : "漢字")}</button>` : ""}
        ${c.langs.length > 1 ? `<button class="tg" id="tLang" data-act="lang">${S.rlang === "fr" ? "FR → EN" : "EN → FR"}</button>` : ""}
        ${!wave && c.cover(L) ? `<button class="tg" id="tCover" data-act="cover" aria-pressed="${S.cover}" title="${esc(t_("cover"))}">Cover</button>` : ""}
      </div></div>`;
  }
  // the switches, in the toolbar and in Settings: true when the click was one of them
  function toggle(act, v){
    if (act === "script") S.script = v || (SIMP ? "trad" : "simp");
    else if (act === "pinyin") S.pinyin = v || {above: "tap", tap: "off", off: "above"}[S.pinyin];
    else if (act === "lang") S.rlang = v || (S.rlang === "fr" ? "en" : "fr");
    else if (act === "cover") S.cover = v != null ? v === "on" : !S.cover;
    else if (act === "night") S.night = v != null ? v === "on" : !S.night;
    else return false;
    saveSettings(); rerender(); return true;
  }
