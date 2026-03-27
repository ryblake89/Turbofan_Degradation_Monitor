"""Ingest C-MAPSS dataset into PostgreSQL.

Reads the raw text files (space-delimited, no headers), assigns standard
column names, and bulk-inserts into the sensor_readings table.

Usage:
    python -m src.data.ingest                   # Ingest FD001 only
    python -m src.data.ingest --datasets all    # Ingest FD001-FD004
"""

import argparse
import time
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from src.config import CMAPSS_COLUMNS, DATA_RAW_DIR
from src.data.database import engine


DATASET_IDS = ["FD001", "FD002", "FD003", "FD004"]


def load_cmapss_file(filepath: Path, dataset: str) -> pd.DataFrame:
    """Load a single C-MAPSS text file into a DataFrame."""
    df = pd.read_csv(
        filepath,
        sep=r"\s+",
        header=None,
        names=CMAPSS_COLUMNS,
    )
    df["dataset"] = dataset
    return df


def load_rul_file(filepath: Path) -> pd.Series:
    """Load a RUL ground truth file (one value per unit)."""
    return pd.read_csv(filepath, sep=r"\s+", header=None, names=["rul"])["rul"]


def add_rul_labels(train_df: pd.DataFrame) -> pd.DataFrame:
    """Add a remaining_useful_life column to training data.

    For training data, RUL is computed from the max cycle for each unit:
        RUL = max_cycle_for_unit - current_cycle
    """
    max_cycles = train_df.groupby("unit_id")["cycle"].max().rename("max_cycle")
    df = train_df.merge(max_cycles, on="unit_id")
    df["rul"] = df["max_cycle"] - df["cycle"]
    df.drop(columns=["max_cycle"], inplace=True)
    return df


def ingest_dataset(dataset_id: str, data_dir: Path = DATA_RAW_DIR) -> int:
    """Ingest a single C-MAPSS sub-dataset into the database.

    Returns the number of rows inserted.
    """
    train_file = data_dir / f"train_{dataset_id}.txt"
    if not train_file.exists():
        raise FileNotFoundError(f"Training file not found: {train_file}")

    print(f"Loading {dataset_id}...")
    df = load_cmapss_file(train_file, dataset_id)
    df = add_rul_labels(df)

    # Save processed CSV for convenience (notebooks, quick inspection)
    processed_dir = data_dir.parent / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    processed_path = processed_dir / f"train_{dataset_id}.csv"
    df.to_csv(processed_path, index=False)
    print(f"  Saved processed CSV: {processed_path}")

    # Insert into PostgreSQL (excluding the rul column — that's derived, not stored)
    db_columns = [c for c in df.columns if c != "rul"]
    db_df = df[db_columns]

    print(f"  Inserting {len(db_df)} rows into sensor_readings...")
    t0 = time.time()

    # Clear existing data for this dataset to allow re-runs
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM sensor_readings WHERE dataset = :ds"),
            {"ds": dataset_id},
        )

    db_df.to_sql(
        "sensor_readings",
        engine,
        if_exists="append",
        index=False,
        method="multi",
        chunksize=1000,
    )

    elapsed = time.time() - t0
    print(f"  Inserted {len(db_df)} rows in {elapsed:.1f}s")
    return len(db_df)


def main():
    parser = argparse.ArgumentParser(description="Ingest C-MAPSS data into PostgreSQL")
    parser.add_argument(
        "--datasets",
        default="FD001",
        help="Comma-separated dataset IDs (e.g. FD001,FD002) or 'all'",
    )
    args = parser.parse_args()

    if args.datasets.lower() == "all":
        datasets = DATASET_IDS
    else:
        datasets = [d.strip() for d in args.datasets.split(",")]

    total = 0
    for ds in datasets:
        total += ingest_dataset(ds)
    print(f"\nDone. Total rows ingested: {total}")


if __name__ == "__main__":
    main()
