import { BASELINE_MODEL, MODELS, client, embed, price } from "./nebius";
import { classifyPrompt, synthesisPrompt, briefPrompt, CATEGORIES, type EvidenceBlock } from "./prompts";
import { search, chunkById } from "./retrieval";
import type { Answer, Category, Citation, Engine, Event, Flag, Metrics, Question, Risk, Usage, Verdict } from "./types";

export interface RunOptions {
  engine: Engine;
  companySlug: string;        // restricts retrieval to this workspace's knowledge base
  company: string;            // profile text
  prospect: string;
  questions: Question[];
  topK?: number;
  brief?: boolean;
  signal?: AbortSignal;
}

const chunked = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export interface RunResult { answers: Answer[]; metrics: Metrics; classes: Record<string, { category: Category; risk: Risk; reason: string }> }

export async function runPipeline(o: RunOptions, emit: (e: Event) => void): Promise<RunResult> {
  const t0 = Date.now();
  const usage: Usage[] = [];
  const answers = new Map<string, Answer>();
  const classes: RunResult["classes"] = {};
  const total = o.questions.length;

  const addUsage = (model: string, input: number, output: number) => {
    usage.push({ model, input, output, cost: price(model, input, output) });
  };
  const metrics = (): Metrics => {
    const cost = usage.reduce((s, u) => s + u.cost, 0);
    // What the identical token volume would cost on the closed baseline (list price).
    const baselineCost = usage.filter((u) => u.model !== MODELS.embedding).reduce((s, u) => s + price(BASELINE_MODEL, u.input, u.output), 0);
    return { elapsedMs: Date.now() - t0, usage, cost, baselineCost, done: answers.size, total, flagged: [...answers.values()].filter((a) => a.flag !== "none").length };
  };

  const oa = client(o.engine);

  // ── Stage 1+2 in parallel: classify (small model) and embed+retrieve ──
  emit({ type: "stage", stage: "classify", status: "start" });
  emit({ type: "stage", stage: "retrieve", status: "start" });

  const classify = Promise.all(
    chunked(o.questions, 5).map(async (batch) => {
      const res = await oa.chat.completions.create({
        model: o.engine.classifier,
        messages: classifyPrompt(batch),
        temperature: 0,
        max_tokens: 400,
      }, { signal: o.signal });
      addUsage(o.engine.classifier, res.usage?.prompt_tokens ?? 0, res.usage?.completion_tokens ?? 0);
      let items: { id: string; category: string; risk: string; reason: string }[] = [];
      try { items = JSON.parse((res.choices[0].message.content ?? "{}").replace(/^[\s\S]*?(\{)/, "$1").replace(/\}[^}]*$/, "}")).items ?? []; } catch { /* tolerate */ }
      for (const q of batch) {
        const it = items.find((x) => x.id === q.id);
        const category = (CATEGORIES as readonly string[]).includes(it?.category ?? "") ? (it!.category as Category) : "security";
        let risk = (["low", "medium", "high"].includes(it?.risk ?? "") ? it!.risk : "low") as Risk;
        // Only commitments and history need a human: legal / commercial / incident. Controls questions are at most medium.
        if (risk === "high" && !["legal", "commercial", "incident"].includes(category)) risk = "medium";
        classes[q.id] = { category, risk, reason: it?.reason ?? "" };
        emit({ type: "classified", id: q.id, category, risk, reason: it?.reason ?? "" });
      }
    }),
  ).then(() => emit({ type: "stage", stage: "classify", status: "done", ms: Date.now() - t0 }));

  const retrieve = (async () => {
    const vectors = await embedCached(o.questions.map((q) => q.text), addUsage);
    const cites = new Map<string, Citation[]>();
    o.questions.forEach((q, i) => {
      const c = search(vectors[i], o.topK ?? 6, o.companySlug);
      cites.set(q.id, c);
      emit({ type: "retrieved", id: q.id, citations: c });
    });
    emit({ type: "stage", stage: "retrieve", status: "done", ms: Date.now() - t0 });
    return cites;
  })();

  // Prospect brief (Tavily) runs fully in parallel and never blocks answers.
  const brief = o.brief && process.env.TAVILY_API_KEY && o.prospect ? prospectBrief(o.prospect, oa, o.engine.synthesizer, addUsage, emit).catch(() => {}) : Promise.resolve();

  const cites = await retrieve;

  // ── Stage 3: synthesis, streamed, N questions per call, all calls in parallel ──
  emit({ type: "stage", stage: "synthesize", status: "start" });
  const triage = classify.catch(() => {});

  const batches = chunked(o.questions, Math.max(1, o.engine.synthBatch));
  let tick: ReturnType<typeof setInterval> | undefined;
  if (emit) tick = setInterval(() => emit({ type: "metrics", metrics: metrics() }), 250);

  await Promise.all(batches.map(async (batch) => {
    const started = Date.now();
    const blocks: EvidenceBlock[] = batch.map((q) => ({
      id: q.id,
      text: q.text,
      evidence: (cites.get(q.id) ?? []).map((c, n) => ({ n: n + 1, title: c.title, text: chunkById(c.chunk).text })),
    }));
    const stream = await oa.chat.completions.create({
      model: o.engine.synthesizer,
      messages: synthesisPrompt(o.company, o.prospect, blocks),
      temperature: 0.2,
      max_tokens: 220 * batch.length + 40,
      stream: true,
      stream_options: { include_usage: true },
    }, { signal: o.signal });

    const parser = new BlockParser(batch.map((q) => q.id), (id, text) => emit({ type: "delta", id, text }));
    let gotUsage = false, outChars = 0;
    for await (const part of stream) {
      const d = part.choices?.[0]?.delta?.content;
      if (d) { parser.push(d); outChars += d.length; }
      if (part.usage) { gotUsage = true; addUsage(o.engine.synthesizer, part.usage.prompt_tokens ?? 0, part.usage.completion_tokens ?? 0); }
    }
    parser.end();
    // Some runtimes drop the trailing usage chunk of a stream; never under-report cost — estimate from characters (~4 chars/token).
    if (!gotUsage) addUsage(o.engine.synthesizer, Math.ceil(synthesisPrompt(o.company, o.prospect, blocks).reduce((n, m) => n + m.content.length, 0) / 4), Math.ceil(outChars / 4));
    const latencyMs = Date.now() - started;
    for (const q of batch) {
      const r = parser.result(q.id);
      const qc = cites.get(q.id) ?? [];
      const used = r.sources.length ? r.sources.filter((n) => n >= 1 && n <= qc.length).map((n) => qc[n - 1]) : qc.slice(0, 2);
      let flag: Flag = r.flag;
      if (classes[q.id]?.risk === "high" && flag === "none") flag = "needs_approval"; // if triage already finished
      if (((qc[0]?.score ?? 0) < 0.35 || r.verdict === "unknown") && flag === "none") flag = "no_evidence";
      const a: Answer = {
        id: q.id,
        text: r.answer.trim() || "No answer produced — needs SME input.",
        verdict: r.verdict,
        // model self-report blended with retrieval strength so the bar actually separates well-covered from thin evidence
        confidence: Number((0.6 * Math.max(0, Math.min(1, isNaN(r.confidence) ? 0.5 : r.confidence)) + 0.4 * Math.max(0, Math.min(1, ((qc[0]?.score ?? 0) - 0.4) / 0.35))).toFixed(2)),
        citations: used,
        evidence: qc,
        flag,
        reason: flag === "needs_approval" ? (classes[q.id]?.reason || "Commits the company; approval required") : flag === "no_evidence" ? "Not covered by the knowledge base" : undefined,
        latencyMs,
      };
      answers.set(q.id, a);
      emit({ type: "answer", answer: a });
    }
  }));

  if (tick) clearInterval(tick);
  emit({ type: "stage", stage: "synthesize", status: "done", ms: Date.now() - t0 });
  // Triage never blocks drafting: if it finished after an answer, escalate that answer now.
  await triage;
  for (const a of answers.values()) {
    if (a.flag === "none" && classes[a.id]?.risk === "high") {
      a.flag = "needs_approval"; a.reason = classes[a.id].reason || "Commits the company; approval required";
      emit({ type: "flag", id: a.id, flag: a.flag, reason: a.reason });
    }
  }
  await brief;
  const m = metrics();
  emit({ type: "metrics", metrics: m });
  return { answers: o.questions.map((q) => answers.get(q.id)!).filter(Boolean), metrics: m, classes };
}

