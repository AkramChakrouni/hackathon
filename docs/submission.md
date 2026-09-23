# Submission — Accel AI Innovate Amsterdam, 23 Sep 2026

Live product: https://hackathon-ten-zeta-43.vercel.app · Pitch deck: https://hackathon-ten-zeta-43.vercel.app/pitch.html · Numbers: https://hackathon-ten-zeta-43.vercel.app/benchmark · Results pack: `docs/results.md`

## What did you build, and what problem does it solve?

Every B2B software vendor that sells to a bank, insurer or enterprise gets the same thing before a deal closes: a security questionnaire or RFP with 50 to 200 questions. A sales engineer or security lead spends 20 to 40 hours per document stitching answers together from policies, last year's questionnaire and colleagues' heads, three to six times a quarter. One wrong answer can lose a six-figure deal or create legal exposure, so everything is re-checked by hand. Today they use spreadsheets, SharePoint search, and tools such as Loopio or Responsive that cost tens of thousands of dollars a year, run on closed models, and still leave the review to a human.

Attest turns a questionnaire into cited, risk-flagged draft answers in seconds, using only the vendor's own evidence. Upload the CAIQ or the customer's spreadsheet; every question gets an answer with citations to named documents, a Yes/No verdict, a confidence score and a status: ready, needs approval (incidents, liability, indemnities, audit rights, changed practice), or no evidence (routed to a human instead of invented). The reviewer approves or edits, then exports.

Our demo customer is Personivo B.V., a 25-person HR SaaS vendor in Utrecht selling to banks: a real CAIQ v4.1 with 50 questions, answered from three policies and last year's questionnaire, scored against a held-out answer key. Verdicts are 94% correct, key facts 92% correct, one invented fact in 50, and 6 of 8 deliberate traps caught, in 8 seconds for about 2 cents.

The category already has budget owners and proven willingness to pay; the wedge is the mid-market vendor who cannot justify a $50k tool but loses deals to slow questionnaires. Pricing at €500 to €2,000 per month per team pays back on one won deal, and the open-model cost structure (cents per questionnaire) leaves room for usage-based pricing at >80% gross margin.

## Models and Token Factory use

Everything in the product path runs on Nebius Token Factory through its OpenAI-compatible API, in the EU, with zero retention.

- **Qwen/Qwen3-235B-A22B-Instruct-2507** — drafting. A non-reasoning MoE (22B active of 235B): no hidden thinking tokens, so time-to-first-token is stable enough to demo live. Evidence-only prompt, one question per call, 50 calls streamed in parallel over server-sent events; each answer carries citations, a verdict, a confidence and a flag. It also writes the prospect brief from Tavily results.
- **Qwen/Qwen3-235B-A22B-Instruct-2507** — triage, same model with a classification prompt (category, risk), 5 questions per call, plain JSON. We started triage on Qwen3-30B-A3B and measured it slower on this endpoint (3.6s vs 1.8s per call), with JSON-schema mode adding ~2.5s; so triage moved. Measured, then changed.
- **Qwen/Qwen3-Embedding-8B** — retrieval. 4096-dim embeddings over policy and past-answer passages, held in a hot in-memory index (sub-millisecond cosine search, top-6 plus the best matching past answer so a changed practice is always visible).
- **Tavily** — prospect brief (recent news about the customer) generated in parallel, never blocking answers.
- Closed models are not used in the product. A closed model would be the natural benchmark baseline; on the day no closed-model key was available, so the closed comparison is at list price for the identical token volume, and the blind judge is DeepSeek-V4-Pro on Nebius (not a candidate).

## Measurable model advantage

Baseline 1, the real one: manual work, 20–40 hours per questionnaire. Baseline 2: closed models at public list prices for the identical measured token volume (89,681 in / 7,374 out per questionnaire).

Ground truth, Personivo CAIQ v4.1, 50 questions, answer key never shown to the pipeline: verdict correct 94%, expected flag correct 92%, key facts correct 92%, all three correct 86%, invented facts 1 of 50, traps caught 6 of 8 (outdated past answers, contradicting policies, uncovered topics, an honest "No"). Wall-clock 7.9 s, cost $0.023.

Model selection, same pipeline for every candidate on a 50-question assessment, blind-graded 1–5: Qwen3-235B-A22B 6.0 s wall, 1.68 s first token, $0.022, quality 4.21; Qwen3-30B-A3B 6.4 s, 2.02 s, $0.012, 4.27; gpt-oss-120b 4.1 s, $0.016, 2.57; DeepSeek-V4-Flash 19.5 s, $0.016, 2.87. The 235B was chosen for first-token latency and groundedness at equal quality.

Cost: $0.023 per questionnaire versus $0.19 on GPT-5 and $0.30 on GPT-4o at list price, 8–13× cheaper, for a task that used to cost 20–40 hours of a senior engineer.

Control: EU inference with zero retention, per-stage model routing, and a fine-tuning path on approved answers that no closed API offers. Full tables and charts: https://hackathon-ten-zeta-43.vercel.app/benchmark and `docs/results.md`.

## Responsible design

Answers are drafted only from retrieved evidence; a question the knowledge base does not cover is marked "No evidence" and routed to a person instead of being invented (2 of 2 uncovered questions caught). Anything that commits the company or reveals history (incidents, liability, indemnities, audit rights, changed practices, conflicting policies) is flagged "Needs approval" and cannot be exported as approved without a human. Every answer is editable. Inference runs in the EU on Nebius with zero retention; nothing is stored server-side, a run lives in the reviewer's browser until they export it.
