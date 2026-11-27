# 22W22 — Plan de audio ambiental (catálogo libre)

Documento de investigación. **No importa assets ni modifica la app.** Todo lo listado acá es candidato a evaluar; nada se descarga ni se commitea sin revisión de licencia ítem por ítem y confirmación explícita.

Objetivo: cubrir ambientación medieval/fantasía, sci-fi/retro/techno, combate, suspenso/horror y campaña normal con el mayor número de packs libres posible, con licencia y atribución claras.

## 1. Reglas de licencia (matriz rápida)

Interpretación de licencias según Fuente/FAQ oficial (ver §7).

| Licencia | Uso comercial | Atribución | Modificar | Nota para 22W22 |
|---|---|---|---|---|
| **CC0 / Public Domain** | Sí | No | Sí | Preferida. Sin obligaciones. |
| **CC BY 4.0** | Sí | **Sí (visible)** | Sí | Requiere crédito exacto en UI o archivo de créditos. |
| **CC BY-NC 4.0** | **No** | Sí | Sí | **_descartar_**: 22W22 es local-first pero cualquier monetización/distribución rompe NC. |
| **Sampling+ (legacy Freesound)** | Restringido | Sí | Parcial | **descartar**: licencia retirada por CC, ambigua. |
| **Royalty-free de store (Mixkit/Pixabay/itch "commercial use")** | Sí, según términos | Varía | Sí | Tratar como "marketing" hasta leer el texto legal completo. |
| **OGA-BY / CC-BY-SA / GPL (OpenGameArt)** | Sí | Sí | Sí, con condiciones | Revisar share-alike: puede contagiar el asset derivado. Evitar SA si se recorta/mezcla. |

Defaults del doc: preferir **CC0**; si no hay CC0, **CC BY con crédito visible**; **nunca CC BY-NC ni Sampling+**. "Sin copyright" / "royalty-free" se cree solo cuando el texto legal lo dice.

## 2. Catálogo por fuente

### 2.1 Kenney — CC0, sin atribución

Fuente: `https://kenney.nl/assets/category:Audio`. Todos los packs CC0 verificados en página individual. Formatos típicos `.ogg`/`.wav`. Descarga directa o bundle `https://kenney.itch.io/kenney-game-assets`.

| Pack | Cantidad | URL | Uso recomendado |
|---|---|---|---|
| RPG Audio | 50× | `https://kenney.nl/assets/rpg-audio` | Pasos, armas, cofres, UI medieval |
| Sci-fi Sounds | 70× | `https://kenney.nl/assets/sci-fi-sounds` | Motores, puertas, láseres, computadoras |
| Impact Sounds | 130× | `https://kenney.nl/assets/impact-sounds` | Golpes, combate, impactos |
| Digital Audio | 60× | `https://kenney.nl/assets/digital-audio` | UI retro, confirmaciones, glitches |
| Music Jingles | 85× | `https://kenney.nl/assets/music-jingles` | stingers de evento, logros |
| Interface Sounds | 100× | `https://kenney.nl/assets/interface-sounds` | Clics, hover, tabs |
| UI Audio | 50× | `https://kenney.nl/assets/ui-audio` | Sonidos de menú |
| Casino Audio | 50× | `https://kenney.nl/assets/casino-audio` | Dados, fichas, ruleta (tiradas de dados) |
| Voiceover Pack (Fighter) | 45× | `https://kenney.nl/assets/voiceover-pack-fighter` | Reacciones de combate |
| Voiceover Pack | 90× | `https://kenney.nl/assets/voiceover-pack` | Reacciones genéricas |

Fase 0 confirmó licencia CC0 y cantidades de todos los packs Kenney listados. Fuente de verdad: `docs/audio/CREDITS.md`.

### 2.2 itch.io — packs free (licencia por pack)

Fuente maestra: `https://itch.io/game-assets/free/tag-audio` (~1,348 resultados). **La licencia itch.io es declarada por cada autor**: leer el campo Legal/License de cada página antes de importar.

