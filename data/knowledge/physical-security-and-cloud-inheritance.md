---
title: "Physical Security and Cloud Control Inheritance"
kind: policy
owner: "Security"
updated: "2026-06-01"
---

# Physical Security and Cloud Control Inheritance

## 1. Summary

Kestrel Cloud B.V. does not own or operate data centres. All production infrastructure for the Kestrel Platform runs on Amazon Web Services, and physical and environmental security for that infrastructure is inherited from AWS. Kestrel's own physical security responsibilities are limited to its two offices (Amsterdam and Lisbon) and to corporate endpoints, none of which store customer data.

## 2. Shared responsibility model

| Control area | AWS responsibility (inherited) | Kestrel responsibility |
|---|---|---|
| Data centre physical access, perimeter, CCTV, guards | AWS | — |
| Environmental controls (power, cooling, fire suppression) | AWS | — |
| Hardware lifecycle and media destruction (NIST SP 800-88) | AWS | — |
| Hypervisor and physical network | AWS | — |
| Managed service patching (Aurora, MSK, OpenSearch engine level) | AWS | Schedule maintenance windows, version selection |
| Operating system on EKS nodes | — | Kestrel (Bottlerocket AMI rotation every 14 days) |
| Network configuration (VPC, security groups, firewall) | — | Kestrel |
| Identity, access, encryption configuration, KMS key policies | — | Kestrel |
| Application security, tenancy, data classification | — | Kestrel |
| Backup and DR configuration | — | Kestrel |
| Logging and monitoring of Kestrel workloads | — | Kestrel |

Kestrel's ISO/IEC 27001 Statement of Applicability records Annex A control A.7.1 (physical security perimeters) and related controls as inherited for data centre environments, with AWS assurance reports as evidence.

## 3. AWS assurance relied upon

Kestrel reviews the following AWS reports annually through AWS Artifact as part of its subprocessor review:

- AWS SOC 1, SOC 2 (Security, Availability, Confidentiality, Privacy), and SOC 3 reports (latest reviewed: report period ending 30 September 2025, reviewed December 2025).
- AWS ISO/IEC 27001, 27017, 27018, and 9001 certificates.
- AWS C5 attestation (Germany) relevant to eu-central-1.
- AWS PCI DSS Attestation of Compliance (informational only; Kestrel is not in PCI scope).

The regions used (eu-central-1, eu-west-1, us-east-1, us-west-2) are all within the scope of these reports. Copies can be obtained by customers directly from AWS Artifact; Kestrel can provide its review record on request.

## 4. Office physical security

Kestrel's offices are leased space in multi-tenant office buildings:

- **Amsterdam HQ (Gustav Mahlerlaan):** building reception staffed 07:00–19:00 on weekdays with visitor registration; Kestrel floors accessible only via personal access badges (issued by People Operations, deactivated within 24 hours of departure); CCTV at building entrances and lift lobbies operated by the landlord; server room not present — networking closet contains only switches and Wi-Fi controllers, locked, access limited to IT.
- **Lisbon office:** similar arrangement in a managed office building with badge access and reception.

Visitors sign in, wear visible badges, and are escorted at all times. Clean desk and screen-lock policies apply; printers require badge release, and confidential paper waste goes into locked shredding bins collected by a certified provider.

Because no customer data is stored or processed in offices, an office intrusion would not expose customer data. Office networks are treated as untrusted; access to production is via Okta and the bastion regardless of location.

## 5. Hardware and media

Corporate laptops are the only Kestrel-owned hardware holding company data, protected by full-disk encryption, EDR, and remote wipe (see Endpoint Security Standard). Kestrel does not use removable media for data transfer; USB mass storage is blocked. Decommissioned laptops are cryptographically erased and disposed of through a certified e-waste partner (WEEE-compliant) that provides destruction certificates, retained by IT for 3 years.

## 6. Audit evidence

Customers auditing Kestrel may review: the AWS report review records, the office access badge register (sampled), visitor logs, and the media disposal certificates. Physical security of offices is assessed during the annual ISO 27001 surveillance audit, with no findings raised in 2025 or 2026.
