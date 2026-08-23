# E2E Test Plan — Playwright

> Plan de tests end-to-end para Roleito DM Dashboard.
>
> Estado: SIN IMPLEMENTAR. Esperando aprobación del usuario.

---

## 1. Setup

### Stack

```text
Playwright (browser automation)
Vitest o Jest (unit, futuro)
Python pytest (backend API tests, futuro)
```

### Dependencias a instalar

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Estructura propuesta

```text
tests/
  e2e/
    campaign.spec.ts
    character.spec.ts
    npc.spec.ts
    scene.spec.ts
    session.spec.ts
    dashboard.spec.ts
    dice.spec.ts
    notebook.spec.ts
    map.spec.ts
    recap.spec.ts
    character-sheet.spec.ts
  fixtures/
    campaign-fixture.ts    ← setup/teardown de campaña de prueba
  helpers/
    api-helpers.ts         ← helpers para crear datos vía API
    selectors.ts           ← selectores reutilizables
playwright.config.ts
```

### Configuración

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,       // visible durante desarrollo
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev:dm',
      port: 5173,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev:backend',
      port: 8000,
      reuseExistingServer: true,
    },
  ],
});
```

### Fixture de campaña

Cada test suite crea una campaña limpia via API y la borra al final.

```ts
// tests/fixtures/campaign-fixture.ts
import { test as base } from '@playwright/test';

type Fixtures = {
  campaignId: string;
};

export const test = base.extend<Fixtures>({
  campaignId: async ({ request }, use) => {
    const res = await request.post('http://localhost:8000/api/campaigns', {
      data: { name: `Test Campaign ${Date.now()}`, description: 'E2E test' },
    });
    const campaign = await res.json();
    await use(campaign.id);
    await request.delete(`http://localhost:8000/api/campaigns/${campaign.id}`);
  },
});

