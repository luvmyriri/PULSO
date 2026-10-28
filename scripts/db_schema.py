"""Schema-only PostGIS bootstrap and inventory checks for local development.

DATABASE_URL must be set explicitly. This tool never prints it or row data.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import psycopg2
from psycopg2 import sql
from sqlalchemy.engine import make_url


ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "backend" / "schema" / "baseline_c455ca49f6d5.sql"
BASELINE_INVENTORY = ROOT / "backend" / "schema" / "baseline_c455ca49f6d5.inventory.json"
HEAD_INVENTORY = ROOT / "backend" / "schema" / "head_19f0b2c3d4e5.inventory.json"
PREVIOUS_INVENTORY = ROOT / "backend" / "schema" / "head_18efa117cb09.inventory.json"
BASELINE_REVISION = "c455ca49f6d5"
HEAD_REVISION = "19f0b2c3d4e5"
PREVIOUS_REVISION = "18efa117cb09"


def connection_kwargs(database: str | None = None) -> dict:
    raw_url = os.environ.get("DATABASE_URL")
    if not raw_url:
        raise ValueError("DATABASE_URL must be set explicitly")
    parsed = make_url(raw_url)
    if parsed.get_backend_name() != "postgresql" or not parsed.database:
        raise ValueError("DATABASE_URL must name a PostgreSQL database")
    target = database or parsed.database
    if target in {"postgres", "template0", "template1"} and database is None:
        raise ValueError("Refusing to use a PostgreSQL maintenance database as the target")
    kwargs = {
        "host": parsed.host or "localhost",
        "port": parsed.port or 5432,
        "user": parsed.username or "postgres",
        "password": parsed.password,
        "dbname": target,
        "connect_timeout": 10,
    }
    kwargs.update(dict(parsed.query))
    return kwargs


def connect(database: str | None = None):
    return psycopg2.connect(**connection_kwargs(database))


def create_database_if_missing() -> bool:
    target = connection_kwargs()["dbname"]
    maintenance = connect("postgres")
    maintenance.autocommit = True
    try:
        with maintenance.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target,))
            if cursor.fetchone():
                return False
            cursor.execute(
                sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(target))
            )
            return True
    finally:
        maintenance.close()


def application_object_count(connection) -> int:
    """Count non-extension-owned user objects; PostGIS alone is allowed."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT count(*) FROM pg_class obj
            JOIN pg_namespace ns ON ns.oid = obj.relnamespace
            WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
              AND ns.nspname NOT LIKE 'pg_toast%'
              AND obj.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend dep
                WHERE dep.classid = 'pg_class'::regclass
                  AND dep.objid = obj.oid AND dep.deptype = 'e'
              )
            """
        )
        relation_count = cursor.fetchone()[0]
        cursor.execute(
            """
            SELECT count(*) FROM pg_proc obj
            JOIN pg_namespace ns ON ns.oid = obj.pronamespace
            WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
              AND ns.nspname NOT LIKE 'pg_toast%'
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend dep
                WHERE dep.classid = 'pg_proc'::regclass
                  AND dep.objid = obj.oid AND dep.deptype = 'e'
              )
            """
        )
        function_count = cursor.fetchone()[0]
    return relation_count + function_count


def _normalize_definition(value: str | None) -> str | None:
    return re.sub(r"\s+", " ", value).strip() if value is not None else None


def inventory(connection) -> dict:
    """Compare catalog objects, not pg_dump formatting, owners, or row contents."""
    with connection.cursor() as cursor:
        cursor.execute("SET LOCAL search_path = public, pg_catalog")
        cursor.execute(
            """
            SELECT cls.relname
            FROM pg_class cls JOIN pg_namespace ns ON ns.oid = cls.relnamespace
            WHERE ns.nspname = 'public' AND cls.relkind IN ('r', 'p')
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend dep
                WHERE dep.classid = 'pg_class'::regclass
                  AND dep.objid = cls.oid AND dep.deptype = 'e'
              )
            ORDER BY cls.relname
            """
        )
        tables = [row[0] for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT cls.relname, att.attname,
                   pg_catalog.format_type(att.atttypid, att.atttypmod),
                   NOT att.attnotnull,
                   pg_get_expr(def.adbin, def.adrelid)
            FROM pg_attribute att
            JOIN pg_class cls ON cls.oid = att.attrelid
            JOIN pg_namespace ns ON ns.oid = cls.relnamespace
            LEFT JOIN pg_attrdef def ON def.adrelid = cls.oid AND def.adnum = att.attnum
            WHERE ns.nspname = 'public' AND cls.relkind IN ('r', 'p')
              AND att.attnum > 0 AND NOT att.attisdropped
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend dep
                WHERE dep.classid = 'pg_class'::regclass
                  AND dep.objid = cls.oid AND dep.deptype = 'e'
              )
            ORDER BY cls.relname, att.attnum
            """
        )
        columns = [
            {"table": table, "name": name, "type": typ,
             "nullable": nullable, "default": _normalize_definition(default)}
            for table, name, typ, nullable, default in cursor.fetchall()
        ]
        cursor.execute(
            """
            SELECT cls.relname, con.conname, con.contype,
                   pg_get_constraintdef(con.oid, true)
            FROM pg_constraint con
            JOIN pg_class cls ON cls.oid = con.conrelid
            JOIN pg_namespace ns ON ns.oid = cls.relnamespace
            WHERE ns.nspname = 'public' AND cls.relkind IN ('r', 'p')
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend dep
                WHERE dep.classid = 'pg_class'::regclass
                  AND dep.objid = cls.oid AND dep.deptype = 'e'
              )
            ORDER BY cls.relname, con.conname
            """
        )
        constraints = [
            {"table": table, "name": name, "type": typ,
             "definition": _normalize_definition(definition)}
            for table, name, typ, definition in cursor.fetchall()
        ]
        cursor.execute(
            """
            SELECT tbl.relname, idx.relname, pg_get_indexdef(idx.oid)
            FROM pg_index ind
            JOIN pg_class idx ON idx.oid = ind.indexrelid
            JOIN pg_class tbl ON tbl.oid = ind.indrelid
            JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
            WHERE ns.nspname = 'public' AND tbl.relkind IN ('r', 'p')
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend dep
                WHERE dep.classid = 'pg_class'::regclass
                  AND dep.objid = tbl.oid AND dep.deptype = 'e'
              )
            ORDER BY tbl.relname, idx.relname
            """
        )
        indexes = [
            {"table": table, "name": name,
             "definition": _normalize_definition(definition)}
            for table, name, definition in cursor.fetchall()
        ]
        cursor.execute(
            """
            SELECT cls.relname FROM pg_class cls
            JOIN pg_namespace ns ON ns.oid = cls.relnamespace
            WHERE ns.nspname = 'public' AND cls.relkind = 'S'
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend dep
                WHERE dep.classid = 'pg_class'::regclass
                  AND dep.objid = cls.oid AND dep.deptype = 'e'
              )
            ORDER BY cls.relname
            """
        )
        sequences = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT extname FROM pg_extension WHERE extname = 'postgis'")
        extensions = [row[0] for row in cursor.fetchall()]
    return {
        "tables": tables,
        "columns": columns,
        "constraints": constraints,
        "indexes": indexes,
        "sequences": sequences,
        "extensions": extensions,
    }


