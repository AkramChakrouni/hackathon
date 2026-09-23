---
title: "Approved Questionnaire Answers — Q4 2025"
kind: past_answer
owner: "Sales"
updated: "2026-06-01"
---

# Approved Questionnaire Answers — Q4 2025

Submitted October–December 2025; approving team in brackets. Prefer the Q1 2026 set where a newer answer exists.

**Q:** Provide a brief company overview.
**A:** Kestrel Cloud B.V., founded 2019, Amsterdam HQ with engineering in Amsterdam and Lisbon, ~180 employees, ~320 mid-market and enterprise customers in the EU and UK. Profitable since 2025; €28M Series B in 2024; no debt. *(Sales)*

**Q:** Who is responsible for information security in your organisation?
**A:** Tom Aldridge, CISO, reporting to the CEO (Mara Visser). Elena Rossi is the appointed DPO. *(Security)*

**Q:** Is your ISO 27001 certificate scope relevant to the service we would buy?
**A:** Yes. The scope covers the Kestrel Platform and supporting corporate IT across Amsterdam, Lisbon, and AWS hosting; Statement of Applicability v4.2. *(Security)*

**Q:** Were there any exceptions in your latest SOC 2 report?
**A:** One: 2 of 25 sampled production changes lacked a linked ticket. A CI merge gate now blocks unlinked changes; remediation was verified in February 2026. *(Security)*

**Q:** Do you offer a HIPAA Business Associate Agreement?
**A:** No. Kestrel does not offer a BAA and the platform is not intended for PHI. *(Legal)*

**Q:** Are you ISO 27017 or ISO 27018 certified?
**A:** Not currently; both are planned as extensions to our ISO 27001 ISMS in 2027. *(Security)*

**Q:** Is MFA enforced for your employees?
**A:** Yes, for 100% of workforce accounts via Okta, using FIDO2 keys or Okta Verify with number matching. *(Security)*

**Q:** How do you manage roles and permissions in the product?
**A:** Five built-in roles (Owner, Admin, Editor, Analyst, Viewer) plus custom roles built from 41 granular permissions with row- and column-level security. *(Engineering)*

**Q:** Describe your network security controls.
**A:** VPC segmentation into edge, application, data, and management tiers; default-deny security groups; no public database endpoints; Cloudflare WAF and DDoS protection; AWS GuardDuty; IP allowlisting per tenant. *(Engineering)*

**Q:** How are employee devices secured?
**A:** Jamf (macOS) and Intune (Windows) MDM, full-disk encryption, CrowdStrike EDR, automatic patching within 7 days, 5-minute screen lock, USB mass storage blocked. *(Security)*

**Q:** Do you perform background checks?
**A:** Yes, for all employees before start date where legally permitted: identity, right to work, 5-year employment history, criminal record, and sanctions screening. *(Security)*

**Q:** What security training do staff receive?
**A:** Awareness training at onboarding and annually (100% completion in 2025), quarterly phishing simulations (Q4 2025 click rate 2.9%), and annual secure coding training for engineers. *(Security)*

**Q:** How quickly is access removed when someone leaves?
**A:** Okta identity is disabled automatically at end of the last working day; all access is confirmed revoked within 24 hours. *(Security)*

**Q:** Describe your change management process.
**A:** All changes via pull request with mandatory peer review, CI gates (tests, Semgrep, Trivy, Checkov, secret scanning), staging deployment, progressive rollout with automatic rollback, and a weekly CAB for high-risk changes. *(Engineering)*

**Q:** Do you have a documented and tested incident response plan?
**A:** Yes, NIST SP 800-61-based, exercised annually by tabletop; severity levels Sev-1 to Sev-4 with 15-minute acknowledgement for Sev-1. *(Security)*

**Q:** List your subprocessors.
**A:** AWS (hosting), Cloudflare (CDN/WAF), Datadog (logs, EU), Twilio SendGrid (email, US), Salesforce (CRM, EU), Google Workspace (EU), Intercom (support). Customers receive 30 days' notice of additions with a right to object. *(Privacy)*

**Q:** How do you handle data subject access requests?
**A:** Tenant admins use the Subject Locator tool to find and delete individual records; requests received by Kestrel are forwarded to the customer within 3 business days. *(Privacy)*

**Q:** Do you sell or share customer data with third parties?
**A:** No. Customer data is used solely to provide the service and is never sold, used for advertising, or used to train models. *(Privacy)*

**Q:** What are your support hours and response times?
**A:** 24/7 for Sev-1 with 30-minute response; P2 4 hours; P3 1 business day. Public status page. *(Sales)*

**Q:** What are your standard contract term and payment terms?
**A:** 12 to 36 months, platform fee plus usage tiers, annual payment in advance, net 30. Termination for convenience on 90 days' notice. *(Legal)*
