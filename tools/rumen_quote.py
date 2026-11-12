#!/usr/bin/env python3
"""Quote the plain one-line values of 入門 lesson files (h, py, fr, en, lit_*), so French
punctuation (« : », « ; ») can't break the YAML.   python3 tools/rumen_quote.py rumen/*.yaml"""
import re, sys
for p in sys.argv[1:]:
    out = []
    for line in open(p, encoding="utf-8").read().split("\n"):
        m = re.match(r'^(\s+(?:- )?)(fr|en|lit_fr|lit_en|h|py|who): (.+)$', line)
        if m and m[3][0] not in "\"'>|{[":
            line = f'{m[1]}{m[2]}: "' + m[3].replace("\\", "\\\\").replace('"', '\\"') + '"'
        out.append(line)
    open(p, "w", encoding="utf-8").write("\n".join(out))
