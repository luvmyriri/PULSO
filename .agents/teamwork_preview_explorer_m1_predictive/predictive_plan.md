# Comprehensive Implementation Blueprint: Purging Synthetic Randomness & Deterministic Engineering Integration in `predictive_router.py`

**Role:** Predictive Analytics Explorer (Milestone 1)  
**Target File:** `backend/predictive_router.py`  
**Supporting Engines:** `backend/predictive_service.py`, `backend/predictive_engine.py`, `backend/analytics_service.py`  
**Database Models:** `InfrastructureAsset`, `MaintenanceHistory`, `WorkOrder`, `EnvironmentalContext`, `ProjectRequest`, `SystemDocument` (`gov_models.py`), `Report`, `Barangay` (`models.py`)  
**Date:** 2026-09-18  

---

## 1. Executive Summary & Audit of Synthetic Randomness

The PULSO Government Workspace predictive maintenance module provides engineering leaders and dispatchers with condition monitoring, risk forecasting, and preventive intervention scheduling for municipal physical infrastructure in Caloocan City.

An exhaustive audit of `backend/predictive_router.py` revealed that despite the presence of a mathematically rigorous, DPWH-standard calculation engine in `backend/predictive_service.py`, `predictive_router.py` bypasses this engine and instead relies on **14 distinct invocations of `random.randint` and `random.uniform`** (plus a hardcoded mock cost multiplication formula). This introduces non-deterministic, fluctuating figures on every browser refresh, violating the core Civic Aperture thesis and government engineering auditability.

### Complete Inventory of All 14 `random.*` Calls + Mock Multiplier

| # | File & Line Number | Verbatim Code Snippet | Variable / Field Affected | Current Flawed Behavior | Deterministic Replacement Strategy |
|---|-------------------|------------------------|---------------------------|-------------------------|------------------------------------|
| **0** | `predictive_router.py:11` | `import random` | Module import | Imports standard random library | **Remove import entirely**. Disallow `random` in router. |
| **M1** | `predictive_router.py:107` | `"scheduled_90d_cost_formatted": format_currency(urgent_cnt * 12500)` | 90-day total scheduled cost | Multiplies count of urgent assets by hardcoded ₱12,500 | Sum of deterministic DPWH preventive unit costs (`COST_MODEL[cat]["cost"] * 0.32`) across assets scheduled in 90d horizon. |
| **1** | `predictive_router.py:129` | `fail_prob_30 = round(random.uniform(0.01, 0.1), 2)` | `failure_probability_30d` | Generates floating-point noise between 0.01 and 0.10 | Call `predictive_service._failure_probability(freq, rec, days_since, category, target_days=30)`. |
| **2** | `predictive_router.py:130` | `fail_prob_60 = round(random.uniform(0.1, 0.25), 2)` | `failure_probability_60d` | Generates floating-point noise between 0.10 and 0.25 | Call `predictive_service._failure_probability(freq, rec, days_since, category, target_days=60)`. |
| **3** | `predictive_router.py:131` | `fail_prob_90 = round(random.uniform(0.2, 0.5), 2)` | `failure_probability_90d` | Generates floating-point noise between 0.20 and 0.50 | Call `predictive_service._failure_probability(freq, rec, days_since, category, target_days=90)`. |
| **4** | `predictive_router.py:172` | `"report_count": random.randint(0, 10)` | `report_count` | Generates random citizen report count from 0 to 10 | Real DB count from `MaintenanceHistory`, `WorkOrder`, and matching `Report` records in lookback window (90 days). |
| **5** | `predictive_router.py:175` | `"recurrence_rate": round(random.uniform(0.1, 0.4), 2)` | `recurrence_rate` | Generates random decimal between 0.10 and 0.40 | Real DB calculation: ratio of repeated maintenance events or chronic reports over multi-interval baseline. |
| **6** | `predictive_router.py:176` | `"days_since_last_maintenance": random.randint(10, 300)` | `days_since_last_maintenance` | Generates random integer between 10 and 300 days | Real DB calculation: `(today - max(completion_date)).days` from `MaintenanceHistory`, fallback to `WorkOrder`, fallback to `asset.date_completed`. |
| **7** | `predictive_router.py:177` | `"next_maintenance_date": (datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")` | `next_maintenance_date` | Adds random offset between 5 and 60 days to current date | Deterministic piecewise mapping `predictive_service._next_maintenance_date(health_score)` based on health score tier. |
| **8** | `predictive_router.py:178` | `"freq_per_month": round(random.uniform(0.1, 2.0), 1)` | `freq_per_month` | Generates random monthly frequency between 0.1 and 2.0 | Real DB formula: `round(report_count / (days_back / 30.0), 2)`. Zero reports $\to$ 0.0. |
| **9** | `predictive_router.py:212` | `week = random.randint(1, 4)` | `week_number` (in `/schedule`) | Randomly assigns asset to weeks 1 through 4 | Deterministic weekly calendar bucket: `max(1, min(4, ((next_maintenance_date - today).days // 7) + 1))`. |
| **10** | `predictive_router.py:213` | `cost = random.randint(5000, 50000)` | `estimated_cost` (in `/schedule`) | Generates random cost between ₱5,000 and ₱50,000 | DPWH Region 3 unit price standard: `COST_MODEL[cat]["cost"] * PREVENTIVE_COST_RATIO (0.32)` or historical average. |
| **11** | `predictive_router.py:443` | `fail_30 = round(random.uniform(0.01, 0.1), 2)` | CSV export `Failure Prob 30d` | Random number in exported CSV | Deterministic `fail_prob_30` computed from asset risk profile and real maintenance history. |
| **12** | `predictive_router.py:444` | `fail_60 = round(random.uniform(0.1, 0.25), 2)` | CSV export `Failure Prob 60d` | Random number in exported CSV | Deterministic `fail_prob_60` computed from asset risk profile and real maintenance history. |
| **13** | `predictive_router.py:445` | `fail_90 = round(random.uniform(0.2, 0.5), 2)` | CSV export `Failure Prob 90d` | Random number in exported CSV | Deterministic `fail_prob_90` computed from asset risk profile and real maintenance history. |
| **14** | `predictive_router.py:450` | `(datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")` | CSV export `Next Maintenance` | Random date in exported CSV | Deterministic `next_maintenance_date` matching the API health endpoint. |

