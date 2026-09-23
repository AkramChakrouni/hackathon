/**
 * Benchmark against the answer key (benchmark/answer_key.csv — never read by the pipeline).
 * Runs the full pipeline twice with the same code and prompts:
 *   nebius  — both tiers open models on Nebius Token Factory
 *   closed  — both tiers one closed model through an OpenAI-compatible endpoint (Vercel AI Gateway), when a key exists
 * Scores per question (rule from the team's answer-key sheet): 1 = answer, key facts and flag all match;
 * 0.5 = answer right but a fact or the flag is off; 0 = wrong answer or invented fact.
 * Writes benchmark/benchmark.md, benchmark/benchmark.json and fills the xlsx sheet (columns K–P).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { runPipeline } from "../src/lib/pipeline";
import { baselineEngine, nebiusEngine, client, PRICES, NEBIUS_URL } from "../src/lib/nebius";
import { loadDemoQuestionnaire, loadPolicies, parseCsv } from "../src/lib/corpus";
import type { Answer, Engine, RunMeta } from "../src/lib/types";

const EUR = Number(process.env.USD_EUR ?? 0.92);
const JUDGE = process.env.JUDGE_MODEL ?? "deepseek-ai/DeepSeek-V4-Pro-0813";
const PRICE_SOURCES: Record<string, string> = { nebius: `${NEBIUS_URL}models?verbose=true (live, 23 Sep 2026)`, closed: "https://ai-gateway.vercel.sh/v1/models (live pricing) or public list price" };

interface KeyRow { question_id: string; question: string; correct_answer: string; source: string; key_facts_expected: string; expected_flag: string; trap: string; matching_past_answer: string }
function readKey(): KeyRow[] {
  const [h, ...rows] = parseCsv(fs.readFileSync(path.join("benchmark", "answer_key.csv"), "utf8"));
  return rows.map((r) => Object.fromEntries(h.map((k, i) => [k.trim(), r[i] ?? ""])) as unknown as KeyRow);
}

interface Scored { id: string; trap: string; expected: string; expectedFlag: string; answer: string; flag: string; answerOk: boolean; flagOk: boolean; invented: string[]; factsCovered: boolean | null; pastOk: boolean | null; score: number; note: string }
interface Result { engine: string; model_small: string; model_large: string; run: RunMeta; scored: Scored[]; answersCorrect: number; flagsCorrect: number; invented: number; factsCovered: number; trapsCaught: number; pastMatched: number; avgScore: number; seconds: number; usd: number; eur: number; dataLeavesEU: boolean; error?: string }

/** Deterministic: numbers in the comment that do not occur in the cited sections' text. */
function inventedNumbers(comment: string, sectionText: string) {
  return [...new Set([...comment.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]).filter((n) => !sectionText.includes(n)))];
}

async function judgeFacts(q: KeyRow, a: Answer): Promise<boolean> {
  const res = await client(nebiusEngine()).chat.completions.create({
    model: JUDGE, temperature: 0, max_tokens: 2000,
    messages: [
      { role: "system", content: `Today is 23 September 2026. Compare a questionnaire comment with the key facts from an answer key. Return JSON only: {"covered": true|false}. covered = the comment states the main fact(s) of the key and contradicts none of them (numbers, periods and names may be phrased differently but must agree; omitting a secondary detail is fine, a wrong or contradicting value is not). When the key says the topic is not documented, covered = the comment says it is not covered / needs a human. Mentioning that a 2025 answer differed or that two policies conflict is correct.` },
      { role: "user", content: `KEY FACTS: ${q.key_facts_expected}\n\nCOMMENT: ${a.comment}` },
    ],
  });
  const m = (res.choices[0].message.content ?? "").match(/\{[\s\S]*\}/);
  try { return !!JSON.parse(m?.[0] ?? "{}").covered; } catch { return false; }
}

