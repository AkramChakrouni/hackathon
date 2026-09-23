/**
 * Ground-truth evaluation. For every questionnaire that has data/answer-keys/<slug>.csv, runs the pipeline
 * (the key is never shown to the pipeline) and scores each answer against the key:
 *   verdict  — Yes / No / Unknown matches
 *   flag     — green→none · orange→needs_approval · red→no_evidence
 *   facts    — key facts present and nothing invented (LLM judge that sees the key)
 * Writes data/eval.json (rendered by /benchmark). EVAL_MODELS=a,b evaluates several drafters.
 */
import fs from "node:fs";
import path from "node:path";
import { runPipeline } from "../src/lib/pipeline";
import { nebiusEngine, baselineEngine, client } from "../src/lib/nebius";
import { companyProfile, loadQuestionnaires, parseCsv } from "../src/lib/corpus";
import type { Answer, Flag } from "../src/lib/types";

const JUDGE = process.env.JUDGE_MODEL ?? "deepseek-ai/DeepSeek-V4-Pro-0813";
const MODELS = (process.env.EVAL_MODELS ?? nebiusEngine().synthesizer).split(",").map((s) => s.trim());
const FLAG: Record<string, Flag> = { green: "none", orange: "needs_approval", red: "no_evidence" };

interface KeyRow { question_id: string; correct_answer: string; key_facts_expected: string; expected_flag: string; trap: string }

function readKey(file: string): KeyRow[] {
  const raw = fs.readFileSync(file, "utf8");
  // reuse the csv parser by mapping header names
  const rows = parseCsvRaw(raw);
  const h = rows[0].map((x) => x.trim());
  return rows.slice(1).filter((r) => r.length > 3).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])) as unknown as KeyRow);
}
function parseCsvRaw(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < csv.length; i++) { const c = csv[i];
    if (q) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && csv[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

async function judgeFacts(question: string, answer: Answer, key: KeyRow) {
  const oa = client(nebiusEngine());
  const res = await oa.chat.completions.create({
    model: JUDGE, temperature: 0, max_tokens: 3000,
    messages: [
      { role: "system", content: `Today is 23 September 2026. You grade a vendor's questionnaire answer against an answer key. Return JSON only: {"facts_correct": bool, "invented": bool, "note": "<=15 words"}. facts_correct = the answer states the key facts (or, when the key says the topic is not documented, the answer honestly says it is not documented / needs a human). invented = the answer contains a number, date, standard, tool or commitment that contradicts the key. Mentioning that an earlier 2025 answer differed, or that two policies conflict, is correct and not invented. Extra correct detail is fine.` },
      { role: "user", content: `QUESTION: ${question}\nKEY ANSWER: ${key.correct_answer}\nKEY FACTS: ${key.key_facts_expected}\n\nCANDIDATE ANSWER (verdict=${answer.verdict}, flag=${answer.flag}):\n${answer.text}` },
    ],
  });
  try { return JSON.parse((res.choices[0].message.content ?? "{}").replace(/^[\s\S]*?(\{)/, "$1").replace(/\}[^}]*$/, "}")) as { facts_correct: boolean; invented: boolean; note: string }; }
  catch { return { facts_correct: false, invented: false, note: "judge parse error" }; }
}

async function main() {
  const out: Record<string, unknown>[] = [];
  for (const q of loadQuestionnaires()) {
    const keyFile = path.join("data", "answer-keys", `${q.slug}.csv`);
    if (!fs.existsSync(keyFile)) continue;
    const key = readKey(keyFile);
    for (const model of MODELS) {
      const engine = model.startsWith("closed:") ? baselineEngine(model.slice(7)) : { ...nebiusEngine(), synthesizer: model };
      const t0 = Date.now();
      const r = await runPipeline({ engine, companySlug: q.company, company: companyProfile(q.company), prospect: q.prospect, questions: q.questions, brief: false }, () => {});
      const wallMs = Date.now() - t0;
      console.log(`${q.slug} · ${model}: ${q.questions.length} answers in ${wallMs}ms, $${r.metrics.cost.toFixed(4)} — scoring…`);
      const rows: { id: string; trap: string; expected: string; verdict: string; expectedFlag: string; flag: string; verdictOk: boolean; flagOk: boolean; factsOk: boolean; invented: boolean; note: string; answer: string }[] = [];
      const tasks = q.questions.map((qq, i) => async () => {
        const a = r.answers[i]; const k = key.find((x) => x.question_id === qq.id);
        if (!k) return;
        const exp = k.correct_answer.toLowerCase();
        const v = a.verdict === "unknown" || a.flag === "no_evidence" ? "unknown" : a.verdict;
        const verdictOk = exp === "unknown" ? v === "unknown" : exp === "no" ? v === "no" : (v === "yes" || v === "partial");
        const expectedFlag = FLAG[k.expected_flag.toLowerCase()] ?? "none";
        const flagOk = a.flag === expectedFlag;
        const j = await judgeFacts(qq.text, a, k);
        rows.push({ id: qq.id, trap: k.trap, expected: k.correct_answer, verdict: a.verdict, expectedFlag, flag: a.flag, verdictOk, flagOk, factsOk: !!j.facts_correct, invented: !!j.invented, note: j.note ?? "", answer: a.text });
      });
      const queue = [...tasks];
      await Promise.all(Array.from({ length: 10 }, async () => { for (;;) { const f = queue.shift(); if (!f) return; await f(); } }));
      rows.sort((x, y) => x.id.localeCompare(y.id));
      const n = rows.length;
      const pct = (f: (x: typeof rows[number]) => boolean) => Math.round((rows.filter(f).length / n) * 1000) / 10;
      const traps = rows.filter((x) => x.trap);
      const summary = { questionnaire: q.slug, name: q.name, company: q.company, model, questions: n, wallMs, cost: r.metrics.cost, verdictAcc: pct((x) => x.verdictOk), flagAcc: pct((x) => x.flagOk), factsAcc: pct((x) => x.factsOk), invented: rows.filter((x) => x.invented).length, allThree: pct((x) => x.verdictOk && x.flagOk && x.factsOk), traps: traps.map((t) => ({ id: t.id, trap: t.trap, ok: t.verdictOk && t.flagOk && t.factsOk, verdictOk: t.verdictOk, flagOk: t.flagOk, factsOk: t.factsOk })), rows };
      console.log(`  verdict ${summary.verdictAcc}% · flag ${summary.flagAcc}% · facts ${summary.factsAcc}% · all three ${summary.allThree}% · invented ${summary.invented} · traps ${traps.filter((t) => t.verdictOk && t.flagOk && t.factsOk).length}/${traps.length}`);
      for (const t of traps) console.log(`    ${t.id.padEnd(9)} ${t.verdictOk ? "V" : "v"}${t.flagOk ? "F" : "f"}${t.factsOk ? "K" : "k"}  exp=${t.expected}/${t.expectedFlag}  got=${t.verdict}/${t.flag}  ${t.trap.slice(0, 50)}`);
      out.push(summary);
    }
  }
  fs.writeFileSync(path.join("data", "eval.json"), JSON.stringify({ generatedAt: new Date().toISOString(), judge: JUDGE, results: out }, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
