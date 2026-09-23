"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Download, Play, ShieldAlert, Sparkles, TriangleAlert, Upload } from "lucide-react";
import type { Answer, Category, Citation, Event, Metrics, Question, Risk } from "@/lib/types";

interface QSet { slug: string; name: string; prospect: string; company: string; questions: Question[] }
interface CompanyInfo { slug: string; name: string; docs: number; chunks: number; dims: number }
interface Row { q: Question; category?: Category; risk?: Risk; citations?: Citation[]; text: string; answer?: Answer; approved?: boolean; open?: boolean }
type Stage = "classify" | "retrieve" | "synthesize" | "brief";
const STAGES: { key: Stage; label: string }[] = [{ key: "classify", label: "Triage" }, { key: "retrieve", label: "Retrieve" }, { key: "synthesize", label: "Draft" }, { key: "brief", label: "Prospect brief" }];
const IDLE = { classify: { status: "idle" }, retrieve: { status: "idle" }, synthesize: { status: "idle" }, brief: { status: "idle" } } as Record<Stage, { status: "idle" | "run" | "done"; ms?: number }>;
const usd = (n: number) => (n < 0.01 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`);

export function Workspace({ questionnaires, companies, models }: { questionnaires: QSet[]; companies: CompanyInfo[]; models: { classifier: string; synthesizer: string; embedding: string } }) {
  const [sel, setSel] = useState<QSet>(questionnaires[0] ?? { slug: "custom:empty", name: "No questionnaire loaded", prospect: "", company: companies[0]?.slug ?? "", questions: [] });
  const [rows, setRows] = useState<Row[]>(() => sel.questions.map((q) => ({ q, text: "" })));
  const [stages, setStages] = useState(IDLE);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [brief, setBrief] = useState<{ prospect: string; summary: string; sources: { title: string; url: string }[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalMs, setFinalMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t0 = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const company = companies.find((c) => c.slug === sel.company) ?? companies[0] ?? { slug: "", name: "—", docs: 0, chunks: 0, dims: 0 };

  const pick = (q: QSet) => { abort.current?.abort(); setSel(q); setRows(q.questions.map((x) => ({ q: x, text: "" }))); setMetrics(null); setBrief(null); setFinalMs(null); setElapsed(0); setError(null); setStages(IDLE); };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(performance.now() - t0.current), 33);
    return () => clearInterval(id);
  }, [running]);

  const patch = useCallback((id: string, f: (r: Row) => Row) => setRows((rs) => rs.map((r) => (r.q.id === id ? f(r) : r))), []);

  const handle = (e: Event) => {
    switch (e.type) {
      case "stage": setStages((s) => ({ ...s, [e.stage]: { status: e.status === "start" ? "run" : "done", ms: e.ms } })); break;
      case "classified": patch(e.id, (r) => ({ ...r, category: e.category, risk: e.risk })); break;
      case "retrieved": patch(e.id, (r) => ({ ...r, citations: e.citations })); break;
      case "delta": patch(e.id, (r) => ({ ...r, text: r.text + e.text })); break;
      case "answer": patch(e.answer.id, (r) => ({ ...r, answer: e.answer, text: e.answer.text, citations: e.answer.citations.length ? e.answer.citations : r.citations })); break;
      case "flag": patch(e.id, (r) => (r.answer ? { ...r, answer: { ...r.answer, flag: e.flag, reason: e.reason } } : r)); break;
      case "brief": setBrief({ prospect: e.prospect, summary: e.summary, sources: e.sources }); break;
      case "metrics": case "done": setMetrics(e.metrics); break;
      case "error": setError(e.message); break;
    }
  };

  const run = async () => {
    pick(sel);
    setRunning(true);
    t0.current = performance.now();
    const ac = new AbortController();
    abort.current = ac;
    try {
      const custom = sel.slug.startsWith("custom:");
      const res = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: custom ? undefined : sel.slug, questions: custom ? sel.questions : undefined, prospect: sel.prospect, company: sel.company }), signal: ac.signal });
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
          if (line.startsWith("data:")) handle(JSON.parse(line.slice(5)) as Event);
        }
      }
    } catch (e) {
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setFinalMs(performance.now() - t0.current);
    }
  };

  const done = rows.filter((r) => r.answer).length;
  const flagged = rows.filter((r) => r.answer && r.answer.flag !== "none").length;
  const shownMs = finalMs ?? elapsed;
  const finished = done === rows.length && rows.length > 0 && !running;

  const exportCsv = () => {
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [["id", "section", "question", "verdict", "answer", "sources", "status"].join(",")];
    for (const r of rows) lines.push([r.q.id, r.q.section, r.q.text, r.answer?.verdict, r.text, (r.citations ?? []).map((c) => c.title).join("; "), r.approved ? "approved" : r.answer?.flag ?? ""].map(esc).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${sel.slug}-answers.csv`;
    a.click();
  };

  return (
    <div className="flex flex-1">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line p-5 text-sm">
        <div className="text-[11px] font-medium uppercase tracking-wider text-mute">Company</div>
        <div className="mt-1 text-lg font-semibold leading-tight">{company.name}</div>
        <div className="mt-1 text-xs text-mute">{company.docs} documents · {company.chunks} passages indexed</div>

        <div className="mt-8 text-[11px] font-medium uppercase tracking-wider text-mute">Questionnaires</div>
        <ul className="mt-2 space-y-1">
          {[...questionnaires, ...(sel.slug.startsWith("custom:") ? [sel] : [])].map((q) => (
            <li key={q.slug}>
              <button onClick={() => pick(q)} disabled={running} className={`w-full rounded-md px-3 py-2 text-left transition ${sel.slug === q.slug ? "bg-accent/10 text-fg" : "text-mute hover:bg-panel hover:text-fg"}`}>
                <div className="font-medium leading-snug">{q.name}</div>
                <div className="text-[11px] opacity-70">{q.questions.length} questions{q.prospect ? ` · ${q.prospect}` : ""}</div>
              </button>
            </li>
          ))}
        </ul>
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-mute hover:bg-panel hover:text-fg">
          <Upload size={14} /> Upload CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const qs = parseCsvClient(await f.text()); if (qs.length) pick({ slug: `custom:${Date.now()}`, name: f.name.replace(/\.csv$/, ""), prospect: "", company: sel.company, questions: qs }); }} />
        </label>

        <div className="mt-auto pt-6 font-mono text-[10px] leading-relaxed text-mute">
          {models.synthesizer.split("/")[1]}<br />{models.embedding.split("/")[1]}<br />Nebius Token Factory · EU · zero retention
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-end justify-between gap-6 px-8 pt-7">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{sel.name}</h1>
            <div className="mt-1 text-sm text-mute">{sel.prospect ? `Sent by ${sel.prospect} · ` : ""}{sel.questions.length} questions</div>
          </div>
          <div className="flex items-center gap-2">
            {finished && <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2.5 text-sm text-mute hover:text-fg"><Download size={14} /> Export</button>}
            <button onClick={run} disabled={running} className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-[0_0_32px_-6px_var(--color-accent)] transition hover:brightness-110 disabled:opacity-60">
              <Play size={14} fill="currentColor" /> {running ? "Drafting…" : done ? "Draft again" : "Draft all answers"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4 px-8">
          <Big label="seconds" value={(shownMs / 1000).toFixed(1)} hot={running} />
          <Big label="answered" value={`${done}/${rows.length}`} />
          <Big label="need a human" value={String(flagged)} tone={flagged ? "warn" : undefined} />
          <Big label={metrics ? `vs ${usd(metrics.baselineCost)} on GPT` : "cost"} value={metrics ? usd(metrics.cost) : "—"} tone="ok" />
        </div>

        <ol className="mt-4 flex items-center gap-5 px-8 text-xs text-mute">
          {STAGES.map((s) => { const st = stages[s.key]; return (
            <li key={s.key} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${st.status === "done" ? "bg-ok" : st.status === "run" ? "animate-pulse bg-accent" : "bg-line"}`} />
              <span className={st.status === "idle" ? "" : "text-fg"}>{s.label}</span>
              {st.status === "done" && st.ms ? <span className="font-mono text-[10px]">{(st.ms / 1000).toFixed(1)}s</span> : null}
            </li>
          ); })}
          {finished && metrics && <li className="ml-auto text-fg">{Math.round(metrics.baselineCost / Math.max(metrics.cost, 1e-9))}× cheaper than GPT at list price · manual: 20–40 h</li>}
        </ol>

        {error && <div className="mx-8 mt-4 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}

        {brief && (
          <div className="rise mx-8 mt-5 flex items-start gap-3 rounded-md border border-accent/25 bg-accent/5 px-4 py-3 text-sm">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
            <div><span className="font-medium text-accent">{brief.prospect} right now</span> <span className="text-mute">· Tavily</span> — <span className="text-fg">{brief.summary}</span></div>
          </div>
        )}

        <div className="mt-5 flex-1 overflow-auto px-8 pb-8">
          <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-ink text-left text-[11px] uppercase tracking-wider text-mute">
              <tr><th className="w-[30%] border-b border-line pb-2 font-medium">Question</th><th className="border-b border-line pb-2 font-medium">Answer</th><th className="w-40 border-b border-line pb-2 font-medium">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => <AnswerRow key={r.q.id} r={r} running={running} onToggle={() => patch(r.q.id, (x) => ({ ...x, open: !x.open }))} onApprove={() => patch(r.q.id, (x) => ({ ...x, approved: !x.approved }))} />)}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function Big({ label, value, tone, hot }: { label: string; value: string; tone?: "ok" | "warn"; hot?: boolean }) {
  const c = hot ? "text-accent" : tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="rounded-md border border-line bg-panel px-4 py-3">
      <div className={`font-mono text-3xl font-semibold tabular-nums leading-none ${c}`}>{value}</div>
      <div className="mt-1.5 text-[11px] uppercase tracking-wider text-mute">{label}</div>
    </div>
  );
}

const CAT: Record<string, string> = { company: "text-sky-300", compliance: "text-violet-300", security: "text-emerald-300", access: "text-teal-300", infrastructure: "text-cyan-300", appsec: "text-lime-300", incident: "text-orange-300", privacy: "text-pink-300", legal: "text-red-300", commercial: "text-amber-300", ai: "text-indigo-300" };

function AnswerRow({ r, running, onToggle, onApprove }: { r: Row; running: boolean; onToggle: () => void; onApprove: () => void }) {
  const a = r.answer;
  const streaming = !a && r.text.length > 0;
  const pending = !r.category && !r.citations && !r.text;
  return (
    <tr className={`align-top transition ${pending && running ? "opacity-40" : ""}`}>
      <td className="border-b border-line py-3.5 pr-6">
        <div className="text-fg/90">{r.q.text}</div>
        <div className="mt-1 font-mono text-[10px] text-mute">{r.q.id}{r.category && <span className={`rise ml-2 ${CAT[r.category]}`}>{r.category}</span>}</div>
      </td>
      <td className="border-b border-line py-3.5 pr-6" onClick={onToggle}>
        {r.text ? (
          <p className={`cursor-pointer whitespace-pre-wrap text-fg/90 ${streaming ? "caret" : ""} ${r.open ? "" : "line-clamp-3"}`}>{r.text}</p>
        ) : (
          <span className="text-mute">{r.citations ? "evidence found · drafting" : running ? "…" : ""}</span>
        )}
        {r.citations && (
          <div className="rise mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[10px] text-mute">
            {r.citations.slice(0, 2).map((c, i) => <span key={c.chunk} className="min-w-0 truncate rounded border border-line px-1.5 py-0.5"><span className="text-accent">[{i + 1}]</span> {c.title.replace(/\s*\(.*$/, "")}</span>)}
            {a && <span className="ml-auto inline-block h-1 w-12 shrink-0 overflow-hidden rounded bg-line" title={`confidence ${a.confidence}`}><span className={`block h-full ${a.confidence > 0.75 ? "bg-ok" : a.confidence > 0.5 ? "bg-warn" : "bg-bad"}`} style={{ width: `${a.confidence * 100}%` }} /></span>}
          </div>
        )}
      </td>
      <td className="border-b border-line py-3.5">
        {a && (
          <div className="rise space-y-1.5 text-[12px]">
            {a.flag === "needs_approval" ? <div className="flex items-center gap-1.5 font-medium text-bad"><ShieldAlert size={13} /> Needs approval</div>
              : a.flag === "no_evidence" ? <div className="flex items-center gap-1.5 font-medium text-warn"><TriangleAlert size={13} /> No evidence</div>
              : <div className="flex items-center gap-1.5 font-medium text-ok"><Check size={13} /> Ready</div>}
            {a.verdict !== "na" && <div className={`font-mono text-[10px] uppercase ${a.verdict === "yes" ? "text-ok" : a.verdict === "no" ? "text-bad" : "text-warn"}`}>verdict · {a.verdict}</div>}
            {a.reason && <div className="text-[10px] leading-snug text-mute">{a.reason}</div>}
            <button onClick={onApprove} className={`rounded border px-2 py-0.5 text-[11px] ${r.approved ? "border-ok/50 bg-ok/15 text-ok" : "border-line text-mute hover:text-fg"}`}>{r.approved ? "Approved" : "Approve"}</button>
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
  const iq = h.indexOf("question"), is = h.indexOf("section");
  const ii = ["id", "question_id", "ref"].map((k) => h.indexOf(k)).find((i) => i >= 0) ?? -1;
  return body.map((r, n) => ({ id: ii >= 0 && r[ii]?.trim() ? r[ii].trim() : `Q${String(n + 1).padStart(2, "0")}`, section: is >= 0 ? (r[is] ?? "").trim() : "", text: (iq >= 0 ? r[iq] : r[r.length - 1] ?? "").trim() })).filter((x) => x.text);
}
