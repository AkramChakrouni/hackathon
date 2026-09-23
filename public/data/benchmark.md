# TenderScale benchmark — Personivo CAIQ v4.1, 50 questions

Generated 2026-09-23 10:39 UTC. Same code, same prompts, same concurrency for every column. Answer key never in the pipeline path. Facts-covered judge: `deepseek-ai/DeepSeek-V4-Pro-0813` (sees the key). Scoring rule: 1 = answer, key facts and flag all match the key; 0.5 = answer right but a fact or the flag is off; 0 = wrong answer or invented number.

| | nebius (Qwen3-30B-A3B-Instruct-2507 + Qwen3-235B-A22B-Instruct-2507) |
|---|---|
| Answers correct (of 50) | **49** |
| Flags correct (of 50) | **46** |
| Invented numbers (answers) | **0** |
| Key facts covered (judge, of 50) | **43** |
| Traps caught (of 8, score = 1) | **4** |
| Last year's answer matched (of 30) | 23 |
| Accuracy (avg score) | **0.89** |
| Seconds per questionnaire | **15.5** |
| Cost per questionnaire | **$0.025** (€0.023) |
| Tokens in / out | 125,193 / 13,489 |
| Data leaves EU | No |

## The 8 trap questions

| Question | Trap | Expected | nebius |
|---|---|---|---|
| BCR-08.1 | OUTDATED | Yes · orange | Yes · green 🟡 |
| BCR-08.3 | OUTDATED | Yes · orange | Yes · orange 🟡 |
| BCR-11.1 | OUTDATED | Yes · orange | Yes · green 🟡 |
| CEK-08.1 | CORRECT ANSWER IS NO | No · green | No · green ✅ |
| DSP-16.1 | CONTRADICTION between two policies | Yes · orange | Yes · orange 🟡 |
| DSP-18.1 | UNCOVERED | Unknown · red | Unknown · red ✅ |
| GRC-08.1 | UNCOVERED | Unknown · red | Unknown · red ✅ |
| IPY-04.1 | CONTRADICTION between two policies | Yes · orange | Yes · orange ✅ |

## Prices (USD per 1M tokens, input / output)

| Model | Input | Output | Source |
|---|---|---|---|
| Qwen/Qwen3-30B-A3B-Instruct-2507 | 0.09999999999999999 | 0.3 | https://api.tokenfactory.nebius.com/v1/models?verbose=true (live, 23 Sep 2026) |
| Qwen/Qwen3-235B-A22B-Instruct-2507 | 0.19999999999999998 | 0.6 | https://api.tokenfactory.nebius.com/v1/models?verbose=true (live, 23 Sep 2026) |

Manual baseline: 20–40 hours per questionnaire. EUR at 0.92 USD→EUR.