| Pack (autor) | Contenido | URL | Licencia declarada / estado |
|---|---|---|---|
| FREE Music Loop Bundle (Tallbeard Studios) | 200+ loops seamless | `https://tallbeard.itch.io/music-loop-bundle` | **CC0** confirmado |
| 400+ Sounds Pack (Chequered Ink) | 400+ SFX | `https://ci.itch.io/400-sounds-pack` | Propia: comercial OK, crédito opcional; no revender assets sin alterar |
| Free Fantasy 200 SFX Pack (TomMusic) | 200 SFX fantasy | `https://tommusic.itch.io/free-fantasy-200-sfx-pack` | Royalty-free: comercial OK, crédito opcional; sin reventa |
| 200 Free SFX (Kronbits) | 200 SFX | `https://kronbits.itch.io/freesfx` | **CC0** confirmado |
| High Quality 16-bit RPG Music (HydroGene) | ~28 temas SNES-style | `https://hydrogene.itch.io/high-quality-16-bit-music` | **CC0** confirmado |
| Minifantasy — Dungeon Audio Pack (Leohpaz) | 62 SFX + 2 music | `https://leohpaz.itch.io/minifantasy-dungeon-sfx-pack` | Propia: comercial OK, crédito opcional |
| [BGM] Ambiences Music Pack (JDSherbert) | 10 temas / 40 archivos | `https://jdsherbert.itch.io/ambiences-music-pack` | Royalty-free propio, comercial OK, **crédito obligatorio** |
| 8-bit / 16-bit Sound Effects x25 (JDWasabi) | 25 SFX | `https://jdwasabi.itch.io/8-bit-16-bit-sound-effects-pack` | Propia: comercial OK, usar/editar; crédito considerado |
| Interface SFX Pack 1 (ObsydianX) | SFX UI | `https://obsydianx.itch.io/interface-sfx-pack-1` | **CC0** confirmado |
| Horror SFX Volume 1 (ObsydianX) | SFX, drones, stingers | `https://obsydianx.itch.io/horror-sfx-volume-1` | **CC BY 4.0** confirmado — crédito obligatorio |
| Pink Bloom Synthwave Music Pack (David KBD) | synthwave | `https://davidkbd.itch.io/pink-bloom-synthwave-music-pack` | **CC BY 4.0** confirmado — crédito obligatorio |
| Code Injection Dark Techno Music Pack (David KBD) | dark techno | `https://davidkbd.itch.io/code-injection-dark-techno-music-pack` | **CC BY 4.0** confirmado — crédito obligatorio |
| Soundscape and Ambient Music Pack: LOST (MakotoHiramatsu) | soundscape ambient | `https://makotohiramatsu.itch.io/lost` | **CC BY 4.0** confirmado — crédito obligatorio |
| North Sea (MakotoHiramatsu) | soundscape ambient | `https://makotohiramatsu.itch.io/north-sea` | **CC BY 4.0** confirmado — crédito obligatorio |
| 1644 Sound Effects (Nox) | 1644 SFX | `https://nox.itch.io/1644-sound-effects` | **DESCARTADO** — link 404 |
| sonatina (música) | música libre | `https://sonatina.itch.io/` | **DESCARTADO** — sin licencia expuesta |

David KBD también publicó packs de **metal sci-fi** y **horror**; **DESCARTADOS en Fase 0** por no verificar individualmente. Solo Pink Bloom y Code Injection aprobados. Fase 0 cerró esta tabla: `docs/audio/CREDITS.md` es la fuente de verdad.

### 2.3 Freesound — licencia POR SONIDO

Fuente: `https://freesound.org/`. Cada sound tiene su propia licencia: **CC0 / CC BY 4.0 / CC BY-NC 4.0** (+ legacy Sampling+). Filtrar en búsqueda: `f=license:"Creative Commons 0"`. Formatos: mp3, FLAC, Ogg, WAV/AIFF. **Nunca mezclar NC en 22W22.** Crédito obligatorio para CC BY (plantilla §4).

Búsquedas y hallazgos medievales (CC0):

- `https://freesound.org/search/?q=medieval%20ambience&f=license%3A%22Creative%20Commons%200%22`
  - `Pirate Tavern` 1:01 — taberna
  - `AMBIENCE-EXTERIOR-EVENING-FRIAS_EBRO_RIVER...` 8:28 — exterior
  - `medieval_village_atmosphere.wav` 0:40 — loopable, aldea
  - `Troubadour_01B.wav` 4:39 — música
  - `Big Medieval Door - open and close` 0:13 — puerta
- Autor útil: `InspectorJ` — `https://freesound.org/people/InspectorJ/sounds/` (miles de sounds; **ojo**: muchos son CC BY, no CC0 — verificar cada uno). Fase 0 verificó `Heartbeat, Regular, Single, LOOP` (0:02, CC BY 4.0) y `Radio, Noise, Long-Wave, LOOP` (0:04, CC BY 4.0); ambos en `docs/audio/CREDITS.md`. Resto (glitch, zorros/ranas) **sin verificar** — no importar.

