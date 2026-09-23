---
title: "Network Security Architecture"
kind: product_doc
owner: "Engineering"
updated: "2026-06-01"
---

# Network Security Architecture

## 1. Overview

The Kestrel Platform runs in dedicated AWS accounts per environment (production, staging, development, security tooling, and log archive) under a single AWS Organization with service control policies. Each production region (eu-central-1 primary, eu-west-1 DR, us-east-1 for US customers) uses an identical VPC layout defined in Terraform. Marketing and corporate workloads live in separate accounts with no network path to the platform.

## 2. VPC segmentation

Each production VPC spans three Availability Zones and is divided into tiers:

| Tier | Subnets | Contents | Internet exposure |
|---|---|---|---|
| Edge | Public | Application Load Balancers, NAT gateways | Inbound only from Cloudflare IP ranges |
| Application | Private | EKS worker nodes running API, web, ingestion, and Kestrel Assist services | None (egress via NAT) |
| Data | Isolated | Aurora PostgreSQL, ElastiCache, OpenSearch, analytics warehouse | None; no route to internet or NAT |
| Management | Private | Bastion (Session Manager endpoints), CI runners | None |

Security groups implement default-deny with explicit allow rules between tiers; for example, only the application tier security group may reach Aurora on port 5432. Kubernetes NetworkPolicies (Calico) enforce namespace-level isolation between services within the cluster, and the service mesh requires mutual TLS for all east-west traffic.

Databases are never assigned public IP addresses, have no route to an internet gateway, and are additionally protected by AWS Config rule `rds-instance-public-access-check`, which alerts on any drift.

## 3. Edge protection

All customer traffic enters through Cloudflare, which provides:

- **WAF** with the OWASP Core Rule Set and Cloudflare managed rules, plus Kestrel-specific rules (for example, blocking non-JSON bodies on API routes). WAF is in blocking mode.
- **DDoS protection** at layers 3, 4, and 7 with automatic mitigation; Kestrel's plan includes an unmetered mitigation commitment.
- **Rate limiting** per IP, per token, and per tenant on authentication, export, and query endpoints.
- **Bot management** and TLS termination with TLS 1.2 minimum and TLS 1.3 preferred.

Origin load balancers accept traffic only from Cloudflare's published IP ranges and verify an authenticated origin pull certificate, so the platform cannot be reached by bypassing the WAF.

## 4. Intrusion detection

AWS GuardDuty is enabled in every account and region, including EKS Protection, S3 Protection, Malware Protection, and RDS Protection, with findings routed to Datadog Cloud SIEM and PagerDuty. VPC Flow Logs, DNS query logs (Route 53 Resolver), and Kubernetes audit logs feed the same detection pipeline. Inspection of egress traffic is enforced through AWS Network Firewall with domain allowlists for the data tier and ingestion workers, so a compromised workload cannot exfiltrate data to arbitrary destinations.

## 5. Customer connectivity options

- **IP allowlisting:** tenant administrators can restrict access to the web application and API to a list of CIDR ranges, enforced at Cloudflare and again in the application.
- **Static egress IPs:** all connector traffic to customer data sources originates from a published, per-region set of static NAT IP addresses (four per region) that customers can allowlist on their firewalls.
- **AWS PrivateLink:** available for customers hosting data sources in AWS who prefer not to expose them to the internet; provisioned within 5 business days on request.
- **SSH tunnelling:** connectors support SSH bastion tunnels with Kestrel-generated key pairs for on-premises databases.

Kestrel Assist calls to the EU-hosted model provider (Nebius, Finland) traverse a dedicated egress path with mutual TLS and are restricted by the Network Firewall allowlist.

## 6. Remote and corporate access

Kestrel has no corporate network with privileged access. Offices in Amsterdam and Lisbon are treated as untrusted internet; access to internal tools is through Okta with device posture checks (managed, encrypted, EDR running). Production access uses AWS Systems Manager Session Manager via the bastion, with no inbound SSH ports open anywhere in the estate.

## 7. Validation

Network controls are validated through weekly Tenable external scans, the annual penetration test (external perimeter in scope), continuous AWS Config and Checkov policy checks, and a quarterly firewall rule review by the SRE lead. The March 2026 penetration test identified no findings against the network perimeter.
