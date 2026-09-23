/** Embeds every policy section (current and updated sets) and every past answer with Nebius → data/index.json. */
import fs from "node:fs";
import path from "node:path";
import { loadPolicies, loadPastAnswers } from "../src/lib/corpus";
import { embed, MODELS } from "../src/lib/nebius";
import type { IndexItem } from "../src/lib/retrieval";

async function main() {
  const sections = new Map<string, { key: string; text: string }>();
  for (const set of ["current", "updated"] as const) for (const s of loadPolicies(set).sections) sections.set(s.hash, { key: s.id, text: `${s.policyName} — ${s.title}\n${s.text}` });
  const past = loadPastAnswers();
  const items: IndexItem[] = [];
  const texts = [...[...sections.entries()].map(([, v]) => v.text), ...past.map((p) => `${p.question}\n${p.answer}. ${p.comment}`)];
  console.log(`${sections.size} sections + ${past.length} past answers → ${MODELS.embedding}`);
  const vecs: number[][] = [];
  for (let i = 0; i < texts.length; i += 32) vecs.push(...(await embed(texts.slice(i, i + 32))));
  let i = 0;
  for (const [h, v] of sections) items.push({ kind: "section", key: v.key, hash: h, embedding: vecs[i++].map((x) => Number(x.toFixed(5))) });
  for (const p of past) items.push({ kind: "past", key: p.ref, hash: "", embedding: vecs[i++].map((x) => Number(x.toFixed(5))) });
  fs.writeFileSync(path.join("data", "index.json"), JSON.stringify(items));
  console.log(`wrote data/index.json (${items.length} items, ${vecs[0].length} dims)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
