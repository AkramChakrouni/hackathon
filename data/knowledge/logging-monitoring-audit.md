---
title: "Logging, Monitoring, and Audit Trail Standard"
kind: policy
owner: "Security"
updated: "2026-06-01"
---

# Logging, Monitoring, and Audit Trail Standard

**Document ID:** POL-SEC-008 | **Version:** 3.0 | **Owner:** Security | **Effective:** 1 June 2026

## 1. Centralised logging

All production systems forward logs to Datadog (EU site, hosted in eu-central-1) through the Datadog agent on EKS nodes and native AWS integrations. Sources include application logs from every service, Kubernetes audit logs, AWS CloudTrail (all regions, organisation trail), VPC Flow Logs, AWS GuardDuty findings, Cloudflare WAF and access logs, Okta system logs, GitHub audit logs, CrowdStrike detections, and bastion session recordings. Logs are shipped within seconds and are immutable once indexed.

**Retention:** 12 months hot in Datadog for search and alerting, plus an archived copy in an S3 bucket with Object Lock for the same 12-month period. CloudTrail logs are additionally retained for 24 months for forensic purposes.

**Protection:** log pipelines apply Datadog sensitive-data scanner rules that redact credentials, tokens, and known PII patterns (email, IBAN, national ID formats) before indexing. Access to Datadog is via Okta SSO with MFA, and log access is itself logged.

**Time synchronisation:** all hosts use Amazon Time Sync Service; log timestamps are recorded in UTC.

## 2. Security monitoring and alerting

Datadog Cloud SIEM applies detection rules to the log stream, supplemented by AWS GuardDuty and CrowdStrike. Approximately 140 detection rules are active, mapped to MITRE ATT&CK, including:

- Impossible travel or new-country login for workforce accounts
- Privilege escalation in AWS IAM or Kubernetes RBAC
- Root account usage (never expected; alerts immediately)
- Modifications to KMS key policies, S3 bucket policies, or security groups
- Bulk data export volume exceeding a tenant's 30-day baseline by 5x
- Repeated authentication failures against a tenant
- Disabled EDR agent or MDM enrolment loss on an endpoint

Alerts are routed by severity through PagerDuty to the 24/7 on-call rotation (security and SRE). Target acknowledgement is 15 minutes for high-severity alerts; measured median in Q1 2026 was 6 minutes. Alert tuning is reviewed fortnightly to keep false positives below 20%.

## 3. Availability and performance monitoring

Datadog APM, infrastructure metrics, and synthetic checks from six global locations monitor the platform every 60 seconds. SLO dashboards track availability (target 99.9%), API p95 latency (target under 400 ms), and ingestion pipeline freshness. The public status page (status.kestrelcloud.example) is driven by these checks and by manual incident updates.

## 4. Customer-facing audit logs

Every tenant has access to an immutable audit log covering:

- Authentication events (login success and failure, SSO assertions, MFA changes, API token creation and revocation)
- User and role administration (invitations, role assignments, SCIM changes)
- Data source configuration (connector added, credentials rotated, sync schedule changed)
- Data access events (dashboard viewed, query executed, export created and downloaded, Kestrel Assist prompts)
- Configuration changes (retention settings, IP allowlist, SSO settings)

Each entry records the actor, tenant, timestamp (UTC), source IP, user agent, action, target object, and outcome. Audit logs are available in the admin console (Settings → Audit Log) with filtering and CSV export, and through the `GET /v2/audit-events` API endpoint with cursor pagination. Retention is 12 months; customers can stream events continuously to their own SIEM via the audit webhook or an S3 delivery integration. Audit logs cannot be edited or deleted by tenant users, including Owners.

## 5. Kestrel staff access logging

All access by Kestrel personnel to customer data is logged with the ticket reference that authorised it. Customers can request a report of staff access to their tenant for any period within the 12-month retention window; the report is generated from the bastion session index and the audited query proxy and is typically delivered within 5 business days.

## 6. Review and testing

Detection rules are tested through quarterly purple-team exercises using Atomic Red Team scenarios; the last exercise (April 2026) validated 32 of 34 tested techniques, with two new rules added. Log integrity and retention are verified during the annual internal audit and are SOC 2 controls CC7.2 and CC7.3, tested without exception.