/** Question embeddings are deterministic: cache them per process so a repeated questionnaire skips the embedding call. */
const embedCache = new Map<string, number[]>();
async function embedCached(texts: string[], addUsage: (m: string, i: number, o: number) => void) {
  const missing = texts.filter((t) => !embedCache.has(t));
  if (missing.length) {
    const vecs = await embed(missing);
    missing.forEach((t, i) => embedCache.set(t, vecs[i]));
    addUsage(MODELS.embedding, missing.reduce((s, t) => s + Math.ceil(t.length / 4), 0), 0);
  }
  return texts.map((t) => embedCache.get(t)!);
}

async function prospectBrief(prospect: string, oa: ReturnType<typeof client>, model: string, addUsage: (m: string, i: number, o: number) => void, emit: (e: Event) => void) {
  emit({ type: "stage", stage: "brief", status: "start" });
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ query: `${prospect} company news security compliance 2026`, search_depth: "basic", max_results: 5, topic: "news", days: 120 }),
  });
  if (!res.ok) throw new Error("tavily " + res.status);
  const data = (await res.json()) as { results: { title: string; content: string; url: string }[] };
  const results = data.results ?? [];
  if (!results.length) return;
  const c = await oa.chat.completions.create({ model, messages: briefPrompt(prospect, results), temperature: 0.3, max_tokens: 150 });
  addUsage(model, c.usage?.prompt_tokens ?? 0, c.usage?.completion_tokens ?? 0);
  emit({ type: "brief", prospect, summary: c.choices[0].message.content?.trim() ?? "", sources: results.map((r) => ({ title: r.title, url: r.url })) });
  emit({ type: "stage", stage: "brief", status: "done" });
}

