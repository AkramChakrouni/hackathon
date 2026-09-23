---
title: "Backup, Disaster Recovery, and Business Continuity Plan"
kind: policy
owner: "Engineering"
updated: "2026-06-01"
---

# Backup, Disaster Recovery, and Business Continuity Plan

**Document ID:** POL-SEC-007 | **Version:** 6.0 | **Owner:** VP Engineering | **Effective:** 1 June 2026

## 1. Objectives

| Metric | Target | Last measured |
|---|---|---|
| Recovery Point Objective (RPO) | 1 hour | 4 minutes (WAL lag at test time) |
| Recovery Time Objective (RTO) | 4 hours | 2 hours 50 minutes (14 May 2026 exercise) |
| Monthly availability SLA | 99.9% | 99.98% (trailing 12 months to May 2026) |
| Backup retention | 35 days | — |

## 2. Backup strategy

- **Aurora PostgreSQL (tenant metadata and application data):** automated daily full snapshots at 02:00 UTC plus continuous write-ahead log (WAL) shipping enabling point-in-time recovery to any second within the 35-day window.
- **Analytics warehouse and object storage (S3):** versioning enabled; daily incremental backups; lifecycle rules retain deleted object versions for 35 days.
- **Configuration and infrastructure:** all infrastructure is Terraform code in GitHub; state is stored in S3 with versioning and DynamoDB locking. Secrets in AWS Secrets Manager are replicated to the DR region.
- **Encryption:** every backup is encrypted with the same per-tenant AWS KMS keys as primary data. Cross-region copies in eu-west-1 use replica keys.
- **Cross-region copy:** snapshots and S3 objects are replicated to eu-west-1 (Dublin) within 15 minutes. For US customers on us-east-1, the DR copy is held in us-west-2.
- **Immutability:** backup buckets use S3 Object Lock in compliance mode for the 35-day retention period, protecting against deletion by a compromised administrator or ransomware.

## 3. Restoration testing

Restores are tested quarterly by the SRE team: a random tenant's data is restored to an isolated environment from a point-in-time within the last 7 days, checksummed against production, and the result recorded in the operations log. The last four tests (Aug 2025, Nov 2025, Feb 2026, May 2026) all succeeded, with a median restore time of 38 minutes for a 400 GB tenant. Restore testing is a control in the SOC 2 Type II report (A1.3) with no exceptions.

## 4. Disaster recovery architecture

The platform runs active in eu-central-1 across three Availability Zones. A warm standby exists in eu-west-1: Aurora Global Database replication (typical lag under one second), replicated S3 buckets, pre-provisioned Kubernetes (EKS) clusters scaled to 20% capacity, and DNS failover through Cloudflare with 60-second TTL. Failover is initiated by the incident commander through a documented runbook (`RB-DR-001`) and takes approximately 45 minutes of automation plus verification.

DR scenarios covered: loss of a single AZ (automatic), loss of the primary region (manual failover), logical data corruption (point-in-time restore), and loss of CI/CD or identity provider (break-glass procedures).

## 5. DR testing

Full DR exercises are run semi-annually. The most recent exercise on **14 May 2026** simulated complete loss of eu-central-1 and included a full failover of production traffic to eu-west-1 for 3 hours before failing back. Results: RTO achieved 2 hours 50 minutes (target 4 hours); RPO achieved 4 minutes; two follow-up actions raised (automate Cloudflare origin switch, pre-warm warehouse cache), both completed by 12 June 2026. A summary report of each exercise is available to customers on request.

## 6. Business continuity

Business continuity planning covers people, premises, and suppliers:

- **People:** on-call rotation of 22 engineers across Amsterdam and Lisbon; no single point of failure for any critical role; documented succession for CISO and VP Engineering.
- **Premises:** offices are not required for platform operation; all staff can work remotely with managed devices, and both offices have independent internet and power.
- **Suppliers:** critical suppliers (AWS, Cloudflare, Datadog, GitHub, Okta) are assessed annually; contingency plans exist for each, including a documented procedure to operate without Datadog for up to 72 hours using CloudWatch.

## 7. Customer communication

During a declared disaster, updates are posted to the public status page (status.kestrelcloud.example) at least every 60 minutes and emailed to registered tenant contacts.

## 8. Review

This plan is reviewed annually and after every DR exercise or major incident. The last review was completed on 28 May 2026.
