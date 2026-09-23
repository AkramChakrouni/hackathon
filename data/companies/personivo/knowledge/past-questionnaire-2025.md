---
title: "Past questionnaire answers 2025 (bank vendor assessment, may be outdated)"
kind: past_answer
owner: "Security"
updated: "2025-06-15"
---

Answers Personivo gave to a bank's vendor security questionnaire in June 2025. These reflect the situation in 2025; where a current policy says otherwise, the current policy prevails.

**VQ-01 Q (2025):** Is your organisation audited by an independent external party at least once a year?
**A:** Yes. ISO/IEC 27001:2022 certified since May 2024; annual surveillance audit by an accredited certification body.

**VQ-02 Q (2025):** Do you follow a secure software development lifecycle?
**A:** Yes. Secure SDLC based on OWASP ASVS Level 2, with peer review on every change.

**VQ-03 Q (2025):** How are vulnerabilities in your application remediated?
**A:** Yes. Remediation deadlines: critical within 7 days, high within 30 days, medium within 90 days.

**VQ-04 Q (2025):** Do you have a documented business continuity policy?
**A:** Yes. Business continuity policy approved by management and reviewed annually.

**VQ-05 Q (2025):** Is your business continuity plan tested at least once a year?
**A:** Yes. Annual tabletop exercise.

**VQ-06 Q (2025):** How often are backups of customer data made?
**A:** Yes. Full database backups are made weekly, retained for 30 days and stored in Azure West Europe.

**VQ-07 Q (2025):** Do you periodically test the restoration of backups?
**A:** Yes. A restore test is performed annually.

**VQ-08 Q (2025):** Is customer data replicated to a geographically separate location?
**A:** No. All data is hosted in Azure West Europe across availability zones. Geo-replication is planned.

**VQ-09 Q (2025):** Do you have a formal change management process?
**A:** Yes. All changes go through pull requests with peer review and an automated deployment pipeline.

**VQ-10 Q (2025):** Is customer data encrypted at rest and in transit?
**A:** Yes. AES-256 at rest, TLS 1.2 or higher in transit.

**VQ-11 Q (2025):** Which encryption algorithms do you use?
**A:** Yes. AES-256 and TLS 1.2/1.3 with industry standard cipher suites. No custom cryptography.

**VQ-12 Q (2025):** Can customers bring or manage their own encryption keys?
**A:** No. Keys are managed by Personivo in Azure Key Vault.

**VQ-13 Q (2025):** How is physical security of your data centres ensured?
**A:** Yes. Outsourced to Microsoft Azure. Microsoft's ISO 27001 and SOC 2 reports are reviewed annually.

**VQ-14 Q (2025):** Do you classify data by sensitivity?
**A:** Yes. Four levels: Public, Internal, Confidential, Strictly Confidential.

**VQ-15 Q (2025):** Have you performed a DPIA for the processing of our employees' personal data?
**A:** Yes. A DPIA for the core platform was completed in 2024.

**VQ-16 Q (2025):** Can data subjects exercise their GDPR rights?
**A:** Yes. Requests are forwarded to the customer within 2 business days. Customer admins have tools to export, correct and delete data.

**VQ-17 Q (2025):** Where is our data stored?
**A:** Yes. Primary data is stored in Azure West Europe (Netherlands). No data is stored outside the EEA.

**VQ-18 Q (2025):** Do you have an information security programme?
**A:** Yes. ISO 27001 certified ISMS, owned by the CTO in the role of Information Security Officer.

**VQ-19 Q (2025):** Are background checks performed for new employees?
**A:** Yes. A VOG (Certificate of Conduct) is required for all employees and contractors.

**VQ-20 Q (2025):** Do employees sign confidentiality agreements?
**A:** Yes. Confidentiality obligations are part of every employment contract.

**VQ-21 Q (2025):** Do employees receive security awareness training?
**A:** Yes. At onboarding and annually, plus quarterly phishing simulations.

**VQ-22 Q (2025):** Is access granted based on least privilege?
**A:** Yes. Role based access control; production access only just in time.

**VQ-23 Q (2025):** How quickly is access revoked when an employee leaves?
**A:** Yes. Within 24 hours, and immediately for involuntary terminations.

**VQ-24 Q (2025):** Is multi-factor authentication enforced?
**A:** Yes. MFA is mandatory for all workforce accounts. Customer users can enable MFA and customer admins can enforce it.

**VQ-25 Q (2025):** Describe your password policy.
**A:** Yes. Minimum 14 characters, checked against breached passwords, no forced rotation in line with NIST SP 800-63B.

**VQ-26 Q (2025):** Is network traffic between your internal services encrypted?
**A:** Yes. TLS is used for all internal and external traffic.

**VQ-27 Q (2025):** How long are security logs retained?
**A:** Yes. 12 months, in immutable storage.

**VQ-28 Q (2025):** Do you have an incident response plan that includes customer communication?
**A:** Yes. Customers are notified within 24 hours of a confirmed breach through their security contacts.

**VQ-29 Q (2025):** How often do you scan for vulnerabilities?
**A:** Yes. Continuous infrastructure scanning with Defender for Cloud; dependencies are checked daily.

**VQ-30 Q (2025):** Do you perform independent penetration tests?
**A:** Yes. Annual penetration test by an independent CREST accredited firm.
