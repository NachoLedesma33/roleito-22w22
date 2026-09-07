# Hybrid Shadow Geometry — Walls, Vision & Fog

> Arquitectura del **Sistema Híbrido de Muros, Visión y Niebla de Guerra**.
>
> La app usa una **única capa de geometría** (polígonos cerrados, "Shadow Zones")
> como fuente de verdad para colisión, iluminación y niebla de guerra.
> La geometría puede tener **dos orígenes**: dibujada a mano por el GM (**Modo
> Manual**, base del sistema) o generada por IA (**Modo Auto**, mejora futura).
> Ambos orígenes se normalizan a la **misma estructura de datos**.

---

## 1. Contexto y Enfoque

Roleito cuenta con un motor de IA capaz de detectar automáticamente muros en
mapas importados (`backend/wall_detection/`, botón "AI" del Build menu).
Para maximizar la flexibilidad, cubrir casos límite (mapas abstractos, bocetos
rápidos, falsos positivos de la IA) y permitir crear mapas desde cero en
segundos, se introduce un **Modo Manual basado en Geometría** como pilar del
sistema.

El objetivo: que el motor de renderizado, físicas y luz consuman **una única
estructura de datos** (polígonos de colisión/sombra) sin importar si fueron
generados por la IA o dibujados a mano por el GM.

De este modo la IA de detección automática de paredes **no se descarta**: queda
documentada e implementada como origen alternativo, y su salida se integra
normalizándola a la geometría manual.

---

## 2. Flujo de Trabajo Dual (Opciones para el GM)

El sistema ofrece tres formas de abordar la creación del mapa:

| Modo | Descripción | Estado |
|------|-------------|--------|
| **Modo Manual** | El GM dibuja polígonos cerrados sobre el mapa. Definen simultáneamente zonas transitables, límites de colisión y áreas de sombra. | Base del sistema |
| **Modo Auto (IA)** | Escanea el mapa y genera automáticamente la geometría de paredes y obstáculos. | Mejora futura (ya implementado, se integra normalizando a ShadowZones) |
| **Modo Híbrido (Edición)** | La IA hace una primera pasada y el GM usa las herramientas del Modo Manual para unir, borrar o afinar los polígonos generados. | Requiere integración de normalización |

Flujo recomendado hoy (falta de fricción, zero-API, offline):

```text
DM UPLOADS/BACKGROUND MAP
        │
        ▼
DM DIBUJA ZONAS (rectángulos, polígonos) sobre el mapa
        │
        ├──► RELLENO SIMBÓLICO (fill color / hatched overlay) visible para el GM
        ├──► SHADOW ZONES  → geometría de colisión, luz y sombra
        └──► PUERTAS entre zonas adyacentes (opcional)
        │
        ▼
SESSION / PLAYER VIEW trabaja sobre la geometría resultante
```

---

## 3. Lógica del Modo Manual: Muros Implícitos y Zonas

Cuando el GM opta por las herramientas manuales (o edita el resultado de la
IA), el comportamiento es:

- **Geometría como barrera.** El GM dibuja figuras cerradas (cuadrados,
  rectángulos, polígonos libres) para delimitar habitaciones, pasillos y áreas.
  Los **bordes** (*edges*) de estas figuras actúan automáticamente como
  barreras infranqueables (colliders).
- **Restricción de movimiento.** Un token insertado dentro de un polígono no
  puede salir de sus límites geográficos a menos que exista una conexión lógica
  válida (una puerta, ver §7).
- **Interior transitable.** El interior del polígono es una zona caminable
  (walkable) por definición. No hay que calcular ni detectar "qué se puede
  pisar": el GM lo declaró al dibujar.
- **El mapa importado es decoración + guía visual.** Sobre él se apoyan las
  zonas; el mapa en sí no genera geometría.

Esto invierte el pipeline clásico (detectar → interpretar): aquí el GM
**declara** la geometría y el sistema la consume directamente. Mucho más
simple, determinista y barato.

---

## 4. Estructura de Datos Normalizada: ShadowZones

El store de la aplicación maneja **una única colección de `ShadowZone`s** por
escena, independientemente del origen (manual o IA).

