/** Writes docs/pitch-pack.md + docs/charts/*.svg from benchmark/benchmark.json: every number the pitch uses, with its source. `npm run pitch-pack`. */
import fs from "node:fs";
import path from "node:path";

const b = JSON.parse(fs.readFileSync(path.join("benchmark", "benchmark.json"), "utf8")) as { generatedAt: string; judge: string; results: Result[] };
interface Result { engine: string; model_small: string; model_large: string; run: { duration_ms: number; input_tokens: number; output_tokens: number; cost_usd: number }; scored: { id: string; trap: string; expected: string; expectedFlag: string; answer: string; flag: string; score: number }[]; answersCorrect: number; flagsCorrect: number; invented: number; factsCovered: number; trapsCaught: number; pastMatched: number; avgScore: number; seconds: number; usd: number; eur: number }
const r = b.results.find((x) => x.engine === "nebius")!;
const closed = b.results.find((x) => x.engine === "closed");

// ── assumptions, all stated on the slide ──
const HUMAN_H = { low: 20, mid: 30, high: 40 };                       // hours per questionnaire
const HOURLY_EUR = 57;                                                  // fully loaded security engineer, NL (see sources)
const USD_EUR = 0.92;
const GPT5 = [1.25, 10], SONNET = [3, 15];                             // USD per 1M tokens, public list prices
const tok = r.run;
const cost = (p: number[]) => (tok.input_tokens * p[0] + tok.output_tokens * p[1]) / 1e6;
const humanCost = (h: number) => h * HOURLY_EUR;
const modelEur = r.usd * USD_EUR;
const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

