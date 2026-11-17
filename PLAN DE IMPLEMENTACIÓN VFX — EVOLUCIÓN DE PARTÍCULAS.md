# Evolución de Partículas VFX — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la representación visual de los 5 VFX actuales (`fire`, `ice`, `lightning`, `heal`, `void`) — hoy un único `THREE.Points` de 150 partículas con textura radial y ruido aleatorio — por partículas procedurales multicapa, orgánicas y con variación determinista, sin tocar ni un solo archivo del sistema funcional de VFX.

**Architecture:** Todo el cambio visual vive en `apps/dm/src/components/VfxBurst.tsx` + un módulo puro de matemática de partículas (`apps/dm/src/lib/vfxParticles.ts`) con su spec, siguiendo el patrón ya existente `lib/lightGlow.ts` / `lib/fogMask.ts`. El contrato `VfxEffect` y el flujo de datos (menú → `handleTokenClick` → `POST /vfx` → WS → `onVfx` → `setVfx`) quedan **congelados**. Se usan `THREE.Points`, `CanvasTexture` procedural y materiales aditivos; **no** se agregan dependencias (Three.Quarks / postprocessing / GPU particles quedan fuera de este plan, son etapas posteriores del plan maestro).

**Tech Stack:** Three.js `^0.170.0`, `@react-three/fiber` `^8.18.0`, TypeScript strict, Vitest (env node), Playwright e2e.

**Spec:** `# PLAN DE EVOLUCIÓN VFX — PREMIUM ABILITY VISUAL SYSTEM.md` (raíz del repo). Este plan implementa **solo** la evolución de partículas (secciones 2, 6.1–6.2, 7, 8, 9, 11, 12 del spec). Las secciones 3 (bibliotecas), 4–5 (catálogo de 200 habilidades / 20 familias), 10 (`AbilityVFXConfig`), 13–14 (catálogo y visor) y 15 fases 3–7 **no** entran en este plan.

---

## Global Constraints

Congeladas. Copiadas del spec / `AGENTS.md` / código actual con valores exactos. Aplica a toda task.

- **No crear sistema nuevo.** "No se pretende desarrollar un nuevo sistema de habilidades, combate, lanzamiento, selección de objetivos ni administración de ataques." Solo se sustituye la representación visual (`VfxBurst.tsx`).
- **Tipos exactos:** `'fire' | 'ice' | 'lightning' | 'heal' | 'void'`. No agregar nuevos `type` al contrato WS en este plan.
- **Payload congelado:** `{ id: number; type: VfxType; from: [x, 0.6, z]; to: [x, 0.6, z]; startedAt: number; duration: 1500 }`. El `y = 0.6` lo fija `backend/routes.py`; la duración `1500` y el cleanup `2000` los fijan `DmDashboard.tsx` y `PlayerView.tsx`.
- **Timing interno congelado:** `VfxBurst` ignora `startedAt` y usa su propio primer frame (`startedRef` + `clock.elapsedTime`). Mantener así: `performance.now()` (DM) y `clock.elapsedTime` (R3F) no comparten origen, y esto absorbe la latencia del WS.
- **Funcional, SOLO LECTURA — no editar:** `backend/routes.py` (596–628), `backend/models.py:94`, `backend/database.py:77`, `backend/schemas.py`, `apps/dm/src/lib/usePlayerSync.ts` (363–365), `apps/dm/src/pages/DmDashboard.tsx` (100–102, 255, 1514–1527, 2501–2522, 3356–3358, 3408), `apps/dm/src/pages/PlayerView.tsx` (149, 174–177, 1396, 1492–1494), `apps/dm/src/lib/api.ts`.
- **Sin dependencias nuevas.** No instalar `three.quarks`, `postprocessing`, `troika`, ni nada. Si una mejora exige dependencia, se documenta y se difiere al plan maestro.
- **Sin abstracciones ceremoniales.** Un módulo puro + su spec; nada de `AbilityVFXConfig`, registros globales, factories parametrizables con flags ni capas nuevas. Preferir duplicación pequeña y explícita por familia.
- **Patrones del repo:** tokens CSS / `components/ui/` / `api.ts` / `@core/domain/types` / i18n `t()` donde aplique. Los textos visibles del menú VFX ya están hardcodeados en español; **no cambiarlos** en este plan (cambiar nombres accesibles rompe e2e — ver gotcha de `AGENTS.md`).
- **Cero regresión funcional:** al final deben pasar `npm run lint` → `npm run typecheck` → `npm run test --workspace=apps/dm` → `npm run test:e2e`, además de `python scripts/check-docs-consistency.py`.
- **Un commit por task + CI verde**, orden fijo del plan. Rollback = revert de un commit (ver Task 5).

