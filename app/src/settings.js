  /* settings.js: the Settings page (one set of switches for every track; progress file) */
  function showSettings(){
    const seg = (act, cur, opts) => `<div class="seg" role="group">${opts.map(([v, label]) => `<button class="tg" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${label}</button>`).join("")}</div>`;
    const sw = (act, on) => seg(act, on ? "on" : "off", [["on", "On"], ["off", "Off"]]);
    app.innerHTML = `<div class="set"><div class="kicker">Settings</div><h1>設定</h1>
      <div class="row"><div class="l">Characters<small>入門 is written in simplified characters, 文言, 白話 and 成語 in traditional; the other script is derived from it.</small></div>
        ${seg("script", S.script, [["src", "As written"], ["trad", "繁 Traditional"], ["simp", "简 Simplified"]])}</div>
      <div class="row"><div class="l">Pinyin<small>入門: above each word. 文言 and 成語: under each line. On tap: tap a word or a line to see it. 白話 has none: tap a word for its reading.</small></div>
        ${seg("pinyin", S.pinyin, [["above", "Shown"], ["tap", "On tap"], ["off", "Off"]])}</div>
      <div class="row"><div class="l">Cover the translation<small>Read the Chinese first; tap a line to check yourself.</small></div>${sw("cover", S.cover)}</div>
      <div class="row"><div class="l">入門 · explanations in<small>French or English, for the beginner course.</small></div>${seg("lang", S.rlang, [["fr", "Français"], ["en", "English"]])}</div>
      <div class="row"><div class="l">Night mode<small>The app stays light unless you switch this on.</small></div>${sw("night", S.night)}</div>
      <h2>Progress</h2>
      <div class="row"><div class="l">${Object.keys(done).length} lessons done<small>Kept in this browser only. Save a file to move it to another device.</small></div>
        <button class="btn ghost" id="save" data-act="save">Save</button><button class="btn ghost" id="load" data-act="load">Load</button><input type="file" id="file" accept="application/json,.json" hidden></div>
      <div id="set-sync"></div><div id="set-module"></div>
      <footer>Wenyan 文言 · lessons, notes and translations CC BY-SA 4.0 · code MIT.${typeof DICT_CREDIT === "string" && DICT_CREDIT ? " " + DICT_CREDIT : ""}</footer></div>`;
    typeof syncSettings === "function" && syncSettings($("#set-sync"));
    typeof moduleSettings === "function" && moduleSettings($("#set-module"));
    scrollTo(0, 0);
  }
  function saveFile(){
    const a = document.createElement("a"), p = getProgress();
    a.href = URL.createObjectURL(new Blob([JSON.stringify({app: "wenyan", saved: today(), ...p}, null, 1)], {type: "application/json"}));
    a.download = `wenyan-progress-${today()}.json`; a.click();
  }
  async function loadFile(f){
    try{ const d = JSON.parse(await f.text()); if (d.app !== "wenyan") throw 0;
      // merge: the earliest finish date of each lesson (a "deck" in an older file is ignored); settings if the file has them
      setProgress(d); touch(); route();
    }catch(x){ alert("That file is not a Wenyan progress file."); }
  }
