---
title: "Information Security Policy"
kind: policy
owner: "Security"
updated: "2026-06-01"
---

# Information Security Policy

**Document ID:** POL-SEC-001 | **Version:** 5.1 | **Approved by:** Mara Visser (CEO) | **Owner:** Tom Aldridge (CISO) | **Effective:** 1 June 2026 | **Review cycle:** Annual

## 1. Purpose and scope

This policy establishes the mandatory information security requirements for Kestrel Cloud B.V. It applies to all employees, contractors, and third parties who access Kestrel information systems, and to all information assets owned or processed by Kestrel, including the Kestrel Platform, customer data, and corporate IT. It is the top-level document of the ISMS certified under ISO/IEC 27001:2022 (certificate KC-27001-2024-118).

## 2. Security objectives

Kestrel commits to:

1. Protect the confidentiality, integrity, and availability of customer data and Kestrel information assets.
2. Meet contractual, legal, and regulatory obligations, including the GDPR, the UK GDPR, and customer DPAs.
3. Maintain ISO/IEC 27001 certification and an annual SOC 2 Type II examination.
4. Achieve measurable targets: 99.9% monthly availability, 100% of critical vulnerabilities remediated within 7 days, phishing simulation click rate below 5%, and 100% completion of annual security training.

## 3. Roles and responsibilities

- **CEO** approves this policy and provides resources.
- **CISO** owns the ISMS, chairs the Security Steering Committee (monthly), and reports to the board quarterly.
- **DPO (Elena Rossi)** advises on data protection and handles data-subject requests.
- **Engineering managers** ensure secure development practices in their teams.
- **All staff** must complete training, report incidents, and comply with supporting policies.

## 4. Policy framework

This policy is supported by the following documents, each owned by a named executive and reviewed annually:

| ID | Policy | Owner |
|---|---|---|
| POL-SEC-002 | Access Control Policy | Security |
| POL-SEC-003 | Encryption and Key Management Standard | Security |
| POL-SEC-004 | Vulnerability Management Policy | Security |
| POL-SEC-005 | Secure SDLC and Change Management | Engineering |
| POL-SEC-006 | Incident Response Plan | Security |
| POL-SEC-007 | Business Continuity and Disaster Recovery Plan | Engineering |
| POL-SEC-008 | Logging and Monitoring Standard | Security |
| POL-SEC-009 | Endpoint Security Standard | Security |
| POL-SEC-010 | Acceptable Use Policy | Security |
| POL-SEC-011 | Supplier Security Policy | Security |
| POL-HR-004 | HR Security and Training Policy | People |
| POL-PRV-001 | Data Protection and Retention Policy | Privacy |

## 5. Core requirements

**Risk management.** Risks are assessed using an ISO 27005-based methodology at least annually and upon significant change. The risk register is reviewed monthly by the Security Steering Committee.

**Asset management.** All information assets are inventoried with an owner and classification. Data is classified as Public, Internal, Confidential, or Restricted; customer data is always Restricted.

**Access control.** Access is granted on least-privilege and need-to-know principles, provisioned through SSO with MFA, and reviewed quarterly. Shared accounts are prohibited.

**Cryptography.** Data at rest is encrypted with AES-256 and data in transit with TLS 1.2 or higher, per POL-SEC-003.

**Operations security.** Production changes follow the change management process; vulnerabilities are remediated within defined SLAs; systems are monitored 24/7.

**Supplier security.** Subprocessors are risk-assessed before onboarding and reviewed annually; customers are notified 30 days before a new subprocessor is added.

**Incident management.** All suspected incidents are reported to security@kestrelcloud.example or the #security-incidents channel within one hour of discovery. Customers are notified of confirmed personal-data breaches within 48 hours.

**Business continuity.** Recovery objectives for the platform are RPO 1 hour and RTO 4 hours, tested semi-annually.

**Human resources.** Background checks, confidentiality agreements, security training, and timely offboarding are mandatory per POL-HR-004.

**Compliance.** The ISMS is subject to annual internal audit and external surveillance audits by Brightline Certification B.V.

## 6. Exceptions

Exceptions must be requested in writing, risk-assessed, approved by the CISO, recorded in the exception register with an expiry date no longer than 12 months, and reviewed at each Security Steering Committee meeting.

## 7. Enforcement

Violations may result in disciplinary action up to and including termination of employment or contract.

## 8. Communication

This policy is published on the internal wiki, acknowledged by every employee at onboarding and annually, and summarised for customers in the Security Overview.
