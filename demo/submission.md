# TenderScale — submission answers

Live product: https://hackathon-ten-zeta-43.vercel.app
Pitch slides: https://hackathon-ten-zeta-43.vercel.app/pitch.html
Numbers: https://hackathon-ten-zeta-43.vercel.app/benchmark
Repo: https://github.com/AkramChakrouni/hackathon

## What did you build, and what problem does it solve?

The problem: Security questionnaires delay software deals. CTOs and security leads repeatedly search policies and copy old answers that may be outdated. A mid-size supplier gets 3 to 6 questionnaires a quarter, 50 to 200 questions each, 20 to 40 hours per questionnaire, and every answer is a contractual statement to a bank.

Our product: TenderScale answers from current policies, cites the evidence with a verbatim quote, flags conflicts between policies and answers that changed since last year, and leaves unsupported questions unanswered. After a policy update, it shows which answers changed and why.

The business: We target European software suppliers selling to banks and insurers. Today they use spreadsheets and RFP tools that cost tens of thousands a year and still leave the checking to a human. Annual company licences help customers save engineering time and complete reviews faster. Revenue grows as more products and business units adopt the platform, and at cents per questionnaire the margin supports usage-based pricing.

## Models and Token Factory use

Qwen3-30B-A3B on Nebius Token Factory selects the policy paragraphs that contain the answer. A small model does this focused task at low cost and 1.1 s per question.

Qwen3-235B-A22B on Nebius Token Factory writes the cited answer: Yes/No/Unknown, a verbatim quote, conflicts between policies, and whether last year's answer still holds. The larger model handles nuanced wording and conflicting evidence; it scored 4.21/5 blind against 2.57 for gpt-oss-120b.

Qwen3-Embedding-8B on Nebius shortlists paragraphs so every selection call stays small.

Why two models: the large model is reserved for answer writing instead of every step, which is why a questionnaire costs 2.5 cents.

Why Nebius: both open models on one EU-hosted, OpenAI-compatible API, so the policies never leave the EU.

OpenAI gpt-6-sol is our closed-model benchmark, run through the identical pipeline to test quality, cost and latency. It is not used in the product.

## Measurable model advantage

Baselines: OpenAI gpt-6-sol through the identical pipeline (same prompts, same evidence, same code checks), and the human who does this today. Test: Personivo's 50-question CAIQ v4.1, scored against a held-out answer key the system never sees, with 8 planted traps.

Quality: open models 49/50 answers correct, 47/50 flags correct, 0 invented numbers. gpt-6-sol 37/50, 37/50, 1 invented number. Traps caught 5/8 each.

Cost per questionnaire: $0.025 on Nebius vs $0.347 on gpt-6-sol (14x). A security lead: 20 to 40 hours, about EUR 1,100 to 2,300.

Latency: 26.6 s for 50 questions on Nebius vs 95.4 s on gpt-6-sol (rate-limited to 6 parallel calls on our key); 30 hours by hand.

Control: quotes are verified in code, flags are deterministic, and the policies stay in the EU; the closed run sends them to the US. Model choice was measured too: the 235B as selector fell to 13 s under load, so the 30B selects.

Proof: https://hackathon-ten-zeta-43.vercel.app/benchmark and benchmark/benchmark.md plus the filled score sheet (benchmark/answer_key_filled.xlsx) in the repo.

## Responsible design

We store no personal data: policies and questionnaires go to Nebius in the EU for inference only, and a run lives in the reviewer's browser until exported. Every answer carries a verbatim quote that code verifies against the policy; a question no policy covers is left unanswered and flagged red, so the model cannot invent an answer, and a hidden instruction in a document cannot produce one without a real source. If the model is wrong, the reviewer sees the source paragraph in one click, edits before export, and the export carries the flags so a human checks what needs review before anything reaches the bank.

## Pitch slides

https://hackathon-ten-zeta-43.vercel.app/pitch.html

Public, tested in an incognito window, no login. 10 slides, each labelled with the judging criterion it covers: product and user value, problem and company potential, measurable model advantage (with the measured gpt-6-sol comparison), technical execution and Token Factory use, demo clarity, responsible design. Arrow keys or click to advance. The live demo runs from https://hackathon-ten-zeta-43.vercel.app in the same browser.
