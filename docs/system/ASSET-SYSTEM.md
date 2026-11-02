# Asset System

## 1. Overview

Roleito uses a local-first, manifest-driven asset system designed around a single constraint: **all assets must be CC0 or Public Domain**. No freemium assets, no attribution-required content, no non-commercial licenses. Every asset can be used, modified, and redistributed without restriction.

The asset system manages three storage pools:

- **Campaign-specific** — `data/campaigns/{id}/assets/` — assets unique to a campaign
- **Shared** — `data/shared/assets/` — reusable across campaigns
- **Bundled** — `assets/bundled/` — ships with Roleito

Assets are discovered through JSON manifests that describe each asset's metadata, licensing, and file references. The manifest system enables fast search, filtering, and validation without scanning the filesystem.

The asset system integrates with the scene graph (items reference assets by ID), the 3D renderer (GLB model loading), the map engine (terrain textures), the audio system (music/SFX), and the DM dashboard (visual asset browser with drag-and-drop).

## 2. Asset Categories

```
assets/
  characters/        # creature/NPC tokens and 3D models
    humanoids/
    monsters/
    animals/
    undead/
  environments/      # terrain textures, skyboxes, map tiles
    terrain/
    water/
    sky/
    walls/
  props/             # furniture, objects, decorations
    furniture/
    containers/
    weapons/
    armor/
    books/
  effects/           # particle effects, spell visualizations
    spells/
    ambient/
    combat/
  audio/             # sound effects, music, ambient
    music/
    sfx/
    ambient/
  ui/                # UI elements, icons, fonts
    icons/
    fonts/
```

### Category Details

**Characters** — Tokens (2D PNG) and models (3D GLB) for creatures, NPCs, and player characters. Subcategories group by creature type for quick filtering during encounters.

**Environments** — Terrain textures (grass, stone, sand, etc.), skyboxes, water surfaces, and wall segments. All terrain textures are seamless and tileable. Skyboxes are equirectangular panoramas.

**Props** — Interactable objects placed in scenes. Includes furniture, containers (chests, barrels), weapons, armor displays, and books/scrolls. Each prop has both a 2D token variant and a 3D model variant.

**Effects** — Visual effects for spells, ambient particles (rain, snow, fireflies), and combat impacts (blood splatters, explosions). Stored as sprite sequences or procedural particle definitions.

**Audio** — Background music tracks, sound effects (door creaks, sword clashes, footsteps), and ambient loops (forest sounds, tavern chatter). Formats: OGG (web-optimized), WAV (high quality), MP3 (legacy).

**UI** — Icons for the HUD, custom fonts for in-game text, and interface elements for the VTT overlay.

## 3. Asset Manifest

Every asset folder contains a `manifest.json` at its root. The manifest describes all assets in that folder.

```typescript
interface AssetManifest {
  version: string;
  assets: AssetEntry[];
}

interface AssetEntry {
  id: string;
  name: string;
  category: AssetCategory;
  subcategory: string;
  tags: string[];

  // Files
  thumbnail: string;
  files: AssetFile[];

  // Licensing
  license: 'CC0' | 'Public Domain';
  author: string;
  source: string;
  attribution?: string;

  // Metadata
  format: string;
  size: number;
  dimensions?: { width: number; height: number };

  // 3D specific
  animations?: string[];
  materials?: string[];
  rigging?: boolean;

  // 2D specific
  gridAligned?: boolean;
  transparent?: boolean;
}

interface AssetFile {
  purpose: 'token' | 'model' | 'texture' | 'audio' | 'thumbnail' | 'preview';
  path: string;
  format: string;
  size: number;
  lod?: number;
}

type AssetCategory = 'characters' | 'environments' | 'props' | 'effects' | 'audio' | 'ui';
```

### Manifest Validation

The asset system validates manifests on load:

- All referenced files must exist on disk
- License field must be `'CC0'` or `'Public Domain'` — no other values accepted
- IDs must be unique within the manifest
- Required fields (`id`, `name`, `category`, `license`) must not be empty
- File paths must be relative to the manifest location
- `size` must match actual file size on disk

Invalid manifests log warnings but do not crash the system. Assets from invalid manifests are excluded from browsing. The asset browser shows a badge on folders with validation errors.

### Example Manifest

