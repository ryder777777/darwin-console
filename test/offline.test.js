const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/tmp/pages/index.html', 'utf8');

// No network: fetch always fails, which is exactly the suspended-node case.
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'https://example.github.io/darwin-console/',
  beforeParse(w) {
    w.fetch = () => Promise.reject(new Error('offline'));
    w.AbortController = class { constructor(){this.signal=null;} abort(){} };
    w.history.replaceState = () => {};
  },
});
const w = dom.window, d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(300);
  const t = (s) => d.querySelector(s)?.textContent?.trim();
  const checks = [];
  const ok = (name, cond, extra='') => checks.push([cond?'PASS':'FAIL', name, extra]);

  ok('status pill = suspended', (t('#status')||'').includes('suspended'), t('#status'));
  ok('retry button visible', d.querySelector('#retry')?.style.display === 'inline-block',
     d.querySelector('#retry')?.style.display);
  ok('5 overview stats', d.querySelectorAll('#stat-row .stat').length === 5,
     d.querySelectorAll('#stat-row .stat').length);
  const laneRows = d.querySelectorAll('#lane-rows tr').length;
  ok('23 lane rows', laneRows === 23, laneRows);
  ok('11 lane stats', d.querySelectorAll('#lane-stats .stat').length === 5,
     d.querySelectorAll('#lane-stats .stat').length);

  // panel: default tab is overview; click panel
  d.querySelector('[data-tab="panel"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await wait(50);
  const cards = d.querySelectorAll('#panel-list .card').length;
  ok('9 panel cards', cards === 9, cards);
  ok('panel tab visible', d.querySelector('#panel').classList.contains('on'));
  ok('overview tab hidden', !d.querySelector('#overview').classList.contains('on'));

  // scorecard honesty
  const note = t('#panel-note');
  ok("scorecard counts 6 kills", /Of 6 kills: 2 confirmed, 3 right about the code/.test(note||""), (note||"").slice(0,110));
  ok('scorecard says live is not self-graded', /self-grade/.test(note||''));

  // one card must carry the wrong marker
  ok('wrong kill is labelled', (d.querySelector('#panel-list').textContent||'').includes('this kill was wrong'));

  // filters
  const refused = d.querySelector('#panel-filters [data-f="refused"]');
  refused.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await wait(50);
  const nRefused = d.querySelectorAll('#panel-list .card').length;
  ok('refused filter = 1', nRefused === 1, nRefused);
  ok('refused badge label', (d.querySelector('#panel-list').textContent||'').includes('KILL REFUSED'));

  d.querySelector('#panel-filters [data-f="all"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await wait(50);
  ok('all filter restores 9', d.querySelectorAll('#panel-list .card').length === 9);

  // a11y
  const sel = d.querySelector('[data-tab="panel"]');
  ok('aria-selected on active tab', sel.getAttribute('aria-selected') === 'true');
  ok('inactive tabs tabindex=-1', d.querySelector('[data-tab="lanes"]').tabIndex === -1);
  ok('aria-controls present', d.querySelectorAll('nav button[aria-controls]').length === 4);
  ok('sections have role=tabpanel', d.querySelectorAll('section[role="tabpanel"]').length === 4);

  // arrow key nav
  d.querySelector('[data-tab="overview"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  await wait(50);
  ok('ArrowRight moves to lanes', d.querySelector('#lanes').classList.contains('on'));

  // no external resources referenced
  const ext = [...d.querySelectorAll('[src],[href]')].map(e=>e.getAttribute('src')||e.getAttribute('href')).filter(u=>u&&/^https?:/.test(u));
  ok('no external assets', ext.length === 0, JSON.stringify(ext));

  let fails = 0;
  for (const [s,n,x] of checks) { if (s==='FAIL') fails++; console.log(`${s}  ${n}${x!==''?'  ['+x+']':''}`); }
  console.log(`\n${checks.length-fails}/${checks.length} passed`);
  process.exit(fails ? 1 : 0);
})();
