---
title: "Approved Questionnaire Answers — Q1 2026"
kind: past_answer
owner: "Sales"
updated: "2026-06-01"
---

# Approved Questionnaire Answers — Q1 2026

Submitted January–March 2026; approving team in brackets. Re-verify dates before reuse.

**Q:** Which security certifications and attestations do you hold?
**A:** ISO/IEC 27001:2022 (certificate KC-27001-2024-118, Brightline Certification B.V., valid to 11 March 2027), SOC 2 Type II for 1 Jan–31 Dec 2025 (Vandermeer & Holt LLP; Security, Availability, Confidentiality), and Cyber Essentials Plus (renewed January 2026). *(Security)*

**Q:** Are you PCI DSS compliant?
**A:** PCI DSS is out of scope: the Kestrel Platform does not store, process, or transmit cardholder data. *(Security)*

**Q:** Do you hold FedRAMP authorisation?
**A:** No. FedRAMP applies to US federal agencies and is not applicable to Kestrel's market. *(Security)*

**Q:** Where is our data stored and can we choose the region?
**A:** EU by default: AWS eu-central-1 (Frankfurt) with DR in eu-west-1 (Dublin). US customers can select us-east-1. A tenant's data, backups, and logs never leave its region. *(Engineering)*

**Q:** How is our data segregated from other customers?
**A:** Shared infrastructure with a dedicated AWS KMS encryption key per tenant, per-tenant S3 prefixes, and row-level tenancy enforced in the access layer and by PostgreSQL row-level security. *(Engineering)*

**Q:** Describe encryption at rest and in transit.
**A:** AES-256 at rest via AWS KMS with per-tenant keys rotated annually; TLS 1.2 minimum (1.3 preferred) in transit; mutual TLS between internal services. *(Security)*

**Q:** Do you support SSO and automated provisioning?
**A:** Yes: SAML 2.0 and OIDC (tested with Okta, Entra ID, Google) and SCIM 2.0 provisioning and deprovisioning. *(Engineering)*

**Q:** How do you control staff access to production?
**A:** Only via a bastion with Okta MFA, managed-device posture checks, and full session recording. Just-in-time elevation, no shared accounts, quarterly access reviews. *(Security)*

**Q:** What is your vulnerability remediation SLA?
**A:** Critical 7 days, high 30 days, medium 90 days, low best effort. Weekly Tenable scans, Trivy, Semgrep, quarterly DAST, GitHub Advanced Security. *(Security)*

**Q:** When was your last penetration test and what were the results?
**A:** March 2026 by Sekura Labs (CREST): 0 critical, 1 high (IDOR on export download, fixed in 5 days), 3 medium, 6 low; all retested. Summary letter available under NDA. *(Security)*

**Q:** Do you operate a bug bounty programme?
**A:** Yes, a private programme on Intigriti since 2025. *(Security)*

**Q:** What are your RPO and RTO, and are they tested?
**A:** RPO 1 hour, RTO 4 hours. Semi-annual DR exercises; the 14 May 2026 exercise achieved RTO 2h50m. Backups are daily plus continuous WAL, encrypted, cross-region, 35-day retention. *(Engineering)*

**Q:** What uptime SLA do you offer?
**A:** 99.9% monthly with service credits of 5%, 10%, or 25% depending on the shortfall. *(Sales)*

**Q:** How quickly will you notify us of a data breach?
**A:** Within 48 hours of confirming a personal data breach affecting your data, per the DPA, with details to support your 72-hour regulatory notification. *(Privacy)*

**Q:** How long are audit logs retained and can we access them?
**A:** 12 months, accessible in the admin console and via `GET /v2/audit-events`, with webhook or S3 streaming to your SIEM. *(Engineering)*

**Q:** Do you use customer data to train AI models?
**A:** No. Kestrel Assist uses open-weight models hosted in the EU (Nebius, Finland) with zero data retention; prompts and outputs are never used for training. The feature can be disabled per tenant. *(Privacy)*

**Q:** What happens to our data when the contract ends?
**A:** Self-service export for 30 days, deletion of all tenant data within 30 days, backups purged within a further 35 days, deletion certificate on request. *(Privacy)*

**Q:** Do you carry cyber insurance?
**A:** Yes: cyber liability €5M, professional indemnity €2M, general liability €2.5M, all with Allianz. Certificates available on request. *(Legal)*

**Q:** Will you agree to a liability cap higher than 12 months' fees?
**A:** Our standard cap is 12 months' fees. Increases require Legal approval and are handled in contract negotiation. *(Legal)*

**Q:** Can we audit you on site?
**A:** Yes, once per 12 months with 30 days' notice, or you may rely on our SOC 2 Type II report, ISO 27001 certificate, and penetration test summary. *(Legal)*