export { expect } from '@playwright/test';
```

---

## 2. Suite: Campaign CRUD

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| C1 | Crear campaña | Click "New Campaign" → nombre → submit | Redirige a campaign detail |
| C2 | Listar campañas | Navegar a /campaigns | Campañas visibles en la lista |
| C3 | Editar campaña | Campaña existente → edit → cambiar nombre → save | Nombre actualizado |
| C4 | Eliminar campaña | Campaña existente → delete → confirm | Desaparece de la lista |

---

## 3. Suite: Character CRUD

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| CH1 | Crear personaje | CharacterForm → nombre, clase, raza, VIDA → save | Aparece en CharacterList |
| CH2 | Editar personaje | CharacterDetail → cambiar nombre → save | Nombre actualizado |
| CH3 | Eliminar personaje | CharacterList → delete → confirm | Desaparece de la lista |
| CH4 | Subir portrait | CharacterDetail → click portrait → upload image | Portrait visible |
| CH5 | VIDA completa | Crear personaje con vigor/4, dex/5, int/3, cunning/2 | max_pv=16, max_pm=12, defense=5 |

---

## 4. Suite: NPC CRUD

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| N1 | Crear NPC | NPCForm → nombre, tipo → save | Aparece en NPCList |
| N2 | Editar NPC | NPCDetail → cambiar descripción → save | Descripción actualizada |
| N3 | Eliminar NPC | NPCList → delete → confirm | Desaparece |

---

## 5. Suite: Scene Management

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| S1 | Crear escena | SceneList → "New Scene" → nombre → save | Escena creada |
| S2 | Subir background | SceneDetail → upload BG → select image | Background visible en el renderer |
| S3 | Auto-crear escena | Dashboard sin escenas → upload BG | Crea "Scene 1" automáticamente |
| S4 | Eliminar escena | SceneList → delete → confirm | Desaparece |
| S5 | Asignar mapa a escena | Dropdown de mapa en TopBar → seleccionar | Escena vinculada al mapa |

---

## 6. Suite: Dashboard (VTT Core)

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| D1 | Carga campaña | Navegar a dashboard con campaignId válido | Campaña cargada, escenas listadas |
| D2 | Seleccionar escena | Click en escena de la lista | Escena activa, renderer muestra BG |
| D3 | Placer personaje en escena | Drag & drop o click en personaje → escena | Token visible en el renderer |
| D4 | Mover token | Drag token en el renderer | Token cambia posición |
| D5 | Seleccionar token | Click en token | CharacterSheet abre con datos correctos |
| D6 | TopBar shortcuts | Press D → DiceRoller abre, Escape → cierra | Abre y cierra correctamente |
| D7 | Notebook shortcut | Press N → Notebook abre, Escape → cierra | Abre y cierra correctamente |
| D8 | Recap shortcut | Press R → Recap abre, Escape → cierra | Abre y cierra correctamente |

---

## 7. Suite: Initiative Tracker

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| I1 | Abrir tracker | Click en Initiative button | Panel visible con personajes de la escena |
| I2 | Roll initiative | Click "Roll" en un personaje | Valor d20 + modificador, ordenado descendente |
| I3 | Next turn | Click "Next" | Highlight avanza al siguiente personaje |
| I4 | Reset | Click "Reset" | Turno vuelve al primero |

---

## 8. Suite: Dice Roller

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| DR1 | Abrir roller | Press D | Panel visible |
| DR2 | Roll d20 | Seleccionar d20, count 1, click Roll | Resultado 1-20, historial actualizado |
| DR3 | Roll multiple | d6, count 4 → Roll | 4 resultados mostrados |
| DR4 | Nat20 highlight | Roll hasta nat20 (o mock) | Highlight especial en nat20 |
| DR5 | Cerrar con Escape | Presionar Escape | Panel se cierra |

---

## 9. Suite: DM Notebook

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| NB1 | Crear nota | Click "+ New Note" | Note editor visible |
| NB2 | Editar nota | Type título y contenido → Save | Nota guardada, aparece en lista |
| NB3 | Filtrar por categoría | Click "Rules" filter | Solo notas de tipo Rules visibles |
| NB4 | Pin/Unpin | Click pin icon | Nota pinned aparece primero |
| NB5 | Version history | Editar nota → History → ver versiones | Versión anterior visible con opción Restore |
| NB6 | Restore version | Click Restore en una versión | Contenido restaurado |
| NB7 | Eliminar nota | Delete → confirm | Nota desaparece |

---

## 10. Suite: Map System

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| M1 | Ver mapa | Click 🗺 button con escena vinculada | MapViewer abre con imagen |
| M2 | Zoom | Mouse wheel | Zoom in/out funciona |
| M3 | Pan | Click-drag en mapa | Mapa se mueve |
| M4 | Place marker | Click en mapa → fill form → save | Marker visible |
| M5 | Edit marker | Double-click marker → cambiar label | Label actualizado |
| M6 | Delete marker | Click delete en marker | Marker removido |
| M7 | Assign map to scene | Select map from dropdown | scene.map_id actualizado |
| M8 | Unassign map | Select "None" from dropdown | scene.map_id = null |

---

## 11. Suite: Recap System

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| R1 | Abrir recap | Press R | Panel visible |
| R2 | Select session | Dropdown de sesión | Eventos de esa sesión cargados |
| R3 | Edit summary | Click en texto del resumen → editar | Texto editado visible |
| R4 | Export | Click "Export .md" | Descarga archivo .md |

---

## 12. Suite: Character Sheet HUD

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| CS1 | Abrir sheet | Click en token | Sheet abierto con stats correctos |
| CS2 | Tab Stats | Click tab "Stats" | VIDA, PM, attrs visibles |
| CS3 | Tab Inventory | Click tab "Inventory" | Lista de items visible |
| CS4 | Add inventory item | Click "+ Item" → fill → save | Item en la lista |
| CS5 | Toggle equipped | Click "equipped" toggle | Estado cambia |
| CS6 | Tab Spells | Click tab "Spells" | Lista de spells visible |
| CS7 | Add spell | Click "+ Spell" → fill → save | Spell en la lista |
| CS8 | PV control | Click + / - en PV | current_pv cambia |

---

## 12b. Suite: Scene Transitions

> FASE 8. Una transición = marcador `transition` con `target_scene_id`.
> Los mapas de estos tests se suben como SVG de 600x400 (`createSizedMap`):
> con imágenes de 1px el wrapper del mapa es degenerado y los markers/popup
> caen fuera del viewport.

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| TR1 | Crear transición con retorno | Add Marker → tipo Transition → click mapa → elegir destino → Create | Marker en origen + marcador de retorno en mapa destino apuntando a escena actual |
| TR2 | Travel cambia de escena | Click en marker → Travel | Escena activa = destino y viewer reabierto con mapa destino |
| TR3 | Puerta de retorno | Viajar → click retorno → Travel | Vuelve a escena/mapa originales |
| TR4 | Sin checkbox retorno | Crear transición con retorno desmarcado | Solo 1 marker; mapa destino sin markers |

---

## 13. Suite: API Health

| # | Test | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| A1 | Health check | GET /health | 200 OK |
| A2 | CORS headers | OPTIONS request from localhost:5173 | Access-Control-Allow-Origin presente |
| A3 | 404 handling | GET /api/nonexistent | 404 with JSON detail |

---

## 14. CI/CD (futuro)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 15. Test Assets — Descarga de demos

> **Estado**: implementado. Los binarios viven en `tests/assets/` (gitignored,
> regenerables según `tests/assets/README.md`).

### 15.1 Estructura de assets de prueba (real)

```text
tests/
  assets/
    maps/
      tavern-1536.jpg              ← Dice Grimorium, taberna nevada (1536x1024)
      forest-wilderness-1024.jpg   ← Dice Grimorium, bosque con río (1024x1536)
      dungeon-crypt-1024.jpg       ← Dice Grimorium, cripta (1024x1536)
    portraits/
      velazquez_portraits/         ← pack "30 Painted Portraits" (OGA, dominio público)
        female_01.png ... male_17.png
    README.md                      ← créditos, URLs de descarga y validación anti-truncado
