/**
 * Measured model advantage + model selection matrix.
 * Runs the identical pipeline (same prompts, evidence, batching) with every candidate drafter:
 * open models on Nebius Token Factory and the current closed flagship(s) through an
 * OpenAI-compatible endpoint (Vercel AI Gateway). Every answer is graded blind by one judge
 * (the closed flagship, which if anything favours the baseline). Prices come from the providers'
 * live model lists. Writes data/benchmark.json (rendered by /benchmark) and data/pricing.json.
 */
import fs from "node:fs";
import path from "node:path";
import { runPipeline } from "../src/lib/pipeline";
import { baselineEngine, nebiusEngine, client, PRICES, price, NEBIUS_URL } from "../src/lib/nebius";
import { companyProfile, loadQuestionnaires } from "../src/lib/corpus";
import { chunkById } from "../src/lib/retrieval";
import type { Answer, Engine, Question } from "../src/lib/types";

const RUNS = Number(process.env.BENCH_RUNS ?? 2);
const SLUG = process.env.BENCH_SLUG ?? "adyen-vendor-security-assessment";
const OPEN_CANDIDATES = (process.env.BENCH_OPEN ?? "Qwen/Qwen3-235B-A22B-Instruct-2507,openai/gpt-oss-120b,deepseek-ai/DeepSeek-V4-Flash-0731,Qwen/Qwen3-30B-A3B-Instruct-2507,google/gemma-3-27b-it").split(",").map((s) => s.trim()).filter(Boolean);

interface Candidate { id: string; provider: "nebius" | "closed"; engine: Engine; primary?: boolean }
interface RunStats { wallMs: number; firstTokenMs: number; cost: number; tokensIn: number; tokensOut: number; perQuestionMs: number[]; flagged: number; noEvidence: number }
interface Result { id: string; provider: string; primary: boolean; runs: RunStats[]; wallMsMedian: number; wallMsMin: number; firstTokenMsMedian: number; perQuestionMsMedian: number; costMean: number; tokensIn: number; tokensOut: number; quality: number; groundedness: number; completeness: number; precision: number; hallucinations: number; flagged: number; noEvidence: number; price: [number, number]; error?: string }

const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** Live prices from provider model lists. Returns USD per 1M tokens [in, out]. */
async function livePrices(): Promise<{ prices: Record<string, [number, number]>; closedIds: string[] }> {
  const prices: Record<string, [number, number]> = {};
  const closedIds: string[] = [];
  try {
    const r = await fetch(`${NEBIUS_URL}models?verbose=true`, { headers: { authorization: `Bearer ${process.env.NEBIUS_API_KEY}` } });
    const j = await r.json();
    for (const m of j.data ?? []) {
      const pr = m.pricing ?? m.prices ?? {};
      const inp = Number(pr.prompt ?? pr.input ?? pr.input_token ?? NaN), out = Number(pr.completion ?? pr.output ?? pr.output_token ?? NaN);
      if (!isNaN(inp) && !isNaN(out)) prices[m.id] = [inp * 1e6, out * 1e6];
    }
  } catch (e) { console.warn("nebius model list unavailable:", (e as Error).message); }
  try {
    const b = baselineEngine("x");
    const r = await fetch(`${b.baseURL}/models`, { headers: { authorization: `Bearer ${b.apiKey}` } });
    const j = await r.json();
    for (const m of j.data ?? []) {
      closedIds.push(m.id);
      const pr = m.pricing ?? {};
      const inp = Number(pr.input ?? pr.prompt ?? NaN), out = Number(pr.output ?? pr.completion ?? NaN);
      if (!isNaN(inp) && !isNaN(out)) prices[m.id] = [inp * 1e6, out * 1e6];
    }
  } catch (e) { console.warn("gateway model list unavailable:", (e as Error).message); }
  return { prices, closedIds };
}