```json
{
  "version": "1.0",
  "assets": [
    {
      "id": "goblin-warrior",
      "name": "Goblin Warrior",
      "category": "characters",
      "subcategory": "monsters",
      "tags": ["goblin", "warrior", "melee", "low-level"],
      "thumbnail": "goblin-warrior-thumb.webp",
      "files": [
        {
          "purpose": "token",
          "path": "goblin-warrior-token.png",
          "format": "png",
          "size": 24576
        },
        {
          "purpose": "model",
          "path": "goblin-warrior.glb",
          "format": "glb",
          "size": 1048576,
          "lod": 0
        }
      ],
      "license": "CC0",
      "author": "Kenney",
      "source": "kenney.nl",
      "format": "png",
      "size": 24576,
      "dimensions": { "width": 256, "height": 256 },
      "animations": ["idle", "walk", "attack"],
      "rigging": true,
      "gridAligned": true,
      "transparent": true
    }
  ]
}
```

### Manifest Location

Each asset pool has its own manifest:

```
data/campaigns/{id}/assets/manifest.json    # campaign-specific
data/shared/assets/manifest.json            # shared pool
assets/bundled/manifest.json                # bundled defaults
```

Multiple manifests can exist in subfolders. The system scans all `manifest.json` files in the pool and merges entries. Subfolder manifests override parent manifest entries for the same asset ID.

## 4. Asset Resolution Priority

When an asset is requested by ID, the system resolves it in this order:

1. **Campaign-specific** — `data/campaigns/{id}/assets/` — highest priority, allows campaign overrides
2. **Shared** — `data/shared/assets/` — reusable assets available to all campaigns
3. **Bundled** — `assets/bundled/` — Roleito's default asset library
4. **External URL** — fallback for remote assets, with disk caching

This hierarchy lets campaigns customize shared assets without modifying the originals. A campaign can override a shared goblin token with its own variant, and all references resolve automatically.

## 5. Asset Loading Pipeline

```
Request asset by ID
  → Check in-memory LRU cache
    → Hit: return cached asset
    → Miss: continue
  → Check campaign manifest cache
    → Found: load from campaign assets/
    → Not found: continue
  → Check shared manifest cache
    → Found: load from shared assets/
    → Not found: continue
  → Check bundled manifest cache
    → Found: load from bundled assets/
    → Not found: continue
  → Check external URL cache
    → Found: load from disk cache
    → Not found: return null
  → Load file from disk
  → Deserialize (decode image, parse GLB, decode audio)
  → Store in LRU cache
  → Return to requester
```

### Cache Invalidation

- Manifests are reloaded when their `modified` timestamp changes
- File changes trigger manifest re-scan for that folder
- LRU cache evicts least-recently-used entries when memory limit (512MB) is reached

## 6. AI Asset Generation

The DM can request assets through natural language. The AI generates assets in the same format as imported ones, stored in the campaign assets folder.

### Generation Capabilities

| Type | Input | Output | Storage |
|------|-------|--------|---------|
| 2D Token | Description | PNG, transparent background, grid-aligned | `characters/` or `props/` |
| 3D Model | Description | GLB, rigged, animated | Same category as 2D |
| Texture | Description | PNG/JPG, seamless, tileable | `environments/` |
| Sound Effect | Description | WAV/OGG | `audio/sfx/` |

### Generated Asset Metadata

Generated assets use the same `AssetEntry` format as imported assets:

- `license` is always `'CC0'` (AI-generated content has no copyright)
- `author` is set to the AI model identifier
- `source` is set to `'generated'`
- `attribution` is omitted

Generated assets are indistinguishable from imported assets in the manifest system. They appear in the asset browser, can be dragged into scenes, and resolve through the standard priority chain.

### Generation Workflow

```
DM describes asset in natural language
  → AI interprets description
  → AI generates asset file(s)
  → System validates format and dimensions
  → System generates thumbnail
  → System creates manifest entry
  → Asset written to campaign assets folder
  → Manifest updated
  → Asset available in browser
```

### Generation Constraints

- 2D tokens: 256x256 or 512x512, transparent PNG, grid-aligned
- 3D models: GLB format, under 5MB, max 10k vertices
- Textures: power-of-two dimensions, seamless where possible
- Audio: OGG format, max 30 seconds for SFX, max 5 minutes for music
- All generated assets receive `license: 'CC0'` automatically

### AI Provider Integration

