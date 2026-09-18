# COMPETITIVE-ANALYSIS.md

> Análisis competitivo de VTTs populares (2026).
>
> Identifica features faltantes, mejores approaches, y oportunidades
> de diferenciación para Roleito.

---

# 1. Plataformas Analizadas

| Plataforma | Tipo | Precio | Usuarios |
|------------|------|--------|----------|
| **Roll20** | Browser cloud | Free / $5-10/mes | 10M+ |
| **Foundry VTT** | Self-hosted | $50 one-time | 100K+ |
| **Owlbear Rodeo** | Browser minimal | Free | En crecimiento |
| **D&D Beyond Maps** | Browser cloud | Free (beta) | Integrado con DDB |
| **Fantasy Grounds** | Desktop | $149 o subscription | Nicho dedicado |
| **TaleSpire** | Steam 3D | $25/player | Nicho 3D |

---

# 2. Feature Comparison Matrix

## 2.1 Core VTT

| Feature | Roleito | Roll20 | Foundry | Owlbear | D&D Beyond |
|---------|---------|--------|---------|---------|------------|
| Grid map | ✅ | ✅ | ✅ | ✅ | ✅ |
| Token drag | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fog of war | ✅ | ✅ (Pro) | ✅ | ✅ básico | ✅ |
| Dynamic lighting | ✅ | ✅ (Pro) | ✅ mejor | ❌ | ❌ |
| Wall detection auto | ✅ | ❌ | ❌ | ❌ | ❌ |
| Local-first | ✅ | ❌ cloud | ✅ | ❌ cloud | ❌ cloud |
| Player vision LoS | ✅ | ✅ | ✅ | ❌ | ❌ |
| 3D renderer | ✅ (R3F) | ❌ | ❌ (módulos) | ❌ | ❌ |
| Canvas extension (infinite) | ✅ | ❌ | ❌ | ✅ | ❌ |

## 2.2 Combat

| Feature | Roleito | Roll20 | Foundry | Owlbear | D&D Beyond |
|---------|---------|--------|---------|---------|------------|
| Initiative tracker | ❌ | ✅ | ✅ | ❌ ext | ✅ |
| HP tracking | ❌ | ✅ | ✅ | ❌ | ✅ |
| AC display | ❌ | ✅ | ✅ | ❌ | ✅ |
| Condition/status icons | ❌ | ✅ | ✅ | ❌ | ✅ (2026) |
| Token auras | ❌ | ❌ | ✅ módulo | ❌ | ❌ |
| Token bars (HP/AC) | ❌ | ✅ | ✅ | ❌ | ✅ |
| Turn order | ❌ | ✅ | ✅ | ❌ | ✅ |
| Area of Effect templates | ❌ | ✅ | ✅ módulo | ❌ | ✅ |
| Auto damage calc | ❌ | ❌ | ✅ módulo | ❌ | ❌ |

## 2.3 Character/Data

| Feature | Roleito | Roll20 | Foundry | Owlbear | D&D Beyond |
|---------|---------|--------|---------|---------|------------|
| Character sheets | ❌ | ✅ | ✅ | ❌ | ✅ mejor |
| Stat block display | ❌ | ✅ | ✅ | ❌ | ✅ |
| Spell tracking | ❌ | ✅ | ✅ | ❌ | ✅ |
| Inventory | ❌ | ✅ | ✅ | ❌ | ✅ |
| Equipment/armor | ❌ | ✅ | ✅ | ❌ | ✅ |
| NPC sheets | ❌ | ✅ | ✅ | ❌ | ❌ |

## 2.4 Audio/Atmosphere

| Feature | Roleito | Roll20 | Foundry | Owlbear | D&D Beyond |
|---------|---------|--------|---------|---------|------------|
| Ambient audio | ❌ | ❌ | ✅ módulos | ❌ | ❌ |
| Music integration | ❌ | ❌ | ✅ módulos | ❌ | ❌ |
| Spatial audio | ❌ | ❌ | ✅ módulo | ❌ | ❌ |
| Sound effects | ❌ | ❌ | ✅ módulos | ❌ | ❌ |
| Audio crossfade | ❌ | ❌ | ✅ módulo | ❌ | ❌ |

