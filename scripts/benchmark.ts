/**
 * Measured model advantage: runs the identical pipeline (same prompts, same evidence, same batching)
 * on (a) open models on Nebius Token Factory and (b) a closed model through an OpenAI-compatible
 * endpoint (Vercel AI Gateway / OpenAI / Anthropic), then scores every answer blind with an LLM judge.
 * Writes data/benchmark.json which /benchmark renders.
 */
import fs from "node:fs";
import path from "node:path";
import { runPipeline } from "../src/lib/pipeline";
import { baselineEngine, nebiusEngine, client, price } from "../src/lib/nebius";
import { companyProfile, loadQuestionnaires } from "../src/lib/corpus";
import { chunkById } from "../src/lib/retrieval";
import type { Answer, Engine, Question } from "../src/lib/types";

const RUNS = Number(process.env.BENCH_RUNS ?? 3);
const SLUG = process.env.BENCH_SLUG ?? "adyen-vendor-security-assessment";
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? process.env.BASELINE_MODEL ?? "openai/gpt-4o";

interface RunStats { engine: string; model: string; wallMs: number; firstAnswerMs: number; cost: number; tokensIn: number; tokensOut: number; perQuestionMs: number[]; flagged: number; noEvidence: number }

async function timeRun(engine: Engine, questions: Question[], prospect: string) {
  const t0 = Date.now();
  let first = 0;
  const r = await runPipeline({ engine, company: companyProfile(), prospect, questions, brief: false }, (e) => {
    if (e.type === "delta" && !first) first = Date.now() - t0;
  });
  const stats: RunStats = {
    engine: engine.name, model: engine.synthesizer, wallMs: r.metrics.elapsedMs, firstAnswerMs: first,
    cost: r.metrics.cost, tokensIn: r.metrics.usage.reduce((s, u) => s + u.input, 0), tokensOut: r.metrics.usage.reduce((s, u) => s + u.output, 0),
    perQuestionMs: r.answers.map((a) => a.latencyMs), flagged: r.answers.filter((a) => a.flag === "needs_approval").length, noEvidence: r.answers.filter((a) => a.flag === "no_evidence").length,
  };
  return { stats, answers: r.answers };
}

/** Blind pairwise judge: A/B randomized per question; scores groundedness, completeness, precision 1–5. */
async function judge(questions: Question[], a: Answer[], b: Answer[]) {
  const oa = client(baselineEngine());
  const scores: { id: string; nebius: number; baseline: number; winner: "nebius" | "baseline" | "tie" }[] = [];
  const pool = questions.map((q, i) => async () => {
    const ans = [a[i], b[i]];
    const flip = Math.random() < 0.5;
    const [x, y] = flip ? [ans[1], ans[0]] : ans;
    const evidence = (a[i].citations.length ? a[i].citations : b[i].citations).map((c, n) => `[${n + 1}] ${chunkById(c.chunk).text}`).join("\n");
    const res = await oa.chat.completions.create({
      model: JUDGE_MODEL, temperature: 0, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `You are a strict reviewer of vendor security-questionnaire answers. Score each answer 1-5 on: groundedness (only claims supported by the evidence; hallucinated certifications/controls = 1), completeness, and precision (specific facts, dates, numbers). Return JSON {"A":{"groundedness":n,"completeness":n,"precision":n},"B":{...},"winner":"A"|"B"|"tie"}` },
        { role: "user", content: `QUESTION: ${questions[i].text}\n\nEVIDENCE:\n${evidence}\n\nANSWER A:\n${x.text}\n\nANSWER B:\n${y.text}` },
      ],
    });
    const j = JSON.parse(res.choices[0].message.content ?? "{}");
    const avg = (o: { groundedness: number; completeness: number; precision: number }) => (o.groundedness + o.completeness + o.precision) / 3;
    const sA = avg(j.A), sB = avg(j.B);
    const nebius = flip ? sB : sA, baseline = flip ? sA : sB;
    const w = j.winner === "tie" ? "tie" : (j.winner === "A") !== flip ? "nebius" : "baseline";
    scores.push({ id: questions[i].id, nebius, baseline, winner: w });
  });
  // concurrency 8
  const queue = [...pool];
  await Promise.all(Array.from({ length: 8 }, async () => { for (;;) { const f = queue.shift(); if (!f) return; await f(); } }));
  return scores.sort((p, q) => p.id.localeCompare(q.id));
}

