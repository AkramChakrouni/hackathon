export type Flag = "green" | "orange" | "red";
export type AnswerValue = "Yes" | "No" | "Unknown";
export type Coverage = "covered" | "partial" | "none";
export type Category = "legal" | "security" | "technical" | "privacy" | "continuity";
export type PolicySet = "current" | "updated";

export interface Policy { id: string; short: string; name: string; version: string; effective: string; file: string }
export interface Section { id: string; policy: string; policyName: string; version: string; number: number; title: string; text: string; hash: string }
export interface PastAnswer { ref: string; question: string; answer: string; comment: string }
export interface Question { id: string; text: string; position: number }

export interface Source { section_id: string; policy: string; version: string; quote: string; text_hash: string; repaired?: boolean }
export interface Conflict { section_a: string; section_b: string; what_differs: string }
export interface Selection { category: Category; relevant_sections: string[]; relevant_past_answers: string[]; coverage: Coverage }

export interface Answer {
  question_id: string;
  answer: AnswerValue;
  ssrm_ownership: string;
  comment: string;
  flag: Flag;
  flag_reason: string;
  sources: Source[];
  conflicts: Conflict[];
  past_answer: PastAnswer | null;
  past_answer_consistent: boolean | null;
  category: Category;
  coverage: Coverage;
  confidence: "low" | "medium" | "high";
  checks: { quotes_valid: number; quotes_dropped: number; numbers_unverified: string[] };
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  selection_ms: number;
  raw_small?: string;   // model outputs kept for audit
  raw_large?: string;
}

export interface RunMeta {
  run_id: string;
  policy_set: PolicySet;
  policy_versions: Record<string, string>;
  model_small: string;
  model_large: string;
  started_at: string;
  finished_at?: string;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  baseline_cost_usd: number;   // identical token volume at the closed model's list price
  done: number;
  total: number;
  flags: Record<Flag, number>;
  status: "running" | "done" | "error";
}

export type Event =
  | { type: "start"; run: RunMeta }
  | { type: "selected"; question_id: string; selection: Selection; ms: number }
  | { type: "answer"; answer: Answer }
  | { type: "metrics"; run: RunMeta }
  | { type: "done"; run: RunMeta; answers: Answer[] }
  | { type: "error"; message: string };

export interface Engine { name: string; baseURL: string; apiKey: string; small: string; large: string }
