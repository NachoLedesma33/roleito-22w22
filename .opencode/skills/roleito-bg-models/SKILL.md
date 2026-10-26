---
name: roleito-bg-models
description: Carga un modelo 3D nuevo al catálogo de ambientes de fondo (room skins) de Roleito. Usar cuando el usuario pasa un archivo .glb/.gltf y pide agregarlo al catálogo de fondos.
---

# Roleito — Cargar modelo de fondo (room skin)

## Pasos

1. **Copiar el modelo** a `apps/dm/public/room/<slug>/scene.glb` (o `scene.gltf` + texturas).
   - `<slug>`: kebab-case del nombre (ej. `alien-space-nebula`).

2. **Medir el radio fuente** del modelo (para normalizar tamaño):
   ```
   python -c "
   import struct,json
   data=open('apps/dm/public/room/<slug>/scene.glb','rb').read()
   off=12; cl,_=struct.unpack('<II',data[off:off+8])
   g=json.loads(data[off+8:off+8+cl])
   m=g['meshes'][0]; p=m['primitives'][0]
   a=g['accessors'][p['attributes']['POSITION']]
   r=max(abs(x) for x in a['max']+a['min'])/2  # aprox
   print('radius ~', r)
   "
   ```

3. **Calcular `modelScale`** para que el radio aparente sea ~300 (igual que los skyboxes existentes):
   `modelScale = 300 / radiusFuente`.

4. **Agregar entrada** en `apps/dm/src/lib/roomSkins.ts` (array `ROOM_SKINS`):
   ```ts
   {
     id: '<slug>',
     label: '<Nombre legible>',
     modelUrl: '/room/<slug>/scene.glb',
     modelScale: <calculado>,
     floorOffset: 0,        // skybox: 0; cuarto cerrado: ajustar
     mapAnchor: { x: 0, y: 0, z: 0 },  // skybox: 0,0,0; cuarto: segun suelo
     camera: { x: 0, y: 2, z: 6 },     // camara dentro del modelo
     roomRadius: 100000,
   },
   ```

5. **Verificar** que `camera.far` en `SceneRenderer.tsx` cubra el tamaño (ya es 100000).

6. **Typecheck**: `npm run typecheck`.

7. **Probar**: cambiar ambiente en HUD de ajustes de escena; ajustar "Altura de los tokens" si el piso visual no coincide.

## Reglas
- No tocar presets existentes (oggys, skybox-*).
- El modelo debe ser self-contained (texturas embebidas en el glb).
- Si el modelo es un cuarto cerrado (no skybox), ajustar `mapAnchor.y`, `floorOffset`, `camera` a mano y marcar `floorOffset` distinto de 0.
- Commit + push con `roleito.git` (skip_ci_check si CI rojo).