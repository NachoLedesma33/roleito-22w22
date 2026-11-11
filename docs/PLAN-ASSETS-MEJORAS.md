# Roleito — Plan: Mejoras del sistema de Assets

Extensión del plan base `docs/PLAN-ASSETS-2D3D.md`. Features adicionales solicitadas.

## 1. Vista previa de assets

- **Imágenes**: ya implementado (thumbnail en AssetTray).
- **Videos**: mostrar primer frame como thumbnail (usar `<video>` con preload o canvas snapshot).
- **Modelos 3D**: render preview en canvas pequeño (usar three.js offscreen) o icono genérico por tipo.
- **Tamaño**: thumbnail 64x64 en el tray, preview 128x128 en hover.

## 2. Borrado de assets

- Backend: `DELETE /campaigns/{id}/assets/{asset_id}` — borra registro y archivo.
- Frontend: botón "Eliminar" en el tray (hover o menú contextual).
- Confirmación: modal "¿Eliminar asset?" antes de borrar.
- Si el asset está en uso (en el mapa), advertir o bloquear.

## 3. Agrupar assets (categorías)

- Backend: campo `category` en Asset (default "general"). Migración.
- Frontend: tabs o dropdown en AssetTray: Todos, Imágenes, Videos, Modelos, Favoritos.
- El DM puede asignar categoría al subir (o después).
- Filtro por categoría en el tray.

## 4. Favoritos

- Backend: campo `favorite` (boolean) en Asset. Migración.
- Frontend: botón estrella en cada asset del tray. Toggle favorite.
- Filtro "Favoritos" en el tray.
- Los favoritos aparecen primero en el grid.

## 5. Entregar assets a jugador

- Backend: endpoint `POST /campaigns/{id}/assets/{asset_id}/deliver` con `{ player_id }`.
- Crea un handout o un item en el inventario del jugador con el asset.
- Frontend: botón "Entregar" en el tray → selector de jugador → enviar.
- El jugador ve el asset en su inventario/handouts.

## 6. Catálogo de assets (sección dedicada)

- HudPanel "Assets" ya existe (toggle en dock inferior).
- Mejorar: búsqueda por nombre, filtro por tipo/categoría/favorito.
- Vista grid (3 cols) o lista.
- Paginación si > 20 assets.

## 7. Otros (futuro)

- **Renombrar asset**: editar nombre inline.
- **Duplicar asset**: copiar a otra campaña.
- **Compartir asset**: generar link público.
- **Tag system**: tags libres además de categorías.
- **Drag & drop desde el navegador**: arrastrar archivo directamente al canvas.

## 8. Plan de implementación

### Fase 1 — Borrado + favoritos (1 día)
1. Backend: DELETE endpoint + favorite toggle
2. Frontend: botón eliminar + estrella favorito
3. Tests e2e

### Fase 2 — Categorías + búsqueda (1-2 días)
4. Backend: campo category + migración
5. Frontend: tabs/filtro + búsqueda

### Fase 3 — Entregar a jugador (1 día)
6. Backend: deliver endpoint
7. Frontend: botón entregar + selector de jugador

### Fase 4 — Vista previa mejorada (1 día)
8. Video thumbnail (canvas snapshot)
9. Modelo 3D preview (offscreen render)

## 9. Archivos a tocar

- Backend: `routes.py`, `models.py`, `schemas.py`, `database.py`
- Frontend: `AssetTray.tsx`, `DmDashboard.tsx`, `api.ts`
- Tests: `tests/e2e/assets.spec.ts` (nuevo)