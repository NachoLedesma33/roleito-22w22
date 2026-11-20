# VFX de habilidades — renderer procedural por habilidad

> Estado: evolución visual de las 36 habilidades implementada en `VfxBurst.tsx`. Contrato funcional y flujo DM→WS→jugador **sin cambios**.
> Alcance anterior (5 VFX, textura radial por familia, sin luces ni librerías externas): **RESUELTO / SUPERADO**. Se conserva aquí como registro histórico; ya no describe el renderer actual.

## Contrato `VfxEffect`

Definido en `apps/dm/src/components/VfxBurst.tsx`. `VfxType` vive en `apps/dm/src/lib/vfxParticles.ts`.

| Campo | Tipo | Valor / rango | Nota |
|---|---|---|---|
| `id` | `number` | `Date.now()` | Seed del burst; identidad propia por disparo. |
| `type` | `VfxType` | 36 variantes | `fire`, `ice`, `lightning`, `heal`, `void`, `flamethrower`, `thunder`, `meteor`, `frostnova`, `poison`, `holy`, `shadow`, `arcane`, `arrow`, `arrowrain`, `throwingknife`, `javelin`, `slash`, `cleave`, `gunshot`, `burstfire`, `punch`, `slam`, `chainlightning`, `icespear`, `hail`, `earthquake`, `vines`, `bleed`, `toxiccloud`, `sonicwave`, `forcepush`, `gravityfield`, `barrier`, `lifedrain`, `hex`. |
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

Guardrail: `tests/e2e/vfx.spec.ts` intercepta el POST, fija `type` y `from/to` para `fire`, dispara `Rayo` (locator `exact`) y falla si aparecen errores `WebGL|shader|ERROR: 0:` en consola. `VFX3` dispara `chainlightning`, `lifedrain`, `hex` y `earthquake` con el mismo filtro de errores.

## Origen y movimiento

Origen centralizado en `vfxEmitterPose(type, t, from, to, offsetY)` (función pura en `VfxBurst.tsx`), usada por el renderer para posición y dirección del emisor.

| Grupo | Tipos | Origen |
|---|---|---|
| `projectile` | `fire`, `ice`, `lightning`, `meteor`, `poison`, `arrow`, `throwingknife`, `javelin`, `slash`, `cleave`, `punch`, `slam`, `icespear` | Atacante (`from`) → objetivo (`to`), con arco por tipo (`ARC`). |
| `stream` | `flamethrower`, `gunshot`, `burstfire`, `chainlightning`, `forcepush` | Atacante, dirigido al objetivo. |
| `strike` | `thunder` | Centrado en objetivo (rayo cae desde arriba). |
| `impact` | `heal`, `void`, `frostnova`, `holy`, `shadow`, `arcane`, `arrowrain`, `hail`, `earthquake`, `vines`, `bleed`, `toxiccloud`, `sonicwave`, `gravityfield`, `barrier`, `lifedrain`, `hex` | Centrado en objetivo. |

### Lunge melee (solo visual)

`MELEE_VFX` (`slash`, `cleave`, `punch`, `slam`) vive en `lib/vfxParticles.ts`. `handleTokenClick` en `DmDashboard.tsx` guarda un override de posición del atacante: se detiene a `0.9` del objetivo y permanece ahí. El override alimenta el `characters` de `SceneRenderer` y se descarta cuando el WS mueve esa ficha (`sceneChars`). Ni `sceneChars` ni el contrato DM→WS cambian; la interpolación 60fps existente produce el abalanchamiento. El impacto se ve en ambos tokens: `impactFrom` en el atacante y `ring`/`burst` en el objetivo.

### Habilidades adicionales (13)

