const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const hunt = JSON.parse(fs.readFileSync(__dirname + '/fixtures-hunt.json','utf8'));
let fails = 0, oks = 0;
const ok = (c, m) => { c ? (oks++, console.log('  ok   ' + m)) : (fails++, console.log('  FAIL ' + m)); };

const vc = new VirtualConsole();
const dom = new JSDOM(fs.readFileSync(__dirname + '/../index.html','utf8'), {
  runScripts: 'dangerously', virtualConsole: vc, url: 'https://x.github.io/',
  beforeParse(w) {
    w.fetch = () => new Promise(() => {});          // never resolves: we paint manually
    w.AbortController = class { constructor(){this.signal={};} abort(){} };
    w.history.replaceState = () => {};
    w.IntersectionObserver = class { observe(){} disconnect(){} };
  },
});
const w = dom.window, d = w.document;
setTimeout(() => {
  ok(typeof w.paintHunt === 'function', 'paintHunt is exported to window scope');
  // tab exists
  ok(!!d.querySelector('[data-tab="hunts"]'), 'Hunts tab exists in nav');
  ok(!!d.querySelector('#hunts'), '#hunts section exists');
  // empty state first
  w.paintHunt(null);
  ok(/no hunt published yet/.test(d.querySelector('#hunt-stats').textContent),
     'empty state says "no hunt published yet"');
  // now the real payload
  w.paintHunt(hunt);
  const stats = d.querySelector('#hunt-stats').textContent;
  ok(stats.includes(String(hunt.survivors)), 'stats show survivors ' + hunt.survivors);
  ok(stats.includes(String(hunt.files_scanned)), 'stats show files ' + hunt.files_scanned);
  ok(stats.includes(hunt.elapsed_sec + 's'), 'stats show wall time');
  const src = d.querySelector('#hunt-src').textContent;
  ok(src.includes('github-actions'), 'provenance names the runner');
  ok(/sweep/.test(src), 'provenance says sweep, not live node');
  const cards = d.querySelectorAll('#hunt-list article');
  ok(cards.length === hunt.findings.length, `rendered ${cards.length}/${hunt.findings.length} finding cards`);
  // lens filter
  const btn = [...d.querySelectorAll('#hunt-filters button')].find(b => b.dataset.hf === 'packed_collision');
  ok(!!btn, 'lens filter button rendered');
  btn.click();
  const after = d.querySelectorAll('#hunt-list article').length;
  ok(after === (hunt.by_lens.packed_collision || 0), `filter reduced to ${after} card(s)`);
  // honesty
  ok(/sweep, not a daemon/i.test(d.querySelector('#hunt-note').textContent),
     'footnote states it is a sweep, not a daemon');
  ok(!/onrender/.test(fs.readFileSync(__dirname + '/../index.html','utf8').match(/HUNT_URL[\s\S]{0,200}/)[0]),
     'HUNT_URL does not point at Render');
  console.log(`\n  ${oks} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}, 400);
