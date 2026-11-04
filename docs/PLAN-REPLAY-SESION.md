# Roleito — Plan: Replay de sesión + Recap con IA

## Objetivo
Grabar los eventos de una sesión y reproducirlos como timeline. Al cerrar la sesión, procesar los eventos con IA para extraer lo importante (combates, decisiones, loot, cambios de estado) y generar un recap filtrado. Análogo a apps de transcripción de reuniones (Otter, Fireflies).

## Enfoque (3 capas)

### Capa 1 — Grabación (ya existe, reutilizar)
- El backend ya tiene Event System (`core/events`, `backend/event_routes.py`).
- Cada acción (movimiento, ataque, tirada, cambio de escena, VFX, etc.) genera un `Event` con `timestamp`, `actor`, `type`, `payload`.
- **No se agrega storage nuevo**: se reutilizan los eventos existentes.
- Al iniciar sesión: `session.started_at = now()`. Al cerrar: `session.ended_at = now()`.
- Los eventos de la sesión se filtran por `created_at BETWEEN started_at AND ended_at`.

### Capa 2 — Replay (UI, nuevo)
- Vista `SessionReplay` (nueva página/componente) con timeline horizontal.
- Eventos como marcadores en el timeline (icono por tipo: combate, diálogo, movimiento, loot, etc.).
- Click en marcador → muestra detalle (quién, qué, cuándo) + snapshot del estado en ese momento (opcional, fase 2).
- Filtros por tipo de evento (combate, narrativa, movimiento, etc.).
- Reproducción automática (play/pause, velocidad 1x/2x/4x) con highlight del evento actual.
- Exportar timeline como JSON o texto.

### Capa 3 — Recap con IA (procesamiento, nuevo)
- Al cerrar sesión, el DM pulsa "Generar recap".
- Backend envía los eventos de la sesión a un agente IA (nuevo `RecapAgent` o extender el existente).
- El agente filtra: descarta ruido (movimientos menores, tiradas sin consecuencia), conserva momentos clave (combates, decisiones, loot, muertes, cambios de escena).
- Genera: resumen narrativo (2-3 párrafos), lista de highlights (bullet points), cliffhanger para la próxima sesión.
- El DM revisa y edita antes de guardar (`session.summary`).
- El recap se guarda en `Session.summary` y se muestra en la vista de sesión.

## Modelo de datos (cambios mínimos)

- `Session` ya tiene `summary`, `raw_notes`, `started_at`, `ended_at`. No se agregan columnas.
- `Event` ya tiene `timestamp`, `type`, `actor`, `payload`. No se agregan columnas.
- Nuevo: `Session.recap_status` (enum: pending/generated/approved) — opcional, para tracking.

## API (nuevos endpoints)

- `GET /campaigns/{id}/sessions/{sid}/events` — eventos de la sesión (ya existe parcial, verificar).
- `POST /campaigns/{id}/sessions/{sid}/recap` — genera recap con IA (async, devuelve job id).
- `GET /campaigns/{id}/sessions/{sid}/recap/status` — estado del job.
- `PUT /campaigns/{id}/sessions/{sid}/recap` — DM edita y aprueba el recap.

## Frontend (nuevos componentes)

- `SessionReplay.tsx` — timeline horizontal + detalle.
- `RecapGenerator.tsx` — botón + spinner + editor de recap.
- Integración en `SessionDetail.tsx` (botón "Replay" y "Generar recap").

## Performance

- Los eventos se paginan (max 500 por request).
- El replay carga solo los eventos visibles en el viewport (virtualización).
- El recap con IA se procesa async (job en background) para no bloquear la UI.
- Cache del recap generado (no re-procesar si no cambió).

## Flujo del DM

1. Inicia sesión → se graban eventos automáticamente.
2. Durante la sesión: puede marcar un evento como "importante" (highlight manual).
3. Al cerrar sesión: pulsa "Generar recap" → IA procesa → DM revisa/edita → aprueba.
4. El recap queda en la sesión y se muestra en el panel de sesiones.
5. Opcional: "Replay" para ver el timeline completo.

## Refinamientos

- **Filtrado manual**: el DM puede marcar/desmarcar eventos como "clave" antes de generar el recap.
- **Plantillas de recap**: el DM elige estilo (narrativo, bullet points, cliffhanger).
- **Comparación**: comparar recap generado con el anterior (diff).
- **Exportar**: recap como .md o .pdf.
- **Privacidad**: el recap se genera localmente (mock provider en CI, real en prod).

## Estimación

- Backend: 2-3 días (endpoints + agente).
- Frontend: 3-4 días (timeline + editor).
- Testing: 1-2 días (e2e para replay + recap).
- Total: ~1 semana.

## Riesgos

- El agente IA puede generar recap pobre si los eventos son escasos (sesiones cortas). Mitigación: fallback a "raw notes" si no hay suficientes eventos.
- Performance del timeline con 1000+ eventos: virtualización + paginación.
- El mock provider (CI) debe generar un recap determinista para los tests.