| `type` | Etiqueta | Sello visual propio |
|---|---|---|
| `chainlightning` | Rayo en cadena | Cinta `arc` cian + chispas en 4 nodos (`mode: 'chain'`) a lo largo de `from→to`. |
| `icespear` | Lanza de hielo | Punta `shard` orientada (`FLIGHT 0.68`), estela de astillas y erupción al clavarse. |
| `hail` | Granizo | `rain` de fragmentos de hielo desde `spawnHeight 6.5`, gravedad `-16` y salpicadura. |
| `earthquake` | Terremoto | Anillo de radio 5, escombros que caen, polvo pegado al suelo y esquirlas en órbita. |
| `vines` | Enredaderas | Espinas verdes que suben del suelo (`rise`) y sigilos que se enroscan. |
| `bleed` | Hemorragia | Salpicadura roja con gravedad alta, gotas `soft` y niebla oscura. |
| `toxiccloud` | Nube tóxica | Humo verde persistente que asciende, con motes ácidos en órbita. |
| `sonicwave` | Onda sónica | Anillo expansivo de radio 5, frentes `rune` y chispas radiales plata/cian. |
| `forcepush` | Empujón arcano | Cono direccional de runas orientadas, retroceso en `from` e impacto en `to`. |
| `gravityfield` | Campo de gravedad | Implosión con giro inverso (`spin` negativo) de runas, escombros y humo. |
| `barrier` | Barrera de energía | Cúpula de runas/chispas que ascienden en órbita sobre anillo base. |
| `lifedrain` | Drenaje de vida | Morado: `mode: 'siphon'` recorre completo `to → from` (estela continua y escalonada), implosión en el objetivo y, en el lanzador, `mode: 'riseFrom'` con runas/chispas/asciende como una sanación morada más pulso `impactFrom`. |
| `hex` | Maldición | Morado: sigilos que caen desde arriba (`rain`), aura oscura en implosión y giro inverso. |

## Renderer actual

`VfxBurst.tsx` no usa `three.quarks`. Dibuja cada burst con `THREE.Points` + `ShaderMaterial` propio.

- **Sprites procedurales**: `soft`, `flame`, `smoke`, `spark`, `shard`, `rune`, `arrow`, `blade`, `bullet`. Se generan en canvas 64×64 y se cachean module-level vía `memoByKey('vfx-sprite-...')`. No se hace `dispose()` por burst.
- **Shader**: 3 paradas de color por capa (`uColorA/B/C`), rotación por `aRot` + `uSpin`, escala creciente por `uEndScale`, fade por edad, `uGlow > 1` con `toneMapped:false` y `AdditiveBlending`. Humo usa `additive:false`.
- **Orientación**: sprite por defecto rota con ángulo fijo por seed. Capas `oriented:true` (flecha, jabalina, balas, lluvia de flechas) recalculan `aRot` por frame proyectando la velocidad a pantalla, así punta/estela siguen la trayectoria; `uSpin` se suma encima. `rain` apunta la flecha hacia abajo y la clava en el suelo del objetivo.
- **Capas por habilidad** (`LOOKS`): combinan modos `head`, `trail`, `burst`, `recoil`, `stream`, `rise`, `riseFrom`, `implode`, `orbit`, `rain`, `siphon`, `chain`; parámetros `birth`, `life`, `size`, `speed`, `spread`, `rise`, `gravity`, `drag`, `radius`, `spin`, `glow`, `opacity`, `endScale`, `oriented`, `spawnHeight`, `arrival`. `recoil` emite en `from` (atacante) para el impacto doble de melee y armas de fuego (incluye eyección de casquillos en `gunshot`/`burstfire`).
- **Física**: avance con `speed` y `drag` opcional, gravedad, subida, estela con dirección inversa al movimiento, chispas alargadas y fragmentos angulares. `rain` siembra flechas escalonadas desde `spawnHeight` sobre el área del objetivo.
- **Tiempo de vuelo**: `FLIGHT` define `arrow: 0.62` y `javelin: 0.7` como fracción de duración en que el proyectil llega; la estela se corta ahí, el impacto (astillas, chispas, polvo de suelo y escombros) arranca en ese instante y la punta vibra al clavarse. En `gunshot`/`burstfire` el impacto y el anillo son `arrival`: `arrivalT = distancia / (velocidad de bala · duración)`, así el impacto dispare cuando la traza toca al objetivo y no a un tiempo fijo.
- **Rayos**: `lightning` y `thunder` usan haces de cinta encarados a cámara (3 hebras principales + 2 ramas), con geometría de glow separada de la de núcleo y envolvente rápida (`t<0.28` sostén, fade hacia `t≈0.44`).
- **Complementos**: `RingGeometry` expansivo en el impacto (`ring`) y otro en el atacante (`impactFrom`, melee/armas de fuego), roca visible hasta `t<0.76` en `meteor`. Sin `PointLight` por burst: iluminaba la niebla y aclaraba el mapa completo.
- **Audio**: `lib/vfxSound.ts` dispara un sonido procedural Web Audio por cada uno de los 36 tipos al montar el burst, con volumen derivado del master. Sin assets ni dependencias nuevas; `VfxBurst.tsx` lo llama una vez por efecto, cubriendo DM y jugador.

