import { BASELINE_MODEL, client, embed, parseJson, price } from "./nebius";
import { loadPastAnswers, loadPolicies } from "./corpus";
import { shortlist } from "./retrieval";
import { CATEGORIES, answerPrompt, selectionPrompt } from "./prompts";
import { finalize, type ModelAnswer } from "./checks";
import type { Answer, Category, Coverage, Engine, Event, Flag, PolicySet, Question, RunMeta, Selection } from "./types";

export interface RunOptions { engine: Engine; policySet: PolicySet; questions: Question[]; concurrency?: number; signal?: AbortSignal }

const embedCache = new Map<string, number[]>();
async function embedCached(texts: string[]) {
  const missing = texts.filter((t) => !embedCache.has(t));
  if (missing.length) { const v = await embed(missing); missing.forEach((t, i) => embedCache.set(t, v[i])); }
  return texts.map((t) => embedCache.get(t)!);
}

async function pool<T>(items: T[], n: number, f: (x: T) => Promise<void>) {
  const q = [...items];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { for (;;) { const x = q.shift(); if (x === undefined) return; await f(x); } }));
}

export async function runPipeline(o: RunOptions, emit: (e: Event) => void): Promise<{ run: RunMeta; answers: Answer[] }> {
  const t0 = Date.now();
  const { policies, sections } = loadPolicies(o.policySet);
  const past = loadPastAnswers();
  const oa = client(o.engine);
  const run: RunMeta = {
    run_id: crypto.randomUUID(), policy_set: o.policySet, policy_versions: Object.fromEntries(policies.map((p) => [p.short, p.version])),
    model_small: o.engine.small, model_large: o.engine.large, started_at: new Date(t0).toISOString(), duration_ms: 0,
    input_tokens: 0, output_tokens: 0, cost_usd: 0, baseline_cost_usd: 0, done: 0, total: o.questions.length, flags: { green: 0, orange: 0, red: 0 }, status: "running",
  };
  emit({ type: "start", run });
  const answers = new Map<string, Answer>();
  const use = (model: string, i: number, out: number) => { run.input_tokens += i; run.output_tokens += out; run.cost_usd += price(model, i, out); run.baseline_cost_usd += price(BASELINE_MODEL, i, out); };
  const tick = setInterval(() => { run.duration_ms = Date.now() - t0; emit({ type: "metrics", run }); }, 250);

  let vectors: (number[] | null)[] = o.questions.map(() => null);
  try { vectors = await embedCached(o.questions.map((q) => q.text)); use("Qwen/Qwen3-Embedding-8B", o.questions.reduce((s, q) => s + Math.ceil(q.text.length / 4), 0), 0); } catch { /* shortlist unavailable → whole corpus */ }

  await pool(o.questions.map((q, i) => ({ q, i })), o.concurrency ?? Number(process.env.CONCURRENCY ?? 50), async ({ q, i }) => {
    const started = Date.now();
    let inTok = 0, outTok = 0;
    // ── Step 1: source selection (small model) ──
    const cand = vectors[i] ? shortlist(vectors[i]!, sections, past) : { sections, past, pastScores: new Map<string, number>(), complete: false, topScore: 0 };
    let selection: Selection = { category: "security", relevant_sections: [], relevant_past_answers: [], coverage: "none" };
    let rawSmall: string | undefined, selMs = 0;
    try {
      const r = await oa.chat.completions.create({ model: o.engine.small, messages: selectionPrompt(q.text, cand.sections), temperature: 0, max_tokens: 160 }, { signal: o.signal });
      inTok += r.usage?.prompt_tokens ?? 0; outTok += r.usage?.completion_tokens ?? 0; use(o.engine.small, r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0);
      rawSmall = r.choices[0].message.content ?? "";
      const j = parseJson<Partial<Selection>>(rawSmall);
      if (j) {
        const ids = new Set(cand.sections.map((s) => s.id));
        selection = {
          category: (CATEGORIES as readonly string[]).includes(j.category ?? "") ? (j.category as Category) : "security",
          relevant_sections: (j.relevant_sections ?? []).filter((s) => ids.has(s)).slice(0, 4),
          relevant_past_answers: cand.past.slice(0, 3).map((p) => p.ref), // similarity candidates; the writer decides which one is about this question
          coverage: (["covered", "partial", "none"].includes(j.coverage ?? "") ? j.coverage : "none") as Coverage,
        };
        if (selection.coverage !== "none" && selection.relevant_sections.length === 0) selection.coverage = "none";
      }
    } catch (e) { if (o.signal?.aborted) throw e; }
    selMs = Date.now() - started;
    emit({ type: "selected", question_id: q.id, selection, ms: selMs });

    const selected = selection.relevant_sections.map((id) => sections.find((s) => s.id === id)!).filter(Boolean);
    const pastSel = cand.past.slice(0, 3);
    let raw: ModelAnswer | null = null, rawLarge: string | undefined;
    // ── Step 2: answer writing (large model) — skipped when nothing covers the question.
    // Safety net: if the selector said "none" but the top section is strongly similar, let the writer decide (it may still answer Unknown → red).
    let writerSections = selected;
    if (selection.coverage === "none" && !selected.length && cand.complete && (cand.topScore ?? 0) >= 0.5) writerSections = cand.sections.slice(0, 3);
    if (writerSections.length) {
      try {
        const r = await oa.chat.completions.create({ model: o.engine.large, messages: answerPrompt(q.text, writerSections, pastSel), temperature: 0, max_tokens: 600 }, { signal: o.signal });
        inTok += r.usage?.prompt_tokens ?? 0; outTok += r.usage?.completion_tokens ?? 0; use(o.engine.large, r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0);
        rawLarge = r.choices[0].message.content ?? "";
        raw = parseJson<ModelAnswer>(rawLarge);
      } catch (e) { if (o.signal?.aborted) throw e; }
    }
    // ── Steps 3 + 4: checks in code, deterministic flags ──
    const fin = finalize(raw, writerSections, pastSel, selection.coverage);
    const a: Answer = { question_id: q.id, ...fin, category: selection.category, coverage: selection.coverage, input_tokens: inTok, output_tokens: outTok, latency_ms: Date.now() - started, selection_ms: selMs, raw_small: rawSmall, raw_large: rawLarge };
    answers.set(q.id, a);
    run.done = answers.size; run.flags[a.flag as Flag]++; run.duration_ms = Date.now() - t0;
    emit({ type: "answer", answer: a });
  });

  clearInterval(tick);
  run.duration_ms = Date.now() - t0; run.finished_at = new Date().toISOString(); run.status = "done";
  const ordered = o.questions.map((q) => answers.get(q.id)!).filter(Boolean);
  emit({ type: "done", run, answers: ordered });
  return { run, answers: ordered };
}