Asset generation uses the same decoupled provider layer as other AI features. The system supports:

- Local image generation (Stable Diffusion)
- External APIs (DALL-E, Midjourney via API)
- Local audio generation (Bark, AudioCraft)

Provider selection depends on availability and configured preferences. Local generation is preferred for privacy and cost.

## 7. Asset Integration Points

### Scene Graph

Scene items reference assets by ID. When a map item is placed, its `assetId` field points to a character token, prop model, or environment texture. The scene graph resolves the ID through the asset pipeline at render time.

Scene items use the canonical `Item` interface from `SCENE-GRAPH.md`. Assets are referenced via the `image` field (2D) or `metadata` (3D model path). The `layer` field uses `SceneLayer` enum values:

```typescript
// Canonical types from SCENE-GRAPH.md — do not duplicate here
// Item.image → 2D asset reference
// Item.metadata.type === 'token' → character/NPC token
// Item.metadata.type === 'terrain' → environment texture
```

Asset resolution happens at render time, not at placement time. This means swapping a shared token with a campaign override updates all instances without scene graph changes.

### 3D Renderer

The renderer loads GLB models through the asset system. Models are cached in GPU memory after first load. Materials and animations referenced in the manifest are available for runtime control.

### Map Analysis

Map analysis uses environment textures for terrain classification. The renderer references terrain assets for ground materials, water surfaces, and wall segments.

### Fog of War

Fog of war uses fog textures from the effects category. Edge softness and color are controlled through shader parameters, not asset variants.

### Audio System

The audio system loads music tracks and sound effects through the asset system. Audio assets are streamed for large files and cached in memory for small files.

```typescript
interface AudioAsset {
  id: string;
  type: 'music' | 'sfx' | 'ambient';
  loop: boolean;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}
```

Audio playback respects asset resolution priority. A campaign can override shared ambient tracks with custom versions. The audio system crossfades between tracks and manages a pool of playback channels.

### DM Dashboard

The asset browser in the DM dashboard provides visual access to all assets. Drag-and-drop places assets directly into the scene. The browser shows thumbnails, filters by category/tags, and supports search.

## 8. Asset Browser UI

The asset browser is a panel in the DM dashboard for discovering and placing assets.

### Layout

```
┌─────────────────────────────────────────────────┐
│ [Search..._____________] [Category ▼] [Tags ▼]  │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│  Filter  │   Grid View (thumbnails)             │
│  Panel   │   ┌─────┐ ┌─────┐ ┌─────┐           │
│          │   │     │ │     │ │     │           │
│ Category │   │  A  │ │  B  │ │  C  │           │
│ Tags     │   │     │ │     │ │     │           │
│ License  │   └─────┘ └─────┘ └─────┘           │
│ Source   │   ┌─────┐ ┌─────┐ ┌─────┐           │
│          │   │     │ │     │ │     │           │
│          │   │  D  │ │  E  │ │  F  │           │
│          │   │     │ │     │ │     │           │
│          │   └─────┘ └─────┘ └─────┘           │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│ [Import] [AI Generate]          [Details Panel] │
└─────────────────────────────────────────────────┘
```

### Features

- **Grid view** — thumbnails with name overlay, click to select
- **Filter panel** — category, tags, license status, source
- **Search** — fuzzy search on name and tags
- **Drag-and-drop** — drag from grid to scene/canvas
- **Preview panel** — shows full details, file list, metadata
- **Import button** — opens file picker to add new assets
- **AI Generate** — opens prompt input for asset generation

### Filter Behavior

Filters combine with AND logic. Selecting "characters" + "undead" shows only undead characters. Tags filter within the selected category. License filter defaults to "CC0 only" (the only valid option).

### Keyboard Shortcuts

- `Ctrl+F` — focus search box
- `Ctrl+I` — open import dialog
- `Ctrl+G` — open AI generate dialog
- `Escape` — clear selection, close panels
- `Delete` — remove selected asset from campaign
- `Enter` — place selected asset at cursor position

### Drag-and-Drop

Dragging from the asset browser to the canvas places the asset at the drop position. The asset type determines placement behavior:

- Character tokens snap to grid centers
- Props align to grid edges
- Environment textures apply to the hovered tile
- Effects spawn at the drop point with default animation
- Audio assets trigger preview playback on drop

## 9. Asset Optimization

