"""Classify scene type from dominant colors and texture patterns."""

import cv2
import numpy as np
from typing import Optional
from dataclasses import dataclass


@dataclass
class SceneClassification:
    scene_type: str
    confidence: float
    dominant_colors: list[str]
    suggested_backgrounds: list[dict]


def classify_scene(image_path: str) -> SceneClassification:
    """Analyze an image and classify the scene type."""
    img = cv2.imread(image_path)
    if img is None:
        return SceneClassification(
            scene_type="unknown", confidence=0.0,
            dominant_colors=[], suggested_backgrounds=[]
        )

    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    mean_h, mean_s, mean_v = [float(c.mean()) for c in cv2.split(hsv)]
    mean_brightness = float(gray.mean())
    std_brightness = float(gray.std())

    dominant = _get_dominant_colors(img, k=5)
    scores = {}

    scores["space"] = _score_space(mean_h, mean_s, mean_v, mean_brightness, dominant)
    scores["forest"] = _score_forest(mean_h, mean_s, mean_v, dominant)
    scores["dungeon"] = _score_dungeon(mean_h, mean_s, mean_v, mean_brightness, std_brightness, dominant)
    scores["tavern"] = _score_tavern(mean_h, mean_s, mean_v, dominant)
    scores["desert"] = _score_desert(mean_h, mean_s, mean_v, dominant)
    scores["water"] = _score_water(mean_h, mean_s, mean_v, dominant)
    scores["night"] = _score_night(mean_h, mean_s, mean_v, mean_brightness, dominant)

    best = max(scores, key=scores.get)
    confidence = min(1.0, scores[best])

    if confidence < 0.2:
        best = "dungeon"
        confidence = 0.3

    suggestions = _get_suggestions(best, dominant)

    return SceneClassification(
        scene_type=best,
        confidence=confidence,
        dominant_colors=dominant[:3],
        suggested_backgrounds=suggestions,
    )


def _get_dominant_colors(img: np.ndarray, k: int = 5) -> list[str]:
    """Extract dominant colors using k-means."""
    pixels = img.reshape(-1, 3).astype(np.float32)
    if len(pixels) > 10000:
        indices = np.random.choice(len(pixels), 10000, replace=False)
        pixels = pixels[indices]

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)

    counts = np.bincount(labels.flatten())
    sorted_idx = np.argsort(-counts)

    colors = []
    for idx in sorted_idx:
        b, g, r = int(centers[idx][0]), int(centers[idx][1]), int(centers[idx][2])
        colors.append(f"#{r:02x}{g:02x}{b:02x}")

    return colors


def _score_space(h: float, s: float, v: float, brightness: float, colors: list[str]) -> float:
    score = 0.0
    if brightness < 60:
        score += 0.4
    if s < 50:
        score += 0.2
    dark_colors = sum(1 for c in colors if int(c[5:7], 16) < 80)
    if dark_colors >= 3:
        score += 0.3
    has_blue = any(int(c[3:5], 16) > 150 or int(c[5:7], 16) > 150 for c in colors)
    if has_blue and brightness < 80:
        score += 0.2
    return min(1.0, score)


def _score_forest(h: float, s: float, v: float, colors: list[str]) -> float:
    score = 0.0
    if 35 <= h <= 85:
        score += 0.4
    if s > 40:
        score += 0.2
    green_pixels = sum(1 for c in colors
                       if 30 < int(c[3:5], 16) < 120 and int(c[5:7], 16) > 50)
    if green_pixels >= 2:
        score += 0.3
    return min(1.0, score)


def _score_dungeon(h: float, s: float, v: float, brightness: float, std: float, colors: list[str]) -> float:
    score = 0.0
    if s < 30:
        score += 0.3
    gray_range = sum(1 for c in colors
                     if abs(int(c[3:5], 16) - int(c[5:7], 16)) < 20
                     and abs(int(c[5:7], 16) - int(c[1:3], 16)) < 20)
    if gray_range >= 2:
        score += 0.3
    if 40 < brightness < 140:
        score += 0.2
    if std < 40:
        score += 0.1
    return min(1.0, score)


def _score_tavern(h: float, s: float, v: float, colors: list[str]) -> float:
    score = 0.0
    brown_pixels = sum(1 for c in colors
                       if 8 < h < 25 and 40 < int(c[3:5], 16) < 180)
    if brown_pixels >= 2:
        score += 0.4
    warm = sum(1 for c in colors if int(c[3:5], 16) > int(c[5:7], 16))
    if warm >= 3:
        score += 0.3
    return min(1.0, score)


