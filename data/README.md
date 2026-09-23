# Kestrel demo corpus — how this folder works

1. `company.md` — a ~300-word vendor fact sheet injected as system context for every answer. Keep it consistent with everything under `knowledge/`.
2. `knowledge/*.md` — the evidence corpus the engine retrieves from and cites. One document per file, kebab-case filename, 350–700 words, plain Markdown.
3. Every knowledge doc starts with YAML frontmatter: `title`, `kind` (policy | certification | past_answer | product_doc | report), `owner` (Security | Legal | Privacy | Engineering | Sales), `updated` (YYYY-MM-DD).
4. Write facts, not marketing: numbers, dates, tool names, ticket-style specifics. Retrieval and citation quality depend on it.
5. Past-answer files (`kind: past_answer`) hold Q&A pairs formatted as `**Q:** ... **A:** ...`, one pair per paragraph, so they can be chunked per question.
6. `questionnaires/*.csv` — inbound questionnaires with header `id,section,question`; quote any question text that contains commas. IDs are unique per file (Q01.., R01..).
7. To add a doc: drop a new `.md` in `knowledge/` with valid frontmatter and re-run the ingest script; no other registration is needed.
8. Do not add claims the vendor cannot back — deliberate gaps (e.g. certifications not held) are how the demo shows "no evidence found" behaviour.
9. Sensitive topics (incident history, liability, indemnification, pricing) live in the corpus on purpose so the engine can route them for human/legal approval.
10. All names, certificate numbers, and figures are fictional; `kestrelcloud.example` is a reserved example domain.
