# UI Rebuild — Assets de referencia

Carpeta de consumo para **imágenes y videos** que sube el usuario para el rearmado de UI.
No es un asset de campaña (`data/assets`); es material de diseño de referencia.

## Estructura

```
assets/
  landing/        # hero, fondos, screenshots de referencia para la landing
  intro-video/    # video de animación que se reproduce al iniciar un perfil (lobby loader)
  lobby/          # arte de campañas, covers, moodboards del hub
  icons/          # referencia de iconos (habilidades, estados, recursos)
  palettes/       # screenshots/moodboards de paletas y referencias de estilo
  raw/            # originales sin procesar; el subagente multimodal trabaja sobre copias
```

## Convención de nombres

```
<tipo>_<contexto>_<variante>[_<N>].<ext>
```

Ejemplos:
- `landing_hero_desktop.webp`
- `intro-video_lobby-loader_v2.mp4`
- `lobby_cover_dnd-2026.webp`
- `icons_skills_sheet.png`

## Reglas

1. **Formatos preferidos**: imágenes `webp`/`avif` (fallback `png`); video `mp4` (H.264) o `webm` (VP9/AV1).
2. **Pesos**: imagen hero ≤ 400 KB; video loader ≤ 8 MB y ≤ 8 s; iconos ≤ 32 KB cada uno.
3. **Privacidad**: no subir arte con licencia propietaria sin permiso. Registrar autoría en este README si aplica.
4. **No commitear binarios pesados a Git**: usar Git LFS o dejar el material solo en local (ver `.gitignore` si aplica). El plan define el pipeline final (CDN/estático local en `apps/dm/public`).
5. **Ver imágenes**: el hilo principal puede no ser multimodal. Delegar lectura a un subagente con un modelo multimodal **gratis** — ver `PLAN-UI-REBUILD.md` §9 (workflow "Ojo" con `opencode/mimo-v2.6-flash-free`).

## Estado

| Archivo | Tipo | Estado | Notas |
|---------|------|--------|-------|
| _(pendiente)_ | | | Esperando material del usuario |