Coste: un anillo opcional, un mesh de roca opcional, un `<points>` por capa y hasta 5 cintas en rayos. Geometrías y materiales se liberan al desmontar; las texturas cacheadas no.

## `lib/vfxParticles.ts`

Sigue siendo matemática pura: sin `three`, sin DOM, sin `Math.random`.

- `VfxType`, `MOTION`, `ARC`, `RECIPES`, `memoByKey`, `seededRandom` y `vfxEmitterPose` alimentan el renderer.
- `sampleVfx`, `layerCount` y las 5 capas históricas (`core`, `trail`, `motes`, `impact`, `aftermath`, 192 partículas) **quedan solo para specs deterministas**; el renderer actual ya no las consume.

## Decisiones / deuda

- `three.quarks@0.15.5` sigue instalado en `apps/dm/package.json` y `package-lock.json`, pero `VfxBurst.tsx` no lo importa. Pendiente decisión: removerlo o reservarlo para otra capa.
- El catálogo de 36 entradas y sus etiquetas en español viven en los menús de `DmDashboard.tsx` y `PlayerView.tsx` (mismos 4 grupos). `lightning` y `thunder` se conservan sin cambios.
- Aesthetic final requiere QA visual humana: e2e cubre contrato y errores de shader, no realismo percibido.
- `Maldito` (`cursed`) no dispara `BloomPass` global. Violeta unificado `#9e38ff` (`uColor` de la estela y shader del vórtice; el cuerpo de cara usa el mismo tono en `rim`). **Sin estela de humo por cara**: se removieron `smokeGeo`/`smokeMat` y su `<points>` hijo del grupo de cada cara; queda solo la estela global de almas (`NormalBlending`, 120 puntos, alfa ×0.45, 2.8 vueltas, radio 0.62→0.40×, ondulación ×0.09) que serpentea alrededor del token. **Serpenteo principal del trazado**, con un **mini serpenteo local** en el vertex shader de la cara: onda X/Y/Z de amplitudes 0.035/0.03/0.01 (≈⅓ del anterior), reforzada en la cola (`body = 0.25 + 0.75·tail`), sin bamboleo Z local. Las 3 caras salen disparadas hacia afuera y se cierran en espiral hasta el centro del token: 2.4 vueltas, radio 0.98→0.08×, arco sinusoidal (base → `topY+0.18×` → base), más un **desplazamiento tangente en S** (2 ondas de `sin(p·4π)`, ±0.36×). Ciclo común de 0.16/s con fases `i/3` para que **entren de una en una** (sincronizadas, sin deriva); giro Z/Y/X solo oscilación de orientación. `fout` 0.92→1.0 mantiene la cara visible mientras se sumerge; encogimiento hasta 0.225×. Opacidad `uFade` 1.1 con degradado `core→rim` y `grad` vertical intactos. Vórtice de implosión tipo `void` (96 puntos sprite difuso, `NormalBlending`, alfa ×0.28) sin `PointLight` ni audio. Icono de estado reducido a 0.42× en `SceneRenderer.tsx`.
- Niebla del jugador: `PlayerView.tsx` pasa `fogColor="rgba(0, 0, 0, 0.98)"`. El DM conserva `rgba(15, 23, 42, 0.55)` en `DmDashboard.tsx`.

## Verificación

```
npm run typecheck
npm run lint
npm run test --workspace=apps/dm
npm run test:e2e -- tests/e2e/vfx.spec.ts
```
