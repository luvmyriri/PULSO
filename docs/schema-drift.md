# Schema drift at `c455ca49f6d5`

Status: observed and proposed remediation. No drift migration is approved by this document.

## Evidence and limits

The schema-only source was taken from the real PostgreSQL database while its Alembic revision was `c455ca49f6d5`, with `pg_dump --schema-only --no-owner --no-privileges`. It contained no `COPY`, `INSERT`, `UPDATE`, `DELETE`, sequence-value restoration, or row data. The candidate snapshot is [`backend/schema/baseline_c455ca49f6d5.sql`](../backend/schema/baseline_c455ca49f6d5.sql). It intentionally reproduces the observed schema, including its drift from the current SQLAlchemy models. It is not a claim that every application route works on that schema.

Alembic `compare_metadata` against a schema-only restore reported **154 proposed operations**. One is removal of `spatial_ref_sys`, which belongs to the PostGIS extension and must be excluded by a narrow `include_object` rule. The other **153 proposed operations** require review. Autogenerate operations are not necessarily 153 distinct defects: one renamed foreign key can appear as a drop plus an add.

| Autogenerate operation | Count | Initial disposition |
| --- | ---: | --- |
| Add column | 14 | Resident model columns missing in the real schema; additive revision `a9c6e4b2d1f0` addresses the schema gap but has not been applied to the real database |
| Add foreign key | 31 | 29 overlap an existing source/target relation but can differ in delete behavior; 2 require separate review |
| Add index | 22 | Review overlap, query use, and naming before adding |
| Change server default | 6 | Review application behavior before changing |
| Change nullability | 3 | Validate existing rows and write paths before changing |
| Change type | 2 | Assess conversion and precision before changing |
| Remove column | 6 | Preserve until use and data dependencies are reviewed |
| Remove foreign key | 49 | 29 overlapping relation pairs; 20 relations absent from model metadata |
| Remove index | 19 | Preserve until overlap and query use are reviewed |
| Remove table | 2 | `users` is legacy; `spatial_ref_sys` is PostGIS-owned |

No automatic drops, foreign-key replacements, or type changes should be applied to the real database. Each category below needs its own reviewed migration and rollback plan.

## 1. Missing resident columns: confirmed application failure

The real `residents` table has 17 columns; the model maps 31. A read-only `db.query(models.Resident).limit(0).all()` against the real database failed with PostgreSQL `42703` (`undefined_column`), before reading any row. Full-entity queries used by resident login, lookup, profile, and admin views select all mapped columns and therefore fail. An aggregate such as `COUNT(*)` can still work; this finding does not mean every query against `residents` fails.

| Missing column | Explicit runtime use beyond full-entity selection |
| --- | --- |
| `id_tier` | Registration and ID submission write; KYC and admin review read |
| `id_type` | Registration and ID submission write; Google auth and admin review read |
| `secondary_id_type` | Registration and ID submission write |
| `verification_mode` | Registration and ID submission write; KYC and admin review read |
| `google_id` | Google authentication reads and writes |
| `auth_provider` | Google authentication reads and writes |
| `status` | Login and admin management read; admin management writes |
| `status_reason` | Admin management reads and writes |
| `status_changed_by` | Admin management reads and writes |
| `status_changed_at` | Admin management reads and writes |
| `id_verification_status` | Admin filtering/review reads; verification decisions write |
| `id_rejection_reason` | Admin review reads and writes |
| `id_verified_at` | Admin review reads and writes |
| `preferences` | Profile serialization and generic resident update expose it; resident UI reads and sends it |

**Schema action:** revision `a9c6e4b2d1f0` adds the 14 nullable columns and the model-defined `google_id` index without server defaults or row changes. It passed verification on disposable databases. It has **not** been applied to the real database. Data backfills and full route tests with governed synthetic records remain separate work.

## Data decisions (not in this migration)

The additive resident-column migration `a9c6e4b2d1f0` leaves existing rows NULL in all 14 new columns. It applies no server defaults or backfills. The following possible data changes require separate decisions and evidence; none is authorized by the schema migration.

| NULL field or group | Current behavior | Possible later backfill and evidence required |
| --- | --- | --- |
| `status` | Admin status filters exclude NULL rows, although the unfiltered list derives a display state from `is_active`; login still checks `is_active`. | Map existing rows to `active`/`suspended` or another approved state only after comparing `is_active` with suspension records, account history, and the approved lifecycle. Do not equate every inactive account with a suspension without that evidence. |
| `id_verification_status` | Admin views show NULL as `N/A`, even when other account fields suggest prior verification. | Reconstruct `Verified`, `Pending review`, or `Rejected` only from authoritative ID-review events or retained verification records. `is_verified` alone does not prove which ID-review state occurred. |
| `auth_provider` | A NULL value represents unknown provenance on existing rows; Google linking can set `google`. New ORM local inserts receive the client-side `local` default. | Mark an account `local` or `google` only from registration/provider audit records or a verified linked provider identifier. Absence of `google_id` is not proof of local-only history. |
| `id_tier`, `id_type`, `verification_mode` | Admin detail fallbacks can display `Primary` or `Manual Inspection` without stored provenance; the ID type may also be inferred in a review display. | Populate only from retained ID-submission metadata or review records with a governed privacy basis. KYC level or `is_verified` alone cannot establish the exact document type or verification method. The fallback labels should be reviewed separately. |
| `preferences` | Resident UI treats NULL as `{}`; model default `{}` applies to new ORM inserts only. | Optionally store `{}` after confirming that NULL means no saved preferences and no older settings source needs migration. Do not overwrite evidence of an existing user choice. |

