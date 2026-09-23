---
title: "Kestrel Assist: AI Features Governance"
kind: product_doc
owner: "Engineering"
updated: "2026-06-01"
---

# Kestrel Assist: AI Features Governance

## 1. What Kestrel Assist is

Kestrel Assist is an optional natural-language interface to the Kestrel Platform, released to general availability in February 2026. Users can ask questions such as "What was churn by region last quarter?" and receive a generated query, a chart, and a plain-language explanation. Assist also suggests dashboard descriptions and explains transformation logic. It does not take autonomous actions: it never modifies data, models, permissions, or connectors, and every generated query is shown to the user before it runs.

## 2. Model hosting and data flow

Assist uses **open-weight large language models** (currently Llama-family and Mistral-family models) served by **Nebius B.V.** from a data centre in Finland, inside the EU. This ensures no customer data leaves the EU.

Contractual and technical guarantees with Nebius:

- **Zero data retention:** prompts and completions are processed in memory and are not stored, logged, or retained by Nebius after the response is returned. This is a written term in the Nebius agreement, verified during vendor due diligence in January 2026.
- **No training:** neither Kestrel nor Nebius uses customer prompts, data, or outputs to train, fine-tune, or evaluate models.
- **Transport:** mutual TLS over a dedicated egress path from eu-central-1, restricted by AWS Network Firewall.
- **US region:** tenants hosted in us-east-1 currently use the same EU inference endpoint; the prompt contains schema metadata and the user's question, not source data rows (see below).

## 3. What data reaches the model

For each request, the orchestration service assembles a prompt consisting of: the user's question, the schema of tables and columns that the user's role is permitted to access (names, types, descriptions), a small number of sample values only for columns not tagged as sensitive, and the conversation history for the session. Full result sets are not sent to the model; the generated query executes inside the platform under the user's permissions and results are rendered locally. Where an explanation of results is requested, at most 50 aggregated rows are included. Columns classified as PII, financial, or restricted by tenant data classification rules are excluded from sample values and can be excluded from schema context entirely.

## 4. Tenant controls

- **Enable/disable per tenant:** Owners can turn Assist off entirely in Settings → AI Features; it is **off by default** for new Enterprise tenants and must be explicitly enabled.
- **Role-based access:** Assist can be limited to specific roles or workspaces.
- **Data classification exclusions:** tenants tag sensitive columns to exclude them from prompts.
- **Audit:** every Assist prompt, generated query, and execution is recorded in the tenant audit log with the user identity.

## 5. Logging and retention

Kestrel logs Assist prompts and outputs in its own EU-hosted Datadog environment for **30 days** for abuse monitoring, safety, and debugging, after which they are automatically deleted. These logs are subject to the same access controls as all customer data: access requires a ticket and is recorded. Tenants who disable Assist generate no logs.

## 6. Safety and quality controls

- **Prompt-injection defences:** schema context is restricted to permitted objects; generated SQL is validated against an allowlist grammar (read-only SELECT statements, no DDL/DML) and executed with the user's permissions. The March 2026 penetration test included OWASP LLM Top 10 testing; one medium finding (SL-04) on cross-table schema leakage within a tenant was fixed.
- **Output filtering:** responses are screened for hallucinated column names and for content violating the acceptable use policy.
- **Evaluation:** a regression suite of 1,200 question-answer pairs across synthetic datasets runs on every prompt or model change, with a minimum accuracy threshold of 92% before release.

## 7. Compliance

A Data Protection Impact Assessment for Kestrel Assist was completed by the DPO in January 2026 and concluded that residual risk is low given EU hosting, zero retention, and tenant controls. Under the EU AI Act, Assist is assessed as limited-risk; in-product disclosure states that responses are AI-generated. Nebius was added to the subprocessor list with 30 days' notice on 14 January 2026.
