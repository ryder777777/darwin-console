// The case that matters most now: Render is dead, but a published status exists.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/tmp/pages/index.html','utf8');

const STATUS = {generated:"2026-11-18T13:35:45Z", runner:"github-actions",
  lanes:{lanes_total:23, ready:13, keyless_enabled:true,
    providers:["llm7","ovhcloud","pollinations"],
    lanes:[
      {lane:"ovhcloud/Qwen3.8-27B", state:"ready", ok:41, fail:2},
      {lane:"pollinations/openai", state:"ready", ok:19, fail:1},
      {lane:"groq/openai/gpt-oss-120b", state:"no-key", ok:0, fail:0},
    ]}, panel:null, node:{agents_active:250, findings:2}, errors:[]};

const dom = new JSDOM(html,{runScripts:'dangerously', url:'https://x.github.io/d/',
  beforeParse(w){
    w.AbortController = class { constructor(){this.signal=null;} abort(){} };
    w.history.replaceState = () => {};
    w.fetch = (u) => {
      if (u.includes('huggingface.co')) return Promise.resolve({ok:true, json:()=>Promise.resolve(STATUS)});
      return Promise.reject(new Error('503'));      // Render still suspended
    };
  }});
const w=dom.window,d=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(500);
  const t=s=>d.querySelector(s)?.textContent?.trim()||'';
  const checks=[];const ok=(n,c,x='')=>checks.push([c?'PASS':'FAIL',n,x]);

  ok('pill shows published runner', t('#status').includes('published'), t('#status'));
  ok('provenance says PUBLISHED not LIVE',
     t('#provenance').includes('lanes PUBLISHED') && !t('#provenance').includes('lanes LIVE'),
     t('#provenance'));
  ok('lane rows come from HF', d.querySelectorAll('#lane-rows tr').length===3,
     d.querySelectorAll('#lane-rows tr').length);
  ok('13 lanes ready from HF', t('#lane-stats').includes('13'), t('#lane-stats').slice(0,40));
  ok('generated time from HF', t('#source-box').includes('13:35:45'), t('#source-box').slice(0,90));
  ok('source names the runner', /github-actions/i.test(t('#source-box')), t('#source-box').slice(0,90));
  ok('panel still honestly snapshot', t('#provenance').includes('panel SNAPSHOT'), t('#provenance'));

  let f=0;for(const[s,n,x]of checks){if(s==='FAIL')f++;console.log(`${s}  ${n}${x!==''?'  ['+x+']':''}`);}
  console.log(`\n${checks.length-f}/${checks.length} passed`);
  process.exit(f?1:0);
})();