## 2.5 UI/UX

| Feature | Roleito | Roll20 | Foundry | Owlbear | D&D Beyond |
|---------|---------|--------|---------|---------|------------|
| Right-click context menu | ✅ | ❌ | ✅ | ❌ | ✅ |
| Token HUD | parcial | ✅ | ✅ | ❌ | ✅ |
| Measurement ruler | ❌ | ✅ | ✅ | ✅ | ✅ |
| Drawing/annotation tools | ❌ | ✅ | ✅ | ✅ | ❌ |
| Ping/cursor share | ❌ | ✅ | ✅ módulo | ✅ | ✅ |
| Journal/handouts | ❌ | ✅ | ✅ | ❌ | ✅ |
| Macro system | ❌ | ✅ | ✅ | ❌ | ❌ |
| Scene notes | ❌ | ✅ | ✅ | ❌ | ❌ |

## 2.6 Content

| Feature | Roleito | Roll20 | Foundry | Owlbear | D&D Beyond |
|---------|---------|--------|---------|---------|------------|
| Marketplace | ❌ | ✅ mejor | ✅ comunidad | ❌ | ✅ |
| Official D&D content | ❌ | ✅ | ✅ | ❌ | ✅ mejor |
| Import published adventures | ❌ | ✅ | ✅ | ❌ | ✅ |
| Token pack support | ✅ | ✅ | ✅ | ❌ | ✅ |
| Map library | ❌ | ✅ | ✅ | ❌ | ✅ |

---

# 3. Features Críticos Faltantes (Prioritized)

## P0 — Deben existir para una sesión funcional

### 3.1 Initiative Tracker + Combat Tracker
- **Qué**: Panel lateral que muestra orden de turnos, HP, AC, condiciones
- **Foundry lo hace bien**: Turnos automáticos, HP sync con character sheets
- **D&D Beyond**: Agregó esto en 2026 como feature principal
- **Roleito**: ✅ Ya existe `InitiativeTracker.tsx` (178 líneas) — combatant list, HP/PM editing, roll initiative
- **Estado**: Integrado en DmDashboard. Falta: sync con backend, round counter automático, condition tracking

### 3.2 Condition/Status Effects
- **Qué**: Iconos sobre tokens (Envenenado, Ciego, Prone, etc.) con efectos mecánicos
- **Foundry**: 30+ condiciones con iconos overlay en tokens
- **D&D Beyond**: Agregó condition tracking en 2026
- **Roleito**: ❌ No tiene sistema de condiciones
- **Implementación**: `StatusEffects` overlay en token, condition icons, sync con combate
- **Referencia**: Foundry Token HUD conditions, D&D Beyond condition modal

### 3.3 Token HP/AC Bars
- **Qué**: Barras visuales sobre tokens mostrando HP y AC
- **Foundry**: Dos barras configurables (HP, AC, custom)
- **Roll20**: Barras básicas con colores
- **Roleito**: ✅ `VidaDisplay.tsx` (80 líneas) — VidaBar, VidaAttrs, VidaDerived existen. Se usan en CharacterDetail, NPCDetail, CharacterList
- **Estado**: Display en fichas de personaje funciona. Falta: barra visual sobre el token en SceneRenderer

### 3.4 Dice Rolling System
- **Qué**: Tiradas de dados integradas, visibles para todos
- **Roll20**: Fórmulas de dados (1d20+3), macros
- **Foundry**: Engine de dados extensible
- **Owlbear**: Básico pero funcional
- **Roleito**: ✅ `DiceRoller.tsx` (393 líneas) — roller con attrs de personaje (vigor, intelligence, dexterity, cunning), fórmulas, resultado visual
- **Estado**: Integrado en DmDashboard y PlayerView. Falta: chat log compartido, macros

## P1 — Deben existir para paridad con competencia

### 3.5 Area of Effect Templates
- **Qué**: Plantillas de área (cono, esfera, línea, cilindro) para hechizos
- **Foundry**: Drag-and-drop templates que miden automáticamente
- **Roll20**: Templates con medición
- **D&D Beyond**: AOE visual
- **Roleito**: No tiene templates — solo tiene conos de luz
- **Implementación**: Reutilizar sector geometry de luces para templates de hechizos
- **Referencia**: Foundry template layer, Roll20 measurement

