---
title: "Access Control Policy"
kind: policy
owner: "Security"
updated: "2026-06-01"
---

# Access Control Policy

**Document ID:** POL-SEC-002 | **Version:** 4.3 | **Owner:** Tom Aldridge (CISO) | **Effective:** 1 June 2026

## 1. Principles

Access to Kestrel systems and customer data is governed by least privilege, need-to-know, and separation of duties. Every access is attributable to a named individual; shared, generic, or anonymous accounts are prohibited in all environments. Access rights are granted through documented approval, reviewed quarterly, and revoked promptly on role change or departure.

## 2. Workforce identity

All employee and contractor identities are managed in Okta, which is the single source of truth and federates to Google Workspace, GitHub, AWS (via IAM Identity Center), Datadog, Salesforce, Jamf, Intune, and the internal admin console. Accounts are created automatically from the HR system (HiBob) on start date and disabled automatically on the termination date; manual offboarding checks are completed within 24 hours.

Multi-factor authentication is enforced for 100% of workforce accounts. Accepted factors are FIDO2 security keys (issued to all engineers and administrators) and Okta Verify with number matching; SMS and voice factors are disabled. Password policy requires a minimum of 14 characters, screened against breached-password lists, with no forced periodic rotation.

## 3. Customer identity

Customers authenticate to the Kestrel Platform through:

- **SAML 2.0** or **OIDC** single sign-on, tested with Okta, Microsoft Entra ID, and Google Workspace; any compliant IdP is supported.
- **SCIM 2.0** provisioning for automated user and group lifecycle, including deprovisioning.
- Local accounts with password plus TOTP MFA where SSO is not used. Tenant administrators can enforce MFA for all users and can require SSO-only login, which disables local passwords.

Session lifetime defaults to 12 hours with a 30-minute idle timeout; both are configurable per tenant. API access uses scoped tokens and OAuth 2.0 client credentials, with tokens expiring after a configurable period (default 90 days) and revocable at any time.

## 4. Role-based access control

The platform ships with five built-in roles:

| Role | Summary |
|---|---|
| Owner | Full control including billing, SSO configuration, and tenant deletion |
| Admin | Manage users, roles, sources, and workspace settings |
| Editor | Build models, dashboards, and API queries |
| Analyst | Query and explore data, create personal dashboards |
| Viewer | Read-only access to shared dashboards and reports |

Custom roles can combine 41 granular permissions and can be scoped to workspaces, data sources, or individual datasets. Row- and column-level security policies restrict data visibility within a role. Every role change is recorded in the tenant audit log.

## 5. Privileged access to production

Production access is restricted to on-call engineers and SREs (currently 22 individuals) and is only possible through a bastion host (AWS Systems Manager Session Manager) that requires Okta MFA, is bound to a corporate managed device, and records every session in full. Sessions are retained for 12 months. Standing administrative rights do not exist; elevated permissions are granted just-in-time for a maximum of 8 hours via an approval workflow in the internal `kctl` tool, with approvals logged to Datadog. Direct database credentials are never issued to individuals; queries against production data require a ticket and are executed through an audited proxy.

## 6. Access reviews

Quarterly access reviews cover AWS, GitHub, Okta application assignments, Datadog, Salesforce, and all production roles. Reviews are performed by system owners and evidenced in Vanta. The most recent review (Q1 2026) covered 214 identities and 1,038 entitlements and resulted in 17 removals, all completed within 5 business days. Reviews are a tested control in the SOC 2 Type II report (CC6.2) with no exceptions.

## 7. Joiners, movers, leavers

- **Joiners:** access requested via the HR system, approved by the line manager, baseline granted through Okta group membership on day one.
- **Movers:** previous role entitlements are removed within 5 business days of the role change.
- **Leavers:** all access is disabled within 24 hours (typically within one hour) and hardware is recovered.

## 8. Third-party access

Vendors and contractors receive time-bound accounts through Okta with the same MFA requirements, are never granted production access without a Kestrel engineer present, and are reviewed in the same quarterly cycle.
