import { loadQuestionnaires } from "@/lib/corpus";
import { indexStats } from "@/lib/retrieval";
import { MODELS } from "@/lib/nebius";
import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";

export default function Home() {
  const questionnaires = loadQuestionnaires().map((q) => ({ slug: q.slug, name: q.name, prospect: q.prospect, questions: q.questions }));
  let stats = { chunks: 0, docs: 0, dims: 0 };
  try { stats = indexStats(); } catch { /* index not built yet */ }
  return <Workspace questionnaires={questionnaires} stats={stats} models={MODELS} />;
}
