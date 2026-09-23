# Submission — TenderScale · Accel AI Innovate Amsterdam, 23 Sep 2026

Live product: https://hackathon-ten-zeta-43.vercel.app · Numbers: https://hackathon-ten-zeta-43.vercel.app/benchmark · Repo: https://github.com/AkramChakrouni/hackathon (MODELS.md, benchmark/benchmark.md, benchmark/answer_key_filled.xlsx, docs/pitch-pack.md)

## What did you build, and what problem does it solve?

Every software vendor that sells to a bank, insurer or enterprise gets a security questionnaire before the deal closes: 50 to 200 questions, often the CSA CAIQ. The security lead or sales engineer spends 20 to 40 hours per questionnaire finding the right paragraph in the policies, copying last year's answers, and hoping nothing changed. A wrong answer is a contractual statement to a bank. Today this is spreadsheets and Ctrl+F, or a $50k+/year RFP tool that still leaves the checking to a human and cannot tell you which of last year's answers are now wrong.

TenderScale answers a questionnaire from the company's own policies and nothing else. For every question it returns Yes / No / Unknown, a two-sentence comment, the reason, and the exact policy section and version with a verbatim quote that the code verifies against the source. Click the quote and the policy opens with the sentence highlighted, with a word-by-word view of what changed between versions. Two policies that disagree are flagged with both values side by side. A practice that changed since last year's answer is flagged. A question no policy covers is refused, not invented. Rerun after a policy update and it shows exactly which answers changed and why.

Our customer is Personivo B.V., a 25-person HR SaaS in Utrecht selling to banks: three policies, last year's questionnaire, and a fresh 50-question CAIQ v4.1 with a held-out answer key. Result: 49 of 50 answers correct, 46 of 50 flags correct, 0 invented numbers, 100% of quotes verified, in 16 seconds for $0.025, against 20–40 hours and roughly €1,140–€2,280 of a security lead's time.

Questionnaire software already has budget owners; the wedge is the mid-market vendor for whom a slow questionnaire is a lost deal and a wrong one is a liability. €500–2,000 per month per team pays back on one contract; at cents per questionnaire the margin supports usage pricing. Expansion: RFPs, due-diligence questionnaires, and the buyer's side of the same table.

## Models and Token Factory use

Everything in the pipeline runs on Nebius Token Factory (OpenAI-compatible API, EU). No closed model anywhere in the product.

- Qwen/Qwen3-30B-A3B-Instruct-2507 — source selection (small tier). Reads the shortlisted policy sections for a question and returns the sections that contain the answer, the coverage (covered / partial / none) and a category. Measured 1.1 s median at 50 concurrent calls; the 235B as selector degraded to 13 s under the same load, gemma-3-27b had a tail of minutes.
- Qwen/Qwen3-235B-A22B-Instruct-2507 — answer writing (large tier). Yes / No / Unknown, comment, reasoning, verbatim quotes, conflicts between sections, and whether last year's answer is still consistent. Non-reasoning MoE, 22B active: no hidden thinking tokens, predictable latency; scored best in a blind quality matrix against gpt-oss-120b and DeepSeek-V4-Flash.
- Qwen/Qwen3-Embedding-8B — cosine shortlist of sections and past answers so each selection call stays at ~1.5K tokens.
- Around the models, in code: quote check (every quote must appear in the cited section), number check (every number in the comment must be backed by a quote), Yes without a source becomes Unknown, and deterministic red / orange / green flags.
- Closed models: used only as the benchmark baseline through Vercel AI Gateway when a key is available; on the day the closed column was not run, so the cost comparison is at list price for the identical token volume.

## Measurable model advantage

Baseline 1: the human, 20–40 hours per questionnaire (Loopio's RFP benchmark reports ~30 hours per response). Baseline 2: the same pipeline on a closed model at list price for the measured token volume (125,193 in / 13,489 out).

Scored against a held-out answer key the pipeline never sees (Personivo CAIQ v4.1, 50 questions, 8 deliberate traps): answers correct 49/50, flags correct 46/50, invented numbers 0, key facts covered (judge) 43/50, last year's answer matched 23/30, traps caught 4/8 at full score, average score 0.89. Wall-clock 15.5 s. Cost $0.025 (€0.023) versus $0.29 on GPT-5 at list price, 11× cheaper, and the policies never leave the EU.

Model selection was measured, not assumed: selector latency under load (30B 1.1 s vs 235B 13 s vs gemma minutes) and a blind-judged writer matrix (Qwen3-235B 4.21/5 vs gpt-oss-120b 2.57 vs DeepSeek-V4-Flash 2.87, 3× slower). Details: MODELS.md, benchmark/benchmark.md, the filled score sheet, docs/pitch-pack.md and /benchmark.

## Responsible design

Personal data: we store none. Policies, past answers and the questionnaire are sent only to Nebius in the EU for inference; a run lives in the reviewer's browser until exported, nothing is kept server-side. Harmful or manipulative input: the model can only quote the policy sections it is given, it has no tools and takes no actions, and any quote that is not found verbatim in the section is dropped by code, so a prompt hidden in a document cannot produce an answer without a real source. When the model is wrong: every answer shows its source one click away, the reviewer edits it before export, red questions are never answered, and the export carries the flags so a human sees what needs review before anything reaches the bank.
