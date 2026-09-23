# TenderScale benchmark — Personivo CAIQ v4.1, 50 questions

Generated 2026-09-23 12:40 UTC. Same code and prompts for both columns. Answer key never in the pipeline path. Facts judge: `deepseek-ai/DeepSeek-V4-Pro-0813`. Scoring: 1 = answer, key facts and flag match; 0.5 = answer right but a fact or the flag off; 0 = wrong answer or invented number.

| | TenderScale · Nebius (Qwen3-30B-A3B + Qwen3-235B-A22B) | Closed · OpenAI gpt-6-sol |
|---|---|---|
| Answers correct (of 50) | **49** | **37** |
| Flags correct (of 50) | **47** | **37** |
| Invented numbers (answers) | **0** | **1** |
| Key facts covered (judge, of 50) | **43** | **34** |
| Traps caught (of 8, score = 1) | **5** | **5** |
| Last year's answer matched (of 30) | **24** | **21** |
| Accuracy (avg score) | **0.91** | **0.68** |
| Seconds per questionnaire | **26.6** (50 calls in parallel) | **95.4** (6 in parallel: the key's rate limit) |
| Cost per questionnaire | **$0.025** (€0.023) | **$0.347** (€0.320) at $2 / $10 per 1M |
| Tokens in / out | 125,011 / 13,563 | 121,143 / 10,500 |
| Data leaves EU | No | Yes |

## The 8 trap questions

| Question | Expected | Nebius | Closed |
|---|---|---|---|
| BCR-08.1 | Yes · orange | Yes · green 🟡 | Yes · green 🟡 |
| BCR-08.3 | Yes · orange | Yes · orange ✅ | Yes · orange ✅ |
| BCR-11.1 | Yes · orange | Yes · orange ✅ | Yes · orange ✅ |
| CEK-08.1 | No · green | No · green ✅ | No · green ✅ |
| DSP-16.1 | Yes · orange | Yes · orange 🟡 | Yes · orange ❌ |
| DSP-18.1 | Unknown · red | Unknown · red ✅ | Unknown · red ✅ |
| GRC-08.1 | Unknown · red | Unknown · red ✅ | Unknown · red ✅ |
| IPY-04.1 | Yes · orange | Yes · orange 🟡 | Unknown · red ❌ |

Prices: Nebius from /v1/models?verbose=true (23 Sep 2026); gpt-6-sol $2 in / $10 out per 1M (team spec). Manual baseline: 20–40 hours per questionnaire.