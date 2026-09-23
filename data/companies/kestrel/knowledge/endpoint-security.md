---
title: "Endpoint Security Standard"
kind: policy
owner: "Security"
updated: "2026-06-01"
---

# Endpoint Security Standard

**Document ID:** POL-SEC-009 | **Version:** 2.6 | **Owner:** Security | **Effective:** 1 June 2026

## 1. Scope

This standard applies to every laptop, desktop, and mobile device used to access Kestrel systems, code, or customer data. Kestrel issues corporate laptops to all employees and long-term contractors; personal devices may not be used for engineering, production, or customer-data work. Approximately 195 corporate endpoints are under management (172 macOS, 23 Windows).

## 2. Device management

| Platform | MDM | Enrolment |
|---|---|---|
| macOS (Apple silicon MacBook Pro) | Jamf Pro | Automated Device Enrollment via Apple Business Manager; supervised |
| Windows 11 | Microsoft Intune | Windows Autopilot; Azure AD joined |
| iOS / Android (optional, corporate email only) | Intune MAM | App-level protection; no device-level access to platform tools |

Devices are shipped directly from the vendor and enrol automatically on first boot, so a device is never in an unmanaged state. MDM enforces the configuration baseline described below and reports compliance to Okta, which is used for device-posture checks: a device that is not enrolled, not encrypted, or missing EDR cannot authenticate to any Okta-protected application, including GitHub, AWS, and the admin console.

## 3. Configuration baseline

- **Full-disk encryption:** FileVault 2 (macOS) and BitLocker with TPM (Windows) enforced; recovery keys held only in the MDM and accessible to IT administrators under ticket.
- **Endpoint detection and response:** CrowdStrike Falcon deployed on 100% of endpoints with prevention policies enabled, tamper protection on, and telemetry forwarded to Datadog. Detections page the on-call security engineer.
- **Automatic patching:** operating system and browser updates enforced within 7 days of release, with a forced restart after 14 days; third-party applications patched through Jamf and Intune patch management.
- **Screen lock:** automatic lock after 5 minutes of inactivity; password or biometric required to unlock.
- **Local accounts:** users are standard (non-admin); temporary administrator elevation is available through a self-service tool that logs and expires after 30 minutes.
- **USB and removable media:** mass-storage devices are blocked by CrowdStrike Device Control except for a small IT allowlist; HID and display devices are permitted.
- **Firewall:** host firewall enabled with inbound connections blocked by default.
- **Browser:** managed Chrome or Edge with enforced safe browsing and an extension allowlist.
- **Secure boot and firmware:** Apple secure boot and Windows Secure Boot required; devices with firmware tampering indicators are quarantined.
- **DNS filtering:** Cloudflare Gateway blocks known-malicious and phishing domains on and off the corporate network.

## 4. Data handling on endpoints

Customer data must not be stored on endpoints. Engineers work against staging environments with synthetic data; production data access occurs only through the audited bastion and query proxy, which prevent bulk download to the local device. Corporate documents live in Google Workspace with data-loss-prevention rules that block external sharing of files labelled Confidential or Restricted. Email attachments containing customer data are prohibited by policy and detected by DLP.

## 5. Lost or stolen devices

Users must report a lost or stolen device within 4 hours to it@kestrelcloud.example or the 24/7 on-call line. IT issues a remote lock and wipe through the MDM, revokes Okta sessions and device trust, and rotates any credentials the device could have cached. Because devices are encrypted and credentials are short-lived, the incident is normally classified Sev-4. Three devices were reported lost in 2025; all were wiped remotely within 2 hours and none resulted in data exposure.

## 6. Monitoring and compliance

Endpoint compliance is reported daily to the Security team. At the last review (May 2026), 100% of endpoints had encryption, EDR, and current patch level; 2 devices were temporarily non-compliant for patching due to extended leave and were blocked from application access until updated. Compliance is a tested control in the SOC 2 Type II report (CC6.8) with no exceptions.

## 7. Offboarding

On departure, device access is revoked as part of the 24-hour offboarding process, the device is remotely wiped if not returned within 5 business days, and returned devices are securely erased and re-imaged before reissue.
