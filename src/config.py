"""Application configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_RAW_DIR = PROJECT_ROOT / "data" / "raw"
DATA_PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
MODELS_DIR = PROJECT_ROOT / "models" / "saved"

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://turbofan:turbofan_dev@localhost:5432/turbofan",
)

# Anthropic
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# App
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"

# C-MAPSS dataset columns
CMAPSS_COLUMNS = (
    ["unit_id", "cycle"]
    + [f"op_setting_{i}" for i in range(1, 4)]
    + [f"sensor_{i}" for i in range(1, 22)]
)

# Key informative sensors (per published analyses)
KEY_SENSORS = [
    "sensor_2",   # T2 - Total temperature at fan inlet
    "sensor_3",   # T24 - Total temperature at LPC outlet
    "sensor_4",   # T30 - Total temperature at HPC outlet
    "sensor_7",   # T50 - Total temperature at LPT outlet
    "sensor_11",  # Ps30 - Static pressure at HPC outlet
    "sensor_12",  # phi - Fuel flow / Ps30
    "sensor_15",  # BPR - Bypass ratio
]

# Near-constant sensors excluded from modeling (CV < 0.001 in FD001 EDA)
CONSTANT_SENSORS = [
    "sensor_1", "sensor_5", "sensor_6", "sensor_10",
    "sensor_16", "sensor_18", "sensor_19",
]

# All sensor columns
ALL_SENSORS = [f"sensor_{i}" for i in range(1, 22)]

# Informative sensors for Isolation Forest features (14 sensors, excluding constants)
INFORMATIVE_SENSORS = [s for s in ALL_SENSORS if s not in CONSTANT_SENSORS]

OP_SETTINGS = [f"op_setting_{i}" for i in range(1, 4)]

# Model defaults
HEALTHY_FRACTION = 0.30  # First 30% of each unit's life = healthy baseline
IF_CONTAMINATION = 0.05  # Isolation Forest contamination parameter
DEFAULT_WINDOW_SIZE = 20  # Rolling window for trend analysis
EXPECTED_MEDIAN_LIFE = 199  # Median unit lifetime from EDA (cycles)
