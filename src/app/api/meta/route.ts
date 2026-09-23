import { loadQuestionnaires } from "@/lib/corpus";
import { indexStats } from "@/lib/retrieval";
import { MODELS } from "@/lib/nebius";

/** Workspace bootstrap data for the frontend: questionnaires, knowledge-base stats, engine models. */
export async function GET() {
  let stats = { chunks: 0, docs: 0, dims: 0 };
  try { stats = indexStats(); } catch { /* index not built */ }
  return Response.json({
    company: "Kestrel Cloud B.V.",
    stats,
    models: MODELS,
    questionnaires: loadQuestionnaires().map((q) => ({ slug: q.slug, name: q.name, prospect: q.prospect, questions: q.questions })),
  });
}
