/** Generates public/pitch.html (the required public pitch link) from benchmark/benchmark.json. Every slide is tagged with the judging criterion it serves. `npm run deck`. */
import fs from "node:fs";
import path from "node:path";

const b = JSON.parse(fs.readFileSync(path.join("benchmark", "benchmark.json"), "utf8"));
const r = b.results.find((x: { engine: string }) => x.engine === "nebius");
const closed = b.results.find((x: { engine: string }) => x.engine === "closed");
const tok = r.run;
const gpt5 = (tok.input_tokens * 1.25 + tok.output_tokens * 10) / 1e6;
const HOURLY = 57, USD_EUR = 0.92;
const eur = r.usd * USD_EUR;
const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const URL = "https://hackathon-ten-zeta-43.vercel.app";
const traps = r.scored.filter((s: { trap: string }) => s.trap);

const slide = (crit: string, kicker: string, body: string) => `<section><div class="crit">${crit}</div><div class="kicker">${kicker}</div>${body}</section>`;

const slides = [
  `<section class="title"><div class="mark"></div><h1>TenderScale</h1><p class="tag">Security questionnaires answered from your own policies.<br>Every answer quoted. Every conflict flagged. No source, no answer.</p><p class="sub">Open models on Nebius Token Factory · Accel AI Innovate Amsterdam · 23 Sep 2026</p></section>`,

  slide("02 · Problem and company potential", "The problem", `<h2>Selling to a bank means 50–200 security questions, every deal</h2>
  <ul><li>A security lead spends <b>20–40 hours</b> per questionnaire: find the paragraph, check it still holds, write it down.</li>
  <li>3–6 questionnaires a quarter. Every answer is a contractual statement.</li>
  <li>Today: spreadsheets, Ctrl+F, last year's answers, and $20–50k/yr RFP tools that still leave the checking to a human.</li>
  <li>The four ways it goes wrong: copying an outdated answer · not seeing two policies disagree · answering what nothing covers · saying Yes because Yes sounds better.</li></ul>`),

  slide("01 · Product and user value", "Meet the customer", `<h2>Personivo, 25 people, HR software for banks</h2>
  <div class="cards"><div class="card"><div class="k">Has</div><div class="v">3 policies (InfoSec v4.0, DataProt v3.1, IR/BC v2.3), ISO 27001, last year's 30 answers</div></div>
  <div class="card"><div class="k">Gets</div><div class="v">A 50-question CAIQ v4.1 from a bank. Due Friday.</div></div>
  <div class="card"><div class="k">Hidden inside</div><div class="v">3 practices that changed since 2025 · 2 policies that disagree · 2 questions no policy covers · 1 honest "No"</div></div>
  <div class="card"><div class="k">Fictional company</div><div class="v">Real CAIQ questions (CSA), hand-built answer key the system never sees</div></div></div>`),

  slide("01 · Product and user value", "The product", `<h2>What every answer carries</h2>
  <ul class="two"><li><b>Yes / No / Unknown</b> plus a two-sentence comment and the reason</li><li><b>Verbatim quote</b> with policy, section and version; the code verifies the quote exists</li>
  <li><b>Flag</b>: green ready · orange review (conflict, changed practice, unverified number) · red no source</li><li><b>One click to the policy</b> with the sentence highlighted and what changed between versions</li>
  <li><b>Diff after a policy update</b>: which answers changed and why</li><li><b>Gap list</b> and CSV export in the bank's own layout, flags included</li></ul>`),

  slide("05 · Demo clarity", "Live demo · 60 seconds", `<h2>Watch the clock</h2>
  <ol><li>Run the 50 questions. Rows stream in.</li><li>Open BCR-08.1: last year weekly backups, policy now daily. Flagged, both shown, click the source.</li><li>Open DSP-18.1: law enforcement requests. No policy covers it. Red. It refuses.</li><li>Load IR/BC v2.4, run again: three answers change, it says which and why.</li></ol>
  <p class="link">${URL}</p>`),

  slide("04 · Technical execution and Token Factory use", "Architecture", `<h2>Select, write, verify. 100% open models on Nebius Token Factory.</h2>
  <div class="flow"><div class="box"><div class="k">shortlist</div><div class="m">Qwen3-Embedding-8B</div><div class="v">cosine over sections and past answers, in memory</div></div><div class="arr">→</div>
  <div class="box"><div class="k">select · small</div><div class="m">Qwen3-30B-A3B</div><div class="v">sections that contain the answer · coverage · $0.10 / $0.30 per 1M</div></div><div class="arr">→</div>
  <div class="box"><div class="k">write · large</div><div class="m">Qwen3-235B-A22B</div><div class="v">Yes/No/Unknown · quotes · conflicts · $0.20 / $0.60 per 1M</div></div><div class="arr">→</div>
  <div class="box hi"><div class="k">verify · code</div><div class="m">no model</div><div class="v">quote in section? numbers quoted? no source → Unknown · deterministic flags</div></div></div>
  <p class="small">50 questions in parallel · 100 calls per questionnaire · streamed to the browser · no closed model anywhere in the pipeline</p>`),

  slide("03 · Measurable model advantage", "Measured, not claimed", `<h2>One questionnaire, 50 questions, answer key never seen by the model</h2>
  <table><thead><tr><th></th><th>Security lead</th><th>TenderScale · Nebius</th><th>Closed model</th></tr></thead><tbody>
  <tr><td>Time</td><td>20–40 h</td><td class="nb">${r.seconds.toFixed(0)} s</td><td>${closed ? closed.seconds.toFixed(0) + " s" : "—"}</td></tr>
  <tr><td>Cost</td><td>€${fmt(20 * HOURLY)}–€${fmt(40 * HOURLY)}</td><td class="nb">€${eur.toFixed(3)}</td><td>GPT-5 list price $${gpt5.toFixed(2)} · ${fmt(gpt5 / r.usd)}×</td></tr>
  <tr><td>Answers correct</td><td>—</td><td class="nb">${r.answersCorrect} / 50</td><td>${closed ? closed.answersCorrect + " / 50" : "not measured"}</td></tr>
  <tr><td>Flags correct · invented numbers</td><td>—</td><td class="nb">${r.flagsCorrect} / 50 · ${r.invented}</td><td>${closed ? closed.flagsCorrect + " / 50 · " + closed.invented : "not measured"}</td></tr>
  <tr><td>Quotes verified by code</td><td>manual</td><td class="nb">100%</td><td>—</td></tr>
  <tr><td>Policies leave the EU</td><td>no</td><td class="nb">no</td><td>yes</td></tr></tbody></table>
  <p class="small">Human time: Loopio RFP benchmark ~30 h/response · €${HOURLY}/h fully loaded · proof: ${URL}/benchmark and benchmark/benchmark.md</p>`),

  slide("03 · Measurable model advantage", "Why open, why these", `<h2>Chosen on the numbers, on the day</h2>
  <ul class="two"><li><b>Selector</b>: Qwen3-30B 1.1 s median at 50 concurrent calls; the 235B as selector fell to 13 s; gemma-3-27b's tail ran into minutes.</li>
  <li><b>Writer</b>: Qwen3-235B blind-judged 4.21/5; gpt-oss-120b 2.57; DeepSeek-V4-Flash 2.87 and 3× slower (reasoning tokens).</li>
  <li><b>Control</b>: JSON without schema mode (schema mode cost +2.5 s per call); one env var swaps a tier; open weights can be fine-tuned on approved answers.</li>
  <li><b>Privacy</b>: the questionnaire <i>is</i> the company's security architecture. It stays in the EU on Nebius. That is the consistent answer to a European bank.</li></ul>`),

  slide("06 · Responsible design", "Never invent. Always escalate.", `<ul class="two"><li>Every answer cites a verbatim quote; the code verifies it against the section.</li><li>No answer without a source: red questions are never answered.</li>
  <li>Every number in a comment must be backed by a quote, or the answer is flagged.</li><li>Last year's answers never override the current policy.</li>
  <li>Nothing stored server-side; a run lives in the reviewer's browser until exported. No personal data leaves the EU.</li><li>If the model is wrong: the reviewer sees the source in one click, edits, and the export carries the flags.</li></ul>`),

  slide("02 · Problem and company potential", "The company", `<h2>A budgeted category, a better cost structure</h2>
  <ul class="two"><li><b>Market</b>: every B2B vendor selling to regulated buyers; questionnaire tools already have budget owners (Loopio, Responsive, Vanta, Whistic).</li>
  <li><b>Wedge</b>: mid-market vendors for whom a slow questionnaire is a lost deal and a wrong one is a liability.</li>
  <li><b>Pricing</b>: €500–2,000 / month per team; one won contract pays for years; cents per questionnaire leave >80% gross margin.</li>
  <li><b>Next</b>: RFPs, due-diligence questionnaires, the buyer's side of the table, per-customer fine-tuning on approved answers.</li></ul>
  <p class="ask">Ask: three pilot customers selling to Dutch banks.</p><p class="team">Akram Chakrouni · Yahia · Adam</p>`),
];

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TenderScale · Pitch</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--ink:#0b0d10;--panel:#111418;--line:#1f242b;--mute:#8b95a3;--fg:#e6e9ee;--accent:#7dd3fc;--ok:#34d399;--warn:#fbbf24;--bad:#f87171}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--ink);color:var(--fg);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}
#stage{position:relative;width:100vw;height:100vh}
section{position:absolute;inset:0;padding:72px 96px;display:none;flex-direction:column;justify-content:center}section.on{display:flex}
.crit{position:absolute;top:36px;left:96px;font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.kicker{font-family:ui-monospace,Menlo,monospace;font-size:22px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin-bottom:18px}
h1{font-size:120px;margin:0;letter-spacing:-.03em}h2{font-size:54px;margin:0 0 28px;letter-spacing:-.02em;line-height:1.1}
.tag{font-size:38px;line-height:1.3;margin:24px 0 0;color:var(--fg)}.sub{font-size:24px;color:var(--mute);margin-top:32px}
.title{align-items:flex-start}.mark{width:64px;height:64px;border:5px solid var(--accent);border-radius:50%;position:relative;margin-bottom:40px}.mark:after{content:"";position:absolute;left:26px;top:12px;width:6px;height:32px;background:var(--accent);border-radius:3px}
ul,ol{font-size:32px;line-height:1.45;margin:0;padding-left:34px}li{margin:10px 0}ul.two{columns:2;column-gap:64px}ul.two li{break-inside:avoid}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:26px 28px}.k{font-family:ui-monospace,Menlo,monospace;color:var(--accent);font-size:20px;text-transform:uppercase;letter-spacing:.1em}.v{font-size:30px;line-height:1.3;margin-top:8px}
.flow{display:flex;align-items:stretch;gap:14px}.box{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px}.box.hi{border-color:var(--accent)}.box .m{font-family:ui-monospace,Menlo,monospace;font-size:26px;margin:8px 0}.box .v{font-size:22px;color:var(--mute)}.arr{align-self:center;font-size:40px;color:var(--mute)}
table{width:100%;border-collapse:collapse;font-size:30px}th{text-align:left;font-family:ui-monospace,Menlo,monospace;font-size:20px;color:var(--mute);text-transform:uppercase;letter-spacing:.08em;padding:0 18px 12px 0}td{padding:14px 18px 14px 0;border-top:1px solid var(--line)}td.nb{color:var(--ok);font-family:ui-monospace,Menlo,monospace;font-weight:600}
.small{font-size:20px;color:var(--mute);margin-top:22px}.link{font-family:ui-monospace,Menlo,monospace;font-size:34px;color:var(--accent);margin-top:36px}.ask{font-size:34px;margin-top:36px;color:var(--ok)}.team{font-size:24px;color:var(--mute)}
#bar{position:absolute;top:0;left:0;height:4px;background:var(--accent);transition:width .25s}#n{position:absolute;right:40px;bottom:28px;font-family:ui-monospace,Menlo,monospace;color:var(--mute);font-size:18px}#foot{position:absolute;left:96px;bottom:28px;font-family:ui-monospace,Menlo,monospace;color:var(--mute);font-size:16px}
@media (max-width:1100px){section{padding:48px}h1{font-size:72px}h2{font-size:36px}ul,ol{font-size:22px}ul.two{columns:1}.v{font-size:22px}table{font-size:20px}.tag{font-size:26px}}
</style></head><body><div id="stage">${slides.join("\n")}<div id="bar"></div><div id="foot">TenderScale · Accel AI Innovate Amsterdam · Nebius Token Factory</div><div id="n"></div></div>
<script>
const s=[...document.querySelectorAll('section')];let i=Math.max(0,Math.min(s.length-1,(parseInt(location.hash.slice(1))||1)-1));
function go(k){i=Math.max(0,Math.min(s.length-1,k));s.forEach((e,j)=>e.classList.toggle('on',j===i));document.getElementById('n').textContent=(i+1)+' / '+s.length;document.getElementById('bar').style.width=((i+1)/s.length*100)+'%';history.replaceState(null,'','#'+(i+1));}
addEventListener('keydown',e=>{if(['ArrowRight',' ','Enter','PageDown'].includes(e.key))go(i+1);else if(['ArrowLeft','PageUp'].includes(e.key))go(i-1);else if(e.key==='Home')go(0);else if(e.key==='End')go(s.length-1);else if(e.key==='f')document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();});
addEventListener('click',e=>{if(e.target.closest('a'))return;go(e.clientX>innerWidth/3?i+1:i-1)});go(i);
</script></body></html>`;
fs.writeFileSync(path.join("public", "pitch.html"), html);
console.log("wrote public/pitch.html,", slides.length, "slides");
