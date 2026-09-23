---
title: "HR Security and Security Awareness Training Policy"
kind: policy
owner: "Security"
updated: "2026-06-01"
---

# HR Security and Security Awareness Training Policy

**Document ID:** POL-HR-004 | **Version:** 3.1 | **Owners:** Head of People and CISO | **Effective:** 1 June 2026

## 1. Scope

This policy applies to all Kestrel Cloud B.V. employees (approximately 180 across the Netherlands, Portugal, and a small number of remote EU/UK staff) and to contractors who receive access to Kestrel systems. It implements ISO/IEC 27001:2022 controls A.6.1–A.6.8 and supports SOC 2 criteria CC1.1, CC1.4, and CC1.5.

## 2. Pre-employment screening

All offers of employment are conditional on background screening completed before the start date, performed by a specialist screening provider (Validata) to the extent permitted by local law:

- Identity verification and right-to-work check
- Employment history verification for the previous 5 years
- Highest education qualification verification
- Criminal record check: Dutch Verklaring Omtrent het Gedrag (VOG) for Netherlands-based staff; Registo Criminal for Portugal; DBS basic check for UK staff
- Sanctions and adverse media screening

Roles with production access or financial authority additionally receive a credit check where legally permitted. Contractors with system access undergo identity and criminal record checks; contractors without system access are exempt. Screening results are retained by People Operations for the duration of employment plus 12 months and are not shared with line managers beyond a pass/fail outcome.

## 3. Contractual obligations

Every employee and contractor signs, before access is granted:

1. A confidentiality and non-disclosure agreement that survives termination of employment.
2. An intellectual property assignment.
3. Acknowledgement of the Information Security Policy and the Acceptable Use Policy, re-acknowledged annually through the compliance platform (Vanta).

Employment contracts include a clause on the handling of customer data and the disciplinary consequences of policy violation, which range from formal warning to summary dismissal.

## 4. Security awareness training

| Training | Audience | Timing | Platform |
|---|---|---|---|
| Security fundamentals (phishing, passwords, data classification, incident reporting, clean desk, travel) | All staff | First week of onboarding, then annually | KnowBe4 |
| Data protection and GDPR essentials | All staff | Onboarding, then annually | Internal, delivered by DPO |
| Secure coding (OWASP Top 10, ASVS, tenancy) | Engineers | Onboarding, then annually | Secure Code Warrior |
| Incident response runbook drill | On-call engineers | Quarterly | Internal |
| Handling customer data and support tooling | Customer Success and Support | Onboarding, then annually | Internal |
| Privileged access and AWS security | SRE and security | Annually | Internal + AWS training |

Completion is tracked in Vanta and reported monthly; completion for the 2025 annual cycle was 100% by 31 December 2025, with a 30-day grace period for staff on leave. Training completion is a tested SOC 2 control (CC1.4) with no exceptions. Managers are notified of overdue training at 14 days; access to production tools is suspended at 30 days overdue.

## 5. Phishing simulations

Simulated phishing campaigns run quarterly using KnowBe4, with templates varied across credential harvesting, invoice fraud, MFA fatigue, and QR-code lures. Results for the last four quarters: click rate 4.1% (Q2 2025), 3.6% (Q3 2025), 2.9% (Q4 2025), 3.2% (Q1 2026), against a target of under 5%. Report rate via the Outlook/Gmail "Report Phish" button exceeded 60% in each campaign. Users who click receive immediate micro-training.

## 6. Role changes and internal moves

When an employee changes role, the previous manager and the new manager jointly review access within 5 business days, and any entitlements not required for the new role are removed through the standard access request process.

## 7. Offboarding

Offboarding is triggered in the HR system (HiBob), which automatically disables the Okta identity at the end of the last working day. Within 24 hours, People Operations and IT confirm: all SaaS access revoked (Okta-federated apps are disabled automatically; a checklist covers non-federated tools), laptop returned or remotely wiped, physical access badge deactivated, and exit interview completed with a reminder of continuing confidentiality obligations. Offboarding timeliness is sampled in the SOC 2 examination (CC6.2) with no exceptions in the FY2025 period.

