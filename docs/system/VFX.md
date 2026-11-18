# VFX de habilidades — renderer procedural por habilidad

> Estado: evolución visual de las 13 habilidades implementada en `VfxBurst.tsx`. Contrato funcional y flujo DM→WS→jugador **sin cambios**.
> Alcance anterior (5 VFX, textura radial por familia, sin luces ni librerías externas): **RESUELTO / SUPERADO**. Se conserva aquí como registro histórico; ya no describe el renderer actual.

## Contrato `VfxEffect`

Definido en `apps/dm/src/components/VfxBurst.tsx`. `VfxType` vive en `apps/dm/src/lib/vfxParticles.ts`.

| Campo | Tipo | Valor / rango | Nota |
|---|---|---|---|
| `id` | `number` | `Date.now()` | Seed del burst; identidad propia por disparo. |
| `type` | `VfxType` | 13 variantes | `fire`, `ice`, `lightning`, `heal`, `void`, `flamethrower`, `thunder`, `meteor`, `frostnova`, `poison`, `holy`, `shadow`, `arcane`. |
| `from` | `[number, number, number]` | `[x, 0.6, z]` | `y=0.6` fijado por `backend/routes.py`. |
| `to` | `[number, number, number]` | `[x, 0.6, z]` | Ídem. |
| `duration` | `number` | `1500` ms | Fijado en `DmDashboard.tsx` / `PlayerView.tsx`. |
| `startedAt` | `number \| undefined` | `performance.now()` | Renderer lo ignora: usa su primer frame para absorber latencia del WS. |

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

Guardrail: `tests/e2e/vfx.spec.ts` intercepta el POST, fija `type` y `from/to` para `fire`, dispara `Rayo` y falla si aparecen errores `WebGL|shader|ERROR: 0:` en consola.

## Origen y movimiento

Origen centralizado en `vfxEmitterPose(type, t, from, to, offsetY)` (función pura en `VfxBurst.tsx`), usada por el renderer para posición y dirección del emisor.

| Grupo | Tipos | Origen |
|---|---|---|
| `projectile` | `fire`, `ice`, `lightning`, `meteor`, `poison` | Atacante (`from`) → objetivo (`to`), con arco por tipo (`ARC`). |
| `stream` | `flamethrower` | Atacante, dirigido al objetivo. |
| `strike` | `thunder` | Centrado en objetivo (rayo cae desde arriba). |
| `impact` | `heal`, `void`, `frostnova`, `holy`, `shadow`, `arcane` | Centrado en objetivo. |

## Renderer actual

`VfxBurst.tsx` no usa `three.quarks`. Dibuja cada burst con `THREE.Points` + `ShaderMaterial` propio.

- **Sprites procedurales**: `soft`, `flame`, `smoke`, `spark`, `shard`, `rune`. Se generan en canvas 64×64 y se cachean module-level vía `memoByKey('vfx-sprite-...')`. No se hace `dispose()` por burst.
- **Shader**: 3 paradas de color por capa (`uColorA/B/C`), rotación por `uSpin`, escala creciente por `uEndScale`, fade por edad, `uGlow > 1` con `toneMapped:false` y `AdditiveBlending`. Humo usa `additive:false`.
- **Capas por habilidad** (`LOOKS`): combinan modos `head`, `trail`, `burst`, `stream`, `rise`, `implode`, `orbit`; parámetros `birth`, `life`, `size`, `speed`, `spread`, `rise`, `gravity`, `drag`, `radius`, `spin`, `glow`, `opacity`, `endScale`.
- **Física**: avance con `speed` y `drag` opcional, gravedad, subida, estela con dirección inversa al movimiento, chispas alargadas y fragmentos angulares.
- **Rayos**: `lightning` y `thunder` usan haces de cinta encarados a cámara (3 hebras principales + 2 ramas), con geometría de glow separada de la de núcleo y envolvente rápida (`t<0.28` sostén, fade hacia `t≈0.44`).
- **Complementos**: `PointLight` dinámico por efecto (sigue la pose, fade tardío), `RingGeometry` expansivo en el impacto, roca visible hasta `t<0.76` en `meteor`, parpadeo de intensidad.

Coste: una luz por burst, un anillo opcional, un mesh de roca opcional, un `<points>` por capa y hasta 5 cintas en rayos. Geometrías, materiales y luces se liberan al desmontar; las texturas cacheadas no.

## `lib/vfxParticles.ts`

Sigue siendo matemática pura: sin `three`, sin DOM, sin `Math.random`.

- `VfxType`, `MOTION`, `ARC`, `RECIPES`, `memoByKey`, `seededRandom` y `vfxEmitterPose` alimentan el renderer.
- `sampleVfx`, `layerCount` y las 5 capas históricas (`core`, `trail`, `motes`, `impact`, `aftermath`, 192 partículas) **quedan solo para specs deterministas**; el renderer actual ya no las consume.

## Decisiones / deuda

- `three.quarks@0.15.5` sigue instalado en `apps/dm/package.json` y `package-lock.json`, pero `VfxBurst.tsx` no lo importa. Pendiente decisión: removerlo o reservarlo para otra capa.
- El catálogo de 13 entradas y sus etiquetas en español viven en el menú de `DmDashboard.tsx`.
- Aesthetic final requiere QA visual humana: e2e cubre contrato y errores de shader, no realismo percibido.

## Verificación

```
npm run typecheck
npm run lint
npm run test --workspace=apps/dm
npm run test:e2e -- tests/e2e/vfx.spec.ts
```