/** Newest OpenAI GPT flagship (non-mini/nano/codex/realtime/pro/search/chat) available on the gateway, else env/fallback. */
function pickClosed(ids: string[]): string[] {
  if (process.env.BENCH_CLOSED) return process.env.BENCH_CLOSED.split(",").map((s) => s.trim());
  const ver = (id: string) => { const m = id.match(/gpt-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : -1; };
  const gpt = ids.filter((id) => /^openai\/gpt-\d/.test(id) && !/mini|nano|codex|realtime|pro|search|chat|audio|transcribe|tts|image/.test(id)).sort((a, b) => ver(b) - ver(a) || b.localeCompare(a));
  const out = gpt.length ? [gpt[0]] : ["openai/gpt-4o"];
  const claude = ids.filter((id) => /^anthropic\/claude-sonnet-4/.test(id)).sort().reverse();
  if (claude.length) out.push(claude[0]);
  return out;
}

async function timeRun(engine: Engine, questions: Question[], prospect: string) {
  const t0 = Date.now();
  let first = 0;
  const r = await runPipeline({ engine, company: companyProfile(), prospect, questions, brief: false }, (e) => { if (e.type === "delta" && !first) first = Date.now() - t0; });
  const stats: RunStats = {
    wallMs: r.metrics.elapsedMs, firstTokenMs: first, cost: r.metrics.cost,
    tokensIn: r.metrics.usage.reduce((s, u) => s + u.input, 0), tokensOut: r.metrics.usage.reduce((s, u) => s + u.output, 0),
    perQuestionMs: r.answers.map((a) => a.latencyMs), flagged: r.answers.filter((a) => a.flag === "needs_approval").length, noEvidence: r.answers.filter((a) => a.flag === "no_evidence").length,
  };
  return { stats, answers: r.answers };
}

/** Absolute blind grading of one candidate's answers against the evidence. */
async function grade(judgeModel: string, questions: Question[], answers: Answer[]) {
  // The judge runs on the closed endpoint when a key exists, otherwise on Nebius (a model that is not a candidate).
  const oa = client(baselineEngine("x").apiKey && !process.env.JUDGE_ON_NEBIUS ? baselineEngine(judgeModel) : nebiusEngine());
  const out: { groundedness: number; completeness: number; precision: number; hallucinated: boolean }[] = [];
  const tasks = questions.map((q, i) => async () => {
    const a = answers[i];
    const evidence = (a.evidence?.length ? a.evidence : a.citations).map((c, n) => `[${n + 1}] ${chunkById(c.chunk).text}`).join("\n");
    const res = await oa.chat.completions.create({
      model: judgeModel, temperature: 0, max_tokens: 4000,
      messages: [
        { role: "system", content: `You are a strict reviewer of vendor security-questionnaire answers. Grade the answer 1-5 on groundedness (every claim supported by the evidence; any invented certification, control, date or number → 1 and hallucinated=true), completeness (addresses the whole question, or honestly states what is not documented), precision (specific tools, dates, numbers). An answer that correctly says something is not documented when the evidence does not cover it is grounded and complete. Return JSON {"groundedness":n,"completeness":n,"precision":n,"hallucinated":bool}` },
        { role: "user", content: `QUESTION: ${q.text}\n\nEVIDENCE:\n${evidence || "(none)"}\n\nANSWER:\n${a.text}` },
      ],
    });
    try { const j = JSON.parse((res.choices[0].message.content ?? "{}").replace(/^[\s\S]*?(\{)/, "$1").replace(/\}[^}]*$/, "}")); out[i] = { groundedness: +j.groundedness || 0, completeness: +j.completeness || 0, precision: +j.precision || 0, hallucinated: !!j.hallucinated }; }
    catch { out[i] = { groundedness: 0, completeness: 0, precision: 0, hallucinated: false }; }
  });
  const queue = [...tasks];
  await Promise.all(Array.from({ length: 10 }, async () => { for (;;) { const f = queue.shift(); if (!f) return; await f(); } }));
  return out;
}

