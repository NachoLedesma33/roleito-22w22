# Plan — Dados 3D para Roleito VTT

> **Fecha:** 2026-10-10
> **Origen:** extraído de `AUDITORIA-VTT.md` §6–§8.
> **Objetivo:** dados 3D animados con física real (tirada "a una mini mesa"), integrados al stream de tiradas existente, **sin dependencias de pago ni descargas obligatorias**.
> **Estado actual:** hoy solo existe un roller numérico (`apps/dm/src/components/DiceRoller.tsx`, `Math.random()`). Ver diagnóstico en `AUDITORIA-VTT.md` §3.

---

## 1. Decisión de origen de assets: **procedural, no descargar**

**Recomendación: generar los dados por código.** No hace falta descargar modelos.

Por qué:
- Las 6 geometrías ya existen en three.js (salvo d10) → no hay binarios que versionar (LFS), ni licencias, ni CDN.
- **Control total del mapeo cara→valor.** Con un modelo externo (GLTF) hay que *descubrir* qué índice de cara es cada número; con geometría propia, la tabla se define en código y es testeable.
- Cumple local-first: nada se baja en runtime (ojo: `<Environment preset>` de drei **sí descarga HDRI de un CDN** → evitar; usar luces propias, ver §7).

Alternativa opcional (si se quiere arte externo): **KayKit Dice Pack** o **Kenney** (ambos **CC0**), importados como GLTF con `useGLTF`. Se deja como *skin* opcional posterior, no como base. Licencia a respetar: CC0 permite uso libre; igualmente conviene registrar atribución.

**No** se integra Dice So Nice! (módulo de Foundry, atado a su runtime; referencia funcional, no embebible — ver `AUDITORIA-VTT.md` §3.4).

---

## 2. Geometrías (procedural)

| Dado | Geometría three | Caras | Nota |
|---|---|---|---|
| d4 | `TetrahedronGeometry` | 4 triángulos | Lectura especial (§5) |
| d6 | `BoxGeometry` | 6 cuadrados | Caras opuestas suman 7 |
| d8 | `OctahedronGeometry` | 8 triángulos | |
| d10 | **custom** (trapezoedro pentagonal) | 10 "kites" | **No hay built-in** → construir a mano (o `ConvexGeometry` desde vértices) |
| d12 | `DodecahedronGeometry` | 12 pentágonos | |
| d20 | `IcosahedronGeometry` | 20 triángulos | |

**d10 es el caso especial:** three no trae trapezoedro. Se genera una malla con vértices del trapezoedro pentagonal estándar (dos pirámides pentagonales giradas 36°, caras cometa) y se le arma el collider convexo (§4) y el mapeo de caras (§5) igual que el resto.

Se trabaja con mallas **no indexadas** (`toNonIndexed()`) para tener normales por cara bien definidas, y se redondean levemente las aristas (`RoundedBox`/bisel o un `IcosahedronGeometry` base) para que la física y el sombreado se lean mejor.

---

## 3. Números en las caras

Dos vías, elegir una:

- **A (recomendada para MVP): "decals" procedurales.** Por cada cara, un pequeño `Mesh` con textura generada en `canvas` (el número) colocado en el centroide de la cara, desplazado un pelo a lo largo de la normal. Ventaja: independiente del UV de la geometría; fácil de skinnear; sirve en d4/d10.
- **B: atlas de textura + UV.** Un `CanvasTexture` por dado dividido en celdas por cara; requiere armar UVs por geometría. Más liviano en draw calls, más trabajo inicial.

La textura de número se genera con `document.createElement('canvas')` + `fillText` → `THREE.CanvasTexture` (sin archivos). Fuente y color = parte del *skin* (§7).

**Tabla de valores (contrato del dado):** por geometría se define `FACES: { normal: [x,y,z], value: number }[]`. Es la fuente de verdad para leer el resultado (§5) y para pintar los números (§3). Ejemplo d6: `+Y→1, -Y→6, +X→2, ...` (opuestas suman 7). Se versiona y se testea.

---

## 4. Física ("mini mesa")

**Motor:** dos candidatos compatibles con el stack (React 18 + R3F 8 + three 0.170):

- **`@react-three/rapier`** (sobre `@dimforge/rapier3d-compat`, WASM): bindings React oficiales, muy estable, buen rendimiento. Collider `ConvexHull` directo desde los vértices. **Contra:** WASM (~1–2 MB) y carga async.
- **`cannon-es`** (JS puro): sin WASM, integración simple con `useFrame`, footprint menor, `ConvexPolyhedron` desde vértices+caras. **Contra:** menos performante con muchas mallas (irrelevante para ≤10 dados).

