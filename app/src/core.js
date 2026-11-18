  /* core.js: DOM helpers, store, esc, md, today, state (course, T, L, settings, done), Z, track, isDone, saveDone */
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const H = document.documentElement, app = $("#app"), pop = $("#pop");
  const store = {
    get(k, d){ try{ const v = localStorage.getItem("wy." + k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem("wy." + k, JSON.stringify(v)); }catch(e){} }
  };
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const REF = /(?:(文言|白話) )?L(\d+) n\.(\d+)/g, TRACK_OF = {"文言": "wenyan", "白話": "baihua"};
  // **bold**, *italic*, and cross-references (L3 n.5 · 文言 L1 n.4) as buttons.
  const md = (t, own) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(REF, (m, tr, l, n) => `<button class="ref" data-to="${TRACK_OF[tr] || own}/${l}/n${n}">${m}</button>`);
  const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  let course, T, L;
  let simp = store.get("simp", false), py = store.get("py", true), cover = store.get("cover", false);
  let done = store.get("done", {});
  let rmode = store.get("rmode", "py"), rlang = store.get("rlang", "fr"), rtrad = store.get("rtrad", false);
  const Z = (o, k) => simp && o[k + "_s"] ? o[k + "_s"] : o[k];
  const track = k => course.tracks.find(t => t.key === k);
  const isDone = (t, l) => !!done[t.key + ":" + l.id];
  function saveDone(){ store.set("done", done); }
