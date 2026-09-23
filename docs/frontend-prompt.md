# Prompt for the frontend designer — TenderScale workspace

Paste this into your design tool or coding agent. The backend is finished and deployed; build against the contract in `docs/frontend-spec.md`. `src/components/workspace.tsx` is a working reference implementation of everything below, so you can restyle it or rebuild it.

---

Build the TenderScale workspace: a dark, projector-safe screen where a security lead runs a security questionnaire against their company's policies and reviews the result. Text is never smaller than 16 px on the main table, the timer is the biggest number on screen, the three flag colours (green ready, orange review, red no source) are unmistakable from ten metres, and there is one accent colour. The feeling is a calm, precise instrument, not a chatbot.

**1. Header.** Company name, questionnaire name, the three policies with their versions (InfoSec v4.0, DataProt v3.1, IR/BC v2.3). Right side, in this order: "Upload questionnaire" (CSV; parse it in the browser with `parseQuestionnaire` from `src/lib/csv.ts`, show the questions immediately as pending rows, keep the raw text to send as `csv` with the run; show a "Demo set" link to go back), "Load updated IR/BC v2.4" toggle (turns amber when loaded, sets `policy_set: "updated"`), "Export CSV" (after a run), and the primary "Run" button. While running, the Run button shows the logo mark animating instead of the play icon.

**2. Live run.** Call `POST /api/run` and read the server-sent events. Five big tiles: seconds (client clock while running, then the server's `duration_ms`), answered n/50, tokens, cost with "vs $X on a closed model" as a sub-label, and the flag counts as three coloured dots. Rows are all visible from the start, dimmed; a row brightens to "selecting…" then "writing…" (after its `selected` event) and fills in on its `answer` event with the flag bar on the left, the answer chip, the first two lines of the comment and the first source (`IR/BC §5 v2.3 +1`). Rows must visibly appear one by one.

**3. Engine feed (real time, what the backend is doing).** A collapsible monospace panel at the bottom (open by default during a run, toggle button "Engine" with a line count) that appends one line per `trace` event: `t` in seconds, question id, step (shortlist · select · write · verify · flag, each its own colour), the model that did it (`Qwen3-Embedding-8B`, `Qwen3-30B-A3B`, `Qwen3-235B-A22B`, or "code" for the checks), the detail text from the event, and the step's milliseconds. Auto-scroll to the newest line; keep the last 300. Example lines the backend sends:
- `shortlist · Qwen3-Embedding-8B · 10 candidate sections, 8 past answers (top similarity 0.74)`
- `select · Qwen3-30B-A3B · covered · IR/BC §5, IR/BC §6 · continuity`
- `write · Qwen3-235B-A22B · Yes · 2 quotes · past VQ-06 differs · 212 tokens`
- `verify · code · 2 quotes found in policy text · all numbers quoted`
- `flag · code · ORANGE · Practice changed since the 2025 answer (VQ-06)`

**4. Filters.** All · Ready · Review · No source · Changed (only after a rerun), each with a count. A "Gap list: N questions no policy covers" label when there are red rows.

**5. Answer panel (row click, right side).** Question, answer chip, flag with its reason, the comment, then a "Why" box with the one-sentence rationale (`reasoning`). Below: the sources as quote boxes, each labelled `policy · section · version`, each clickable. For orange with `conflicts`: the two sections side by side with `what_differs`. For orange with `past_answer_consistent === false`: the 2025 answer on the left, the current policy quote on the right. For red: only the fixed message "No source in the current policies covers this question. Needs a human answer."

**6. Source reference → policy viewer (the click that proves the product).** Clicking any source (quote box, conflict box, or the source cell in the table) opens a slide-over on the right (about 640 px, page behind dimmed, click outside or ✕ to close) with the full policy: file name, policy name, version chips (`v2.3 · effective 1 May 2026`, and if a newer version exists `v2.4 · effective 1 October 2026 · 1 section changed` in amber). The cited section is outlined in the accent colour, scrolled into view, and the exact quoted sentence is highlighted (`<mark>`) inside the section text. A "Show what changed in v2.4" toggle re-renders changed sections as a word-level diff: removed words red with strikethrough, added words green, and a "changed in v2.4" badge on the section. Data: `GET /api/policy?short=IR/BC` → `{ policy, sections[], updated: { policy, sections[] } | null }`; the diff is `wordDiff(current.text, updated.text)` from `src/lib/wdiff.ts`.

**7. Changes after a rerun.** Keep the previous run's answers. After the next `done`, compute `diffRuns(previous, current)` (`src/lib/diff.ts`). Rows whose answer, flag or cited section text changed get a "changed" badge; the "Changed" filter shows only those; the panel shows the previous answer and comment above the current one with the reasons (`IR/BC §5 text changed (v2.3 → v2.4)`).

**8. Footer.** One monospace line: `selection: Qwen3-30B-A3B · writing: Qwen3-235B-A22B · embedding: Qwen3-Embedding-8B · Nebius Token Factory · EU · no closed model in the pipeline`.

Do not add: login, chat, settings, marketing copy, tooltips that hide information, or anything that delays the first row appearing. Everything the judge needs to understand should be readable from the back of the room.