---

## 2. Deterministic Mathematical Models & Calculation Engine

The replacement architecture leverages the formulas established in `backend/predictive_service.py` and `backend/predictive_engine.py`, connecting them directly to live database tables.

### 2.1 Category Risk Profiles & Failure Decay Rates
Each physical infrastructure category possesses an empirically grounded decay rate $\lambda_{\text{cat}}$ and design lifespan $L_{\text{years}}$:

```python
CATEGORY_RISK_PROFILE = {
    "roads":       {"decay_rate": 0.08, "lifespan_years": 7,  "seasonal_amp": 1.4},
    "pothole":     {"decay_rate": 0.08, "lifespan_years": 7,  "seasonal_amp": 1.4},
    "drainage":    {"decay_rate": 0.12, "lifespan_years": 5,  "seasonal_amp": 2.0},
    "streetlight": {"decay_rate": 0.05, "lifespan_years": 10, "seasonal_amp": 1.1},
    "electrical":  {"decay_rate": 0.05, "lifespan_years": 10, "seasonal_amp": 1.1},
    "structural":  {"decay_rate": 0.03, "lifespan_years": 20, "seasonal_amp": 1.2},
    "bridge":      {"decay_rate": 0.03, "lifespan_years": 25, "seasonal_amp": 1.2},
    "building":    {"decay_rate": 0.04, "lifespan_years": 30, "seasonal_amp": 1.1},
    "sidewalk":    {"decay_rate": 0.06, "lifespan_years": 8,  "seasonal_amp": 1.3},
    "flooding":    {"decay_rate": 0.15, "lifespan_years": 3,  "seasonal_amp": 2.5},
    "default":     {"decay_rate": 0.07, "lifespan_years": 8,  "seasonal_amp": 1.3},
}
```

### 2.2 Seasonal Amplification Multiplier ($S(t)$)
Caloocan City's tropical monsoon climate significantly accelerates infrastructure deterioration during the Philippine southwest monsoon and typhoon season (June through November):
- **Peak Rainy Months (July, August, September):** $S(t) = 1.60$
- **Standard Rainy Months (June, October, November):** $S(t) = 1.30$
- **Dry Season (December through May):** $S(t) = 1.00$

$$\text{Seasonal Multiplier } S(t) = \begin{cases} 1.6 & \text{if } \text{month}(t) \in \{7, 8, 9\} \\ 1.3 & \text{if } \text{month}(t) \in \{6, 10, 11\} \\ 1.0 & \text{otherwise} \end{cases}$$

