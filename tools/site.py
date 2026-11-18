#!/usr/bin/env python3
"""Turn the built page (app/dist/index.html) into the published, installable site in _site/ (make site; the workflow).

  python3 -I tools/site.py [out-dir]

Adds to the page's <head>: a Content Security Policy, the manifest, the home-screen icon, the theme colour and
full-screen launch; copies app/pwa/ (manifest, icons, the offline service worker, its __BUILD__ filled in).
The page links a manifest only here: the single file (dist/wenyan.html) and app/dist/index.html stay plain pages,
with no service worker and no sync (app/src/sync.js checks for the manifest link).
"""
import base64
import hashlib
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "_site"
PWA = ROOT / "app" / "pwa"
PAGE = ROOT / "app" / "dist" / "index.html"

body = PAGE.read_text(encoding="utf-8")
build = hashlib.sha1(body.encode()).hexdigest()[:10]


# Content Security Policy: the browser runs only the page's own inline script (allowed by its hash, computed here at
# each build), the private module (a blob: script made by the page), and talks only to GitHub's API. Fonts: Google
# Fonts' stylesheet and files. Anything injected into the page, or loaded from elsewhere, is refused, so it cannot
# read the sync token kept in this browser. A new outside source must be added here, or the browser refuses it.
def script_hashes(html):
    # only executable inline scripts: the course data is a <script type="application/json"> block, never run
    out = ["'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode("utf-8")).digest()).decode() + "'"
           for m in re.finditer(r"<script>(.*?)</script>", html, re.S)]
    if not out:
        sys.exit("site.py: no inline script found, the CSP would block the app")
    return " ".join(out)


RULES = {
    "default-src": "'self'",
    "script-src": script_hashes(body) + " blob:",
    "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src": "'self' data: https://fonts.gstatic.com",
    "img-src": "'self' data: blob:",
    "connect-src": "'self' https://api.github.com https://gist.githubusercontent.com",
    "worker-src": "'self'",
    "manifest-src": "'self'",
    "object-src": "'none'",
    "base-uri": "'none'",
    "form-action": "'none'",
}
CSP = '<meta http-equiv="Content-Security-Policy" content="' + "; ".join(f"{k} {v}" for k, v in RULES.items()) + '">'
HEAD = CSP + '''
<meta name="description" content="An Assimil-style course in Chinese: Mandarin from zero, Classical Chinese through real texts, modern prose and 成語.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#f6f1e7">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="文言">
<meta name="apple-mobile-web-app-status-bar-style" content="default">'''

TAG = '<meta charset="utf-8">'
if body.count(TAG) != 1:
    sys.exit(f"site.py: app/dist/index.html needs exactly one {TAG} to put the CSP after")
if re.search(r"<link[^>]*rel=\"manifest\"", body):
    sys.exit("site.py: app/dist/index.html already links a manifest")
# the CSP must come before anything it governs: right after the charset, the first thing in <head>
html = body.replace(TAG, TAG + "\n" + HEAD, 1)

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
(OUT / "index.html").write_text(html, encoding="utf-8")
for f in sorted(PWA.iterdir()):
    if f.name == "sw.js":
        (OUT / f.name).write_text(f.read_text(encoding="utf-8").replace("__BUILD__", build), encoding="utf-8")
    else:
        shutil.copy(f, OUT / f.name)
(OUT / ".nojekyll").touch()
size = sum(p.stat().st_size for p in OUT.iterdir())
print(f"{OUT.relative_to(ROOT) if OUT.is_relative_to(ROOT) else OUT}: installable site, build {build}, {size // 1024} KB")