/** Incremental parser for the [Q-ID] / ANSWER / CONFIDENCE / SOURCES / FLAG block format. Streams ANSWER text as it arrives. */
class BlockParser {
  private buf = "";
  private cur: string | null = null;
  private field: "answer" | "other" = "other";
  private out = new Map<string, { answer: string; verdict: Verdict; confidence: number; sources: number[]; flag: Flag }>();
  private ids: string[];
  constructor(ids: string[], private onDelta: (id: string, text: string) => void) {
    this.ids = ids;
    if (ids.length === 1) this.cur = ids[0];
    for (const id of ids) this.out.set(id, { answer: "", verdict: "na", confidence: NaN, sources: [], flag: "none" });
  }
  push(s: string) {
    this.buf += s;
    let nl: number;
    while ((nl = this.buf.indexOf("\n")) >= 0) {
      this.line(this.buf.slice(0, nl));
      this.buf = this.buf.slice(nl + 1);
    }
    // stream partial answer text (keep a small tail so a keyword starting a new line isn't half-emitted)
    if (this.field === "answer" && this.cur && this.buf.length > 24 && !/^(VERDICT|CONFIDENCE|SOURCES|FLAG|\[)/i.test(this.buf)) {
      const emitPart = this.buf.slice(0, this.buf.length - 12);
      this.buf = this.buf.slice(emitPart.length);
      this.emitAnswer(emitPart);
    }
  }
  private emitAnswer(t: string) {
    const r = this.out.get(this.cur!)!;
    r.answer += t;
    this.onDelta(this.cur!, t);
  }
  private line(l: string) {
    const head = l.match(/^\s*\[([A-Za-z0-9_.-]+)\]\s*$/);
    if (head && this.ids.includes(head[1])) { this.cur = head[1]; this.field = "other"; return; }
    if (!this.cur) return;
    const r = this.out.get(this.cur)!;
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^\s*ANSWER:\s*(.*)$/i))) { this.field = "answer"; this.emitAnswer(m[1]); return; }
    if ((m = l.match(/^\s*VERDICT:\s*(\w+)/i))) { this.field = "other"; const v = m[1].toLowerCase(); r.verdict = (["yes", "no", "partial", "unknown", "na"].includes(v) ? v : "na") as Verdict; return; }
    if ((m = l.match(/^\s*CONFIDENCE:\s*([\d.]+)/i))) { this.field = "other"; r.confidence = parseFloat(m[1]); return; }
    if ((m = l.match(/^\s*SOURCES:\s*(.*)$/i))) { this.field = "other"; r.sources = [...m[1].matchAll(/\d+/g)].map((x) => Number(x[0])); return; }
    if ((m = l.match(/^\s*FLAG:\s*(\w+)/i))) { this.field = "other"; const f = m[1].toLowerCase(); r.flag = f === "needs_approval" || f === "no_evidence" ? f : "none"; return; }
    if (this.field === "answer") this.emitAnswer((r.answer ? "\n" : "") + l);
  }
  end() { if (this.buf.trim()) this.line(this.buf); this.buf = ""; }
  result(id: string) { return this.out.get(id)!; }
}
