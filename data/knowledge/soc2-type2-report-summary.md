---
title: "SOC 2 Type II Report Summary (FY2025)"
kind: certification
owner: "Security"
updated: "2026-06-01"
---

# SOC 2 Type II Report Summary — Report Period 1 January to 31 December 2025

## Engagement overview

Kestrel Cloud B.V. engaged Vandermeer & Holt LLP, an independent CPA firm, to perform a SOC 2 Type II examination of the Kestrel Platform. The report was issued on 27 February 2026 and covers the twelve-month period from 1 January 2025 to 31 December 2025. The examination was performed in accordance with AICPA attestation standards (AT-C section 205) against the 2017 Trust Services Criteria (with 2022 revised points of focus).

Trust services categories in scope:

- **Security** (common criteria CC1–CC9)
- **Availability** (A1.1–A1.3)
- **Confidentiality** (C1.1–C1.2)

Processing Integrity and Privacy were not included in this examination. Privacy commitments are covered instead by the GDPR-aligned DPA and the ISO 27001 ISMS.

## System description

The system description covers the Kestrel Platform production environment on AWS (eu-central-1 primary, eu-west-1 DR, and us-east-1 from Q1 2026 — noted as a subsequent event), the supporting CI/CD pipeline on GitHub, monitoring in Datadog, and the corporate control environment including HR, endpoint management, and vendor management. Subservice organisations (AWS, Cloudflare, Datadog) are presented using the carve-out method; complementary subservice organisation controls (CSOCs) are listed in Section III.

## Auditor's opinion

Vandermeer & Holt LLP issued an **unqualified opinion**: the description fairly presents the system, the controls were suitably designed, and the controls operated effectively throughout the period, with one exception noted below.

## Exceptions

One exception was identified during testing of change management control CC8.1-03 ("All production changes are linked to an approved ticket in the change tracking system").

- **Observation:** Of 25 sampled production changes, 2 lacked a linked change ticket. Both were low-risk configuration changes deployed through the standard pull request process with peer review and passing CI; the omission was the ticket link, not the review.
- **Management response:** Kestrel implemented a CI merge gate in February 2026 that blocks merges to the production branch unless the pull request references a ticket ID matching the `KP-\d+` pattern. A retrospective review of all Q4 2025 changes found no further unlinked changes. Remediation was completed and verified by the CISO on 20 February 2026.
- **Impact:** The auditor concluded the exception did not affect the overall opinion.

## Controls tested (selected)

The report tests 112 controls. A representative sample:

| Criteria | Control | Result |
|---|---|---|
| CC6.1 | SSO with enforced MFA for all workforce accounts | No exceptions |
| CC6.2 | Quarterly access reviews for production and code repositories | No exceptions |
| CC6.6 | Cloudflare WAF and AWS security groups restrict inbound traffic | No exceptions |
| CC6.7 | TLS 1.2+ enforced on all public endpoints | No exceptions |
| CC7.1 | Weekly authenticated Tenable scans; SLA tracking for findings | No exceptions |
| CC7.2 | Datadog alerting to 24/7 on-call rotation | No exceptions |
| CC7.4 | Incident response plan tested via tabletop (February 2025 exercise) | No exceptions |
| CC8.1 | Change tickets linked to all production changes | **1 exception (2/25)** |
| CC9.2 | Annual subprocessor risk review | No exceptions |
| A1.2 | Daily encrypted backups with cross-region copy; semi-annual DR test | No exceptions |
| A1.3 | Backup restoration tested quarterly | No exceptions |
| C1.1 | Per-tenant KMS keys and row-level tenancy | No exceptions |
| C1.2 | Customer data deleted within 30 days of termination | No exceptions |

## Incident disclosure in the report

Section V (Other Information Provided by Management) describes the 19 November 2025 misconfigured S3 bucket event affecting marketing website assets only. The auditor noted it did not involve customer or personal data and did not represent a control failure within the system boundary.

## Distribution

The full report is confidential and is shared with customers and qualified prospects under NDA through the Kestrel Trust Portal. A bridge letter covering 1 January 2026 to the date of request is available from security@kestrelcloud.example. The FY2026 examination is in progress with the same auditor and is expected to be issued by February 2027.
