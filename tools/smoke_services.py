#!/usr/bin/env python3
"""Test the published site's services in a browser: offline app, CSP, sync between devices, private-module loader.

  make smoke        (runs tools/smoke.py, then this; needs make site first: _site/ and dist/wenyan.html)
  python3 -I tools/smoke_services.py [--shots DIR]     (default DIR /tmp/shots-services)

Serves _site/ on http://localhost (ports 8830, 8831) and checks:
  1. the service worker registers; with the server stopped and the network cut, a reload still opens a lesson;
     no route of the app triggers a Content Security Policy violation;
  2. the single file dist/wenyan.html opened as file:// still works (no service worker, no sync, no request out);
  3. sync, against a fake api.github.com (never a real token): first connect creates the gist; two devices merge
     (earliest date; an Undo on one device is not brought back by the other); token refused; offline, then back;
  4. the private-module loader, against the same fake: no token, no tab and no request; a token that can read the
     repo gets the tab and its route; with GitHub unreachable the cached module still opens; a token that cannot
     read the repo gets nothing.
Screenshots of Settings (390 px) with sync not connected / connected / refused / offline go to DIR.
"""
import http.server
import json
import re
import sys
import threading
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "_site"
FILE = (ROOT / "dist" / "wenyan.html").as_uri()
SHOTS = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else Path("/tmp/shots-services")
course = json.loads((ROOT / "app" / "course.json").read_text(encoding="utf-8"))
errors = []
LEAKS = []
PHONE = {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2}
# a CSP violation is printed to the console by the page itself (init scripts are not subject to the CSP)
WATCH = "document.addEventListener('securitypolicyviolation', e => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI));"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(SITE), **k)

    def log_message(self, *a):
        pass


def serve(port):
    s = http.server.ThreadingHTTPServer(("127.0.0.1", port), Quiet)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def watch(page, name):
    page.on("pageerror", lambda e: errors.append(f"{name}: {e}"))
    page.on("console", lambda m: errors.append(f"{name}: console {m.text}")
            if m.type == "error" and ("Content Security Policy" in m.text or "CSP violation" in m.text
                                      or ("fonts.g" not in m.text and "ERR_" not in m.text and "Failed to load resource" not in m.text)) else None)


def no_fonts(ctx):
    # the test makes no request outside: Google Fonts are refused (the page falls back to the system serif)
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.abort())


def check(cond, what):
    if not cond:
        errors.append(what)
    return cond


# ---------------------------------------------------------------- 1. service worker, offline, CSP
def offline_and_csp(b):
    srv = serve(8830)
    url = "http://localhost:8830/"
    ctx = b.new_context(**PHONE)
    no_fonts(ctx)
    ctx.add_init_script(WATCH)
    page = ctx.new_page(); watch(page, "sw")
    page.goto(url)
    page.wait_for_selector(".thead,.lbar,.rhome,main#app > *")
    ok = page.evaluate("navigator.serviceWorker.ready.then(r => !!r.active)")
    check(ok, "sw: the service worker did not register")
    page.reload(); page.wait_for_function("() => !!navigator.serviceWorker.controller", timeout=10000)
    # every route under the CSP
    routes = ["settings"] + [t["key"] for t in course["tracks"]] + [f"{t['key']}/{l['id']}" for t in course["tracks"] for l in t["lessons"]]
    for r in routes:
        page.goto(url + "#" + r)
        page.wait_for_selector(".set,.thead,.lbar,main#app > *")
    # a few things that build HTML on the fly
    page.goto(url + "#rumen/1"); page.wait_for_selector(".lbar")
    if page.locator(".tok").count():
        page.locator(".tok").first.click(); page.wait_for_selector("#sheet.open"); page.keyboard.press("Escape")
    page.goto(url + "#wenyan/1"); page.wait_for_selector(".lbar")
    if page.locator(".w").count():
        page.locator(".w").first.scroll_into_view_if_needed(); page.locator(".w").first.click(); page.wait_for_selector("#pop", state="visible")
    # the watch itself works: a script injected into the page is refused and reported
    n = len(errors)
    page.evaluate("() => { const s = document.createElement('script'); s.textContent = 'window.injected = 1'; document.head.append(s); }")
    page.wait_for_timeout(300)
    check(len(errors) > n and not page.evaluate("() => window.injected"), "csp: an injected inline script ran or was not reported")
    del errors[n:]
    # network cut: server stopped, browser offline; the reload comes from the service worker's copy
    srv.shutdown(); srv.server_close()
    ctx.set_offline(True)
    page.goto(url + "#wenyan/2")
    page.reload(); page.wait_for_selector(".lbar", timeout=10000)
    check(page.locator("h1").inner_text().strip() != "", "sw: offline reload opened no lesson")
    page.goto("about:blank"); page.goto(url + "#baihua/1"); page.wait_for_selector(".lbar", timeout=10000)
    page.screenshot(path=str(SHOTS / "offline-lesson.png"))
    ctx.close()
    print("1. service worker: registered; offline reload opens a lesson; CSP: no violation on", len(routes), "routes")


