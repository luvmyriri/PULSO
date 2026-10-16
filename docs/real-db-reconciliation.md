# Real database schema reconciliation

Status: read-only preflight on 16 October 2026. No production schema or row data was changed during this comparison.

The real database is stamped `c455ca49f6d5`. A schema-only custom-format dump was taken outside the repository. Its application-object inventory was compared with `backend/schema/baseline_c455ca49f6d5.inventory.json`, the manifest for that stamped revision, rather than with head. Table, column, constraint, index, sequence, and PostGIS-extension object sets match.

The raw catalog-text diff had five entries. Each is a PostgreSQL rendering difference with the same object, type, nullability, and semantics; after normalizing these equivalent expressions, there are no material differences to classify as an extra object **(b)** or a missing object **(c)**:

| Object | Raw presentation difference | Pending migration touch | Conflict |
| --- | --- | --- | --- |
| `agent_locations.location_geog` | Parentheses in default expression | None | No |
| `reports.location_geog` | Parentheses in default expression | None | No |
| `system_documents.ck_sysdoc_target_model` | Equivalent array element versus array cast | None | No |
| `work_orders.ck_wo_priority` | Equivalent array element versus array cast | None | No |
| `work_orders.ck_wo_status` | Equivalent array element versus array cast | `e4b7c9d2f610` intentionally replaces this constraint | No; the real object has the expected pre-migration values |

There are **no (b) extras**, **no (c) missing objects**, and **no unexpected conflict**. The pending `a9c6e4b2d1f0` migration adds fourteen `residents` columns and `ix_residents_google_id`; none are present at the stamped revision. The already-applied `d5e2a3_spatial_engine` revision created the spatial tables and columns. `e4b7c9d2f610` changes `work_order_updates.user_id` nullability and replaces `work_orders.ck_wo_status`; neither target conflicts with an unrecognized object.

The five raw differences were the reason the earlier exact-string inventory gate refused the real database. This review establishes that the refusal was caused by representation, not a divergent schema. It does not treat the stamp alone as proof of migration safety; backup and restored-copy rehearsal precede any real upgrade.

## Execution outcome

The full backup restored successfully into a disposable PostGIS database with the same application table list and table row counts. The restored copy upgraded through `a9c6e4b2d1f0` and `e4b7c9d2f610`; the resident columns, `ix_residents_google_id`, spatial objects, full zero-row Resident ORM query, and unchanged row counts all verified. Spatial tests and the full backend suite passed against that copy with the listed expected failures. The real database then upgraded to `e4b7c9d2f610` and passed the same schema, ORM, and row-count checks before the insert-only city-boundary load. The disposable PostGIS container was removed; the backup remains outside the repository.
