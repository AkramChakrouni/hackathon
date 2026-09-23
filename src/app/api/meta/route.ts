import { loadDemoQuestionnaire, loadPastAnswers, loadPolicies } from "@/lib/corpus";
import { MODELS, PRICES } from "@/lib/nebius";

/** Demo set + engine description for the UI. */
export async function GET() {
  const cur = loadPolicies("current"), upd = loadPolicies("updated");
  const qn = loadDemoQuestionnaire();
  return Response.json({
    company: "Personivo B.V.",
    policies: cur.policies.map((p) => ({ ...p, sections: cur.sections.filter((s) => s.policy === p.short).length })),
    updated_policies: upd.policies.filter((p) => !cur.policies.some((c) => c.short === p.short && c.version === p.version)),
    past_answers: loadPastAnswers().length,
    questionnaire: { name: qn.name, header: qn.header, questions: qn.questions },
    models: { selection: MODELS.small, writing: MODELS.large, embedding: MODELS.embedding, provider: "Nebius Token Factory", prices: { [MODELS.small]: PRICES[MODELS.small], [MODELS.large]: PRICES[MODELS.large], [MODELS.embedding]: PRICES[MODELS.embedding] } },
  });
}
