# Environment Specification System

## Core Concept

```text
Describe STRUCTURE and STYLE, not specific images
YAML specs → 3D environment generation
Modular, reusable, consistent
```

---

## Base Style Definition

```yaml
base_style:
  # Camera
  camera:
    type: isometric
    angle: 35  # degrees from ground
    rotation: 45  # degrees from north
    zoom: tactical  # close enough to see details
    
  # Scale
  scale:
    unit: grid_square  # 1 unit = 1 square
    character_height: 0.8
    wall_height: 1.2
    ceiling_height: 2.0
    
  # Aesthetic
  aesthetic: tactical_rpg
  inspiration:
    - dungeon_crawlers
    - isometric_rpgs
    - modular_dioramas
    - tabletop_terrain
```

---

## Environment Types

### 1. Dungeon

```yaml
dungeon:
  name: "Ancient Dungeon"
  
  architecture:
    style: stone_ruins
    age: ancient
    condition: partially_deteriorated
    
  materials:
    primary:
      - type: stone
        color: "#808080"
        texture: rough_hewn
        variation: medium
        
    secondary:
      - type: moss
        color: "#4a5d23"
        coverage: 15  # percent
        
      - type: wood
        color: "#8b4513"
        usage: doors_beams
        
  layout:
    corridors:
      width: 1-2  # grid units
      style: narrow_winding
      
    rooms:
      sizes: [3x3, 4x4, 5x5, 6x4]
      shapes: [rectangular, irregular]
      
    connections:
      type: archways
      width: 1-2
      decoration: stone_frames
      
  elements:
    structural:
      - columns
      - arches
      - niches
      -alcoves
      
    interactive:
      - doors
      - levers
      - pressure_plates
      
    decorative:
      - statues
      - torches
      - crates
      - barrels
      - rubble
      
    natural:
      - cracks
      - roots
      - puddles
      - vegetation_in_cracks
      
  lighting:
    sources:
      - type: torches
        color: warm_orange
        intensity: 0.6
        range: 3
        
      - type: ambient
        color: cool_blue
        intensity: 0.2
        
    shadows:
      enabled: true
      softness: medium
      direction: from_torches
      
  atmosphere:
    fog:
      enabled: true
      density: light
      color: "#1a1a2e"
      
    particles:
      - dust_motes
      - dripping_water
      
  palette:
    primary: "#808080"  # stone gray
    secondary: "#4a5d23"  # moss green
    accent: "#8b4513"  # wood brown
    light: "#ffa500"  # torch orange
    shadow: "#1a1a2e"  # dark blue
```

### 2. Tavern

```yaml
tavern:
  name: "The Rusty Tankard"
  
  architecture:
    style: wooden_building
    age: moderate
    condition: well_maintained
    
  materials:
    primary:
      - type: wood
        color: "#8b4513"
        texture: planks
        variation: medium
        
    secondary:
      - type: stone
        color: "#a0a0a0"
        usage: fireplace_foundation
        
      - type: fabric
        color: "#8b0000"
        usage: banners_curtains
        
  layout:
    main_hall:
      size: 6x8
      features: fireplace_bar
      
    rooms:
      sizes: [3x3, 4x4]
      usage: private_rooms
      
    kitchen:
      size: 3x4
      connected_to: main_hall
      
  elements:
    structural:
      - wooden_beams
      - stone_fireplace
      - bar_counter
      
    furniture:
      - tables
      - chairs
      - benches
      - beds_upstairs
      
    decorative:
      - banners
      - weapon_displays
      - paintings
      - candles
      
    functional:
      - bar
      - kitchen
      - storage
      
  lighting:
    sources:
      - type: fireplace
        color: warm_orange
        intensity: 0.8
        range: 5
        
      - type: candles
        color: warm_yellow
        intensity: 0.4
        range: 2
        
      - type: lanterns
        color: warm_white
        intensity: 0.5
        range: 3
        
    shadows:
      enabled: true
      softness: soft
      
  atmosphere:
    particles:
      - smoke_from_fireplace
      - dust_motes
      
    sounds:
      - crackling_fire
      - chatter
      - clinking_glasses
      
  palette:
    primary: "#8b4513"  # wood brown
    secondary: "#a0a0a0"  # stone gray
    accent: "#8b0000"  # red fabric
    light: "#ffa500"  # fire orange
```

