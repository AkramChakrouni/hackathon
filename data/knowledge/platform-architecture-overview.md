---
title: "Kestrel Platform Architecture Overview"
kind: product_doc
owner: "Engineering"
updated: "2026-06-01"
---

# Kestrel Platform Architecture Overview

## 1. What the platform does

The Kestrel Platform is a customer data integration and analytics platform. It connects to a customer's SaaS applications and databases, ingests and models the data into a governed analytical layer, and serves it through dashboards, scheduled reports, a natural-language assistant, and APIs. Typical customers integrate 5 to 60 sources.

## 2. Hosting and regions

The platform is hosted on AWS. Production runs in **eu-central-1 (Frankfurt)** across three Availability Zones, with a warm standby in **eu-west-1 (Dublin)**. Since Q1 2026, US customers can request hosting in **us-east-1 (N. Virginia)** with DR in us-west-2. A tenant lives in exactly one region; region is chosen at provisioning and all data, backups, and logs stay in that region.

Kestrel is a multi-tenant SaaS: infrastructure (Kubernetes clusters, database clusters, storage) is shared, while tenant data is isolated through a dedicated AWS KMS key per tenant and row-level tenancy enforced in the data access layer. Dedicated single-tenant deployments are not offered.

## 3. Components

| Layer | Technology | Notes |
|---|---|---|
| Edge | Cloudflare (CDN, WAF, DDoS), AWS ALB | TLS 1.2+/1.3 termination, rate limiting |
| Web application | React single-page application | Served via CloudFront, SSO login |
| API gateway and services | Go and Python microservices on Amazon EKS | REST and GraphQL APIs; mutual TLS via service mesh |
| Ingestion | Connector workers on EKS; Apache Kafka (Amazon MSK) | 140+ connectors (Salesforce, HubSpot, PostgreSQL, MySQL, Snowflake, BigQuery, S3, SFTP, webhooks) |
| Transformation | dbt-compatible modelling engine; Apache Spark on EMR for large jobs | Version-controlled models, lineage tracking |
| Storage | Amazon Aurora PostgreSQL (metadata, tenant configuration), Amazon S3 (Parquet data lake), analytics warehouse (Amazon Redshift Serverless) | All encrypted with per-tenant KMS keys |
| Search and cache | Amazon OpenSearch, ElastiCache (Redis) | Encrypted at rest and in transit |
| Kestrel Assist | Orchestration service on EKS; open-weight LLM hosted by Nebius (Finland) | Zero data retention, disable per tenant |
| Observability | Datadog (EU), PagerDuty | 12-month log retention |
| Infrastructure as code | Terraform, Argo CD, GitHub Actions | All changes via PR |

## 4. Tenancy model

Every row in every table carries a `tenant_id`. Database access goes through a repository layer that injects the tenant predicate from the authenticated session; PostgreSQL row-level security policies enforce the same predicate at the database level as a second control. S3 objects are stored under a per-tenant prefix, encrypted with the tenant's KMS key, and accessed through IAM session policies scoped to that prefix. Warehouse workloads run in per-tenant schemas with per-tenant credentials. Cross-tenant access is tested on every pull request by an automated tenancy test suite and annually by the penetration test.

## 5. Data flow

1. Customers configure a connector with credentials stored in AWS Secrets Manager; OAuth is used wherever the source supports it.
2. Connector workers extract data over TLS (or via PrivateLink, SSH tunnel, or static egress IPs) and publish to Kafka.
3. Stream processors land raw data in the S3 lake as Parquet under the tenant prefix, then the modelling engine builds governed tables in the warehouse.
4. Dashboards, reports, the API, and Kestrel Assist query the warehouse through the tenant-scoped access layer.
5. Exports are produced to a signed, time-limited S3 URL or delivered to the customer's own storage.

## 6. Integration surface

- **REST API** (`api.kestrelcloud.example/v2`) and **GraphQL** with OAuth 2.0 client credentials or scoped API tokens, rate-limited per tenant.
- **Webhooks** for pipeline events, signed with HMAC-SHA256.
- **Embedded analytics** via signed iframe tokens with a tenant-configured domain allowlist.
- **Warehouse sharing** (Enterprise) to Snowflake or Redshift accounts owned by the customer.
- **SCIM 2.0** and **SAML/OIDC** for identity.

## 7. Scalability and resilience

Services autoscale on EKS with Karpenter; ingestion scales horizontally on Kafka partitions. Aurora runs with a writer and two readers across AZs and Global Database replication to the DR region. Recovery objectives are RPO 1 hour and RTO 4 hours; see the BCP for DR testing results.

