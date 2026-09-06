"""Data structures for map detection results."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Point:
    x: float
    y: float


@dataclass
class DetectedWall:
    id: str
    points: List[Point]
    thickness: float = 10.0
    confidence: float = 1.0
    room_ids: List[str] = field(default_factory=list)

    @property
    def start(self) -> Point:
        return self.points[0]

    @property
    def end(self) -> Point:
        return self.points[-1]

    @property
    def length(self) -> float:
        total = 0.0
        for i in range(len(self.points) - 1):
            dx = self.points[i + 1].x - self.points[i].x
            dy = self.points[i + 1].y - self.points[i].y
            total += (dx ** 2 + dy ** 2) ** 0.5
        return total


@dataclass
class DetectedDoor:
    id: str
    position: Point
    rotation: float = 0.0
    width: float = 30.0
    confidence: float = 1.0
    connects: Optional[tuple] = None


@dataclass
class DetectedWindow:
    id: str
    position: Point
    rotation: float = 0.0
    width: float = 20.0
    confidence: float = 1.0


@dataclass
class DetectedRoom:
    id: str
    polygon: List[Point]
    door_ids: List[str] = field(default_factory=list)
    label: str = ""
    area: float = 0.0


@dataclass
class WalkableArea:
    id: str
    polygon: List[Point]
    area: float = 0.0
    ratio: float = 0.0


@dataclass
class DetectedMap:
    width: int = 0
    height: int = 0
    walls: List[DetectedWall] = field(default_factory=list)
    doors: List[DetectedDoor] = field(default_factory=list)
    windows: List[DetectedWindow] = field(default_factory=list)
    rooms: List[DetectedRoom] = field(default_factory=list)
    walkable_areas: List[WalkableArea] = field(default_factory=list)
    walkable_ratio: float = 0.0
    confidence: float = 1.0
    mode: str = "blueprint"

    @property
    def wall_count(self) -> int:
        return len(self.walls)

    @property
    def door_count(self) -> int:
        return len(self.doors)

    @property
    def window_count(self) -> int:
        return len(self.windows)

    @property
    def room_count(self) -> int:
        return len(self.rooms)

    @property
    def walkable_area_count(self) -> int:
        return len(self.walkable_areas)

    def to_dict(self) -> dict:
        return {
            "walls": [
                {
                    "id": w.id,
                    "points": [{"x": p.x, "y": p.y} for p in w.points],
                    "thickness": w.thickness,
                    "confidence": w.confidence,
                }
                for w in self.walls
            ],
            "doors": [
                {
                    "id": d.id,
                    "position": {"x": d.position.x, "y": d.position.y},
                    "rotation": d.rotation,
                    "width": d.width,
                    "confidence": d.confidence,
                }
                for d in self.doors
            ],
            "windows": [
                {
                    "id": w.id,
                    "position": {"x": w.position.x, "y": w.position.y},
                    "rotation": w.rotation,
                    "width": w.width,
                    "confidence": w.confidence,
                }
                for w in self.windows
            ],
            "rooms": [
                {
                    "id": r.id,
                    "polygon": [{"x": p.x, "y": p.y} for p in r.polygon],
                    "door_ids": r.door_ids,
                    "label": r.label,
                    "area": r.area,
                }
                for r in self.rooms
            ],
            "walkable_areas": [
                {
                    "id": a.id,
                    "polygon": [{"x": p.x, "y": p.y} for p in a.polygon],
                    "area": a.area,
                    "ratio": a.ratio,
                }
                for a in self.walkable_areas
            ],
            "walkable_ratio": self.walkable_ratio,
            "image_size": {"width": self.width, "height": self.height},
            "wall_count": self.wall_count,
            "door_count": self.door_count,
            "window_count": self.window_count,
            "room_count": self.room_count,
            "confidence": self.confidence,
            "mode": self.mode,
        }
