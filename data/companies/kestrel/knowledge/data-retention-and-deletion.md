---
title: "Data Retention and Deletion Policy"
kind: policy
owner: "Privacy"
updated: "2026-06-01"
---

# Data Retention and Deletion Policy

**Document ID:** POL-PRV-001 | **Version:** 3.3 | **Owner:** Data Protection Officer | **Effective:** 1 June 2026

## 1. Principles

Kestrel Cloud B.V. retains customer data only as long as necessary to deliver the Kestrel Platform under the customer's instructions, and retains its own operational and corporate data only for defined business, legal, or security purposes. Retention periods are documented in the records of processing and enforced technically wherever possible.

## 2. Customer data during the subscription

Customer data (connected source data, modelled datasets, dashboards, exports, and user accounts) is retained for the term of the subscription. Within the platform, tenant administrators control:

- **Source data retention windows:** per connector, from 7 days to unlimited (default: unlimited for modelled data, 90 days for raw ingestion staging).
- **Query and export history:** default 12 months, configurable from 30 days.
- **Kestrel Assist prompt and output logs:** fixed at 30 days for abuse monitoring, then automatically deleted.
- **Record-level deletion:** the Subject Locator tool deletes an individual's records across datasets and propagates to derived tables within 24 hours; deletions are recorded in the audit log.

## 3. Deletion on termination

| Step | Timing after termination date | Detail |
|---|---|---|
| Export window | 0–30 days | Self-service export of all data remains available (CSV, Parquet, or API) |
| Tenant deactivation | Day 30 | Logins disabled; data marked for deletion |
| Primary deletion | By day 30 | All tenant data in Aurora, S3, warehouse, search indexes, and caches deleted by an automated job; the tenant's KMS key is scheduled for deletion |
| Backup purge | By day 65 (30 + 35) | Backups age out of the 35-day retention window; Object Lock prevents earlier deletion but no restore is possible without the tenant KMS key once destroyed |
| Log expiry | 12 months | Operational and audit logs referencing the tenant expire per the logging standard; they contain metadata, not source data |
| Certificate | On request | A deletion certificate signed by the DPO is issued within 10 business days of the backup purge |

Customers can request early deletion (before day 30) in writing; Kestrel then completes primary deletion within 5 business days of the request.

## 4. Data export

Customers can export their data at any time through the admin console (bulk export in CSV or Apache Parquet, delivered to a signed S3 URL valid for 24 hours), the REST API (`/v2/exports`), or a direct warehouse share on Enterprise plans. No fee is charged for export.

## 5. Kestrel operational data

| Data type | Retention | Reason |
|---|---|---|
| Application and security logs (Datadog + S3 archive) | 12 months | Security monitoring, SOC 2 evidence |
| CloudTrail | 24 months | Forensics |
| Bastion session recordings | 12 months | Privileged access audit |
| Customer audit logs (tenant-accessible) | 12 months | Contractual commitment |
| Backups | 35 days rolling | Recovery objectives |
| Support tickets (Intercom) | 3 years after closure | Service quality, dispute resolution |
| Contracts and invoices | 7 years after expiry | Dutch tax and corporate law |
| Employee records | Employment plus 2 years (pay records 7 years) | Dutch employment and tax law |

## 6. Media sanitisation

Kestrel does not operate physical storage media; sanitisation of decommissioned drives is performed by AWS in line with NIST SP 800-88 as described in the AWS SOC 2 report. Corporate laptops are securely erased before reissue or disposal via a certified e-waste partner.

## 7. Verification

Deletion jobs are logged and reconciled monthly; a sample of terminated tenants is verified by the Security team each quarter to confirm no residual data exists. Deletion on termination is a tested SOC 2 control (C1.2) with no exceptions in the FY2025 report.