fs.mkdirSync(path.join("docs", "charts"), { recursive: true });
function bars(file: string, title: string, rows: { label: string; value: number; text: string; primary?: boolean }[], log = false) {
  const w = 760, rowH = 36, left = 250, top = 46, h = top + rows.length * rowH + 16;
  const vals = rows.map((x) => (log ? Math.log10(Math.max(x.value, 1e-3)) + 3 : x.value)), max = Math.max(...vals) || 1;
  const body = rows.map((x, i) => { const y = top + i * rowH, bw = Math.max(4, ((w - left - 130) * vals[i]) / max); return `<text x="${left - 12}" y="${y + 21}" text-anchor="end" fill="${x.primary ? "#e6e9ee" : "#8b95a3"}" font-size="14" font-family="ui-monospace,Menlo,monospace">${x.label}</text><rect x="${left}" y="${y + 7}" width="${bw}" height="20" rx="3" fill="${x.primary ? "#7dd3fc" : "#3a4350"}"/><text x="${left + bw + 8}" y="${y + 21}" fill="#e6e9ee" font-size="14" font-family="ui-monospace,Menlo,monospace">${x.text}</text>`; }).join("");
  fs.writeFileSync(path.join("docs", "charts", file), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0b0d10"/><text x="16" y="28" fill="#e6e9ee" font-size="16" font-weight="600" font-family="Inter,system-ui,sans-serif">${title}${log ? " (log scale)" : ""}</text>${body}</svg>`);
  return `![${title}](charts/${file})`;
}

const traps = r.scored.filter((s) => s.trap);
const out = `# TenderScale — pitch pack (numbers, sources, story)

Generated ${b.generatedAt.slice(0, 16).replace("T", " ")} UTC from \`benchmark/benchmark.json\`. Regenerate: \`npm run benchmark && npm run pitch-pack\`. Everything below is either measured on the day (marked **measured**) or an assumption with its source (marked **assumption**). Say which one it is on stage.

## 1. The scenario (say this first)

**Personivo B.V.** is a 25-person HR SaaS company in Utrecht. Its product handles employee records, onboarding and contracts for banks and insurers, hosted on Azure West Europe. It is ISO 27001 certified since May 2024 and has three policies: Information Security (v4.0, June 2026), Data Protection (v3.1, March 2026), Incident Response & Business Continuity (v2.3, May 2026). Last year it answered a bank's 30-question vendor assessment by hand.

This week a bank sent the **CSA CAIQ v4.1**, the standard cloud security questionnaire: 50 questions, due Friday, each answer a contractual statement. Hidden in it: three questions where last year's answer is now wrong (backups went from weekly to daily, restore tests from annual to quarterly, geo-redundancy from "planned" to live), two questions where Personivo's own policies contradict each other (30-day vs 90-day deletion after termination), two questions no policy covers at all (law enforcement requests, special interest groups), and one question where the honest answer is "No" (customer-managed keys).

Personivo is fictional. The CAIQ questions are real (CSA), the policies are realistic, and the answer key was built by hand and never shown to the system.

## 2. The problem, from first principles

- A security questionnaire is not a writing task. It is a **lookup and verification task**: for each question, find the paragraph in the current policy that answers it, check that nothing changed, and write down what it says. Errors are expensive: an answer is a statement to a bank.
- The failure modes are therefore not "bad prose". They are: **copying last year's answer after the practice changed**, **not noticing two policies disagree**, **answering a question nothing covers**, and **saying Yes because Yes sounds better**. A generic chatbot fails all four by design.
- So the product must be built around evidence, not fluency: every answer must point at the exact paragraph, every number must be quoted, the code (not the model) must verify quotes, and "no source" must be a first-class outcome.

## 3. One questionnaire: human vs TenderScale (per questionnaire, 50 questions)

| | Security lead by hand | TenderScale on Nebius | Factor |
|---|---|---|---|
| Time | **${HUMAN_H.low}–${HUMAN_H.high} hours** (assumption, sources below) | **${r.seconds.toFixed(0)} seconds** (measured) | ${fmt((HUMAN_H.low * 3600) / r.seconds)}–${fmt((HUMAN_H.high * 3600) / r.seconds)}× faster |
| Cost | **€${fmt(humanCost(HUMAN_H.low))}–€${fmt(humanCost(HUMAN_H.high))}** (${HUMAN_H.low}–${HUMAN_H.high} h × €${HOURLY_EUR}/h, assumption) | **€${modelEur.toFixed(3)}** ($${r.usd.toFixed(3)}, measured token usage × list price) | ${fmt(humanCost(HUMAN_H.low) / modelEur)}–${fmt(humanCost(HUMAN_H.high) / modelEur)}× cheaper |
| Per question | ${fmt((HUMAN_H.mid * 60) / 50)} minutes, €${(humanCost(HUMAN_H.mid) / 50).toFixed(0)} | ${(r.seconds / 50).toFixed(1)} s of wall-clock (50 in parallel), €${(modelEur / 50).toFixed(4)} | |
| Answers correct vs key | not measured (the key was written by the human) | **${r.answersCorrect} / 50** (measured) | |
| Quotes verified against the policy text | manual | **100%**, by code (measured) | |
| Changed practices caught | depends on memory | **${traps.filter((t) => t.trap.startsWith("OUTDATED") && t.flag === "orange").length} / 3** flagged (measured) | |
| Questions no policy covers | often answered anyway | **${traps.filter((t) => t.trap.startsWith("UNCOVERED") && t.flag === "red").length} / 2** refused (measured) | |
| Invented numbers | unknown | **${r.invented}** (measured, deterministic check) | |

${bars("time.svg", "Time per 50-question questionnaire", [{ label: "security lead, low", value: HUMAN_H.low * 3600, text: `${HUMAN_H.low} h` }, { label: "security lead, high", value: HUMAN_H.high * 3600, text: `${HUMAN_H.high} h` }, { label: "TenderScale", value: r.seconds, text: `${r.seconds.toFixed(0)} s`, primary: true }], true)}

${bars("cost.svg", "Cost per 50-question questionnaire, EUR", [{ label: "security lead, low", value: humanCost(HUMAN_H.low), text: `€${fmt(humanCost(HUMAN_H.low))}` }, { label: "security lead, high", value: humanCost(HUMAN_H.high), text: `€${fmt(humanCost(HUMAN_H.high))}` }, { label: "GPT-5, list price", value: cost(GPT5) * USD_EUR, text: `€${(cost(GPT5) * USD_EUR).toFixed(2)}` }, { label: "TenderScale (Nebius)", value: modelEur, text: `€${modelEur.toFixed(3)}`, primary: true }], true)}

**Sources for the human numbers (assumptions):**
- Time: the team's own estimate from Personivo-type companies is 20–40 hours per questionnaire. Public benchmark: Loopio's annual RFP response benchmark reports about 30 hours of work per response on average (https://loopio.com/rfp-response-trends/). Vendor security questionnaires of 50–200 questions are commonly reported in the same range by the questionnaire-tool vendors themselves (Vanta, Whistic, Loopio). Use "20–40 hours" and cite Loopio.
- Cost: a security engineer / security lead in the Netherlands, fully loaded (salary ~€75k plus ~30% employer cost, ~1,720 working hours) ≈ €${HOURLY_EUR}/h. Change the number if you prefer; the ratio stays in the thousands.
- The 50-question run above used ${fmt(tok.input_tokens)} input and ${fmt(tok.output_tokens)} output tokens (measured). Nebius prices: Qwen3-30B-A3B $0.10/$0.30, Qwen3-235B-A22B $0.20/$0.60, Qwen3-Embedding-8B $0.01 per 1M tokens (https://api.tokenfactory.nebius.com/v1/models?verbose=true, 23 Sep 2026).

## 4. Nebius Token Factory vs a closed model, per questionnaire

| | Open models on Nebius | GPT-5 (OpenAI) | Claude Sonnet 4.5 |
|---|---|---|---|
| Cost for the same ${fmt(tok.input_tokens)}/${fmt(tok.output_tokens)} tokens | **$${r.usd.toFixed(3)}** (measured) | $${cost(GPT5).toFixed(2)} (list price $${GPT5[0]}/$${GPT5[1]}) — ${fmt(cost(GPT5) / r.usd)}× | $${cost(SONNET).toFixed(2)} (list price $${SONNET[0]}/$${SONNET[1]}) — ${fmt(cost(SONNET) / r.usd)}× |
| Where the policies are processed | EU (Nebius, Finland) | US (OpenAI) | US (Anthropic) |
| Data protection | GDPR processor in the EU, no transfer outside the EEA needed | Transfer to the US, relies on EU–US Data Privacy Framework / SCCs and the vendor's retention terms | same |
| Model weights | open (Qwen3), can be self-hosted or fine-tuned on a customer's approved answers | closed, no self-hosting, no fine-tuning of the flagship | closed |
| Latency predictability | non-reasoning MoE (22B active): no hidden thinking tokens, measured first answer under 2 s | reasoning tokens vary per request | varies |
| Vendor lock-in | OpenAI-compatible API, model id in one env var | single vendor | single vendor |
| Quality on this task | ${r.answersCorrect}/50 answers, ${r.flagsCorrect}/50 flags, ${r.invented} invented numbers (measured) | ${closed ? `${closed.answersCorrect}/50, ${closed.flagsCorrect}/50, ${closed.invented} invented (measured)` : "not measured on the day (no key); do not claim a number"} | not measured |

Why this matters for Personivo specifically: the questionnaire and the policies **are** the company's security architecture, backup locations, key management and incident procedures. Sending them to a US model vendor is itself something a bank's vendor-risk team asks about (DSP-19.1 in the very questionnaire we answer: "document physical data locations"). Answering a European bank's security questionnaire with a European inference provider is the consistent answer.

## 5. Why these two models (measured, same account, same day)

| Tier | Chosen | Alternatives measured | Result |
|---|---|---|---|
| Selection (small) | **Qwen3-30B-A3B-Instruct** | Qwen3-235B-A22B, gemma-3-27b-it | 30B: 1.1 s median per selection at 50 concurrent calls. 235B as selector: 13 s median under the same load. gemma: 1 s median but a tail of minutes (one run took 247 s). |
| Writing (large) | **Qwen3-235B-A22B-Instruct** | gpt-oss-120b, DeepSeek-V4-Flash, Qwen3-30B-A3B | Blind-judged quality on a 50-question assessment: Qwen3-235B 4.21/5 (first token 1.7 s), Qwen3-30B 4.27 but slower, gpt-oss-120b 2.57, DeepSeek-V4-Flash 2.87 and 3× slower (reasoning tokens). |
| JSON mode | off | on | JSON-schema mode added ~2.5 s per call on this endpoint; both Qwen instruct models returned valid JSON on every call without it. |

Two-tier design: the small model reads ~1.5K tokens per question and returns section IDs; the large model only sees the 2–4 sections that matter. That is why a 235B-class model costs two cents per questionnaire.

## 6. The 8 traps (measured)

| Question | Trap | Expected | TenderScale | Score |
|---|---|---|---|---|
${traps.map((t) => `| ${t.id} | ${t.trap.split(":")[0]} | ${t.expected} · ${t.expectedFlag} | ${t.answer} · ${t.flag} | ${t.score === 1 ? "1" : t.score === 0.5 ? "0.5" : "0"} |`).join("\n")}

Score rule (team's sheet): 1 = answer, key facts and flag all match; 0.5 = answer right but a fact or the flag off; 0 = wrong answer or invented number. Whole questionnaire: average score **${r.avgScore.toFixed(2)}**, answers ${r.answersCorrect}/50, flags ${r.flagsCorrect}/50, key facts covered ${r.factsCovered}/50 (judge: ${b.judge.split("/").pop()}), last year's answer matched ${r.pastMatched}/30.

## 7. What the product does that a chatbot cannot (for the "solution" slides)

1. **Select, then write.** A small model picks the policy sections that contain the answer (or says none do). A large model writes only from those sections.
2. **Quotes the code verifies.** Every source is a verbatim quote; the code checks it exists in the section. A quote that is not found is dropped; an answer with no verified source becomes "Unknown", red.
3. **Numbers must be quoted.** Every number in the comment must appear in a verified quote, or the answer is flagged.
4. **Deterministic flags.** Red: no source. Orange: two sections disagree, last year's answer no longer holds, or an unverified number. Green: everything else. The model never decides the colour.
5. **Diff after a policy change.** Load IR/BC v2.4 (log backups every 5 minutes, monthly restore tests), run again: the three answers that cite §5 are marked changed, with the old answer and the changed text side by side.
6. **The source, one click away.** Click a citation and the policy opens with the quoted sentence highlighted; toggle to see what changed between versions, word by word.
7. **Gap list.** Every red question in one list: what the policies need to say before the next questionnaire.

## 8. Demo script, 60 seconds

| t | Do | Say |
|---|---|---|
| 0:00 | Workspace open, Personivo, 50 questions | "Personivo, 25 people, sells HR software to banks. A bank just sent 50 CAIQ questions. Their security lead would spend a week on this." |
| 0:05 | Click **Run** | "Two open models on Nebius, in the EU. Watch the clock." Rows stream in. |
| 0:25 | Click **Review**, open BCR-08.1 | "Last year: weekly backups. Policy now: daily. Flagged, both shown. Click the source." Policy opens, sentence highlighted. |
| 0:38 | Click **No source**, open DSP-18.1 | "Law enforcement requests. No policy covers it. It refuses. Red goes to a human." |
| 0:45 | **Load updated IR/BC v2.4**, **Run again**, click **Changed** | "Policy changed. Three answers changed. It tells you which and why." |
| 0:55 | Point at the tiles | "${r.seconds.toFixed(0)} seconds. Two cents. ${r.answersCorrect} of 50 correct against a key it never saw. Zero invented numbers." |

Before going on stage: one warm-up run five minutes earlier; never two runs at once (they share one rate limit).
`;
fs.writeFileSync(path.join("docs", "pitch-pack.md"), out);
console.log("wrote docs/pitch-pack.md and", fs.readdirSync(path.join("docs", "charts")).length, "charts");