Nota Freesound: si un sound termina en un video con Content ID, la defensa es link al sound + fecha. No aplica a 22W22 salvo que se exporten videos.

### 2.4 OpenGameArt — licencia POR ITEM

Fuente: `https://opengameart.org/` (directo 403; usar `https://r.jina.ai/https://opengameart.org/...`). Licencias mezcladas: CC0, CC-BY, OGA-BY, GPL, CC-BY-SA. Verificar cada submission.

- `https://opengameart.org/content/medieval-sound-effects-weapon-impacts` — **CC0** (StillNorthMedia / FreeFirearmSFX vía Archive.org). ~48 impactos: Axe, Katana, Norse Sword, Sabre, Spear, Dagger, Mace, Seax → combinaciones blade/haft/hilt. Ideal combate medieval.
- `https://opengameart.org/content/medieval-sound-effects-weapon-textures` — **CC0** confirmado en Fase 0.
- `https://opengameart.org/content/the-free-firearm-sound-library` — **CC0** confirmado en Fase 0.
- Búsqueda: `https://opengameart.org/art-search-advanced?keys=medieval&field_art_type_tid%5B%5D=13`.
- Otros resultados: `Chipper Chopper Upper`, `Superpowers assets sound effects` (verificar licencia).

### 2.5 Mixkit — royalty-free, sin atribución

Fuente: `https://mixkit.co/free-sound-effects/`. Clips listos para usar, sin signup, sin atribución. **Fase 0 extrajo el texto legal del modal** `https://mixkit.co/license/modal/sfxFree/`: comercial OK, modificar/distribuir en videojuegos OK; **no redistribuir el clip suelto**, no registrar como propio.

⚠️ **Stock Music Free License NO permite video games** (`https://mixkit.co/license/modal/musicFree/`): DESCARTADA para 22W22. Solo se aprueban SFX.

Ejemplos detectados: `Arcade retro game over`, `Crickets and insects in the wild ambience`, `Fast rocket whoosh`, `Game show suspense waiting`, `Retro game emergency alarm`, `Cinematic transition swoosh heartbeat trailer`.

Uso: stingers, transiciones, ambientes de exterior, retro arcade, suspenso.

### 2.6 Pixabay — licencia propia, sin atribución

Fuentes: `https://pixabay.com/music/search/medieval/` (1,818+ resultados Medieval), `https://pixabay.com/service/license-summary/`, full: `https://pixabay.com/service/terms/`.

Permite: **gratis, sin atribución, modificar/adaptar**. Prohíbe: vender/distribuir **standalone** (sin esfuerzo creativo), usar marcas/logos reconocibles con fines comerciales, uso inmoral/ilegal/engañoso, usar contenido como marca registrada. Responsabilidad del usuario si el contenido tiene derechos de terceros.

Uso: música medieval, buffers de campaña. **No redistribuir los mp3 sueltos como asset descargable dentro de 22W22.**

### 2.7 incompetech (Kevin MacLeod) — CC BY 4.0, crédito visible obligatorio

Fuente: `https://incompetech.com/music/royalty-free/faq.html`. Free **pero no** copyright-free/public domain. Crédito exacto requerido:

```
Title Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

Catálogo enorme de música de fantasía, suspenso, sci-fi. Solo usar si se acepta mostrar este crédito en UI o `CREDITS.md`.

### 2.8 Otras fuentes con licencia a verificar

| Fuente | URL | Qué ofrece | Estado |
|---|---|---|---|
| Free Music Archive | `https://freemusicarchive.org/genre/Chiptune/` | chiptune/retro, licencia por track | **DESCARTADO** — FAQ 404; requiere verificación track por track |
| ccMixter | `https://www.ccmixter.org/` | loops/stems CC | Sin verificar en Fase 0 — no importar |
| gamesounds.xyz | `https://gamesounds.xyz/` | agregador Kenney + Sonniss GDC 2015–2018 | **DESCARTADO** — términos no verificados |
| Free to Use Sounds | `https://www.freetousesounds.com/` | bundles "All In One", catálogo internacional | **DESCARTADO** — `/license/` 404 |
| Sonniss GDC bundles | vía gamesounds.xyz / Sonniss | librerías profesionales de SFX | **DESCARTADO** — términos no verificados |

## 3. Cobertura por escenario