## Review Focus

Entradas / fallos que el spec implica pero ningún test funcional cubre, más probables primero. Cada línea lleva el test que la fija en la task dueña.

1. **`t` fuera de rango o `duration` distinto de 1500** → renderer debe degradar sin NaN, sin partículas infinitas y sin `visible=false` prematuro. Test: `sampleVfx` con `t=-0.1, 0, 1, 1.4` y `duration=500|1500|9000` → finito y acotado (Task 2).
2. **Todas las partículas iguales** (el defecto actual: mismo size, misma trayectoria, mismo color) → variación determinista por seed. Test: mismo `seed` → mismas muestras; `seed` distinto → distinto; spread de size/alpha > 0 (Task 2).
3. **Desaparición abrupta al terminar** → fase `aftermath` con fade progresivo hasta `alpha=0` en `t=1`. Test: `alpha` monótono decreciente y `alpha(t=1)=0` (Task 2).
4. **Fuga de memoria / draw calls por crear-textura-por-partícula** → textura compartida por tipo vía caché, geometría reutilizada, `dispose` al desmontar, conteo tope. Test: caché devuelve la misma textura para dos bursts del mismo tipo; `count <= 220` (Task 3 + Task 4).
5. **Contrato WS roto por refactor visual** → el menú sigue disparando `POST /vfx`, el jugador sigue recibiendo el broadcast y el estado local sigue limpiándose a los 2 s. Test e2e: interceptar la request con `type='fire'` y coords `from/to` (Task 1).

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `tests/e2e/vfx.spec.ts` | Crear | Guardrail del flujo funcional. Fija menú → ataque → POST → payload. Sin WebGL. |
| `apps/dm/src/lib/vfxParticles.ts` | Crear | Matemática pura: seeds deterministas, recetas por tipo, muestreo de 5 capas. Sin `three`, sin DOM. |
| `apps/dm/src/lib/vfxParticles.spec.ts` | Crear | Tests de determinismo, acotamiento, fases y variación. |
| `apps/dm/src/components/VfxBurst.tsx` | Modificar | Único punto visual. Pasa de un `points` a capas que consumen `sampleVfx`. |
| `docs/system/VFX.md` | Crear | Contrato, capas y límites del sistema; descarta el cambio de arquitectura. |

**Archivos explícitamente fuera del diff de este plan:** los listados en *Global Constraints → Funcional, SOLO LECTURA*. Si una task parece pedir editarlos, la task está mal: parar y reabrir el spec.

---

## Task 1: Guardrail del flujo funcional (antes de tocar lo visual)

**Files:**
- Create: `tests/e2e/vfx.spec.ts`

**Interfaces:**
- Consumes: `data-anchor="vfx"`, `data-testid="vfx-menu"` (`DmDashboard.tsx:2501,2511`), `POST /api/campaigns/{id}/vfx` con body `{ type, from_x, from_z, to_x, to_z }` (`api.ts` → `routes.py:596`).
- Produces: ninguno. Es red de regresión; corre en verde antes y después de las tasks 2–4.

- [x] **Step 1: Escribir el spec e2e del guardrail**

```ts
test('VFX1: menú dispara ataque y hace POST /vfx con from/to', async ({ page, campaign, request }) => {
  // setup: escena activa con 2 tokens (helpers existentes en tests/e2e/helpers)
  const vfxPost = page.waitForRequest(
    (r) => r.url().includes(`/api/campaigns/${campaign.id}/vfx`) && r.method() === 'POST',
  );
  await page.locator('[data-anchor="vfx"] button').click();
  await expect(page.getByTestId('vfx-menu')).toBeVisible();
  await page.getByRole('button', { name: 'Fuego' }).click();
  await page.getByTestId('token-attacker').click();
  await page.getByTestId('token-target').click();
  const req = await vfxPost;
  expect(req.postDataJSON()).toMatchObject({ type: 'fire' });
  expect(req.postDataJSON().from_x).toBeTypeOf('number');
  expect(req.postDataJSON().to_x).toBeTypeOf('number');
});
```

Usar los helpers reales de `tests/e2e/` para crear campaña/escena/tokens (ver `weather.spec.ts`, `player-view.spec.ts`). Si no existen `data-testid` de token, usar el selector que ya usan esos specs; **no agregar testids nuevos al componente**.

- [x] **Step 2: Correr el spec y verificar que pasa**

Run: `npm run test:e2e -- tests/e2e/vfx.spec.ts`
Expected: PASS (1 test). Es la línea base: el flujo hoy funciona.

