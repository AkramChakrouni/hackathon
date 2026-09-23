# TenderScale — submission answers

Live: https://hackathon-ten-zeta-43.vercel.app · Slides: https://hackathon-ten-zeta-43.vercel.app/pitch.html · Proof: https://hackathon-ten-zeta-43.vercel.app/benchmark

## What did you build, and what problem does it solve?

The problem: Security questionnaires delay software deals. Security leads spend 20–40 hours per questionnaire, 3–6 times a quarter, searching policies and copying old answers that may be outdated. Every answer is a promise to a bank.

Our product: TenderScale answers from current policies, quotes the exact paragraph, flags conflicts and outdated answers, and leaves unsupported questions unanswered. After a policy update it shows which answers changed.

The business: European software suppliers selling to banks and insurers. They already pay tens of thousands a year for RFP tools that still leave the checking to a human. Annual company licences; revenue grows per product and business unit.

## Models and Token Factory use

Qwen3-30B-A3B (Nebius Token Factory) selects the policy paragraphs that contain the answer. Small, cheap, 1.1 s per question.

Qwen3-235B-A22B (Nebius) writes the cited answer: Yes/No/Unknown, verbatim quote, conflicts, whether last year's answer still holds. Scored 4.21/5 blind vs 2.57 for gpt-oss-120b.

Qwen3-Embedding-8B (Nebius) shortlists paragraphs so calls stay small.

Why two models: the large one only writes; that is why a questionnaire costs 2.5 cents. Why Nebius: both models on one EU-hosted API, policies never leave the EU.

Closed model: OpenAI gpt-6-sol, benchmark only, not in the product.

## Measurable model advantage

Baseline: gpt-6-sol through the identical pipeline, and the human doing it today. Test: 50-question CAIQ v4.1, scored against a held-out answer key with 8 planted traps.

| | Nebius (open) | gpt-6-sol | Human |
|---|---|---|---|
| Answers correct | 49/50 | 37/50 | — |
| Flags correct | 47/50 | 37/50 | — |
| Invented numbers | 0 | 1 | — |
| Time | 26.6 s | 95.4 s | 20–40 h |
| Cost | $0.025 | $0.347 | ~EUR 1,100–2,300 |
| Data leaves EU | No | Yes | — |

Proof: https://hackathon-ten-zeta-43.vercel.app/benchmark, benchmark/benchmark.md and the filled score sheet in the repo.

## Responsible design

We store no personal data; policies go to Nebius in the EU for inference only and results stay in the browser until exported. Every answer carries a verbatim quote verified by code; questions no policy covers are left unanswered and flagged red, so nothing is invented. If the model is wrong, the reviewer opens the source in one click, edits, and the export carries the flags for human review.

## Pitch slides

https://hackathon-ten-zeta-43.vercel.app/pitch.html — public, tested in incognito, one slide per judging criterion, live demo from the same browser.