# ---------------------------------------------------------------- 2. single file
def single_file(b):
    ctx = b.new_context(**PHONE)
    no_fonts(ctx)
    out = []
    ctx.route("https://api.github.com/**", lambda r: (out.append(r.request.url), r.abort()))
    page = ctx.new_page(); watch(page, "file")
    page.goto(FILE + "#wenyan/1"); page.wait_for_selector(".lbar")
    page.goto(FILE + "#rumen/1"); page.wait_for_selector(".lbar")
    page.goto(FILE + "#settings"); page.wait_for_selector("#set-sync")
    check(page.get_attribute("#set-sync", "data-state") == "file", "file: Settings should say sync is for the published app")
    check(page.evaluate("!('serviceWorker' in navigator) || !navigator.serviceWorker.controller"), "file: a service worker controls the file")
    check(not out, f"file: requests to GitHub {out}")
    ctx.close()
    print("2. single file (file://): opens, lessons work, no service worker, no request out")


# ---------------------------------------------------------------- fake api.github.com
class FakeGitHub:
    """Gists and the private repo's contents, in memory. Tokens: good (gists), mod (gists + private repo)."""
    def __init__(self):
        self.gists, self.n, self.log, self.down = {}, 0, [], False
        self.tokens = {"tok-good": {"gists"}, "tok-mod": {"gists", "repo"}, "tok-gist2": {"gists"}}
        self.mod = {
            "index.json": json.dumps({"files": {"app.js": "a1", "app.css": "c1"}, "tabs": [["books", "讀冊", "Books"]]}),
            "app.css": "#modh{color:var(--seal)}",
            "app.js": "window.WenyanModule={init(l){this.l=l;},route(h){this.l.main.innerHTML='<div class=\"set\"><h1 id=\"modh\">讀冊</h1><p id=\"modp\">'+this.l.app.esc(h)+'</p></div>';}};",
        }

    def __call__(self, route):
        req = route.request
        u = urlparse(req.url)
        auth = req.headers.get("authorization", "")
        tok = auth.replace("Bearer ", "")
        self.log.append((req.method, u.path, tok))
        if self.down:
            return route.abort("internetdisconnected")
        if tok not in self.tokens:
            return route.fulfill(status=401, json={"message": "Bad credentials"}, headers={"access-control-allow-origin": "*"})
        H = {"access-control-allow-origin": "*"}
        p = u.path
        if p.startswith("/repos/tbrapor-arch/wenyan-private/contents/module/"):
            if "repo" not in self.tokens[tok]:
                return route.fulfill(status=404, json={"message": "Not Found"}, headers=H)
            f = p.rsplit("/", 1)[1]
            return route.fulfill(status=200, body=self.mod[f], headers=H) if f in self.mod else route.fulfill(status=404, json={}, headers=H)
        if p == "/gists" and req.method == "GET":
            return route.fulfill(json=[{"id": k, "files": {n: {} for n in g["files"]}} for k, g in self.gists.items() if g["owner"] == tok.replace("tok-gist2", "tok-good").replace("tok-mod", "tok-good")], headers=H)
        if p == "/gists" and req.method == "POST":
            d = json.loads(req.post_data); self.n += 1; gid = f"g{self.n}"
            self.gists[gid] = {"owner": "tok-good", "public": d["public"], "files": d["files"]}
            return route.fulfill(status=201, json={"id": gid}, headers=H)
        m = re.match(r"^/gists/(\w+)$", p)
        if m and m.group(1) in self.gists:
            g = self.gists[m.group(1)]
            if req.method == "PATCH":
                g["files"].update(json.loads(req.post_data)["files"])
            return route.fulfill(json={"id": m.group(1), "files": {n: {"content": f["content"], "truncated": False} for n, f in g["files"].items()}}, headers=H)
        return route.fulfill(status=404, json={"message": "Not Found"}, headers=H)

    def progress(self):
        g = next(iter(self.gists.values()))
        return json.loads(g["files"]["wenyan-progress.json"]["content"])


def device(b, gh, name, url):
    ctx = b.new_context(service_workers="block", **PHONE)   # requests then reach the fake GitHub directly
    no_fonts(ctx)
    ctx.add_init_script(WATCH)
    ctx.route("https://api.github.com/**", gh)
    # the token goes to api.github.com only
    ctx.on("request", lambda r: LEAKS.append(r.url) if "authorization" in r.headers and not r.url.startswith("https://api.github.com/") else None)
    page = ctx.new_page(); watch(page, name)
    page.goto(url); page.wait_for_selector("main#app > *")
    return ctx, page


