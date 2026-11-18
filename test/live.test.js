const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/tmp/pages/index.html','utf8');

// Simulate the node coming BACK: /health and /api/llm/health both answer.
const NODE_HEALTH = {ok:true, build:"3.4.0", node_id:"render-primary", agents_active:250,
  completed_work:180, evolutions:136, uptime_sec:900, frozen:false};
const LANES = {lanes_total:23, ready:12, keyless_enabled:true,
  providers:["groq","ovhcloud","pollinations"],
  lanes:[
    {lane:"groq/openai/gpt-oss-120b", state:"ready", ok:40, fail:1, cooldown_left:0},
    {lane:"ovhcloud/Qwen3.8-27B", state:"ready", ok:9, fail:2, cooldown_left:0},
    {lane:"pollinations/openai", state:"cooling", ok:6, fail:1, cooldown_left:44},
  ]};

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://x.github.io/d/',
  beforeParse(w){
    w.AbortController = class { constructor(){this.signal=null;} abort(){} };
    w.history.replaceState = () => {};
    const PANEL_LAST = {ran:true, generated:"2026-11-18T14:02:00Z", root:"/app",
      panel_n:3, asked:4, killed:1, rows:[
        {contract:"Vault", function:"deposit(uint256)", lens:"reentrancy", confidence:0.5,
         verdict:"FALSE_POSITIVE", killed:true, votes:{"FALSE_POSITIVE":2},
         agreement:1.0, quorum_met:true, cited:true,
         reason:"the nonReentrant modifier on deposit() serialises entry",
         lanes_used:["groq/openai/gpt-oss-120b","ovhcloud/Qwen3.8-27B"]},
        {contract:"Claim", function:"claim(bytes32)", lens:"signature_replay", confidence:0.4,
         verdict:"UNCERTAIN", killed:false, votes:{"UNCERTAIN":2},
         agreement:1.0, quorum_met:false, reason:"", lanes_used:["pollinations/openai"]}
      ]};
    w.fetch = (u) => Promise.resolve({ok:true, json:()=>Promise.resolve(
      u.endsWith('/api/llm/health') ? LANES :
      u.endsWith('/api/llm/panel/last') ? PANEL_LAST : NODE_HEALTH)});
  }});
const w=dom.window, d=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(400);
  const t=s=>d.querySelector(s)?.textContent?.trim();
  const checks=[]; const ok=(n,c,x='')=>checks.push([c?'PASS':'FAIL',n,x]);

  ok('pill goes live', (t('#status')||'').includes('live'), t('#status'));
  ok('retry hidden when live', d.querySelector('#retry').style.display === 'none',
     d.querySelector('#retry').style.display);
  ok('node card shows build', (t('#node-box')||'').includes('3.4.0'), (t('#node-box')||'').slice(0,70));
  ok('node card shows LIVE badge', (t('#node-box')||'').includes('LIVE'));
  ok('lanes from live payload', d.querySelectorAll('#lane-rows tr').length === 3,
     d.querySelectorAll('#lane-rows tr').length);
  ok('lanes ready stat = 12', (t('#lane-stats')||'').includes('12'));

  // THE stale-data bug: on live data there is no hand adjudication, so the
  // scorecard must say so instead of claiming a confident wrong number.
  d.querySelector('[data-tab="panel"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await wait(60);
  const note = t('#panel-note')||'';
  ok('live panel does not self-grade', /nobody has hand-checked|has not/i.test(note), note.slice(0,90));
  ok('live panel does not claim a right/wrong count', !/\d+ of \d+ kills were right/.test(note));
  ok('panel uses the LIVE run, not the snapshot',
     d.querySelectorAll('#panel-list .card').length === 2,
     d.querySelectorAll('#panel-list .card').length);
  ok('provenance marks panel LIVE',
     (d.querySelector('#provenance')?.textContent||'').includes('panel LIVE'),
     d.querySelector('#provenance')?.textContent);
  ok('snapshot banner hidden when live',
     d.querySelector('#panel-src').style.display === 'none',
     d.querySelector('#panel-src').style.display);

  let f=0; for(const [s,n,x] of checks){ if(s==='FAIL')f++; console.log(`${s}  ${n}${x!==''?'  ['+x+']':''}`); }
  console.log(`\n${checks.length-f}/${checks.length} passed`);
  process.exit(f?1:0);
})();