**Recomendación:** `@react-three/rapier` si priorizamos fidelidad/mantenimiento; `cannon-es` si priorizamos bundle liviano y simplicidad. Decisión en §14.

**Montaje de la mesa (tray):**
- Un **piso** (collider plano + material fieltro) y **4 paredes bajas** (colliders estáticos) que contienen los dados → "mini mesa".
- **Gravedad** `-9.81` (o escalada según la escala del tray).
- Por dado: `RigidBody` con `ConvexHull`/`ConvexPolyhedron` + `mass`, `restitution ~0.3`, `friction ~0.4`, `linearDamping`/`angularDamping` bajos.
- **Impulso inicial**: `applyImpulse` + `applyTorqueImpulse` aleatorios (dirección hacia el centro de la mesa) para simular el "tirar".
- **Colisiones dado-dado y dado-pared** activas (efecto de choque).

**Detección de reposo:** cuando la velocidad lineal y angular de todos los dados caen bajo un umbral durante N frames (o timeout duro ~4 s) → se lee el resultado (§5). Timeout de seguridad para no colgar la UI.

**Determinismo:** la física es determinista dado el mismo estado inicial + timestep fijo; el azar viene del **impulso inicial**. Se puede sembrar un PRNG para reproducibilidad/tests. La validación en servidor es una fase posterior (`AUDITORIA-VTT.md` §2.1: hoy el back no valida).

---

## 5. Detección de resultado (cara superior)

- **Regla general:** al reposar, la cara cuya **normal, rotada al mundo, tiene mayor `dot` con `(0,1,0)`** (arriba) es la leída. Se busca esa normal en la tabla `FACES` → valor.
- **d6/d8/d12/d20/d10:** funciona directo.
- **d4:** no tiene cara "arriba" con cara plana (queda apoyado en una cara con un vértice hacia arriba). Convención a fijar (§14): leer **la cara inferior** (la que toca el piso) o **el valor del vértice superior**. Dice So Nice! muestra el vértice; hay que elegir y documentarlo.
- **d100 (percentil):** dos d10 (decenas + unidades); se define cuál es cuál (color/pintura distinta) y se combina `decenas*10 + unidades`, con `00`→100.

El valor leído **reemplaza** el `Math.random()` actual en cliente, conservando el contrato: `POST /api/campaigns/{id}/rolls` + stream de revisión/WS + toast. Nat20/nat1 siguen destacándose.

---

## 6. Animación realista (tirada a una mini mesa)

Para que se sienta como dados reales sobre una mesa:

- **Cámara:** una vista fija ligeramente inclinada sobre el tray (perspectiva ~40–50°), en su propio canvas **overlay** (modal "mesa de dados") — no necesariamente dentro de la escena del mapa. Esto aísla el coste y evita interferir con el render del mapa.
- **Entrada:** los dados "entran" desde arriba/fuera del borde con impulso → rebotan en el piso y las paredes, giran y frenan. Damping + fricción dan el decaimiento natural.
- **Sombras:** sombras suaves (`ContactShadows` de drei o shadow map suave con `PCFSoft`) anclan los dados a la mesa.
- **Settle:** micro-rebotes hasta el reposo; luego un "pop" sutil de la cara leída + highlight (mantiene el nat20/nat1).
- **Duración:** ~1.2–2 s. Botón "saltar animación" y **fallback `prefers-reduced-motion`** → resultado instantáneo, mismo valor.
- **Sin determinismo visual obligatorio:** el resultado sale de la física; si se quiere, se puede *forzar* el valor (tirar el dado ya orientado) — pero eso es "trampa" y solo como opción debug/determinista de test.

---

## 7. Skins / materiales

**Todo procedural y local-first.** Un *skin* = combinación de:
- **Material PBR** (`MeshStandardMaterial`/`MeshPhysicalMaterial`): `color`, `metalness`, `roughness`, `clearcoat` opcional, `emissive` para dados "mágicos".
- **Skin de número:** fuente, color y contorno de la textura generada en canvas (§3).
- **Dados especiales:** p. ej. piedra, hueso/marfil, obsidiana, rubí metálico, "arcano" (emissive + partículas).