### 2.3 Failure Probability Forecasting Formula ($P_{\text{fail}}$)
The probability of infrastructure failure within a time horizon of $T \in \{30, 60, 90\}$ days is calculated deterministically via three component factors:

1. **Frequency Factor ($f_{\text{freq}}$):**
   $$f_{\text{freq}} = \min\left(1.0, \frac{\text{freq\_per\_month}}{5.0}\right)$$
   Where $\text{freq\_per\_month} = \frac{\text{report\_count}}{\max(\text{lookback\_days} / 30.0, 1.0)}$.

2. **Time Decay Factor ($f_{\text{time}}$):**
   $$f_{\text{time}} = 1.0 - \exp\left(-\lambda_{\text{cat}} \cdot \frac{\text{days\_since\_last\_maintenance} + T}{30.0}\right)$$
   As time since last maintenance increases, or as the forecast horizon expands ($T=30 \to 60 \to 90$), $f_{\text{time}}$ grows strictly monotonically.

3. **Recurrence Factor ($f_{\text{rec}}$):**
   $$f_{\text{rec}} = 0.50 + \left(0.50 \cdot \text{recurrence\_rate}\right)$$
   Where $\text{recurrence\_rate} \in [0.0, 1.0]$.

4. **Composite Probability ($P_{\text{fail}}(T)$):**
   $$\text{Raw} = \left(0.35 \cdot f_{\text{freq}} + 0.35 \cdot f_{\text{time}} + 0.30 \cdot f_{\text{rec}}\right) \cdot S(t_{\text{now}} + T)$$
   $$P_{\text{fail}}(T) = \text{round}\left(\min(1.0, \max(0.0, \text{Raw})), 2\right)$$

This formula is completely deterministic, bounded in $[0.0, 1.0]$, and guaranteed to satisfy $P_{\text{fail}}(30) \le P_{\text{fail}}(60) \le P_{\text{fail}}(90)$.

### 2.4 Asset Health Score (AHS)
The Asset Health Score is evaluated using the calibrated multi-factor model from `predictive_engine.py:calculate_ahs`:
$$\text{AHS} = \max\left(0.0, 100.0 - \left(\text{Pen}_{\text{age}} + \text{Pen}_{\text{freq}} + \text{Pen}_{\text{sev}} + \text{Pen}_{\text{qa}} + \text{Pen}_{\text{flood}}\right)\right)$$
- **Age Penalty ($\text{Pen}_{\text{age}}$, max 25%):** $\min\left(\frac{\text{age\_years}}{\text{design\_life}}, 1.0\right) \times 25$
- **Frequency Penalty ($\text{Pen}_{\text{freq}}$, max 20%):** $\min\left(\frac{\text{incidents\_90d}}{5.0}, 1.0\right) \times 20$
- **Severity Penalty ($\text{Pen}_{\text{sev}}$, max 20%):** $\min\left(\frac{\text{avg\_cost}}{100,000}, 1.0\right) \times 20$
- **QA Penalty ($\text{Pen}_{\text{qa}}$, max 25%):** $\min\left(\frac{\text{qa\_rejections}}{5.0}, 1.0\right) \times 25$
- **Flood Risk Penalty ($\text{Pen}_{\text{flood}}$, max 10%):** 10 for High, 5 for Medium, 0 for Low.

**Priority Classification:**
- $\text{AHS} \le 35$: `CRITICAL`
- $35 < \text{AHS} \le 55$: `HIGH`
- $55 < \text{AHS} \le 75$: `MODERATE`
- $75 < \text{AHS} \le 90$: `WATCH`
- $\text{AHS} > 90$: `GOOD`

### 2.5 Deterministic Next Maintenance Date Schedule
In place of adding a random 5–60 day delta, the maintenance date is a deterministic step function of the asset's health score:

$$\Delta_{\text{days}}(\text{AHS}) = \begin{cases} 
7 & \text{if } \text{AHS} \le 15 \quad (\text{Emergency Intervention}) \\
30 & \text{if } 15 < \text{AHS} \le 35 \quad (\text{Critical Rehabilitation}) \\
60 & \text{if } 35 < \text{AHS} \le 55 \quad (\text{Preventive Repair}) \\
120 & \text{if } 55 < \text{AHS} \le 75 \quad (\text{Scheduled Service}) \\
180 & \text{if } \text{AHS} > 75 \quad (\text{Routine Inspection})
\end{cases}$$

