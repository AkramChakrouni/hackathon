import fs from "node:fs";
import path from "node:path";
import type { Chunk, Citation } from "./types";

let index: Chunk[] | null = null;

/** Hot in-memory vector index built by `npm run index` (data/index.json). */
export function loadIndex(): Chunk[] {
  if (index) return index;
  const file = path.join(process.cwd(), "data", "index.json");
  index = JSON.parse(fs.readFileSync(file, "utf8")) as Chunk[];
  return index;
}

export function indexStats(company?: string) {
  const chunks = loadIndex().filter((c) => !company || c.company === company);
  return { chunks: chunks.length, docs: new Set(chunks.map((c) => c.doc)).size, dims: chunks[0]?.embedding?.length ?? 0 };
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/** Top-k by cosine, plus the single best past answer (kind = past_answer) when it is relevant, so the drafter always sees what the company said last time and can flag a changed practice. */
export function search(query: number[], k = 4, company?: string): Citation[] {
  const scored = loadIndex().filter((c) => !company || c.company === company).map((c) => ({ c, s: cosine(query, c.embedding!) }));
  scored.sort((x, y) => y.s - x.s);
  const top = scored.slice(0, k);
  const past = scored.find((x) => x.c.kind === "past_answer");
  if (past && past.s > 0.5 && !top.includes(past)) top[top.length - 1] = past;
  return top.map(({ c, s }) => ({ chunk: c.id, doc: c.doc, title: c.title, score: Number(s.toFixed(3)) }));
}

export function chunkById(id: number) {
  return loadIndex()[id];
}