### 3.6 Measurement/Ruler Tool
- **Qué**: Línea de medición entre dos puntos
- **Foundry**: Ruler con snap a grid
- **Owlbear**: Herramienta de medición básica
- **Roleito**: No tiene ruler
- **Implementación**: Drag-to-measure overlay en canvas
- **Referencia**: Foundry ruler, Owlbear measurement

### 3.7 Drawing/Annotation Tools
- **Qué**: Dibujar líneas, círculos, texto, notas sobre el mapa
- **Foundry**: Drawing layer completa
- **Roll20**: Herramientas de dibujo
- **Owlbear**: Dibujo + sticky notes
- **Roleito**: No tiene tools de dibujo
- **Implementación**: Drawing layer en SceneRenderer
- **Referencia**: Foundry drawing layer, Owlbear annotations

### 3.8 Journal/Handout System
- **Qué**: Notas del mundo, handouts, documentos compartibles
- **Foundry**: Journal Entries con rich text
- **Roll20**: Handouts
- **D&D Beyond**: Documentos del adventure
- **Roleito**: No tiene journal — la info está en campaign data pero no es presentable
- **Implementación**: Notas markdown renderizadas, compartibles con jugadores
- **Referencia**: Foundry journal entries, Roll20 handouts

### 3.9 Token Auras
- **Qué**: Círculos de aura visual sobre tokens (radiance, darkness, effects)
- **Foundry**: Auras configurables por token
- **Roleito**: Solo tiene lights, no auras de token
- **Implementación**: Extender LightRenderer para auras de condición
- **Referencia**: Foundry token auras, Midi-QOL aura effects

## P2 — Diferenciadores y mejoras

### 3.10 Ambient Audio System
- **Qué**: Música de fondo, efectos de sonido, spatial audio
- **Foundry**: 10+ módulos de audio (Syrinscape, SoundPainter, etc.)
- **Roll20**: Ninguno nativo
- **Roleito**: Audio listado en ROADMAP pero no implementado
- **Implementación**: Audio engine con crossfade, spatial positioning
- **Referencia**: Foundry Narrator's Jukebox, SoundPainter Conductor

### 3.11 Wall Types Avanzados
- **Qué**: Muros con diferentes propiedades (terrain, invisible, ethereal, window/proximity)
- **Foundry**: 6 tipos de muros con propiedades independientes de visión/movimiento/sonido
- **Roleito**: Solo tiene muros básicos + puertas
- **Implementación**: Extender WallMetadata con tipos y propiedades
- **Referencia**: Foundry wall types documentation

### 3.12 Scene Variations (Day/Night)
- **Qué**: Misma escena con diferentes estados (día/noche, estaciones)
- **Foundry**: Módulo Scenery — GM/Player backgrounds separados
- **Roll20**: No soporta
- **Roleito**: lighting modes (bright/dim/dark) pero no scene variations
- **Implementación**: Scene snapshots con metadata de variación
- **Referencia**: Foundry Scenery module

### 3.13 Darkness Sources
- **Qué**: Fuentes que emiten oscuridad (anti-lights) — bloquean visión
- **Foundry**: Darkness source checkbox en light config
- **Roleito**: No tiene darkness sources
- **Implementación**: Negar intensidad en normalizeLightConfig
- **Referencia**: Foundry lighting darkness sources

### 3.14 Light Animation System
- **Qué**: Animaciones de luz (flicker torch, pulse, starlight)
- **Foundry**: Light animation tab con presets
- **Roleito**: flicker/pulse en metadata pero sin renderer
- **Implementación**: Canvas-based animation loop en LightRenderer
- **Referencia**: Foundry light animation system

### 3.15 Scene Notes/Markers
- **Qué**: Marcadores en el mapa con notas (puntos de interés, ubicaciones)
- **Foundry**: Scene Notes con journal links
- **Roll20**: Map pins
- **Roleito**: No tiene scene notes
- **Implementación**: SceneItem tipo 'note' con link a entity/journal
- **Referencia**: Foundry scene notes