**Iluminación/entorno:** usar luces propias (key + fill + rim) o `Lightformer` de drei. **Evitar `<Environment preset="...">`** porque **descarga HDRIs del CDN** (rompe local-first y suma red). Si se quiere reflejo realista, hornear un env-map chico local o usar `RoomEnvironment` de three (sin red).

**Modelo de skin (dato serializable y testeable):**

```
skin = {
  id, name, rarity: "common" | "legendary",
  material: { color, metalness, roughness, clearcoat, transmission, emissive, emissiveIntensity, ior },
  number:   { font, color, glow, engraved },
  edge:     { treatment: "smooth"|"rough"|"chamfer", color, width },
  maps:     { albedo?, roughness?, normal? },   // CanvasTexture generada, no archivos
  fx:       { type?: "glow"|"filaments"|"gems"|"circuit"|"portal"|"spark", color?, trigger?: "always"|"moving"|"crit" }
}
```

**Catálogo de skins** (todas procedurales; cada mapa/numero se dibuja en `canvas` y cada parámetro PBR se setea por código):

**Parte 1 — Básicas (rarity `common`, las usan por defecto):**

| # | Skin | Cómo se logra (procedural) |
|---|---|---|
| B1 | **Esquirla de Resina** | `transmission` + `ior` (resina translúcida); "inclusiones" = textura de ruido/partículas en el albedo, o partículas internas; números blanco/dorado/negro de alto contraste; bordes suaves |
| B2 | **Veta de Piedra** | albedo con ruido fractal (mármol/granito/malaquita/lapislázuli) en canvas; mate (`roughness` alto, `metalness` 0); números "tallados" (textura con bisel/inner-shadow) rellenos de dorado/plateado desgastado |
| B3 | **Bloque de Madera** | albedo con vetas de madera (degenerate noise / líneas sinusoidales); acabado barnizado (`clearcoat`); números pirograbados (oscurecidos) o tallados; bordes desgastados |
| B4 | **Forjado Sencillo** | metales comunes (hierro/acero/latón) con `metalness` alto y `roughness` medio; marcas de forja en la roughness map; números estampados; bordes rectos y pesados |

**Parte 2 — Temáticas (rarity `legendary`, estética Magitech / Arcana / Portal):**

| # | Skin | Cómo se logra + FX |
|---|---|---|
| T1 | **Mecanismo del Archivo** (relojería de bronce) | bronce envejecido: albedo metal + `roughness` con óxido; engranajes/remaches grabados en normal map; números rúnicos de latón `emissive`; `fx: gems` con indicador/esfera de reloj en la cara alta (emissive) |
| T2 | **Corriente de Vacío** (tecno-analógico) | hierro oscuro + cobre (dos materiales o máscara por cara); filamentos/bobinas en los bordes (emissive naranja); `fx: filaments`; "tubos de vacío" en las esquinas con parpadeo (`trigger: "moving"`) |
| T3 | **La Llave del DM** (hierro y cerraduras) | hierro fundido casi negro; patrones de cerradura/placas en normal map; números góticos angulares de oro viejo; ojo de cerradura como forma de número; `fx` bajo |
| T4 | **Fragmento del Vacío** (energía cósmica) | obsidiana/resina ultra-oscura `transmission`; nebulosa cian+violeta que fluye dentro (textura animada o shader simple); runas cian `emissive`; `fx: glow` halo violeta en los bordes del poliedro |
| T5 | **Orbital de Reliquia** (fusión magitech) | caras de cristal (núcleo cambiante cian↔violeta, animado) + exoesqueleto de oro/bronce calado en los **bordes** (segundo material); números de bronce + runas digitales `emissive`; `fx: circuit` líneas de luz hacia el núcleo |
| T6 | **La Senda de Mármol** (material del templo) | mármol blanco/gris desgastado + grietas en el normal map; en las grietas, `emissive` cian/violeta "pulsando" (`trigger: "always"`, animación de intensidad); runas en bajorrelieve rellenas de cian |
| T7 | **Memoria Viva** (cartas/pergamino) | albedo de pergamino en capas con resina; bordes reforzados con hilos de cobre + grapas de bronce (máscara de bordes); números caligráficos violeta `emissive`; `fx: spark` que enciende conexiones al azar `trigger: "moving"` |

