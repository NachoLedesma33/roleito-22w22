# Roleito — Plan de mejoras (roadmap)

Lista priorizada de mejoras futuras. Cada item: problema → propuesta → notas de implementación.

## 1. Seguridad de login

- **PIN en texto plano / sin rate limit**: el backend usa PIN de 4-8 dígitos sin lockout. Un atacante puede brute-force.
  - Propuesta: lockout tras N intentos fallidos (por IP + por DM), hash con bcrypt/argon2 (ya se hashea, verificar costo), expiración de token JWT.
  - Tokens de sesión: agregar refresh token + revocación (logout real).
  - CORS: revisar orígenes permitidos en producción (no `*`).
  - Invites: códigos de un solo uso / expiración temporal para joins públicos.

## 2. Race condition al seleccionar personaje (player join)

- **Problema**: dos jugadores con el mismo dispositivo/navegador pueden entrar al POV del otro (localStorage `roleito:pv:${code}` compartido). También un jugador puede elegir un personaje ya tomado.
- Propuesta:
  - Vincular la elección a una sesión de jugador (cookie/JWT por jugador), no a localStorage compartido.
  - Backend: lock optimista — `claimCharacter(campaign, character, player_token)`; si ya está tomado, 409.
  - Al reconectar, validar que el token de jugador sigue siendo dueño del personaje; si no, volver al picker.
  - Espectador: rol separado, no consume personaje.

## 3. Rendimiento (DM POV)

- Room background (mesh ~1500u + textura) = principal costo. Ya opt-in (skin 'none' por defecto).
- Memoizar `hiddenPlayerIds` (deps estables) — ya retorna set vacío si `seeHiddenPlayers`.
- `React.memo` en RoomBackground (hecho).
- Pendiente: lazy-load del room (Suspense ya), LOD para meshes grandes, desactivar sombras en tokens del DM, throttle del poll de reveals (1.5s → 3s).
- PlayerView: polling 16ms es agresivo; bajar a 33ms (~30/s) sin perder fluidez.

## 4. Assets 2D/3D para el DM (cualquier extensión)

- Permitir al DM subir/colocar componentes en el mapa (imagen, glb, gltf, fbx, video) como items de escena.
- Backend: endpoint de upload genérico por tipo (validar extensión y tamaño), servir con mime correcto.
- Frontend: detector de extensión → renderer adecuado (SceneBackground ya soporta img/video/glb/gltf). Agregar fbx (FBXLoader ya integrado en RoomBackground, replicar en SceneBackgroundModel).
- Drag & drop desde un tray de assets; snap a grilla opcional.

## 5. VFX de habilidades (partículas)

- Packs gratis de VFX (partículas) para personajes: fuego, rayo, escudo, curación, etc.
- Flujo de ataque (DM y jugador, con permiso por jugador):
  1. DM activa "modo VFX" y selecciona token atacante.
  2. Click en token objetivo → se dispara el efecto elegido desde atacante hacia objetivo.
  3. Efecto se reproduce una vez y desaparece; se registra en el log de combate.
- Permisos: DM siempre; jugador solo si el DM le otorga el permiso (flag por personaje `can_use_vfx`).
- Implementación: pool de efectos (Three.js particles) reutilizados; no crear/destroy por uso (perf). Precargar assets en cache.
- Catálogo de VFX: archivo JSON con `{id, name, file, duration, scale}`. Cargar desde `public/vfx/`.

## 6. Punteros / marcadores de movimiento

- Láser o marcador visual para indicar próximo movimiento (DM o jugador).
- Click derecho en el mapa → coloca un marcador temporal (flecha/círculo) que todos ven.
- Marcadores se auto-eliminan tras N segundos o al mover.
- Útil para coordinar en mesa grande.

## 7. Catálogo de marcos para tokens 2D

- Tokens sin modelo 3D usan un marco (borde decorativo) sobre el portrait.
- Referencia: https://gmcrafttavern.com/token-maker/#maker
- Ingeniería inversa (REA/RAE) o creación manual de marcos (SVG/PNG con transparencia).
- Catálogo en `public/frames/` + JSON `{id, name, url, category}`.
- Selector en el tray de tokens / ficha de personaje.

## 8. Movimiento fluido (sin saltos/glitches)

- Interpolación ya existe (visualPosRef). Revisar:
  - Extrapolación con velocidad (ya implementada) → evitar overshoot con clamp.
  - Snap a grilla solo en drag/drop (ya), no en teclado.
  - Reducir polling del jugador (16ms → 33ms) sin perder fluidez.
  - Evitar re-render del canvas por cambios de estado no visuales (memoizar SceneRenderer props).

## 9. Otras mejoras sugeridas

- **Persistencia de layout del DM**: guardar posiciones de paneles HUD por campaña.
- **Undo/redo de dibujo** (paredes/zonas) — ya hay undo/redo en canvas, extender a todos.
- **Modo offline completo**: service worker + cache de assets.
- **Notificaciones push** cuando un jugador pide luz o el DM envía handout.
- **Replay de sesión**: grabar eventos y reproducir (timeline).
- **Exportar mapa con tokens** como imagen (screenshot del canvas).
- **Accesibilidad**: navegación por teclado en el canvas (flechas para mover tokens).
- **i18n completo**: faltan claves en inglés para algunas pantallas.
- **Tests e2e**: estabilizar flaky (aumentar timeouts, retry en CI ya configurado).

## Prioridad sugerida

P1: seguridad login, race condition personaje, fluidez movimiento.
P2: VFX de habilidades, marcos de tokens, assets 2D/3D.
P3: punteros, replay, offline, accesibilidad.