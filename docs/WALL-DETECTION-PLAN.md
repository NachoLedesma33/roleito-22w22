# Wall Detection Improvement Plan

## Current State

`backend/wall_detection/` detects walls from 2D battle maps using OpenCV Canny edge detection + contour analysis. Works acceptably for clean blueprints (46 walls, 39 doors) but poorly for rendered/textured maps (227 walls, most false positives). Walls often render outside the actual map area.

**Root causes:**
- Canny edge detection picks up textures, grid lines, furniture edges, shadows
- No understanding of architectural context (what IS a wall vs decoration)
- Contour-based approach fragments long walls into many short segments
- Door detection relies only on endpoint gaps, misses actual door shapes
- No room-level understanding

---

## Recommended Stack (New Dependencies)

```
# Existing
opencv-python-headless    # Preprocessing, morphological ops

# New - Layer 1 (Quick Win, no training)
scikit-image              # Better Hough line transform, Canny
shapely                   # Geometry: merge, simplify, room detection
numpy                     # Array ops (already have)

# New - Layer 2 (AI-Assisted)
openai                    # GPT-4o vision for wall proposal
# OR
google-genai              # Gemini vision

# New - Layer 3 (Optional, fine-tuned)
# ultralytics             # YOLOv8 for object detection
# torch + torchvision     # U-Net for semantic segmentation
```

---

## Architecture: Dual-Mode Pipeline

```
MAP IMAGE
    │
    ├── Is it a clean blueprint / line drawing?
    │       │
    │       ├── YES → Blueprint Pipeline (CV-only)
    │       │         scikit-image + Shapely
    │       │
    │       └── NO  → Textured Pipeline (AI-assisted)
    │                 GPT-4o/Gemini vision → OpenCV cleanup
    │
    ▼
DetectedMap {
    walls: [{points, thickness, confidence}]
    doors: [{position, width, rotation, confidence}]
    rooms: [{polygon, door_ids}]
    confidence: float
}
    │
    ▼
SceneGraph + CollisionGraph
```

---

## Phase 1: Better CV Pipeline (Blueprint Mode)

**Goal:** Fix false positives, merge fragments, detect rooms.

### 1.1 Replace OpenCV Hough with scikit-image

```python
# Current (OpenCV) - poor results
edges = cv2.Canny(blurred, 80, 160)
lines = cv2.HoughLinesP(edges, ...)

# Better (scikit-image)
from skimage.transform import probabilistic_hough_line
from skimage.feature import canny

edges = canny(gray, sigma=2, low_threshold=1, high_threshold=25)
lines = probabilistic_hough_line(
    edges,
    threshold=10,
    line_length=20,    # minimum wall length
    line_gap=5,        # max gap to connect
)
```

**Why better:**
- `probabilistic_hough_line()` returns line segments with precise endpoints
- `canny()` from scikit-image often produces cleaner edges
- `line_length` and `line_gap` parameters directly control wall merging

### 1.2 Add LSD (Line Segment Detector)

```python
# OpenCV's LSD - often overlooked, excellent for architecture
lsd = cv2.createLineSegmentDetector(0)
lines, widths, prec, nfa = lsd.detect(gray)
```

**Why:** Detects line segments directly without edge preprocessing. Better for straight architectural lines than Hough.

### 1.3 Use Shapely for Geometry Operations

```python
from shapely.geometry import LineString, MultiLineString, unary_union
from shapely.ops import polygonize, linemerge

# Convert detected lines to Shapely LineStrings
line_strings = [LineString([(x1,y1), (x2,y2)]) for (x1,y1), (x2,y2) in lines]

# Merge collinear/nearby lines
merged = linemerge(line_strings)

# Merge overlapping segments
buffered = [ls.buffer(5) for ls in line_strings]  # 5px wall thickness
merged_walls = unary_union(buffered)

# Extract rooms (closed polygons from wall boundaries)
rooms = list(polygonize(merged_walls))
```

**Why:**
- `linemerge()` connects broken wall segments automatically
- `unary_union()` merges overlapping wall buffers into clean polygons
- `polygonize()` extracts room polygons from wall boundaries
- `buffer()` handles variable wall thickness

### 1.4 Better Contour Filtering

```python
# Current: only area filter
if area < min_area: continue

# Add: aspect ratio, solidity, extent, circularity
x, y, w, h = cv2.boundingRect(contour)
aspect = max(w, h) / (min(w, h) + 1)
extent = area / (w * h)
hull = cv2.convexHull(contour)
solidity = area / cv2.contourArea(hull)

# Walls: elongated (aspect > 2), solid (solidity > 0.4), low extent
if aspect < 2.0: continue      # not elongated enough
if solidity < 0.4: continue    # too fragmented
if extent > 0.8: continue      # too square (might be furniture)
```

### 1.5 Grid Line Removal

