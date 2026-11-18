# make data      download open sources into data/raw (CC-CEDICT, jieba, HSK lists)
# make app       make data, then validate the lessons, write app/course.json, app/dist/index.html and dist/wenyan.html
# make test      validate the lessons only (non-zero exit on an error)
# make smoke     build, then click through the app at phone and desktop width (needs playwright)
PY = python3 -I

.PHONY: data app test smoke clean
data:
	sh data/fetch.sh

app: data
	$(PY) tools/build.py

test:
	$(PY) tools/build.py --check

smoke: app
	$(PY) tools/smoke.py

clean:
	rm -rf app/dist dist app/course.json data/build
