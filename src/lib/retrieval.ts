import fs from "node:fs";
import path from "node:path";
import type { PastAnswer, Section } from "./types";

/**
 * Embedding shortlist. The corpus is small (30 sections, 30 past answers) so the small model could read all of it;
 * a cosine shortlist keeps every selection call at ~1.5K tokens instead of ~5.5K, which matters for
 * 50 parallel calls under a per-minute token limit. Built by `npm run index` into data/index.json.
 * If the index is missing, callers fall back to the whole corpus.
 */
export interface IndexItem { kind: "section" | "past"; key: string; hash: string; embedding: number[] }

let cache: IndexItem[] | null | undefined;
export function loadIndex(): IndexItem[] | null {
  if (cache !== undefined) return cache;
  try { cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "index.json"), "utf8")) as IndexItem[]; } catch { cache = null; }
  return cache;
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function shortlist(query: number[], sections: Section[], past: PastAnswer[], nSections = 10, nPast = 8): { sections: Section[]; past: PastAnswer[]; pastScores: Map<string, number>; complete: boolean; topScore: number } {
  const idx = loadIndex();
  if (!idx) return { sections, past, pastScores: new Map(), complete: false, topScore: 0 };
  const byHash = new Map(idx.filter((i) => i.kind === "section").map((i) => [i.hash, i.embedding]));
  const byRef = new Map(idx.filter((i) => i.kind === "past").map((i) => [i.key, i.embedding]));
  const sScored = sections.map((s) => ({ s, v: byHash.get(s.hash) })).filter((x) => x.v).map(({ s, v }) => ({ s, score: cosine(query, v!) })).sort((a, b) => b.score - a.score);
  const pScored = past.map((p) => ({ p, v: byRef.get(p.ref) })).filter((x) => x.v).map(({ p, v }) => ({ p, score: cosine(query, v!) })).sort((a, b) => b.score - a.score);
  const complete = sScored.length === sections.length && pScored.length === past.length;
  const pastScores = new Map(pScored.map((x) => [x.p.ref, x.score]));
  if (!complete) return { sections, past, pastScores, complete: false, topScore: 0 }; // an unembedded section (e.g. a fresh policy edit) → read everything
  return { sections: sScored.slice(0, nSections).map((x) => x.s).sort((a, b) => a.id.localeCompare(b.id)), past: pScored.slice(0, nPast).map((x) => x.p), pastScores, complete: true, topScore: sScored[0]?.score ?? 0 };
}