### Medieval / fantasía
- **Ambiente**: Freesound `medieval_village_atmosphere` / `Pirate Tavern` / `Troubadour` (CC0); Pixabay Medieval (1,818+); OpenGameArt weapon textures.
- **Combate cuerpo a cuerpo**: OpenGameArt `Medieval sound effects - Weapon impacts` (CC0, ~48 variantes); Kenney RPG Audio + Impact Sounds (CC0).
- **Música**: Tallbeard loops (CC0), HydroGene 16-bit RPG, TomMusic Fantasy 200 SFX, MakotoHiramatsu LOST (soundscape).
- **Dungeon / UI**: Leohpaz Minifantasy Dungeon (62 SFX + 2 music), Kenney RPG Audio.

### Sci-fi / retro / techno / chiptune
- **SFX**: Kenney Sci-fi Sounds (70×, CC0) + Digital Audio (60×, CC0).
- **Música**: David KBD Synthwave / Dark Techno / metal sci-fi; FMA Chiptune; JDWasabi 8/16-bit; HydroGene SNES.
- **Glitches / datos**: Freesound InspectorJ `Computer Glitching`, `Radio Noise Long-Wave` (verificar CC BY).
- **Arcade**: Mixkit `Arcade retro game over`, `Retro game emergency alarm`; Kenney Music Jingles.

### Combate
- Kenney Impact Sounds (130×) + RPG Audio (CC0).
- OpenGameArt weapon impacts/textures (CC0).
- Chequered Ink 400+ / Kronbits 200 Free SFX (verificar).
- ObsydianX Horror SFX Volume 1 para stingers de golpe crítico (verificar).
- Mezcla sugerida: capa de impacto (Kenney/OGA) + stinger (Jingles/Mixkit) + ducking de música.
- **Usado en Fase 5 (CC0 verificado)**: `combat-rumble` = Kenney Sci-Fi `lowFrequency_explosion_000.ogg` (ambience loop, gain 0.12); `combat-hit` = OGA medieval impact; `combat-metal` = Kenney Impact `impactMetal_heavy_000.ogg`; `combat-jingle` = Kenney Music Jingles. Ducking de música al stinger: ×0.3, restaura ×1 en `onended`.

### Reemplazo de pistas 2026-11-18 (root cause)

Los loops iniciales de Tallbeard se eligieron por nombre de archivo, no por contenido: metadata real muestra `GENRE=Electronic` en 29/29. `DEEP WELL` (medieval) era drone, `Magnetic Tape SCUFFED` (taberna) era ruido, `Vacation Day ADVENTURE` (campaña) era vacaciones, `SHROUDED FUTURE` + `computerNoise_000` (sci-fi) era chirrido, y `combat` no tenía track `music` (solo `lowFrequency_explosion` a gain 0.12) con `playStinger` sin caller en runtime. Reemplazo con CC0 de OpenGameArt con título de género explícito: `medieval-tower-inn`, `medieval-market-loop`, `medieval-exploration`, `medieval-battle` (RandomMind), `scifi-echoes` (Sorth); `computerNoise` bajado a 0.08; `combat-battle` añadido; jingle de campaña cambiado de Sax a Steel. Test de regresión: cada escena expone loop `music` con `gain >= 0.25`. Fuentes en `CREDITS.md`.

Segunda tanda (mismo día, commit `0357f74`): cuatro pistas más cambiadas por ambient/música épica no electrónica — `sci-fi-computer` → `crashed-ship.ogg` (Wolfgang_, CC BY 3.0), `suspense-theme` → `dark-cavern-1.ogg` y `suspense-noise` → `dark-cavern-2.ogg` (Paul Wortmann, CC0), `campaign-theme` → `epic-orchestral-fantasy.mp3` (linxiaoma, CC BY 4.0). Diez assets nuevos en `data/assets/audio/oga/music/` con `filter=lfs`. Licencias y créditos en `CREDITS.md`.

### Suspenso / horror
- ObsydianX Horror SFX Volume 1 (drones + stingers).
- Freesound InspectorJ `Heartbeat LOOP`, zorros/ranas nocturnas (verificar CC BY).
- MakotoHiramatsu LOST / North Sea (ambient).
- Mixkit `Game show suspense waiting`, `Cinematic transition swoosh heartbeat trailer`.
- **Usado en Fase 5 (CC0 verificado)**: `suspense-theme` = Tallbeard `Dark Portents MYSTERIOUS TRAVELER` (music); `suspense-noise` = Kenney Digital `phaserDown1.ogg` (ambience loop); `suspense-jingle` = Kenney Steel Jingles. Heartbeat CC BY no importado: sin licencia confirmada en CREDITS.

