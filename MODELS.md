# Models — TenderScale on Nebius Token Factory

All inference in the product runs on Nebius Token Factory (`https://api.tokenfactory.nebius.com/v1/`, OpenAI-compatible, EU). No closed model is used anywhere in the pipeline; a closed model appears only as the benchmark baseline.

| Tier | Model id | Price in / out (USD per 1M tokens) | Role |
|---|---|---|---|
| Selection (small) | `Qwen/Qwen3-30B-A3B-Instruct-2507` | 0.10 / 0.30 | Reads the candidate policy sections for one question, returns the sections that contain the answer, the coverage (covered / partial / none) and a category. |
| Writing (large) | `Qwen/Qwen3-235B-A22B-Instruct-2507` | 0.20 / 0.60 | Writes the answer (Yes / No / Unknown), a 2-sentence comment, verbatim quotes, conflicts between sections, and whether last year's answer is still consistent. |
| Embedding | `Qwen/Qwen3-Embedding-8B` | 0.01 / — | Shortlists the 10 most similar sections and 8 past answers per question so every selection call stays at ~1.5K tokens (50 run in parallel under a 400K tokens/minute limit). |

Prices read from `GET /v1/models?verbose=true` on 23 September 2026.

## Why these, measured on the day

- Small tier: `Qwen3-30B-A3B` selected sections in 1.1 s median at 50 concurrent calls. `Qwen3-235B` as selector degraded to 13 s median under the same load; `gemma-3-27b-it` had a 1 s median but a tail of minutes. Same prompt, same day, same account.
- Large tier: in a blind-judged matrix on a 50-question assessment `Qwen3-235B-A22B` scored 4.21/5 with the fastest first token (1.7 s); `gpt-oss-120b` scored 2.57 and `DeepSeek-V4-Flash` took 3× longer because of reasoning tokens. Non-reasoning MoE, 22B active: no hidden thinking, predictable latency.
- Both Qwen instruct models returned valid JSON on every call without JSON-schema mode (which added ~2.5 s per call on this endpoint).

## Data handling

Requests carry only the question, the shortlisted policy sections and past answers. Nothing is stored server-side by TenderScale; a run lives in the reviewer's browser until exported. Retention on the Nebius side: the account's default (Nebius states no training on customer data); a zero-retention endpoint setting was not exposed in the account UI on the day, so we do not claim it.
