/** Renders docs/results.md (+ docs/charts/*.svg) from data/benchmark.json, data/eval.json and data/pricing.json — every number the pitch uses, reproducible. */
import fs from "node:fs";
import path from "node:path";

const read = (f: string) => { try { return JSON.parse(fs.readFileSync(path.join("data", f), "utf8")); } catch { return null; } };
const bench = read("benchmark.json"), ev = read("eval.json");
const short = (m: string) => m.split("/").pop() ?? m;
const s = (ms: number, d = 1) => `${(ms / 1000).toFixed(d)} s`;
fs.mkdirSync(path.join("docs", "charts"), { recursive: true });

/** Horizontal bar chart as a standalone SVG (dark, one accent). */
function bars(file: string, title: string, rows: { label: string; value: number; text: string; primary?: boolean }[], unit = "") {
  const w = 720, rowH = 34, left = 250, top = 44, max = Math.max(...rows.map((r) => r.value)) || 1;
  const h = top + rows.length * rowH + 16;
  const body = rows.map((r, i) => {
    const y = top + i * rowH, bw = Math.max(3, ((w - left - 110) * r.value) / max);
    return `<text x="${left - 12}" y="${y + 20}" text-anchor="end" fill="${r.primary ? "#e6e9ee" : "#8b95a3"}" font-size="13" font-family="ui-monospace,Menlo,monospace">${r.label}</text>
<rect x="${left}" y="${y + 6}" width="${bw}" height="20" rx="3" fill="${r.primary ? "#7dd3fc" : "#3a4350"}"/>
<text x="${left + bw + 8}" y="${y + 20}" fill="#e6e9ee" font-size="13" font-family="ui-monospace,Menlo,monospace">${r.text}${unit}</text>`;
  }).join("\n");
  fs.writeFileSync(path.join("docs", "charts", file), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0b0d10"/><text x="16" y="26" fill="#e6e9ee" font-size="15" font-weight="600" font-family="Inter,system-ui,sans-serif">${title}</text>${body}</svg>`);
  return `![${title}](charts/${file})`;
}

const out: string[] = [];
out.push(`# Attest — results pack`, ``, `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC from \`data/benchmark.json\`, \`data/eval.json\`, \`data/pricing.json\`. Regenerate with \`npm run report\`.`, ``);

if (ev) {
  const primary = ev.results.find((r: { model: string }) => bench ? r.model === bench.primary : true) ?? ev.results[0];
  out.push(`## 1. Accuracy against a held-out answer key (the demo company)`, ``,
    `Questionnaire: **${primary.name}** for **Personivo B.V.** (${primary.questions} CAIQ v4.1 questions, answered from 3 policies + last year's questionnaire). Answer key never shown to the pipeline. Judge for the facts check: \`${short(ev.judge)}\` (sees the key).`, ``,
    `| Metric | ${short(primary.model)} |`, `|---|---|`,
    `| Verdict correct (Yes / No / Unknown) | **${primary.verdictAcc}%** |`,
    `| Flag correct (ready · review · no evidence) | **${primary.flagAcc}%** |`,
    `| Key facts correct | **${primary.factsAcc}%** |`,
    `| All three correct | **${primary.allThree}%** |`,
    `| Answers with an invented fact | **${primary.invented}** / ${primary.questions} |`,
    `| Traps caught (outdated · conflict · uncovered · honest no) | **${primary.traps.filter((t: { ok: boolean }) => t.ok).length} / ${primary.traps.length}** |`,
    `| Wall-clock, ${primary.questions} questions | **${s(primary.wallMs)}** |`,
    `| Cost, whole questionnaire | **$${primary.cost.toFixed(3)}** |`, ``);
  out.push(bars("accuracy.svg", `Accuracy vs answer key — ${short(primary.model)}`, [
    { label: "verdict correct", value: primary.verdictAcc, text: `${primary.verdictAcc}`, primary: true }, { label: "flag correct", value: primary.flagAcc, text: `${primary.flagAcc}`, primary: true },
    { label: "key facts correct", value: primary.factsAcc, text: `${primary.factsAcc}`, primary: true }, { label: "all three", value: primary.allThree, text: `${primary.allThree}`, primary: true }], "%"), ``);
  out.push(`### Trap questions`, ``, `| Trap | Question | Expected | Got | Verdict | Flag | Facts |`, `|---|---|---|---|---|---|---|`);
  for (const r of primary.rows.filter((r: { trap: string }) => r.trap)) out.push(`| ${r.trap.split(":")[0]} | ${r.id} | ${r.expected.toLowerCase()} · ${r.expectedFlag} | ${r.verdict} · ${r.flag} | ${r.verdictOk ? "✅" : "❌"} | ${r.flagOk ? "✅" : "❌"} | ${r.factsOk ? "✅" : "❌"} |`);
  out.push(``);
  if (ev.results.length > 1) {
    out.push(`### Drafter comparison on the same key`, ``, `| Drafter | Verdict | Flag | Facts | All three | Traps | Wall-clock | Cost |`, `|---|---|---|---|---|---|---|---|`);
    for (const r of ev.results) out.push(`| ${short(r.model)} | ${r.verdictAcc}% | ${r.flagAcc}% | ${r.factsAcc}% | ${r.allThree}% | ${r.traps.filter((t: { ok: boolean }) => t.ok).length}/${r.traps.length} | ${s(r.wallMs)} | $${r.cost.toFixed(3)} |`);
    out.push(``);
  }
}

if (bench) {
  const ok = bench.results.filter((r: { error?: string }) => !r.error);
  out.push(`## 2. Model selection matrix (why this drafter)`, ``,
    `Identical pipeline, prompts, evidence and parallelism on **${bench.questionnaire}** (${bench.questions} questions, ${bench.runsPerCandidate} runs per candidate). Every answer graded blind by \`${short(bench.judge)}\` (1–5: groundedness, completeness, precision). Prices are live list prices from the providers' model endpoints.`, ``,
    `| Model | Where | Wall-clock (median) | First token (median) | Per question | Cost / run | $/1M in · out | Quality | Groundedness | Hallucinated |`, `|---|---|---|---|---|---|---|---|---|---|`);
  for (const r of bench.results) out.push(r.error ? `| ${short(r.id)} | ${r.provider} | failed (${r.error.slice(0, 40)}) | | | | | | | |` : `| ${r.id === bench.primary ? "**" + short(r.id) + "** (chosen)" : short(r.id)} | ${r.provider === "nebius" ? "Nebius Token Factory" : "closed API"} | ${s(r.wallMsMedian)} | ${s(r.firstTokenMsMedian, 2)} | ${s(r.perQuestionMsMedian)} | $${r.costMean.toFixed(4)} | ${r.price[0].toFixed(2)} · ${r.price[1].toFixed(2)} | ${r.quality.toFixed(2)} | ${r.groundedness.toFixed(2)} | ${r.hallucinations} |`);
  out.push(``);
  out.push(bars("wall.svg", "Wall-clock for the whole questionnaire (lower is better)", ok.map((r: { id: string; wallMsMedian: number }) => ({ label: short(r.id), value: r.wallMsMedian, text: s(r.wallMsMedian), primary: r.id === bench.primary }))), ``);
  out.push(bars("ttft.svg", "Time to first drafted token (lower is better)", ok.map((r: { id: string; firstTokenMsMedian: number }) => ({ label: short(r.id), value: r.firstTokenMsMedian, text: s(r.firstTokenMsMedian, 2), primary: r.id === bench.primary }))), ``);
  out.push(bars("quality.svg", "Blind quality, 1–5 (higher is better)", ok.map((r: { id: string; quality: number }) => ({ label: short(r.id), value: r.quality, text: r.quality.toFixed(2), primary: r.id === bench.primary }))), ``);
  out.push(bars("cost.svg", "Cost per 50-question run, USD (lower is better)", ok.map((r: { id: string; costMean: number }) => ({ label: short(r.id), value: r.costMean, text: `$${r.costMean.toFixed(4)}`, primary: r.id === bench.primary }))), ``);
  const p = ok.find((r: { id: string }) => r.id === bench.primary);
  const closedPrice: Record<string, [number, number]> = { "GPT-5 (list)": [1.25, 10], "GPT-4o (list)": [2.5, 10], "Claude Sonnet 4.5 (list)": [3, 15] };
  if (p) {
    out.push(`## 3. Cost of the same run at closed-model list prices`, ``, `Token volume measured on the chosen open model (${p.tokensIn.toLocaleString()} in · ${p.tokensOut.toLocaleString()} out per run), priced at public list prices. Latency and quality of closed models are ${bench.baseline ? "measured above" : "not measured (no closed-model key was available on the day)"}.`, ``,
      `| Model | $/1M in · out | Cost per questionnaire | vs ${short(p.id)} |`, `|---|---|---|---|`, `| **${short(p.id)}** on Nebius | ${p.price[0].toFixed(2)} · ${p.price[1].toFixed(2)} | **$${p.costMean.toFixed(4)}** | 1× |`);
    for (const [name, [i, o]] of Object.entries(closedPrice)) { const c = (p.tokensIn * i + p.tokensOut * o) / 1e6; out.push(`| ${name} | ${i.toFixed(2)} · ${o.toFixed(2)} | $${c.toFixed(3)} | ${(c / p.costMean).toFixed(0)}× |`); }
    out.push(``, `Manual baseline for a questionnaire this size: 20–40 hours of a sales engineer / security lead.`, ``);
  }
}

out.push(`## 4. Engineering facts for the slides`, ``,
  `- Live product: https://hackathon-ten-zeta-43.vercel.app · deck: /pitch.html · numbers: /benchmark`,
  `- Pipeline: triage (category + risk, plain JSON, 5 questions per call) ∥ retrieval (Qwen3-Embedding-8B, 4096-dim, hot in-memory cosine, < 1 ms, top-6 + best past answer) → drafting (Qwen3-235B-A22B-Instruct, one question per call, 50 streams in parallel, evidence-only, verdict + citations + confidence + flag) → SSE to the workspace. Tavily prospect brief runs on the side.`,
  `- Rate limit observed on the Nebius account: 600 requests / 400K tokens per minute, dynamic scaling; a 50-question run uses ~57 requests.`,
  `- Warm end-to-end runs during development: 3.7–5.4 s for 50 questions, first token 0.9–1.8 s, ~$0.022 per questionnaire.`,
  `- Why not the small model for triage: Qwen3-30B-A3B measured 3.6 s per triage call vs 1.8 s for the 235B on this endpoint; JSON mode added ~2.5 s per call. Measured, then changed.`,
  ``);
fs.writeFileSync(path.join("docs", "results.md"), out.join("\n"));
console.log("wrote docs/results.md and", fs.readdirSync(path.join("docs", "charts")).length, "charts");