### Campaña normal / UI / pasos
- Kenney RPG Audio (pasos), Interface Sounds, UI Audio, Casino Audio (dados), Music Jingles (CC0).
- Tallbeard loops (CC0) para música de campaña.
- ObsydianX Interface SFX Pack 1 (verificar CC0).
- Pixabay buffers (sin atribución).

## 4. Plantillas de atribución

**Freesound CC BY** (copiar formato oficial):

```
This project uses these sounds from freesound:
"sound1" by user1 ( http://freesound.org/s/soundID/ ) licensed under CCBY 4.0
"sound2", "sound3" by user2 ( http://freesound.org/people/user2/ ) licensed under CCBY 4.0
```

Si la lista es larga: link a `CREDITS.md` en la UI / repo.

**Kevin MacLeod**: bloque exacto de §2.7.

**CC0 / Pixabay / Mixkit**: sin crédito obligatorio (agradecido). Registrar igual en `CREDITS.md` para trazabilidad interna.

## 5. Verificación obligatoria antes de importar

Checklist por cada asset:

1. Abrir ficha del pack/sound → copiar licencia **exacta** y URL.
2. Descartar si es CC BY-NC, Sampling+, GPL/SA sin aclarar, o licencia no verificable (FreeToUseSounds, Nox 404).
3. Si CC BY → preparar línea de crédito con título, autor, URL, licencia.
4. Si es itch.io → leer sección Legal/License completa; "free" no basta.
5. Si es Mixkit → leer `https://mixkit.co/license/` completo (extracción falló en este research).
6. Convertir a formato web: `.ogg`/`.mp3` para loops de música, `.ogg`/`.wav` para SFX cortos; normalizar loudness.
7. Registrar en `CREDITS.md`: `titulo | autor | fuente | licencia | URL | archivo destino`.
8. Recién entonces proponer import y tocar código (confirmación explícita del DM).

## 6. Integración futura (NO incluida en este cambio)

Puntos de contacto relevados, sin modificar:

- `apps/dm/src/lib/audioSettings.ts` — canales `master`, `weather`, `dice`; patrón de volumen compartido/local.
- `apps/dm/src/lib/vfxSound.ts` — audio **procedural** Web Audio, 36 recetas (VFX ya cubierto sin assets; no duplicar).
- `apps/dm/src/components/VfxBurst.tsx` — dispara sonido procedural por efecto.
- `apps/dm/src/pages/DmDashboard.tsx` — control de volumen compartido.
- `apps/dm/src/pages/PlayerView.tsx` — `audio_path`, `audioRef`, `staticUrl`, volumen compartido.
- Backend: assets servidos bajo `/api/static` desde `data/assets` (ver `AGENTS.md`). Confirmar estado real del endpoint de upload antes de asumirlo.

Diseño sugerido (a evaluar en su propia fase): canal `ambience` nuevo en `audioSettings.ts`, capa de música por escenario (medieval / sci-fi / combate / suspenso), crossfade, ducking al disparar SFX. Responsabilidad separada del audio procedural de VFX.

## 7. Fuentes consultadas

- Kenney: `https://kenney.nl/assets/category:Audio`, fichas individuales RPG Audio y Sci-fi Sounds (CC0 confirmado).
- itch.io: `https://itch.io/game-assets/free/tag-audio` y fichas de los packs listados (vía `r.jina.ai`).
- Freesound: `https://freesound.org/help/faq/` (licencias CC0/CC BY/CC BY-NC/Sampling+, formato de crédito, tabla de remezcla), búsqueda medieval CC0, perfil InspectorJ.
- OpenGameArt: `https://opengameart.org/content/medieval-sound-effects-weapon-impacts` (CC0 confirmado) y búsqueda medieval (vía `r.jina.ai`).
- Mixkit: `https://mixkit.co/free-sound-effects/` (licencia completa no extraída).
- Pixabay: `https://pixabay.com/service/license-summary/`, `https://pixabay.com/music/search/medieval/`.
- incompetech: `https://incompetech.com/music/royalty-free/faq.html`.
- Free Music Archive: `https://freemusicarchive.org/genre/Chiptune/`; Freesound FAQ (ccMixter/Soundcloud/FMA/Sonatina/Bandcamp).
- gamesounds.xyz, Free to Use Sounds, sonatina.itch.io (sin verificar).

**Bloqueos de research**: `websearch` 402/429; `opengameart.org` directo 403 (Jina funciona); `musopen.org` 403 Cloudflare; `freetousesounds.com/license/` 404; `mixkit.co/license/` solo cookies; secondary extractor `ECONNREFUSED`. Nada de esto invalida lo confirmado vía Jina.

## 8. Plan de fases de implementación

