"""Centralized logging configuration."""

import logging
import sys

from app.core.config import get_settings


def setup_logging() -> logging.Logger:
    """Configure application-wide logging."""
    settings = get_settings()
    level = logging.DEBUG if settings.debug else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    logger = logging.getLogger("sepsisai")
    logger.setLevel(level)
    return logger


logger = setup_logging()