### Texture Compression

- **2D textures** — WebP format for web delivery, PNG for source quality
- **3D textures** — Draco compression for GLB models
- **Terrain textures** — seamless, tileable, power-of-two dimensions (512x512, 1024x1024)
- **Thumbnails** — 128x128 WebP, generated on import

### Level of Detail (LOD)

3D models support multiple LOD levels:

- **LOD 0** — full detail, close-up view
- **LOD 1** — medium detail, mid-range
- **LOD 2** — low detail, far away

LOD selection is automatic based on camera distance. LOD levels are stored as separate GLB files or as variants within a single GLB.

### Sprite Sheets

Related 2D assets are combined into sprite sheets for batch loading:

- Character animation frames (idle, walk, attack)
- Spell effect sequences
- UI icon sets

### Audio Compression

- **OGG** — primary format for web playback, smaller file size
- **WAV** — high-quality source, used for editing
- **MP3** — legacy format, converted to OGG on import

Streaming is enabled for music tracks larger than 1MB. Short sound effects are fully loaded into memory.

### Lazy Loading

Assets are loaded on demand, not at startup:

- Visible assets load first (priority queue)
- Off-screen assets are evicted from memory
- Background loading runs during idle frames

## 10. Performance

### Memory Management

- **Asset cache** — LRU eviction, 512MB limit
- **Texture atlas** — small textures combined into atlas sheets
- **3D instancing** — identical models share geometry in GPU memory
- **Audio buffer pool** — pre-allocated buffers for sound effects
- **Manifest index** — in-memory search index for fast filtering

### Loading Strategy

- **Preload** — DM marks assets for preload at session start
- **Streaming** — large audio and 3D models load in background
- **Prefetch** — next likely assets loaded during idle time
- **Priority queue** — visible assets load before background assets
- **Progressive** — LOD 0 loads first, higher LODs load in background

### Cache Statistics

The system tracks cache performance:

```
Cache hits:     847
Cache misses:   23
Memory used:    128MB / 512MB
Models cached:  42
Textures cached: 312
Audio cached:   18
```

### Optimization Guidelines

- Keep individual assets under 5MB for fast loading
- Use texture atlases for UI icons and small sprites
- Compress audio to OGG before storage
- Provide LOD variants for complex 3D models
- Use transparent PNG for tokens, not JPEG
- Keep manifests under 1000 entries per folder (split into subfolders if larger)
- Prefer WebP for thumbnails and previews
- Use power-of-two texture dimensions for GPU efficiency

## 11. Licensing

### CC0 Compliance

Every asset in the system must be CC0 or Public Domain. The asset system enforces this:

- Manifest validation rejects any license value other than `'CC0'` or `'Public Domain'`
- Import workflow includes license declaration step
- Asset browser shows license status on every entry
- AI-generated assets are automatically tagged as CC0

### Accepted Sources

Priority sources for bundled and shared assets:

| Source | License | Notes |
|--------|---------|-------|
| Kenney | CC0 | Characters, props, environment |
| itch.io CC0 | CC0 | Community contributions |
| PVFX Foundry | CC0 | Particle effects |
| OpenGameArt | CC0 | Mixed, verify per asset |
| AI Generated | CC0 | Generated in-session |

### Attribution

CC0 does not require attribution, but the system supports optional attribution fields for credits. The DM can display attribution in a session credits screen if desired.

### License Audit

The asset browser includes a license audit view that lists all assets and their license status. Any asset without a valid CC0/Public Domain license is flagged for removal.

## 12. Asset Naming Conventions

### File Naming

```
{category}-{subcategory}-{name}.{ext}
```

Examples:
```
characters-monsters-goblin-warrior.png
characters-monsters-goblin-warrior.glb
environments-terrain-grass-seamless.webp
props-weapons-longsword.glb
audio-sfx-sword-clash.ogg
```

### ID Naming

Asset IDs use kebab-case, derived from the file path:

```
characters/monsters/goblin-warrior.png  →  id: "characters-monsters-goblin-warrior"
```

IDs are unique across all manifests. The resolution priority system handles duplicates by preferring campaign-specific entries.

### Thumbnail Naming

Thumbnails use the asset ID with a `-thumb` suffix:

```
goblin-warrior-thumb.webp
```

Thumbnails are 128x128 WebP, generated automatically on import if missing.
