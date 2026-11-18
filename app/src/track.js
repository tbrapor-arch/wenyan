  /* track.js: CFG, what each track's lessons are made of; lesson.js, home.js and toolbar.js read it */
  // src     the script the track is written in ("trad" | "simp"); the other is derived at build time
  // py      "above" (pinyin over each word) | "line" (a pinyin line under each line) | "none"
  // langs   the languages of its explanations (two: a language switch in the toolbar)
  // body    the sections of a lesson, of a review lesson (kind: review) and of a second-wave page, in order (SEC in lesson.js)
  // notes   "list" (the full list open under the text) | "folded" (in a fold; the numbers under each line open them)
  // words   "glossary" | "glossary-hsk" (two grids: beyond HSK 5, already in HSK 1–5) | "grid" (new words) | null
  // ex      exercise kinds: "translate" (answer on tap), "choose" (QCM)
  // classical  its lesson lines and exercises are classical (one character at a time in the dictionary)
  // wave    a second wave from lesson wave + 1, redoing lesson N − wave; cover: the lesson has a Cover switch
  const CFG = {
    rumen: {src: "simp", py: "above", langs: ["fr", "en"], notes: "folded", words: "grid", ex: ["translate", "choose"],
      body: ["setting", "wavecard", "lnav", "recap", "dialogue", "notes", "words", "practice"], review: null, wavebody: ["setting", "dialogue"],
      wave: 49, cover: L => true, barName: () => t_("lesson"),
      kicker: (L, wave) => `${wave ? t_("wave") + " · " : ""}${t_("lesson")} ${L.id}${L.kind === "review" ? " · " + t_("review") : ""}`,
      footer: () => `${t_("written")} · CC BY-SA 4.0 · NHSK list: bezlant/hsk-3-vocabulary, CC BY-SA 4.0.`,
      home: rumenHome},
    wenyan: {src: "trad", py: "line", langs: ["en"], notes: "list", words: "glossary", ex: ["translate"], classical: true,
      body: ["pages", "notes", "words", "practice", "culture"], review: ["recap", "practice"],
      cover: L => L.kind !== "review", barName: () => "文言", exTitle: () => "Exercise · translate",
      kicker: L => `Lesson ${L.id} · ${L.kind === "review" ? "Review" : esc(Z(L.source, "work"))}`,
      meta: L => L.source ? `${esc(L.source.author)} · ${esc(L.source.period)}` : "",
      footer: L => L.kind === "review" ? "Exercise texts: public domain. Course content CC BY-SA 4.0." : `Text: public domain (${esc(L.source.text_from)}). Course content CC BY-SA 4.0.`},
    baihua: {src: "trad", py: "none", langs: ["en"], notes: "list", words: "glossary-hsk", ex: ["translate"], prose: true, rootsClassical: true,
      body: ["pages", "notes", "words", "practice", "culture"], review: ["recap", "practice"],
      cover: L => L.kind !== "review", barName: () => "白話", exTitle: L => L.kind === "review" ? "Exercise · translate" : "Roots · the classical sentences behind these words",
      kicker: L => `Lesson ${L.id} · ${L.kind === "review" ? "Review" : esc(L.source.author)}`,
      meta: L => L.source ? `${esc(Z(L.source, "work"))} · ${esc(L.source.period)}` : "",
      footer: L => L.kind === "review" ? "Exercise texts: public domain. Course content CC BY-SA 4.0." : `Text: public domain (${esc(L.source.text_from)}). Course content CC BY-SA 4.0.`},
    chengyu: {src: "trad", py: "line", langs: ["en"], notes: null, words: null, ex: [],
      body: ["frames", "cards"], review: ["frames", "cards"], cover: L => true, barName: () => "成語",
      kicker: L => `成語 · Lesson ${L.id}`,
      footer: () => "Examples: Tatoeba (CC BY 2.0 FR), Chinese Wikipedia (CC BY-SA 4.0). Frequency: wordfreq (CC BY-SA 4.0). Course content CC BY-SA 4.0."}
  };
