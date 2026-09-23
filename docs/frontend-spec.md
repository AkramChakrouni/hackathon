# Attest — frontend spec

Backend is done and stable. Build the UI against the contract below; the placeholder UI in
`src/components/workspace.tsx` implements every state and can be read as a reference or replaced wholesale.

## Feel

Secure, high-end, calm. Dark (`#0b0d10` ink, `#111418` panels, `#1f242b` lines, `#e6e9ee` text,
`#6b7684` muted), one accent (`#7dd3fc`), semantic `ok #34d399 / warn #fbbf24 / bad #f87171`.
Dense data-tool layout (Linear × Vanta × a trading terminal), monospace for every number, id and
model name, tabular figures, thin 1px lines, no cards-with-shadows, no gradients. Motion is
information: rows rise in as events arrive (250 ms), a blinking caret while text streams, counters
tick every frame, stage dots pulse while running and turn green with their timing when done.
The demo is 60 seconds: the screen must look alive from the first 300 ms and calm when finished.

## Screens

1. **Workspace** `/` — the demo. Left rail (knowledge base, questionnaires, engine), header
   (questionnaire name, prospect, count, primary action), pipeline strip + live metrics, optional
   prospect brief card, answers table, completion footer.
2. **Benchmark** `/benchmark` — server-rendered from `data/benchmark.json`; table + tiles. Keep the
   existing page or restyle; data shape is in `scripts/benchmark.ts` (`out`).
3. **Pitch** `/pitch.html` — static deck, separate.

## Bootstrap data

`GET /api/meta` →
```ts
{ company: string;
  stats: { docs: number; chunks: number; dims: number };
  models: { classifier: string; synthesizer: string; embedding: string };
  questionnaires: { slug: string; name: string; prospect: string; questions: Question[] }[] }
```
`Question = { id: string; section: string; text: string }`

## Running a questionnaire

`POST /api/run` body: `{ slug }` for a bundled questionnaire, or `{ questions: Question[], prospect?: string }`
for a user-supplied one (CSV parsed client-side: header `id,section,question`).
Response is `text/event-stream`; read with `fetch` + `ReadableStream`, split on `\n\n`, each line
`data: <json Event>`. Abort with `AbortController` on re-run or navigation.

```ts
type Event =
  | { type: "stage"; stage: "classify"|"retrieve"|"synthesize"|"brief"; status: "start"|"done"; ms?: number }
  | { type: "classified"; id; category: Category; risk: "low"|"medium"|"high"; reason: string }
  | { type: "retrieved";  id; citations: Citation[] }          // arrives ~0.5–1 s, before any text
  | { type: "delta";      id; text: string }                   // streamed answer text, append
  | { type: "answer";     answer: Answer }                     // final for that id (replace text)
  | { type: "flag";       id; flag; reason }                   // late escalation from triage; update that answer's badge
  | { type: "brief";      prospect; summary: string; sources: { title; url }[] }
  | { type: "metrics";    metrics: Metrics }                   // every 250 ms while drafting
  | { type: "done";       runId: string; metrics: Metrics }
  | { type: "error";      message: string };

Citation = { chunk: number; doc: string; title: string; score: number }   // score = cosine similarity
Answer   = { id; text; confidence: 0..1; citations: Citation[]; flag: "none"|"needs_approval"|"no_evidence"; reason?: string; latencyMs: number }
Metrics  = { elapsedMs; usage: { model; input; output; cost }[]; cost; baselineCost; done; total; flagged }
Category = company|compliance|security|access|infrastructure|appsec|incident|privacy|legal|commercial|ai
```

Stage semantics: `classify` (Qwen3-235B-A22B, triage) and `retrieve` (Qwen3-Embedding-8B embeddings + in-memory
cosine) run **in parallel** and finish within ~1 s; `synthesize` (Qwen3-235B-A22B) streams all
questions concurrently, 2 per call; `brief` (Tavily + 70B) runs on the side and never blocks.

## Row state machine (one row per question, keyed by id)

pending (dimmed) → **classified** (category chip + "high risk" chip if risk=high)
→ **retrieved** (citation chips `[1] Doc title` ×3, tooltip = similarity)
→ **streaming** (`delta`s append; caret)
→ **answered** (`answer`: replace text; show confidence bar 0–1 coloured ok>0.75 / warn>0.5 / bad;
status badge; reason line; per-row latency; Approve + Edit controls)
→ approved | edited (client-only; edited replaces text; approval toggles).

Status badge by `flag`:
- `none` → "Ready to send" (ok)
- `needs_approval` → "Needs approval" (bad, shield icon) — legal/incident/commercial commitment
- `no_evidence` → "No evidence · SME" (warn, triangle icon) — knowledge base does not cover it

Citations shown on a row are `answer.citations` once answered (the ones the model actually used),
else the retrieved ones.

## Live metrics (header strip, monospace, tabular)

- elapsed — client clock from click until `done` (accent while running; freeze on done)
- answered — `done/total`
- flagged — count with flag ≠ none (warn if > 0)
- tokens — Σ usage input+output
- cost · nebius — `metrics.cost` (ok), 4 decimals under $0.01
- same run · closed baseline — `metrics.baselineCost` (bad): identical token volume at the closed model's list price
- completion footer: "50 answers drafted in 6.2s · 9 need a human · $0.041 vs $1.65 on <baseline> (40× cheaper)" and
  "Manual baseline for a questionnaire this size: 20–40 hours".

Pipeline strip: four dots (Triage · Retrieve · Draft · Brief), idle grey / pulsing accent / green with `ms/1000` s.

## Left rail

Knowledge base: company name, docs / chunks / dims from `stats`, one line of doc kinds.
Questionnaires: list, selected state, `from <prospect> · N questions`; "+ New from CSV" (file input or paste).
Engine: the three model ids (short form after `/`), "Nebius Token Factory · EU · zero retention".

## Actions

- Primary: "Draft all answers" (disabled while running; label "Drafting…"; afterwards "Draft again").
- Export CSV (client-side blob): `id,section,question,answer,confidence,sources,status,flag`.
- Approve / Edit per row. Approved rows are the only ones a real export would mark final.

## Performance notes

Deltas arrive for ~25 rows at once; batch state updates per animation frame (or use a ref map +
`useSyncExternalStore`) so 50 streaming cells never drop frames. No virtualisation needed (≤200 rows).
Never block on `brief`. Handle `error` by showing the message inline and re-enabling the button.
