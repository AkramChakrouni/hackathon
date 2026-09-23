# TenderScale — demo kit

Everything you need is in this folder. Nothing else has to be prepared.

## Links (open these tabs before you go up)

| Tab | URL | Purpose |
|---|---|---|
| A | https://hackathon-ten-zeta-43.vercel.app | Warm-up: run once 10 minutes before, leave it on the finished results. Your safety net. |
| B | https://hackathon-ten-zeta-43.vercel.app | Fresh tab. The one you present in. |
| C | https://hackathon-ten-zeta-43.vercel.app/?backend=replay | Emergency only: scripted run in the browser, same UI, footer says "replay". Use it only if the network dies, and say so if asked. |
| Slides | https://hackathon-ten-zeta-43.vercel.app/pitch.html | Or Adam's deck if his link is public. |
| Numbers | https://hackathon-ten-zeta-43.vercel.app/benchmark | If a judge asks for proof. |

Rules: never run in two tabs at once (shared rate limit). Quote flag counts from the screen, never from memory.

## Files

- `Personivo_CAIQ_2026_from_bank.csv` — the questionnaire you upload in step 2. Same 50 CAIQ v4.1 questions as the demo set, so the live run is identical. Open it in Excel or Numbers first for the "this is what the bank sends" moment. Upload accepts `.csv` only.
- `numbers-benchmark.md` — measured results against the answer key.
- `numbers-pitch-pack.md` — every number with its source (human vs TenderScale, Nebius vs closed, why each model).

The policy change needs no file: it is the in-app button **Load updated policy (v2.4)** followed by **Run again**.

## The flow, 2 minutes 30, with what to say

**0:00 · The pain (15 s).** Show the CSV in Excel.
> "Every software company selling to a bank gets this before the deal closes: fifty security questions. A security lead spends thirty hours on it, and every answer is a legal promise to the bank. Copy last year's answer and the practice has changed, and you just lied to a bank."

**0:15 · Load (10 s).** In tab B: Questionnaires → **Upload questionnaire** → pick the CSV. Fifty pending rows appear.
> "This is Personivo, a 25-person HR company selling to banks. Their three policies are already here, with versions. Fifty questions loaded."

**0:25 · Run (25 s).** Press **Run 50 questions**. Rows fill in one by one, the timer counts, the engine feed scrolls. Talk over it; do not wait in silence.
> (0–5 s, point at the engine feed) "Watch the engine. For every question, a small open model on Nebius picks the two or three policy paragraphs that actually contain the answer."
> (5–12 s) "A large open model writes the answer only from those paragraphs, with a word-for-word quote."
> (12–18 s, point at rows turning green) "Then code, not the model, verifies every quote exists in the policy and every number in the comment is backed by a quote. If nothing covers the question, it refuses."
> (18–25 s, point at the timer and the cost tile) "All of it in the EU, on Nebius Token Factory. Fifty questions, about twenty seconds, about two cents. The same questionnaire is thirty hours of a senior engineer."
Stop talking when the last row lands. Let the counters sit for two seconds.

**0:50 · Proof (20 s).** Click any green row, then **Open in policy** on its source. The policy opens with the quoted sentence highlighted.
> "Every answer carries a word-for-word quote with section and version, and the code verified that quote exists. No quote, no answer."

**1:10 · The traps (60 s).** Click the **Amber** filter, then the rows. Say only what is on screen.
- An amber row with a 2025 comparison (usually **BCR-08.1** or **BCR-08.3**):
  > "Last year they told a bank *weekly* backups, or *annual* restore tests. The policy now says daily and quarterly. Copying last year's answer, which everyone does, would have been a false statement. We catch it and show both side by side."
- An amber row with two sources (**DSP-16.1** or **IPY-04.1**):
  > "One policy says data is deleted after 30 days, another says 90. The company contradicts itself. We show both paragraphs and refuse to pick silently."
- Click **Red**, open **DSP-18.1**:
  > "Law enforcement requests: no policy covers it. It refuses instead of inventing. Red goes to a human."
- Back to **All**, open **CEK-08.1**:
  > "And when the honest answer is No, it says No, with the source. It is not biased towards sounding good."

**2:10 · Policy update (30 s).** Click **Load updated policy (v2.4)**, then **Run again**. When it finishes, click the **Changed** filter and open a changed row.
> "Policies change. The backup section moved from ten-minute to five-minute log backups. Rerun, and it tells you exactly which answers changed and why: this section went from v2.3 to v2.4. Nobody has to re-read fifty answers."
(While the rerun runs: "Same pipeline, same twenty seconds. Notice the old results stay visible until the new run completes.")

**2:40 · Close (10 s).** Point at the tiles.
> "Forty-nine of fifty correct against an answer key it never saw. Zero invented numbers. Twenty seconds, two cents, versus thirty hours of a senior engineer. Open models, running in the EU."

## If something breaks

- Run stalls or errors: switch to tab A (finished run) and continue from Proof. Do not debug on stage.
- Network is dead: tab C (replay). It looks identical; the footer says "replay". If a judge asks, say it is the recorded run and offer the live one afterwards.
- A trap row is green instead of amber (run-to-run variance): skip it and use the other amber row. There are always amber rows for the policy conflict.

## Likely questions and the answers

- "Is this really live?" Yes: the footer says "Live API · same origin"; the engine feed shows each model call with token counts; `/benchmark` shows the measured run.
- "Why Qwen, why two models?" Measured on the day: the 30B selector answers in 1.1 s at 50 concurrent calls; the 235B as selector fell to 13 s. The 235B writer scored 4.21/5 blind against 2.57 for gpt-oss-120b. Two tiers cut the writer's input by ~70%, which is why it costs cents.
- "Why not GPT?" The questionnaire *is* the company's security architecture. Same tokens on GPT-5 at list price are 27 cents versus 2.5, and the data leaves the EU. A European bank's vendor-risk team asks exactly that question.
- "What if the model is wrong?" It cannot cite a quote that is not in the policy (code check), it cannot answer without a source (red), and every answer is one click from its paragraph. The export carries the flags so a human reviews before anything reaches the bank.
- "Does it store our data?" No. Policies and questionnaire go to Nebius in the EU for inference; the run lives in the browser until exported.