Regla del repo: **una fase = un tema = 1 commit + CI verde**. Orden de verificación: `lint → typecheck → vitest → pytest → e2e` (si toca UI). No se salta fase. **Ninguna fase descarga ni importa assets hasta que Fase 0 esté cerrada.** Ninguna fase toca `apps/player` / `apps/renderer` (placeholders).

### Fase 0 — Gate de licencias (sin código, sin assets) — ✅ CERRADA 2026-11-18

- **Objetivo**: cerrar la lista exacta de ítems permitidos y dejar rastro legal.
- **Resultado**: `docs/audio/CREDITS.md` creado. Licencias confirmadas vía páginas oficiales + modal legal de Mixkit. Descartados: Mixkit Music, Nox 404, FreeToUseSounds, FMA, gamesounds.xyz/Sonniss, sonatina, packs no verificados de David KBD.
- **Salida**: `docs/audio/CREDITS.md` con filas `titulo | autor | fuente | licencia | URL | archivo destino`. Tabla §2 actualizada: cada "verificar" pasa a licencia confirmada o se descarta.
- **Regla**: entran solo CC0 confirmado y CC BY con crédito preparado. Fuera: CC BY-NC, Sampling+, GPL/SA sin aclarar, FreeToUseSounds, Nox 404, Mixkit sin texto legal leído.
- **Verificación**: checklist §5 aplicado ítem por ítem. Sin comandos de CI (doc only).
- **Commit**: `docs(audio): close license gate and add CREDITS`.

### Fase 1 — Contrato de audio y mixer base — ✅ CERRADA 2026-11-18

- **Resultado**: `AmbientScene`, `AmbientTrack`, `resolveSceneTracks` puro y `AmbientMixer` (Web Audio, gain ramps). TDD RED→GREEN.

- **Objetivo**: canal `ambience` nuevo sin romper `master` / `weather` / `dice`. Sin assets aún.
- **Archivos**: modificar `apps/dm/src/lib/audioSettings.ts`; crear `apps/dm/src/lib/ambientAudio.ts`.
- **Contrato**: `type AmbientScene = 'medieval' | 'sci-fi' | 'combat' | 'suspense' | 'campaign'`; `interface AmbientTrack { id: string; src: string; scene: AmbientScene; kind: 'music' | 'ambience' | 'stinger'; loop: boolean; gain: number }`; `resolveSceneTracks(scene: AmbientScene, tracks: readonly AmbientTrack[]): AmbientTrack[]` (puro, testeable en node); `class AmbientMixer` con `setScene(scene)`, `setVolume(v)`, `playStinger(id)`, `dispose()` vía Web Audio (patrón de `vfxSound.ts`, gain ramps simples, sin crossfade engine).
- **Test**: `apps/dm/src/lib/ambientAudio.spec.ts` — `resolveSceneTracks` filtra por `scene` y respeta `kind`; mezcla vacía devuelve `[]`.
- **Verificación**: `npm run lint` → `npm run typecheck` → `npx vitest run src/lib/ambientAudio.spec.ts` (desde `apps/dm`).
- **Commit**: `feat(audio): add ambience channel and scene mixer`.

### Fase 2 — Assets CC0 base + manifiesto — ✅ CERRADA 2026-11-18

- **Resultado**: 480 archivos importados (430 `.ogg`, 48 `.wav`), 333.1 MB; registry `AMBIENT_TRACKS` con rutas `/api/static/audio/...`. `data/assets/` es ignore local, pero los binarios se versionan con **Git LFS** (`.gitattributes` ya trae `*.ogg`/`*.wav` con `filter=lfs`); `desktop.ini` de Windows excluido.

- **Objetivo**: importar el subset mínimo ya verificado, sin sonido procedural duplicado.
- **Archivos**: `data/assets/audio/...` (destino), `apps/dm/src/lib/ambientAudio.ts` (registry `AMBIENT_TRACKS` con rutas `/api/static/audio/...`), `docs/audio/CREDITS.md` (columna archivo destino).
- **Subset inicial (todos CC0 confirmado)**: Kenney `RPG Audio` (50), `Sci-fi Sounds` (70), `Impact Sounds` (130), `Music Jingles` (85), `Digital Audio` (60); Tallbeard `FREE Music Loop Bundle` (200+ loops); OpenGameArt `Medieval weapon impacts` (~48). ~640 ítems candidatos; importar solo los que se usen.
- **Formato**: `.ogg` / `.mp3` para música loop, `.ogg` / `.wav` para SFX; normalizar loudness; sin conversión automática en runtime.
- **Test**: actualizar `ambientAudio.spec.ts` — cada track del registry tiene `src` no vacío y `scene` válido.
- **Verificación**: lint → typecheck → vitest → chequear que `/api/static/audio/...` sirve 200 con backend local (sin tocar puertos 5173/5174/8000 del usuario).
- **Commit**: `feat(audio): import verified CC0 ambient assets`.