**FX de crítico (éxito):** cuando el resultado es crítico (nat20 / crit), disparar el `fx` del skin: destellos, partículas de polvo, o el **portal girando dentro del dado** en las skins de energía (T4/T5). Implementable con sprites `additive` + `Points` (sin lib extra) o con `@react-three/postprocessing` (bloom) si se aprueba sumar esa dependencia — ver §14.

**Notas de implementación (local-first):**
- Todos los mapas son `CanvasTexture` generadas → **cero descargas**.
- Materiales translúcidos (`transmission`) son caros en GPU integrada → bajar a opacos en el fallback de hardware.
- El `glow`/bloom "de verdad" necesita postprocessing (hoy **no instalado**). Alternativa sin dependencia: `emissive` + halo con sprites `additive`, suficiente para MVP.

Extensible luego a **texturas de imagen subidas por el usuario** (skin custom).

---

## 8. Sonido y efectos

- **Clacks en colisión:** enganchar el evento de colisión del motor (`onCollisionEnter` en Rapier / evento `collide` en cannon) → reproducir SFX con volumen ∝ impulso; evitar spam (throttle).
- **SFX de aterrizaje/settle** al leer el resultado.
- Assets **CC0** locales (o sintetizados con WebAudio para no versionar binarios). Nada de CDN.

---

## 9. Rendimiento y fallbacks

- **Aislar el coste**: el tray de dados en su **propio Canvas R3F** (overlay), cargado por **dynamic import** → no entra en el bundle inicial (el chunk `three` ya pesa ~569 KB gz; ver `AUDITORIA-VTT.md` §5 y ROADMAP §12.1 code-split).
- **Fallback por hardware:** GPU integrada / muchos dados → `physics: on` pero con menos sub-steps, sin sombras suaves o sin física (solo animación reducida). Autodetección por heurística (WebGL renderer string) o setting del usuario.
- **Fallback por accesibilidad:** `prefers-reduced-motion` → resultado instantáneo.
- **Siempre disponible** el resultado numérico (chips) como respaldo: si el 3D falla, la tirada igual se registra.

---

## 10. Integración con la app

- Nuevo módulo de dados (componente + hook) que expone `rollPhysics({type, count, skin}) → Promise<{results, total}>`.
- `DiceRoller.tsx` pasa a usar ese hook en vez de `Math.random()`, manteniendo exactamente el mismo flujo de guardado/sync.
- El motor de física se **lazy-load** solo al abrir el roller (o al activar el flag `dice3d`).
- **Feature flag** `dice3d` (default off) para no arriesgar el render actual durante el desarrollo.

---

## 11. Plan por fases

### Fase 0 — Baseline (S)
- Congelar contrato actual de tiradas con tests de caracterización.
- Flag `dice3d` (default off).

### Fase 1 — Dados 3D cosméticos (M–L) ← MVP del pedido
- Geometrías d4/d6/d8/d10/d12/d20 + tabla `FACES` + números.
- Motor de física, mesa (piso+paredes), colisiones, rebotes, detección de reposo.
- Detección de cara superior → valor; d4 según convención elegida.
- Sonido de tirada; 1 skin básico; `prefers-reduced-motion`.

### Fase 2 — Mesa y sync (M)
- Tray overlay con cámara fija + sombras suaves; skins adicionales; config por usuario.
- d100 (2×d10).
- Respetar el stream de revisión/WS.

### Fase 3 — Reglas ligeras (M, requires aprobación)
- Modificadores, ventaja/desventaja, daño (rompe la decisión "sin modificadores", `docs/DICE-SYSTEM.md:144-150`).
- Opción de registrar/validar el resultado de física en el servidor.

### Fase 4 — Huecos VTT restantes (paralelizable)
- Chat de mesa, condiciones mecánicas, voice input DM, agentes IA reales (ver `AUDITORIA-VTT.md` §4).

---

## 12. Criterios de aceptación y pruebas

- **AC1:** existen las 6 geometrías; N unidades → N dados (1–10).
- **AC2:** colisiones/rebotes y reposo sin NaN ni dados atravesando el piso.
- **AC3:** el **valor registrado = cara superior leída** (test determinista con semilla fija).
- **AC4:** nat20/nat1 destacados; historial y toasts con contrato intacto.
- **AC5:** `prefers-reduced-motion` → instantáneo, mismo valor.
- **AC6:** GPU integrada dentro del `perf-budget.spec.ts`; bundle dentro del umbral acordado.
- **Pruebas:** unit del mapeo `FACES`→valor por geometría y de la detección de reposo; e2e extendiendo `tests/e2e/dice.spec.ts`; verificación visual con `tools.browser`.

