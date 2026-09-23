# Personivo B.V. Incident Response and Business Continuity Policy

Document owner: Information Security Officer (CTO)
Version: 2.4
Effective: 1 October 2026
Next review: May 2027
Classification: Confidential

## 1. Incident classification and response times

* P1 Critical (confirmed breach of customer data, or platform unavailable): response within 30 minutes, 24/7
* P2 High (suspected breach, major degradation): response within 2 hours, 24/7
* P3 Medium: response next business day
* P4 Low: response within 5 business days

An on-call engineer is available 24/7 through a rotation schedule. Security events are triaged by the on-call engineer using documented playbooks.

## 2. Incident response plan

Every P1 and P2 incident is assigned an incident lead and a communications lead. The response follows five phases: detection and triage, containment, eradication, recovery, and post-incident review.

Communication: internal coordination takes place in a dedicated Microsoft Teams incident channel. Affected customers are informed through their designated security contacts by email and phone, and status updates are published on status.personivo.example. For personal data breaches, affected customers are notified at the latest 24 hours after confirmation. Where Personivo is controller, it notifies the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) within 72 hours. For customers subject to DORA, Personivo provides the information they need for their own major incident reporting.

## 3. Incident records and lessons learned

All incidents are recorded in the incident register in Jira. A post-incident review with root cause analysis is completed within 5 business days of every P1 and P2 incident. The register is reviewed quarterly to identify trends and systemic issues. The incident response plan is tested annually through a tabletop exercise (most recent: March 2026) and updated after significant incidents.

## 4. Business continuity

A business impact analysis (BIA) is reviewed annually and after significant changes. Recovery targets for the platform are an RPO of 1 hour and an RTO of 4 hours. The business continuity plan is reviewed annually and tested annually (most recent: tabletop exercise in March 2026 and disaster recovery failover test in April 2026).

## 5. Backups

Databases are backed up automatically with a full backup every day and transaction log backups every 5 minutes, allowing point in time restore for 35 days. Backups are encrypted with AES-256, stored geo-redundantly in Azure North Europe (Ireland), and accessible only to two named administrators. File storage uses geo-redundant storage (GRS). Restore tests are performed monthly and the results are documented.

## 6. Disaster recovery

The platform runs across three availability zones in Azure West Europe. If the whole region becomes unavailable, the platform is restored in Azure North Europe using the geo-redundant backups and infrastructure as code. A full disaster recovery failover exercise is performed annually (most recent: April 2026).

## 7. Communication during disruptions

During a business continuity event, customers are informed through the status page and by email to their designated contacts. Internal coordination takes place in a Microsoft Teams bridge led by the incident lead.
