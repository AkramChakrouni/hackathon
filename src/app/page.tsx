import { listCompanies, loadQuestionnaires } from "@/lib/corpus";
import { indexStats } from "@/lib/retrieval";
import { MODELS } from "@/lib/nebius";
import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";

export default function Home() {
  const questionnaires = loadQuestionnaires().map((q) => ({ slug: q.slug, name: q.name, prospect: q.prospect, company: q.company, questions: q.questions }));
  const companies = listCompanies().map((c) => { let stats = { chunks: 0, docs: 0, dims: 0 }; try { stats = indexStats(c.slug); } catch { /* index not built yet */ } return { ...c, ...stats }; });
  return <Workspace questionnaires={questionnaires} companies={companies} models={MODELS} />;
}