---

## 13. Estimación relativa y dependencias

| Ítem | Complejidad | Depende de | Riesgo |
|---|---|---|---|
| Fase 0 baseline/flag | **S** | — | Bajo |
| Geometrías + tabla `FACES` + números | **M** | three/drei | Medio (caras d4/d10) |
| Física (Rapier o cannon-es) | **M–L** | elección de motor, code-split | Medio (bundle, determinismo) |
| Detección de reposo/cara | **M** | física | Medio |
| Tray + cámara + sombras | **M** | física | Bajo |
| d100 | **S** | d10 | Bajo |
| Skins (4 básicas + 7 temáticas) + FX crítico + sonidos | **M** | assets procedurales / WebAudio / ¿postprocessing? | Medio (bloom/translúcidos en GPU integrada) |
| Fallback reduced-motion / hardware | **S** | — | Bajo |
| Sync 3D en mesa (R3F) | **M** | stream de revisión/WS | Medio |
| Modificadores/ventaja | **M** | aprobación de producto | Medio |
| Validación server-side de dados | **M** | rediseño del endpoint | Medio |

Escala: **S** (días) · **M** (1–2 semanas) · **L** (2–4 semanas) · **XL** (mes+).

---

## 14. Decisiones tomadas (2026-10-10)

1. **Motor de física:** `@react-three/rapier` (bindings React oficiales, `ConvexHull` directo). Cargado por **dynamic import** al abrir el tray → el WASM no entra al bundle inicial.
2. **Lectura del d4:** **vértice superior**. El resultado es el número de la punta de arriba (coincide con la punta alta de las tres caras visibles). El d4 se lee por vértice, no por cara.
3. **Ubicación del render:** **tray propio** (mini mesa/caja 3D con skins) en overlay, NO dentro de la escena del mapa. Aísla el coste de física del render del mapa.
4. **Aleatoriedad:** **solo física en cliente** por ahora. Semilla reproducible para tests; validación server-side = fase posterior.
5. **Modificadores/ventaja:** **no** por ahora. Se mantiene la decisión "tiradas informativas y manuales" (`docs/DICE-SYSTEM.md:144-150`).
6. **Skins:** **solo presets procedurales** (4 básicas + 7 temáticas, §7). Texturas subidas por el usuario = futuro.
7. **Bloom:** **`emissive` + sprites `additive`**, sin `@react-three/postprocessing` (evita dep nueva y costo en GPU integrada).

---

## 15. UX de la mesa de dados (spec)

Al pedir una tirada, se abre un **panel "mesa de dados"** (modal overlay, centrado):

- **Columna izquierda — tipos de dado:** lista vertical (d4, d6, d8, d10, d12, d20 y **d100 = 2×d10**). Click en un tipo → **aparece un dado flotando inmóvil** sobre la mesa.
- **Sumar dados:** cada click extra (en cualquier tipo) **suma otro dado** flotante a la mesa. **Tope 15 dados** por tirada (protege FPS); al llegar, sumar se desactiva con aviso.
- **Zona central/derecha — la caja/mesa 3D (pool):** donde caen los dados, con skin propia. Encima flotan los dados ya elegidos.
- **Botón "Tirar"** (centrado): suelta los dados desde arriba hacia el centro de la mesa. Física real: rebotes contra piso y paredes, colisiones dado-dado, frenado y reposo.
- **Al reposar:** se lee la cara superior (d4 = vértice superior), se resalta el resultado, y la tirada se registra con el **contrato existente** (endpoint + historial + toast). Los dados vuelven a la posición de espera.
- **Controles:** "quitar último dado" y "vaciar mesa"; indicador de cuántos y de qué tipo hay.
- **Fallbacks:** `prefers-reduced-motion` → resultado instantáneo, mismo valor. GPU integrada / muchos dados → menos sub-steps de física y/o sin sombras suaves.
- **Luces propias** + `RoomEnvironment` de three. **Nunca** `<Environment preset>` de drei (descarga HDRI del CDN → rompe local-first).

**Núcleo determinista (esta fase):** `apps/dm/src/lib/dice3d.ts` construye las geometrías procedurales (d4–d20) y expone la tabla `FACES` (normal → valor) + `readResult(quaternion)`; es la fuente única que usan tanto la lectura del resultado como el pintado de los números.
