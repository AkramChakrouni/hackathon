---
title: "Kestrel Platform Security Overview"
kind: product_doc
owner: "Security"
updated: "2026-06-01"
---

# Kestrel Platform Security Overview

This overview summarises the security programme protecting the Kestrel Platform and the corporate environment of Kestrel Cloud B.V. It is maintained by the Security team under the CISO, Tom Aldridge, and is reviewed at least annually. Detailed policies and evidence are referenced throughout and available under NDA.

## Governance and assurance

Kestrel operates an Information Security Management System (ISMS) certified against ISO/IEC 27001:2022 (certificate KC-27001-2024-118, Brightline Certification B.V., valid until 11 March 2027). The scope covers the Kestrel Platform and supporting corporate IT. An independent SOC 2 Type II examination by Vandermeer & Holt LLP covers the period 1 January to 31 December 2025 against the Security, Availability, and Confidentiality trust services criteria. Kestrel also holds Cyber Essentials Plus (UK), renewed in January 2026.

Kestrel does not hold FedRAMP (not applicable to our market), does not offer a HIPAA Business Associate Agreement, and is out of scope for PCI DSS because the platform never processes cardholder data. ISO/IEC 27017 and 27018 extensions are on the roadmap for 2027.

## Infrastructure

The platform runs on AWS in eu-central-1 (Frankfurt) with disaster recovery in eu-west-1 (Dublin). A us-east-1 deployment is available on request for US customers since Q1 2026. Environments are defined as Terraform code, segmented into VPCs with private subnets, and protected by Cloudflare WAF and DDoS mitigation at the edge and AWS GuardDuty for intrusion detection. Databases are never exposed to the internet.

## Data protection

All customer data is encrypted at rest with AES-256 using AWS KMS, with a dedicated KMS key per tenant, and in transit with TLS 1.2 or higher (TLS 1.3 preferred). Keys are rotated annually. Tenants share infrastructure but are isolated by per-tenant keys and row-level tenancy enforced in the data access layer. Secrets are held in AWS Secrets Manager.

## Identity and access

Customers authenticate through SAML 2.0 or OIDC single sign-on (Okta, Microsoft Entra ID, Google Workspace) with SCIM provisioning. MFA is enforced for every Kestrel employee and can be enforced per tenant. Role-based access control provides five built-in roles plus custom roles. Production access is only possible through a bastion host with MFA and full session recording; there are no shared accounts, and access is reviewed quarterly.

## Secure engineering

Every change reaches production through a pull request with mandatory peer review, CI gates (Semgrep SAST, Trivy container scanning, GitHub Advanced Security dependency and secret scanning), and a staging environment. High-risk changes go through a Change Advisory Board. Weekly authenticated vulnerability scans run on Tenable; DAST is performed quarterly. Remediation SLAs are 7 days for critical, 30 for high, and 90 for medium findings. An independent penetration test is performed annually; the March 2026 test by Sekura Labs found no critical issues and one high-severity issue, fixed within five days. A private bug bounty programme has run on Intigriti since 2025.

## Operations and resilience

Logs and metrics are centralised in Datadog with 12-month retention and SIEM-style alerting to a 24/7 on-call rotation. Customers can access their own audit logs via the UI and API. Backups run daily with continuous WAL shipping, are encrypted, copied cross-region, and retained for 35 days. Recovery objectives are RPO 1 hour and RTO 4 hours; the semi-annual DR exercise on 14 May 2026 achieved an RTO of 2 hours 50 minutes. The uptime SLA is 99.9% per month with service credits, and a public status page is maintained.

## People and privacy

Employees undergo background checks where legally permitted, sign confidentiality agreements, and complete security awareness training at onboarding and annually, with quarterly phishing simulations. Endpoints are managed by Jamf and Intune with full-disk encryption and CrowdStrike EDR. A Data Protection Officer (Elena Rossi) is appointed; the standard DPA includes Standard Contractual Clauses, data resides in the EU by default, and customer data is never used to train AI models.

For questions contact security@kestrelcloud.example.