async function main() {
  const q = loadQuestionnaires().find((x) => x.slug === SLUG)!;
  const nebius = nebiusEngine(), baseline = baselineEngine();
  if (!nebius.apiKey) throw new Error("NEBIUS_API_KEY missing");
  if (!baseline.apiKey) throw new Error("baseline key missing (AI_GATEWAY_API_KEY / BASELINE_API_KEY)");
  console.log(`benchmark: ${q.questions.length} questions × ${RUNS} runs · nebius=${nebius.synthesizer} vs baseline=${baseline.synthesizer} · judge=${JUDGE_MODEL}`);

  const runs: RunStats[] = [];
  let lastN: Answer[] = [], lastB: Answer[] = [];
  for (let i = 0; i < RUNS; i++) {
    const n = await timeRun(nebius, q.questions, q.prospect); runs.push(n.stats); lastN = n.answers;
    console.log(`  nebius   run ${i + 1}: ${n.stats.wallMs}ms wall · first token ${n.stats.firstAnswerMs}ms · $${n.stats.cost.toFixed(4)}`);
    const b = await timeRun(baseline, q.questions, q.prospect); runs.push(b.stats); lastB = b.answers;
    console.log(`  baseline run ${i + 1}: ${b.stats.wallMs}ms wall · first token ${b.stats.firstAnswerMs}ms · $${b.stats.cost.toFixed(4)}`);
  }
  console.log("judging blind…");
  const scores = await judge(q.questions, lastN, lastB);

  const agg = (name: string) => {
    const rs = runs.filter((r) => r.engine === name);
    const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    return {
      model: rs[0].model, runs: rs.length,
      wallMsMedian: med(rs.map((r) => r.wallMs)), wallMsMin: Math.min(...rs.map((r) => r.wallMs)), firstAnswerMsMedian: med(rs.map((r) => r.firstAnswerMs)),
      costMean: rs.reduce((s, r) => s + r.cost, 0) / rs.length, tokensIn: rs[0].tokensIn, tokensOut: rs[0].tokensOut,
      perQuestionMsMedian: med(rs.flatMap((r) => r.perQuestionMs)), flagged: rs[0].flagged, noEvidence: rs[0].noEvidence,
      quality: name === "nebius" ? scores.reduce((s, x) => s + x.nebius, 0) / scores.length : scores.reduce((s, x) => s + x.baseline, 0) / scores.length,
      wins: scores.filter((s) => s.winner === name).length,
    };
  };
  const out = {
    generatedAt: new Date().toISOString(), questionnaire: q.name, questions: q.questions.length, runsPerEngine: RUNS, judge: JUDGE_MODEL,
    nebius: agg("nebius"), baseline: agg("baseline"), ties: scores.filter((s) => s.winner === "tie").length,
    pricing: { nebius: price(nebius.synthesizer, 1e6, 0) + "/" + price(nebius.synthesizer, 0, 1e6), baseline: price(baseline.synthesizer, 1e6, 0) + "/" + price(baseline.synthesizer, 0, 1e6) },
    runs, scores,
    samples: q.questions.slice(0, 50).map((qq, i) => ({ id: qq.id, question: qq.text, nebius: lastN[i]?.text, baseline: lastB[i]?.text })),
  };
  fs.writeFileSync(path.join("data", "benchmark.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ nebius: out.nebius, baseline: out.baseline, ties: out.ties }, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