### Fase 3 — Integración DM — ✅ CERRADA 2026-11-18

- **Resultado**: canal `ambience` en `SharedAudioSettings` (default 0.6), fila "Ambiente" en `AudioSettingsMenu` (`PANEL_H = 276`), selector `ambient-scene` en DmDashboard con `AmbientMixer` lazy; off = `dispose()` + ref `null`. 9 claves i18n es/en.

- **Objetivo**: DM elige escenario y volumen del canal `ambience`.
- **Archivos**: modificar `apps/dm/src/pages/DmDashboard.tsx`; reutilizar patrón de slider de `audioSettings.ts` (sin nuevo componente de UI).
- **Comportamiento**: selector `medieval | sci-fi | combat | suspense | campaign` + slider de volumen; persistencia local igual a `master/weather/dice`; al cambiar escenario, `AmbientMixer.setScene()` con ramp, sin cortar `weather` ni `dice`.
- **Test**: e2e en `tests/e2e` — cambiar escenario y verificar que el control persiste tras recargar (sin assertions de audio real; DOM + localStorage). Actualizar locators si cambia texto visible (gotcha emoji/lucide de `AGENTS.md`).
- **Verificación**: lint → typecheck → vitest → `npm run test:e2e` (spec afectado).
- **Commit**: `feat(audio): ambient scene controls in DM dashboard`.

### Fase 4 — Integración vista jugador — ✅ CERRADA 2026-11-18

- **Resultado**: `scene` viaja en `settings_json.audio` (sin cambio de schema backend); `PlayerView` corre el mixer fuera del poll, sigue la escena publicada y silencia sin `live`/`choice`/`audioOn`. Flag `data-ambient-scene` para verificación DOM.

- **Objetivo**: misma escenario/volumen en `PlayerView`, sin sonido duplicado con VFX procedural.
- **Archivos**: modificar `apps/dm/src/pages/PlayerView.tsx`; reutilizar `AmbientMixer` + `audioSettings.ts`. No tocar `VfxBurst.tsx` ni `vfxSound.ts`.
- **Comportamiento**: sincronizar escenario desde estado de campaña/WS ya existente; `POLL_MS = 16` permanece — el mixer corre fuera del loop de poll. Silenciar automáticamente si no hay sesión activa.
- **Test**: e2e — cargar vista jugador con escenario `campaign`, verificar que el mixer se inicializa (flag en DOM o estado) y no hay doble disparo con VFX.
- **Verificación**: lint → typecheck → vitest → e2e del spec de PlayerView.
- **Commit**: `feat(audio): ambient audio in player view`.

### Fase 5 — Combate y suspenso (capas + stingers) — ✅ CERRADA 2026-11-18

- **Resultado**: capas `combat` (rumble + impactos) y `suspense` (theme + noise) con stinger; ducking de música ×0.3 al disparar stinger y restore ×1 en `onended`. Heartbeat CC BY descartado (sin licencia en CREDITS).

- **Objetivo**: cubrir los escenarios de pelea y tensión con capas ya importadas.
- **Archivos**: `apps/dm/src/lib/ambientAudio.ts` (registry de `combat` / `suspense`), tests, `docs/audio/AMBIENT-AUDIO-PLAN.md` (§3 actualizado con lo efectivamente usado).
- **Contenido**: `combat` = capa de impacto (Kenney Impact/OGA) + stinger (Music Jingles); `suspense` = drone + heartbeat (Freesound InspectorJ, **solo si licencia CC BY confirmada en Fase 0**; si no, Mixkit/ObsydianX tras verificar). Ducking de música al disparar stinger, sin tocar `vfxSound.ts`.
- **Test**: `ambientAudio.spec.ts` — `combat` y `suspense` resuelven al menos un `stinger` y un `ambience`; stinger no se incluye en loop de música.
- **Verificación**: lint → typecheck → vitest → e2e si hay trigger visible.
- **Commit**: `feat(audio): combat and suspense ambient layers`.

### Fase 6 — Cierre y consistencia de docs — ✅ CERRADA 2026-11-18