```typescript
interface ShadowZone {
  id: string;
  sceneId: string;

  // Geometría del polígono cerrado (coordenadas 0-1 normalizadas al mapa)
  polygon: Point[];              // >= 3 puntos, cerrado implícitamente
  fillColor: string;             // visual GM (overlay simbólico)
  fillOpacity: number;           // 0-1

  // Origen de la geometría
  origin: 'manual' | 'ai' | 'hybrid';

  // Ediciones del GM sobre una zona de IA (manual manda sobre IA)
  touchedByDm: boolean;          // true = la edición manual manda sobre IA

  // Conexiones lógicas hacia otras zonas
  portals: Portal[];             // puertas, ver §7

  // Ajustes de visibilidad/sombra
  shadowOnly?: boolean;          // true = zona fantasma, solo afecta luz/sombra

  createdAt: string;
  updatedAt: string;
}

interface Portal {
  id: string;
  // segmento (edge) sobre el borde del polígono que conecta dos zonas
  zoneA: string;                 // ShadowZone.id
  zoneB: string;                 // ShadowZone.id
  localEdge: [Point, Point];     // coincidente con el borde de zoneA
  state: 'closed' | 'open' | 'locked';
  activatedBy?: string;          // playerId / characterId que la abrió
  revealsZone?: boolean;         // true: al abrirse, revela zonaB en la niebla
}

interface Point {
  x: number;  // 0-1 (normalizado)
  y: number;  // 0-1 (normalizado)
}
```

### Derivados (no se almacenan de forma independiente)

Toda geometría consumible se **deriva** de `ShadowZone.polygon`:

| Consumidor | Derivado | Regla |
|------------|----------|-------|
| Collider (físicas) | `CollisionSegment[]` | Cada edge del polígono → segmento bloqueante (`COLLISION-SYSTEM.md`) |
| Línea de visión | `LoSMask[]` | Edges bloquen raycasting (`WALLS-AND-LINE-OF-SIGHT.md`) |
| Niebla de guerra | `FogRegion[]` | Interior del polígono → región cut/uncut (`FOG-AND-VISIBILITY.md`) |
| Renderer | `Item` Scene Graph | Zona → shape `polygon`/`rectangle`, capa `SceneLayer.MAP` o `OVERLAY` |
| Walkable space | `WalkableArea[]` | Interior del polígono = caminable (`WALKABLE-SPACE.md`) |

Derivar en query-time evita doble fuente de verdad: los polígonos **son** la
geometría.

### Normalización del output de IA (requisito de integración)

1. El output del motor de IA se convierte a la misma estructura `ShadowZone`
   (`DetectedMap` → `ShadowZone[]`, coords normalizadas 0-1).
2. Las paredes detectadas se agrupan en cadenas cerradas → se proponen como
   `polygon` (habitaciones detectadas → zonas directas).
3. Las puertas detectadas → `Portal` candidates entre zonas adyacentes.
4. Las zonas de IA entran con `origin: 'ai'`, `touchedByDm: false`.
5. El GM las revisa/edita con las mismas herramientas manuales (Modo Híbrido);
   al tocarlas pasan a `touchedByDm: true` y dejan de re-analizarse.

---

## 5. Comportamiento de la Niebla de Guerra (asimétrica)

Independientemente del origen de la geometría (IA o Manual), la visibilidad es
asimétrica por rol:

| Vista | Áreas inexploradas / cubiertas por geometría | Objetivo |
|-------|----------------------------------------------|----------|
| **GM** | Filtro **grisáceo semitransparente** | Ver mapa completo + tokens ocultos (SOMBRA indicativa) |
| **Jugadores** | **Negro absoluto** | No revelar nada fuera de lo explorado/visible |

Concepto:

```text
GM        : MAPA + SOMBRA SEMITRANSPARENTE (ve todo, nota dónde no se ve)
PLAYER    : NEGRO ABSOLUTO (solo ve lo revelado por luz/LoS)
```

Reglas:

- La niebla de jugador se recorta contra: regiones exploradas estáticamente
  (fog cut) **+** cobertura de luz actual (ver §6).
- El GM siempre puede sobre-escribir por pincel (`reveal/hide`) como en
  `FOG-AND-VISIBILITY.md`.
- Las ShadowZones aportan los bordes que bloquean la propagación de luz y los
  contornos de "habitaciones" que hacen práctico el flood-fill de revelado.

---

## 6. Iluminación Dinámica de Tokens

Las zonas negras se revelan usando fuentes de luz asignadas a los tokens.

- **Emisión.** El token es el origen del *raycasting* que revela la niebla de
  guerra. Su luz recorta la niebla del jugador en tiempo real.
- **Oclusión.** Los rays se cortan en los bordes de las ShadowZones y puertas
  cerradas (misma geometría que colisión).

Tipos de luz:

| Tipo | Comportamiento |
|------|----------------|
| **Hard Edge** | Corte perfecto en el radio máximo de visión. |
| **Difuminada** | Caída suave (gradient) hacia la oscuridad en los bordes. |
| **Direccional** | Ángulo restringido (ej. cono de 90° simulando linterna). |

