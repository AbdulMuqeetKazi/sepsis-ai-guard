"""
Load a saved sepsis model and re-run evaluation on the held-out test split.
"""

from __future__ import annotations

import json
import logging
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from ml.config import (
    COMMON_FEATURES,
    MODEL_METADATA_PATH,
    MODEL_PATH,
    PROCESSED_DATASET,
    RANDOM_STATE,
    TARGET_COLUMN,
    TEST_SIZE,
)
from ml.train_model import evaluate_predictions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def load_model():
    """Load the persisted model pipeline."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. Run train_model first."
        )
    model = joblib.load(MODEL_PATH)
    logger.info("Model loaded successfully from %s", MODEL_PATH)
    return model


def load_metadata() -> dict:
    """Load model metadata JSON."""
    if not MODEL_METADATA_PATH.exists():
        raise FileNotFoundError(f"Metadata not found at {MODEL_METADATA_PATH}")
    with open(MODEL_METADATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_test_split() -> tuple[pd.DataFrame, np.ndarray]:
    """Reproduce the same stratified test split used during training."""
    if not PROCESSED_DATASET.exists():
        raise FileNotFoundError(
            f"Processed dataset not found at {PROCESSED_DATASET}. Run preprocess_data first."
        )

    df = pd.read_csv(PROCESSED_DATASET, low_memory=False)
    X = df[COMMON_FEATURES]
    y = df[TARGET_COLUMN].astype(int)

    _, X_test, _, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    return X_test, y_test.values


def print_metrics(metrics: dict, model_name: str) -> None:
    """Pretty-print evaluation metrics to stdout."""
    print("\n" + "=" * 60)
    print(f"  SepsisAI Guard — Model Evaluation ({model_name})")
    print("=" * 60)
    print(f"  Accuracy  : {metrics['accuracy']:.4f}")
    print(f"  Precision : {metrics['precision']:.4f}")
    print(f"  Recall    : {metrics['recall']:.4f}")
    print(f"  F1-score  : {metrics['f1_score']:.4f}")
    print(f"  ROC-AUC   : {metrics['roc_auc']:.4f}")
    print(f"  Confusion Matrix: {metrics['confusion_matrix']}")
    print("=" * 60 + "\n")


def run_evaluation() -> dict:
    """Load model, run predictions on test set, and return metrics."""
    model = load_model()
    metadata = load_metadata()
    model_name = metadata.get("model_name", "Unknown")

    X_test, y_test = get_test_split()
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = evaluate_predictions(y_test, y_pred, y_proba)
    print_metrics(metrics, model_name)
    logger.info("Evaluation complete — model is operational.")
    return metrics


def main() -> int:
    """CLI entry point."""
    try:
        run_evaluation()
        return 0
    except Exception as exc:
        logger.exception("Evaluation failed: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
