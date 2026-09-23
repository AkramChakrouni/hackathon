import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { nebiusEngine } from "@/lib/nebius";
import { companyProfile, loadQuestionnaires, parseCsv } from "@/lib/corpus";
import type { Event, Question } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { slug?: string; csv?: string; prospect?: string; questions?: Question[] };
  let questions = body.questions ?? [];
  let prospect = body.prospect ?? "";
  if (body.slug) {
    const q = loadQuestionnaires().find((x) => x.slug === body.slug);
    if (!q) return new Response("unknown questionnaire", { status: 404 });
    questions = q.questions; prospect ||= q.prospect;
  } else if (body.csv) questions = parseCsv(body.csv);
  if (!questions.length) return new Response("no questions", { status: 400 });
  if (!process.env.NEBIUS_API_KEY) return new Response("NEBIUS_API_KEY missing", { status: 500 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: Event) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { /* closed */ } };
      try {
        const r = await runPipeline({ engine: nebiusEngine(), company: companyProfile(), prospect, questions, brief: true, signal: req.signal }, emit);
        emit({ type: "done", runId: crypto.randomUUID(), metrics: r.metrics });
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
