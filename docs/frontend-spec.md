# TenderScale — frontend contract

Backend is stable. `src/components/workspace.tsx` implements all five screens against this contract and can be restyled or replaced.

## Bootstrap — `GET /api/meta`
```ts
{ company: "Personivo B.V.",
  policies: { short: "InfoSec"|"DataProt"|"IR/BC"; name; version; effective; sections: number }[],
  updated_policies: { short; name; version; effective }[],      // the prepared v2.4 file(s) for the diff demo
  past_answers: 30,
  questionnaire: { name; header: string[]; questions: { id; text; position }[] },
  models: { selection; writing; embedding; provider; prices } }
```

## Run — `POST /api/run` body `{ policy_set: "current" | "updated", csv?: string, name?: string }` → `text/event-stream`
`csv` is the raw text of an uploaded questionnaire (needs a `question` column; id from `question_id`/`id`/`ref`; max 300 rows). Parse it in the browser too, with `parseQuestionnaire` from `src/lib/csv.ts`, to show the rows before the run starts.
Read with fetch + ReadableStream, split on `\n\n`, each line `data: <Event>`:
```ts
| { type: "start";    run: RunMeta }
| { type: "selected"; question_id; selection: { category; relevant_sections: string[]; relevant_past_answers: string[]; coverage: "covered"|"partial"|"none" }; ms }
| { type: "trace";    question_id; step: "shortlist"|"select"|"write"|"verify"|"flag"; model?; detail; ms; t }   // engine feed, one line per step
| { type: "answer";   answer: Answer }            // final for that row → append the row
| { type: "metrics";  run: RunMeta }              // every 250 ms
| { type: "done";     run: RunMeta; answers: Answer[] }
| { type: "error";    message }

RunMeta = { run_id; policy_set; policy_versions: {InfoSec:"4.0",...}; model_small; model_large; duration_ms; input_tokens; output_tokens; cost_usd; baseline_cost_usd; done; total; flags: {green,orange,red}; status }
Answer  = { question_id; answer: "Yes"|"No"|"Unknown"; ssrm_ownership; comment; flag: "green"|"orange"|"red"; flag_reason;
            sources: { section_id: "IR/BC §5"; policy; version; quote; text_hash; repaired? }[];
            conflicts: { section_a; section_b; what_differs }[];
            past_answer: { ref; question; answer; comment } | null; past_answer_consistent: boolean | null;
            category; coverage; confidence; checks: { quotes_valid; quotes_dropped; numbers_unverified: string[] };
            input_tokens; output_tokens; latency_ms; selection_ms }
```

## Policy — `GET /api/policy?short=InfoSec|DataProt|IR/BC`
`{ policy: { short; name; version; effective; file }, sections: { id; number; title; text; hash; version }[], updated: { policy, sections } | null }` — `updated` is the prepared newer version when one exists; diff sections with `wordDiff` (`src/lib/wdiff.ts`) where `hash` differs.

## Screens
1. **Start**: company + questionnaire name, policies with versions, "Load updated IR/BC v2.4" toggle (sets `policy_set`), Run.
2. **Results**: rows stream in as `answer` events arrive (rows without an answer are dimmed; after `selected` show "writing…"). Columns: flag bar (left, green/orange/red), ID, question, answer chip, comment, first source (`IR/BC §5 v2.3 +1`). Top: big timer (client clock until `done`, then `run.duration_ms`), done/total, tokens, cost with `baseline_cost_usd` next to it, flag counts. Filters: all · green · orange · red · changed. Export CSV: original columns with answer/comment filled + flag, flag_reason, sources.
3. **Answer panel** (row click): question, answer chip, flag + `flag_reason`, comment, sources as quote boxes (`policy · section · version`). Orange with `conflicts` → the two sections side by side with `what_differs`. Orange with `past_answer_consistent === false` → 2025 answer vs current policy quote side by side. Red → comment only ("No source in the current policies covers this question. Needs a human answer.").
4. **Changes**: keep the previous run's answers in state; after the next `done`, `diffRuns(previous, current)` (`src/lib/diff.ts`, pure, or `POST /api/diff`) → `{ question_id, changed, reasons, previous }`. Show a "changed" badge, a "Changed" filter, and in the panel the previous answer/comment above the current one with the reasons (`answer Yes → No`, `IR/BC §5 text changed (v2.3 → v2.4)`).
5. **Gaps**: all red answers with the fixed message; count in the filter bar; export.
6. **Engine feed**: collapsible monospace panel fed by `trace` events (time, question, step, model, detail, ms); open during a run, auto-scroll, keep the last 300 lines.
7. **Policy viewer**: opened from any source reference; full policy, cited section outlined and scrolled into view, quote highlighted, version chips, "show what changed" word diff. See `docs/frontend-prompt.md` §6.

## Feel
Dark, projector-safe: text ≥ 16 px, three flag colours clearly distinct, the timer is the biggest number on screen, rows visibly appear one by one, no small grey paragraphs. One accent colour. Quotes are the hero of the answer panel.