```

### 15.2 Descarga y validación

Ver `tests/assets/README.md`. Reglas aprendidas:

- Dice Grimorium corta conexiones en archivos `-scaled` grandes → pedir siempre
  variantes `-1024x1536` / `-1536x1024`.
- Un JPEG truncado decodifica parcial en el browser → textura negra con
  `WebGL INVALID_VALUE: texSubImage2D: bad image data`, sin error visible en curl.
- Validar todo download con GDI+ (`System.Drawing.Image.FromFile`) o equivalente
  antes de usarlo.
- URLs viejas (2minutetabletop, itch.io manual) muertas o no automatizables: no usar.

### 15.3 Fuentes de assets y licencias

| Fuente | Tipo | Licencia | URL |
|--------|------|----------|-----|
| Dice Grimorium | Battle maps gridded | Uso libre (personal) | https://dicegrimorium.com/free-rpg-map-library/ |
| Velázquez Portraits via OpenGameArt | Retratos pintados | Dominio público | https://opengameart.org/content/30-painted-portraits |

### 15.4 Uso en tests (implementado)

Helpers en `tests/helpers/api-helpers.ts`:

```ts
loadAsset(relPath)                    // lee binario de tests/assets/, lanza si falta
assetExists(relPath)                  // para test.skip() si no se descargaron
uploadBackground(request, cid, sid, file)
uploadPortrait(request, cid, 'character' | 'npc', entityId, file)
```

- `PNG_1PX` queda solo para tests de mecánica CRUD/upload (scene, map, character).
- Los specs de dashboard usan el mapa real de taberna cuando está disponible.
- Test `D9 @showcase` (dashboard.spec.ts) verifica end-to-end con imágenes reales:
  background decodifica con variedad de colores (no plano negro), retrato de token
  responde 200 desde `/api/static/`, y la consola no registra errores WebGL
  (`texSubImage` / `INVALID_VALUE`). Se salta con skip si faltan los assets.

### 15.5 Showcase mode (demo visual)

Para screenshots y demos, usar la campaña seed con todos los assets:

```bash
# Crear campaña demo con datos reales
npm run test:e2e -- --grep "@showcase"
```

Tests etiquetados con `@showcase` generan screenshots de alta calidad para:
- README del proyecto
- Documentación
- Marketing / pitches

### 15.6 Notas

- Assets descargados se agregan a `.gitignore` (demasiado pesados para repo)
- Solo committed si son < 100KB cada uno
- Scripts de descarga sí se commitean
- Licencias verificadas: todo CC0, CC-BY, MIT, o Free-for-use
- Si un asset requiere attribution, se documenta en `tests/assets/README.md`

---

## 16. Prioridad de implementación

```text
FASE 1 — Critical Path (bloquea uso real)
  C1-C4    Campaign CRUD
  CH1-CH5  Character CRUD
  S1-S3    Scene management
  D1-D2    Dashboard load + scene select
  D3-D4    Token placement + movement

FASE 2 — Core Features
  D5-D8    Shortcuts + panels
  I1-I4    Initiative tracker
  DR1-DR5  Dice roller
  CS1-CS8  Character sheet

FASE 3 — Secondary
  N1-N3    NPC CRUD
  M1-M8    Map system
  R1-R4    Recap system
  NB1-NB7  Notebook

FASE 4 — Polish
  A1-A3    API health
  CI/CD setup
```

---

## 17. Notas

- Cada suite asume campaña de prueba limpia (fixture)
- Tests no deben depender entre sí (orden independiente)
- Datos seed via API, no via UI (más rápido y confiable)
- Screenshots en fallo para debug
- Trace en primer retry para investigación
