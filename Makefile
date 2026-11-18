# make data      download open sources into data/raw (CC-CEDICT, jieba, HSK lists)
# make app       validate the lessons, write app/course.json, app/dist/index.html and dist/wenyan.html
# make test      validate the lessons only (non-zero exit on an error)
# make site      the published site in _site/: the page with its CSP, manifest, icons, offline service worker
# make smoke     build, click through the app at phone and desktop width, then test the site's services (needs playwright)
PY = python3 -I

.PHONY: data app site test smoke clean
data:
	sh data/fetch.sh

app:
	$(PY) tools/build.py

site: app
	$(PY) tools/site.py _site

test:
	$(PY) tools/build.py --check

smoke: site
	$(PY) tools/smoke.py
	$(PY) tools/smoke_services.py

clean:
	rm -rf app/dist dist app/course.json data/build _site
