#!/bin/sh
# Download the open sources the dictionary needs into data/raw (pinned versions). Safe to run again: what is already
# there and correct is kept. Nothing in data/raw is committed (see .gitignore).
# Same layout as Tsheh-tû's data/fetch.sh, so its tools/zh_words.py finds the same paths.
set -e
cd "$(dirname "$0")"
mkdir -p raw

# CC-CEDICT (CC BY-SA 4.0, MDBG) as JSON: pinyin and English for Mandarin words. Needs npm.
if [ ! -f raw/cedict/package/cedict.json ]; then
  mkdir -p raw/cedict
  (cd raw/cedict && npm pack cedict-json@1.3.20251213 --silent >/dev/null && tar xzf cedict-json-1.3.20251213.tgz)
fi
echo "ok  cedict-json @ 1.3.20251213"

# jieba's dictionary and idf weights (MIT, fxsjy/jieba at a pinned commit): word frequencies to cut Mandarin texts
# into words (tools/zh_words.py). Checked against their SHA-256.
JIEBA=67fa2e36e72f69d9134b8a1037b83fbb070b9775
mkdir -p raw/jieba
for f in dict.txt:7197c3211ddd98962b036cdf40324d1ea2bfaa12bd028e68faa70111a88e12a8 \
         analyse/idf.txt:501b70ec56c34d90f3f590f1918ca4b1bd617d5b46cd99bd6d17c7de6e4f80ed; do
  n=${f%%:*}; h=${f##*:}; out=raw/jieba/$(basename "$n")
  if [ ! -f "$out" ] || ! echo "$h  $out" | sha256sum -c --quiet - 2>/dev/null; then
    curl -sSfL -o "$out" "https://raw.githubusercontent.com/fxsjy/jieba/$JIEBA/jieba/$n"
    echo "$h  $out" | sha256sum -c --quiet -
  fi
done
echo "ok  jieba @ $(echo $JIEBA | cut -c1-7)"

# complete-hsk-vocabulary (MIT): HSK readings of longer words, read by tools/zh_words.py when present.
HSKV=7ac65bf1a6387d35f1ade478906172a19311c7f9
if [ ! -d raw/complete-hsk-vocabulary/.git ]; then
  git clone --quiet --filter=blob:none https://github.com/drkameleon/complete-hsk-vocabulary.git raw/complete-hsk-vocabulary
fi
git -C raw/complete-hsk-vocabulary fetch --quiet --depth 1 origin "$HSKV" 2>/dev/null || true
git -C raw/complete-hsk-vocabulary -c advice.detachedHead=false checkout --quiet "$HSKV"
echo "ok  complete-hsk-vocabulary @ $(git -C raw/complete-hsk-vocabulary rev-parse --short HEAD)"
