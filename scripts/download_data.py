"""Download the NASA C-MAPSS turbofan engine degradation dataset.

Tries multiple sources in order:
  1. Kaggle CLI (requires kaggle.json token)
  2. Manual download instructions

Usage:
    python scripts/download_data.py
"""

import subprocess
import sys
import zipfile
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
EXPECTED_FILES = [
    "train_FD001.txt", "test_FD001.txt", "RUL_FD001.txt",
    "train_FD002.txt", "test_FD002.txt", "RUL_FD002.txt",
    "train_FD003.txt", "test_FD003.txt", "RUL_FD003.txt",
    "train_FD004.txt", "test_FD004.txt", "RUL_FD004.txt",
]


def check_existing() -> bool:
    """Check if data files already exist."""
    existing = [f for f in EXPECTED_FILES if (DATA_DIR / f).exists()]
    if len(existing) == len(EXPECTED_FILES):
        print(f"All {len(EXPECTED_FILES)} files already present in {DATA_DIR}")
        return True
    if existing:
        print(f"Found {len(existing)}/{len(EXPECTED_FILES)} files: {existing}")
    return False


def try_kaggle() -> bool:
    """Download via Kaggle CLI."""
    print("Attempting download via Kaggle CLI...")
    try:
        subprocess.run(
            [
                sys.executable, "-m", "kaggle",
                "datasets", "download",
                "-d", "behrad3d/nasa-cmaps",
                "-p", str(DATA_DIR),
                "--unzip",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        print("Kaggle download successful.")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Kaggle CLI failed: {e}")
        return False


def unzip_if_needed():
    """Unzip any .zip files found in the data directory."""
    for zf in DATA_DIR.glob("*.zip"):
        print(f"Extracting {zf.name}...")
        with zipfile.ZipFile(zf, "r") as z:
            z.extractall(DATA_DIR)
        zf.unlink()


def print_manual_instructions():
    """Print instructions for manual download."""
    print("\n" + "=" * 60)
    print("MANUAL DOWNLOAD REQUIRED")
    print("=" * 60)
    print(f"\nDownload the C-MAPSS dataset and place files in:\n  {DATA_DIR}\n")
    print("Option A — Kaggle (recommended):")
    print("  1. pip install kaggle")
    print("  2. Get API token from https://www.kaggle.com/settings")
    print("  3. Place kaggle.json in ~/.kaggle/")
    print("  4. Re-run this script\n")
    print("Option B — Direct download:")
    print("  1. Go to https://www.kaggle.com/datasets/behrad3d/nasa-cmaps")
    print("  2. Download the ZIP file")
    print(f"  3. Extract contents to {DATA_DIR}")
    print("  4. Re-run this script to verify\n")
    print(f"Expected files: {', '.join(EXPECTED_FILES[:3])} ...")
    print("=" * 60)


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if check_existing():
        return

    if try_kaggle():
        unzip_if_needed()
        if check_existing():
            return

    print_manual_instructions()


if __name__ == "__main__":
    main()
