# TenderScale

Answers a security questionnaire from a company's own policies. Every answer cites the exact section and policy
version with a verbatim quote that the code checks against the source, conflicts between policies are flagged,
questions no policy covers are refused instead of invented, and a rerun after a policy change shows exactly which
answers changed. Built at Accel AI Innovate Amsterdam (23 Sep 2026) on Nebius Token Factory open models.

```
policies (md) + last year's answers (csv) + new questionnaire (csv)
        │
        ▼ per question, 50 in parallel
  shortlist ── Qwen3-Embedding-8B, cosine over sections + past answers (in memory)
        │
  select ───── Qwen3-30B-A3B: sections that contain the answer · coverage · category
        │
  write ────── Qwen3-235B-A22B: Yes/No/Unknown · comment · verbatim quotes · conflicts · past-answer consistency
        │
  checks ───── code: quote found in section? numbers backed by a quote? Yes without a source → Unknown
        │
  flag ─────── code: red (no source) · orange (conflict, changed practice, unverified number) · green
        ▼
  SSE → workspace: rows stream in, answer panel with quotes, diff after a policy change, gap list, CSV export
```

- `src/lib/corpus.ts` — policies → sections (`InfoSec §5`), versions, hashes; past answers; questionnaire CSV
- `src/lib/pipeline.ts` — the run; `src/lib/checks.ts` — quote/number checks and flag rules; `src/lib/diff.ts` — run-to-run diff
- `src/app/api/run/route.ts` — `POST /api/run` → server-sent events; `api/meta`, `api/diff`
- `scripts/benchmark.ts` — scores the pipeline (and a closed model) against `benchmark/answer_key.csv`, which the pipeline never reads
- `MODELS.md` — exact model ids, prices, and why · `docs/frontend-spec.md` — UI contract · `docs/submission.md`

## Run

```bash
cp .env.example .env.local        # NEBIUS_API_KEY (AI_GATEWAY_API_KEY only for the closed baseline)
npm install && npm run index      # embeds policy sections + past answers → data/index.json
npm run dev                       # http://localhost:3000
npm run benchmark                 # benchmark/benchmark.md + benchmark.json + answer_key_filled.xlsx
```

Demo set: `data/demo/` — Personivo B.V. (fictional HR SaaS, Utrecht): three policies, 30 answers from 2025, a
50-question CAIQ v4.1, and a prepared IR/BC v2.4 update for the diff demo.

## Responsible design

Every answer cites a verbatim quote and the code verifies the quote against the section. No answer without a
source: red questions are never answered. Past answers never override the current policy. The answer key is never in
the pipeline path. Inference on Nebius in the EU; no closed model in the pipeline. The export carries the flags, so a
human sees what needs review before anything is sent.
