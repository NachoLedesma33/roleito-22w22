# AI-3D-ENVIRONMENTS.md

> Integracion de IA para entornos 3D virtuales.
>
> Enfoque pratico para Roleito: tablero virtual inmersivo.
>
> **ESTADO: DRAFT**

---

# 1. Objetivo

Crear entornos 3D donde jugadores muevan personajes.

---

# 2. Modelos Open-Source (2026)

| Modelo | Licencia | VRAM | Velocidad | Mejor para |
|--------|----------|------|-----------|------------|
| TripoSR | MIT | 8GB+ | ~1s | Drafts rapidos |
| TRELLIS.2 | MIT | 24GB+ | ~3s | Produccion |
| Hunyuan3D | Community | 16GB+ | ~5s | Texturas |
| InstantMesh | Open | 8GB+ | ~2s | Eficiente |
| Shap-E | MIT | 8GB+ | ~3s | Simple |

---

# 3. Estrategia Recomendada

## Fase 1 - MVP

```text
Entornos 2D con elementos 3D simples
  React Three Fiber + fondos 3D
  Tokens 2D en espacio 3D (billboards)
  IA para generar fondos
```

## Fase 2 - Post-MVP

```text
Modelos 3D ligeros
  TripoSR para assets individuales
  Generacion bajo demanda
  Cache de entornos
```

## Fase 3 - Futuro

```text
Generacion completa
  TRELLIS.2 / Hunyuan3D
  Escenas navigables
  IA para composicion
```

---

# 4. Arquitectura

```text
ENTRADA
  Imagenes 2D + Texto + Modelos 3D
      ↓
PROCESAMIENTO
  Parser de mapas + Generador 3D + Compositor
      ↓
RENDERIZADO
  Three.js + React Three Fiber + Drei
      ↓
INTERACCION
  Movimiento + Seleccion + Controles DM
```

---

# 5. MVP - Entorno 2D con Profundidad

## Concepto

```text
Fondo 3D con imagen de mapa como textura
Tokens 2D (sprites) en el espacio
```

## Ejemplo Visual

```text
┌──────────────────────────────────────┐
│  [FONDO: imagen de mapa]             │
│                                      │
│  [token]           [token]           │
│                                      │
│  ─────────────────────────────────── │  ← piso 3D
└──────────────────────────────────────┘
```

## Codigo Base

```typescript
function Scene({ mapImage, characters }) {
  return (
    <Canvas>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial map={mapImage} />
      </mesh>

      {characters.map(char => (
        <CharacterToken
          key={char.id}
          position={char.position}
          portrait={char.portrait}
        />
      ))}

      <OrbitControls />
    </Canvas>
  );
}

function CharacterToken({ position, portrait }) {
  const ref = useRef();
  useFrame(() => {
    ref.current.lookAt(camera.position);
  });
  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial map={portrait} />
    </sprite>
  );
}
```

---

# 6. Sistema de Grid

```typescript
interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  occupied: boolean;
  characterId?: string;
}

function moveCharacter(charId: string, toX: number, toY: number) {
  const cell = grid[toX][toY];
  if (cell.walkable && !cell.occupied) {
    updateCharacterPosition(charId, toX, toY);
  }
}
```

---

# 7. IA - Fase 2

## TripoSR para Assets

```text
DM suba imagen → TripoSR genera modelo 3D → Se carga en Three.js
```

## Cache

```typescript
const modelCache = new Map<string, GLBModel>();

async function getModel(imageHash: string, gen: ModelGenerator) {
  if (modelCache.has(imageHash)) {
    return modelCache.get(imageHash);
  }
  const model = await gen.generateFromImage(imageHash);
  modelCache.set(imageHash, model);
  return model;
}
```

---

# 8. IA - Fase 3

## Image-to-Scene

```text
DM suba imagen + texto
  IA genera: geometria + texturas + iluminacion
  Se carga en renderer
  Se colocan tokens
```

---

# 9. Requisitos de Hardware

| Nivel | GPU | RAM | Para que |
|-------|-----|-----|----------|
| Basico | 8GB VRAM | 16GB | TripoSR, MVP |
| Medio | 16GB VRAM | 32GB | Hunyuan3D |
| Alto | 24GB+ VRAM | 32GB+ | TRELLIS.2 |

---

# 10. Limitaciones

```text
- Generacion de escenas completas = experimental
- Mejor para objetos individuales
- Escenas complejas requieren combinacion
- Tiempo: segundos a minutos
- Hardware: GPU necesaria
```

---

# 11. Recomendacion Final

```text
MVP:
  1. Entornos 2D con Three.js
  2. Tokens 2D en espacio 3D
  3. IA solo para fondos (Stable Diffusion)

Post-MVP:
  1. TripoSR para assets individuales
  2. Cache de modelos generados
  3. Mejora gradual

Futuro:
  1. TRELLIS.2 para escenas completas
  2. Generacion bajo demanda
  3. Hardware mas accesible
```
