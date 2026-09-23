import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { PastAnswer, Policy, PolicySet, Question, Section } from "./types";
import { parseCsv, parseQuestionnaire, type Questionnaire } from "./csv";
export { parseCsv, parseQuestionnaire, type Questionnaire };

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


export function loadPastAnswers(): PastAnswer[] {
  const [head, ...body] = parseCsv(fs.readFileSync(path.join(DEMO, "previous_questionnaire_2025_filled.csv"), "utf8"));
  const h = head.map((x) => x.trim().toLowerCase());
  const col = (n: string) => h.indexOf(n);
  return body.map((r) => ({ ref: r[col("ref")]?.trim() ?? "", question: r[col("question")]?.trim() ?? "", answer: r[col("answer")]?.trim() ?? "", comment: r[col("comment")]?.trim() ?? "" })).filter((p) => p.ref);
}

/** CCM / CAIQ v4.1 domain codes → names. Gives the selector the domain context that the question ID carries (AIS-05.2 "Is testing automated?" is about application security, not DR testing). */
const CCM: Record<string, string> = { "A&A": "Audit & Assurance", AIS: "Application & Interface Security", BCR: "Business Continuity Management & Operational Resilience", CCC: "Change Control & Configuration Management", CEK: "Cryptography, Encryption & Key Management", DCS: "Datacenter Security", DSP: "Data Security & Privacy Lifecycle Management", GRC: "Governance, Risk & Compliance", HRS: "Human Resources", IAM: "Identity & Access Management", IPY: "Interoperability & Portability", IVS: "Infrastructure & Virtualization Security", "I&S": "Infrastructure & Virtualization Security", LOG: "Logging & Monitoring", SEF: "Security Incident Management, E-Discovery & Cloud Forensics", STA: "Supply Chain Management, Transparency & Accountability", TVM: "Threat & Vulnerability Management", UEM: "Universal Endpoint Management" };
export const domainOf = (id: string) => CCM[id.split("-")[0]] ?? "";
/** Question text with its CAIQ domain in front, used for retrieval and selection. */
export const contextual = (q: Question) => (domainOf(q.id) ? `${domainOf(q.id)}: ${q.text}` : q.text);


export function loadDemoQuestionnaire(): Questionnaire {
  return parseQuestionnaire(fs.readFileSync(path.join(DEMO, "questionnaire_2026_blank.csv"), "utf8"), "CAIQ v4.1 — Personivo 2026");
}