## 2. Legacy identity tables and `user_id` columns

The dump has a `users` table absent from current model metadata. It also has `notifications.user_id`, `reports.user_id`, and `work_order_updates.user_id`; current models favor `resident_id` or `official_id`. `work_order_updates.user_id` still has an FK to `officials.id`. The schema also contains `chat_conversations.user_id`, which is modeled and must not be grouped into an automatic removal.

**Proposed separate migration:** inventory references and row counts without copying personal data; trace all raw SQL and external consumers; define a documented identity mapping and retention policy; migrate only after owners approve the mapping. Keep legacy objects in the bootstrap snapshot for fidelity. Do not infer that a `user_id` column can be dropped because it is absent from one model.

## 3. Foreign-key overlap and naming

Of 31 proposed FK additions, 29 overlap an existing FK with the same source columns and referenced table. They are **not verified as name-only differences**. The real schema specifies `ON DELETE` actions on many constraints, while current models usually omit those actions (only four model FK declarations explicitly set `ondelete`). For example, `advisories.author_id` targets `officials.id` in both places, but the real FK has `ON DELETE CASCADE` and the model declaration has no explicit delete action. An older migration's `users.id` reference is historical. The two additions without a matching existing FK are `project_requests.source_report_id -> reports.id` and `work_order_updates.official_id -> officials.id`.

The remaining 20 proposed FK removals include relationships on audit logs, work orders, project/procurement links, timelines, and other records that the current models do not declare. Some enforce valid historical relationships and should not be dropped by an autogenerated migration.

**Proposed separate migration:** compare each overlapping pair's delete/update actions, deferrability, and intended ownership behavior before deciding which contract is correct; validate any genuinely new FK against existing rows and ownership rules; review the 20 database-only FKs with feature owners. Preserve existing constraints until that review is complete. Do not rebuild an identical FK merely to change its name.

## 4. Index overlap, spatial indexes, and naming

Alembic proposes 22 additions and 19 removals. Several are naming or duplication candidates: for example, `idx_advisories_author_id` versus `ix_advisories_author_id`, `idx_brgy_district_id` versus `ix_barangays_district_id`, and `ix_reports_location` versus `idx_reports_location`. The dump also has spatial indexes on `agent_locations`, `barangays`, `city_boundaries`, `infrastructure_assets`, and `reports`; PostGIS index method/opclass and actual query plans need inspection before changing any of them. The proposed `ix_residents_google_id` depends on the missing `google_id` column and cannot be applied independently.

**Proposed separate migration:** compare index definitions by table, keys, expressions, predicates, method, and opclass; measure actual query use; add only demonstrably missing indexes; retire duplicates in a later reviewed change. Treat index names alone as insufficient evidence of duplication.

## 5. Server defaults, nullability, and types

Six dump server defaults are absent from model metadata: `infrastructure_assets.condition_score` (`80.0`), `infrastructure_assets.status` (`operational`), and `reports.reporter_type`, `contact_verified`, `submission_source`, and `accuracy_m` (`registered`, `false`, `web`, and `0.0`). Nullability differs for `barangays.created_at`, `districts.created_at`, and `work_order_updates.official_id`. Types differ for `reports.budget` (`NUMERIC(12,2)` in DB versus model `FLOAT`) and `reports.citizen_feedback_note` (`TEXT` in DB versus model `VARCHAR`).

**Proposed separate migrations by kind:** decide whether DB defaults or model declarations express the intended write contract; validate null counts and create paths before tightening nullability; preserve budget precision unless a reviewed product/accounting requirement says otherwise; evaluate text length before any type conversion. No default, nullability, or type change is included in the bootstrap.

## 6. Spatial and other database-only columns

The six proposed removals are `agent_locations.location_geog`, `agent_locations.location`, `notifications.user_id`, `reports.location_geog`, `reports.user_id`, and `work_order_updates.user_id`. The identity columns are covered above. The spatial columns and their indexes may support raw SQL, map queries, or earlier migrations despite being absent from current ORM metadata.

**Proposed separate migration:** trace spatial reads/writes and operational queries, establish authoritative geometry/geography storage, and test on a schema clone before changing any spatial column. Retain current objects in the snapshot.

## 7. PostGIS-owned objects

`spatial_ref_sys` is created and owned by `CREATE EXTENSION postgis`. It is absent from the schema-only application dump and must not be recreated or dropped as an application table. A narrow Alembic `include_object` exclusion for this table is appropriate; other drift must remain visible.

## Review order

1. Apply the verified resident-column revision to the real database only after its backup and deployment review; decide any historical data backfill separately.
2. Review identity lineage (`users` and `user_id`) and database-only foreign keys.
3. Reconcile FK behavior and index definitions without unnecessary rebuilds.
4. Resolve defaults/nullability/types and spatial storage in separate migrations.
5. Re-run normalized schema inventory parity and Alembic autogenerate after each reviewed change. `alembic check` remains report-only until the relevant categories are reconciled.
