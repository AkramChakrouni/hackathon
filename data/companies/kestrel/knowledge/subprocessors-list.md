---
title: "Subprocessor List and Vendor Management"
kind: policy
owner: "Privacy"
updated: "2026-06-01"
---

# Subprocessor List and Vendor Management

**Version:** 2026-06 | **Owner:** Data Protection Officer (Elena Rossi, dpo@kestrelcloud.example) | **Published at:** kestrelcloud.example/legal/subprocessors

## 1. Current subprocessors

The following third parties may process customer personal data on behalf of Kestrel Cloud B.V. in the delivery of the Kestrel Platform and related services.

| Subprocessor | Purpose | Data processed | Location of processing | Transfer mechanism |
|---|---|---|---|---|
| Amazon Web Services EMEA SARL | Cloud hosting, storage, compute, managed databases, KMS | All customer data | Germany (eu-central-1), Ireland (eu-west-1); United States (us-east-1) only for customers who select the US region | EU processing; SCCs and AWS Data Processing Addendum for US region |
| Cloudflare, Inc. | CDN, WAF, DDoS protection, DNS | Request metadata, IP addresses, TLS-terminated traffic in transit | Global edge network; EU customers routed via EU points of presence with Regional Services enabled | SCCs, EU-US Data Privacy Framework certified |
| Datadog, Inc. | Logging, metrics, security monitoring | Application and audit logs, which may include user identifiers and IP addresses | EU (Datadog EU site, Frankfurt) | EU processing; SCCs for support access |
| Twilio Inc. (SendGrid) | Transactional email (invitations, alerts, password resets) | Recipient name, email address, notification content | United States | SCCs, EU-US Data Privacy Framework certified |
| Salesforce, Inc. | CRM and contract management | Customer contact and account details | EU (Frankfurt/Paris) | EU processing; SCCs for support access |
| Google Cloud EMEA Ltd (Google Workspace) | Corporate email, documents, collaboration | Customer correspondence and shared documents | EU data regions | EU processing; SCCs |
| Intercom R&D Unlimited Company | Customer support messaging and help centre | Support conversations, user name and email | EU (Dublin) and United States | SCCs, EU-US Data Privacy Framework certified |
| Nebius B.V. | Hosted inference for Kestrel Assist (AI feature) | Query text and result schema context only; zero data retention; no training | Finland | EU processing |

Nebius is only engaged for tenants with Kestrel Assist enabled; the feature can be disabled per tenant, in which case no data flows to Nebius.

Kestrel affiliates: Kestrel Cloud Portugal Lda (Lisbon) provides engineering and support services under an intra-group data processing agreement; no separate transfer mechanism is required as both entities are in the EU.

## 2. Notification and right to object

Kestrel publishes changes to this list on the legal page and notifies customers by email to their registered notice contacts **at least 30 days before** a new subprocessor begins processing customer data. If a customer reasonably objects on data protection grounds within the 30-day period, Kestrel will work in good faith to provide an alternative; if no alternative is possible, the customer may terminate the affected services without penalty and receive a pro-rata refund of prepaid fees, as set out in section 6 of the Data Processing Agreement.

Changes since the previous version (2025-11): Nebius B.V. added (notified 14 January 2026, effective 16 February 2026) to support Kestrel Assist; AWS us-east-1 added as an optional region (notified 2 December 2025, effective 5 January 2026).

## 3. Vendor due diligence

Before onboarding, each subprocessor is assessed under the Supplier Security Policy (POL-SEC-011):

1. Security review: current SOC 2 Type II or ISO 27001 certificate, penetration test attestation, and a security questionnaire proportionate to the data involved.
2. Privacy review by the DPO: data categories, locations, sub-subprocessors, and transfer mechanism; a transfer impact assessment for any non-EU processing.
3. Contract: written data processing terms meeting GDPR Article 28 requirements, including flow-down of Kestrel's customer commitments (breach notification within 48 hours to Kestrel, deletion on termination, audit support).
4. Approval by the CISO and DPO, recorded in the vendor register.

Subprocessors are re-assessed annually (evidence refreshed in Vanta) and after any security incident on their side. The annual review is a tested SOC 2 control (CC9.2) with no exceptions. Kestrel maintains 38 vendors in the register, of which the 8 listed above process customer personal data.

## 4. Contact

Questions about subprocessors or objections should be sent to dpo@kestrelcloud.example.
