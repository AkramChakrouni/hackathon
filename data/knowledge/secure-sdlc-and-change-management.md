---
title: "Secure SDLC and Change Management"
kind: policy
owner: "Engineering"
updated: "2026-06-01"
---

# Secure Software Development Lifecycle and Change Management

**Document ID:** POL-SEC-005 | **Version:** 4.1 | **Owner:** VP Engineering | **Effective:** 1 June 2026

## 1. Overview

All software and infrastructure changes to the Kestrel Platform follow a single, auditable path from design to production. The process is aligned with OWASP SAMM and ISO/IEC 27001:2022 controls A.8.25–A.8.32, and is tested annually in the SOC 2 Type II examination (CC8.1). Approximately 1,900 production changes were deployed in 2025 with a change failure rate of 2.3% and a median lead time of 1.4 days.

## 2. Design phase

- Features that touch authentication, authorisation, tenancy boundaries, encryption, data export, or new external integrations require a **security design review** documented in a Design Doc with a threat model (STRIDE-based). The Security team reviews within 5 business days.
- Privacy impact is assessed by the DPO for features processing new categories of personal data (DPIA when required under GDPR Article 35).

## 3. Development standards

- Code is written against Kestrel's Secure Coding Guidelines, derived from the OWASP ASVS Level 2 and covering input validation, output encoding, parameterised queries, tenancy checks on every data access path, and secrets handling.
- All engineers complete secure coding training at onboarding and annually (Secure Code Warrior), with role-specific modules for backend, frontend, and infrastructure.

## 4. Source control and review

The platform is developed in a GitHub Enterprise organisation with SSO and MFA enforced. Branch protection on all production repositories requires:

1. A pull request; direct pushes to `main` are blocked for everyone, including administrators.
2. At least one approving review from a code owner who is not the author (two for repositories tagged `tier-1`, such as the authentication and tenancy services).
3. All required CI checks passing.
4. A linked ticket reference (`KP-nnnn`) in the PR body, enforced by a merge gate added in February 2026 following the SOC 2 exception.
5. Signed commits (GPG or SSH) for all contributors.

## 5. CI gates

Every pull request runs the following before it can merge:

| Gate | Tool | Failure threshold |
|---|---|---|
| Unit and integration tests | GitHub Actions, pytest / vitest | Any failure |
| Static analysis | Semgrep (OWASP + Kestrel rules) | High or critical finding |
| Dependency vulnerabilities | GitHub Advanced Security / Dependabot | High or critical without exception ticket |
| Secret detection | GitHub secret scanning, push protection | Any secret |
| Container scan | Trivy | Critical CVE with fix available |
| Infrastructure policy | Checkov and OPA on Terraform plans | Any policy violation |

Container images are built once, signed with Sigstore cosign, and promoted between environments unchanged; the EKS admission controller rejects unsigned images.

## 6. Environments and deployment

Changes progress through **development → staging → production**. Staging mirrors production infrastructure (Terraform, same modules) with synthetic data only; customer data is never copied to non-production environments. Deployment to production is performed by Argo CD via progressive rollout (10% → 50% → 100% of pods) with automated rollback on error-rate or latency regression detected by Datadog within 15 minutes. Database migrations are backward-compatible with a documented rollback.

## 7. Change classification and approval

| Class | Examples | Approval |
|---|---|---|
| Standard | Application code, feature-flagged releases, dependency updates | PR review + CI (pre-approved) |
| Normal | Infrastructure changes, schema migrations, new subprocessor integrations | PR review + engineering manager |
| High-risk | Changes to authentication, KMS, tenancy enforcement, network boundaries, DR configuration | Change Advisory Board (CAB) |
| Emergency | Security patches for actively exploited vulnerabilities, incident containment | Incident commander + CISO, retrospective CAB review within 3 business days |

The CAB meets weekly (Tuesdays) with the VP Engineering, CISO, and SRE lead, and reviewed 64 high-risk changes in 2025.

## 8. Infrastructure as code

All AWS infrastructure is defined in Terraform and applied only by CI (Atlantis) after plan review; console changes are detected by nightly drift detection and reverted or codified.

