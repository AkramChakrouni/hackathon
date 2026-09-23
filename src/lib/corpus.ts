import fs from "node:fs";
import path from "node:path";
import type { Chunk, Question } from "./types";

const DATA = path.join(process.cwd(), "data");

export function companyProfile() {
  return fs.readFileSync(path.join(DATA, "company.md"), "utf8");
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

/** Paragraph-aware chunking, ~900 chars, 1-paragraph overlap. */
function chunkText(body: string, max = 900) {
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
  const dir = path.join(DATA, "knowledge");
  const chunks: Chunk[] = [];
  let id = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const { meta, body } = frontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
    const title = meta.title ?? f.replace(/\.md$/, "");
    for (const text of chunkText(body)) {
      chunks.push({ id: id++, doc: f.replace(/\.md$/, ""), title, kind: meta.kind ?? "doc", owner: meta.owner ?? "", text: `${title}\n${text}` });
    }
  }
  return chunks;
}

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
  const iq = h.indexOf("question"), is = h.indexOf("section"), ii = h.indexOf("id");
  return body.map((r, n) => ({
    id: ii >= 0 && r[ii]?.trim() ? r[ii].trim() : `Q${String(n + 1).padStart(2, "0")}`,
    section: is >= 0 ? (r[is] ?? "").trim() : "",
    text: (iq >= 0 ? r[iq] : r[r.length - 1]).trim(),
  })).filter((x) => x.text);
}

export interface Questionnaire { slug: string; name: string; prospect: string; questions: Question[] }

const NAMES: Record<string, { name: string; prospect: string }> = {
  "adyen-vendor-security-assessment": { name: "Vendor Security Assessment 2026", prospect: "Adyen" },
  "rfp-eu-bank-data-platform": { name: "RFP — Data Platform", prospect: "ING" },
};

export function loadQuestionnaires(): Questionnaire[] {
  const dir = path.join(DATA, "questionnaires");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".csv")).sort().map((f) => {
    const slug = f.replace(/\.csv$/, "");
    const meta = NAMES[slug] ?? { name: slug, prospect: "" };
    return { slug, ...meta, questions: parseCsv(fs.readFileSync(path.join(dir, f), "utf8")) };
  });
}
