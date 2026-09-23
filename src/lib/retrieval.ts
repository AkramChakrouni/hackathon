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

export function indexStats() {
  const chunks = loadIndex();
  return { chunks: chunks.length, docs: new Set(chunks.map((c) => c.doc)).size, dims: chunks[0]?.embedding?.length ?? 0 };
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function search(query: number[], k = 4): Citation[] {
  const scored = loadIndex().map((c) => ({ c, s: cosine(query, c.embedding!) }));
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, k).map(({ c, s }) => ({ chunk: c.id, doc: c.doc, title: c.title, score: Number(s.toFixed(3)) }));
}

export function chunkById(id: number) {
  return loadIndex()[id];
}
