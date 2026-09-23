"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileDiff, Play, RefreshCw } from "lucide-react";
import { diffRuns, type Change } from "@/lib/diff";
import type { Answer, Event, Flag, PolicySet, Question, RunMeta } from "@/lib/types";

export interface Meta {
  company: string;
  policies: { short: string; name: string; version: string; effective: string; sections: number }[];
  updated_policies: { short: string; name: string; version: string; effective: string }[];
  past_answers: number;
  questionnaire: { name: string; header: string[]; questions: Question[] };
  models: { selection: string; writing: string; embedding: string; provider: string };
}
type Filter = "all" | Flag | "changed";
const FLAG = { green: { bar: "bg-ok", text: "text-ok", label: "Ready" }, orange: { bar: "bg-warn", text: "text-warn", label: "Review" }, red: { bar: "bg-bad", text: "text-bad", label: "No source" } } as const;
const short = (m: string) => m.split("/").pop() ?? m;
const usd = (n: number) => `$${n.toFixed(n < 0.1 ? 3 : 2)}`;

export function Workspace({ meta }: { meta: Meta }) {
  const [policySet, setPolicySet] = useState<PolicySet>("current");
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<RunMeta | null>(null);
  const [prev, setPrev] = useState<{ run: RunMeta; answers: Answer[] } | null>(null);
  const [changes, setChanges] = useState<Map<string, Change>>(new Map());
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t0 = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const questions = meta.questionnaire.questions;

  useEffect(() => { if (!running) return; const id = setInterval(() => setElapsed(performance.now() - t0.current), 33); return () => clearInterval(id); }, [running]);

  const start = async () => {
    abort.current?.abort();
    if (run?.status === "done") setPrev({ run, answers: questions.map((q) => answers.get(q.id)!).filter(Boolean) });
    setAnswers(new Map()); setSelected(new Set()); setChanges(new Map()); setRun(null); setError(null); setOpen(null); setFilter("all");
    setRunning(true); t0.current = performance.now();
    const ac = new AbortController(); abort.current = ac;
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ policy_set: policySet }), signal: ac.signal });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
          if (!line.startsWith("data:")) continue;
          const e = JSON.parse(line.slice(5)) as Event;
          if (e.type === "start" || e.type === "metrics") setRun(e.run);
          else if (e.type === "selected") setSelected((s) => new Set(s).add(e.question_id));
          else if (e.type === "answer") setAnswers((m) => new Map(m).set(e.answer.question_id, e.answer));
          else if (e.type === "done") { setRun(e.run); if (prevRef.current) setChanges(new Map(diffRuns(prevRef.current.answers, e.answers).map((c) => [c.question_id, c]))); }
          else if (e.type === "error") setError(e.message);
        }
      }
    } catch (e) { if (!ac.signal.aborted) setError(e instanceof Error ? e.message : String(e)); }
    finally { setRunning(false); setElapsed(performance.now() - t0.current); }
  };
  const prevRef = useRef(prev); prevRef.current = prev;

  const rows = useMemo(() => questions.filter((q) => { const a = answers.get(q.id); if (filter === "all") return true; if (filter === "changed") return changes.get(q.id)?.changed; return a?.flag === filter; }), [questions, answers, filter, changes]);
  const counts = { green: run?.flags.green ?? 0, orange: run?.flags.orange ?? 0, red: run?.flags.red ?? 0, changed: [...changes.values()].filter((c) => c.changed).length };
  const done = answers.size;
  const finished = run?.status === "done";
  const secs = (finished ? run!.duration_ms : elapsed) / 1000;

  const exportCsv = () => {
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const h = meta.questionnaire.header.map((x) => x.toLowerCase());
    const head = [...meta.questionnaire.header, "flag", "flag_reason", "sources"];
    const lines = [head.map(esc).join(",")];
    questions.forEach((q, i) => {
      const a = answers.get(q.id);
      const row = meta.questionnaire.header.map((_, c) => (h[c] === "answer" ? a?.answer ?? "" : h[c] === "comment" ? a?.comment ?? "" : h[c] === "ssrm_ownership" ? a?.ssrm_ownership ?? "" : h[c] === "question" ? q.text : h[c].includes("id") ? q.id : ""));
      void i; lines.push([...row, a?.flag ?? "", a?.flag_reason ?? "", (a?.sources ?? []).map((s) => `${s.section_id} v${s.version}`).join("; ")].map(esc).join(","));
    });
    const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); el.download = "questionnaire_2026_filled.csv"; el.click();
  };
  const openA = open ? answers.get(open) : undefined;
  const openQ = open ? questions.find((q) => q.id === open) : undefined;

  return (
    <div className="flex flex-1 flex-col">
      {/* header */}
      <div className="flex items-end justify-between gap-6 border-b border-line px-8 py-5">
        <div>
          <div className="text-[13px] uppercase tracking-[0.2em] text-mute">{meta.company} · {meta.questionnaire.name}</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{questions.length} questions · {meta.policies.length} policies · {meta.past_answers} past answers</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 text-[15px] text-mute">{meta.policies.map((p) => <span key={p.short}>{p.short} v{policySet === "updated" && meta.updated_policies.find((u) => u.short === p.short) ? meta.updated_policies.find((u) => u.short === p.short)!.version : p.version}</span>)}</div>
        </div>
        <div className="flex items-center gap-3">
          {meta.updated_policies.length > 0 && (
            <button onClick={() => setPolicySet((s) => (s === "current" ? "updated" : "current"))} disabled={running} className={`flex items-center gap-2 rounded-md border px-4 py-3 text-[15px] ${policySet === "updated" ? "border-warn/60 bg-warn/10 text-warn" : "border-line text-mute hover:text-fg"}`}>
              <FileDiff size={16} /> {policySet === "updated" ? `Updated policy loaded (${meta.updated_policies.map((u) => `${u.short} v${u.version}`).join(", ")})` : `Load updated ${meta.updated_policies.map((u) => `${u.short} v${u.version}`).join(", ")}`}
            </button>
          )}
          {finished && <button onClick={exportCsv} className="flex items-center gap-2 rounded-md border border-line px-4 py-3 text-[15px] text-mute hover:text-fg"><Download size={16} /> Export CSV</button>}
          <button onClick={start} disabled={running} className="flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-[16px] font-semibold text-ink shadow-[0_0_40px_-8px_var(--color-accent)] hover:brightness-110 disabled:opacity-60">
            {running ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />} {running ? "Running…" : finished ? "Run again" : "Run"}
          </button>
        </div>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-5 gap-4 px-8 py-5">
        <Big label="seconds" value={secs.toFixed(1)} tone={running ? "accent" : undefined} />
        <Big label="answered" value={`${done} / ${questions.length}`} />
        <Big label="tokens" value={run ? (run.input_tokens + run.output_tokens).toLocaleString() : "—"} />
        <Big label={run ? `cost · ${usd(run.baseline_cost_usd)} on a closed model` : "cost"} value={run ? usd(run.cost_usd) : "—"} tone="ok" />
        <div className="flex items-center gap-4 rounded-md border border-line bg-panel px-5 py-3 text-[16px]">
          {(["green", "orange", "red"] as Flag[]).map((f) => <span key={f} className={`flex items-center gap-2 ${FLAG[f].text}`}><span className={`h-3 w-3 rounded-sm ${FLAG[f].bar}`} /><span className="font-mono tabular-nums">{counts[f]}</span></span>)}
          {counts.changed > 0 && <span className="ml-auto text-accent">{counts.changed} changed</span>}
        </div>
      </div>

      {error && <div className="mx-8 mb-3 rounded-md border border-bad/40 bg-bad/10 px-4 py-2 text-[15px] text-bad">{error}</div>}

      {/* filters */}
      <div className="flex items-center gap-2 px-8 pb-3 text-[15px]">
        {(["all", "green", "orange", "red", ...(counts.changed ? ["changed" as const] : [])] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 capitalize ${filter === f ? "bg-panel text-fg ring-1 ring-line" : "text-mute hover:text-fg"}`}>{f === "all" ? "All" : f === "changed" ? "Changed" : FLAG[f].label}{f !== "all" && <span className="ml-1.5 font-mono text-[13px] opacity-70">{f === "changed" ? counts.changed : counts[f]}</span>}</button>
        ))}
        {counts.red > 0 && <span className="ml-auto text-[15px] text-mute">Gap list: <span className="text-bad">{counts.red}</span> question{counts.red > 1 ? "s" : ""} no policy covers</span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* table */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <table className="w-full table-fixed border-separate border-spacing-0 text-[16px]">
            <thead className="sticky top-0 z-10 bg-ink text-left text-[13px] uppercase tracking-wider text-mute">
              <tr><th className="w-3 border-b border-line" /><th className="w-24 border-b border-line py-2 pl-3">ID</th><th className={`${open ? "w-auto" : "w-[34%]"} border-b border-line py-2`}>Question</th><th className="w-28 border-b border-line py-2">Answer</th>{!open && <th className="border-b border-line py-2">Comment</th>}<th className="w-44 border-b border-line py-2">Source</th></tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const a = answers.get(q.id); const ch = changes.get(q.id);
                return (
                  <tr key={q.id} onClick={() => a && setOpen(q.id)} className={`rise cursor-pointer align-top transition hover:bg-panel ${open === q.id ? "bg-panel" : ""} ${!a && running ? (selected.has(q.id) ? "opacity-70" : "opacity-35") : ""}`}>
                    <td className={`border-b border-line ${a ? FLAG[a.flag].bar : "bg-line"}`} />
                    <td className="border-b border-line py-3 pl-3 font-mono text-[14px] text-mute">{q.id}{ch?.changed && <div className="mt-1 inline-block rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium uppercase text-accent">changed</div>}</td>
                    <td className="border-b border-line py-3 pr-4 leading-snug text-fg/90"><span className="line-clamp-2">{q.text}</span></td>
                    <td className="border-b border-line py-3">{a ? <span className={`rounded px-2 py-0.5 font-mono text-[14px] font-semibold ${a.answer === "Yes" ? "bg-ok/15 text-ok" : a.answer === "No" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}>{a.answer}</span> : <span className="text-[14px] text-mute">{selected.has(q.id) ? "writing…" : running ? "selecting…" : ""}</span>}</td>
                    {!open && <td className="border-b border-line py-3 pr-4 leading-snug text-fg/80"><span className="line-clamp-2">{a?.comment}</span></td>}
                    <td className="border-b border-line py-3 font-mono text-[13px] text-mute">{a?.sources[0] ? `${a.sources[0].section_id} v${a.sources[0].version}${a.sources.length > 1 ? ` +${a.sources.length - 1}` : ""}` : a ? "—" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* answer panel */}
        {openA && openQ && (
          <aside className="rise w-[440px] shrink-0 overflow-auto border-l border-line bg-panel px-6 py-5 text-[15px]">
            <div className="flex items-start justify-between gap-3"><div className="font-mono text-[13px] text-mute">{openQ.id}</div><button onClick={() => setOpen(null)} className="text-mute hover:text-fg">✕</button></div>
            <div className="mt-2 text-[17px] leading-snug text-fg">{openQ.text}</div>
            <div className="mt-4 flex items-center gap-3"><span className={`rounded px-2.5 py-1 font-mono text-[15px] font-semibold ${openA.answer === "Yes" ? "bg-ok/15 text-ok" : openA.answer === "No" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}>{openA.answer}</span><span className={`flex items-center gap-2 ${FLAG[openA.flag].text}`}><span className={`h-3 w-3 rounded-sm ${FLAG[openA.flag].bar}`} />{FLAG[openA.flag].label}</span><span className="ml-auto font-mono text-[12px] text-mute">{(openA.latency_ms / 1000).toFixed(1)}s</span></div>
            {openA.flag !== "green" && <div className={`mt-2 text-[14px] ${FLAG[openA.flag].text}`}>{openA.flag_reason}</div>}
            {changes.get(openQ.id)?.changed && (
              <div className="mt-4 rounded-md border border-accent/40 bg-accent/5 p-3">
                <div className="text-[12px] uppercase tracking-wider text-accent">Previous run · {changes.get(openQ.id)!.reasons.join(" · ")}</div>
                <div className="mt-1 text-fg/80"><span className="font-mono">{changes.get(openQ.id)!.previous?.answer}</span> — {changes.get(openQ.id)!.previous?.comment}</div>
              </div>
            )}
            <p className="mt-4 leading-relaxed text-fg/90">{openA.comment}</p>
            {openA.flag === "orange" && openA.conflicts.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[openA.conflicts[0].section_a, openA.conflicts[0].section_b].map((id) => { const s = openA.sources.find((x) => x.section_id === id); return <div key={id} className="rounded-md border border-warn/40 p-3 text-[14px]"><div className="font-mono text-[12px] text-warn">{id}{s ? ` · v${s.version}` : ""}</div><div className="mt-1 text-fg/85">{s?.quote ?? "(see policy)"}</div></div>; })}
                <div className="col-span-2 text-[13px] text-warn">{openA.conflicts[0].what_differs}</div>
              </div>
            )}
            {openA.flag === "orange" && openA.past_answer && openA.past_answer_consistent === false && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-[14px]">
                <div className="rounded-md border border-line p-3"><div className="font-mono text-[12px] text-mute">2025 answer · {openA.past_answer.ref}</div><div className="mt-1 text-fg/70">{openA.past_answer.answer}. {openA.past_answer.comment}</div></div>
                <div className="rounded-md border border-warn/40 p-3"><div className="font-mono text-[12px] text-warn">Current policy · {openA.sources[0]?.section_id} v{openA.sources[0]?.version}</div><div className="mt-1 text-fg/85">{openA.sources[0]?.quote}</div></div>
              </div>
            )}
            {openA.sources.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-[12px] uppercase tracking-wider text-mute">Sources · quotes verified against the policy text</div>
                {openA.sources.map((s, i) => <blockquote key={i} className="rounded-md border-l-2 border-accent bg-ink px-3 py-2 text-[14px] text-fg/85"><div className="mb-1 font-mono text-[12px] text-accent">{s.policy} · {s.section_id} · v{s.version}</div>“{s.quote}”</blockquote>)}
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="flex items-center gap-6 border-t border-line px-8 py-2 font-mono text-[12px] text-mute">
        <span>selection: {short(meta.models.selection)}</span><span>writing: {short(meta.models.writing)}</span><span>embedding: {short(meta.models.embedding)}</span><span className="ml-auto">{meta.models.provider} · EU · no closed model in the pipeline</span>
      </div>
    </div>
  );
}

function Big({ label, value, tone }: { label: string; value: string; tone?: "ok" | "accent" }) {
  return (
    <div className="rounded-md border border-line bg-panel px-5 py-3">
      <div className={`font-mono text-[34px] font-semibold leading-none tabular-nums ${tone === "ok" ? "text-ok" : tone === "accent" ? "text-accent" : "text-fg"}`}>{value}</div>
      <div className="mt-1.5 text-[12px] uppercase tracking-wider text-mute">{label}</div>
    </div>
  );
}
