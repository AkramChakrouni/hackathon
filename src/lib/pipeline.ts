import { BASELINE_MODEL, client, embed, parseJson, price } from "./nebius";
import { contextual, loadPastAnswers, loadPolicies } from "./corpus";
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
  const account = (model: string, i: number, out: number) => { run.input_tokens += i; run.output_tokens += out; run.cost_usd += price(model, i, out); run.baseline_cost_usd += price(BASELINE_MODEL, i, out); };
  const tick = setInterval(() => { run.duration_ms = Date.now() - t0; emit({ type: "metrics", run }); }, 250);

  let vectors: (number[] | null)[] = o.questions.map(() => null);
  try { vectors = await embedCached(o.questions.map((q) => contextual(q))); account("Qwen/Qwen3-Embedding-8B", o.questions.reduce((s, q) => s + Math.ceil(q.text.length / 4), 0), 0); } catch { /* shortlist unavailable → whole corpus */ }

  await pool(o.questions.map((q, i) => ({ q, i })), o.concurrency ?? Number(process.env.CONCURRENCY ?? 50), async ({ q, i }) => {
    const started = Date.now();
    let inTok = 0, outTok = 0;
    // ── Step 1: source selection (small model) ──
    const cand = vectors[i] ? shortlist(vectors[i]!, sections, past) : { sections, past, pastScores: new Map<string, number>(), complete: false, topScore: 0 };
    const trace = (step: "shortlist" | "select" | "write" | "verify" | "flag", detail: string, model?: string) => emit({ type: "trace", question_id: q.id, step, model, detail, ms: Date.now() - started, t: Date.now() - t0 });
    trace("shortlist", cand.complete ? `${cand.sections.length} candidate sections, ${cand.past.length} past answers (top similarity ${cand.topScore.toFixed(2)})` : `whole corpus (${cand.sections.length} sections)`, "Qwen3-Embedding-8B");
    let selection: Selection = { category: "security", relevant_sections: [], relevant_past_answers: [], coverage: "none" };
    let rawSmall: string | undefined, selMs = 0;
    try {
      const r = await oa.chat.completions.create({ model: o.engine.small, messages: selectionPrompt(contextual(q), cand.sections), temperature: 0, max_tokens: 160 }, { signal: o.signal });
      inTok += r.usage?.prompt_tokens ?? 0; outTok += r.usage?.completion_tokens ?? 0; account(o.engine.small, r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0);
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
    trace("select", `${selection.coverage} · ${selection.relevant_sections.length ? selection.relevant_sections.join(", ") : "no section"} · ${selection.category}`, o.engine.small);

    const selected = selection.relevant_sections.map((id) => sections.find((s) => s.id === id)!).filter(Boolean);
    const pastSel = cand.past.slice(0, 3);
    let raw: ModelAnswer | null = null, rawLarge: string | undefined;
    // ── Step 2: answer writing (large model) — skipped when nothing covers the question.
    // Safety net: if the selector said "none" but the top section is strongly similar, let the writer decide (it may still answer Unknown → red).
    let writerSections = selected;
    if (selection.coverage === "none" && !selected.length && cand.complete && (cand.topScore ?? 0) >= 0.5) writerSections = cand.sections.slice(0, 3);
    if (writerSections.length) {
      try {
        const r = await oa.chat.completions.create({ model: o.engine.large, messages: answerPrompt(contextual(q), writerSections, pastSel), temperature: 0, max_tokens: 600 }, { signal: o.signal });
        inTok += r.usage?.prompt_tokens ?? 0; outTok += r.usage?.completion_tokens ?? 0; account(o.engine.large, r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0);
        rawLarge = r.choices[0].message.content ?? "";
        raw = parseJson<ModelAnswer>(rawLarge);
        trace("write", raw ? `${raw.answer ?? "?"} · ${raw.sources?.length ?? 0} quote${(raw.sources?.length ?? 0) === 1 ? "" : "s"}${raw.conflicts?.length ? ` · ${raw.conflicts.length} conflict` : ""}${raw.past_answer?.same_question ? ` · past ${raw.past_answer.ref}${raw.past_answer.consistent === false ? " differs" : ""}` : ""} · ${r.usage?.completion_tokens ?? 0} tokens` : "no JSON in response", o.engine.large);
      } catch (e) { if (o.signal?.aborted) throw e; }
    }
    // ── Steps 3 + 4: checks in code, deterministic flags ──
    if (!writerSections.length) trace("write", "skipped: nothing to write from", o.engine.large);
    const fin = finalize(raw, writerSections, pastSel, selection.coverage);
    trace("verify", `${fin.checks.quotes_valid} quote${fin.checks.quotes_valid === 1 ? "" : "s"} found in policy text${fin.checks.quotes_dropped ? `, ${fin.checks.quotes_dropped} dropped` : ""}${fin.sources.some((x) => x.repaired) ? `, ${fin.sources.filter((x) => x.repaired).length} auto-quoted` : ""}${fin.checks.numbers_unverified.length ? ` · unverified numbers: ${fin.checks.numbers_unverified.join(", ")}` : " · all numbers quoted"}`);
    trace("flag", `${fin.flag.toUpperCase()} · ${fin.flag_reason}`);
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
