import fs from "node:fs";
import path from "node:path";
import type { Chunk, Question } from "./types";

const DATA = path.join(process.cwd(), "data");

export interface Company { slug: string; name: string }

export function listCompanies(): Company[] {
  const dir = path.join(DATA, "companies");
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "company.md"))).sort().map((slug) => {
    const first = fs.readFileSync(path.join(dir, slug, "company.md"), "utf8").split("\n").find((l) => l.startsWith("# ")) ?? slug;
    return { slug, name: first.replace(/^#\s*/, "").split(/\s[—–-]\s/)[0].trim() };
  });
}

export function companyProfile(company: string) {
  return fs.readFileSync(path.join(DATA, "companies", company, "company.md"), "utf8");
}

function frontmatter(src: string) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta: Record<string, string> = {};
  if (m) for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return { meta, body: m ? src.slice(m[0].length) : src };
}

/** Paragraph-aware chunking, ~900 chars, 1-paragraph overlap. Past-answer documents (**Q … **A) are split one Q/A pair per chunk so retrieval is exact. */
function chunkText(body: string, max = 900) {
  if (/^\*\*\S*Q\b/m.test(body)) {
    return body.split(/\n(?=\*\*\S*Q\b)/).slice(1).map((qa) => qa.trim()).filter(Boolean);
  }
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  let prev = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > max && cur) {
      out.push(cur);
      cur = prev.length < 300 ? prev + "\n\n" + p : p;
    } else cur = cur ? cur + "\n\n" + p : p;
    prev = p;
  }
  if (cur) out.push(cur);
  return out;
}

export function loadDocuments(): Chunk[] {
  const chunks: Chunk[] = [];
  let id = 0;
  for (const { slug } of listCompanies()) {
    const dir = path.join(DATA, "companies", slug, "knowledge");
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
      const { meta, body } = frontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
      const title = meta.title ?? f.replace(/\.md$/, "");
      const label = meta.updated ? `${title} (updated ${meta.updated})` : title;
      for (const text of chunkText(body)) {
        chunks.push({ id: id++, company: slug, doc: f.replace(/\.md$/, ""), title, kind: meta.kind ?? "doc", owner: meta.owner ?? "", text: `${label}\n${text}` });
      }
    }
  }
  return chunks;
}

/** CAIQ v4.1 / CCM domain codes → section names, so a bare CAIQ export gets readable sections. */
const CCM: Record<string, string> = { "A&A": "Audit & Assurance", AIS: "Application & Interface Security", BCR: "Business Continuity & Resilience", CCC: "Change Control", CEK: "Cryptography & Key Management", DCS: "Datacenter Security", DSP: "Data Security & Privacy", GRC: "Governance, Risk & Compliance", HRS: "Human Resources", IAM: "Identity & Access Management", IPY: "Interoperability & Portability", IVS: "Infrastructure & Virtualization", LOG: "Logging & Monitoring", SEF: "Security Incident Management", STA: "Supply Chain & Transparency", TVM: "Threat & Vulnerability Management", UEM: "Universal Endpoint Management" };

export function parseCsv(csv: string): Question[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) {
      if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && csv[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  const h = head.map((x) => x.trim().toLowerCase());
  const iq = h.indexOf("question"), is = h.indexOf("section");
  const ii = ["id", "question_id", "ref", "control id", "question id"].map((k) => h.indexOf(k)).find((i) => i >= 0) ?? -1;
  return body.map((r, n) => {
    const id = ii >= 0 && r[ii]?.trim() ? r[ii].trim() : `Q${String(n + 1).padStart(2, "0")}`;
    const section = is >= 0 ? (r[is] ?? "").trim() : (CCM[id.split("-")[0]] ?? "");
    return { id, section, text: (iq >= 0 ? r[iq] : r[r.length - 1]).trim() };
  }).filter((x) => x.text);
}

export interface Questionnaire { slug: string; name: string; prospect: string; company: string; questions: Question[] }

const NAMES: Record<string, { name: string; prospect: string; company: string }> = {
  "personivo-caiq-v4.1": { name: "CAIQ v4.1 — CSA STAR self-assessment", prospect: "ABN AMRO", company: "personivo" },
  "adyen-vendor-security-assessment": { name: "Vendor Security Assessment 2026", prospect: "Adyen", company: "kestrel" },
  "rfp-eu-bank-data-platform": { name: "RFP — Data Platform", prospect: "ING", company: "kestrel" },
};

export function loadQuestionnaires(): Questionnaire[] {
  const dir = path.join(DATA, "questionnaires");
  const order = Object.keys(NAMES);
  const rank = (f: string) => { const i = order.indexOf(f.replace(/\.csv$/, "")); return i < 0 ? 99 : i; };
  return fs.readdirSync(dir).filter((f) => f.endsWith(".csv")).sort((a, b) => rank(a) - rank(b)).map((f) => {
    const slug = f.replace(/\.csv$/, "");
    const meta = NAMES[slug] ?? { name: slug, prospect: "", company: listCompanies()[0]?.slug ?? "" };
    return { slug, ...meta, questions: parseCsv(fs.readFileSync(path.join(dir, f), "utf8")) };
  });
}