$$\text{next\_maintenance\_date} = \left(t_{\text{today}} + \Delta_{\text{days}}(\text{AHS})\right)\text{.strftime}("\%Y-\%m-\%d")$$

### 2.6 DPWH 2024 Region 3 Cost Standards & Preventive Ratio
Cost estimation adheres to the DPWH 2024 Unit Price Guide (Region 3 / NCR-adjacent) from `analytics_service.COST_MODEL`:

```python
DPWH_UNIT_COSTS = {
    "pothole":            12_500.0,   # per sqm
    "road":               28_000.0,   # per sqm
    "drainage":           45_000.0,   # per lin_m
    "drainage_clearing":   8_500.0,   # per lin_m
    "flooding":           95_000.0,   # per sqm
    "streetlight":        85_000.0,   # per unit
    "electrical":         85_000.0,   # per unit
    "sidewalk":            6_500.0,   # per sqm
    "structural":         65_000.0,   # per sqm
    "bridge":             75_000.0,   # per sqm
    "building":           55_000.0,   # per sqm
    "default":            20_000.0,
}
PREVENTIVE_COST_RATIO = 0.32  # Standard DPWH preventive maintenance ratio
```

For any scheduled maintenance item:
$$\text{estimated\_cost} = \text{round}\left(\text{DPWH\_UNIT\_COST}[\text{category}] \times \text{PREVENTIVE\_COST\_RATIO}, 2\right)$$
If the asset has historical maintenance records with recorded costs in `MaintenanceHistory`, the asset's specific historical average cost is factored in:
$$\text{historical\_avg} = \text{avg}(\text{MaintenanceHistory.cost})$$
$$\text{estimated\_cost} = \begin{cases} 
\text{round}(\text{historical\_avg} \times 0.32, 2) & \text{if historical records exist} \\
\text{round}(\text{DPWH\_UNIT\_COST}[\text{category}] \times 0.32, 2) & \text{otherwise}
\end{cases}$$

---

## 3. Database Query Architecture & Entity Relationships

To achieve zero synthetic data, four core database tables are queried via SQLAlchemy 2.0 sessions:

```
┌───────────────────────────┐         ┌───────────────────────────┐
│    InfrastructureAsset    │1       *│    MaintenanceHistory     │
│  (gov_models.py)          ├─────────┤  (gov_models.py)          │
│  - asset_id (PK, string)  │         │  - log_id (PK)            │
│  - category, barangay     │         │  - asset_id (FK)          │
│  - date_completed         │         │  - completion_date, cost  │
│  - design_life            │         │  - work_type              │
└─────────────┬─────────────┘         └───────────────────────────┘
              │ 1
              │
              │ *                     ┌───────────────────────────┐
              ├───────────────────────┤          Report           │
              │                       │  (models.py)              │
              │ *                     │  - id, created_at         │
┌─────────────┴─────────────┐         │  - location_barangay      │
│         WorkOrder         │         │  - category, status       │
│  (gov_models.py)          │*       1│  - location_lat, lng      │
│  - id, wo_number          ├─────────┤  (Spatial / Brgy Match)   │
│  - asset_id (FK)          │         └───────────────────────────┘
│  - report_id (FK)         │
│  - completed_date, status │
└───────────────────────────┘
```

### Specific Database Queries:

#### 1. Days Since Last Maintenance
```python
# Primary: Query the most recent completion_date from MaintenanceHistory
last_maint_date = db.query(func.max(MaintenanceHistory.completion_date)).filter(
    MaintenanceHistory.asset_id == asset.asset_id
).scalar()

if last_maint_date:
    days_since = (datetime.date.today() - last_maint_date).days
else:
    # Secondary: Check most recently completed WorkOrder
    last_wo_date = db.query(func.max(WorkOrder.completed_date)).filter(
        WorkOrder.asset_id == asset.asset_id,
        WorkOrder.status == "completed"
    ).scalar()
    if last_wo_date:
        days_since = (datetime.datetime.now(timezone.utc) - last_wo_date).days
    elif asset.date_completed:
        # Tertiary: Fall back to initial asset commissioning date
        days_since = (datetime.date.today() - asset.date_completed).days
    else:
        # Default baseline for unmaintained asset with no recorded date
        days_since = 365

days_since = max(0, days_since)
```