```python
def remove_grid_lines(binary, grid_size):
    """Remove regular grid lines from binary image."""
    result = binary.copy()
    h, w = result.shape

    # Detect horizontal grid lines
    for y in range(0, h, grid_size):
        row = result[max(0,y-1):min(h,y+2), :]
        if np.mean(row) > 0.3:  # mostly white = grid line
            result[max(0,y-1):min(h,y+2), :] = 0

    # Detect vertical grid lines
    for x in range(0, w, grid_size):
        col = result[:, max(0,x-1):min(w,x+2)]
        if np.mean(col) > 0.3:
            result[:, max(0,x-1):min(w,x+2)] = 0

    return result
```

---

## Phase 2: AI-Assisted Detection (Textured Mode)

**Goal:** Use VLM to propose wall layout from rendered/isometric maps.

### 2.1 GPT-4o / Gemini Vision Approach

```python
import base64
from openai import OpenAI

def detect_walls_with_ai(image_path: str) -> dict:
    """Use GPT-4o vision to extract wall layout from battle map."""
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": """Analyze this battle map image and extract the wall layout.

Return JSON with:
{
  "walls": [
    {
      "points": [{"x": 0.0-1.0, "y": 0.0-1.0}, ...],
      "thickness": "thin|medium|thick",
      "confidence": 0.0-1.0
    }
  ],
  "doors": [
    {
      "position": {"x": 0.0-1.0, "y": 0.0-1.0},
      "rotation": degrees,
      "width": 0.0-1.0,
      "confidence": 0.0-1.0
    }
  ],
  "rooms": [
    {
      "polygon": [{"x": 0.0-1.0, "y": 0.0-1.0}, ...],
      "label": "string"
    }
  ]
}

Rules:
- Coordinates normalized 0-1 relative to image dimensions
- Only detect architectural walls (not furniture, decorations)
- Include walls that partially occlude the view
- Mark confidence based on visibility
- Doors are openings in walls or visible door objects"""
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img_b64}",
                        "detail": "high"
                    }
                }
            ]
        }],
        max_tokens=4096,
    )

    return json.loads(response.choices[0].message.content)
```

### 2.2 Hybrid: AI Proposal + CV Refinement

```python
def detect_walls_hybrid(image_path: str) -> DetectedMap:
    """AI proposes, OpenCV refines geometry."""

    # Step 1: AI proposes rough wall layout
    ai_result = detect_walls_with_ai(image_path)

    # Step 2: Load original image
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Step 3: For each AI-proposed wall, refine with CV
    refined_walls = []
    for wall in ai_result["walls"]:
        points = wall["points"]

        # Sample along the proposed wall line
        # Check edge strength at each point
        # Adjust endpoints to actual edge positions
        refined = refine_wall_with_edges(gray, points)
        refined_walls.append(refined)

    # Step 4: Build DetectedMap
    return DetectedMap(
        walls=refined_walls,
        doors=ai_result["doors"],
        rooms=ai_result.get("rooms", []),
    )
```

### 2.3 Cost Consideration

| Provider | Cost per 1000 maps | Latency |
|----------|-------------------|---------|
| GPT-4o | ~$5-10 | 2-5s |
| Gemini 2.0 Flash | ~$0.50-1 | 1-3s |
| Local model | Free | 5-30s |

**Recommendation:** Use Gemini Flash for cost-effective batch processing, GPT-4o for highest quality.

---

## Phase 3: Room Detection (For Fog of War)

**Goal:** Detect enclosed rooms from wall geometry.

### 3.1 Planar Subdivision from Wall Centerlines

```python
from shapely.geometry import LineString, Polygon
from shapely.ops import polygonize, unary_union

def detect_rooms(walls: list[DetectedWall]) -> list[DetectedRoom]:
    """Extract room polygons from wall segments."""
    # Create line strings from wall points
    lines = []
    for wall in walls:
        coords = [(p.x, p.y) for p in wall.points]
        lines.append(LineString(coords))

    # Merge and polygonize
    merged = linemerge(lines)
    polygons = list(polygonize(merged))

    rooms = []
    for i, poly in enumerate(polygons):
        if poly.area < 100:  # skip tiny artifacts
            continue

        room = DetectedRoom(
            id=f"room-{i}",
            polygon=[Point(x, y) for x, y in poly.exterior.coords],
            label=f"Room {i+1}",
        )
        rooms.append(room)

    return rooms
```

### 3.2 Room Connectivity Graph

```python
def build_room_graph(rooms, doors):
    """Build graph of which rooms connect through which doors."""
    graph = {}
    for room in rooms:
        graph[room.id] = {"neighbors": [], "doors": []}

    for door in doors:
        for room in rooms:
            # Check if door is on room boundary
            if _point_near_polygon(door.position, room.polygon, threshold=10):
                graph[room.id]["doors"].append(door.id)

    return graph
```