---

# 4. Lo Que Roleito Hace Mejor (Diferenciadores)

## 4.1 Wall Detection Automático
- **Ningún otro VTT hace esto**
- Roleito detecta muros/puertas desde imágenes de mapas automáticamente
- Foundry requiere dibujar muros manualmente
- Esto es un **feature único** — promoverlo

## 4.2 3D Renderer Integrado
- Foundry tiene módulos experimentales pero no nativo
- TaleSpire es 3D pero es Steam-only y caro
- Roleito tiene React Three Fiber integrado

## 4.3 AI-Powered Map Analysis
- Parse semántico de mapas → rooms, walls, doors, corridors
- Ningún otro VTT hace interpretación automática del mapa

## 4.4 Local-First + Zero Cost
- Como Owlbear pero con más features
- Sin suscripciones, sin cloud dependency
- Datos locales, portables

## 4.5 Campaign Memory System
- Persistencia narrativa a largo plazo
- World state, canon, relationships — esto va más allá de un simple VTT
- Foundry/Roll20 no tienen esto nativamente

## 4.6 Cone Light + Player Vision Integration
- cone lights que interactúan con fog of war y vision
- No hay otro VTT que integre esto de forma tão fluide

---

# 5. Arquitecturas de Referencia

## 5.1 Foundry VTT — Wall System
```text
Wall Types:
  - Standard: Block vision + movement + light + sound
  - Terrain: Block movement, partial vision
  - Invisible: Block movement only
  - Ethereal: Block vision + light, not movement/sound
  - Door: Interactive open/close
  - Window (Proximity): Vision based on distance

Per-wall settings:
  - Sense: None / Normal / Limited / Proximity
  - Movement: None / Normal / Limited
  - Light: None / Normal / Limited
  - Sound: None / Normal / Limited

Direction: Both / One-way
```

**Lección**: Los muros no son binarios (bloquea/no bloquea). Necesitamos tipos con propiedades independientes.

## 5.2 Foundry VTT — Lighting System
```text
Light Config:
  - Bright radius (grid units)
  - Dim radius (grid units)
  - Emission angle (0-360°)
  - Luminosity (0-1)
  - Color (hex)
  - Animation type (torch, pulse, starlight, etc.)
  - Constrained by walls (boolean)
  - Provides vision (boolean)
  - Is darkness source (boolean)
  - Gradual illumination (boolean)
```

**Lección**: Separar bright/dim radius. Agregar darkness sources. Los presets actuales de Roleito son un buen start pero necesitan más granularidad.

## 5.3 Foundry VTT — Token HUD
```text
Token HUD (right-click):
  ├── Visibility (eye icon)
  ├── Elevation (number field)
  ├── HP bar (editable)
  ├── AC display
  ├── Conditions (icon grid)
  │   ├── Blinded, Charmed, Frightened
  │   ├── Grappled, Incapacitated, Invisible
  │   ├── Paralyzed, Petrified, Poisoned
  │   ├── Prone, Restrained, Stunned
  │   ├── Unconscious, Exhaustion
  │   └── Custom conditions
  ├── Effects overlay (big icon on token)
  └── Defeated (skull icon)
```

**Lección**: El token HUD debería ser el hub de interacción, no solo un context menu.

## 5.4 D&D Beyond — Combat Tracker
```text
Combat Encounter:
  ├── Add all tokens to encounter
  ├── Roll initiative (d20 + modifier)
  ├── Sort by initiative
  ├── Track rounds
  ├── Show turn order
  ├── HP sync with character sheets
  ├── Condition sync
  └── Encounter difficulty rating
```

**Lección**: El tracker debería integrarse con las fichas de personaje existentes.

## 5.5 Owlbear Rodeo — Extension System
```text
Extensions:
  - Plug-and-play modules
  - Toggle on/off per session
  - Community-built
  - No account required for players
  - Touch-friendly
```

**Lección**: La simplicidad es un feature. No todo necesita ser complejo.

---

# 6. Prioridades de Implementación

