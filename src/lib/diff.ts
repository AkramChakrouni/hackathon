import type { Answer } from "./types";

export interface Change { question_id: string; changed: boolean; reasons: string[]; previous?: Pick<Answer, "answer" | "comment" | "flag" | "sources"> }

/** Diff between two runs of the same questionnaire: changed if the answer, the flag, or the text of any cited section changed. */
export function diffRuns(previous: Answer[], current: Answer[]): Change[] {
  const prev = new Map(previous.map((a) => [a.question_id, a]));
  return current.map((a) => {
    const p = prev.get(a.question_id);
    if (!p) return { question_id: a.question_id, changed: false, reasons: [] };
    const reasons: string[] = [];
    if (p.answer !== a.answer) reasons.push(`answer ${p.answer} → ${a.answer}`);
    if (p.flag !== a.flag) reasons.push(`flag ${p.flag} → ${a.flag}`);
    const ph = new Map(p.sources.map((s) => [s.section_id, s.text_hash]));
    for (const s of a.sources) { const h = ph.get(s.section_id); if (h && h !== s.text_hash) reasons.push(`${s.section_id} text changed (v${p.sources.find((x) => x.section_id === s.section_id)?.version} → v${s.version})`); }
    return { question_id: a.question_id, changed: reasons.length > 0, reasons, previous: { answer: p.answer, comment: p.comment, flag: p.flag, sources: p.sources } };
  });
}