async function main() {
  const q = loadQuestionnaires().find((x) => x.slug === SLUG)!;
  if (!process.env.NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY missing");
  const hasClosed = !!baselineEngine("x").apiKey;
  if (!hasClosed) console.warn("no closed-model key: running the open-model matrix only; judge must be set via JUDGE_MODEL (Nebius)");
  const { prices, closedIds } = await livePrices();
  Object.assign(PRICES, prices);
  const closed = hasClosed ? pickClosed(closedIds) : [];
  const judge = process.env.JUDGE_MODEL ?? closed[0];
  if (!judge) throw new Error("no judge model");
  const candidates: Candidate[] = [
    ...OPEN_CANDIDATES.map((id, i) => ({ id, provider: "nebius" as const, engine: { ...nebiusEngine(), synthesizer: id }, primary: i === 0 })),
    ...closed.map((id) => ({ id, provider: "closed" as const, engine: baselineEngine(id) })),
  ];
  console.log(`benchmark: ${q.questions.length} questions × ${RUNS} runs · candidates: ${candidates.map((c) => c.id).join(", ")} · judge: ${judge}`);

  const results: Result[] = [];
  const samples: Record<string, string[]> = {};
  for (const c of candidates) {
    const runs: RunStats[] = [];
    let last: Answer[] = [];
    try {
      for (let i = 0; i < RUNS; i++) {
        const r = await timeRun(c.engine, q.questions, q.prospect);
        runs.push(r.stats); last = r.answers;
        console.log(`  ${c.id.padEnd(44)} run ${i + 1}: ${r.stats.wallMs}ms wall · first token ${r.stats.firstTokenMs}ms · $${r.stats.cost.toFixed(4)} · flagged ${r.stats.flagged} · no-evidence ${r.stats.noEvidence}`);
      }
      process.stdout.write("    grading…");
      const g = await grade(judge, q.questions, last);
      const avg = (k: "groundedness" | "completeness" | "precision") => g.reduce((s, x) => s + x[k], 0) / g.length;
      const res: Result = {
        id: c.id, provider: c.provider, primary: !!c.primary, runs,
        wallMsMedian: med(runs.map((r) => r.wallMs)), wallMsMin: Math.min(...runs.map((r) => r.wallMs)), firstTokenMsMedian: med(runs.map((r) => r.firstTokenMs)), perQuestionMsMedian: med(runs.flatMap((r) => r.perQuestionMs)),
        costMean: runs.reduce((s, r) => s + r.cost, 0) / runs.length, tokensIn: runs[0].tokensIn, tokensOut: runs[0].tokensOut,
        groundedness: avg("groundedness"), completeness: avg("completeness"), precision: avg("precision"), quality: (avg("groundedness") + avg("completeness") + avg("precision")) / 3,
        hallucinations: g.filter((x) => x.hallucinated).length, flagged: runs[0].flagged, noEvidence: runs[0].noEvidence, price: PRICES[c.id] ?? [0, 0],
      };
      console.log(` quality ${res.quality.toFixed(2)} (g ${res.groundedness.toFixed(2)} / c ${res.completeness.toFixed(2)} / p ${res.precision.toFixed(2)}) · hallucinations ${res.hallucinations}`);
      results.push(res);
      samples[c.id] = last.map((a) => a.text);
    } catch (e) {
      console.log(`  ${c.id}: FAILED — ${(e as Error).message}`);
      results.push({ id: c.id, provider: c.provider, primary: !!c.primary, runs, wallMsMedian: 0, wallMsMin: 0, firstTokenMsMedian: 0, perQuestionMsMedian: 0, costMean: 0, tokensIn: 0, tokensOut: 0, quality: 0, groundedness: 0, completeness: 0, precision: 0, hallucinations: 0, flagged: 0, noEvidence: 0, price: [0, 0], error: (e as Error).message });
    }
  }
  const primary = results.find((r) => r.primary)!;
  const baseline = results.find((r) => r.provider === "closed" && !r.error);
  const out = {
    generatedAt: new Date().toISOString(), questionnaire: q.name, questions: q.questions.length, runsPerCandidate: RUNS, judge,
    primary: primary.id, baseline: baseline?.id ?? null,
    headline: baseline ? { costX: baseline.costMean / Math.max(primary.costMean, 1e-9), wallX: baseline.wallMsMedian / Math.max(primary.wallMsMedian, 1), ttftX: baseline.firstTokenMsMedian / Math.max(primary.firstTokenMsMedian, 1), qualityDelta: primary.quality - baseline.quality } : null,
    results,
    samples: q.questions.slice(0, 8).map((qq, i) => ({ id: qq.id, question: qq.text, answers: Object.fromEntries(Object.entries(samples).map(([k, v]) => [k, v[i]])) })),
  };
  fs.writeFileSync(path.join("data", "benchmark.json"), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join("data", "pricing.json"), JSON.stringify({ baseline: baseline?.id, prices: Object.fromEntries(results.map((r) => [r.id, r.price])) }, null, 2));
  console.log("\n" + results.map((r) => `${r.id.padEnd(44)} ${(r.wallMsMedian / 1000).toFixed(1)}s  ttft ${(r.firstTokenMsMedian / 1000).toFixed(2)}s  $${r.costMean.toFixed(4)}  q ${r.quality.toFixed(2)}  hall ${r.hallucinations}${r.error ? "  ERROR " + r.error : ""}`).join("\n"));
  if (out.headline) console.log(`\nheadline: ${out.headline.costX.toFixed(0)}× cheaper · ${out.headline.wallX.toFixed(1)}× wall-clock · quality Δ ${out.headline.qualityDelta.toFixed(2)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
