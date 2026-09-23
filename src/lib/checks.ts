import type { Answer, AnswerValue, Conflict, Flag, PastAnswer, Section, Source } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[“”"„]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

/**
 * Quote check: a quote must appear verbatim in the cited section (whitespace-normalised, case-insensitive).
 * If the model trimmed or altered a quote, accept it only when a long contiguous run (≥ 60 chars) matches, and
 * replace the quote with the exact source text so what the reviewer sees is always verbatim.
 */
export function verifyQuote(quote: string, section: Section): { ok: boolean; quote: string; repaired: boolean } {
  const text = norm(section.text), q = norm(quote).replace(/^[“"'…\s]+|[”"'…\s.]+$/g, "");
  if (!q) return { ok: false, quote, repaired: false };
  const i = text.indexOf(q);
  if (i >= 0) return { ok: true, quote: section.text.replace(/\s+/g, " ").trim().slice(i, i + q.length), repaired: false };
  // longest matching window of the quote inside the section
  const words = q.split(" ");
  for (let len = words.length - 1; len >= 8; len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const w = words.slice(start, start + len).join(" ");
      if (w.length < 60) break;
      const j = text.indexOf(w);
      if (j >= 0) return { ok: true, quote: section.text.replace(/\s+/g, " ").trim().slice(j, j + w.length), repaired: true };
    }
  }
  return { ok: false, quote, repaired: false };
}

/** Number check: every number in the comment must appear in at least one verified quote. */
export function unverifiedNumbers(comment: string, quotes: string[]): string[] {
  const nums = [...comment.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]);
  const hay = quotes.join(" ");
  return [...new Set(nums.filter((n) => !hay.includes(n)))];
}

export interface ModelAnswer { answer?: string; ssrm_ownership?: string; comment?: string; reasoning?: string; sources?: { section_id?: string; quote?: string }[]; conflicts?: Conflict[]; past_answer?: { ref?: string | null; same_question?: boolean; consistent?: boolean | null }; confidence?: string }

export const RED_COMMENT = "No source in the current policies covers this question. Needs a human answer.";

/** Steps 3 and 4: code-level checks and deterministic flags. */
export function finalize(raw: ModelAnswer | null, selected: Section[], candidates: PastAnswer[], coverage: Answer["coverage"]): Pick<Answer, "answer" | "ssrm_ownership" | "comment" | "reasoning" | "flag" | "flag_reason" | "sources" | "conflicts" | "past_answer" | "past_answer_consistent" | "confidence" | "checks"> {
  const byId = new Map(selected.map((s) => [s.id, s]));
  let answer: AnswerValue = raw?.answer === "Yes" || raw?.answer === "No" ? raw.answer : "Unknown";
  const sources: Source[] = [];
  let dropped = 0;
  for (const src of raw?.sources ?? []) {
    const sec = src.section_id ? byId.get(src.section_id) : undefined;
    if (!sec || !src.quote) { dropped++; continue; }
    const v = verifyQuote(src.quote, sec);
    if (!v.ok) { dropped++; continue; }
    if (sources.some((x) => x.section_id === sec.id && x.quote === v.quote)) continue; // duplicate quote
    sources.push({ section_id: sec.id, policy: sec.policyName, version: sec.version, quote: v.quote, text_hash: sec.hash, repaired: v.repaired || undefined });
  }
  const conflicts = (raw?.conflicts ?? []).filter((c) => c && byId.has(c.section_a) && byId.has(c.section_b) && c.section_a !== c.section_b);
  // The writer decides which candidate past answer (if any) is about this question; only then is consistency judged.
  const pa = raw?.past_answer;
  const past: PastAnswer | null = pa?.same_question && pa.ref ? candidates.find((c) => c.ref === pa.ref) ?? null : null;
  let consistent: boolean | null = past ? (typeof pa?.consistent === "boolean" ? pa.consistent : null) : null;
  // deterministic override: a past Yes/No that contradicts the current answer is inconsistent
  if (past && (past.answer === "Yes" || past.answer === "No") && (answer === "Yes" || answer === "No") && past.answer !== answer) consistent = false;
  const confidence = (["high", "medium", "low"].includes(raw?.confidence ?? "") ? raw!.confidence : "medium") as Answer["confidence"];
  const comment = (raw?.comment ?? "").trim();
  // A number in the comment must be backed by a verbatim quote. If the model forgot to quote the sentence but the number
  // is in a cited section, add that sentence as a source (auto-quoted); only numbers found nowhere stay unverified.
  for (const n of unverifiedNumbers(comment, sources.map((s) => s.quote))) {
    const cited = [...new Set(sources.map((s) => s.section_id))].map((id) => byId.get(id)!).filter(Boolean);
    const pool = cited.length ? cited : selected;
    let added = false;
    for (const sec of pool) {
      const sentence = sec.text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).find((t) => t.includes(n));
      if (sentence) { if (!sources.some((x) => x.quote === sentence)) sources.push({ section_id: sec.id, policy: sec.policyName, version: sec.version, quote: sentence, text_hash: sec.hash, repaired: true }); added = true; break; }
    }
    if (!added) { /* stays unverified */ }
  }
  const numbers = unverifiedNumbers(comment, sources.map((s) => s.quote));

  // Yes/No without a verified source is not allowed.
  if ((answer === "Yes" || answer === "No") && sources.length === 0) answer = "Unknown";

  let flag: Flag, flag_reason: string;
  if (answer === "Unknown" || sources.length === 0 || coverage === "none") {
    flag = "red"; flag_reason = coverage === "none" ? "No policy section covers this topic" : raw && (raw.sources?.length ?? 0) > 0 && sources.length === 0 ? "No verifiable source (quotes not found in the cited sections)" : "The selected sections do not answer this question";
    return { answer: "Unknown", ssrm_ownership: "", comment: RED_COMMENT, reasoning: coverage === "none" ? "None of the policy sections address this topic, so no answer is generated." : "The selected sections were read but do not answer the question, so no answer is generated.", flag, flag_reason, sources: [], conflicts: [], past_answer: past, past_answer_consistent: consistent, confidence: "low", checks: { quotes_valid: sources.length, quotes_dropped: dropped, numbers_unverified: [] } };
  }
  const reasons: string[] = [];
  if (conflicts.length) reasons.push(`Policies disagree: ${conflicts.map((c) => `${c.section_a} vs ${c.section_b}`).join(", ")}`);
  if (consistent === false) reasons.push(`Practice changed since the 2025 answer${past ? ` (${past.ref})` : ""}`);
  if (numbers.length) reasons.push(`Unverified number${numbers.length > 1 ? "s" : ""} in comment: ${numbers.join(", ")}`);
  if (reasons.length) { flag = "orange"; flag_reason = reasons.join(" · "); } else { flag = "green"; flag_reason = "Answered from the current policy with verified quotes"; }
  return { answer, ssrm_ownership: (raw?.ssrm_ownership ?? "").trim(), comment, reasoning: (raw?.reasoning ?? "").trim(), flag, flag_reason, sources, conflicts, past_answer: past, past_answer_consistent: consistent, confidence, checks: { quotes_valid: sources.length, quotes_dropped: dropped, numbers_unverified: numbers } };
}