def load_inventory(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_inventory(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def diff_inventory(before: dict, after: dict) -> dict:
    result = {}
    for kind in before:
        if kind in {"tables", "sequences", "extensions"}:
            old = {name: name for name in before[kind]}
            new = {name: name for name in after[kind]}
        else:
            old = {(item["table"], item["name"]): item for item in before[kind]}
            new = {(item["table"], item["name"]): item for item in after[kind]}
        label = lambda key: ".".join(key) if isinstance(key, tuple) else key
        result[kind] = {
            "added": sorted(map(label, new.keys() - old.keys())),
            "removed": sorted(map(label, old.keys() - new.keys())),
            "changed": sorted(label(key) for key in old.keys() & new.keys() if old[key] != new[key]),
        }
    return result


def print_diff(diff: dict) -> None:
    for kind, changes in diff.items():
        for action in ("added", "removed", "changed"):
            names = changes[action]
            if names:
                print(f"{kind} {action} ({len(names)}): {', '.join(names)}")


def current_revision(connection) -> str | None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.alembic_version')")
        if cursor.fetchone()[0] is None:
            return None
        cursor.execute("SELECT version_num FROM public.alembic_version")
        revisions = [row[0] for row in cursor.fetchall()]
    if len(revisions) > 1:
        raise ValueError("Multiple Alembic revisions found; refusing automatic stamp or upgrade")
    return revisions[0] if revisions else None


def command_bootstrap() -> None:
    created = create_database_if_missing()
    with connect() as connection:
        if application_object_count(connection):
            raise ValueError("Target database is nonempty; refusing snapshot restore")
        snapshot = SNAPSHOT.read_text(encoding="utf-8")
        if re.search(r"(?im)^(COPY|INSERT|UPDATE|DELETE|TRUNCATE|SELECT pg_catalog\.setval)\b", snapshot):
            raise ValueError("Snapshot contains a data statement; refusing restore")
        with connection.cursor() as cursor:
            cursor.execute(snapshot)
        connection.commit()
        actual = inventory(connection)
    expected = load_inventory(BASELINE_INVENTORY)
    drift = diff_inventory(expected, actual)
    if any(changes[action] for changes in drift.values() for action in changes):
        print_diff(drift)
        raise ValueError("Restored schema differs from the checked-in snapshot inventory")
    print("Database created." if created else "Using existing empty database.")
    print("Schema-only snapshot restored; normalized inventory matches.")


def command_check_existing() -> None:
    with connect() as connection:
        actual = inventory(connection)
        revision = current_revision(connection)
    if revision == HEAD_REVISION:
        expected = load_inventory(HEAD_INVENTORY)
        state = "head"
    elif revision == PREVIOUS_REVISION:
        expected = load_inventory(PREVIOUS_INVENTORY)
        state = "previous"
    elif revision == 'f3a6d8c1b250':
        expected = load_inventory(ROOT / 'backend/schema/head_f3a6d8c1b250.inventory.json')
        state = 'previous'
    elif revision == '11d6f8a0b432':
        expected = load_inventory(ROOT / 'backend/schema/head_11d6f8a0b432.inventory.json')
        state = 'previous'
    elif revision == '10c5e7f9a321':
        expected = load_inventory(ROOT / 'backend/schema/head_10c5e7f9a321.inventory.json')
        state = 'previous'
    elif revision == '09b4d6e8f210':
        expected = load_inventory(ROOT / 'backend/schema/head_09b4d6e8f210.inventory.json')
        state = 'previous'
    elif revision == 'e4b7c9d2f610':
        expected = load_inventory(ROOT / 'backend/schema/head_e4b7c9d2f610.inventory.json')
        state = 'previous'
    elif revision in {None, BASELINE_REVISION}:
        expected = load_inventory(BASELINE_INVENTORY)
        state = "baseline"
    else:
        raise ValueError("Unexpected Alembic revision; refusing automatic stamp or upgrade")
    drift = diff_inventory(expected, actual)
    if any(changes[action] for changes in drift.values() for action in changes):
        print_diff(drift)
        raise ValueError("Existing database diverges from the expected schema; refusing stamp or upgrade")
    print(json.dumps({"state": state, "needs_stamp": state == "baseline" and revision is None}))


def command_assert_revision(expected: str) -> None:
    with connect() as connection:
        actual = current_revision(connection)
    if actual != expected:
        raise ValueError("Alembic current does not match the expected final revision")
    print(f"Alembic revision verified: {actual}")


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("bootstrap")
    sub.add_parser("check-existing")
    inventory_parser = sub.add_parser("inventory")
    inventory_parser.add_argument("--output", type=Path, required=True)
    revision_parser = sub.add_parser("assert-revision")
    revision_parser.add_argument("revision")
    diff_parser = sub.add_parser("diff")
    diff_parser.add_argument("before", type=Path)
    diff_parser.add_argument("after", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "bootstrap":
            command_bootstrap()
        elif args.command == "check-existing":
            command_check_existing()
        elif args.command == "inventory":
            with connect() as connection:
                write_inventory(args.output, inventory(connection))
            print("Normalized schema inventory written.")
        elif args.command == "assert-revision":
            command_assert_revision(args.revision)
        elif args.command == "diff":
            print_diff(diff_inventory(load_inventory(args.before), load_inventory(args.after)))
        return 0
    except (ValueError, OSError, psycopg2.Error) as error:
        # Never print driver exceptions: they can embed connection parameters.
        print(f"Schema operation failed ({type(error).__name__}).", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