## Sprint 1 (MVP Funcional) — 2-3 semanas
1. **Token HP/AC bars** — barras visuales sobre tokens
2. **Initiative tracker** — panel de combate básico
3. **Dice rolling** — fórmulas (1d20+3) + chat
4. **Condition icons** — 10 condiciones básicas sobre tokens

## Sprint 2 (Paridad) — 2-3 semanas
5. **Measurement ruler** — medir distancias
6. **Drawing tools** — anotaciones básicas
7. **Journal/handouts** — notas del mundo
8. **Token auras** — radiance, darkness aura

## Sprint 3 (Diferenciación) — 3-4 semanas
9. **Ambient audio** — music + effects engine
10. **Wall types avanzados** — terrain, proximity
11. **Scene variations** — day/night
12. **Spell templates** — AOE visual

## Sprint 4 (Polish) — ongoing
13. **Light animation** — flicker, pulse
14. **Darkness sources** — anti-lights
15. **Scene notes** — map markers
16. **Macro system** — player shortcuts

---

# 7. Decisiones Arquitectónicas vs Competencia

## 7.1 Roll20 vs Roleito
| Aspecto | Roll20 | Roleito | Decisión |
|---------|--------|---------|----------|
| Hosting | Cloud obligatorio | Local-first | **Roleito gana** — sin dependencia de servers |
| Content | Marketplace grande | N/A | **Necesitamos** import system para maps/tokens |
| Voice | Built-in | External | **OK** — Discord ya es estándar |
| API | Macros/Scripts | Agents | **Roleito gana** — AI-powered > manual macros |

## 7.2 Foundry vs Roleito
| Aspecto | Foundry | Roleito | Decisión |
|---------|---------|---------|----------|
| Modules | 2000+ community | Built-in | **Foundry gana en quantity** pero Roleito en quality/integration |
| Setup | 1-2 hours | Minutes | **Roleito gana** — zero setup |
| Lighting | Best-in-class | Good | **Roleito alcanzable** — mejorar darkness + animation |
| Walls | Manual drawing | Auto-detection | **Roleito gana** — unique feature |
| 3D | Experimental modules | Native R3F | **Roleito gana** — integrated 3D |

## 7.3 Owlbear vs Roleito
| Aspecto | Owlbear | Roleito | Decisión |
|---------|---------|---------|----------|
| Speed | 30 seconds | Minutes | **Comparable** — ambos rápidos |
| Features | Minimal | Moderate | **Roleito gana** — más features sin sacrificar simplicidad |
| Mobile | Best | Limited | **Roleito necesita** — responsive/mobile support |
| Extensions | Plugin system | N/A | **Roleito necesita** — considerar plugin architecture |

---

# 8. Resumen Ejecutivo

## Lo que tenemos que es fuerte
- ✅ Dynamic lighting + cone lights (mejor que Roll20, comparable con Foundry)
- ✅ Auto wall detection (único en el mercado)
- ✅ 3D renderer (único integrado nativamente)
- ✅ Local-first + zero cost
- ✅ Player vision LoS con fog of war
- ✅ Campaign memory + narrative system
- ✅ Initiative tracker (ya implementado, falta polish)
- ✅ Dice roller (ya implementado con attrs de personaje)
- ✅ HP/PM display en fichas (VidaDisplay)

## Lo que nos falta para MVP funcional
- ❌ Condition/status icons sobre tokens
- ❌ Token HP bars visuales en SceneRenderer
- ❌ Round counter en combat tracker
- ❌ Sync de HP entre character sheets y combat tracker

## Lo que nos falta para paridad
- ❌ Measurement ruler
- ❌ Drawing/annotation tools
- ❌ Journal/handouts
- ❌ Token auras
- ❌ Spell AOE templates

## Lo que nos falta para diferenciación
- ❌ Ambient audio
- ❌ Wall types avanzados
- ❌ Scene variations
- ❌ Macro system

## Nuestra ventaja competitiva
1. **Auto wall detection** — nadie más lo tiene
2. **3D renderer nativo** —integrado, no módulo
3. **AI-powered** — agents para narrativa, no solo macros
4. **Local-first** — sin cloud, sin suscripciones
5. **Campaign memory** — persistencia narrativa, no solo mapas