- **Objetivo**: dejar repo verde y docs sin afirmaciones viejas.
- **Resultado**: fases 0–6 marcadas cerradas; `IMPLEMENTATION-STATUS.md` sincronizado; binarios versionados con Git LFS para que el test de existencia pase en CI.
- **Archivos**: `docs/roadmap/IMPLEMENTATION-STATUS.md`, `docs/audio/AMBIENT-AUDIO-PLAN.md`, `docs/audio/CREDITS.md`.
- **Verificación**: `npm run lint` → `npm run typecheck` → `npm run test --workspace=apps/dm` → pytest si tocó backend → e2e completo → `python scripts/check-docs-consistency.py`. Un commit, CI verde.
- **Commit**: `docs(audio): sync status and close ambient audio phase`.

## 9. Pistas subidas por el usuario (2026-11-18) — ✅ CERRADA

Extensión posterior a las fases 0–6. Pedido: "crear la opción de tipo input para agregar archivo de música desde la máquina de cada uno y poder agregar las pistas que quieran". El DM sube pistas propias, quedan en su máquina y las publica al servidor si quiere.

- **Storage dual (decisión del usuario: "Ambas")**:
  - Local por usuario: IndexedDB `roleito-audio` / store `tracks`, con `Blob` + nombre. `apps/dm/src/lib/customAudio.ts` (`addLocalTrack`, `listLocalTracks`, `deleteLocalTrack`, `getLocalTrackUrl`, `publishLocalTrack`). Las URLs se crean con `URL.createObjectURL` y se revocan al desmontar.
  - Publicada al servidor: `campaign.settings_json.audio.custom_tracks` (sin cambio de schema). El mismo dict ya viaja al jugador en el snapshot, así que no hicieron falta nuevos campos de transporte.
- **Contrato backend** (`backend/routes.py`, bajo `campaigns_router`, `require_dm`): `POST /campaigns/{id}/audio/tracks` (multipart `file` + query `name?`) y `DELETE /campaigns/{id}/audio/tracks/{track_id}`. Whitelist `.mp3/.ogg/.wav/.m4a/.flac`, id `secrets.token_hex(8)`, archivo en `data/assets/<campaign>/audio/tracks/<id>.<ext>` servido por `/api/static/`. Ambos emiten `broadcast_revision`.
- **Cliente** (`apps/dm/src/lib/api.ts`): `SharedAudioTrack { id, name, src, path? }`, `api.campaigns.uploadAudioTrack` / `deleteAudioTrack`. `normalizeSharedAudio` filtra tracks publicados: exige `id` string, `src` string con prefijo `/api/static/`; `sameShared` compara por ids para no re-renderizar en cada poll.
- **UI**: `AudioSettingsMenu` ganó input `audio/*` (`data-testid="custom-audio-file"`) y lista con elegir / publicar (↑) / quitar (×); `campaignId` y `onSelectTrack` son props nuevas. El DM ve la pista activa (`data-testid="custom-audio-active"`). La vista jugador no expone controles nuevos: sigue el mixer.
- **Reproducción**: `AmbientMixer.playCustom({ id, src, gain? })` detiene los loops de escena y toca la pista en loop como `kind: 'music'` (gain default 0.5). Elegir escena limpia la pista elegida; en el jugador, una pista publicada tiene prioridad sobre la escena. `publishLocalTrack` llama `setSharedAudio` con lo devuelto para que el POV reaccione sin esperar al snapshot.
- **Tests**: `audioSettings.spec.ts` (+3: normaliza/filtra tracks, ignora republish, reacciona a cambio de ids) y `ambientAudio.spec.ts` (+2: `playCustom` para loops y arranca source en loop, y no-op sin AudioContext). Suite 357/357.
- **Commits**: `4aea159` (endpoints) · `9bea3ed` (catálogo local + cliente) · `ed77e3e` (input y lista) · `c76cc08` (playback DM) · `4620be1` (playback jugador) · `e48d83f` (publicar actualiza estado).
- **Sin push** (no autorizado). E2E no corrido localmente (webServer chocaría con 5173/8000); CI corre la suite completa.

### Decisiones ya tomadas (defaults, no requieren aprobación por fase)

- Medio: Web Audio API en `apps/dm`, mismo patrón que `vfxSound.ts`. Sin librerías nuevas.
- Fuente de verdad de licencias: `docs/audio/CREDITS.md`. Si una licencia no está ahí, el asset no entra.
- Sin crossfade engine, sin librería de mixer, sin abstracción de "proveedor de audio". Gain ramps + registry plano.
- `#` de fases y nombres de archivo del plan son Estimación; si una fase crece, se parte en dos commits antes de seguir.