def done_of(page):
    return page.evaluate("JSON.parse(localStorage.getItem('wy.done') || '{}')")


def settings(page, url):
    page.goto(url + "#settings"); page.wait_for_selector("#set-sync[data-state]")
    return page.get_attribute("#set-sync", "data-state")


def connect(page, token):
    page.fill("#syncToken", token); page.locator("#syncForm button").click()
    page.wait_for_function("() => !['busy', 'off'].includes(document.querySelector('#set-sync').dataset.state)", timeout=10000)
    return page.get_attribute("#set-sync", "data-state")


def sync_now(page, url):
    settings(page, url); page.locator("#syncNow").click()
    page.wait_for_function("() => document.querySelector('#set-sync').dataset.state !== 'busy'")
    page.wait_for_timeout(100)


def mark(page, url, key, on):
    t, i = key.split(":")
    page.goto(url + f"#{t}/{i}"); page.wait_for_selector(".lbar")
    page.locator("#markdone" if on else "#undo").click(); page.wait_for_selector("#undo" if on else "#markdone")


# ---------------------------------------------------------------- 3. sync
def sync(b):
    srv = serve(8831)
    url = "http://localhost:8831/"
    gh = FakeGitHub()
    d1, p1 = device(b, gh, "device1", url)
    check(settings(p1, url) == "off", "sync: a new device should show 'not connected'")
    p1.screenshot(path=str(SHOTS / "settings-sync-not-connected.png"), full_page=True)
    check(not gh.log, f"sync: requests before any token {gh.log}")
    mark(p1, url, "wenyan:1", True)
    settings(p1, url)
    check(connect(p1, "tok-good") == "on", "sync: first connect did not end connected")
    check(any(m == "POST" and p == "/gists" for m, p, _ in gh.log), "sync: first connect did not create the gist")
    g = next(iter(gh.gists.values()), None)
    check(g and g["public"] is False and "wenyan-progress.json" in g["files"], "sync: the gist is not a secret gist with wenyan-progress.json")
    check("wenyan:1" in gh.progress()["done"], "sync: the gist lacks the lesson done before connecting")
    p1.screenshot(path=str(SHOTS / "settings-sync-connected.png"), full_page=True)

    # device 2 has older progress, from before marks were kept: an earlier date for wenyan:1, and wenyan:2
    d2, p2 = device(b, gh, "device2", url)
    p2.evaluate("localStorage.setItem('wy.done', JSON.stringify({'wenyan:1': '2026-01-01', 'wenyan:2': '2026-02-02'})); localStorage.removeItem('wy.marks')")
    p2.reload(); settings(p2, url)
    check(connect(p2, "tok-good") == "on", "sync: device 2 did not connect")
    check(len(gh.gists) == 1, "sync: device 2 made a second gist instead of finding the first")
    check(done_of(p2) == {"wenyan:1": "2026-01-01", "wenyan:2": "2026-02-02"}, f"sync: device 2 after merge {done_of(p2)}")
    sync_now(p1, url)
    check(done_of(p1) == {"wenyan:1": "2026-01-01", "wenyan:2": "2026-02-02"}, f"sync: earliest date not kept on device 1: {done_of(p1)}")

    # undo on device 1: sent a few seconds later; device 2 (which still has it) must not bring it back
    mark(p1, url, "wenyan:2", False)
    p1.wait_for_timeout(5000)
    check("wenyan:2" not in gh.progress()["done"], "sync: the Undo was not sent after a few seconds")
    sync_now(p2, url)
    check("wenyan:2" not in done_of(p2), "sync: device 2 kept a lesson undone on device 1")
    sync_now(p1, url)
    check("wenyan:2" not in done_of(p1), "sync: device 2 brought back a lesson undone on device 1")
    # and a later Mark-as-done on device 2 wins over that Undo
    mark(p2, url, "wenyan:2", True); sync_now(p2, url); sync_now(p1, url)
    check("wenyan:2" in done_of(p1), "sync: a later 'done' on device 2 did not reach device 1")

    # offline, then back: the change made offline is sent when the network returns
    d2.set_offline(True)
    check(settings(p2, url) == "offline", "sync: offline state not shown")
    p2.screenshot(path=str(SHOTS / "settings-sync-offline.png"), full_page=True)
    n = len(gh.log)
    mark(p2, url, "wenyan:3", True); p2.wait_for_timeout(4500)
    check(len(gh.log) == n, "sync: requests reached GitHub while offline")
    d2.set_offline(False)
    p2.wait_for_function("() => JSON.parse(localStorage.getItem('wy.syncAt') || 0) > Date.now() - 3000 && !localStorage.getItem('wy.syncErr').replace(/\"/g, '')", timeout=10000)
    check("wenyan:3" in gh.progress()["done"], "sync: the change made offline was not sent once back online")

    # token refused: a bad token on a new device, then the saved token revoked on device 1
    d3, p3 = device(b, gh, "device3", url)
    settings(p3, url)
    check(connect(p3, "tok-bad") == "refused", "sync: a bad token is not shown as refused")
    check(p3.evaluate("JSON.parse(localStorage.getItem('wy.gistToken'))") == "", "sync: a refused token was kept")
    del gh.tokens["tok-good"]
    sync_now(p1, url)
    check(p1.get_attribute("#set-sync", "data-state") == "refused", "sync: a revoked token is not shown as refused")
    p1.screenshot(path=str(SHOTS / "settings-sync-refused.png"), full_page=True)
    # the token went to api.github.com only (the fake sees every request to it; nothing else may carry it)
    check(not LEAKS, f"sync: token sent elsewhere {LEAKS}")
    check(all(t in ("", "tok-good", "tok-bad") for _, _, t in gh.log) and any(t for _, _, t in gh.log), "sync: unexpected Authorization")
    for c in (d1, d2, d3):
        c.close()
    srv.shutdown(); srv.server_close()
    print("3. sync: gist created on first connect; earliest date kept; Undo not brought back; later done wins;",
          "token refused (new and revoked); offline then back")


