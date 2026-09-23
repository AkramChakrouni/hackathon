---
title: "Incident Disclosure: Misconfigured S3 Bucket, 19 November 2025 (INC-2025-014)"
kind: report
owner: "Security"
updated: "2026-06-01"
---

# Incident Disclosure: Misconfigured S3 Bucket, 19 November 2025

**Reference:** INC-2025-014 | **Severity:** Sev-3 (initially triaged Sev-2) | **Status:** Closed | **Classification:** Security incident, not a personal data breach

> **Handling note:** This document describes Kestrel's only customer-notified security incident to date. Questionnaire answers that reference incident history must be reviewed by the Security team before submission, and detailed disclosure should be made under NDA.

## Summary

On 19 November 2025, an Amazon S3 bucket used to host static assets for the Kestrel marketing website (images, fonts, PDF brochures, and compiled JavaScript) was configured to allow public listing of its contents for approximately 31 hours. The bucket contained no customer data, no personal data, and no credentials or source code. The issue was discovered by Kestrel's own internal scanning, remediated within 6 hours of discovery, and disclosed proactively to all customers on 21 November 2025.

## Timeline (UTC)

| Time | Event |
|---|---|
| 18 Nov 2025, 14:12 | Marketing engineer deploys a new asset bucket (`kc-web-assets-prod`) via the internal `s3-static-site` Terraform module |
| 18 Nov 2025, 14:20 | Deployment completes; bucket policy allows `s3:ListBucket` to `*` due to a module default intended for a public-website use case |
| 19 Nov 2025, 21:05 | Weekly AWS configuration audit (Tenable + custom AWS Config rule `s3-no-public-list`) flags the bucket |
| 19 Nov 2025, 21:14 | On-call security engineer acknowledges the alert and opens INC-2025-014; initial triage Sev-2 pending content review |
| 19 Nov 2025, 21:40 | Public listing disabled; bucket policy replaced with CloudFront-only access |
| 19 Nov 2025, 23:30 | Full inventory of the 1,482 objects completed; confirmed all objects were already publicly served website assets; no customer, personal, or confidential data. Severity reduced to Sev-3 |
| 20 Nov 2025, 03:00 | S3 server access logs and CloudTrail reviewed: 3 `ListBucket` calls from 2 IP addresses, both attributed to internet-wide scanners; no evidence of targeted access |
| 20 Nov 2025, 10:00 | DPO assessment: no personal data involved, no GDPR Article 33 notification required |
| 21 Nov 2025, 09:00 | Proactive notification sent to all customer security contacts |
| 19 Dec 2025 | Incident closed |

Total exposure window: approximately 31 hours (18 Nov 14:20 to 19 Nov 21:40). Time from discovery to remediation: 35 minutes for containment, 6 hours to full verification.

## Impact assessment

- **Customer data:** none. The bucket is entirely separate from the platform's data plane, which lives in a different AWS account with per-tenant KMS encryption.
- **Personal data:** none. The objects were public marketing materials.
- **Confidential data:** none. Verified by object-by-object inventory.
- **Availability:** no service impact.
- **Regulatory:** no notification obligation under GDPR; the DPO's assessment is on file.

## Root cause

The `s3-static-site` Terraform module, written in 2022 for the original public website, defaulted `allow_public_list = true`. The module was reused for a new bucket without overriding the default. Policy-as-code checks at the time verified object-level public access but not bucket listing.

## Remediation and preventive actions

1. **S3 Block Public Access** enabled at the AWS Organization level for all accounts (completed 20 November 2025). The marketing site now serves exclusively through CloudFront with origin access control.
2. **Policy-as-code:** a new Checkov/OPA rule (`KC-S3-004`) fails any Terraform plan that grants `s3:ListBucket` to a wildcard principal; enforced in CI since 25 November 2025.
3. **Module fix:** `allow_public_list` default changed to `false`; module version 2.0 released and all consumers upgraded.
4. **Detection speed:** the `s3-no-public-list` AWS Config rule was moved from weekly evaluation to continuous evaluation with immediate paging.

## Disclosure

Although no notification was legally or contractually required, Kestrel informed all customers on 21 November 2025 as a transparency measure, describing the scope, the absence of customer data impact, and the corrective actions. The incident is also described in Section V of the FY2025 SOC 2 Type II report. Kestrel has had no other customer-notified security incidents since founding in 2019.