def _score_desert(h: float, s: float, v: float, colors: list[str]) -> float:
    score = 0.0
    if 10 <= h <= 25 and s > 30:
        score += 0.4
    sand = sum(1 for c in colors
               if 150 < int(c[3:5], 16) < 240 and 180 < int(c[5:7], 16) < 250)
    if sand >= 2:
        score += 0.3
    return min(1.0, score)


def _score_water(h: float, s: float, v: float, colors: list[str]) -> float:
    score = 0.0
    if 85 <= h <= 130:
        score += 0.4
    if s > 40:
        score += 0.2
    blue = sum(1 for c in colors if int(c[3:5], 16) > 120 and int(c[5:7], 16) < 100)
    if blue >= 2:
        score += 0.3
    return min(1.0, score)


def _score_night(h: float, s: float, v: float, brightness: float, colors: list[str]) -> float:
    score = 0.0
    if brightness < 50:
        score += 0.5
    very_dark = sum(1 for c in colors if int(c[5:7], 16) < 50)
    if very_dark >= 3:
        score += 0.3
    return min(1.0, score)


def _get_suggestions(scene_type: str, colors: list[str]) -> list[dict]:
    """Return background suggestions for a scene type."""
    catalog = {
        "space": [
            {"id": "space_stars", "name": "Starfield", "style": "dark, stars, nebula",
             "colors": ["#0a0a1a", "#1a1a3a", "#0d0d2a"]},
            {"id": "space_nebula", "name": "Nebula", "style": "colorful, cosmic",
             "colors": ["#1a0a2a", "#2a1a3a", "#0a0a3a"]},
            {"id": "space_station", "name": "Station Interior", "style": "metal, clean",
             "colors": ["#2a2a3a", "#3a3a4a", "#1a1a2a"]},
        ],
        "forest": [
            {"id": "forest_canopy", "name": "Forest Canopy", "style": "green, leaves",
             "colors": ["#1a3a1a", "#2a4a2a", "#0a2a0a"]},
            {"id": "forest_floor", "name": "Forest Floor", "style": "brown, leaves, dirt",
             "colors": ["#3a2a1a", "#2a3a1a", "#4a3a2a"]},
            {"id": "forest_mystical", "name": "Mystical Forest", "style": "blue-green, ethereal",
             "colors": ["#1a3a3a", "#0a2a3a", "#2a4a4a"]},
        ],
        "dungeon": [
            {"id": "dungeon_stone", "name": "Stone Floor", "style": "gray, rough",
             "colors": ["#3a3a3a", "#4a4a4a", "#2a2a2a"]},
            {"id": "dungeon_brick", "name": "Brick Wall", "style": "red-brown, pattern",
             "colors": ["#4a3a2a", "#5a4a3a", "#3a2a1a"]},
            {"id": "dungeon_dark", "name": "Dark Cave", "style": "very dark, damp",
             "colors": ["#1a1a1a", "#2a2a2a", "#0a0a0a"]},
        ],
        "tavern": [
            {"id": "tavern_wood", "name": "Wood Planks", "style": "warm brown, wood grain",
             "colors": ["#5a3a1a", "#6a4a2a", "#4a2a0a"]},
            {"id": "tavern_stone", "name": "Tavern Floor", "style": "mixed stone, warm",
             "colors": ["#4a4a3a", "#5a5a4a", "#3a3a2a"]},
            {"id": "tavern_carpet", "name": "Red Carpet", "style": "rich red, ornate",
             "colors": ["#5a1a1a", "#6a2a2a", "#4a0a0a"]},
        ],
        "desert": [
            {"id": "desert_sand", "name": "Desert Sand", "style": "tan, smooth",
             "colors": ["#c2a66e", "#b89c60", "#d4b87a"]},
            {"id": "desert_rock", "name": "Desert Rock", "style": "red-brown, rough",
             "colors": ["#8a5a3a", "#9a6a4a", "#7a4a2a"]},
        ],
        "water": [
            {"id": "water_ocean", "name": "Ocean", "style": "deep blue, waves",
             "colors": ["#0a3a6a", "#1a4a7a", "#0a2a5a"]},
            {"id": "water_shallow", "name": "Shallow Water", "style": "turquoise, clear",
             "colors": ["#2a8a9a", "#3a9aaa", "#1a7a8a"]},
            {"id": "water_ice", "name": "Ice", "style": "white-blue, frozen",
             "colors": ["#aaccee", "#99bbdd", "#bbddff"]},
        ],
        "night": [
            {"id": "night_sky", "name": "Night Sky", "style": "dark, stars",
             "colors": ["#0a0a1a", "#1a1a2a", "#000010"]},
            {"id": "night_moon", "name": "Moonlit", "style": "dark with moonlight",
             "colors": ["#1a1a2a", "#2a2a3a", "#0a0a2a"]},
        ],
    }

    return catalog.get(scene_type, catalog["dungeon"])