async function evaluate(engine: Engine, label: string, key: KeyRow[]): Promise<Result> {
  const qn = loadDemoQuestionnaire();
  const { sections } = loadPolicies("current");
  const { run, answers } = await runPipeline({ engine, policySet: "current", questions: qn.questions }, () => {});
  console.log(`${label}: ${run.total} answers in ${run.duration_ms}ms · $${run.cost_usd.toFixed(4)} · flags ${JSON.stringify(run.flags)} — scoring…`);
  const scored: Scored[] = [];
  const tasks = answers.map((a) => async () => {
    const k = key.find((x) => x.question_id === a.question_id)!;
    const cited = a.sources.map((s) => sections.find((x) => x.id === s.section_id)?.text ?? "").join("\n");
    const invented = a.flag === "red" ? [] : inventedNumbers(a.comment, cited);
    const answerOk = a.answer.toLowerCase() === k.correct_answer.toLowerCase();
    const flagOk = a.flag === k.expected_flag.toLowerCase();
    const factsCovered = a.flag === "red" ? (k.expected_flag.toLowerCase() === "red") : await judgeFacts(k, a);
    const pastOk = k.matching_past_answer ? (a.past_answer?.ref === k.matching_past_answer) : null;
    const score = !answerOk || invented.length ? 0 : flagOk && factsCovered ? 1 : 0.5;
    scored.push({ id: a.question_id, trap: k.trap, expected: k.correct_answer, expectedFlag: k.expected_flag, answer: a.answer, flag: a.flag, answerOk, flagOk, invented, factsCovered, pastOk, score, note: a.flag_reason });
  });
  const q = [...tasks];
  await Promise.all(Array.from({ length: 10 }, async () => { for (;;) { const f = q.shift(); if (!f) return; await f(); } }));
  scored.sort((x, y) => x.id.localeCompare(y.id));
  const traps = scored.filter((s) => s.trap);
  return {
    engine: label, model_small: engine.small, model_large: engine.large, run, scored,
    answersCorrect: scored.filter((s) => s.answerOk).length, flagsCorrect: scored.filter((s) => s.flagOk).length, invented: scored.filter((s) => s.invented.length).length,
    factsCovered: scored.filter((s) => s.factsCovered).length, trapsCaught: traps.filter((s) => s.score === 1).length, pastMatched: scored.filter((s) => s.pastOk === true).length,
    avgScore: scored.reduce((s, x) => s + x.score, 0) / scored.length, seconds: run.duration_ms / 1000, usd: run.cost_usd, eur: run.cost_usd * EUR, dataLeavesEU: engine.name !== "nebius",
  };
}

async function pickClosed(): Promise<string | null> {
  const b = baselineEngine("x");
  if (!b.apiKey) return null;
  if (process.env.BENCH_CLOSED) return process.env.BENCH_CLOSED;
  try {
    const r = await fetch(`${b.baseURL}/models`, { headers: { authorization: `Bearer ${b.apiKey}` } });
    const j = (await r.json()) as { data: { id: string; pricing?: { input?: string; output?: string } }[] };
    for (const m of j.data ?? []) { const i = Number(m.pricing?.input), o = Number(m.pricing?.output); if (!isNaN(i) && !isNaN(o)) PRICES[m.id] = [i * 1e6, o * 1e6]; }
    const ver = (id: string) => parseFloat(id.match(/gpt-(\d+(?:\.\d+)?)/)?.[1] ?? "-1");
    const gpt = j.data.map((m) => m.id).filter((id) => /^openai\/gpt-\d/.test(id) && !/mini|nano|codex|realtime|pro|search|chat|audio|transcribe|tts|image/.test(id)).sort((a, c) => ver(c) - ver(a) || c.localeCompare(a));
    return gpt[0] ?? "openai/gpt-5";
  } catch { return "openai/gpt-5"; }
}

