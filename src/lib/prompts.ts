import type { Question } from "./types";

export const CATEGORIES = ["company", "compliance", "security", "access", "infrastructure", "appsec", "incident", "privacy", "legal", "commercial", "ai"] as const;

export function classifyPrompt(questions: Question[]) {
  return [
    {
      role: "system" as const,
      content: `You triage vendor security questionnaire and RFP questions. For each question return category and risk.
category: one of ${CATEGORIES.join(", ")}.
risk: "high" ONLY if answering commits the company legally or financially or discloses sensitive history: incidents/breaches, liability, indemnification, warranties, penalties, audit rights, insurance, pricing/discount commitments, source code escrow, subprocessor-change obligations. Questions about how controls work (access, encryption, monitoring, SDLC, backups) are "low" or "medium", never "high". "medium" for certifications, subprocessors, data residency, retention.
Respond ONLY with JSON: {"items":[{"id":"...","category":"...","risk":"low|medium|high","reason":"<=5 words"}]}`,
    },
    { role: "user" as const, content: JSON.stringify({ questions: questions.map((q) => ({ id: q.id, text: q.text })) }) },
  ];
}

export interface EvidenceBlock { id: string; text: string; evidence: { n: number; title: string; text: string }[] }

export function synthesisPrompt(company: string, prospect: string, blocks: EvidenceBlock[]) {
  const system = `You draft answers to vendor security questionnaires and RFPs on behalf of the vendor described below, for the prospect "${prospect || "the customer"}".
Rules:
- Answer ONLY from the numbered evidence. Never invent certifications, controls, dates, numbers or commitments. If the evidence does not cover the question, write exactly what is documented (if anything) and state plainly that the remaining point is not documented in the knowledge base and needs an SME. Set FLAG: no_evidence in that case.
- Be specific: cite facts (tools, dates, SLAs, numbers) with inline markers like [1], [2] that refer to the evidence numbers.
- Tone: confident, precise, first person plural ("We ..."), 2–4 sentences, at most 90 words. No headings, no bullet lists, no preamble.
- Never claim a certification or control that the evidence says is not held. If the evidence says something is not offered, say so honestly.
- Questions about incidents, liability, indemnification, warranties, penalties, audit rights, insurance or pricing get FLAG: needs_approval (a human must approve before sending).

Output format, strictly, for every question in order:
[Q-ID]
ANSWER: <answer text with [n] citations>
CONFIDENCE: <0.00-1.00: 1.0 only if every claim is stated verbatim in the evidence; 0.6-0.8 if partly inferred; <=0.5 if mostly not documented>
SOURCES: [n, n]
FLAG: none | needs_approval | no_evidence

Vendor profile:
${company}`;

  const user = blocks
    .map((b) => `[${b.id}] QUESTION: ${b.text}\nEVIDENCE:\n${b.evidence.map((e) => `[${e.n}] (${e.title}) ${e.text}`).join("\n")}`)
    .join("\n\n=====\n\n");
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

export function briefPrompt(prospect: string, results: { title: string; content: string; url: string }[]) {
  return [
    {
      role: "system" as const,
      content: `You write a prospect brief of at most 3 short sentences (60 words) for a sales engineer answering a security questionnaire from "${prospect}". Use only the web results. Mention recent, concrete facts (announcements, regulation, scale) and what they imply for the security/compliance answers. No preamble.`,
    },
    { role: "user" as const, content: results.map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, 800)}\n${r.url}`).join("\n\n") },
  ];
}
