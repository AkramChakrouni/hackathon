import { NextRequest } from "next/server";
import { loadPolicies } from "@/lib/corpus";

/** GET /api/policy?short=IR/BC → the policy's sections in the current set and, if it differs, the updated set. */
export async function GET(req: NextRequest) {
  const short = req.nextUrl.searchParams.get("short") ?? "";
  const cur = loadPolicies("current"), upd = loadPolicies("updated");
  const pc = cur.policies.find((p) => p.short === short), pu = upd.policies.find((p) => p.short === short);
  if (!pc) return new Response("unknown policy", { status: 404 });
  const sec = (set: typeof cur) => set.sections.filter((s) => s.policy === short).map(({ id, number, title, text, hash, version }) => ({ id, number, title, text, hash, version }));
  return Response.json({ policy: pc, sections: sec(cur), updated: pu && pu.version !== pc.version ? { policy: pu, sections: sec(upd) } : null });
}