function md(results: Result[], key: KeyRow[]) {
  const cols = results.map((r) => `${r.engine} (${r.model_small === r.model_large ? r.model_large.split("/").pop() : `${r.model_small.split("/").pop()} + ${r.model_large.split("/").pop()}`})`);
  const row = (label: string, f: (r: Result) => string) => `| ${label} | ${results.map(f).join(" | ")} |`;
  const out = [
    `# TenderScale benchmark — Personivo CAIQ v4.1, 50 questions`, ``,
    `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. Same code, same prompts, same concurrency for every column. Answer key never in the pipeline path. Facts-covered judge: \`${JUDGE}\` (sees the key). Scoring rule: 1 = answer, key facts and flag all match the key; 0.5 = answer right but a fact or the flag is off; 0 = wrong answer or invented number.`, ``,
    `| | ${cols.join(" | ")} |`, `|---|${cols.map(() => "---").join("|")}|`,
    row("Answers correct (of 50)", (r) => `**${r.answersCorrect}**`), row("Flags correct (of 50)", (r) => `**${r.flagsCorrect}**`), row("Invented numbers (answers)", (r) => `**${r.invented}**`),
    row("Key facts covered (judge, of 50)", (r) => `**${r.factsCovered}**`), row("Traps caught (of 8, score = 1)", (r) => `**${r.trapsCaught}**`), row("Last year's answer matched (of 30)", (r) => `${r.pastMatched}`),
    row("Accuracy (avg score)", (r) => `**${r.avgScore.toFixed(2)}**`), row("Seconds per questionnaire", (r) => `**${r.seconds.toFixed(1)}**`), row("Cost per questionnaire", (r) => `**$${r.usd.toFixed(3)}** (€${r.eur.toFixed(3)})`),
    row("Tokens in / out", (r) => `${r.run.input_tokens.toLocaleString()} / ${r.run.output_tokens.toLocaleString()}`), row("Data leaves EU", (r) => (r.dataLeavesEU ? "Yes" : "No")), ``,
    `## The 8 trap questions`, ``, `| Question | Trap | Expected | ${results.map((r) => r.engine).join(" | ")} |`, `|---|---|---|${results.map(() => "---").join("|")}|`,
  ];
  for (const k of key.filter((k) => k.trap)) out.push(`| ${k.question_id} | ${k.trap.split(":")[0]} | ${k.correct_answer} · ${k.expected_flag} | ${results.map((r) => { const s = r.scored.find((x) => x.id === k.question_id)!; return `${s.answer} · ${s.flag} ${s.score === 1 ? "✅" : s.score === 0.5 ? "🟡" : "❌"}`; }).join(" | ")} |`);
  out.push(``, `## Prices (USD per 1M tokens, input / output)`, ``, `| Model | Input | Output | Source |`, `|---|---|---|---|`);
  for (const r of results) for (const m of new Set([r.model_small, r.model_large])) out.push(`| ${m} | ${PRICES[m]?.[0] ?? "?"} | ${PRICES[m]?.[1] ?? "?"} | ${PRICE_SOURCES[r.engine === "nebius" ? "nebius" : "closed"]} |`);
  out.push(``, `Manual baseline: 20–40 hours per questionnaire. EUR at ${EUR} USD→EUR.`);
  return out.join("\n");
}

async function main() {
  if (!process.env.NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY missing");
  const key = readKey();
  const results: Result[] = [];
  results.push(await evaluate(nebiusEngine(), "nebius", key));
  const closed = await pickClosed();
  if (closed) { try { results.push(await evaluate(baselineEngine(closed), "closed", key)); } catch (e) { console.warn("closed baseline failed:", (e as Error).message); } }
  else console.warn("no closed-model key (AI_GATEWAY_API_KEY): closed column skipped");
  fs.mkdirSync("benchmark", { recursive: true });
  fs.writeFileSync(path.join("benchmark", "benchmark.md"), md(results, key));
  fs.writeFileSync(path.join("benchmark", "benchmark.json"), JSON.stringify({ generatedAt: new Date().toISOString(), judge: JUDGE, results }, null, 2));
  fs.writeFileSync(path.join("data", "pricing.json"), JSON.stringify({ baseline: closed ?? undefined, prices: PRICES }, null, 2));
  for (const r of results) console.log(`${r.engine.padEnd(7)} answers ${r.answersCorrect}/50 · flags ${r.flagsCorrect}/50 · invented ${r.invented} · facts ${r.factsCovered}/50 · traps ${r.trapsCaught}/8 · past ${r.pastMatched}/30 · score ${r.avgScore.toFixed(2)} · ${r.seconds.toFixed(1)}s · $${r.usd.toFixed(3)}`);
  try { console.log(execSync("uv run --with openpyxl python3 benchmark/fill_xlsx.py", { encoding: "utf8" })); } catch (e) { console.warn("xlsx fill skipped:", (e as Error).message); }
}
main().catch((e) => { console.error(e); process.exit(1); });
