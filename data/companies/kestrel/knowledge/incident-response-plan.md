---
title: "Incident Response Plan"
kind: policy
owner: "Security"
updated: "2026-06-01"
---

# Incident Response Plan

**Document ID:** POL-SEC-006 | **Version:** 4.0 | **Owner:** Tom Aldridge (CISO) | **Effective:** 1 June 2026

## 1. Purpose

This plan defines how Kestrel Cloud B.V. detects, responds to, and learns from security incidents affecting the Kestrel Platform, corporate systems, or customer data. It follows the NIST SP 800-61r2 lifecycle: Preparation, Detection and Analysis, Containment, Eradication and Recovery, and Post-Incident Activity.

## 2. Definitions and severity

A **security incident** is an event that compromises, or is reasonably believed to compromise, the confidentiality, integrity, or availability of Kestrel or customer information. A **personal data breach** is an incident involving personal data as defined by GDPR Article 4(12).

| Severity | Definition | Examples | Response target |
|---|---|---|---|
| Sev-1 | Confirmed or likely exposure of customer data; platform-wide outage; active attacker | Unauthorised access to tenant data, ransomware | Acknowledge 15 min, incident commander assigned 30 min |
| Sev-2 | Significant risk without confirmed exposure; partial outage | Credential leak, critical vulnerability exploited in the wild | Acknowledge 30 min |
| Sev-3 | Limited impact, contained | Phishing of one account without data access, misconfiguration with no exposure | Acknowledge 4 hours |
| Sev-4 | Policy violation, no impact | Lost encrypted laptop with remote wipe confirmed | Next business day |

## 3. Roles

- **Incident Commander (IC):** the on-call security engineer, escalating to the CISO for Sev-1/Sev-2.
- **Technical Lead:** on-call SRE or engineering lead for the affected system.
- **Communications Lead:** Head of Customer Success, responsible for customer and status page updates.
- **Privacy Lead:** the DPO, Elena Rossi, who assesses personal data impact and regulatory notification.
- **Legal Counsel:** engaged for any Sev-1 or any incident with contractual or regulatory implications.
- **Executive Sponsor:** CEO for Sev-1.

## 4. Detection and reporting

Incidents are detected through Datadog SIEM alerts, AWS GuardDuty, CrowdStrike EDR, Cloudflare WAF events, the Intigriti bug bounty programme, customer reports to security@kestrelcloud.example, and employee reports. All staff must report suspected incidents within one hour of discovery via the #security-incidents Slack channel or the 24/7 on-call pager. A ticket is opened in the incident tracker (`INC-YYYY-NNN`) for every incident, regardless of severity.

## 5. Response procedure

1. **Triage (IC):** classify severity, open the incident channel, start the timeline log.
2. **Containment:** isolate affected systems (revoke credentials, block IPs at Cloudflare, quarantine hosts via CrowdStrike, disable integrations). Forensic snapshots are preserved in a locked S3 bucket before changes.
3. **Eradication:** remove the root cause (patch, rotate secrets, rebuild from known-good images).
4. **Recovery:** restore service, verify with monitoring, and confirm with affected customers where relevant.
5. **Post-incident review:** blameless review within 5 business days for Sev-1/Sev-2, with action items tracked to completion.

## 6. Notification commitments

- **Customers:** confirmed personal-data breaches affecting a customer's data are notified to that customer's registered security contact **within 48 hours** of confirmation, as committed in the DPA. Notification includes nature of the breach, categories and approximate volume of data, likely consequences, measures taken, and a contact point. Non-breach incidents that may affect customers are disclosed proactively as a matter of transparency.
- **Supervisory authority:** the DPO notifies the Dutch Autoriteit Persoonsgegevens within 72 hours of becoming aware where required by GDPR Article 33, on behalf of Kestrel as controller; for processor incidents Kestrel supports the customer's notification.
- **Data subjects:** notified where required by Article 34, coordinated with the affected customer.

## 7. Testing and training

The plan is exercised annually through a tabletop simulation. The most recent exercise on **11 February 2026** simulated a compromised CI runner leaking a tenant KMS grant; it involved 14 participants, ran 3 hours, and produced 4 improvement actions (all closed by April 2026). On-call staff complete a runbook drill quarterly.

## 8. Incident history

Kestrel maintains an incident register available to customers under NDA. As of June 2026, one customer-notified incident is on record: the 19 November 2025 misconfigured S3 bucket for marketing website assets (INC-2025-014), which involved no customer or personal data. See the separate incident disclosure document for details.

## 9. Review

This plan is reviewed annually, after each tabletop, and after every Sev-1 or Sev-2 incident.
