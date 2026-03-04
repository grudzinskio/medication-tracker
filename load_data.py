#!/usr/bin/env python3
"""
Load CSV data from the data/ folder into the Medication_Tracker MySQL database.
Use --reset to drop and recreate the schema first (runs term-project-schema.sql).
"""

import argparse
import csv
import os
import re
import sys
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

# Project root (directory containing this script)
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SCHEMA_FILE = BASE_DIR / "term-project-schema.sql"

# Table load order: independent tables first, then dependents (respecting FKs)
LOAD_ORDER = [
    "doctors",
    "pharmacies",
    "patients",
    "medications",
    "prescriptions",
    "refills",
    "dose_logs",
]

# CSV filename (without path) -> table name
CSV_TO_TABLE = {
    "doctors.csv": "Doctors",
    "pharmacies.csv": "Pharmacies",
    "patients.csv": "Patients",
    "medications.csv": "Medications",
    "prescriptions.csv": "Prescriptions",
    "refills.csv": "Refills",
    "dose_logs.csv": "Dose_Logs",
}

# Columns that accept NULL; empty string in CSV becomes None
NULLABLE_COLUMNS = {
    "Doctors": {"Specialty", "ContactNumber"},
    "Pharmacies": {"Address", "Phone"},
    "Patients": set(),
    "Medications": {"GenericName", "Form", "Route", "Manufacturer", "UnitType"},
    "Prescriptions": {"Frequency", "EndDate"},
    "Refills": set(),
    "Dose_Logs": set(),
}


def get_db_config():
    """Load database config from environment."""
    load_dotenv()
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER")
    password = os.getenv("MYSQL_PASSWORD")
    database = os.getenv("MYSQL_DATABASE", "Medication_Tracker")
    if not user:
        print("Error: MYSQL_USER is not set. Copy .env.example to .env and configure.", file=sys.stderr)
        sys.exit(1)
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password or "",
        "database": database,
    }


def connect(use_database=True):
    """Create a MySQL connection."""
    config = get_db_config()
    if not use_database:
        config = {k: v for k, v in config.items() if k != "database"}
    return mysql.connector.connect(**config)


def run_schema(conn):
    """Execute term-project-schema.sql to drop and recreate the database."""
    if not SCHEMA_FILE.exists():
        print(f"Error: Schema file not found: {SCHEMA_FILE}", file=sys.stderr)
        sys.exit(1)
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    # Remove whole-line comments and empty lines; keep inline -- comments for MySQL
    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--") or not stripped:
            continue
        lines.append(line)
    full_sql = "\n".join(lines)
    # Split only on semicolon followed by newline (statement boundary), not ");" mid-line
    statements = re.split(r";\s*\n", full_sql)
    with conn.cursor() as cur:
        for stmt in statements:
            stmt = stmt.strip()
            if not stmt:
                continue
            try:
                cur.execute(stmt + ";")
            except mysql.connector.Error as e:
                print(f"Schema statement failed: {e}", file=sys.stderr)
                raise
    conn.commit()
    print("Schema applied successfully (database recreated).")


def truncate_all(conn):
    """Truncate all tables in FK-safe order (child tables first)."""
    config = get_db_config()
    db = config["database"]
    # Reverse load order = children first
    tables = ["Dose_Logs", "Refills", "Prescriptions", "Doctors", "Pharmacies", "Patients", "Medications"]
    with conn.cursor() as cur:
        cur.execute("SET FOREIGN_KEY_CHECKS = 0")
        for table in tables:
            cur.execute(f"TRUNCATE TABLE `{table}`")
        cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    conn.commit()
    print("All tables truncated.")


def load_csv_into_table(conn, csv_path, table_name):
    """Load a single CSV file into the given table."""
    if not csv_path.exists():
        print(f"  Warning: {csv_path} not found, skipping.", file=sys.stderr)
        return 0
    nullable = NULLABLE_COLUMNS.get(table_name, set())
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = [c for c in reader.fieldnames if c]
        for row in reader:
            values = []
            for col in columns:
                val = row.get(col, "")
                if col in nullable and (val is None or (isinstance(val, str) and val.strip() == "")):
                    val = None
                values.append(val)
            rows.append(values)
    if not rows:
        return 0
    placeholders = ", ".join(["%s"] * len(columns))
    col_list = ", ".join(f"`{c}`" for c in columns)
    insert_sql = f"INSERT INTO `{table_name}` ({col_list}) VALUES ({placeholders})"
    with conn.cursor() as cur:
        cur.executemany(insert_sql, rows)
    conn.commit()
    return len(rows)


def load_all_data(conn):
    """Load all CSVs in LOAD_ORDER into the database."""
    total = 0
    for csv_name, table_name in CSV_TO_TABLE.items():
        csv_path = DATA_DIR / csv_name
        n = load_csv_into_table(conn, csv_path, table_name)
        total += n
        print(f"  {table_name}: {n} rows")
    print(f"Total rows loaded: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="Load CSV data into Medication_Tracker MySQL database."
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and recreate the database using term-project-schema.sql, then load data.",
    )
    args = parser.parse_args()

    if args.reset:
        print("Resetting database (running schema)...")
        conn = connect(use_database=False)
        try:
            run_schema(conn)
        finally:
            conn.close()
        conn = connect(use_database=True)
        try:
            print("Loading CSV data...")
            load_all_data(conn)
        finally:
            conn.close()
    else:
        conn = connect(use_database=True)
        try:
            print("Truncating existing data...")
            truncate_all(conn)
            print("Loading CSV data...")
            load_all_data(conn)
        finally:
            conn.close()

    print("Done.")


if __name__ == "__main__":
    main()
