export type Category =
  | "company" | "compliance" | "security" | "access" | "infrastructure"
  | "appsec" | "incident" | "privacy" | "legal" | "commercial" | "ai";

export type Risk = "low" | "medium" | "high";
export type Flag = "none" | "needs_approval" | "no_evidence";

export interface Question { id: string; section: string; text: string }

export interface Chunk {
  id: number;
  doc: string;      // file slug
  title: string;
  kind: string;
  owner: string;
  text: string;
  embedding?: number[];
}

export interface Citation { chunk: number; doc: string; title: string; score: number }

export interface Answer {
  id: string;
  text: string;
  confidence: number;
  citations: Citation[];
  flag: Flag;
  reason?: string;
  latencyMs: number;
}

export interface Usage { model: string; input: number; output: number; cost: number }

export interface Metrics {
  elapsedMs: number;
  usage: Usage[];
  cost: number;
  baselineCost: number;
  done: number;
  total: number;
  flagged: number;
}

export type Event =
  | { type: "stage"; stage: "classify" | "retrieve" | "synthesize" | "brief"; status: "start" | "done"; ms?: number }
  | { type: "classified"; id: string; category: Category; risk: Risk; reason: string }
  | { type: "retrieved"; id: string; citations: Citation[] }
  | { type: "delta"; id: string; text: string }
  | { type: "answer"; answer: Answer }
  | { type: "brief"; prospect: string; summary: string; sources: { title: string; url: string }[] }
  | { type: "metrics"; metrics: Metrics }
  | { type: "done"; runId: string; metrics: Metrics }
  | { type: "error"; message: string };

export interface Engine {
  name: string;               // "nebius" | "baseline"
  baseURL: string;
  apiKey: string;
  classifier: string;         // model id
  synthesizer: string;        // model id
  synthBatch: number;         // questions per synthesis call
}
