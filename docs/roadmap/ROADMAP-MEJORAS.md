# Roleito — Plan de mejoras (roadmap)

Lista priorizada de mejoras futuras. Cada item: problema → propuesta → notas de implementación.

## 1. Seguridad de login

- **PIN con lockout por IP real (RESUELTO 2026-11-27)**: el backend usa PIN de 4-8 dígitos hasheados con bcrypt y bloquea tras 5 intentos fallidos durante 5 minutos. Antes la clave era la IP del socket (`127.0.0.1` detrás del túnel): un visitante podía dejar sin login a todos. Ahora `register`/`login` usan `client_key()` de `rate_limit.py` (`CF-Connecting-IP` → `X-Forwarded-For` → socket), igual que el rate limit. Queda pendiente: persistir el contador entre reinicios y además por perfil DM, no solo por IP. Tests: `backend/tests/test_auth_lockout.py` (RED→GREEN, 2 tests).
  - Tokens de sesión: agregar refresh token + revocación (logout real).
  - CORS: revisar orígenes permitidos en producción (no `*`).
  - **Paths de import confinados HECHO 2026-11-27**: `asset_rel()` solo acepta `data/assets/...` con segmento completo y sin `..`; `asset_abs()` verifica `commonpath` contra `ASSETS_DIR` y tira `ValueError` si el path sale del árbol; `rewrite_campaign_prefix()` valida entrada y salida. El import de assets con path no canónico se ignora en vez de escribir fuera. Tests: `backend/tests/test_asset_paths.py` (9, RED→GREEN).
  - **WS hardening HECHO 2026-11-27**: los dos handlers (`/ws/invite/{code}` y `/ws/campaigns/{id}`) validan el `Origin` del handshake contra `CORS_ORIGINS` o el mismo `Host` (túnel) antes de entrar a la sala; sin `Origin` se acepta (scripts no-browser). Los frames entrantes se descartan con techo de 64 KB por mensaje (`ROLEITO_WS_MAX_BYTES`) y 200 frames/s (`ROLEITO_WS_MAX_FRAMES`), close `1009`/`1008`. Si el túnel termina TLS y el backend ve otro `Host`, agregar la URL pública a `CORS_ORIGINS` (igual que ya se necesita para HTTP). Tests: `backend/tests/test_ws_security.py` (11, RED→GREEN).
  - Invites: **expiración + revocación HECHAS 2026-11-27** (12 h por defecto, `ROLEITO_INVITE_TTL_HOURS`; `DELETE /campaigns/{id}/invite-code` revoca y cierra `/join`). La rotación ya existía (`POST /invite-code`) y ahora se verificó que invalida el código anterior en todas las rutas `/invite/{code}`. Queda: PIN de jugador opcional y ámbito por sesión.

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

## 10. Formulario de contacto (HECHO 2026-11-27)

- **Problema**: el footer tenia un link `Contacto` que no llevaba a ningun lugar y no habia canal para escribir sin publicar un correo en un repo publico.
- **Implementacion**: `POST /api/contact` publico con validacion estricta (longitudes, email, sin saltos de linea en cabeceras), honeypot y 3 envios por IP/hora. Guarda en `contact_messages`, devuelve ticket y poda a 90 dias (30 si se marco respondido). El correo a `ROLEITO_CONTACT_EMAIL` sale por SMTP con STARTTLS solo si `ROLEITO_CONTACT_SMTP_ENABLED=1`; las credenciales y el destinatario viven en `.env` (ver `.env.example`).
- **UI**: `/contact` con campos obligatorios, consentimiento sin pre-marcar, honeypot oculto, avisos de conservación/destinatario/derechos y modal con ticket después del guardado. No hay acuse por correo; el ticket es la prueba de recepción. e2e `C01`-`C03` con la API mockeada.
- **Aviso legal tecnico (no dictamen)**: el formulario dice para que se usan los datos, quien los recibe, el plazo de conservacion y que no es canal de emergencias. Abogado debe revisar Textos/Terminos antes de publicar.

## 11. Guía del DM (HECHO 2026-11-27)

- **Problema**: el link "Guía del DM" del footer no llevaba a ningún lugar y no había un manual público que explicara qué hace el engine ni dónde están los límites de seguridad.
- **Implementación**: ruta `/guide` con seis secciones (flujo de sesión, VTT, canon, IA, seguridad, límites) y textos es/en. La seguridad se describe sin ambigüedad: PIN con hash, sesión de 24 horas ligada a la pestaña, lockout tras 5 intentos, invitaciones de 12 horas rotables/revocables, archivos confinados a `data/assets`. Aclara que el texto es técnico, no legal, y que los textos legales necesitan revisión de abogado.

## Prioridad sugerida

P1: seguridad login, race condition personaje, fluidez movimiento.
P2: VFX de habilidades, marcos de tokens, assets 2D/3D.
P3: punteros, replay, offline, accesibilidad.