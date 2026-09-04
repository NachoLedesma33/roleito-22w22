"""Image preprocessing for wall detection."""

import cv2
import numpy as np
from enum import Enum


class DetectionMode(Enum):
    BLUEPRINT = "blueprint"
    TEXTURED = "textured"


def preprocess_image(
    img: np.ndarray,
    mode: DetectionMode = DetectionMode.BLUEPRINT,
) -> np.ndarray:
    """Preprocess image and return edge map."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if mode == DetectionMode.BLUEPRINT:
        return _preprocess_blueprint(gray)
    else:
        return _preprocess_textured(gray)


def _preprocess_blueprint(gray: np.ndarray) -> np.ndarray:
    """For clean blueprints: threshold + morphology."""
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    binary = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15, 4,
    )

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel, iterations=1)

    return cleaned


def _preprocess_textured(gray: np.ndarray) -> np.ndarray:
    """For textured/rendered maps: CLAHE + Canny."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    blurred = cv2.GaussianBlur(enhanced, (9, 9), 0)

    edges = cv2.Canny(blurred, 80, 160)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.morphologyEx(edges, cv2.MORPH_OPEN, kernel_open)

    return edges


def remove_grid(binary: np.ndarray, grid_size: int = 0) -> np.ndarray:
    """Remove grid lines from binary image if grid_size known."""
    if grid_size <= 0:
        return binary

    result = binary.copy()
    h, w = result.shape

    for y in range(0, h, grid_size):
        if y < h:
            result[max(0, y-1):min(h, y+2), :] = 0

    for x in range(0, w, grid_size):
        if x < w:
            result[:, max(0, x-1):min(w, x+2)] = 0

    return result
