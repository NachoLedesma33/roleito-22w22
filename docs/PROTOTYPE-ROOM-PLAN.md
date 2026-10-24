# Prototipo: Cuarto Virtual con Cámara Limitada

**Objetivo:** Que el tablero 3D se perciba como si estuviera sobre una mesa dentro de un cuarto (como una partida de mesa física), con la cámara iniciada dentro del cuarto mirando al centro y límites para que no "escape" y rompa la ilusión.

---

## Alcance del prototipo (MVP)

| Elemento | Descripción |
|---|---|
| **Room mesh** | Una caja simple (o malla básica) que representa paredes, piso y techo. Texturas placeholder (madera, piedra, telas). |
| **Posición inicial de cámara** | La cámara empieza en un punto "altura de ojos" dentro del cuarto, mirando al centro del tablero (coordenadas x=0, z=0 en el plano del tablero). |
| **Límites de cámara/items** | Cuando el usuario arraste el tablero o mueva la cámara, esta no debe pasar del radio de la habitación. Efecto "pared invisible" al borde. |
| **Skins (texturas)** | 2-3 texturas de habitación intercambiables (ej. "Madera", "Piedra", "Taberna"). Solo cambia el mesh, no la lógica. |
| **Carga de modelo 3D (future)** | Lugar reservado para futuros modelos glTF, pero el prototipo usará una malla generada o importada simple con tamaño fijo. |
| **Sin cambios en lógica de juego** | Visión, fog, LoS, movimiento de tokens, todo lo existente continúa igual. El room mesh es un wrapper visual detrás de todo. |

---

## Pasos técnicos

### 1. Crear componente `RoomBackground` (o modificar `SceneRenderer`)

- Ubicación: `apps/dm/src/components/RoomBackground.tsx` (nuevo) o dentro de `SceneRenderer.tsx`.
- El mesh será un ` THREE.BoxGeometry` (o glTF simple) con tamaño mayor que el tablero (ej. 100×100 unidades) y posición z negativa para quedar detrás de los items.
- Material: `MeshStandardMaterial` con mapa de textura (placeholder). `side: THREE.DoubleSide` para que se vea desde adentro.
- El mesh NO debe recibir luces del tablero (o usar `lightMap` mixto). Se puede añadir luz ambiental suave dentro del room para que no quede totalmente negro.

### 2. Ajustar posición inicial de la cámara

- En `PlayerView.tsx` (o `DmDashboard.tsx`), en el `useEffect` de init de la cámara, setear posición inicial tipo:
  ```ts
  // Ejemplo: cámara a 6 unidades frente al centro, mirando al tablero
  camera.position.set(0, 2, 6); // eye height 2, distance 6
  camera.lookAt(0, 0, 0);
  ```
- El `CameraFollow`/polling ya existente continuará, pero el punto de partida estará "dentro" del cuarto.

### 3. Implementar límites de cámara (opción simple)

- Usar un `radius` definido por la mitad del tamaño del room mesh (ej. `roomRadius = 50`).
- En cada frame (`useFrame`) o al terminar un movimiento de arrastre, verificar la distancia de la cámara al centro:
  ```ts
  const dist = camera.position.distanceTo(new THREE.Vector3(0,0,0));
  if (dist > roomRadius) {
    // Snap de vuelta al radio o suavizado
    camera.position.normalize().multiplyScalar(roomRadius);
  }
  ```
- Alternativa: usar la herramienta de colisión de Three.js (`THREE.Sphere` como oclusor) pero la primera opción es más ligera.

### 4. Selector de skins (minimalista)

- Agregar un panel en el HUD o un menú lateral con botones:
  - `Madera` (textura madera.jpg)
  - `Piedra` (textura piedra.jpg)
  - `Taberna` (textura lámparas.jpg)
- El componente `RoomBackground` recibe un prop `skin: 'wood' | 'stone' | 'tavern'` y cambia el `map` del material.
- Guardar la elección en `localStorage` o estado de la campaña para persistencia.

### 5. Integración con escena existente (lo que NO toca)

- El tablero, tokens, walls, fog, LoS, todo sigue exactamente igual.
- El `RoomBackground` se renderiza en una capa detrás de todo (`SceneLayer.BACKGROUND` o simplemente agregar al final del render loop con `z: -1`).
- No tocar `core/scene/light.ts`, `playerVision.ts`, etc.

### 6. Cargar modelo 3D de cuarto (future step, reservado)

- En el mismo componente, después de tener el mesh simple, añadir un `loader` glTF (`GLTFLoader`) que cargue `room.glb` desde `data/assets/campaign-id/room.glb`.
- Escalar el modelo cargado a tamaño fijo (`scale.set(0.5, 0.5, 0.5)`) para que quepa el tablero.
- Mantener el mismo sistema de límites y skins sobre este modelo.
- Por ahora, el prototipo usará una malla generada procedural o un `OBJ` simple importado con `THREE.OBJLoader`.

---

## Estructura de archivo propuesta

```
docs/
└── PROTOTYPE-ROOM-PLAN.md          # Este plan

apps/dm/src/
├── components/
│   ├── RoomBackground.tsx          # Nuevo componente (o modificado en SceneRenderer)
│   └── HudPanel.tsx                # Podría añadir selector de skins
└── pages/
    ├── PlayerView.tsx              # Ajustar camera init
    └── DmDashboard.tsx             # Opcional: picker de skins
```

---

## Verificación manual (checklist)

- [ ] Al iniciar una nueva partida/sesión, la cámara está posicionada "dentro" del cuarto, mirando al centro del tablero.
- [ ] Al arrastrar el tablero con el ratón (o usar WASD), la cámara no sale de los límites del cuarto (efecto pared al acercarse al borde).
- [ ] Cambiar de skin (botón en HUD) cambia la textura/pared del cuarto sin romper la visualización de tokens/fog.
- [ ] El test `light.spec.ts` y `player-view.spec.ts` siguen pasando (no se introdujo regresión).
- [ ] El rendimiento no baja Notablemente (el mesh es simple, < 500 triángulos).

---

## Futuro (fuera de este prototipo)

- Cargar modelos glTF reales de cuartos (con muebles, luz natural, etc.).
- Efectos de reverb/ambient sound por skin.
- Opción "modo compacto" donde el cuarto sea un anillo Marco alrededor del tablero en pantallas pequeñas.
- Integración con el sistema de assets ya existente (`data/assets/`) para que el DM suba su propio modelo de habitación.

---
*Plan vivo: se irá actualizando a medida que se avance en el prototype. El objetivo es tener algo funcional en el próximo sprint y luego decidir si seguimos refinándolo o pasamos a otra característica.*