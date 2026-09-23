import OpenAI from "openai";
import type { Engine } from "./types";

export const NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1/";

export const MODELS = {
  classifier: process.env.NEBIUS_CLASSIFIER ?? "Qwen/Qwen3-235B-A22B-Instruct-2507" /* measured: the 3B-active endpoint answered slower (3.6s vs 1.8s), see /benchmark */,
  synthesizer: process.env.NEBIUS_SYNTHESIZER ?? "Qwen/Qwen3-235B-A22B-Instruct-2507",
  embedding: process.env.NEBIUS_EMBEDDING ?? "Qwen/Qwen3-Embedding-8B",
};

/** USD per 1M tokens [input, output]. Nebius list prices; closed models at public list prices. */
export const PRICES: Record<string, [number, number]> = {
  // Nebius Token Factory list prices (from /v1/models?verbose=true, 23 Sep 2026)
  "Qwen/Qwen3-235B-A22B-Instruct-2507": [0.2, 0.6],
  "Qwen/Qwen3-30B-A3B-Instruct-2507": [0.1, 0.3],
  "Qwen/Qwen3-Embedding-8B": [0.01, 0],
  "openai/gpt-oss-120b": [0.15, 0.6],
  "deepseek-ai/DeepSeek-V4-Flash-0731": [0.14, 0.28],
  "google/gemma-3-27b-it": [0.1, 0.3],
  "zai-org/GLM-5.3-Flash": [0.15, 0.5],
  // closed models, public list prices (refreshed live by the benchmark)
  "openai/gpt-4o": [2.5, 10],
  "openai/gpt-4.1": [2, 8],
  "openai/gpt-5": [1.25, 10],
  "anthropic/claude-sonnet-4.5": [3, 15],
};

/** Prices and the closed baseline id are refreshed by `npm run benchmark` (data/pricing.json) from the providers' live model lists. */
function dynamic(): { prices: Record<string, [number, number]>; baseline?: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    return JSON.parse(fs.readFileSync(`${process.cwd()}/data/pricing.json`, "utf8"));
  } catch { return { prices: {} }; }
}
const DYN = dynamic();
Object.assign(PRICES, DYN.prices);

export const BASELINE_MODEL = process.env.BASELINE_MODEL ?? DYN.baseline ?? "openai/gpt-4o";

export function price(model: string, input: number, output: number) {
  const p = PRICES[model] ?? [0, 0];
  return (input * p[0] + output * p[1]) / 1e6;
}

export function nebiusEngine(): Engine {
  return {
    name: "nebius",
    baseURL: NEBIUS_URL,
    apiKey: process.env.NEBIUS_API_KEY ?? "",
    classifier: MODELS.classifier,
    synthesizer: MODELS.synthesizer,
    synthBatch: Number(process.env.SYNTH_BATCH ?? 1),
  };
}

/** Closed-model baseline through an OpenAI-compatible endpoint (Vercel AI Gateway by default). */
export function baselineEngine(model = BASELINE_MODEL): Engine {
  return {
    name: "baseline",
    baseURL: process.env.BASELINE_BASE_URL ?? "https://ai-gateway.vercel.sh/v1",
    apiKey: process.env.BASELINE_API_KEY ?? process.env.AI_GATEWAY_API_KEY ?? "",
    classifier: model,
    synthesizer: model,
    synthBatch: Number(process.env.SYNTH_BATCH ?? 1),
  };
}

const clients = new Map<string, OpenAI>();
export function client(e: Pick<Engine, "baseURL" | "apiKey">) {
  const key = e.baseURL + e.apiKey.slice(-6);
  let c = clients.get(key);
  if (!c) {
    c = new OpenAI({ baseURL: e.baseURL, apiKey: e.apiKey, maxRetries: 2, timeout: 60_000 });
    clients.set(key, c);
  }
  return c;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await client(nebiusEngine()).embeddings.create({
    model: MODELS.embedding,
    input: texts,
    encoding_format: "float",
  });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
