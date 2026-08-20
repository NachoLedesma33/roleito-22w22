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

### 15.1 Estructura de assets de prueba

```text
tests/
  assets/
    maps/
      tavern-interior.jpg      ← mapa de taberna con grilla
      forest-clearing.jpg      ← mapa de claro del bosque
      dungeon-room.jpg         ← mapa de mazmorra
    portraits/
      warrior-male.png         ← retrato de guerrero
      mage-female.png          ← retrata de maga
      rogue-male.png           ← retrato de pícaro
      cleric-female.png        ← retrata de clériga
      orc-npc.png              ← retrato de orco NPC
      goblin-npc.png           ← retrato de goblin NPC
      undead-skeleton.png      ← retrato de no-muerto
    tokens/
      warrior-token.png        ← token circular para el mapa
      mage-token.png
      rogue-token.png
      orc-token.png
      goblin-token.png
    README.md                  ← créditos y licencias de cada asset
```

### 15.2 Script de descarga

```bash
#!/bin/bash
# tests/assets/download-demo-assets.sh
# Descarga assets CC0/CC-BY para tests y demos.
# Ejecutar una vez: bash tests/assets/download-demo-assets.sh

ASSET_DIR="$(dirname "$0")"
mkdir -p "$ASSET_DIR/maps" "$ASSET_DIR/portraits" "$ASSET_DIR/tokens"

echo "=== Downloading demo assets ==="

# --- MAPS (battle maps con grilla) ---
# 2-Minute Tabletop — CC-BY-NC 4.0 — https://2minutetabletop.com
echo "[1/5] Maps from 2-Minute Tabletop..."
curl -sL "https://2minutetabletop.com/wp-content/uploads/2019/03/Tavern-Inn-Battle-Map.jpg" \
  -o "$ASSET_DIR/maps/tavern-interior.jpg"
curl -sL "https://2minutetabletop.com/wp-content/uploads/2018/10/Forest-Clearing-Battle-Map.jpg" \
  -o "$ASSET_DIR/maps/forest-clearing.jpg"

# Dice Grimorium — libre para uso personal — https://dicegrimorium.com
echo "[2/5] Maps from Dice Grimorium..."
curl -sL "https://dicegrimorium.com/wp-content/uploads/2021/02/dungeon-room-map.jpg" \
  -o "$ASSET_DIR/maps/dungeon-room.jpg"

# --- PORTRAITS (retratos de personajes) ---
# OpenGameArt.org CC0 Portraits — https://opengameart.org/content/cc0-portraits
echo "[3/5] CC0 portraits from OpenGameArt..."
curl -sL "https://opengameart.org/sites/default/files/warrior_portrait_cc0.png" \
  -o "$ASSET_DIR/portraits/warrior-male.png"

# kiddolink Fantasy NPC Pack — CC0 — https://kiddolink.itch.io/fantasy-npc-non-playable-characters-pack
echo "[4/5] NPC portraits from kiddolink (CC0)..."
# Descarga manual requerida (itch.io), copiar a portraits/ después

# oicaroh Fantasy Character Portrait Pack — Free — https://oicaroh.itch.io/medieval-fantasy-character-portraits
echo "[5/5] Character portraits from oicaroh (Free)..."
# Descarga manual requerida (itch.io), copiar a portraits/ después

# --- TOKENS (portraits recortados para el mapa) ---
# rpg-token-borders — MIT — https://github.com/TuringHuang/rpg-token-borders
echo "Token borders available at: https://rpgtokenmaker.com"
echo "(manual: paste portrait URL → export circular PNG token)"

echo ""
echo "=== Done ==="
echo "Manual steps needed:"
echo "  1. Download kiddolink NPC pack: https://kiddolink.itch.io/fantasy-npc-non-playable-characters-pack"
echo "  2. Download oicaroh portraits: https://oicaroh.itch.io/medieval-fantasy-character-portraits"
echo "  3. Copy portrait PNGs to tests/assets/portraits/"
echo "  4. Use https://rpgtokenmaker.com to generate circular tokens"
echo "  5. Copy tokens to tests/assets/tokens/"
```

### 15.3 Fuentes de assets y licencias

| Fuente | Tipo | Licencia | Cantidad | URL |
|--------|------|----------|----------|-----|
| 2-Minute Tabletop | Battle maps | CC-BY-NC 4.0 | 200+ maps | https://2minutetabletop.com/gallery/ |
| Dice Grimorium | Battle maps | Uso libre (personal) | 50+ maps | https://dicegrimorium.com/free-rpg-map-library/ |
| OpenGameArt.org | Portraits | CC0 (dominio público) | Variable | https://opengameart.org/content/cc0-portraits |
| kiddolink | NPC portraits + sprites | CC0 | 18 NPCs | https://kiddolink.itch.io/fantasy-npc-non-playable-characters-pack |
| oicaroh | Character portraits | Free (credit) | 5 portraits | https://oicaroh.itch.io/medieval-fantasy-character-portraits |
| jira77 | Fantasy portraits | Free | 50 portraits | https://jira77.itch.io/50-fantasy-portraits-free |
| rpg-token-borders | Token frames SVG | MIT | 15 borders | https://github.com/TuringHuang/rpg-token-borders |
| rpgtokenmaker.com | Token generator | Gratis | Ilimitado | https://rpgtokenmaker.com |

### 15.4 Uso en tests

Los assets se cargan via API en el fixture de campaña:

```ts
// tests/fixtures/campaign-fixture.ts
import path from 'path';
import fs from 'fs';

const ASSETS_DIR = path.resolve(__dirname, '../assets');

export async function seedDemoData(request: APIRequestContext, campaignId: string) {
  // Upload map to scene
  const mapFile = fs.readFileSync(`${ASSETS_DIR}/maps/tavern-interior.jpg`);
  // → POST /campaigns/{id}/scenes/{sceneId}/upload-background

  // Create characters with portraits
  const portrait = fs.readFileSync(`${ASSETS_DIR}/portraits/warrior-male.png`);
  // → POST /campaigns/{id}/characters + upload portrait

  // Create NPCs
  const npcPortrait = fs.readFileSync(`${ASSETS_DIR}/portraits/orc-npc.png`);
  // → POST /campaigns/{id}/npcs + upload portrait
}
```

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