### 3. Forest

```yaml
forest:
  name: "Whispering Woods"
  
  architecture:
    style: natural
    age: ancient
    condition: wild_untamed
    
  materials:
    primary:
      - type: vegetation
        color: "#228b22"
        density: thick
        
    secondary:
      - type: wood
        color: "#8b4513"
        usage: fallen_trees_logs
        
      - type: stone
        color: "#696969"
        usage: rocks_outcrops
        
  layout:
    paths:
      width: 1-2
      style: winding_natural
      
    clearings:
      sizes: [4x4, 6x6, 8x8]
      usage: campsites_battles
      
    density:
      trees_per_square: 0.3-0.8
      undergrowth: medium
      
  elements:
    natural:
      - trees_various_sizes
      - bushes
      - rocks
      - fallen_logs
      - mushrooms
      - flowers
      
    wildlife:
      - birds
      - rabbits
      - squirrels
      
    man_made:
      - campfire_remains
      - abandoned_camp
      - hidden_paths
      
  lighting:
    sources:
      - type: sunlight
        color: warm_white
        intensity: 0.7
        direction: through_canopy
        
      - type: ambient
        color: green_tinted
        intensity: 0.3
        
    shadows:
      enabled: true
      softness: dappled
      pattern: tree_canopy
      
  atmosphere:
    fog:
      enabled: true
      density: light_morning
      color: "#e8e8e8"
      
    particles:
      - falling_leaves
      - pollen
      - fireflies
      
    sounds:
      - birdsong
      - wind_in_trees
      - rustling_leaves
      
  palette:
    primary: "#228b22"  # forest green
    secondary: "#8b4513"  # wood brown
    accent: "#90ee90"  # light green
    sky: "#87ceeb"  # sky blue
```

### 4. Prison

```yaml
prison:
  name: "Maximum Security Prison"
  
  architecture:
    style: stone_reinforced
    age: old
    condition: functional
      
  materials:
    primary:
      - type: stone
        color: "#505050"
        texture: heavy_blocks
        
    secondary:
      - type: iron
        color: "#2f2f2f"
        usage: bars_chains_locks
        
      - type: wood
        color: "#654321"
        usage: doors_beams
        
  layout:
    cells:
      size: 2x2
      arrangement: rows_along_corridors
      
    corridors:
      width: 1-2
      style: straight_long
      
    common_areas:
      size: 6x6
      usage: mess_exercise
      
    special:
      - warden_office
      - torture_chamber
      - secret_passages
      
  elements:
    structural:
      - iron_bars
      - heavy_doors
      - lock_mechanisms
      - guard_towers
      
    furniture:
      - beds
      - tables
      - chairs
      - chains
      
    decorative:
      - wanted_posters
      - torches
      - blood_stains
      
    interactive:
      - locked_doors
      - hidden_keys
      - escape_routes
      
  lighting:
    sources:
      - type: torches
        color: warm_orange
        intensity: 0.5
        range: 2
        
      - type: ambient
        color: cool_gray
        intensity: 0.15
        
    shadows:
      enabled: true
      softness: harsh
      pattern: bar_shadows
      
  atmosphere:
    fog:
      enabled: true
      density: light
      color: "#2a2a3e"
      
    particles:
      - dust
      - rats_scurrying
      
    sounds:
      - chains_clinking
      - distant_screams
      - dripping_water
      
  palette:
    primary: "#505050"  # dark stone
    secondary: "#2f2f2f"  # iron
    accent: "#8b0000"  # blood red
    light: "#ffa500"  # torch
    shadow: "#1a1a2e"  # darkness
```

---

## Environment Preset System

### Loading Presets

```typescript
interface EnvironmentPreset {
  id: string;
  name: string;
  type: 'dungeon' | 'tavern' | 'forest' | 'prison' | 'custom';
  
  // Base configuration
  base_style: {
    camera: CameraConfig;
    scale: ScaleConfig;
    aesthetic: string;
  };
  
  // Materials
  materials: {
    primary: Material[];
    secondary: Material[];
  };
  
  // Layout rules
  layout: {
    corridors: CorridorConfig;
    rooms: RoomConfig[];
    connections: ConnectionConfig;
  };
  
  // Elements
  elements: {
    structural: string[];
    decorative: string[];
    interactive: string[];
    natural: string[];
  };
  
  // Lighting
  lighting: {
    sources: LightSource[];
    shadows: ShadowConfig;
  };
  
  // Atmosphere
  atmosphere: {
    fog?: FogConfig;
    particles?: string[];
    sounds?: string[];
  };
  
  // Color palette
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    light: string;
    shadow: string;
  };
}
```

