"""
Train and evaluate sepsis prediction models; persist the best-performing pipeline.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier

from ml.config import (
    COMMON_FEATURES,
    CONFUSION_MATRIX_PATH,
    FEATURE_COLUMNS_PATH,
    FEATURE_IMPORTANCE_PATH,
    METRICS_PATH,
    MODEL_METADATA_PATH,
    MODEL_PATH,
    MODEL_VERSION,
    MODELS_DIR,
    PROCESSED_DATASET,
    RANDOM_STATE,
    REPORTS_DIR,
    TARGET_COLUMN,
    TEST_SIZE,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def load_processed_data(path: Path) -> tuple[pd.DataFrame, pd.Series]:
    """Load processed CSV and split features from target."""
    if not path.exists():
        raise FileNotFoundError(
            f"Processed dataset not found at {path}. Run preprocess_data first."
        )

    logger.info("Loading processed dataset from %s", path)
    df = pd.read_csv(path, low_memory=False)

    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' missing from processed data")

    X = df[COMMON_FEATURES].copy()
    y = df[TARGET_COLUMN].astype(int)
    return X, y


def build_preprocessor(
    X: pd.DataFrame,
) -> tuple[ColumnTransformer, list[str], list[str]]:
    """Build ColumnTransformer for numeric and categorical features."""
    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [c for c in X.columns if c not in numeric_cols]

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            (
                "encoder",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            ),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_cols),
            ("cat", categorical_pipeline, categorical_cols),
        ],
        remainder="drop",
    )

    logger.info(
        "Features — numeric: %d, categorical: %d", len(numeric_cols), len(categorical_cols)
    )
    return preprocessor, numeric_cols, categorical_cols


def compute_scale_pos_weight(y: pd.Series) -> float:
    """Calculate XGBoost positive-class weight for imbalanced data."""
    neg = (y == 0).sum()
    pos = (y == 1).sum()
    if pos == 0:
        return 1.0
    return float(neg / pos)


def build_model_candidates(scale_pos_weight: float) -> dict[str, Pipeline]:
    """Define model pipelines sharing the same preprocessing step placeholder."""
    return {
        "Logistic Regression": LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "XGBoost": XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=RANDOM_STATE,
            n_jobs=-1,
            tree_method="hist",
        ),
    }


def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray) -> dict[str, Any]:
    """Compute classification metrics for healthcare-oriented model comparison."""
    metrics: dict[str, Any] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_proba)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }
    return metrics


def select_best_model(all_metrics: dict[str, dict[str, Any]]) -> str:
    """
    Select best model prioritizing recall (sepsis detection), then F1, then ROC-AUC.
    """
    ranked = sorted(
        all_metrics.items(),
        key=lambda item: (
            item[1]["recall"],
            item[1]["f1_score"],
            item[1]["roc_auc"],
        ),
        reverse=True,
    )
    best_name = ranked[0][0]
    logger.info(
        "Best model: %s (recall=%.4f, f1=%.4f, roc_auc=%.4f)",
        best_name,
        all_metrics[best_name]["recall"],
        all_metrics[best_name]["f1_score"],
        all_metrics[best_name]["roc_auc"],
    )
    return best_name


def save_confusion_matrix_plot(
    y_true: np.ndarray, y_pred: np.ndarray, model_name: str, output_path: Path
) -> None:
    """Save confusion matrix heatmap as PNG."""
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    classes = ["Non-Sepsis (0)", "Sepsis (1)"]
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=classes,
        yticklabels=classes,
        ylabel="True label",
        xlabel="Predicted label",
        title=f"Confusion Matrix — {model_name}",
    )
    thresh = cm.max() / 2.0 if cm.max() > 0 else 0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j,
                i,
                format(cm[i, j], "d"),
                ha="center",
                va="center",
                color="white" if cm[i, j] > thresh else "black",
            )
    fig.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info("Saved confusion matrix to %s", output_path)


def extract_feature_importance(
    pipeline: Pipeline,
    feature_columns: list[str],
    model_name: str,
) -> pd.DataFrame | None:
    """Extract feature importances when the underlying estimator supports them."""
    estimator = pipeline.named_steps["classifier"]
    preprocessor = pipeline.named_steps["preprocessor"]

    if not hasattr(estimator, "feature_importances_"):
        logger.info("%s does not expose feature_importances_; skipping CSV export", model_name)
        return None

    try:
        transformed_names = preprocessor.get_feature_names_out()
    except Exception:
        transformed_names = np.array(
            [f"feature_{i}" for i in range(len(estimator.feature_importances_))]
        )

    importance_df = pd.DataFrame(
        {
            "feature": transformed_names,
            "importance": estimator.feature_importances_,
        }
    ).sort_values("importance", ascending=False)

    return importance_df


def train_and_select_best(
    X: pd.DataFrame, y: pd.Series
) -> tuple[Pipeline, str, dict[str, dict[str, Any]], np.ndarray, np.ndarray, np.ndarray]:
    """Train all candidate models and return the best pipeline with test predictions."""
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    logger.info("Train size: %d | Test size: %d", len(X_train), len(X_test))

    preprocessor, numeric_cols, categorical_cols = build_preprocessor(X_train)
    scale_pos_weight = compute_scale_pos_weight(y_train)
    logger.info("XGBoost scale_pos_weight: %.2f", scale_pos_weight)

    candidates = build_model_candidates(scale_pos_weight)
    all_metrics: dict[str, dict[str, Any]] = {}
    trained_pipelines: dict[str, Pipeline] = {}

    for name, classifier in candidates.items():
        logger.info("Training %s ...", name)
        pipeline = Pipeline(
            steps=[
                ("preprocessor", clone(preprocessor)),
                ("classifier", classifier),
            ]
        )
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]
        metrics = evaluate_predictions(y_test.values, y_pred, y_proba)
        all_metrics[name] = metrics
        trained_pipelines[name] = pipeline
        logger.info(
            "%s — recall: %.4f, f1: %.4f, roc_auc: %.4f",
            name,
            metrics["recall"],
            metrics["f1_score"],
            metrics["roc_auc"],
        )

    best_name = select_best_model(all_metrics)
    best_pipeline = trained_pipelines[best_name]
    y_pred_best = best_pipeline.predict(X_test)
    y_proba_best = best_pipeline.predict_proba(X_test)[:, 1]

    return best_pipeline, best_name, all_metrics, y_test.values, y_pred_best, y_proba_best


def save_artifacts(
    pipeline: Pipeline,
    model_name: str,
    all_metrics: dict[str, dict[str, Any]],
    y_test: np.ndarray,
    y_pred: np.ndarray,
    feature_columns: list[str],
) -> None:
    """Persist model, metadata, metrics, plots, and optional feature importance."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(pipeline, MODEL_PATH)
    joblib.dump(feature_columns, FEATURE_COLUMNS_PATH)
    logger.info("Saved model to %s", MODEL_PATH)

    best_metrics = all_metrics[model_name]
    metadata = {
        "model_name": model_name,
        "version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "selection_criteria": "recall > f1_score > roc_auc",
        "feature_columns": feature_columns,
        "random_state": RANDOM_STATE,
        "test_size": TEST_SIZE,
        "best_model_metrics": best_metrics,
        "all_models_metrics": all_metrics,
    }
    with open(MODEL_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved metadata to %s", MODEL_METADATA_PATH)

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump({"best_model": model_name, "models": all_metrics}, f, indent=2)
    logger.info("Saved metrics to %s", METRICS_PATH)

    save_confusion_matrix_plot(y_test, y_pred, model_name, CONFUSION_MATRIX_PATH)

    importance_df = extract_feature_importance(pipeline, feature_columns, model_name)
    if importance_df is not None:
        importance_df.to_csv(FEATURE_IMPORTANCE_PATH, index=False)
        logger.info("Saved feature importance to %s", FEATURE_IMPORTANCE_PATH)

    # Save format required by the frontend
    cm = best_metrics["confusion_matrix"]
    tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
    
    feature_importance_list = []
    if importance_df is not None:
        feature_importance_list = importance_df.to_dict(orient="records")

    frontend_metrics = {
        "model_name": model_name,
        "model_version": MODEL_VERSION,
        "accuracy": best_metrics["accuracy"],
        "precision": best_metrics["precision"],
        "recall": best_metrics["recall"],
        "f1_score": best_metrics["f1_score"],
        "roc_auc": best_metrics["roc_auc"],
        "confusion_matrix": {
            "true_positive": tp,
            "true_negative": tn,
            "false_positive": fp,
            "false_negative": fn
        },
        "feature_importance": feature_importance_list,
        "training_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "metrics_source": "actual_training_evaluation"
    }

    frontend_metrics_path = MODELS_DIR / "model_metrics.json"
    with open(frontend_metrics_path, "w", encoding="utf-8") as f:
        json.dump(frontend_metrics, f, indent=2)
    logger.info("Saved frontend metrics to %s", frontend_metrics_path)


def run_training() -> Pipeline:
    """Execute the full training pipeline."""
    X, y = load_processed_data(PROCESSED_DATASET)
    pipeline, best_name, all_metrics, y_test, y_pred, _ = train_and_select_best(X, y)
    save_artifacts(pipeline, best_name, all_metrics, y_test, y_pred, COMMON_FEATURES)
    return pipeline


def main() -> int:
    """CLI entry point."""
    try:
        run_training()
        return 0
    except Exception as exc:
        logger.exception("Training failed: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
