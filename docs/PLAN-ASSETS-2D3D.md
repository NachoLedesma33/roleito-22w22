# Roleito — Plan: Assets 2D/3D drag&drop en el mapa

Feature P2 del roadmap. Permite al DM subir/colocar componentes (imagen, glb, gltf, fbx, video) como items de escena.

## 1. Objetivo

- DM puede subir cualquier asset (imagen, video, modelo 3D) y colocarlo en el mapa como item de escena.
- Drag & drop desde un tray de assets.
- Snap a grilla opcional.
- Renderer adecuado por extensión (img/video/glb/gltf/fbx).

## 2. Estado actual

- `SceneBackground` soporta img/video/glb/gltf (SceneBackgroundModel usa useGLTF).
- `FBXLoader` ya integrado en `RoomBackground` (no en SceneBackgroundModel).
- Upload de fondo existe (`api.campaigns.uploadBackground` o similar).
- Items de escena existen (`SceneItem` en @core/domain/types).
- `ItemRenderer` renderiza items en el mapa.

## 3. Backend

### 3.1 Endpoint de upload genérico
- `POST /campaigns/{id}/assets` con multipart file
- Validar extensión (img: png/jpg/webp, video: mp4/webm, 3D: glb/gltf/fbx)
- Validar tamaño (max 50MB para 3D, 10MB para img, 50MB para video)
- Guardar en `data/assets/{campaign_id}/{uuid}.{ext}`
- Devolver `{ asset_id, url, type, name, size }`

### 3.2 Servir assets
- Ya existe `/api/static` para data/assets. Verificar mime types para fbx.

### 3.3 Item de escena
- `SceneItem` ya tiene `asset_url`, `asset_type`, `x`, `z`, `scale`, `rotation`.
- Agregar `asset_id` (FK a asset) para tracking.

## 4. Frontend

### 4.1 Tray de assets
- Componente `AssetTray.tsx` — panel lateral con grid de thumbnails
- Categorías: Imágenes, Videos, Modelos 3D
- Botón "Subir" → file input → upload → aparece en tray
- Drag & drop desde tray al canvas

### 4.2 Detector de extensión → renderer
- `ItemRenderer` ya renderiza items. Agregar soporte FBX (usar FBXLoader como en RoomBackground).
- Detección por extensión del URL.

### 4.3 Drag & drop
- Reusar `onAssetDrop` prop de SceneRenderer (ya existe).
- Snap a grilla si `gridSnap` activo.

### 4.4 FBX en SceneBackgroundModel
- Replicar la lógica de RoomBackground (FBXLoader) en SceneBackgroundModel.

## 5. Plan de implementación

### Fase 1 — Backend upload + FBX (1-2 días)
1. Endpoint `POST /campaigns/{id}/assets`
2. Migración: `asset_id` en scene_items (o usar asset_url directamente)
3. FBX support en SceneBackgroundModel

### Fase 2 — Frontend tray (2-3 días)
4. Componente AssetTray
5. Upload flow (file input → API → tray)
6. Drag & drop al canvas (reusar onAssetDrop)

### Fase 3 — Polish (1 día)
7. Thumbnails para 3D (render preview o icono genérico)
8. Snap a grilla
9. Tests e2e (upload + place asset)

## 6. Archivos a tocar

- Backend: `backend/routes.py` (nuevo endpoint), `backend/models.py` (asset_id), `backend/schemas.py`
- Frontend: `apps/dm/src/components/ItemRenderer.tsx`, `apps/dm/src/components/SceneRenderer.tsx`, nuevo `AssetTray.tsx`
- API: `apps/dm/src/lib/api.ts` (uploadAsset)

## 7. Riesgos

- FBXLoader puede ser pesado (bundle size)
- Upload de archivos grandes en CI (tests)
- Drag & drop en móvil (touch)

## 8. Próximo paso

Implementar Fase 1 (backend upload + FBX). ¿Procedo?