### Using Presets

```typescript
// Load preset
const dungeonPreset = loadPreset('dungeon');

// Generate environment from preset
const environment = await generateEnvironment({
  preset: dungeonPreset,
  
  // Override specific settings
  overrides: {
    materials: {
      primary: [{
        type: 'stone',
        color: '#a0a0a0',  // lighter stone for this dungeon
      }]
    },
    
    lighting: {
      sources: [{
        type: 'torches',
        intensity: 0.7,  // brighter than default
      }]
    }
  },
  
  // Layout parameters
  layout: {
    width: 20,
    height: 20,
    roomCount: 5,
    corridorStyle: 'winding',
  }
});
```

---

## Custom Environment Creation

### Creating New Presets

```yaml
custom_environment:
  name: "Archive Vault"
  inherits: dungeon  # base preset
  
  # Custom overrides
  overrides:
    materials:
      primary:
        - type: crystal
          color: "#4a90e2"
          glow: true
          
    lighting:
      sources:
        - type: crystals
          color: blue_glow
          intensity: 0.6
          
    atmosphere:
      particles:
        - floating_dust
        - magic_sparkles
        
    palette:
      primary: "#4a90e2"  # crystal blue
      secondary: "#808080"  # stone gray
      accent: "#ffffff"  # white glow
```

### Inheritance System

```typescript
// Base preset
const baseDungeon = presets.get('dungeon');

// Create custom variant
const archiveVault = createPreset({
  name: 'archive_vault',
  inherits: baseDungeon,
  
  // Only override what's different
  overrides: {
    materials: {
      primary: [{
        type: 'crystal',
        color: '#4a90e2',
        glow: true,
      }]
    }
  }
});
```

---

## The Archive In Between Style

### Unique Characteristics

```yaml
archive_style:
  name: "The Archive In Between"
  
  concept: "Library between worlds"
  
  characteristics:
    - floating_islands
    - impossible_architecture
    - shifting_corridors
    - magical_lighting
    - ancient_knowledge
    
  materials:
    primary:
      - type: ancient_stone
        color: "#c0c0c0"
        texture: smooth_worn
        
    secondary:
      - type: crystal
        color: "#4a90e2"
        usage: lights_power
        
      - type: wood
        color: "#deb887"
        usage: shelves_desks
        
      - type: paper
        color: "#f5f5dc"
        usage: books_scrolls
        
  elements:
    unique:
      - floating_bookshelves
      - portal_archways
      - memory_crystals
      - time_pools
      - knowledge_streams
      
    traditional:
      - desks
      - chairs
      - ladders
      - globes
      
  atmosphere:
    magical: true
    time_distortion: true
    knowledge_energy: true
    
  palette:
    primary: "#c0c0c0"  # ancient stone
    secondary: "#4a90e2"  # crystal blue
    accent: "#deb887"  # warm wood
    magical: "#9370db"  # purple magic
    knowledge: "#ffd700"  # golden knowledge
```

---

## Implementation

### Map Generation Pipeline

```typescript
async function generateMap(spec: EnvironmentSpec): Promise<Map3D> {
  // 1. Load preset
  const preset = loadPreset(spec.preset);
  
  // 2. Generate layout
  const layout = await generateLayout({
    width: spec.width,
    height: spec.height,
    rooms: spec.roomCount,
    corridors: spec.corridorStyle,
  });
  
  // 3. Place elements
  const elements = placeElements({
    layout,
    preset: preset.elements,
    density: spec.density,
  });
  
  // 4. Apply materials
  const materials = applyMaterials({
    layout,
    elements,
    preset: preset.materials,
  });
  
  // 5. Setup lighting
  const lighting = setupLighting({
    layout,
    preset: preset.lighting,
  });
  
  // 6. Add atmosphere
  const atmosphere = addAtmosphere({
    layout,
    preset: preset.atmosphere,
  });
  
  // 7. Build 3D scene
  return buildScene({
    layout,
    elements,
    materials,
    lighting,
    atmosphere,
  });
}
```
