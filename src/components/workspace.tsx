"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Download, FileText, Play, Pencil, ShieldAlert, Sparkles, TriangleAlert, Database, Zap } from "lucide-react";
import type { Answer, Category, Citation, Event, Metrics, Question, Risk } from "@/lib/types";

interface QSet { slug: string; name: string; prospect: string; questions: Question[] }
interface Row { q: Question; category?: Category; risk?: Risk; reason?: string; citations?: Citation[]; text: string; answer?: Answer; status: "draft" | "approved" | "edited"; editing?: boolean }
type Stage = "classify" | "retrieve" | "synthesize" | "brief";

const STAGES: { key: Stage; label: string; model: string }[] = [
  { key: "classify", label: "Triage", model: "235B" },
  { key: "retrieve", label: "Retrieve", model: "embed" },
  { key: "synthesize", label: "Draft", model: "235B" },
  { key: "brief", label: "Brief", model: "Tavily" },
];

const usd = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);

export function Workspace({ questionnaires, stats, models }: { questionnaires: QSet[]; stats: { chunks: number; docs: number; dims: number }; models: { classifier: string; synthesizer: string; embedding: string } }) {
  const [sel, setSel] = useState<QSet>(questionnaires[0] ?? { slug: "custom:empty", name: "No questionnaire loaded", prospect: "", questions: [] });
  const [rows, setRows] = useState<Row[]>(() => sel.questions.map((q) => ({ q, text: "", status: "draft" })));
  const [stages, setStages] = useState<Record<Stage, { status: "idle" | "run" | "done"; ms?: number }>>({ classify: { status: "idle" }, retrieve: { status: "idle" }, synthesize: { status: "idle" }, brief: { status: "idle" } });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [brief, setBrief] = useState<{ prospect: string; summary: string; sources: { title: string; url: string }[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalMs, setFinalMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const t0 = useRef(0);
  const abort = useRef<AbortController | null>(null);

  const pick = (q: QSet) => { abort.current?.abort(); setSel(q); setRows(q.questions.map((x) => ({ q: x, text: "", status: "draft" }))); setMetrics(null); setBrief(null); setFinalMs(null); setElapsed(0); setError(null); setStages({ classify: { status: "idle" }, retrieve: { status: "idle" }, synthesize: { status: "idle" }, brief: { status: "idle" } }); };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(performance.now() - t0.current), 33);
    return () => clearInterval(id);
  }, [running]);

  const patch = useCallback((id: string, f: (r: Row) => Row) => setRows((rs) => rs.map((r) => (r.q.id === id ? f(r) : r))), []);

  const run = async () => {
    pick(sel);
    setRunning(true);
    t0.current = performance.now();
    const ac = new AbortController();
    abort.current = ac;
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: sel.slug.startsWith("custom:") ? undefined : sel.slug, questions: sel.slug.startsWith("custom:") ? sel.questions : undefined, prospect: sel.prospect }), signal: ac.signal });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 2);
          if (!line.startsWith("data:")) continue;
          handle(JSON.parse(line.slice(5)) as Event);
        }
      }
    } catch (e) {
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setFinalMs(performance.now() - t0.current);
    }
  };

  const handle = (e: Event) => {
    switch (e.type) {
      case "stage": setStages((s) => ({ ...s, [e.stage]: { status: e.status === "start" ? "run" : "done", ms: e.ms } })); break;
      case "classified": patch(e.id, (r) => ({ ...r, category: e.category, risk: e.risk, reason: e.reason })); break;
      case "retrieved": patch(e.id, (r) => ({ ...r, citations: e.citations })); break;
      case "delta": patch(e.id, (r) => ({ ...r, text: r.text + e.text })); break;
      case "answer": patch(e.answer.id, (r) => ({ ...r, answer: e.answer, text: e.answer.text, citations: e.answer.citations.length ? e.answer.citations : r.citations })); break;
      case "brief": setBrief({ prospect: e.prospect, summary: e.summary, sources: e.sources }); break;
      case "metrics": setMetrics(e.metrics); break;
      case "done": setMetrics(e.metrics); break;
      case "error": setError(e.message); break;
    }
  };

  const done = rows.filter((r) => r.answer).length;
  const flagged = rows.filter((r) => r.answer && r.answer.flag !== "none").length;
  const approved = rows.filter((r) => r.status !== "draft").length;
  const tokens = metrics ? metrics.usage.reduce((s, u) => s + u.input + u.output, 0) : 0;
  const shownMs = finalMs ?? elapsed;

  const exportCsv = () => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [["id", "section", "question", "answer", "confidence", "sources", "status", "flag"].join(",")];
    for (const r of rows) lines.push([r.q.id, r.q.section, r.q.text, r.text, r.answer?.confidence ?? "", (r.citations ?? []).map((c) => c.title).join("; "), r.status, r.answer?.flag ?? ""].map((x) => esc(String(x))).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${sel.slug}-answers.csv`;
    a.click();
  };

  const loadCsv = (csv: string, name: string) => {
    const qs = parseCsvClient(csv);
    if (!qs.length) return;
    const q: QSet = { slug: `custom:${Date.now()}`, name, prospect: "", questions: qs };
    pick(q);
    setCsvOpen(false);
  };

  return (
    <div className="flex flex-1">
      {/* ── Left rail ── */}
      <aside className="flex w-72 shrink-0 flex-col gap-5 border-r border-line p-4 text-sm">
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-mute"><Database size={12} /> Knowledge base</h2>
          <div className="rounded-md border border-line bg-panel p-3">
            <div className="text-lg font-semibold">Kestrel Cloud B.V.</div>
            <div className="mt-1 grid grid-cols-3 gap-2 font-mono text-[11px] text-mute">
              <div><div className="text-fg">{stats.docs}</div>docs</div>
              <div><div className="text-fg">{stats.chunks}</div>chunks</div>
              <div><div className="text-fg">{stats.dims}</div>dims</div>
            </div>
            <div className="mt-2 text-[11px] text-mute">Policies · SOC 2 · ISO 27001 · pen tests · past answers · DPA</div>
          </div>
        </section>
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-mute"><FileText size={12} /> Questionnaires</h2>
          <ul className="space-y-1">
            {[...questionnaires, ...(sel.slug.startsWith("custom:") ? [sel] : [])].map((q) => (
              <li key={q.slug}>
                <button onClick={() => pick(q)} disabled={running} className={`w-full rounded-md border px-3 py-2 text-left transition ${sel.slug === q.slug ? "border-accent/50 bg-accent/10" : "border-line bg-panel hover:border-mute"}`}>
                  <div className="font-medium">{q.name}</div>
                  <div className="text-[11px] text-mute">{q.prospect ? `from ${q.prospect} · ` : ""}{q.questions.length} questions</div>
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setCsvOpen((v) => !v)} className="mt-2 w-full rounded-md border border-dashed border-line px-3 py-2 text-left text-mute hover:border-mute hover:text-fg">+ New from CSV (id, section, question)</button>
          {csvOpen && (
            <div className="mt-2 space-y-2">
              <input type="file" accept=".csv,text/csv" className="block w-full text-[11px] text-mute" onChange={async (e) => { const f = e.target.files?.[0]; if (f) loadCsv(await f.text(), f.name.replace(/\.csv$/, "")); }} />
              <textarea placeholder="…or paste CSV here" className="h-24 w-full rounded-md border border-line bg-ink p-2 font-mono text-[11px]" onBlur={(e) => e.target.value.trim() && loadCsv(e.target.value, "Pasted questionnaire")} />
            </div>
          )}
        </section>
        <section className="mt-auto">
          <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-mute"><Zap size={12} /> Engine</h2>
          <div className="space-y-1 font-mono text-[10px] text-mute">
            <div><span className="text-fg">triage</span> {models.classifier.split("/")[1]}</div>
            <div><span className="text-fg">draft</span> {models.synthesizer.split("/")[1]}</div>
            <div><span className="text-fg">embed</span> {models.embedding.split("/")[1]}</div>
            <div className="pt-1 text-mute">Nebius Token Factory · EU · zero retention</div>
          </div>
        </section>
      </aside>

      {/* ── Main ── */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{sel.name}</h1>
            <div className="text-sm text-mute">{sel.prospect ? `Prospect: ${sel.prospect} · ` : ""}{sel.questions.length} questions · every answer cited from the knowledge base</div>
          </div>
          <div className="flex items-center gap-2">
            {done > 0 && !running && (
              <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm hover:border-mute"><Download size={14} /> Export CSV</button>
            )}
            <button onClick={run} disabled={running} className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-[0_0_24px_-4px_var(--color-accent)] transition hover:brightness-110 disabled:opacity-60">
              <Play size={14} fill="currentColor" /> {running ? "Drafting…" : done ? "Draft again" : "Draft all answers"}
            </button>
          </div>
        </div>

        {/* Pipeline strip + metrics */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line px-6 py-3">
          <ol className="flex items-center gap-2 whitespace-nowrap text-xs">
            {STAGES.map((s, i) => {
              const st = stages[s.key];
              return (
                <li key={s.key} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${st.status === "done" ? "bg-ok" : st.status === "run" ? "animate-pulse bg-accent" : "bg-line"}`} />
                  <span className={st.status === "idle" ? "text-mute" : ""}>{s.label}</span>
                  <span className="font-mono text-[10px] text-mute">{st.status === "done" && st.ms ? `${(st.ms / 1000).toFixed(2)}s` : s.model}</span>
                  {i < STAGES.length - 1 && <span className="mx-1 h-px w-6 bg-line" />}
                </li>
              );
            })}
          </ol>
          <div className="flex gap-6 whitespace-nowrap font-mono text-xs">
            <Stat label="elapsed" value={`${(shownMs / 1000).toFixed(2)}s`} hot={running} />
            <Stat label="answered" value={`${done}/${rows.length}`} />
            <Stat label="flagged" value={String(flagged)} tone={flagged ? "warn" : undefined} />
            <Stat label="tokens" value={tokens ? tokens.toLocaleString() : "—"} />
            <Stat label="cost · nebius" value={metrics ? usd(metrics.cost) : "—"} tone="ok" />
            <Stat label="same run · gpt-4o" value={metrics ? usd(metrics.baselineCost) : "—"} tone="bad" />
          </div>
        </div>

        {error && <div className="mx-6 mt-4 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}

        {brief && (
          <div className="rise mx-6 mt-4 rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-accent"><Sparkles size={12} /> Prospect brief · {brief.prospect} · via Tavily</div>
            <p className="text-fg/90">{brief.summary}</p>
            <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-mute">{brief.sources.slice(0, 4).map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="truncate max-w-64 underline decoration-line hover:text-fg">{s.title}</a>)}</div>
          </div>
        )}

        {/* Answers table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-ink text-left text-[11px] uppercase tracking-wider text-mute">
              <tr>
                <th className="w-12 border-b border-line pb-2 font-medium">#</th>
                <th className="w-[30%] border-b border-line pb-2 font-medium">Question</th>
                <th className="border-b border-line pb-2 font-medium">Drafted answer</th>
                <th className="w-40 border-b border-line pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => <AnswerRow key={r.q.id} r={r} running={running} onApprove={() => patch(r.q.id, (x) => ({ ...x, status: x.status === "approved" ? "draft" : "approved" }))} onEdit={(t) => patch(r.q.id, (x) => ({ ...x, text: t, status: "edited", editing: false }))} onToggleEdit={() => patch(r.q.id, (x) => ({ ...x, editing: !x.editing }))} />)}
            </tbody>
          </table>
        </div>

        {done === rows.length && rows.length > 0 && !running && (
          <div className="rise flex items-center justify-between border-t border-line px-6 py-3 text-sm">
            <div className="text-mute">
              <span className="text-fg">{rows.length} answers</span> drafted in <span className="font-mono text-fg">{((finalMs ?? 0) / 1000).toFixed(1)}s</span> · {flagged} need a human · {approved} approved
              {metrics && <> · <span className="font-mono text-ok">{usd(metrics.cost)}</span> vs <span className="font-mono text-bad">{usd(metrics.baselineCost)}</span> on GPT-4o list price ({Math.round(metrics.baselineCost / Math.max(metrics.cost, 1e-9))}× cheaper)</>}
            </div>
            <div className="text-[11px] text-mute">Manual baseline for a questionnaire this size: 20–40 hours</div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, tone, hot }: { label: string; value: string; tone?: "ok" | "warn" | "bad"; hot?: boolean }) {
  const c = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-fg";
  return (
    <div className="text-right">
      <div className={`tabular-nums text-base leading-tight ${c} ${hot ? "text-accent" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-mute">{label}</div>
    </div>
  );
}

const CAT: Record<string, string> = { company: "bg-sky-500/15 text-sky-300", compliance: "bg-violet-500/15 text-violet-300", security: "bg-emerald-500/15 text-emerald-300", access: "bg-teal-500/15 text-teal-300", infrastructure: "bg-cyan-500/15 text-cyan-300", appsec: "bg-lime-500/15 text-lime-300", incident: "bg-orange-500/15 text-orange-300", privacy: "bg-pink-500/15 text-pink-300", legal: "bg-red-500/15 text-red-300", commercial: "bg-amber-500/15 text-amber-300", ai: "bg-indigo-500/15 text-indigo-300" };

function AnswerRow({ r, running, onApprove, onEdit, onToggleEdit }: { r: Row; running: boolean; onApprove: () => void; onEdit: (t: string) => void; onToggleEdit: () => void }) {
  const streaming = !r.answer && r.text.length > 0;
  const a = r.answer;
  const pending = !r.category && !r.citations && !r.text;
  return (
    <tr className={`align-top transition ${pending && running ? "opacity-40" : ""}`}>
      <td className="border-b border-line py-3 pr-2 font-mono text-[11px] text-mute">{r.q.id}</td>
      <td className="border-b border-line py-3 pr-4">
        <div className="text-fg/90">{r.q.text}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          {r.q.section && <span className="text-mute">{r.q.section}</span>}
          {r.category && <span className={`rise rounded px-1.5 py-0.5 font-medium ${CAT[r.category]}`}>{r.category}</span>}
          {r.risk === "high" && <span className="rise rounded bg-bad/15 px-1.5 py-0.5 font-medium text-bad">high risk</span>}
        </div>
      </td>
      <td className="border-b border-line py-3 pr-4">
        {r.editing ? (
          <textarea defaultValue={r.text} autoFocus className="h-28 w-full rounded-md border border-accent/40 bg-panel p-2 text-sm" onBlur={(e) => onEdit(e.target.value)} />
        ) : (
          <p className={`whitespace-pre-wrap text-fg/90 ${streaming ? "caret" : ""}`}>{r.text || (r.citations ? <span className="text-mute">evidence found · drafting…</span> : running ? <span className="text-mute">…</span> : null)}</p>
        )}
        {r.citations && (
          <div className="rise mt-2 flex flex-wrap items-center gap-1.5">
            {r.citations.slice(0, 3).map((c, i) => (
              <span key={c.chunk} title={`similarity ${c.score}`} className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[10px] text-mute"><span className="text-accent">[{i + 1}]</span> {c.title}</span>
            ))}
            {a && <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-mute">conf <span className="inline-block h-1.5 w-16 overflow-hidden rounded bg-line"><span className={`block h-full ${a.confidence > 0.75 ? "bg-ok" : a.confidence > 0.5 ? "bg-warn" : "bg-bad"}`} style={{ width: `${a.confidence * 100}%` }} /></span>{a.confidence.toFixed(2)}</span>}
          </div>
        )}
      </td>
      <td className="border-b border-line py-3">
        {a && (
          <div className="rise space-y-1.5">
            {a.flag === "needs_approval" ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-bad"><ShieldAlert size={13} /> Needs approval</div>
            ) : a.flag === "no_evidence" ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-warn"><TriangleAlert size={13} /> No evidence · SME</div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-ok"><Check size={13} /> Ready to send</div>
            )}
            {a.reason && <div className="text-[10px] text-mute">{a.reason}</div>}
            <div className="flex gap-1">
              <button onClick={onApprove} className={`rounded border px-2 py-0.5 text-[11px] ${r.status === "approved" ? "border-ok/50 bg-ok/15 text-ok" : "border-line hover:border-mute"}`}>{r.status === "approved" ? "Approved" : "Approve"}</button>
              <button onClick={onToggleEdit} className="rounded border border-line px-2 py-0.5 text-[11px] hover:border-mute"><Pencil size={11} className="inline" /></button>
            </div>
            <div className="font-mono text-[10px] text-mute">{(a.latencyMs / 1000).toFixed(1)}s</div>
          </div>
        )}
      </td>
    </tr>
  );
}

function parseCsvClient(csv: string): Question[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && csv[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!head) return [];
  const h = head.map((x) => x.trim().toLowerCase());
  const iq = h.indexOf("question"), is = h.indexOf("section"), ii = h.indexOf("id");
  return body.map((r, n) => ({ id: ii >= 0 && r[ii]?.trim() ? r[ii].trim() : `Q${String(n + 1).padStart(2, "0")}`, section: is >= 0 ? (r[is] ?? "").trim() : "", text: (iq >= 0 ? r[iq] : r[r.length - 1] ?? "").trim() })).filter((x) => x.text);
}
