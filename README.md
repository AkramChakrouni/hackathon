# Attest — questionnaire & RFP autopilot

Turns an enterprise security questionnaire or RFP into cited, risk-flagged draft answers in seconds,
using only the vendor's own evidence. Built at Accel AI Innovate Amsterdam (23 Sep 2026) on
**Nebius Token Factory** open models.

## How it works

```
questionnaire (CSV)            knowledge base (data/companies/<company>/knowledge/*.md)
      │                                   │  npm run index → data/index.json
      ▼                                   ▼
 ┌─ triage ──────────────┐   ┌─ retrieve ──────────────────────┐   in parallel
 │ Qwen3-235B-A22B (fast)   │   │ Qwen3-Embedding-8B embeddings → cosine  │
 │ category + risk, JSON │   │ top-k over hot in-memory index  │
 └───────────┬───────────┘   └───────────────┬─────────────────┘
             └───────────────┬───────────────┘
                             ▼
              ┌─ draft ───────────────────────────┐   N parallel streams
              │ Qwen3-235B-A22B (fast)              │   answer · [n] citations
              │ evidence-only, flags no_evidence  │   confidence · flag
              └───────────────┬───────────────────┘
                              ▼
      SSE → workspace: live answers, citations, confidence, approval, CSV export
      Tavily (optional, parallel): prospect brief for the executive summary
```

- `src/lib/pipeline.ts` — the three stages, streamed as server-sent events
- `src/lib/nebius.ts` — Token Factory client, model ids, list prices
- `src/lib/retrieval.ts` — in-memory vector index (sub-millisecond search)
- `src/app/api/run/route.ts` — `POST /api/run` → SSE
- `scripts/eval.ts` — accuracy against a held-out answer key (`data/answer-keys/`), traps included → `/benchmark`
- `scripts/benchmark.ts` — model selection matrix: same pipeline for every candidate drafter, blind LLM judge
- `scripts/report.ts` — regenerates `docs/results.md` and its charts from the JSON results
- `docs/frontend-spec.md` — the UI contract (events, states, metrics) · `docs/submission.md` — the submission text

## Run

```bash
cp .env.example .env.local   # add NEBIUS_API_KEY (and TAVILY_API_KEY)
npm install
npm run index                # embed data/knowledge → data/index.json
npm run dev                  # http://localhost:3000
npm run eval                 # ground truth: data/eval.json
npm run benchmark            # model matrix: data/benchmark.json (+ closed baseline when a key exists)
npm run report               # docs/results.md + docs/charts/*.svg
```

## Workspaces

`data/companies/<slug>/company.md` + `knowledge/*.md` (Markdown with `title / kind / owner / updated` frontmatter).
Demo company: **Personivo B.V.** (3 policies + last year's questionnaire, CAIQ v4.1 with a held-out answer key).
Second workspace: Kestrel Cloud B.V. (26 synthetic documents, a vendor assessment and an RFP).

## Responsible design

Answers are drafted only from retrieved evidence; anything not covered is marked *No evidence* and
routed to an SME instead of being invented. Questions that commit the company (incidents, liability,
indemnities, audit rights, pricing) are flagged *Needs approval* and cannot be exported as approved
without a human. Inference runs in the EU on Nebius with zero data retention; nothing is stored
server-side — a run lives only in the reviewer's browser until they export it.
