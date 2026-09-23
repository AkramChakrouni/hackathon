import OpenAI from "openai";
import type { Engine } from "./types";

export const NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1/";

export const MODELS = {
  classifier: process.env.NEBIUS_CLASSIFIER ?? "meta-llama/Meta-Llama-3.1-8B-Instruct-fast",
  synthesizer: process.env.NEBIUS_SYNTHESIZER ?? "meta-llama/Llama-3.3-70B-Instruct-fast",
  embedding: process.env.NEBIUS_EMBEDDING ?? "BAAI/bge-en-icl",
};

/** USD per 1M tokens [input, output]. Nebius list prices; closed models at public list prices. */
export const PRICES: Record<string, [number, number]> = {
  "meta-llama/Meta-Llama-3.1-8B-Instruct-fast": [0.03, 0.09],
  "meta-llama/Meta-Llama-3.1-8B-Instruct": [0.02, 0.06],
  "meta-llama/Llama-3.3-70B-Instruct-fast": [0.25, 0.75],
  "meta-llama/Llama-3.3-70B-Instruct": [0.13, 0.4],
  "Qwen/Qwen3-30B-A3B-Instruct-2507": [0.1, 0.3],
  "Qwen/Qwen3-235B-A22B-Instruct-2507": [0.2, 0.6],
  "openai/gpt-oss-120b": [0.15, 0.6],
  "BAAI/bge-en-icl": [0.01, 0],
  "openai/gpt-4o": [2.5, 10],
  "gpt-4o": [2.5, 10],
  "openai/gpt-4.1": [2, 8],
  "gpt-4.1": [2, 8],
  "anthropic/claude-sonnet-4.5": [3, 15],
  "claude-sonnet-4-5": [3, 15],
};

export const BASELINE_MODEL = process.env.BASELINE_MODEL ?? "openai/gpt-4o";

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
    synthBatch: Number(process.env.SYNTH_BATCH ?? 2),
  };
}

/** Closed-model baseline through an OpenAI-compatible endpoint (Vercel AI Gateway by default). */
export function baselineEngine(): Engine {
  return {
    name: "baseline",
    baseURL: process.env.BASELINE_BASE_URL ?? "https://ai-gateway.vercel.sh/v1",
    apiKey: process.env.BASELINE_API_KEY ?? process.env.AI_GATEWAY_API_KEY ?? "",
    classifier: BASELINE_MODEL,
    synthesizer: BASELINE_MODEL,
    synthBatch: Number(process.env.SYNTH_BATCH ?? 2),
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
