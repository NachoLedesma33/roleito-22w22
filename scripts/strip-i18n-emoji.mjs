/**
 * Saca los emoji de los default strings de los keys que ahora llevan icono
 * lucide. El default es lo que se ve si el diccionario no trae la clave, pero
 * aca el diccionario SI la trae: sin tocarla, el boton sigue mostrando el
 * emoji y los locators de e2e siguen matcheando el texto viejo.
 *
 * Uso: node scripts/strip-i18n-emoji.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const KEYS = [
  'build',
  'clearFog',
  'clearLights',
  'clearWalls',
  'clearZones',
  'detectWalls',
  'detecting',
  'drawWall',
  'fogBrush',
  'fogRect',
  'fogZone',
  'hintAttachPick',
  'hintAttachStart',
  'hintDrawDoor',
  'hintDrawWall',
  'hintFogRect',
  'hintPaintFog',
  'hintPlaceLight',
  'hintPortalA',
  'hintPortalB',
  'hintZoneFog',
  'hintZonePoly',
  'hintZoneRect',
  'lightPlace',
  'placeDoor',
  'portalZone',
  'sceneBtn',
  'sceneNotes',
  'zonePolygon',
  'zoneRect',
  'zonesBtn',
];

/**
 * Quita el glifo del PRINCIPIO y los separadores de cola (` ▾`). Deja el texto.
 * No toca los que están en el medio (`:v:`, `·`).
 */
function strip(s) {
  return s
    .replace(/^[\s\uFE0F\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}]+\s*/u, '')
    .replace(/^[\uFE0F]+\s*/u, '')
    .replace(/\s*[▾▼]\s*$/u, '')
    .trim();
}

/** Etiquetas que cambian de texto (no solo pierden el emoji). */
const RENAME = {
  fogZone: { es: 'Niebla de zona', en: 'Zone fog' },
};

for (const loc of ['es', 'en']) {
  const path = resolve(`apps/dm/src/locales/${loc}/translation.json`);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  for (const key of KEYS) {
    const rename = RENAME[key]?.[loc];
    const cur = json.dm?.[key];
    if (rename) {
      json.dm[key] = rename;
      console.log(`${loc}/dm.${key}: ${JSON.stringify(cur)} -> ${JSON.stringify(rename)}`);
      continue;
    }
    if (typeof cur !== 'string') continue;
    const next = strip(cur);
    if (next !== cur) {
      json.dm[key] = next;
      console.log(`${loc}/dm.${key}: ${JSON.stringify(cur)} -> ${JSON.stringify(next)}`);
    }
  }
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}