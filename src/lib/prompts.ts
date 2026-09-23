import type { PastAnswer, Section } from "./types";

export const CATEGORIES = ["legal", "security", "technical", "privacy", "continuity"] as const;

/** Step 1 — source selection by the small model. */
export function selectionPrompt(question: string, sections: Section[]) {
  return [
    {
      role: "system" as const,
      content: `You select the policy sections that answer one security-questionnaire question.
Rules:
- Pick sections that CONTAIN the answer, not sections that merely share words with the question. At most 4 section IDs.
- If more than one section states a value for the same fact the question asks about (for example a deletion or retention period after contract termination stated in two different policies), include ALL of them, so a conflict can be surfaced.
- coverage: "covered" if a section answers the question directly, "partial" if only part of it is answered, "none" if no section addresses the specific topic. Adjacent topics do not count (e.g. "data subject requests" does not cover "law enforcement requests"; "audits" do not cover "special interest groups").
- If coverage is "none", return an empty relevant_sections list.
- category: one of ${CATEGORIES.join(", ")}.
Return ONLY JSON: {"category":"...","relevant_sections":["InfoSec §5"],"coverage":"covered|partial|none"}`,
    },
    { role: "user" as const, content: JSON.stringify({ question, sections: sections.map((s) => ({ id: s.id, title: s.title, text: s.text })) }) },
  ];
}

/** Step 2 — answer writing by the large model. */
export function answerPrompt(question: string, sections: Section[], past: PastAnswer[]) {
  return [
    {
      role: "system" as const,
      content: `You write the answer to one security-questionnaire question on behalf of the vendor, using ONLY the policy sections provided.
Rules:
- answer: "Yes", "No" or "Unknown". If the sections do not answer the question, answer "Unknown" with an empty sources list. Never assume Yes. If a policy says something is not offered or not done, answer "No".
- comment: 2 factual sentences in first person plural ("We ..."), three only if needed. Every number, date or period in the comment must appear inside one of your quoted sources.
- sources: list of {"section_id": "...", "quote": "..."} where quote is copied VERBATIM (character for character) from that section's text, 1–2 sentences each. No paraphrasing, no ellipses.
- conflicts: if two sections give different values for the same fact, answer from the more specific section and list {"section_a","section_b","what_differs"} with both values. Otherwise [].
- A conflict between two sections about a value (e.g. 30 days in one policy, 90 days in another) NEVER makes the answer "No" or "Unknown": the process exists, so answer "Yes", state both values in the comment, and list the conflict.
- past_answer: the candidate answers from 2025 are matched by similarity and may be about a different question. Return {"ref": "...", "same_question": true|false, "consistent": true|false|null} for the single candidate that answers THIS question (same_question true), or {"ref": null, "same_question": false, "consistent": null} if none does. consistent = true if the 2025 answer states the same practice and values as the current policy (different wording or less detail is still consistent); false ONLY if a concrete value or practice differs (weekly became daily, annual became quarterly, No became Yes). The past answer is for wording only and may be outdated; the current policy always wins.
- Quote the sentence that contains every number, date or period you use in the comment. Do not mention a number you cannot quote. Use 1–3 sources, each quote one sentence (two at most).
- ssrm_ownership: "CSP-owned", "CSC-owned", "Shared" or "" if not applicable.
- confidence: "high", "medium" or "low".
Return ONLY JSON: {"answer":"Yes|No|Unknown","ssrm_ownership":"...","comment":"...","sources":[{"section_id":"...","quote":"..."}],"conflicts":[],"past_answer":{"ref":"VQ-07"|null,"same_question":true|false,"consistent":true|false|null},"confidence":"high|medium|low"}`,
    },
    {
      role: "user" as const,
      content:
        `QUESTION: ${question}\n\nPOLICY SECTIONS (current, authoritative):\n` +
        sections.map((s) => `[${s.id}] ${s.policyName} v${s.version} — ${s.title}\n${s.text}`).join("\n\n") +
        (past.length ? `\n\nCANDIDATE PAST ANSWERS (given in 2025 to a different bank's questionnaire; matched by similarity, may be about another question; use for wording only, may be outdated):\n` + past.map((p) => `[${p.ref}] Q: ${p.question}\nA (2025): ${p.answer}. ${p.comment}`).join("\n\n") : ""),
    },
  ];
}