- [x] **Step 3: Commit**

```bash
git add tests/e2e/vfx.spec.ts
git commit -m "test(vfx): guardrail e2e del flujo VFX actual"
```

---

## Task 2: Motor puro de partículas (determinista, acotado, con fases)

**Files:**
- Create: `apps/dm/src/lib/vfxParticles.ts`
- Test: `apps/dm/src/lib/vfxParticles.spec.ts`

**Interfaces:**
- Consumes: tipos del contrato, redeclarados localmente para no acoplar el módulo a R3F: `type VfxType = 'fire' | 'ice' | 'lightning' | 'heal' | 'void'`.
- Produces:

```ts
export type VfxLayer = 'core' | 'trail' | 'motes' | 'impact' | 'aftermath';
export interface VfxParticle {
  offset: [number, number, number]; // relativo a from→to
  size: number;                     // 0..1
  alpha: number;                    // 0..1
  color: [number, number, number];  // rgb 0..1
  spin: number;                     // rad
}
export interface VfxSampleInput {
  type: VfxType;
  t: number;        // 0..1, se tolera ligeramente fuera de rango
  duration: number; // ms
  seed: number;
}
export function seededRandom(seed: number): () => number;
export function sampleVfx(layer: VfxLayer, input: VfxSampleInput): VfxParticle[];
export function layerCount(layer: VfxLayer): number; // core 20, trail 48, motes 64, impact 32, aftermath 28 → 192 total
```

- [x] **Step 1: Escribir los tests que fallan**

```ts
describe('sampleVfx', () => {
  it('determinista para el mismo seed', () => {
    const a = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 7 });
    const b = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 7 });
    expect(a).toEqual(b);
  });
  it('varía con el seed y dentro de la capa', () => {
    const a = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 7 });
    const b = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 8 });
    expect(a).not.toEqual(b);
    expect(new Set(a.map((p) => p.size)).size).toBeGreaterThan(1);
  });
  it('acota t y duration', () => {
    for (const t of [-0.1, 0, 1, 1.4]) for (const duration of [500, 1500, 9000]) {
      for (const p of sampleVfx('trail', { type: 'void', t, duration, seed: 1 })) {
        expect([...p.offset, p.size, p.alpha, ...p.color].every(Number.isFinite)).toBe(true);
        expect(p.alpha).toBeGreaterThanOrEqual(0);
        expect(p.alpha).toBeLessThanOrEqual(1);
      }
    }
  });
  it('aftermath termina en alpha 0', () => {
    const end = sampleVfx('aftermath', { type: 'ice', t: 1, duration: 1500, seed: 3 });
    expect(end.every((p) => p.alpha === 0)).toBe(true);
  });
  it('respeta el tope de partículas por capa', () => {
    for (const layer of ['core','trail','motes','impact','aftermath'] as const)
      expect(sampleVfx(layer, { type: 'heal', t: 0.5, duration: 1500, seed: 1 })).toHaveLength(layerCount(layer));
  });
});
```

- [x] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/lib/vfxParticles.spec.ts`
Expected: FAIL — "Cannot find module './vfxParticles'".

- [x] **Step 3: Implementar `vfxParticles.ts`**

Sin `three`, sin `document`, sin `Math.random`, sin `useFrame`. Reglas concretas:

- `seededRandom(seed)`: PRNG determinista tipo mulberry32; devuelve `() => number` en `[0,1)`.
- `sampleVfx` acota `t` con `Math.min(1, Math.max(0, t))` y normaliza `duration` con `Math.max(1, duration)`. Usa `seed ^ hash(type)` para que cada familia tenga ruido distinto.
- Recetas por familia como **tabla de datos** (no clases):
  - `fire`: `core` blanco-ámbar, `motes` naranja→rojo, `trail` con ruido lateral, `aftermath` brasas que caen (`+y` negativo).
  - `ice`: `core` cian, `motes` fragmentos angulares, `aftermath` polvo que desciende.
  - `lightning`: `core` amarillo, `trail` con saltos laterales bruscos (arco ramificado), `impact` destello corto.
  - `heal`: `motes` verdes ascendentes (`+y`), `aftermath` suave, sin humo.
  - `void`: `motes` absorbidos hacia el centro (offset decreciente), `impact` implosión, tintes violeta.
- Fases: `t < 0.55` → `core/trail/motes` activos, `impact/aftermath` con `alpha=0`; `0.55 <= t < 0.78` → `impact` activo; `t >= 0.78` → `aftermath` activo con fade lineal hasta `alpha=0` en `t=1`. `core/trail/motes` desvanecen suavemente desde `t=0.55`.
- `layerCount` exacto: `core 20, trail 48, motes 64, impact 32, aftermath 28 = 192` (tope 220 de la Review Focus #4; 192 lo cumple). Usar esos valores en implementación y test.

- [x] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/lib/vfxParticles.spec.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add apps/dm/src/lib/vfxParticles.ts apps/dm/src/lib/vfxParticles.spec.ts
git commit -m "feat(vfx): motor de partículas determinista y por fases"
```

