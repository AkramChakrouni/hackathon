import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

interface Result { id: string; provider: "nebius" | "closed"; primary: boolean; wallMsMedian: number; firstTokenMsMedian: number; perQuestionMsMedian: number; costMean: number; tokensIn: number; tokensOut: number; quality: number; groundedness: number; completeness: number; precision: number; hallucinations: number; flagged: number; noEvidence: number; price: [number, number]; error?: string }
interface Bench { generatedAt: string; questionnaire: string; questions: number; runsPerCandidate: number; judge: string; primary: string; baseline: string | null; headline: { costX: number; wallX: number; ttftX: number; qualityDelta: number } | null; results: Result[]; samples: { id: string; question: string; answers: Record<string, string> }[] }

function load(): Bench | null {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "benchmark.json"), "utf8")); } catch { return null; }
}
const short = (m: string) => m.split("/").pop() ?? m;
const s = (ms: number, d = 1) => `${(ms / 1000).toFixed(d)}s`;

export default function Benchmark() {
  const b = load();
  if (!b) return <main className="p-10 text-mute">No benchmark yet — run <code className="font-mono text-fg">npm run benchmark</code>.</main>;
  const ok = b.results.filter((r) => !r.error);
  const primary = ok.find((r) => r.id === b.primary)!;
  const base = ok.find((r) => r.id === b.baseline);
  const best = { wall: Math.min(...ok.map((r) => r.wallMsMedian)), ttft: Math.min(...ok.map((r) => r.firstTokenMsMedian)), cost: Math.min(...ok.map((r) => r.costMean)), q: Math.max(...ok.map((r) => r.quality)) };
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Measured, not assumed</h1>
      <p className="mt-1 text-sm text-mute">
        Every candidate ran the identical pipeline (same prompts, evidence, batching, parallelism) on <span className="text-fg">{b.questionnaire}</span> · {b.questions} questions · {b.runsPerCandidate} runs each · {new Date(b.generatedAt).toLocaleString("en-GB")}.
        Every answer graded blind by <span className="font-mono text-fg">{short(b.judge)}</span> on groundedness, completeness and precision (1–5). Prices are the providers&apos; live list prices.
      </p>

      {b.headline && base && (
        <div className="mt-6 grid grid-cols-4 gap-3 text-sm">
          <Tile label="Cheaper per questionnaire" value={`${b.headline.costX.toFixed(0)}×`} sub={`$${primary.costMean.toFixed(3)} vs $${base.costMean.toFixed(3)} · ${short(base.id)}`} tone="ok" />
          <Tile label="Wall-clock, 50 questions" value={`${s(primary.wallMsMedian)}`} sub={`vs ${s(base.wallMsMedian)} · ${b.headline.wallX.toFixed(1)}×`} tone={b.headline.wallX >= 1 ? "ok" : "warn"} />
          <Tile label="First drafted token" value={`${s(primary.firstTokenMsMedian, 2)}`} sub={`vs ${s(base.firstTokenMsMedian, 2)}`} tone={b.headline.ttftX >= 1 ? "ok" : "warn"} />
          <Tile label="Quality (blind, 1–5)" value={`${primary.quality.toFixed(2)}`} sub={`vs ${base.quality.toFixed(2)} · Δ ${b.headline.qualityDelta >= 0 ? "+" : ""}${b.headline.qualityDelta.toFixed(2)}`} tone={b.headline.qualityDelta >= -0.15 ? "ok" : "warn"} />
        </div>
      )}
      {!base && (
        <div className="mt-6 grid grid-cols-4 gap-3 text-sm">
          <Tile label="Wall-clock, 50 questions" value={s(primary.wallMsMedian)} sub="median, whole questionnaire" tone="ok" />
          <Tile label="First drafted token" value={s(primary.firstTokenMsMedian, 2)} sub="median" tone="ok" />
          <Tile label="Cost per questionnaire" value={`$${primary.costMean.toFixed(3)}`} sub={`list price · manual: 20–40 h`} tone="ok" />
          <Tile label="Quality (blind, 1–5)" value={primary.quality.toFixed(2)} sub={`${primary.hallucinations} hallucinated answers`} tone="ok" />
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Model selection matrix</h2>
      <p className="text-sm text-mute">Why this model: the drafter was chosen from these candidates on measured latency, cost and blind quality, not on reputation.</p>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wider text-mute">
          <tr><th className="pb-2 font-medium">Model</th><th className="pb-2 font-medium">Where</th><th className="pb-2 text-right font-medium">Wall-clock</th><th className="pb-2 text-right font-medium">First token</th><th className="pb-2 text-right font-medium">Per question</th><th className="pb-2 text-right font-medium">Cost / run</th><th className="pb-2 text-right font-medium">$/1M in · out</th><th className="pb-2 text-right font-medium">Quality</th><th className="pb-2 text-right font-medium">Ground.</th><th className="pb-2 text-right font-medium">Halluc.</th><th className="pb-2 text-right font-medium">Flags</th></tr>
        </thead>
        <tbody className="font-mono text-xs tabular-nums">
          {b.results.map((r) => (
            <tr key={r.id} className={`border-t border-line ${r.id === b.primary ? "bg-accent/5" : ""}`}>
              <td className="py-2.5 pr-3 font-sans text-sm">{r.id === b.primary && <span className="mr-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">chosen</span>}{short(r.id)}{r.error && <span className="ml-2 text-bad">failed</span>}</td>
              <td className="py-2.5 pr-3 text-mute">{r.provider === "nebius" ? "Nebius Token Factory" : "closed API"}</td>
              <Num v={s(r.wallMsMedian)} best={r.wallMsMedian === best.wall} />
              <Num v={s(r.firstTokenMsMedian, 2)} best={r.firstTokenMsMedian === best.ttft} />
              <Num v={s(r.perQuestionMsMedian)} />
              <Num v={`$${r.costMean.toFixed(4)}`} best={r.costMean === best.cost} />
              <td className="py-2.5 pr-3 text-right text-mute">{r.price[0].toFixed(2)} · {r.price[1].toFixed(2)}</td>
              <Num v={r.quality.toFixed(2)} best={r.quality === best.q} />
              <Num v={r.groundedness.toFixed(2)} />
              <Num v={String(r.hallucinations)} tone={r.hallucinations ? "bad" : "ok"} />
              <td className="py-2.5 text-right text-mute">{r.flagged} · {r.noEvidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-mute">Flags = needs-approval · no-evidence counts on the last run. Wall-clock and first token are medians across runs. Cost is the mean of measured token usage × list price, including triage and embeddings.</p>

      <h2 className="mt-10 text-lg font-semibold">Control &amp; adaptability</h2>
      <ul className="mt-2 grid grid-cols-2 gap-3 text-sm text-fg/90">
        <li className="rounded-md border border-line bg-panel p-3"><b>Data residency.</b> Inference in the EU on Nebius with zero retention. Questionnaire content is a customer&apos;s security architecture; it never leaves the jurisdiction.</li>
        <li className="rounded-md border border-line bg-panel p-3"><b>Stage-level routing.</b> Triage, retrieval and drafting are separate calls with separate models; each stage is re-pointed by measurement (the 3B-active triage model was swapped out when it measured slower than the 235B MoE on this endpoint).</li>
        <li className="rounded-md border border-line bg-panel p-3"><b>Predictable latency.</b> A non-reasoning MoE drafter (22B active of 235B) streams 50 answers concurrently with no hidden thinking tokens, so time-to-first-token is stable enough to demo live.</li>
        <li className="rounded-md border border-line bg-panel p-3"><b>Fine-tuning path.</b> Open weights let the drafter be LoRA-tuned on a customer&apos;s approved answers. A closed API cannot offer that.</li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Side-by-side samples</h2>
      <div className="mt-2 space-y-3 text-sm">
        {b.samples.slice(0, 5).map((smp) => (
          <div key={smp.id} className="rounded-md border border-line bg-panel p-3">
            <div className="mb-2 text-fg"><span className="mr-2 font-mono text-[11px] text-mute">{smp.id}</span>{smp.question}</div>
            <div className="grid grid-cols-2 gap-3 text-[13px] text-fg/85">
              {[b.primary, b.baseline ?? ok.find((r) => r.id !== b.primary)?.id].filter(Boolean).map((id) => (
                <div key={id}><div className={`mb-1 text-[10px] uppercase tracking-wider ${id === b.primary ? "text-accent" : "text-mute"}`}>{short(id!)}</div>{smp.answers[id!]}</div>
              ))}
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
function Num({ v, best, tone }: { v: string; best?: boolean; tone?: "ok" | "bad" }) {
  return <td className={`py-2.5 pr-3 text-right ${best ? "text-ok" : tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : ""}`}>{v}</td>;
}
