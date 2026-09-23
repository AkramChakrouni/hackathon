import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { nebiusEngine } from "@/lib/nebius";
import { loadDemoQuestionnaire, parseQuestionnaire } from "@/lib/corpus";
import type { Event, PolicySet } from "@/lib/types";

export const maxDuration = 120;

/** POST { policy_set?: "current"|"updated", csv?: string } → server-sent events (start, selected, answer, metrics, done). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { policy_set?: PolicySet; csv?: string };
  const policySet: PolicySet = body.policy_set === "updated" ? "updated" : "current";
  const qn = body.csv ? parseQuestionnaire(body.csv, "uploaded") : loadDemoQuestionnaire();
  if (!qn.questions.length) return new Response("no questions", { status: 400 });
  if (!process.env.NEBIUS_API_KEY) return new Response("NEBIUS_API_KEY missing", { status: 500 });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: Event) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { /* closed */ } };
      try { await runPipeline({ engine: nebiusEngine(), policySet, questions: qn.questions, signal: req.signal }, emit); }
      catch (err) { emit({ type: "error", message: err instanceof Error ? err.message : String(err) }); }
      finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
