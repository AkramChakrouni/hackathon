import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { PastAnswer, Policy, PolicySet, Question, Section } from "./types";

const DEMO = path.join(process.cwd(), "data", "demo");

/** Short policy names used in section IDs (InfoSec §5) — the same IDs the answer key uses. */
const POLICY_NAMES: Record<string, { short: string; name: string }> = {
  "01_information_security_policy": { short: "InfoSec", name: "Information Security Policy" },
  "02_data_protection_policy": { short: "DataProt", name: "Data Protection Policy" },
  "03_incident_response_business_continuity_policy": { short: "IR/BC", name: "Incident Response and Business Continuity Policy" },
};

export const hash = (s: string) => createHash("sha1").update(s.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);

export function parsePolicy(file: string, src: string): { policy: Policy; sections: Section[] } {
  const base = path.basename(file, ".md").replace(/_v[\d.]+$/, "");
  const meta = POLICY_NAMES[base] ?? { short: base, name: base };
  const version = src.match(/^Version:\s*(.+)$/m)?.[1].trim() ?? "";
  const effective = src.match(/^Effective:\s*(.+)$/m)?.[1].trim() ?? "";
  const policy: Policy = { id: base, short: meta.short, name: meta.name, version, effective, file: path.basename(file) };
  const sections: Section[] = [];
  const re = /^## (\d+)\.\s*(.+)$/gm;
  const heads = [...src.matchAll(re)];
  heads.forEach((h, i) => {
    const start = h.index! + h[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index! : src.length;
    const text = src.slice(start, end).trim();
    sections.push({ id: `${meta.short} §${h[1]}`, policy: meta.short, policyName: meta.name, version, number: Number(h[1]), title: h[2].trim(), text, hash: hash(text) });
  });
  return { policy, sections };
}

/** The three demo policies; "updated" swaps in the prepared IR/BC v2.4 (the diff demo). */
export function loadPolicies(set: PolicySet = "current"): { policies: Policy[]; sections: Section[] } {
  const dir = path.join(DEMO, "policies");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => path.join(dir, f));
  const policies: Policy[] = [], sections: Section[] = [];
  for (const f of files) {
    let file = f;
    if (set === "updated") {
      const upd = path.join(DEMO, "policy_updates");
      const alt = fs.existsSync(upd) ? fs.readdirSync(upd).find((u) => u.startsWith(path.basename(f, ".md"))) : undefined;
      if (alt) file = path.join(upd, alt);
    }
    const r = parsePolicy(file, fs.readFileSync(file, "utf8"));
    policies.push(r.policy); sections.push(...r.sections);
  }
  return { policies, sections };
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && csv[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function loadPastAnswers(): PastAnswer[] {
  const [head, ...body] = parseCsv(fs.readFileSync(path.join(DEMO, "previous_questionnaire_2025_filled.csv"), "utf8"));
  const h = head.map((x) => x.trim().toLowerCase());
  const col = (n: string) => h.indexOf(n);
  return body.map((r) => ({ ref: r[col("ref")]?.trim() ?? "", question: r[col("question")]?.trim() ?? "", answer: r[col("answer")]?.trim() ?? "", comment: r[col("comment")]?.trim() ?? "" })).filter((p) => p.ref);
}

export interface Questionnaire { name: string; header: string[]; rows: string[][]; questions: Question[] }

/** A questionnaire CSV. Keeps the original columns so the export can fill answer/comment in place. */
export function parseQuestionnaire(csv: string, name = "questionnaire"): Questionnaire {
  const [header, ...rows] = parseCsv(csv);
  const h = header.map((x) => x.trim().toLowerCase());
  const iq = h.indexOf("question");
  const ii = ["question_id", "id", "ref", "control id"].map((k) => h.indexOf(k)).find((i) => i >= 0) ?? -1;
  const questions = rows.map((r, n) => ({ id: ii >= 0 && r[ii]?.trim() ? r[ii].trim() : `Q${String(n + 1).padStart(2, "0")}`, text: (iq >= 0 ? r[iq] : r[r.length - 1] ?? "").trim(), position: n })).filter((x) => x.text);
  return { name, header, rows, questions };
}

export function loadDemoQuestionnaire(): Questionnaire {
  return parseQuestionnaire(fs.readFileSync(path.join(DEMO, "questionnaire_2026_blank.csv"), "utf8"), "CAIQ v4.1 — Personivo 2026");
}
