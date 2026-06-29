"""
Shared paths and feature configuration for the SepsisAI Guard ML pipeline.
"""

from pathlib import Path

# Directory layout (backend/ml/)
ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
MODELS_DIR = ML_DIR / "models"
REPORTS_DIR = ML_DIR / "reports"

# Raw dataset filenames
SEPSIS_PREDICTION_CSV = RAW_DIR / "sepsis_prediction_dataset1.csv"
DATASET_CSV = RAW_DIR / "Dataset.csv"

# Processed output
PROCESSED_DATASET = PROCESSED_DIR / "combined_sepsis_dataset.csv"

# Model artifacts
MODEL_PATH = MODELS_DIR / "sepsis_model.pkl"
FEATURE_COLUMNS_PATH = MODELS_DIR / "feature_columns.pkl"
MODEL_METADATA_PATH = MODELS_DIR / "model_metadata.json"

# Reports
METRICS_PATH = REPORTS_DIR / "metrics.json"
CONFUSION_MATRIX_PATH = REPORTS_DIR / "confusion_matrix.png"
FEATURE_IMPORTANCE_PATH = REPORTS_DIR / "feature_importance.csv"

# Reproducibility
RANDOM_STATE = 42
TEST_SIZE = 0.2
MODEL_VERSION = "1.0.0"

# Unified feature schema across all three source datasets
COMMON_FEATURES = [
    "age",
    "gender",
    "heart_rate",
    "respiratory_rate",
    "temperature",
    "systolic_bp",
    "diastolic_bp",
    "map",
    "spo2",
    "wbc_count",
    "platelet_count",
    "hemoglobin",
    "lactate",
    "creatinine",
    "bilirubin",
    "blood_urea_nitrogen",
    "glucose",
    "ph_level",
    "pao2",
    "paco2",
    "sofa_score",
    "qsofa_score",
    "gcs_score",
    "urine_output",
    "shock_index",
    "icu_los",
]

TARGET_COLUMN = "target"
