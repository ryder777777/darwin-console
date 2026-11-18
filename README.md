# DARWIN-Ω console

Static dashboard for the swarm: LLM lane health and the finding-triage panel.

**Live:** https://ryder777777.github.io/darwin-console/

No build step, no dependencies, no backend of its own. The page paints from an
embedded snapshot and upgrades to live data if the Render node answers:

| endpoint | what it adds |
|---|---|
| `/health` | build, agents, work counters |
| `/api/llm/health` | all 23 lanes, their state and counters |
| `/api/llm/panel/last` | the most recent panel run, or `{ran:false}` |

## The rule this page is built around

**A dashboard must not lie when its backend is down.** Every section carries its
own provenance badge — `lanes LIVE` next to `panel SNAPSHOT` is a completely
different claim from a single hopeful "LIVE" pill, and the difference matters
when you are deciding whether to trust what you are reading.

Three specific dishonesty bugs were found and fixed while building this:

1. **Self-grading.** Hand adjudication of the nine panel verdicts was typed into
   the snapshot. On live data that field does not exist, so the scorecard read
   "0 of N right" — confidently wrong. The page now says it has not
   hand-checked the live output and claims nothing.
2. **Stale panel sold as live.** The panel rendered the snapshot while the pill
   said "live · render". Fixed by fetching the real panel and labelling provenance
   per section.
3. **A wrong count in the write-up.** "4 of 6 kills were right, 2 wrong" was my
   statement; re-reading each verdict it is **2 confirmed, 3 partly, 1 plainly
   wrong**. The page now counts three buckets and links each to its reason.

## Tests

```sh
npm test
```

Two jsdom suites, 31 assertions: one with the node suspended (the state you are
most likely to find it in), one with it answering. No server, no network, no
browser.
