# VFX de habilidades — renderer procedural por habilidad

> Estado: evolución visual de las 23 habilidades implementada en `VfxBurst.tsx`. Contrato funcional y flujo DM→WS→jugador **sin cambios**.
> Alcance anterior (5 VFX, textura radial por familia, sin luces ni librerías externas): **RESUELTO / SUPERADO**. Se conserva aquí como registro histórico; ya no describe el renderer actual.

## Contrato `VfxEffect`

Definido en `apps/dm/src/components/VfxBurst.tsx`. `VfxType` vive en `apps/dm/src/lib/vfxParticles.ts`.

| Campo | Tipo | Valor / rango | Nota |
|---|---|---|---|
| `id` | `number` | `Date.now()` | Seed del burst; identidad propia por disparo. |
| `type` | `VfxType` | 23 variantes | `fire`, `ice`, `lightning`, `heal`, `void`, `flamethrower`, `thunder`, `meteor`, `frostnova`, `poison`, `holy`, `shadow`, `arcane`, `arrow`, `arrowrain`, `throwingknife`, `javelin`, `slash`, `cleave`, `gunshot`, `burstfire`, `punch`, `slam`. |
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
| `projectile` | `fire`, `ice`, `lightning`, `meteor`, `poison`, `arrow`, `throwingknife`, `javelin`, `slash`, `cleave`, `punch`, `slam` | Atacante (`from`) → objetivo (`to`), con arco por tipo (`ARC`). |
| `stream` | `flamethrower`, `gunshot`, `burstfire` | Atacante, dirigido al objetivo. |
| `strike` | `thunder` | Centrado en objetivo (rayo cae desde arriba). |
| `impact` | `heal`, `void`, `frostnova`, `holy`, `shadow`, `arcane`, `arrowrain` | Centrado en objetivo. |

### Lunge melee (solo visual)

`MELEE_VFX` (`slash`, `cleave`, `punch`, `slam`) vive en `lib/vfxParticles.ts`. `handleTokenClick` en `DmDashboard.tsx` guarda un override de posición del atacante: se detiene a `0.9` del objetivo y permanece ahí. El override alimenta el `characters` de `SceneRenderer` y se descarta cuando el WS mueve esa ficha (`sceneChars`). Ni `sceneChars` ni el contrato DM→WS cambian; la interpolación 60fps existente produce el abalanchamiento. El impacto se ve en ambos tokens: `impactFrom` en el atacante y `ring`/`burst` en el objetivo.

## Renderer actual

`VfxBurst.tsx` no usa `three.quarks`. Dibuja cada burst con `THREE.Points` + `ShaderMaterial` propio.

- **Sprites procedurales**: `soft`, `flame`, `smoke`, `spark`, `shard`, `rune`, `arrow`, `blade`, `bullet`. Se generan en canvas 64×64 y se cachean module-level vía `memoByKey('vfx-sprite-...')`. No se hace `dispose()` por burst.
- **Shader**: 3 paradas de color por capa (`uColorA/B/C`), rotación por `aRot` + `uSpin`, escala creciente por `uEndScale`, fade por edad, `uGlow > 1` con `toneMapped:false` y `AdditiveBlending`. Humo usa `additive:false`.
- **Orientación**: sprite por defecto rota con ángulo fijo por seed. Capas `oriented:true` (flecha, jabalina, balas, lluvia de flechas) recalculan `aRot` por frame proyectando la velocidad a pantalla, así punta/estela siguen la trayectoria; `uSpin` se suma encima. `rain` apunta la flecha hacia abajo y la clava en el suelo del objetivo.
- **Capas por habilidad** (`LOOKS`): combinan modos `head`, `trail`, `burst`, `recoil`, `stream`, `rise`, `implode`, `orbit`, `rain`; parámetros `birth`, `life`, `size`, `speed`, `spread`, `rise`, `gravity`, `drag`, `radius`, `spin`, `glow`, `opacity`, `endScale`, `oriented`, `spawnHeight`, `arrival`. `recoil` emite en `from` (atacante) para el impacto doble de melee y armas de fuego (incluye eyección de casquillos en `gunshot`/`burstfire`).
- **Física**: avance con `speed` y `drag` opcional, gravedad, subida, estela con dirección inversa al movimiento, chispas alargadas y fragmentos angulares. `rain` siembra flechas escalonadas desde `spawnHeight` sobre el área del objetivo.
- **Tiempo de vuelo**: `FLIGHT` define `arrow: 0.62` y `javelin: 0.7` como fracción de duración en que el proyectil llega; la estela se corta ahí, el impacto (astillas, chispas, polvo de suelo y escombros) arranca en ese instante y la punta vibra al clavarse. En `gunshot`/`burstfire` el impacto y el anillo son `arrival`: `arrivalT = distancia / (velocidad de bala · duración)`, así el impacto dispare cuando la traza toca al objetivo y no a un tiempo fijo.
- **Rayos**: `lightning` y `thunder` usan haces de cinta encarados a cámara (3 hebras principales + 2 ramas), con geometría de glow separada de la de núcleo y envolvente rápida (`t<0.28` sostén, fade hacia `t≈0.44`).
- **Complementos**: `PointLight` dinámico por efecto (sigue la pose, fade tardío), `RingGeometry` expansivo en el impacto (`ring`) y otro en el atacante (`impactFrom`, melee/armas de fuego), roca visible hasta `t<0.76` en `meteor`, parpadeo de intensidad.

Coste: una luz por burst, un anillo opcional, un mesh de roca opcional, un `<points>` por capa y hasta 5 cintas en rayos. Geometrías, materiales y luces se liberan al desmontar; las texturas cacheadas no.

## `lib/vfxParticles.ts`

Sigue siendo matemática pura: sin `three`, sin DOM, sin `Math.random`.

- `VfxType`, `MOTION`, `ARC`, `RECIPES`, `memoByKey`, `seededRandom` y `vfxEmitterPose` alimentan el renderer.
- `sampleVfx`, `layerCount` y las 5 capas históricas (`core`, `trail`, `motes`, `impact`, `aftermath`, 192 partículas) **quedan solo para specs deterministas**; el renderer actual ya no las consume.

## Decisiones / deuda

- `three.quarks@0.15.5` sigue instalado en `apps/dm/package.json` y `package-lock.json`, pero `VfxBurst.tsx` no lo importa. Pendiente decisión: removerlo o reservarlo para otra capa.
- El catálogo de 23 entradas y sus etiquetas en español viven en el menú de `DmDashboard.tsx`. `lightning` y `thunder` se conservan sin cambios.
- Aesthetic final requiere QA visual humana: e2e cubre contrato y errores de shader, no realismo percibido.

## Verificación

```
npm run typecheck
npm run lint
npm run test --workspace=apps/dm
npm run test:e2e -- tests/e2e/vfx.spec.ts
```