---

## Phase 4: CollisionGraph (Separate from SceneGraph)

**Goal:** Dedicated collision data structure for movement blocking.

### 4.1 Data Structure

```typescript
interface CollisionGraph {
  segments: CollisionSegment[];
  portals: CollisionPortal[];
  bounds: { width: number; height: number };
}

interface CollisionSegment {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  thickness: number;
  wallId: string;  // link to SceneGraph wall
}

interface CollisionPortal {
  id: string;
  position: { x: number; y: number };
  width: number;
  rotation: number;
  open: boolean;     // toggled by DM
  wallId: string;
}
```

### 4.2 Conversion from DetectedMap

```typescript
function detectedMapToCollisionGraph(
  map: DetectedMap,
  mapScale: number
): CollisionGraph {
  const segments: CollisionSegment[] = [];

  for (const wall of map.walls) {
    for (let i = 0; i < wall.points.length - 1; i++) {
      segments.push({
        id: `${wall.id}-seg-${i}`,
        start: normalizeTo3D(wall.points[i], mapScale),
        end: normalizeTo3D(wall.points[i + 1], mapScale),
        thickness: wall.thickness,
        wallId: wall.id,
      });
    }
  }

  const portals: CollisionPortal[] = map.doors.map(door => ({
    id: door.id,
    position: normalizeTo3D(door.position, mapScale),
    width: door.width,
    rotation: door.rotation,
    open: false,
    wallId: '',
  }));

  return { segments, portals, bounds: { width: 0, height: 0 } };
}
```

---

## Phase 5: DM Review UI

**Goal:** Show detected walls for manual accept/reject/merge.

### 5.1 Detection Result Panel

```
┌─────────────────────────────────┐
│ AUTO DETECTION RESULTS          │
├─────────────────────────────────┤
│                                 │
│ ✅ 37 walls (confidence: 0.85)  │
│ ✅ 8 doors  (confidence: 0.72)  │
│ ✅ 12 rooms detected            │
│                                 │
│ ⚠️  4 uncertain objects          │
│                                 │
│ [ Accept All ] [ Review Each ]  │
│ [ Clear & Redetect ]            │
└─────────────────────────────────┘
```

### 5.2 Per-Wall Review

When reviewing a wall:
- Highlight on map with color (green=high confidence, yellow=medium, red=low)
- Show confidence percentage
- Options: Accept / Delete / Split / Merge with neighbor

---

## Implementation Priority

### Quick Wins (1-2 days)
1. ✅ Replace OpenCV Hough with scikit-image `probabilistic_hough_line()`
2. ✅ Add Shapely for segment merging and simplification
3. ✅ Improve contour filtering (aspect ratio, solidity, extent)
4. ✅ Add grid line removal
5. ✅ Better door detection (check for door-shaped gaps, not just endpoint gaps)

### Medium Term (1 week)
6. AI-assisted detection with GPT-4o/Gemini for textured maps
7. Room detection from wall polygons
8. CollisionGraph separate from SceneGraph
9. DM review UI for detection results

### Long Term (2+ weeks)
10. Fine-tuned U-Net model on battle map data
11. Real-time detection during image upload
12. Batch processing for multiple maps

---

## Testing Strategy

### Test Images Needed
1. **Clean blueprint** — black lines on white/beige background (current demo map)
2. **Gridded map** — with visible grid lines (dungeon crawl style)
3. **Textured battlemap** — rendered with lighting/shadows (tavern, outdoor)
4. **Isometric/perspective** — 3D rendered maps
5. **Hand-drawn** — sketchy/organic wall styles

### Success Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Blueprint walls | 46 (some false) | < 40, all correct |
| Blueprint doors | 39 | Match actual doors |
| Textured walls | 227 (mostly wrong) | < 50, > 80% correct |
| False positive rate | ~70% | < 20% |
| Detection time | < 1s | < 3s (acceptable) |

---

## File Structure (Target)

```
backend/
  wall_detection/
    __init__.py           # Public API
    types.py              # DetectedMap, DetectedWall, etc.
    preprocessing.py      # Image preprocessing (blueprint/textured)
    clustering.py         # Segment grouping
    wall_detector.py      # Wall detection (CV)
    door_detector.py      # Door detection
    room_detector.py      # Room detection (Shapely)
    pipeline.py           # Main pipeline
    ai_detector.py        # VLM-based detection (Phase 2)
    collision_graph.py    # CollisionGraph builder
    config.py             # Detection parameters
```

---

## Notes

- Always normalize coordinates to 0-1 range for resolution independence
- Keep detection results cached per scene (don't re-detect on every load)
- The "95% auto + 5% manual DM correction" approach is the realistic target
- VLM-based detection is the future but costs money per detection
- CV-only approach is free but limited to clean blueprints