---

## Task 3: Nuevo renderer multicapa en `VfxBurst`

**Files:**
- Modify: `apps/dm/src/components/VfxBurst.tsx`
- Consumes: `sampleVfx`, `layerCount`, `VfxLayer`, `VfxParticle` de Task 2; `VfxEffect` de este mismo archivo (firma sin cambios).

**Interfaces:**
- Produces: mismo `<VfxBurst effect={effect} />` que consume `SceneRenderer.tsx:2658-2659`. Firma y props idénticas.

- [x] **Step 1: Correr el guardrail antes de editar**

Run: `npm run test:e2e -- tests/e2e/vfx.spec.ts`
Expected: PASS (de Task 1). Si falla, parar: el cambio anterior rompió el flujo.

- [x] **Step 2: Reemplazar el cuerpo de `VfxBurst`**

Mantener: exports, `VfxEffect`, el `useFrame` que deriva `t` de `startedRef`/`clock.elapsedTime`, el `if (t >= 1) visible = false`. Cambiar:

- Un `<points>` por capa activa (5 máximo), cada uno con su `Float32Array` de `layerCount(layer)*3` y su `BufferAttribute`.
- En `useFrame`, para cada capa: `sampleVfx(layer, { type: effect.type, t, duration: effect.duration, seed: effect.id })`; escribir `offset` sumado a la interpolación `from→to`; actualizar `position` y `color` del buffer; setear `material.opacity`/`material.size` desde el promedio de `alpha`/`size` de la capa.
- Textura: una por `effect.type`, vía `const TEXTURE_CACHE = new Map<VfxType, THREE.Texture>()` a nivel de módulo; `makeTexture` sigue generando el radial gradient actual (ahora con los colores de `VfxParticle.color`, no con un `COLORS` fijo por tipo). Reutilizar la textura entre capas del mismo burst.
- Materiales: `THREE.AdditiveBlending`, `depthWrite={false}`, `sizeAttenuation`, `vertexColors` donde aplique. Sin `PointLight` por partícula.
- `seed = effect.id` hace que cada disparo tenga identidad propia sin `Math.random` en el frame.

- [x] **Step 3: Verificar tipos y tests**

Run: `npm run typecheck && npm run test --workspace=apps/dm`
Expected: PASS. `npm run lint` → 0 errors.

- [x] **Step 4: Verificación visual en el browser (no sustituible por unit test)**

Abrir `npm run dev`, campaign con 2 tokens, disparar los 5 tipos. Comprobar: no hay esferas flotantes, cada familia se distingue por movimiento (no solo color), el impacto no desaparece de golpe, no se ven cuadrados (alpha de textura correcto). Usar Playwright MCP para mirar; screenshot antes/después en `test-results/` (no commitear).

- [x] **Step 5: Correr el guardrail y commitear**

Run: `npm run test:e2e -- tests/e2e/vfx.spec.ts`
Expected: PASS (1 test) — el flujo funcional sigue intacto.

```bash
git add apps/dm/src/components/VfxBurst.tsx
git commit -m "feat(vfx): renderer multicapa de partículas en VfxBurst"
```

---

## Task 4: Ciclo de vida, pooling y límite de coste

**Files:**
- Modify: `apps/dm/src/components/VfxBurst.tsx`
- Modify: `apps/dm/src/lib/vfxParticles.ts`
- Test: `apps/dm/src/lib/vfxParticles.spec.ts`

**Interfaces:**
- Consumes: mismos de Task 3. Produces: mismo `<VfxBurst>` + `memoByKey` exportado.

- [x] **Step 1: Test de caché (`memoByKey`)**

Agregar a `apps/dm/src/lib/vfxParticles.spec.ts`:

```ts
it('memoByKey reutiliza por clave', () => {
  let calls = 0;
  const make = () => ({ n: ++calls });
  expect(memoByKey('fire', make)).toBe(memoByKey('fire', make));
  expect(memoByKey('ice', make)).not.toBe(memoByKey('fire', make));
  expect(calls).toBe(2);
});
```

