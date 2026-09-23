import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
interface Scored { id: string; trap: string; expected: string; expectedFlag: string; answer: string; flag: string; score: number; invented: string[]; factsCovered: boolean | null }
interface R { engine: string; model_small: string; model_large: string; run: { duration_ms: number; input_tokens: number; output_tokens: number }; scored: Scored[]; answersCorrect: number; flagsCorrect: number; invented: number; factsCovered: number; trapsCaught: number; pastMatched: number; avgScore: number; seconds: number; usd: number; eur: number; dataLeavesEU: boolean }

export default function Benchmark() {
  let b: { generatedAt: string; judge: string; results: R[] } | null = null;
  try { b = JSON.parse(fs.readFileSync(path.join(process.cwd(), "benchmark", "benchmark.json"), "utf8")); } catch { /* none */ }
  if (!b) return <main className="p-10 text-mute">Run <code>npm run benchmark</code>.</main>;
  const rows: [string, (r: R) => string][] = [
    ["Answers correct (of 50)", (r) => `${r.answersCorrect}`], ["Flags correct (of 50)", (r) => `${r.flagsCorrect}`], ["Invented numbers", (r) => `${r.invented}`],
    ["Key facts covered (judge, of 50)", (r) => `${r.factsCovered}`], ["Traps caught (of 8, score = 1)", (r) => `${r.trapsCaught}`], ["Last year's answer matched (of 30)", (r) => `${r.pastMatched}`],
    ["Accuracy (avg score)", (r) => r.avgScore.toFixed(2)], ["Seconds per questionnaire", (r) => r.seconds.toFixed(1)], ["Cost per questionnaire", (r) => `$${r.usd.toFixed(3)} (€${r.eur.toFixed(3)})`],
    ["Tokens in / out", (r) => `${r.run.input_tokens.toLocaleString()} / ${r.run.output_tokens.toLocaleString()}`], ["Data leaves EU", (r) => (r.dataLeavesEU ? "Yes" : "No")],
  ];
  const traps = b.results[0].scored.filter((s) => s.trap);
  return (
    <main className="mx-auto w-full max-w-5xl px-8 py-8 text-[16px]">
      <h1 className="text-[28px] font-semibold tracking-tight">Scored against the answer key</h1>
      <p className="mt-1 text-mute">Personivo CAIQ v4.1, 50 questions. Same code, same prompts for every column. The key is never in the pipeline path. Facts judge: {b.judge.split("/").pop()}. Score: 1 = answer, facts and flag match · 0.5 = answer right, a fact or the flag off · 0 = wrong answer or invented number. {new Date(b.generatedAt).toLocaleString("en-GB")}.</p>
      <table className="mt-6 w-full"><thead className="text-left text-[13px] uppercase tracking-wider text-mute"><tr><th className="pb-2">Metric</th>{b.results.map((r) => <th key={r.engine} className="pb-2">{r.engine === "nebius" ? "TenderScale · Nebius Token Factory" : "closed model"}<div className="font-mono text-[11px] normal-case">{r.model_small.split("/").pop()} → {r.model_large.split("/").pop()}</div></th>)}</tr></thead>
        <tbody className="font-mono tabular-nums">{rows.map(([l, f]) => <tr key={l} className="border-t border-line"><td className="py-2 pr-4 font-sans text-fg/90">{l}</td>{b!.results.map((r) => <td key={r.engine} className="py-2 pr-4 text-ok">{f(r)}</td>)}</tr>)}</tbody></table>
      <h2 className="mt-10 text-[22px] font-semibold">The 8 trap questions</h2>
      <table className="mt-3 w-full font-mono text-[14px]"><thead className="text-left text-[12px] uppercase tracking-wider text-mute"><tr><th className="pb-2">Question</th><th className="pb-2">Trap</th><th className="pb-2">Expected</th>{b.results.map((r) => <th key={r.engine} className="pb-2">{r.engine}</th>)}</tr></thead>
        <tbody>{traps.map((t) => <tr key={t.id} className="border-t border-line"><td className="py-2 pr-3">{t.id}</td><td className="py-2 pr-3 text-mute">{t.trap.split(":")[0]}</td><td className="py-2 pr-3">{t.expected} · {t.expectedFlag}</td>{b!.results.map((r) => { const s = r.scored.find((x) => x.id === t.id)!; return <td key={r.engine} className={`py-2 pr-3 ${s.score === 1 ? "text-ok" : s.score === 0.5 ? "text-warn" : "text-bad"}`}>{s.answer} · {s.flag} {s.score === 1 ? "✓" : s.score === 0.5 ? "½" : "✗"}</td>; })}</tr>)}</tbody></table>
      <p className="mt-6 text-[14px] text-mute">Full table with prices and sources: <a className="underline" href="https://github.com/AkramChakrouni/hackathon/blob/main/benchmark/benchmark.md">benchmark/benchmark.md</a> · filled score sheet: benchmark/answer_key_filled.xlsx</p>
    </main>
  );
}
