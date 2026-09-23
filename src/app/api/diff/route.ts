import { diffRuns } from "@/lib/diff";
import type { Answer } from "@/lib/types";

/** POST { previous: Answer[], current: Answer[] } → per-question change list. */
export async function POST(req: Request) {
  const { previous, current } = (await req.json()) as { previous: Answer[]; current: Answer[] };
  return Response.json(diffRuns(previous ?? [], current ?? []));
}
