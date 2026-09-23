/** Embeds data/knowledge/*.md with Nebius (BAAI/bge-en-icl) into data/index.json — the hot in-memory vector index. */
import fs from "node:fs";
import path from "node:path";
import { loadDocuments } from "../src/lib/corpus";
import { embed, MODELS } from "../src/lib/nebius";

async function main() {
  const chunks = loadDocuments();
  console.log(`chunks: ${chunks.length} from ${new Set(chunks.map((c) => c.doc)).size} docs → ${MODELS.embedding}`);
  const t0 = Date.now();
  for (let i = 0; i < chunks.length; i += 32) {
    const batch = chunks.slice(i, i + 32);
    const vecs = await embed(batch.map((c) => c.text));
    batch.forEach((c, j) => (c.embedding = vecs[j]));
    process.stdout.write(`\r${Math.min(i + 32, chunks.length)}/${chunks.length}`);
  }
  console.log(`\nembedded in ${Date.now() - t0}ms, dims=${chunks[0].embedding!.length}`);
  fs.writeFileSync(path.join("data", "index.json"), JSON.stringify(chunks));
}
main().catch((e) => { console.error(e); process.exit(1); });
