import type { Question } from "./types";

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). Browser-safe. */
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

export interface Questionnaire { name: string; header: string[]; rows: string[][]; questions: Question[] }

/** A questionnaire CSV: needs a `question` column; id from question_id / id / ref, else Q01… Keeps the original columns for the export. */
export function parseQuestionnaire(csv: string, name = "questionnaire"): Questionnaire {
  const [header = [], ...rows] = parseCsv(csv.replace(/^﻿/, ""));
  const h = header.map((x) => x.trim().toLowerCase());
  const iq = h.findIndex((x) => x === "question" || x === "question text" || x === "control question");
  const ii = ["question_id", "id", "ref", "control id", "question id"].map((k) => h.indexOf(k)).find((i) => i >= 0) ?? -1;
  const questions = rows.map((r, n) => ({ id: ii >= 0 && r[ii]?.trim() ? r[ii].trim() : `Q${String(n + 1).padStart(2, "0")}`, text: (iq >= 0 ? r[iq] : r[r.length - 1] ?? "").trim(), position: n })).filter((x) => x.text);
  return { name, header, rows, questions };
}
