# Personivo B.V. Information Security Policy

Document owner: Information Security Officer (CTO)
Version: 4.0
Effective: 1 June 2026
Next review: June 2027
Classification: Confidential

## 1. Purpose and scope

Personivo B.V. (Utrecht, the Netherlands, 25 employees) provides the Personivo Platform, a SaaS application for employee onboarding, employee records and contract management used by banks and insurers across Europe. This policy applies to all employees, contractors, systems and data, including customer data processed in the platform.

## 2. Governance and assurance

Personivo operates an Information Security Management System (ISMS) certified against ISO/IEC 27001:2022 since May 2024. An accredited certification body performs an external surveillance or recertification audit every year. An internal audit covering all ISMS controls is performed annually by an independent consultant. Findings are tracked in a corrective action register that management reviews monthly.

The CTO acts as Information Security Officer (ISO) and reports to the management team. All security policies are reviewed at least annually and after significant changes.

## 3. Asset management and data classification

All information assets (cloud resources, endpoints, SaaS tools, code repositories) are recorded in an asset inventory that is reviewed every six months. Data is classified in four levels:

* Public
* Internal
* Confidential: business information, source code, contracts
* Strictly Confidential: all customer data, including personal data of customer employees

Handling requirements per level are defined in the classification standard. Strictly Confidential data may only be stored in the production environment.

## 4. Hosting and infrastructure

The platform is hosted on Microsoft Azure. Production runs in the Azure West Europe region (Netherlands) across three availability zones. Database backups and file storage are geo-replicated to Azure North Europe (Ireland) for disaster recovery. No customer data is stored or processed outside the European Economic Area.

Production, staging and development run in separate Azure subscriptions with separate access controls. Network access to production is restricted with network security groups and private endpoints. All public traffic passes through Azure Front Door with a web application firewall (WAF). Infrastructure is defined as code (Terraform) and hardened according to CIS benchmarks.

Personivo does not operate its own data centers. Physical and environmental security of the data centers is fully outsourced to Microsoft. Personivo reviews Microsoft's ISO 27001 certificate and SOC 2 Type II report annually.

## 5. Cryptography

Customer data is encrypted at rest with AES-256 (Azure SQL Transparent Data Encryption and Azure Storage Service Encryption). All data in transit is encrypted with TLS 1.2 or higher, with TLS 1.3 preferred. HSTS is enforced on all web endpoints, and internal service to service traffic is also encrypted with TLS. Only industry standard algorithms from vetted libraries are permitted; custom cryptography is prohibited.

Encryption keys and secrets are stored in Azure Key Vault (Premium tier, HSM backed). Keys are rotated automatically every 12 months, or immediately upon suspected compromise. Access to Key Vault is limited to the platform's managed identities and two named administrators.

Customer managed encryption keys (BYOK) are currently not offered. All keys are managed by Personivo.

## 6. Identity and access management

All workforce accounts are managed centrally in Microsoft Entra ID with single sign-on. Multi-factor authentication is mandatory for all employees and contractors on all systems. Privileged accounts must use phishing resistant MFA (FIDO2 security keys).

Passwords must be at least 14 characters and are checked against a list of known breached passwords. Periodic forced password changes are not required, in line with NIST SP 800-63B; passwords are changed immediately on suspected compromise. Shared accounts are prohibited and every user has a unique ID.

Access follows least privilege and role based access control. Nobody has standing access to production: engineers request just in time access through Azure Privileged Identity Management, which must be approved by a second engineer and is limited to a maximum of 4 hours. Duties are separated so that no engineer can approve their own production access or code changes.

Access rights are reviewed quarterly for production and privileged access, and every six months for all other systems. Access of leavers is revoked within 24 hours of the end of employment, and immediately for involuntary terminations.

For customer users, the platform supports SSO via SAML 2.0 and OpenID Connect, and MFA via authenticator apps or WebAuthn. Customer administrators can enforce MFA for their organization.

## 7. Secure development and change management

Development follows a secure SDLC based on OWASP ASVS Level 2, including threat modelling for new features that process Strictly Confidential data. Every code change requires a pull request that is reviewed and approved by at least one other engineer. The CI pipeline (GitHub Actions) runs automated unit and integration tests, static code analysis (CodeQL) and dependency scanning (Dependabot) on every change. Failed checks block merging.

Deployments to production happen only through the automated pipeline using blue-green deployment, which allows rollback to the previous known good version within minutes. Infrastructure changes follow the same pull request process. Emergency changes may be deployed with approval from the ISO and must be reviewed retrospectively within two business days.

The public API uses OAuth 2.0 with scoped access tokens, rate limiting, input validation and WAF protection. API security is part of the annual penetration test.

## 8. Vulnerability management

Cloud infrastructure is continuously scanned with Microsoft Defender for Cloud, container images are scanned weekly, and dependencies are checked daily. Vulnerabilities are prioritized using CVSS score and exploitability, with remediation deadlines of 7 days for critical, 30 days for high and 90 days for medium findings.

An independent, CREST accredited third party performs a penetration test of the platform and API at least annually and after major architectural changes. The most recent test was completed in February 2026, and all high findings were remediated within 30 days.

## 9. Logging and monitoring

Authentication events, administrative actions, access to customer data by Personivo staff, and security events from Azure are collected in Microsoft Sentinel. Audit logs are written to immutable storage, protected against modification and deletion, accessible only to the ISO and the security on-call engineer, and retained for 12 months. Detection rules generate alerts to the on-call engineer 24/7. All systems synchronize time with the Azure time service.

## 10. Endpoint security

Only company managed laptops may access company systems. Laptops are managed with Microsoft Intune, which enforces full disk encryption (BitLocker or FileVault), Microsoft Defender for Endpoint, automatic OS updates, and a screen lock after 5 minutes of inactivity. Lost or stolen devices are remotely wiped.

## 11. Human resources security

All employees and contractors must provide a Certificate of Conduct (Verklaring Omtrent het Gedrag, VOG) before their start date. Employment contracts include confidentiality obligations and the obligation to follow security policies; contractors sign a separate NDA. All staff complete security awareness training during onboarding and annually thereafter, and phishing simulations are run quarterly. Company equipment must be returned on the last working day.

## 12. Customer data portability and contract termination

Customers can retrieve their data at any time through the REST API or through a full export in CSV and JSON formats. Customer data is retained for 90 days after contract termination so the customer can export it, and is securely deleted afterwards.

## 13. Exceptions and enforcement

Exceptions to this policy require written approval by the ISO, are time limited, and are recorded in the exception register. Violations may lead to disciplinary action.
