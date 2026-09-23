import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

interface Agg { model: string; runs: number; wallMsMedian: number; wallMsMin: number; firstAnswerMsMedian: number; costMean: number; tokensIn: number; tokensOut: number; perQuestionMsMedian: number; quality: number; wins: number; flagged: number; noEvidence: number }
interface Bench { generatedAt: string; questionnaire: string; questions: number; runsPerEngine: number; judge: string; nebius: Agg; baseline: Agg; ties: number; scores: { id: string; nebius: number; baseline: number; winner: string }[]; samples: { id: string; question: string; nebius: string; baseline: string }[] }

function load(): Bench | null {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "benchmark.json"), "utf8")); } catch { return null; }
}

const short = (m: string) => m.split("/").pop() ?? m;

export default function Benchmark() {
  const b = load();
  if (!b) return <main className="p-10 text-mute">No benchmark yet — run <code className="font-mono text-fg">npm run benchmark</code>.</main>;
  const n = b.nebius, c = b.baseline;
  const x = (a: number, bb: number) => (bb / Math.max(a, 1e-9));
  const rows: { label: string; unit: string; n: number; c: number; better: "low" | "high"; fmt: (v: number) => string }[] = [
    { label: "Wall-clock, whole questionnaire", unit: "median", n: n.wallMsMedian / 1000, c: c.wallMsMedian / 1000, better: "low", fmt: (v) => `${v.toFixed(1)}s` },
    { label: "Time to first drafted token", unit: "median", n: n.firstAnswerMsMedian / 1000, c: c.firstAnswerMsMedian / 1000, better: "low", fmt: (v) => `${v.toFixed(2)}s` },
    { label: "Per-question latency", unit: "median", n: n.perQuestionMsMedian / 1000, c: c.perQuestionMsMedian / 1000, better: "low", fmt: (v) => `${v.toFixed(1)}s` },
    { label: "Cost per questionnaire", unit: "mean, list price", n: n.costMean, c: c.costMean, better: "low", fmt: (v) => `$${v.toFixed(3)}` },
    { label: "Answer quality (blind judge, 1–5)", unit: `judge: ${short(b.judge)}`, n: n.quality, c: c.quality, better: "high", fmt: (v) => v.toFixed(2) },
  ];
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Measured model advantage</h1>
      <p className="mt-1 text-sm text-mute">
        Identical pipeline, prompts, evidence and batching. <span className="text-fg">{b.questionnaire}</span> · {b.questions} questions · {b.runsPerEngine} runs per engine · {new Date(b.generatedAt).toLocaleString("en-GB")}.
        Quality scored blind (A/B randomised) on groundedness, completeness and precision.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <Tile label="Cheaper per questionnaire" value={`${x(n.costMean, c.costMean).toFixed(0)}×`} sub={`$${n.costMean.toFixed(3)} vs $${c.costMean.toFixed(3)}`} tone="ok" />
        <Tile label="Wall-clock" value={`${x(n.wallMsMedian, c.wallMsMedian).toFixed(1)}×`} sub={`${(n.wallMsMedian / 1000).toFixed(1)}s vs ${(c.wallMsMedian / 1000).toFixed(1)}s`} tone={n.wallMsMedian <= c.wallMsMedian ? "ok" : "warn"} />
        <Tile label="Quality parity" value={`${n.quality.toFixed(2)} / ${c.quality.toFixed(2)}`} sub={`wins ${n.wins} · ${c.wins} · ties ${b.ties}`} tone={n.quality >= c.quality - 0.15 ? "ok" : "warn"} />
      </div>

      <table className="mt-8 w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wider text-mute">
          <tr><th className="pb-2 font-medium">Metric</th><th className="pb-2 font-medium">{short(n.model)} <span className="text-mute normal-case">· Nebius Token Factory</span></th><th className="pb-2 font-medium">{short(c.model)} <span className="text-mute normal-case">· closed baseline</span></th><th className="pb-2 font-medium">Edge</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const win = r.better === "low" ? r.n <= r.c : r.n >= r.c;
            const max = Math.max(r.n, r.c) || 1;
            return (
              <tr key={r.label} className="border-t border-line">
                <td className="py-3 pr-4"><div>{r.label}</div><div className="text-[11px] text-mute">{r.unit}</div></td>
                <td className="py-3 pr-4"><Bar v={r.n / max} label={r.fmt(r.n)} tone="accent" /></td>
                <td className="py-3 pr-4"><Bar v={r.c / max} label={r.fmt(r.c)} tone="mute" /></td>
                <td className={`py-3 font-mono text-xs ${win ? "text-ok" : "text-warn"}`}>{r.better === "low" ? `${x(r.n, r.c).toFixed(1)}× ${win ? "faster/cheaper" : "slower/costlier"}` : `${(r.n - r.c >= 0 ? "+" : "")}${(r.n - r.c).toFixed(2)}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mt-10 text-lg font-semibold">Control &amp; adaptability (not measurable by a closed API)</h2>
      <ul className="mt-2 grid grid-cols-2 gap-3 text-sm text-fg/90">
        <li className="rounded-md border border-line bg-panel p-3"><b>Data residency.</b> Inference in the EU (Nebius, Finland) with zero retention — questionnaire content is customers&apos; security architecture; it never leaves the jurisdiction.</li>
        <li className="rounded-md border border-line bg-panel p-3"><b>Two-tier routing.</b> 8B triage + 70B drafting: the small model classifies risk for {"<"}1% of the cost; only synthesis pays for the large model.</li>
        <li className="rounded-md border border-line bg-panel p-3"><b>Guided decoding.</b> JSON-schema mode on the classifier gives deterministic structure without retries.</li>
        <li className="rounded-md border border-line bg-panel p-3"><b>Fine-tuning path.</b> Open weights let us LoRA-tune the drafter on a customer&apos;s approved answers — impossible on a closed model.</li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Side-by-side samples</h2>
      <div className="mt-2 space-y-3 text-sm">
        {b.samples.slice(0, 6).map((s) => (
          <div key={s.id} className="rounded-md border border-line bg-panel p-3">
            <div className="mb-2 text-fg"><span className="mr-2 font-mono text-[11px] text-mute">{s.id}</span>{s.question}</div>
            <div className="grid grid-cols-2 gap-3 text-[13px] text-fg/85">
              <div><div className="mb-1 text-[10px] uppercase tracking-wider text-accent">{short(n.model)} · {b.scores.find((x) => x.id === s.id)?.nebius.toFixed(1)}</div>{s.nebius}</div>
              <div><div className="mb-1 text-[10px] uppercase tracking-wider text-mute">{short(c.model)} · {b.scores.find((x) => x.id === s.id)?.baseline.toFixed(1)}</div>{s.baseline}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "ok" | "warn" }) {
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className={`text-3xl font-semibold tabular-nums ${tone === "ok" ? "text-ok" : "text-warn"}`}>{value}</div>
      <div className="mt-1 text-fg">{label}</div>
      <div className="font-mono text-[11px] text-mute">{sub}</div>
    </div>
  );
}

function Bar({ v, label, tone }: { v: number; label: string; tone: "accent" | "mute" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-40 overflow-hidden rounded bg-line"><div className={`h-full ${tone === "accent" ? "bg-accent" : "bg-mute"}`} style={{ width: `${Math.max(2, v * 100)}%` }} /></div>
      <span className="font-mono text-xs tabular-nums">{label}</span>
    </div>
  );
}