# ---------------------------------------------------------------- 4. private module
def module(b):
    srv = serve(8832)
    url = "http://localhost:8832/"
    gh = FakeGitHub()
    # no token: no tab, no request
    c0, p0 = device(b, gh, "mod-none", url)
    p0.goto(url + "#books"); p0.wait_for_selector("main#app > *"); p0.wait_for_timeout(500)
    check(not p0.locator('nav a[href="#books"]').count(), "module: tab shown without a token")
    check(not gh.log, f"module: requests without a token {gh.log}")
    settings(p0, url)
    check(p0.locator("#set-module").is_hidden(), "module: Settings shows the module without a token")
    c0.close()
    # a token that can read the private repo
    c1, p1 = device(b, gh, "mod-on", url)
    p1.evaluate("localStorage.setItem('wy.gistToken', JSON.stringify('tok-mod'))")
    p1.reload(); p1.wait_for_selector('nav a[href="#books"]', timeout=10000)
    p1.locator('nav a[href="#books"]').click(); p1.wait_for_selector("#modh")
    check(p1.inner_text("#modp") == "books", "module: route not passed to the module")
    p1.goto(url + "#books/7"); p1.wait_for_function("() => document.querySelector('#modp') && document.querySelector('#modp').textContent === 'books/7'")
    settings(p1, url)
    check(p1.get_attribute("#set-module", "data-state") == "on", "module: Settings does not show it on")
    p1.screenshot(path=str(SHOTS / "settings-module-on.png"), full_page=True)
    # GitHub unreachable: the cached module still opens
    gh.down = True
    p1.goto("about:blank"); p1.goto(url + "#books"); p1.wait_for_selector("#modh", timeout=10000)
    check(p1.locator('nav a[href="#books"]').count() == 1, "module: tab lost when GitHub is unreachable")
    p1.screenshot(path=str(SHOTS / "module-offline.png"))
    c1.close()
    gh.down = False
    # a token that cannot read the repo (sync only)
    c2, p2 = device(b, gh, "mod-off", url)
    p2.evaluate("localStorage.setItem('wy.gistToken', JSON.stringify('tok-gist2'))")
    p2.reload(); p2.wait_for_timeout(1500)
    check(not p2.locator('nav a[href="#books"]').count(), "module: tab shown for a token that cannot read the repo")
    settings(p2, url)
    check(p2.get_attribute("#set-module", "data-state") == "off", "module: Settings should say not available")
    c2.close()
    srv.shutdown(); srv.server_close()
    print("4. module: no token, no tab, no request; tab and route with a token that reads the repo; cached copy",
          "with GitHub unreachable; nothing for a token without access")


if not SITE.joinpath("index.html").exists():
    sys.exit("smoke_services: run make site first")
SHOTS.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    for test in (offline_and_csp, single_file, sync, module):
        try:
            test(b)
        except Exception as e:   # one test failing must not hide the others
            errors.append(f"{test.__name__}: {type(e).__name__}: {str(e).splitlines()[0]}")
    b.close()
if errors:
    sys.exit("\n".join(errors))
print("smoke_services: ok")
