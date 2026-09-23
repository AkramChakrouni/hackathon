---
title: "Penetration Test Summary — Sekura Labs, March 2026"
kind: report
owner: "Security"
updated: "2026-06-01"
---

# Penetration Test Summary — Sekura Labs, March 2026

**Engagement reference:** SL-2026-0311-KC | **Tester:** Sekura Labs (Utrecht, Netherlands; CREST-accredited) | **Fieldwork:** 2–13 March 2026 | **Report issued:** 20 March 2026 | **Retest completed:** 3 April 2026

> A summary letter from Sekura Labs confirming the scope, methodology, findings by severity, and remediation status is available to customers and prospects under NDA. The full technical report is not shared externally.

## Scope

- Kestrel Platform web application (app.kestrelcloud.example) and public REST/GraphQL API (api.kestrelcloud.example), tested from an authenticated perspective with accounts in all five built-in roles across two separate test tenants.
- Kestrel Assist natural-language querying feature, including prompt-injection and data-boundary testing.
- External network perimeter for eu-central-1 and us-east-1 production environments.
- SSO integration flows (SAML 2.0 and OIDC) and SCIM endpoints.
- Data connector framework (PostgreSQL, Snowflake, Salesforce, and HubSpot connectors) for SSRF and credential-handling weaknesses.

Out of scope: social engineering, physical security, denial-of-service, and AWS infrastructure inherited from the cloud provider.

## Methodology

Grey-box testing following the OWASP Web Security Testing Guide v4.2, OWASP API Security Top 10 (2023), and the OWASP LLM Top 10 for the AI feature. Testers received architecture documentation, API specifications, and test credentials, but not source code. Approximately 22 person-days of effort were spent by three testers.

## Findings summary

| Severity | Count | Status |
|---|---|---|
| Critical | 0 | — |
| High | 1 | Fixed and retested |
| Medium | 3 | Fixed and retested |
| Low | 6 | 5 fixed, 1 risk-accepted |
| Informational | 4 | Noted |

### High — Insecure direct object reference on export download endpoint (SL-01)

An authenticated user could request an export file belonging to another tenant by supplying a guessed export ID to `GET /v2/exports/{id}/download`, because the tenancy check was applied on export creation but not on the download path. Export IDs were 128-bit random values, which limited practical exploitability, but the missing check violated Kestrel's tenancy standard. **Fix:** tenancy assertion added to the download handler and to the shared export repository layer; a regression test was added to the tenancy test suite; all export access logs for the preceding 12 months were reviewed with no evidence of cross-tenant access. Fixed on 9 March 2026, within 5 days of notification and well inside the 30-day SLA for high findings. Confirmed fixed on retest.

### Medium (SL-02 to SL-04)

- **SL-02:** Rate limiting on the password-reset endpoint could be bypassed by rotating the `X-Forwarded-For` header. Fix: rate limiting moved to Cloudflare with true client IP.
- **SL-03:** SAML response signature validation accepted a signed assertion wrapped in an unsigned outer response in one legacy IdP compatibility mode. Fix: legacy mode removed; all tenants migrated.
- **SL-04:** Kestrel Assist could be induced by a crafted dataset value to include an unrelated table's column names in its explanation text (within the same tenant). Fix: schema context restricted to tables the user's role can access; output filter added.

### Low (SL-05 to SL-10)

Verbose error message on a GraphQL introspection path, missing `Cache-Control` on one authenticated endpoint, session cookie without `SameSite=Strict` on a legacy path, outdated JavaScript library without known exploitable issues, HTTP TRACE enabled on a health-check listener, and clickjacking protection missing on the embedded dashboard iframe route (risk-accepted with documented compensating controls, as embedding is an intended feature protected by tenant-configured allowlists).

## Comparison with prior year

The March 2025 engagement (also Sekura Labs) found 0 critical, 2 high, 4 medium, and 8 low findings. Both 2025 high findings were fixed within SLA and did not recur.

## Next test

The next annual penetration test is scheduled for March 2027. In addition, a targeted test of the us-east-1 region and new Kestrel Assist capabilities is scheduled for October 2026.
