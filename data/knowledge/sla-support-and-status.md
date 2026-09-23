---
title: "Service Level Agreement, Support, and Status Communications"
kind: product_doc
owner: "Sales"
updated: "2026-06-01"
---

# Service Level Agreement, Support, and Status Communications

## 1. Availability commitment

Kestrel commits to **99.9% monthly availability** of the Kestrel Platform (web application, API, and ingestion pipeline) for all paid plans. Availability is measured per calendar month as the percentage of minutes in which the service is available, excluding scheduled maintenance and exclusions below. Measured availability over the trailing 12 months to May 2026 was 99.98%, with no month below 99.95%.

**Service credits** are issued as a percentage of the affected month's subscription fee:

| Monthly availability | Credit |
|---|---|
| Below 99.9% and at or above 99.5% | 5% |
| Below 99.5% and at or above 99.0% | 10% |
| Below 99.0% | 25% |

Credits are the sole remedy for availability shortfalls, must be requested within 30 days of the month end, and are applied to the next invoice. Enterprise customers may negotiate a 99.95% target with the same credit structure; Legal approval is required.

**Exclusions:** scheduled maintenance (maximum 4 hours per month, announced at least 5 business days in advance, performed Sundays 02:00–04:00 UTC), customer-caused issues, third-party data source outages, and force majeure events.

## 2. Support tiers and response targets

Support is provided by the Customer Support team in Amsterdam and Lisbon, with 24/7 coverage for Severity 1 through the on-call rotation. Channels: in-app chat (Intercom), email to support@kestrelcloud.example, and phone for Sev-1 (Enterprise plans).

| Severity | Definition | Initial response | Update cadence | Coverage |
|---|---|---|---|---|
| P1 / Sev-1 | Platform unavailable or data integrity at risk for the tenant | 30 minutes | Hourly | 24/7/365 |
| P2 | Major feature unavailable or severely degraded, no workaround | 4 hours | Every 4 business hours | 24/7 acknowledgement; work during extended hours 07:00–22:00 CET |
| P3 | Minor feature issue or degradation with workaround | 1 business day | Every 3 business days | Business hours (08:00–18:00 CET, Mon–Fri) |
| P4 | Question, feature request, cosmetic issue | 2 business days | As needed | Business hours |

Resolution targets (not guaranteed): P1 within 8 hours, P2 within 3 business days, P3 within the next scheduled release. In Q1 2026, median first response for P1 was 11 minutes and for P2 was 1 hour 42 minutes.

Enterprise plans include a named Customer Success Manager, quarterly service reviews, and an escalation path to the VP Customer Experience. Every Sev-1 receives a written root-cause analysis within 5 business days.

## 3. Status page

A public status page at status.kestrelcloud.example shows real-time component status (Web App, API, Ingestion, Kestrel Assist, Status by Region), 90-day uptime history, scheduled maintenance, and incident history. Customers can subscribe by email, SMS, RSS, Slack, or webhook. During incidents, updates are posted at least every 60 minutes for Sev-1 and every 4 hours for lesser incidents until resolution, followed by a public post-mortem for any incident exceeding 30 minutes of customer impact.

## 4. Maintenance and release communication

Kestrel deploys continuously with zero-downtime rollouts; scheduled maintenance requiring downtime is rare (twice in 2025, totalling 2 hours 10 minutes). Release notes are published weekly. API changes follow semantic versioning; breaking changes are announced at least 90 days in advance with a migration guide, and previous API versions are supported for 12 months after deprecation.

## 5. Support security

Support staff access a tenant only through the support console after the customer grants a time-limited support session (default 72 hours) from the admin settings, or with a ticket during a Sev-1 with post-hoc notification. All support access is logged in the tenant's audit log. Support staff cannot download customer data; they see the same views the customer sees, subject to the customer's masking rules.

## 6. Performance targets

Kestrel targets API p95 latency under 400 ms for standard queries, dashboard load under 3 seconds for the 90th percentile, and ingestion freshness under 15 minutes for streaming connectors and per schedule for batch connectors. These are monitored continuously and published in the quarterly service review, but are not credited under the SLA.

## 7. Contact

SLA and support enquiries: your Customer Success Manager or support@kestrelcloud.example.
