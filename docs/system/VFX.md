# VFX de habilidades — partículas procedurales

> Estado: evolución visual de partículas implementada. Contrato funcional y flujo DM→WS→jugador **sin cambios**.
> Alcance: solo representación visual de los 5 VFX existentes. Bibliotecas externas y catálogo ampliado: ver plan maestro, fuera de este alcance.

## Contrato `VfxEffect`

Definido en `apps/dm/src/components/VfxBurst.tsx`. Es la fuente única de tipos TS del burst.

| Campo | Tipo | Valor / rango | Nota |
|---|---|---|---|
| `id` | `number` | `Date.now()` | Seed del burst; da identidad propia a cada disparo. |
| `type` | `'fire' \| 'ice' \| 'lightning' \| 'heal' \| 'void'` | 5 variantes | No se agregan tipos nuevos en este alcance. |
| `from` | `[number, number, number]` | `[x, 0.6, z]` | `y=0.6` fijado por `backend/routes.py`. |
| `to` | `[number, number, number]` | `[x, 0.6, z]` | Ídem. |
| `duration` | `number` | `1500` ms | Fijado en `DmDashboard.tsx` / `PlayerView.tsx`. |
| `startedAt` | `number \| undefined` | `performance.now()` | El renderer lo **ignora**: usa su primer frame para absorber latencia del WS. |

## Flujo (congelado, solo lectura)

```
DM: menú "Habilidades VFX" (data-anchor="vfx", testid vfx-menu)
  → handleTokenClick(atacante, objetivo)   [DmDashboard.tsx]
  → setVfx local + api.campaigns.placeVfx()
  → POST /api/campaigns/{id}/vfx  { type, from_x, from_z, to_x, to_z }
  → backend/routes.py  → WS { type:'vfx', vfx_type, from:[x,0.6,z], to:[x,0.6,z] }
  → usePlayerSync.ts  → onVfx  → setVfx  [PlayerView.tsx]
  → SceneRenderer.tsx  → <VfxBurst effect={e} />
  → cleanup local a los 2000 ms
```

Archivos funcionales del flujo, **no tocar** en este alcance:
`backend/routes.py`, `backend/models.py` (`can_use_vfx`), `backend/database.py`, `backend/schemas.py`,
`apps/dm/src/lib/usePlayerSync.ts`, `apps/dm/src/pages/DmDashboard.tsx`,
`apps/dm/src/pages/PlayerView.tsx`, `apps/dm/src/lib/api.ts`.

Guardrail: `tests/e2e/vfx.spec.ts` intercepta el POST y fija `type` y `from/to`. Corre antes y después de cualquier cambio visual.

## Capas y fases

`apps/dm/src/lib/vfxParticles.ts` es matemática pura: sin `three`, sin DOM, sin `Math.random`.
`sampleVfx(layer, input)` devuelve partículas deterministas por `seed ^ hash(type)`.

| Capa | Partículas | Rango `t` activo | Rol |
|---|---|---|---|
| `core` | 20 | `0 → 0.78` (fade desde `0.55`) | Núcleo blanco del color de la familia. |
| `trail` | 48 | `0 → 0.78` (fade desde `0.55`) | Estela desde `from` hasta `to`. |
| `motes` | 64 | `0 → 0.78` (fade desde `0.55`) | Chispas / fragmentos con ruido lateral. |
| `impact` | 32 | `0.55 → 0.78` | Destello / implosión en el objetivo. |
| `aftermath` | 28 | `0.78 → 1` | Residuo con fade lineal hasta `alpha=0`. |

Total: **192 partículas por burst** (tope de coste: 220). Un `<points>` por capa, un `BufferAttribute` de posición y color por capa, reutilizados vía `useMemo`.

Recetas por familia (tabla de datos, sin clases):

| Familia | Núcleo | Movimiento distintivo |
|---|---|---|
| `fire` | blanco-ámbar | brasas que suben (`+y`), motes naranja→rojo, ruido lateral. |
| `ice` | cian | fragmentos angulares, polvo que desciende. |
| `lightning` | amarillo | saltos laterales bruscos (arco ramificado), destello corto. |
| `heal` | verde | motes ascendentes, aftermath suave, sin humo. |
| `void` | violeta | motes absorbidos hacia el centro (offset decreciente), implosión. |

## Límites y decisiones

- **1 textura por familia**, compartida entre todos los bursts y todas las capas vía `memoByKey('vfx-texture-' + type, ...)` en `VfxBurst.tsx`. Es un radial gradient blanco en `CanvasTexture`; el tinte por partícula lo da `vertexColors`. La caché es module-level: no se hace `dispose()` por burst.
- **Sin `PointLight` por partícula.** Iluminación: `AdditiveBlending`, `depthWrite=false`, `sizeAttenuation`.
- **Sin dependencias nuevas** (`three.quarks`, `postprocessing`, GPU particles quedan para el plan maestro).
- **Sin `AbilityVFXConfig`, catálogo de habilidades ni nuevos `type`.** Esto es una evolución de las partículas existentes, no un sistema nuevo.
- El timing interno (`startedRef` + `clock.elapsedTime`) se conserva: `performance.now()` y el reloj de R3F no comparten origen y este esquema absorbe la latencia del WS.
