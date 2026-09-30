# PULSO System - Login Credentials

This document contains the hardcoded and seeded login credentials for testing and development of the PULSO Citizen Platform and LGU Command Center.

## 🏛️ Government Portal (`/gov`)
All standard government personnel share the same default password: **`CEO@pulso2025!`**
System Admin has a unique password.

| Role | Email | Password |
|---|---|---|
| **City Engineer** | `city.engineer@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Asst. City Engineer** | `asst.engineer@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Admin Officer** | `admin.officer@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Admin Clerk** | `admin.clerk@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Records Officer** | `records.officer@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Design Engineer** | `design.engineer@caloocan.gov.ph` | `CEO@pulso2025!` |
| **CAD Operator** | `cad.operator@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Project Engineer** | `project.engineer@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Estimator (QS)** | `estimator@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Construction Foreman**| `foreman@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Field Worker** | `field.worker@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Building Inspector** | `building.inspector@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Electrical Inspector**| `electrical.inspector@caloocan.gov.ph` | `CEO@pulso2025!` |
| **Mechanical Inspector**| `mechanical.inspector@caloocan.gov.ph` | `CEO@pulso2025!` |
| **System Administrator**| `[EMAIL_ADDRESS]` | `SysAdmin@pulso2025!` |

## 🙋 Resident Portal (`/login`)
These accounts are used for general testing of the citizen-facing features and legacy generic testing. Ensure you run `python create_test_accounts.py` if these don't work.

| Role | Email | Password |
|---|---|---|
| **Citizen / Resident** | `resident@pulso.com` | `password123` |
| **Dispatcher (Test)** | `dispatcher@pulso.com` | `password123` |
| **Manager (Test)** | `manager@pulso.com` | `password123` |

> **Note:** Dispatcher and Manager accounts should generally be accessed via the `/gov` portal using the official `.gov.ph` seeded accounts for the most accurate role-based dashboard experience.
