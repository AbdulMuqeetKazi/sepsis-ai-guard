"""
Load, harmonize, and combine all three sepsis datasets into one processed CSV.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import pandas as pd

from ml.config import (
    COMMON_FEATURES,
    DATASET_CSV,
    PROCESSED_DATASET,
    PROCESSED_DIR,
    RAW_DIR,
    SEPSIS_PREDICTION_CSV,
    TARGET_COLUMN,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def find_xlsx_dataset() -> Path:
    """Locate the Sepsis_Dataset Excel file (name may contain spaces/dots)."""
    matches = sorted(RAW_DIR.glob("Sepsis_Dataset*.xlsx"))
    if not matches:
        raise FileNotFoundError(
            f"No Sepsis_Dataset*.xlsx file found in {RAW_DIR}"
        )
    if len(matches) > 1:
        logger.warning("Multiple Excel matches found; using %s", matches[0])
    return matches[0]


def load_xlsx_dataset(path: Path) -> pd.DataFrame:
    """Load and transform the hospital Sepsis_Dataset Excel file."""
    logger.info("Loading Excel dataset: %s", path.name)
    df = pd.read_excel(path)

    rename_map = {
        "Temperature_C": "temperature",
        "BP_Systolic": "systolic_bp",
        "BP_Diastolic": "diastolic_bp",
        "Heart_Rate": "heart_rate",
        "WBC_Count": "wbc_count",
        "Lactate_mmol_L": "lactate",
    }
    df = df.rename(columns=rename_map)

    drop_cols = ["Patient_ID", "Admission_Date", "Ward", "Doctor_On_Duty"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors="ignore")

    if "Sepsis_Flag" not in df.columns:
        raise ValueError("Expected column 'Sepsis_Flag' not found in Excel dataset")

    target_map = {"Yes": 1, "No": 0, "yes": 1, "no": 0}
    df[TARGET_COLUMN] = df["Sepsis_Flag"].map(target_map)
    df = df.drop(columns=["Sepsis_Flag"])

    return _align_to_common_schema(df, source="Sepsis_Dataset.xlsx")


def load_sepsis_prediction_csv(path: Path) -> pd.DataFrame:
    """Load and transform sepsis_prediction_dataset1.csv."""
    logger.info("Loading CSV dataset: %s", path.name)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path)

    rename_map = {
        "Age": "age",
        "Gender": "gender",
        "Heart_Rate": "heart_rate",
        "Respiratory_Rate": "respiratory_rate",
        "Body_Temperature": "temperature",
        "Systolic_BP": "systolic_bp",
        "Diastolic_BP": "diastolic_bp",
        "Mean_Arterial_Pressure": "map",
        "Oxygen_Saturation": "spo2",
        "Shock_Index": "shock_index",
        "WBC_Count": "wbc_count",
        "Platelet_Count": "platelet_count",
        "Hemoglobin": "hemoglobin",
        "Lactate_Level": "lactate",
        "Creatinine": "creatinine",
        "Bilirubin": "bilirubin",
        "Blood_Urea_Nitrogen": "blood_urea_nitrogen",
        "Glucose": "glucose",
        "pH_Level": "ph_level",
        "PaO2": "pao2",
        "PaCO2": "paco2",
        "SOFA_Score": "sofa_score",
        "qSOFA_Score": "qsofa_score",
        "GCS_Score": "gcs_score",
        "Urine_Output": "urine_output",
    }
    df = df.rename(columns=rename_map)

    if "Sepsis_Status" not in df.columns:
        raise ValueError(
            "Expected column 'Sepsis_Status' not found in sepsis_prediction_dataset1.csv"
        )

    target_map = {"Sepsis": 1, "Non-Sepsis": 0}
    df[TARGET_COLUMN] = df["Sepsis_Status"].map(target_map)
    df = df.drop(columns=["Sepsis_Status"], errors="ignore")

    return _align_to_common_schema(df, source="sepsis_prediction_dataset1.csv")


def load_dataset_csv(path: Path) -> pd.DataFrame:
    """Load and transform the large PhysioNet-style Dataset.csv."""
    logger.info("Loading CSV dataset: %s (this may take a moment)", path.name)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path, low_memory=False)

    rename_map = {
        "HR": "heart_rate",
        "O2Sat": "spo2",
        "Temp": "temperature",
        "SBP": "systolic_bp",
        "MAP": "map",
        "DBP": "diastolic_bp",
        "Resp": "respiratory_rate",
        "BUN": "blood_urea_nitrogen",
        "Creatinine": "creatinine",
        "Glucose": "glucose",
        "Lactate": "lactate",
        "WBC": "wbc_count",
        "Platelets": "platelet_count",
        "Age": "age",
        "Gender": "gender",
        "pH": "ph_level",
        "PaCO2": "paco2",
        "Hgb": "hemoglobin",
        "ICULOS": "icu_los",
    }
    df = df.rename(columns=rename_map)

    drop_cols = ["Unnamed: 0", "Patient_ID"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors="ignore")

    if "SepsisLabel" not in df.columns:
        raise ValueError("Expected column 'SepsisLabel' not found in Dataset.csv")

    df[TARGET_COLUMN] = pd.to_numeric(df["SepsisLabel"], errors="coerce")
    df = df.drop(columns=["SepsisLabel"], errors="ignore")

    return _align_to_common_schema(df, source="Dataset.csv")


def _align_to_common_schema(df: pd.DataFrame, source: str) -> pd.DataFrame:
    """Keep only common features + target; add missing columns as NaN."""
    for feature in COMMON_FEATURES:
        if feature not in df.columns:
            df[feature] = pd.NA

    output_cols = COMMON_FEATURES + [TARGET_COLUMN]
    missing_in_source = [f for f in COMMON_FEATURES if f not in df.columns]
    if missing_in_source:
        logger.debug("%s: added missing columns %s", source, missing_in_source)

    return df[output_cols].copy()


def combine_datasets(datasets: list[pd.DataFrame]) -> pd.DataFrame:
    """Concatenate datasets, drop duplicate rows and rows with missing targets."""
    combined = pd.concat(datasets, ignore_index=True)
    logger.info("Combined row count before cleaning: %d", len(combined))

    before_dedup = len(combined)
    combined = combined.drop_duplicates()
    logger.info("Removed %d duplicate rows", before_dedup - len(combined))

    before_target = len(combined)
    combined[TARGET_COLUMN] = pd.to_numeric(combined[TARGET_COLUMN], errors="coerce")
    combined = combined.dropna(subset=[TARGET_COLUMN])
    combined[TARGET_COLUMN] = combined[TARGET_COLUMN].astype(int)
    logger.info("Removed %d rows with missing target", before_target - len(combined))

    # Keep only valid binary labels
    invalid_mask = ~combined[TARGET_COLUMN].isin([0, 1])
    if invalid_mask.any():
        logger.warning(
            "Dropping %d rows with non-binary target values", invalid_mask.sum()
        )
        combined = combined[~invalid_mask]

    logger.info(
        "Final dataset: %d rows, %d sepsis positive (%.2f%%)",
        len(combined),
        combined[TARGET_COLUMN].sum(),
        100 * combined[TARGET_COLUMN].mean(),
    )
    return combined


def save_processed_dataset(df: pd.DataFrame, output_path: Path) -> None:
    """Persist the combined dataset to CSV."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    logger.info("Saved processed dataset to %s", output_path)


def run_preprocessing() -> pd.DataFrame:
    """Execute the full preprocessing pipeline."""
    xlsx_path = find_xlsx_dataset()

    datasets = [
        load_xlsx_dataset(xlsx_path),
        load_sepsis_prediction_csv(SEPSIS_PREDICTION_CSV),
        load_dataset_csv(DATASET_CSV),
    ]

    combined = combine_datasets(datasets)
    save_processed_dataset(combined, PROCESSED_DATASET)
    return combined


def main() -> int:
    """CLI entry point."""
    try:
        run_preprocessing()
        return 0
    except Exception as exc:
        logger.exception("Preprocessing failed: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
