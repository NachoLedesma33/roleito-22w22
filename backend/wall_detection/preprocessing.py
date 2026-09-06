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
    """For textured/rendered maps: auto-brightness + CLAHE + Canny."""
    mean_bright = float(gray.mean())
    if mean_bright < 100:
        gray = cv2.equalizeHist(gray)

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    edges = cv2.Canny(blurred, 60, 120)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
    edges = cv2.morphologyEx(edges, cv2.MORPH_OPEN, kernel)

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


def remove_grid_auto(binary: np.ndarray, gray: np.ndarray = None) -> np.ndarray:
    """Detect and remove a regular grid automatically.

    Scans row/column projections for near-complete lines that repeat with
    constant spacing. Only removes lines that span most of the image, so
    walls are never confused with grid lines.
    """
    result = binary.copy()
    h, w = result.shape
    if h < 20 or w < 20:
        return result

    if gray is not None and float(gray.mean()) < 90:
        return result

    positions = []

    row_mean = result.astype(np.float32).mean(axis=1)
    col_mean = result.astype(np.float32).mean(axis=0)

    rows = _regular_grid_positions(row_mean, min(h, w))
    if rows:
        positions.extend(("x", r) for r in rows)

    cols = _regular_grid_positions(col_mean, min(h, w))
    if cols:
        positions.extend(("y", c) for c in cols)

    if not positions:
        return result

    for kind, pos in positions:
        if kind == "x":
            result[max(0, pos - 1):min(h, pos + 2), :] = 0
        else:
            result[:, max(0, pos - 1):min(w, pos + 2)] = 0

    return result


def _regular_grid_positions(projection: np.ndarray, limit: int) -> list:
    """Find regularly-spaced near-full lines in a row/column projection.

    Pure numpy local-max detection; scipy.signal is too heavy to import
    in the hot path (cold import costs several seconds).
    """
    threshold = 0.4 * float(projection.max())
    thresh_proj = np.where(projection >= max(0.35, threshold), projection, 0.0)

    if thresh_proj.max() < 0.35 * 255.0:
        return []

    peaks = _local_maxima(thresh_proj, distance=max(3, limit // 100))
    if len(peaks) < 2:
        return []

    return _filter_regular([int(p) for p in peaks], max(2, limit // 100))


def _local_maxima(values: np.ndarray, distance: int) -> np.ndarray:
    """Return indices that are local maxima with a minimum separation."""
    if values.size < 3:
        return np.array([], dtype=int)

    mid = values[1:-1]
    below_prev = mid > values[:-2]
    below_next = mid > values[2:]
    peak_idx = np.where(below_prev & below_next)[0] + 1
    if values[-1] > values[max(0, values.size - 2)]:
        peak_idx = np.append(peak_idx, values.size - 1)
    if values[0] > values[1]:
        peak_idx = np.append(peak_idx, 0)

    if distance <= 1:
        return peak_idx

    peak_idx = np.sort(peak_idx)
    kept = []
    last = -10 ** 9
    for p in peak_idx:
        if p - last >= distance:
            kept.append(p)
            last = p
    return np.array(kept, dtype=int)


def _filter_regular(positions: list, tolerance: int) -> list:
    """Keep positions whose gaps are consistent (regular grid)."""
    if len(positions) < 2:
        return []

    deltas = [positions[i + 1] - positions[i] for i in range(len(positions) - 1)]
    common = int(np.median(deltas))
    if common <= 0:
        return []

    result = []
    for i, pos in enumerate(positions):
        prev = positions[i - 1] if i > 0 else pos - common
        nxt = positions[i + 1] if i < len(positions) - 1 else pos + common
        prev_ok = abs(pos - prev - common) <= tolerance
        next_ok = abs(nxt - pos - common) <= tolerance
        if i == 0:
            if next_ok:
                result.append(pos)
        elif i == len(positions) - 1:
            if prev_ok:
                result.append(pos)
        elif prev_ok or next_ok:
            result.append(pos)

    return result