```typescript
interface TokenLight {
  tokenId: string;
  mode: 'hard' | 'soft' | 'directional';
  radius: number;             // radio máximo de revelado (unidades de mapa)
  angle?: number;             // para mode = 'directional' (grados)
  direction?: number;         // para mode = 'directional'
  falloff?: number;           // suavizado para mode = 'soft' (0-1)
  color: string;
  intensity: number;          // 0-1
}
```

La luz es **determinista y local** (raycasting sobre bordes de ShadowZones).
No requiere IA ni presets de iluminación global.

---

## 7. Conexión de Zonas: Sistema de Puertas

Para conectar zonas cerradas (habitación ↔ pasillo) se usa un sistema de
**puertas/portales** entre bordes de polígonos adyacentes.

- **Marcadores.** El GM traza una conexión entre los bordes de dos zonas
  adyacentes (`Portal` con `localEdge` sobre el borde compartido).
- **Dinámica de apertura:**
  - *Cerrada:* actúa como muro impenetrable para movimiento y luz.
  - *Abierta:* se desactiva el collider en ese segmento (`Por tal activo`).
- **Revelado progresivo.** Al abrir una puerta, la luz del token cercano
  traspasa el umbral y revela gradualmente el polígono adyacente según su
  ángulo y radio, **sin recalcular muros enteros** (solo se activa el segmento
  del `localEdge` en la geometría derivada).

Estados: `closed → open → locked → destroyed` (mapeado a `DoorMetadata`/fases
N del roadmap cuando aplique pathfinding).

---

## 8. Requerimientos Técnicos para la Integración

Para que ambos orígenes (IA y Manual) convivan:

1. **Normalización única.** El output del motor de IA se normaliza a la misma
   estructura de datos que produce la herramienta de dibujo manual
   (`ShadowZone.polygon`, coords 0-1).
2. **Store único.** El store de la app (Zustand) maneja una única colección de
   `ShadowZone` por escena, sin importar el origen (`origin` field).
3. **Derivación en query-time.** Collider, LoS, fog y walkable se derivan de
   los polígonos; no existen geometrías paralelas.
4. **Edición manual siempre disponible.** Las herramientas de dibujo operan
   igual sobre zonas vacías, zonas de IA o zonas ya tocadas por el GM.
5. **Respeto de la autoridad del GM.** Las reglas de canon aplican igual:
   la IA propone (`origin: 'ai'`), el GM aprueba/descarta/edita.
6. **Costo local.** El flujo manual es 100% offline y free; la IA queda como
   opción (offline/coste) para mapas texturizados.

---

## 9. Relación con el Trabajo de IA Existente

El trabajo de IA **no se descarta**: `docs/WALL-DETECTION-PLAN.md` y el módulo
`backend/wall_detection/` (include `ai_detector.py`, pipeline dual
BLUEPRINT/TEXTURED, refine) siguen siendo válidos como **mejora futura** de
productividad:

- Caso de uso: texturized maps y blueprints grandes donde el GM prefiera una
  primera pasada automática.
- Su integración estará completa cuando el output se normalice a
  `ShadowZone[]` (tarea de normalización pendiente).
- La colisión, luz y niebla **no dependen** de la IA: consumen solo geometría.

Prioridad invertida respecto al plan original:

```text
ANTES:   IA detecta (95%)  →  GM corrige (5%)
AHORA:   GM dibuja manual (base, 100% funcional)
         IA detecta (opcional, futura)  →  GM pule
```

---

## 10. Estado Actual e Implementación

- El paradigma manual (dibujar zonas→sombras→puertas→luz de token) es el que
  usa la app de VTT de referencia en la que se está jugando hoy: es la
  dirección a la que apunta el proyecto.
- Implementado hoy: dibujo de walls/doors, colisión de tokens, fog planificado
  (fases D/E/F del roadmap), AI wall detection funcional como complemento.
- Pendiente de alinear con este doc: fases D (fog), E (lighting), F (LoS) del
  roadmap para consumir ShadowZones; convertir `DetectedMap` → `ShadowZone[]`.

## 11. Cross-References

> See also: `ROADMAP.md` §106 (practical roadmap, manual-first).
> See also: `WALLS-AND-LINE-OF-SIGHT.md` (walls, LoS raycasting, materiales).
> See also: `FOG-AND-VISIBILITY.md` (fog rendering pipeline, DM fog tools).
> See also: `COLLISION-SYSTEM.md` (point-vs-segment consumption of edges).
> See also: `MAP-ANALYSIS.md` (pipeline IA, mejora futura).
> See also: `WALL-DETECTION-PLAN.md` (plan de IA, mejora futura).
> See also: `SCENE-GRAPH.md` (Item/shape/layers donde se renderizan zonas).