- [x] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/lib/vfxParticles.spec.ts`
Expected: FAIL — "memoByKey is not exported".

- [x] **Step 3: Implementar `memoByKey` en `vfxParticles.ts` y ajustar `VfxBurst`**

- `memoByKey<T>(key, make)`: `Map<string, T>` module-level; si existe la clave, devuelve el valor; si no, llama `make()` y guarda. Sin `three`, sin DOM.
- `getTexture(type) = memoByKey('vfx-texture-' + type, () => makeTexture(type))`; una sola textura por familia, compartida entre todos los bursts. `makeTexture` sigue en `VfxBurst.tsx` (usa `document`).
- `useMemo` para los `Float32Array`/`BufferAttribute` por capa (depende solo de `layerCount`, `effect.from`); no reallocar en cada frame.
- `useEffect` cleanup: si en algún momento se crea textura fuera de la caché, `dispose()` al desmontar. La caché module-level **no** se dispose por burst (se comparte).
- Total de partículas por burst = 192 (Task 2), fijo. Sin escalado por calidad en este plan (los presets del spec section 10.1 quedan diferidos).

- [x] **Step 4: Verificar**

Run: `npm run typecheck && npm run test --workspace=apps/dm && npm run lint`
Expected: PASS / 0 errors.

- [x] **Step 5: Commit**

```bash
git add apps/dm/src/components/VfxBurst.tsx apps/dm/src/lib/vfxParticles.ts apps/dm/src/lib/vfxParticles.spec.ts
git commit -m "perf(vfx): textura compartida y buffers reutilizados por burst"
```

---

## Task 5: Verificación total, docs y rollback

**Files:**
- Create: `docs/system/VFX.md`

- [x] **Step 1: Escribir `docs/system/VFX.md`**

Contenido mínimo: contrato `VfxEffect` (tabla de campos con valores exactos), flujo DM→WS→jugador con rutas de archivo, las 5 capas y su rango de `t`, las 5 recetas por familia, límites (192 partículas, 1 textura por familia, sin PointLight por partícula), y nota explícita: "bibliotecas externas y catálogo ampliado: ver plan maestro, fuera de este alcance".

- [x] **Step 2: Correr toda la verificación del repo, en orden**

```bash
npm run lint
npm run typecheck
npm run test --workspace=apps/dm
npm run test:e2e
python scripts/check-docs-consistency.py
```

Expected: todo verde. Si `test:e2e` falla en specs que no son `vfx.spec.ts`, **no** culpar al flake: reproducir el spec afectado antes de seguir (gotcha de `AGENTS.md`).

- [x] **Step 3: Revisar el diff con `git show` y verificar que no aparece ningún archivo de la lista "SOLO LECTURA"**

Expected: diff = `tests/e2e/vfx.spec.ts`, `apps/dm/src/lib/vfxParticles.ts`, `apps/dm/src/lib/vfxParticles.spec.ts`, `apps/dm/src/components/VfxBurst.tsx`, `docs/system/VFX.md`. Cualquier otro archivo → parar.

- [x] **Step 4: Commit**

```bash
git add docs/system/VFX.md
git commit -m "docs(vfx): contrato, capas y límites del sistema de partículas"
```

**Rollback:** cada task es un commit autocontenido. Si una task degrada el render, `git revert <sha>` de esa task restaura el burst anterior sin tocar el flujo funcional. El guardrail de Task 1 debe seguir verde tras cualquier revert.

---

## Self-Review (contra el spec)

- **Cobertura:** sección 2 (reglas artísticas) → Task 2 recetas + Task 3 capas; 6.1/6.2 capas y fases → Task 2/3; 7 trayectorias → Task 3 (offset lateral/arco/implosión por familia); 8 impactos → capa `impact`; 9.1–9.2 textura alpha + variación → Task 2/3; 9.5 iluminación → Task 4 (sin PointLight por partícula); 11 reutilización → Task 4 caché; 12 rendimiento → Tasks 2/4. Sin gaps dentro del alcance declarado.
- **Fuera de alcance declarado:** secciones 3, 4, 5, 10, 13, 14 y fases 3–7. No se agregaron tasks para ellas a pedido del usuario ("solo quiero una evolución de las partículas"). Si se quieren, van en plan separado.
- **Tipos consistentes:** `VfxType`, `VfxLayer`, `VfxParticle`, `VfxSampleInput`, `sampleVfx`, `layerCount`, `seededRandom`, `memoByKey` — mismos nombres en Tasks 2→3→4. `VfxEffect` conserva su firma en `VfxBurst.tsx`.
- **Review Focus cubierto:** 5/5 con tests en Tasks 1–4.
- **Proporción:** plan ~1/8 del spec; código solo en definiciones de interfaz y tests, no hay bodies de renderer excepto reglas concretas donde el tipo no decide.
