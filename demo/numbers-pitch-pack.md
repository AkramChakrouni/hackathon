# TenderScale — pitch pack (numbers, sources, story)

Generated 2026-09-23 10:39 UTC from `benchmark/benchmark.json`. Regenerate: `npm run benchmark && npm run pitch-pack`. Everything below is either measured on the day (marked **measured**) or an assumption with its source (marked **assumption**). Say which one it is on stage.

## 1. The scenario (say this first)

**Personivo B.V.** is a 25-person HR SaaS company in Utrecht. Its product handles employee records, onboarding and contracts for banks and insurers, hosted on Azure West Europe. It is ISO 27001 certified since May 2024 and has three policies: Information Security (v4.0, June 2026), Data Protection (v3.1, March 2026), Incident Response & Business Continuity (v2.3, May 2026). Last year it answered a bank's 30-question vendor assessment by hand.

This week a bank sent the **CSA CAIQ v4.1**, the standard cloud security questionnaire: 50 questions, due Friday, each answer a contractual statement. Hidden in it: three questions where last year's answer is now wrong (backups went from weekly to daily, restore tests from annual to quarterly, geo-redundancy from "planned" to live), two questions where Personivo's own policies contradict each other (30-day vs 90-day deletion after termination), two questions no policy covers at all (law enforcement requests, special interest groups), and one question where the honest answer is "No" (customer-managed keys).

Personivo is fictional. The CAIQ questions are real (CSA), the policies are realistic, and the answer key was built by hand and never shown to the system.

## 2. The problem, from first principles

- A security questionnaire is not a writing task. It is a **lookup and verification task**: for each question, find the paragraph in the current policy that answers it, check that nothing changed, and write down what it says. Errors are expensive: an answer is a statement to a bank.
- The failure modes are therefore not "bad prose". They are: **copying last year's answer after the practice changed**, **not noticing two policies disagree**, **answering a question nothing covers**, and **saying Yes because Yes sounds better**. A generic chatbot fails all four by design.
- So the product must be built around evidence, not fluency: every answer must point at the exact paragraph, every number must be quoted, the code (not the model) must verify quotes, and "no source" must be a first-class outcome.

## 3. One questionnaire: human vs TenderScale (per questionnaire, 50 questions)

| | Security lead by hand | TenderScale on Nebius | Factor |
|---|---|---|---|
| Time | **20–40 hours** (assumption, sources below) | **16 seconds** (measured) | 4,632–9,263× faster |
| Cost | **€1,140–€2,280** (20–40 h × €57/h, assumption) | **€0.023** ($0.025, measured token usage × list price) | 48,822–97,645× cheaper |
| Per question | 36 minutes, €34 | 0.3 s of wall-clock (50 in parallel), €0.0005 | |
| Answers correct vs key | not measured (the key was written by the human) | **49 / 50** (measured) | |
| Quotes verified against the policy text | manual | **100%**, by code (measured) | |
| Changed practices caught | depends on memory | **1 / 3** flagged (measured) | |
| Questions no policy covers | often answered anyway | **2 / 2** refused (measured) | |
| Invented numbers | unknown | **0** (measured, deterministic check) | |

![Time per 50-question questionnaire](charts/time.svg)

![Cost per 50-question questionnaire, EUR](charts/cost.svg)

