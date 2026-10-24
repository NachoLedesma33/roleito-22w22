# Catálogo de Background Rooms (entornos 3D)

> Plan vivo para convertir el cuarto virtual actual (Oggy's room) en un
> **catálogo de rooms precargados** que el DM puede elegir al crear una
> campaña o cambiar durante la partida. Por ahora solo existe Oggy's room;
> este doc define los endpoints y el modelo para sumar más.

## Objetivo

- Que el DM elija un "room" (cuarto 3D) como fondo del tablero virtual.
- El room es decoración: no captura clics ni arrastres; el mapa y los
  tokens se mueven sobre él.
- Cada room puede tener un **offset recomendado** (X, Y, Z) para que el
  mapa flote en el lugar correcto sin ajuste manual. El DM puede
  sobreescribirlo con el slider "Altura del mapa".
- Rooms precargados en el backend (assets versionados), seleccionables
  en creación de campaña y en ajustes de escena.

## Modelo de datos (propuesta)

Tabla `background_rooms` (o lista estática en `data/rooms/`):

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | slug único (ej. `oggys-room`) |
| `name` | string | nombre visible (ej. "Cuarto de Oggy") |
| `description` | string | descripción corta |
| `preview_url` | string | miniatura |
| `model_url` | string | ruta al `.gltf` servido por `/api/static` |
| `scale` | float | escala base del modelo (default 40) |
| `floor_offset` | float | desplazamiento vertical del piso (default -25) |
| `recommended_map_offset` | `{x,y,z}` | offset recomendado del mapa (Oggy: `{0,136,0}`) |
| `camera_radius` | float | radio máximo de cámara |

Alternativa liviana: un JSON en `data/rooms/catalog.json` + assets en
`data/assets/rooms/<id>/`, sin tabla. Empezar por esta opción (menos
migraciones) y pasar a tabla cuando haya >5 rooms.

## Endpoints propuestos

```
GET  /api/rooms                 → lista del catálogo (id, name, preview_url, recommended_map_offset)
GET  /api/rooms/{id}            → detalle completo
GET  /api/rooms/{id}/model      → redirige a /api/static/... (o devuelve model_url)
```

Selección por campaña/escena:

```
PATCH /campaigns/{cid}/scenes/{sid}   body: { background_room_id: "oggys-room" }
```

o campo `background_room_id` en `Scene` (nullable, default `oggys-room`).

## Flujo DM

1. Crear campaña → elige room (default Oggy).
2. El backend copia/asigna `background_room_id` a las escenas creadas.
3. En ajustes de escena: selector de room + slider de altura (override del
   offset recomendado).
4. Cambiar room durante la partida actualiza el fondo sin perder tokens.

## Frontend

- `RoomBackground.tsx` recibe `roomId` y carga el modelo desde
  `/api/static/rooms/<id>/scene.gltf` (o URL del catálogo).
- Offset recomendado se aplica como default de `mapOffY` cuando la escena
  no tiene `model_y_offset` guardado.
- Mantener slider de altura para probar rooms nuevos.

## Estado actual

- Solo Oggy's room disponible, hardcodeado en `RoomBackground.tsx`.
- Offset recomendado Oggy: `{x:0, y:136, z:0}`.
- El cuarto no captura clics (`raycast = () => {}`).

## Próximos pasos

1. Mover Oggy a `data/assets/rooms/oggys-room/` y servirlo por `/api/static`.
2. Crear `data/rooms/catalog.json`.
3. Endpoint `GET /api/rooms`.
4. Campo `background_room_id` en `Scene` + migración.
5. Selector en `SceneSettingsHud` y en creación de campaña.
6. Buscar y sumar más rooms (CC0/KayKit/Kenney), registrando licencia.
