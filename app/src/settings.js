  /* settings.js: Settings page */
  /* ---------- settings ---------- */
  function settings(){
    const sw = (id, on) => `<button class="tg" id="${id}" aria-pressed="${on}">${on ? "On" : "Off"}</button>`;
    app.innerHTML = `<div class="set"><div class="kicker">Settings</div><h1>設定</h1>
      <div class="row"><div class="l">Simplified characters<small>The course is written in traditional characters; simplified is derived from it.</small></div>${sw("sSimp", simp)}</div>
      <div class="row"><div class="l">Pinyin under each line<small>文言 and 成語. In 白話 lessons, tap a word to see its reading.</small></div>${sw("sPy", py)}</div>
      <div class="row"><div class="l">Cover the English<small>Read the Chinese first; tap a line to check yourself.</small></div>${sw("sCover", cover)}</div>
      <div class="row"><div class="l">入門 · explanations in<small>French or English, for the beginner course.</small></div><button class="tg" id="sRlang">${rlang === "fr" ? "Français" : "English"}</button></div>
      <div class="row"><div class="l">入門 · traditional characters<small>The beginner course is written in simplified characters; traditional is derived from it.</small></div>${sw("sRtrad", rtrad)}</div>
      <div class="row"><div class="l">Night mode<small>The app stays light unless you switch this on.</small></div>${sw("sNight", store.get("night", false))}</div>
      <h2>Progress</h2>
      <div class="row"><div class="l">${Object.keys(done).length} lessons done<small>Kept in this browser only. Save a file to move it to another device.</small></div>
        <button class="btn ghost" id="save">Save</button><button class="btn ghost" id="load">Load</button><input type="file" id="file" accept="application/json,.json" hidden></div>
      <footer>Wenyan 文言 · lessons, notes and translations CC BY-SA 4.0 · code MIT.</footer></div>`;
    scrollTo(0, 0);
  }
