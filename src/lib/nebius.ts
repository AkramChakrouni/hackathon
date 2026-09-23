import OpenAI from "openai";
import type { Engine } from "./types";

export const NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1/";

/** Exact Token Factory model ids (see MODELS.md for prices and the reasons). */
export const MODELS = {
  small: process.env.NEBIUS_SMALL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507",
  large: process.env.NEBIUS_LARGE ?? "Qwen/Qwen3-235B-A22B-Instruct-2507",
  embedding: process.env.NEBIUS_EMBEDDING ?? "Qwen/Qwen3-Embedding-8B",
};

/** USD per 1M tokens [input, output]. Nebius: /v1/models?verbose=true on 23 Sep 2026. Closed: public list prices. */
export const PRICES: Record<string, [number, number]> = {
  "Qwen/Qwen3-235B-A22B-Instruct-2507": [0.2, 0.6],
  "Qwen/Qwen3-30B-A3B-Instruct-2507": [0.1, 0.3],
  "Qwen/Qwen3-Embedding-8B": [0.01, 0],
  "openai/gpt-oss-120b": [0.15, 0.6],
  "deepseek-ai/DeepSeek-V4-Flash-0731": [0.14, 0.28],
  "google/gemma-3-27b-it": [0.1, 0.3],
  "openai/gpt-5": [1.25, 10],
  "openai/gpt-4o": [2.5, 10],
  "anthropic/claude-sonnet-4.5": [3, 15],
};

function dynamic(): { prices: Record<string, [number, number]>; baseline?: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    return JSON.parse(fs.readFileSync(`${process.cwd()}/data/pricing.json`, "utf8"));
  } catch { return { prices: {} }; }
}
const DYN = dynamic();
Object.assign(PRICES, DYN.prices);

export const BASELINE_MODEL = process.env.BASELINE_MODEL ?? DYN.baseline ?? "openai/gpt-5";

export function price(model: string, input: number, output: number) {
  const p = PRICES[model] ?? [0, 0];
  return (input * p[0] + output * p[1]) / 1e6;
}

export function nebiusEngine(): Engine {
  return { name: "nebius", baseURL: NEBIUS_URL, apiKey: process.env.NEBIUS_API_KEY ?? "", small: MODELS.small, large: MODELS.large };
}

/** Closed-model baseline (both tiers) through an OpenAI-compatible endpoint — Vercel AI Gateway by default. Benchmark only. */
export function baselineEngine(model = BASELINE_MODEL): Engine {
  return { name: "closed", baseURL: process.env.BASELINE_BASE_URL ?? "https://ai-gateway.vercel.sh/v1", apiKey: process.env.BASELINE_API_KEY ?? process.env.AI_GATEWAY_API_KEY ?? "", small: model, large: model };
}

const clients = new Map<string, OpenAI>();
export function client(e: Pick<Engine, "baseURL" | "apiKey">) {
  const key = e.baseURL + e.apiKey.slice(-6);
  let c = clients.get(key);
  if (!c) { c = new OpenAI({ baseURL: e.baseURL, apiKey: e.apiKey, maxRetries: 3, timeout: 60_000 }); clients.set(key, c); }
  return c;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await client(nebiusEngine()).embeddings.create({ model: MODELS.embedding, input: texts, encoding_format: "float" });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Lenient JSON extraction: models sometimes wrap JSON in prose or code fences. */
export function parseJson<T>(s: string): T | null {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}
