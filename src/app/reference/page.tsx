import { loadDemoQuestionnaire, loadPastAnswers, loadPolicies } from "@/lib/corpus";
import { MODELS } from "@/lib/nebius";
import { Workspace, type Meta } from "@/components/workspace";

export const dynamic = "force-dynamic";

export default function Home() {
  const cur = loadPolicies("current"), upd = loadPolicies("updated");
  const qn = loadDemoQuestionnaire();
  const meta: Meta = {
    company: "Personivo B.V.",
    policies: cur.policies.map((p) => ({ short: p.short, name: p.name, version: p.version, effective: p.effective, sections: cur.sections.filter((s) => s.policy === p.short).length })),
    updated_policies: upd.policies.filter((p) => !cur.policies.some((c) => c.short === p.short && c.version === p.version)).map((p) => ({ short: p.short, name: p.name, version: p.version, effective: p.effective })),
    past_answers: loadPastAnswers().length,
    questionnaire: { name: qn.name, header: qn.header, questions: qn.questions },
    models: { selection: MODELS.small, writing: MODELS.large, embedding: MODELS.embedding, provider: "Nebius Token Factory" },
  };
  return <Workspace meta={meta} />;
}
