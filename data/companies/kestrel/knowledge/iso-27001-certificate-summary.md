---
title: "ISO/IEC 27001:2022 Certificate Summary"
kind: certification
owner: "Security"
updated: "2026-06-01"
---

# ISO/IEC 27001:2022 Certificate Summary

## Certificate details

| Field | Value |
|---|---|
| Standard | ISO/IEC 27001:2022 |
| Certificate number | KC-27001-2024-118 |
| Certified entity | Kestrel Cloud B.V., Gustav Mahlerlaan, Amsterdam, Netherlands |
| Certification body | Brightline Certification B.V. (accredited by the Dutch Accreditation Council, RvA) |
| Initial issue date | 12 March 2024 |
| Expiry date | 11 March 2027 |
| Surveillance audits | March 2025 (passed, 0 major, 2 minor), March 2026 (passed, 0 major, 1 minor) |
| Recertification due | Q1 2027 |

## Scope statement

"The Information Security Management System supporting the design, development, operation, and support of the Kestrel Platform (customer data integration and analytics SaaS), including the supporting corporate IT environment, delivered from Amsterdam and Lisbon and hosted on Amazon Web Services, in accordance with the Statement of Applicability version 4.2."

The scope therefore covers all production systems in eu-central-1, eu-west-1, and us-east-1, the engineering and operations functions in both offices, and the corporate IT services (Google Workspace, identity, endpoint management) that employees use to build and run the platform. Sales and marketing functions are in scope to the extent that they handle customer information.

## Statement of Applicability

Kestrel's Statement of Applicability (SoA v4.2, approved 3 February 2026) declares all 93 Annex A controls of the 2022 edition as applicable, with the exception of A.7.1.2 physical entry controls for data centres, which is inherited from AWS and evidenced through the AWS SOC 2 and ISO 27001 reports available in AWS Artifact. Controls with notable implementation detail include:

- A.5.19–A.5.23 supplier relationships: annual subprocessor review, documented in the subprocessor register.
- A.8.9 configuration management: all infrastructure defined in Terraform, drift detection nightly.
- A.8.16 monitoring activities: Datadog centralised logging with 12-month retention.
- A.8.28 secure coding: mandatory peer review, Semgrep SAST, Trivy container scanning.
- A.5.24–A.5.28 incident management: NIST-aligned incident response plan, annual tabletop.

## Audit history

The initial certification audit (Stage 1 in January 2024, Stage 2 in February 2024) raised two minor nonconformities relating to the completeness of the asset inventory for developer laptops and the documentation of risk treatment plan owners. Both were closed before the certificate was issued on 12 March 2024.

The first surveillance audit (March 2025) raised two minor findings: one on the timeliness of a supplier review and one on evidence retention for one quarterly access review. The second surveillance audit (March 2026) raised a single minor finding on the labelling of a legacy internal wiki space, closed in April 2026. No major nonconformities have ever been raised.

## Management system highlights

- Risk assessment methodology: ISO 27005-based, reviewed annually and after significant change. The risk register held 47 active risks at the last management review (May 2026).
- Management review: held twice a year, chaired by the CEO, with the CISO reporting on KPIs including patch SLA compliance, phishing simulation click rate, and incident metrics.
- Internal audit: performed annually by an independent consultant, most recently in November 2025.

## Sharing the certificate

A PDF of the certificate and the current SoA summary can be provided to customers and prospects on request; the certificate itself is not confidential and may be shared without NDA. The full internal audit report and risk register are available for review under NDA during a customer audit. Verification of certificate status can be performed with Brightline Certification B.V. using the certificate number.

## Related certifications

Kestrel does not hold ISO/IEC 27017 or ISO/IEC 27018; both are planned for 2027 as extensions of the existing ISMS. Kestrel does not hold FedRAMP authorisation, which is not applicable to its market, and does not offer HIPAA Business Associate Agreements. PCI DSS is out of scope since no cardholder data is processed.
