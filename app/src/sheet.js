  /* sheet.js: bottom sheet: openSheet, closeSheet */
  /* bottom sheet: word card, note */
  function openSheet(html){
    const sh = $("#sheet"); sh.innerHTML = `<div class="grab"></div>` + html;
    sh.classList.add("open"); sh.setAttribute("aria-hidden", "false"); sh.scrollTop = 0;
  }
  function closeSheet(){
    const sh = $("#sheet"); if (!sh) return;
    sh.classList.remove("open"); sh.setAttribute("aria-hidden", "true");
    $$(".tok.sel, .ztok.sel").forEach(x => x.classList.remove("sel"));   // TEMP wiring: .ztok $$(".sent.noted").forEach(x => x.classList.remove("noted"));
  }
