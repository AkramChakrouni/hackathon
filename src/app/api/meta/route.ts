import { listCompanies, loadQuestionnaires } from "@/lib/corpus";
import { indexStats } from "@/lib/retrieval";
import { MODELS } from "@/lib/nebius";

/** Workspace bootstrap data for the frontend: questionnaires, knowledge-base stats, engine models. */
export async function GET() {
  const companies = listCompanies().map((c) => { let stats = { chunks: 0, docs: 0, dims: 0 }; try { stats = indexStats(c.slug); } catch { /* index not built */ } return { ...c, ...stats }; });
  return Response.json({
    companies,
    models: MODELS,
    questionnaires: loadQuestionnaires().map((q) => ({ slug: q.slug, name: q.name, prospect: q.prospect, company: q.company, questions: q.questions })),
  });
}