#### 2. Report Count & Incident Activity (90-Day Lookback)
```python
ninety_days_ago = datetime.date.today() - datetime.timedelta(days=90)
ninety_days_ago_dt = datetime.datetime.now(timezone.utc) - datetime.timedelta(days=90)

# A. Historical incident maintenance logs
direct_incidents = db.query(func.count(MaintenanceHistory.log_id)).filter(
    MaintenanceHistory.asset_id == asset.asset_id,
    MaintenanceHistory.completion_date >= ninety_days_ago
).scalar() or 0

# B. Direct work orders assigned to this asset
direct_work_orders = db.query(func.count(WorkOrder.id)).filter(
    WorkOrder.asset_id == asset.asset_id,
    WorkOrder.created_at >= ninety_days_ago_dt
).scalar() or 0

# C. Citizen reports matching the asset's barangay and category
brgy_str = str(asset.barangay or "")
cat_str = str(asset.category or "").lower()

citizen_reports = db.query(func.count(Report.id)).filter(
    (Report.location_barangay == brgy_str) | (Report.location_string.ilike(f"%{brgy_str}%")),
    (Report.category.ilike(f"%{cat_str}%") | Report.ai_category.ilike(f"%{cat_str}%")),
    Report.created_at >= ninety_days_ago_dt,
    Report.status.notin_(["rejected", "spam"])
).scalar() or 0

report_count = direct_incidents + direct_work_orders + citizen_reports
freq_per_month = round(report_count / 3.0, 2)
```

#### 3. Recurrence Rate Calculation
```python
# Measure repeated failures over a 180-day baseline
hundred_eighty_days_ago = datetime.date.today() - datetime.timedelta(days=180)
total_maint_180d = db.query(func.count(MaintenanceHistory.log_id)).filter(
    MaintenanceHistory.asset_id == asset.asset_id,
    MaintenanceHistory.completion_date >= hundred_eighty_days_ago
).scalar() or 0

if total_maint_180d > 1:
    recurrence_rate = min(1.0, round((total_maint_180d - 1) / 5.0, 2))
elif report_count > 1:
    recurrence_rate = min(1.0, round((report_count - 1) / 10.0, 2))
else:
    recurrence_rate = 0.0
```

#### 4. Historical Cost Baseline
```python
avg_cost_val = db.query(func.avg(MaintenanceHistory.cost)).filter(
    MaintenanceHistory.asset_id == asset.asset_id,
    MaintenanceHistory.cost > 0
).scalar()
```

---

## 4. Detailed Specification of Refactored Router Endpoints

### 4.1 `GET /api/gov/predictive/summary`
- **Purpose:** Leadership dashboard KPIs for predictive maintenance.
- **Access:** Authenticated government personnel (`_allow_access`).
- **Logic:**
  1. Retrieve all monitored assets (`db.query(InfrastructureAsset).all()`).
  2. For each asset, compute deterministic `ahs = calculate_ahs(db, a.asset_id)` and `dv = calculate_dv(db, a.asset_id)`.
  3. Aggregate `critical_count` (AHS $\le 35$), `high_count` (35 < AHS $\le 55$), `good_count` (AHS > 90).
  4. Compute `urgent_this_week`: Count of critical/high assets whose `next_maintenance_date` falls within 7 days of today.
  5. Replace mock `urgent_cnt * 12500` with **sum of deterministic preventive costs** of all scheduled assets over the 90-day horizon:
     $$\text{total\_cost} = \sum_{a \in \text{scheduled}} \text{DPWH\_UNIT\_COST}[a.\text{category}] \times 0.32$$
  6. Return top 5 at-risk assets sorted by lowest health score.
- **Response Schema:**
  ```json
  {
    "rainy_season_active": true,
    "total_assets_monitored": 12,
    "avg_health_score": 68,
    "critical_count": 2,
    "high_count": 3,
    "urgent_this_week": 1,
    "assets_needing_immediate_action": 2,
    "scheduled_90d_cost": 72480.0,
    "scheduled_90d_cost_formatted": "PHP72,480.00",
    "good_count": 5,
    "top_at_risk": [
      {
        "priority": "CRITICAL",
        "health_score": 28.5,
        "category": "Drainage",
        "barangay": "171",
        "failure_probability_30d": 0.82
      }
    ]
  }
  ```

