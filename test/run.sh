#!/bin/sh
# Both suites are pure jsdom: no server, no network, no browser.
set -e
cd "$(dirname "$0")/.."
[ -d node_modules/jsdom ] || npm install --silent --no-fund --no-audit jsdom
echo "--- offline (node suspended) ---"
node test/offline.test.js
echo "--- live (node answering) ---"
node test/live.test.js
