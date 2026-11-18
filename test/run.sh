#!/bin/sh
# Three suites, all pure jsdom: no server, no network, no browser.
set -e
cd "$(dirname "$0")/.."
[ -d node_modules/jsdom ] || npm install --silent --no-fund --no-audit jsdom
echo "--- 1/3 node suspended, nothing published ---"
node test/offline.test.js
echo "--- 2/3 node answering ---"
node test/live.test.js
echo "--- 3/3 node DEAD, status published to HF ---"
node test/hf.test.js