### 4.2 `GET /api/gov/predictive/health`
- **Purpose:** Full inventory health cards consumed by `PredictiveMaintenance.jsx`.
- **Logic:**
  1. For each `InfrastructureAsset`:
     - Calculate deterministic `ahs = calculate_ahs(db, a.asset_id)`.
     - Calculate Deterioration Velocity `dv = calculate_dv(db, a.asset_id)`.
     - Query deterministic `days_since`, `report_count`, `freq_per_month`, and `recurrence_rate`.
     - Evaluate failure probabilities via `predictive_service._failure_probability` for 30, 60, and 90 days.
     - Evaluate `next_maintenance_date = _next_maintenance_date(ahs)`.
     - Determine trend: `WORSENING` if $dv > 0.3$, `IMPROVING` if $dv < -0.15$, `STABLE` otherwise.
     - Query audit compliance documents (`SystemDocument`).
  2. Zero instances of `random.uniform` or `random.randint`.
- **Response Schema:**
  ```json
  {
    "health_scores": [
      {
        "asset_id": "CAL-DR-171-001",
        "asset_name": "Bagong Silang Main Outfall Drainage",
        "barangay": "171",
        "category": "Drainage",
        "health_score": 32.0,
        "priority": "CRITICAL",
        "rainy_season_warning": true,
        "failure_probability_30d": 0.78,
        "failure_probability_60d": 0.85,
        "failure_probability_90d": 0.92,
        "report_count": 4,
        "trend": "WORSENING",
        "growth_pct": 50,
        "recurrence_rate": 0.40,
        "days_since_last_maintenance": 185,
        "next_maintenance_date": "2026-09-25",
        "freq_per_month": 1.33,
        "audit_compliance": [
          {
            "name": "Materials Test Report",
            "status": "verified",
            "doc_id": 14,
            "file_name": "materials_test_dr171.pdf",
            "date": "2026-01-15"
          }
        ]
      }
    ]
  }
  ```