**Sources for the human numbers (assumptions):**
- Time: the team's own estimate from Personivo-type companies is 20–40 hours per questionnaire. Public benchmark: Loopio's annual RFP response benchmark reports about 30 hours of work per response on average (https://loopio.com/rfp-response-trends/). Vendor security questionnaires of 50–200 questions are commonly reported in the same range by the questionnaire-tool vendors themselves (Vanta, Whistic, Loopio). Use "20–40 hours" and cite Loopio.
- Cost: a security engineer / security lead in the Netherlands, fully loaded (salary ~€75k plus ~30% employer cost, ~1,720 working hours) ≈ €57/h. Change the number if you prefer; the ratio stays in the thousands.
- The 50-question run above used 125,193 input and 13,489 output tokens (measured). Nebius prices: Qwen3-30B-A3B $0.10/$0.30, Qwen3-235B-A22B $0.20/$0.60, Qwen3-Embedding-8B $0.01 per 1M tokens (https://api.tokenfactory.nebius.com/v1/models?verbose=true, 23 Sep 2026).

## 4. Nebius Token Factory vs a closed model, per questionnaire

| | Open models on Nebius | GPT-5 (OpenAI) | Claude Sonnet 4.5 |
|---|---|---|---|
| Cost for the same 125,193/13,489 tokens | **$0.025** (measured) | $0.29 (list price $1.25/$10) — 11× | $0.58 (list price $3/$15) — 23× |
| Where the policies are processed | EU (Nebius, Finland) | US (OpenAI) | US (Anthropic) |
| Data protection | GDPR processor in the EU, no transfer outside the EEA needed | Transfer to the US, relies on EU–US Data Privacy Framework / SCCs and the vendor's retention terms | same |
| Model weights | open (Qwen3), can be self-hosted or fine-tuned on a customer's approved answers | closed, no self-hosting, no fine-tuning of the flagship | closed |
| Latency predictability | non-reasoning MoE (22B active): no hidden thinking tokens, measured first answer under 2 s | reasoning tokens vary per request | varies |
| Vendor lock-in | OpenAI-compatible API, model id in one env var | single vendor | single vendor |
| Quality on this task | 49/50 answers, 46/50 flags, 0 invented numbers (measured) | not measured on the day (no key); do not claim a number | not measured |

Why this matters for Personivo specifically: the questionnaire and the policies **are** the company's security architecture, backup locations, key management and incident procedures. Sending them to a US model vendor is itself something a bank's vendor-risk team asks about (DSP-19.1 in the very questionnaire we answer: "document physical data locations"). Answering a European bank's security questionnaire with a European inference provider is the consistent answer.

## 5. Why these two models (measured, same account, same day)

| Tier | Chosen | Alternatives measured | Result |
|---|---|---|---|
| Selection (small) | **Qwen3-30B-A3B-Instruct** | Qwen3-235B-A22B, gemma-3-27b-it | 30B: 1.1 s median per selection at 50 concurrent calls. 235B as selector: 13 s median under the same load. gemma: 1 s median but a tail of minutes (one run took 247 s). |
| Writing (large) | **Qwen3-235B-A22B-Instruct** | gpt-oss-120b, DeepSeek-V4-Flash, Qwen3-30B-A3B | Blind-judged quality on a 50-question assessment: Qwen3-235B 4.21/5 (first token 1.7 s), Qwen3-30B 4.27 but slower, gpt-oss-120b 2.57, DeepSeek-V4-Flash 2.87 and 3× slower (reasoning tokens). |
| JSON mode | off | on | JSON-schema mode added ~2.5 s per call on this endpoint; both Qwen instruct models returned valid JSON on every call without it. |

Two-tier design: the small model reads ~1.5K tokens per question and returns section IDs; the large model only sees the 2–4 sections that matter. That is why a 235B-class model costs two cents per questionnaire.

## 6. The 8 traps (measured)

| Question | Trap | Expected | TenderScale | Score |
|---|---|---|---|---|
| BCR-08.1 | OUTDATED | Yes · orange | Yes · green | 0.5 |
| BCR-08.3 | OUTDATED | Yes · orange | Yes · orange | 0.5 |
| BCR-11.1 | OUTDATED | Yes · orange | Yes · green | 0.5 |
| CEK-08.1 | CORRECT ANSWER IS NO | No · green | No · green | 1 |
| DSP-16.1 | CONTRADICTION between two policies | Yes · orange | Yes · orange | 0.5 |
| DSP-18.1 | UNCOVERED | Unknown · red | Unknown · red | 1 |
| GRC-08.1 | UNCOVERED | Unknown · red | Unknown · red | 1 |
| IPY-04.1 | CONTRADICTION between two policies | Yes · orange | Yes · orange | 1 |

Score rule (team's sheet): 1 = answer, key facts and flag all match; 0.5 = answer right but a fact or the flag off; 0 = wrong answer or invented number. Whole questionnaire: average score **0.89**, answers 49/50, flags 46/50, key facts covered 43/50 (judge: DeepSeek-V4-Pro-0813), last year's answer matched 23/30.

## 7. What the product does that a chatbot cannot (for the "solution" slides)

1. **Select, then write.** A small model picks the policy sections that contain the answer (or says none do). A large model writes only from those sections.
2. **Quotes the code verifies.** Every source is a verbatim quote; the code checks it exists in the section. A quote that is not found is dropped; an answer with no verified source becomes "Unknown", red.
3. **Numbers must be quoted.** Every number in the comment must appear in a verified quote, or the answer is flagged.
4. **Deterministic flags.** Red: no source. Orange: two sections disagree, last year's answer no longer holds, or an unverified number. Green: everything else. The model never decides the colour.
5. **Diff after a policy change.** Load IR/BC v2.4 (log backups every 5 minutes, monthly restore tests), run again: the three answers that cite §5 are marked changed, with the old answer and the changed text side by side.
6. **The source, one click away.** Click a citation and the policy opens with the quoted sentence highlighted; toggle to see what changed between versions, word by word.
7. **Gap list.** Every red question in one list: what the policies need to say before the next questionnaire.

## 8. Demo script, 60 seconds

| t | Do | Say |
|---|---|---|
| 0:00 | Workspace open, Personivo, 50 questions | "Personivo, 25 people, sells HR software to banks. A bank just sent 50 CAIQ questions. Their security lead would spend a week on this." |
| 0:05 | Click **Run** | "Two open models on Nebius, in the EU. Watch the clock." Rows stream in. |
| 0:25 | Click **Review**, open BCR-08.1 | "Last year: weekly backups. Policy now: daily. Flagged, both shown. Click the source." Policy opens, sentence highlighted. |
| 0:38 | Click **No source**, open DSP-18.1 | "Law enforcement requests. No policy covers it. It refuses. Red goes to a human." |
| 0:45 | **Load updated IR/BC v2.4**, **Run again**, click **Changed** | "Policy changed. Three answers changed. It tells you which and why." |
| 0:55 | Point at the tiles | "16 seconds. Two cents. 49 of 50 correct against a key it never saw. Zero invented numbers." |

Before going on stage: one warm-up run five minutes earlier; never two runs at once (they share one rate limit).