### 4.3 `GET /api/gov/predictive/schedule`
- **Purpose:** Weekly calendar view for upcoming preventive maintenance.
- **Logic:**
  1. Filter assets where AHS $\le 75$ (requiring attention).
  2. For each asset, determine `next_maint = _next_maintenance_date(ahs)`.
  3. Calculate `days_until = (datetime.strptime(next_maint, "%Y-%m-%d").date() - today).days`.
  4. Assign week number deterministically:
     $$\text{week} = \max(1, \min(4, (\max(0, \text{days\_until}) // 7) + 1))$$
  5. Calculate deterministic cost:
     $$\text{cost} = \text{DPWH\_UNIT\_COST}[\text{category}] \times 0.32$$
  6. Group items by week numbers 1–4 and aggregate weekly item counts and costs.
  7. Purges `week = random.randint(1, 4)` and `cost = random.randint(5000, 50000)`.
- **Response Schema:**
  ```json
  {
    "total_items": 5,
    "critical_count": 2,
    "rainy_season_active": true,
    "total_cost_formatted": "PHP72,480.00",
    "weekly_summary": [
      {
        "week_number": 1,
        "week_label": "Week 1 (Sep 18 - Sep 25)",
        "item_count": 2,
        "total_cost_formatted": "PHP28,800.00",
        "critical_count": 2
      }
    ],
    "schedule_items": [
      {
        "week_number": 1,
        "priority": "CRITICAL",
        "rainy_season_warning": true,
        "category": "Drainage",
        "barangay": "171",
        "maintenance_type": "Emergency Intervention",
        "scheduled_date": "2026-09-25",
        "estimated_cost_formatted": "PHP14,400.00",
        "failure_prob": 0.78
      }
    ]
  }
  ```

### 4.4 `GET /api/gov/predictive/risk-map`
- **Purpose:** Geospatial barangay risk aggregation.
- **Logic:**
  1. Group assets by barangay (`EnvironmentalContext` / `Barangay`).
  2. Compute average health score per barangay: $\text{avg\_ahs} = \text{round}(\sum \text{AHS} / N)$.
  3. Determine overall barangay priority from `avg_ahs`.
  4. Assign standard Civic Aperture status hex color:
     - `CRITICAL`: `#ef4444`
     - `HIGH`: `#f97316`
     - `MODERATE`: `#eab308`
     - `WATCH`: `#3b82f6`
     - `GOOD`: `#22c55e`
  5. Include list of specific infrastructure categories at risk in that barangay.

### 4.5 `GET /api/gov/predictive/export`
- **Purpose:** CSV data export for engineering audit and DPWH reporting.
- **Logic:**
  1. Stream CSV with headers: `Asset ID, Asset Name, Category, Barangay, Health Score, Priority, Failure Prob 30d, Failure Prob 60d, Failure Prob 90d, Next Maintenance`.
  2. Populate `fail_30`, `fail_60`, `fail_90`, and `next_maintenance` with the **exact same deterministic values** as `/health`.
  3. Eliminate lines 443–445 and 450 (`random.uniform` and `random.randint`).

### 4.6 New Contract Endpoint: `GET /api/gov/predictive/maintenance-scores`
- **Specification:** Mandated by `PROJECT.md` lines 47 and 117.
- **Logic:**
  - Dedicated REST endpoint providing per-asset deterministic DPWH scores based on `asset.date_completed`, `asset.design_life`, recurrence frequency, and rain/flood exposure.
  - Supports query filters: `?category={category}&barangay={barangay}&priority={priority}`.

### 4.7 New Contract Endpoint: `GET /api/gov/predictive/demand-forecast`
- **Specification:** Mandated by `PROJECT.md` lines 118 and Feature 24.
- **Logic:**
  - Connects directly to `analytics_service.get_forecast(db, weeks_back=12, weeks_forward=4)`.
  - Computes historical rolling baseline time-series regression across 12 weeks and projects 4-week forward citizen report demand per barangay and category.
  - Zero mock arrays (`COMPLETION_TREND`, etc.).

---

## 5. Automated Testing Strategy (Pytest Unit Tests)

To ensure that the purge is complete, verifiable, and permanent, a dedicated test file `backend/tests/test_milestone1_predictive_engine.py` will be created with the following test cases:

### 5.1 Test Suite Structure (`test_milestone1_predictive_engine.py`)

```python
"""
test_milestone1_predictive_engine.py — Deterministic Predictive Engine & Randomness Purge Verification
"""

import ast
import inspect
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models, gov_models, auth, predictive_router, predictive_service
from database import Base, get_db
from main import app

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def setup_predictive_db():
    Base.metadata.drop_all(bind=test_engine)
    gov_models.Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    gov_models.Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed Districts, Barangays, Officials, Assets, and MaintenanceHistory
    db = TestingSessionLocal()
    # District & Barangay
    d3 = models.District(id=3, name="District 3", code="D3")
    db.add(d3)
    b171 = models.Barangay(id=171, name="Barangay 171", district_id=3, zip_code="1420")
    db.add(b171)

    # City Engineer user
    eng = models.Official(
        id=501,
        email="city.engineer@caloocan.gov.ph",
        display_name="Engr. Alexis Marc",
        role="city_engineer",
        department="Engineering",
        password_hash=auth.get_password_hash("ValidPass123!")
    )
    db.add(eng)

    # Sample Infrastructure Assets
    a1 = gov_models.InfrastructureAsset(
        asset_id="CAL-RD-171-001",
        asset_name="Camarin Road Segment 4",
        category="Road",
        barangay="171",
        barangay_id=171,
        material_type="Asphalt",
        design_life=10,
        date_completed=datetime.date.today() - datetime.timedelta(days=730) # 2 years old
    )
    a2 = gov_models.InfrastructureAsset(
        asset_id="CAL-DR-171-002",
        asset_name="Bagong Silang Outfall Culvert",
        category="Drainage",
        barangay="171",
        barangay_id=171,
        material_type="Reinforced Concrete",
        design_life=5,
        date_completed=datetime.date.today() - datetime.timedelta(days=1460) # 4 years old
    )
    db.add_all([a1, a2])

    # Environmental Context
    env = gov_models.EnvironmentalContext(
        barangay_id=171,
        flood_risk_level="High",
        soil_subsidence=1.2
    )
    db.add(env)

    # Maintenance Logs
    m1 = gov_models.MaintenanceHistory(
        log_id="LOG-001",
        asset_id="CAL-DR-171-002",
        work_type="Declogging",
        cost=25000.0,
        completion_date=datetime.date.today() - datetime.timedelta(days=120)
    )
    db.add(m1)

    db.commit()
    db.close()

    yield
    app.dependency_overrides.clear()
```

### 5.2 Mandatory Test Cases

1. **`test_zero_random_import_and_invocations()`** (Static AST Inspection)
   - Inspects `backend/predictive_router.py` using Python's `ast` parser.
   - Asserts that no `ast.Import` or `ast.ImportFrom` imports `random`.
   - Asserts that no `ast.Call` invokes `random.randint`, `random.uniform`, `random.choice`, or `random.random`.

2. **`test_predictive_summary_deterministic_reproducibility()`**
   - Authenticates as City Engineer.
   - Calls `GET /api/gov/predictive/summary` twice consecutively.
   - Asserts `res1.json() == res2.json()` with exact float, integer, and string equality.
   - Asserts `scheduled_90d_cost_formatted` matches the sum of deterministic costs, NOT `urgent_cnt * 12500`.

3. **`test_predictive_health_monotonic_probabilities()`**
   - Calls `GET /api/gov/predictive/health`.
   - For every returned asset in `health_scores`:
     - Asserts $0.0 \le P_{30} \le P_{60} \le P_{90} \le 1.0$.
     - Asserts `report_count` is a non-negative integer derived from DB (`isinstance(int)`).
     - Asserts `next_maintenance_date` matches deterministic `_next_maintenance_date(health_score)`.
     - Asserts `days_since_last_maintenance` matches actual difference to `completion_date` (120 days for `CAL-DR-171-002`).

4. **`test_predictive_schedule_dpwh_unit_costs()`**
   - Calls `GET /api/gov/predictive/schedule`.
   - Asserts all `estimated_cost_formatted` values match DPWH unit cost standards multiplied by `0.32`.
   - Asserts `week_number` is deterministically within $1 \le \text{week} \le 4$.
   - Asserts calling twice yields identical schedule order and totals.

5. **`test_predictive_export_zero_randomness()`**
   - Calls `GET /api/gov/predictive/export`.
   - Parses the CSV output.
   - Verifies that columns `Failure Prob 30d`, `Failure Prob 60d`, `Failure Prob 90d`, and `Next Maintenance` exactly match the deterministic values returned by `/health`.

6. **`test_contract_maintenance_scores_and_demand_forecast()`**
   - Calls `GET /api/gov/predictive/maintenance-scores`. Verifies 200 OK with deterministic score array.
   - Calls `GET /api/gov/predictive/demand-forecast`. Verifies 200 OK with 12-week history and 4-week forecast projections.

7. **`test_unauthorized_role_access_denied()`**
   - Authenticates with an unauthorized role (e.g. resident or field worker without permissions).
   - Verifies HTTP 403 Forbidden on all predictive endpoints.

---

## 6. Implementation Step-by-Step Sequence for Milestone 1 Implementer

The implementer assigned to Milestone 1 should execute this blueprint in the following ordered steps:

1. **Refactor `backend/predictive_service.py` to Expose Core Helpers**:
   - Ensure `_failure_probability`, `_health_score`, `_next_maintenance_date`, `_format_cost`, `_get_category_profile`, and `_seasonal_multiplier` are cleanly accessible or exported.
   - Add asset-level DB query helper `get_asset_incident_metrics(db: Session, asset: InfrastructureAsset, days_back: int = 90)` returning `(report_count, freq_per_month, recurrence_rate, days_since)`.

2. **Refactor `backend/predictive_router.py`**:
   - **Delete line 11**: `import random`.
   - **Import**: `from predictive_service import _failure_probability, _health_score, _next_maintenance_date, _format_cost, CATEGORY_RISK_PROFILE, PREVENTIVE_COST_RATIO, RAINY_MONTHS`.
   - **Import**: `from analytics_service import COST_MODEL, _match_cost_key, get_forecast`.
   - **Refactor `get_predictive_summary`**: Replace line 107 mock calculation with sum of scheduled items' deterministic costs.
   - **Refactor `get_predictive_health`**: Replace lines 129–131 and 172–178 with deterministic queries and formula calls.
   - **Refactor `get_predictive_schedule`**: Replace lines 212–213 with deterministic calendar week binning and DPWH unit costs.
   - **Refactor `export_predictive_data`**: Replace lines 443–445 and 450 with deterministic variables.
   - **Add endpoints**:
     - `@router.get("/maintenance-scores")`
     - `@router.get("/demand-forecast")`

3. **Create Pytest Test Suite**:
   - Write `backend/tests/test_milestone1_predictive_engine.py` containing all 7 test cases specified above.
   - Run `python -m pytest backend/tests/test_milestone1_predictive_engine.py -v`.
   - Run complete suite `python -m pytest backend/tests/ -q` to guarantee zero regression across all existing milestone tests.

4. **Verify Frontend Compatibility**:
   - Verify `frontend/src/components/PredictiveMaintenance.jsx` and `frontend/src/pages/GovAnalyticsPage.jsx` render correctly with the deterministic response schema without any breaking contract changes.
