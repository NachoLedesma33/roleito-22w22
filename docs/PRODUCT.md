# PRODUCT.md

## Estado Actual

Roleito está en **fase VTT funcional** — el core del mapa, tokens, iluminación dinámica, niebla de guerra, y visión por conos funciona. Falta el layer de combate, dados, y UI de jugador completa.

## Features Implementadas

1. ✅ Mapa con grid y zoom/pan infinito
2. ✅ Tokens con drag & drop
3. ✅ Detección automática de muros desde imágenes (único en el mercado)
4. ✅ Iluminación dinámica (punto, cono, direccional)
5. ✅ Niebla de guerra (estática + dinámica por turno)
6. ✅ Visión de jugador por línea de sight
7. ✅ Luces adjuntas a tokens (el DM asigna, el jugador ve)
8. ✅ Facing rotation slider (0-360°) para tokens
9. ✅ Clic derecho en token (seleccionar, ocultar, luz, eliminar)
10. ✅ Modo de iluminación de escena (bright/dim/dark/neutral)
11. ✅ Campañas con persistencia SQLite
12. ✅ Gestión de entidades (personajes, NPCs, ubicaciones, etc.)
13. ✅ Sistema de eventos con pipeline de canon
14. ✅ Context builder para IA
15. ✅ Vista de jugador con WASD + niebla + visión
16. ✅ Gestión de escenas (crear, cargar, guardar)
17. ✅ Token scale slider
18. ✅ Player light requests (el jugador pide luz, el DM aprueba)
19. ✅ Portal/door detection desde wall detection

## Features Faltantes — Prioridad P0 (MVP Combate)

20. ❌ **Condition Icons** — estados sobre tokens (envenenado, ciego, prone, etc.)
21. ❌ **Token HP Bars visuales** — barra de HP sobre el token en SceneRenderer
22. ❌ **Round counter** — contador de rounds en InitiativeTracker
23. ❌ **HP sync** — sincronizar HP entre character sheets y combat tracker

> **Nota**: InitiativeTracker, DiceRoller, y VidaDisplay ya existen como componentes.
> Están integrados en DmDashboard y PlayerView. Falta polish y features faltantes arriba.

## Features Faltantes — Prioridad P1 (Paridad)

24. ❌ **Measurement Ruler** — medir distancias entre puntos
25. ❌ **Drawing/Annotation Tools** — dibujar, anotar sobre el mapa
26. ❌ **Journal/Handouts** — notas del mundo, documentos compartibles
27. ❌ **Token Auras** — radiance, darkness, effects sobre tokens
28. ❌ **Spell AOE Templates** — plantillas de área para hechizos

## Features Faltantes — Prioridad P2 (Diferenciación)

29. ❌ **Ambient Audio** — música de fondo, efectos de sonido
30. ❌ **Wall Types Avanzados** — terrain, invisible, ethereal, proximity/window
31. ❌ **Scene Variations** — day/night, GM/Player views separados
32. ❌ **Darkness Sources** — fuentes que emiten oscuridad (anti-lights)
33. ❌ **Light Animation** — flicker de antorcha, pulse, starlight
34. ❌ **Macro System** — shortcuts de jugadores
35. ❌ **Scene Notes/Markers** — puntos de interés en el mapa

## Fuera del MVP

- Auto-generación 3D completa
- Generación de video con IA en tiempo real
- Multijugador online
- Sincronización en la nube
- Personajes 3D hiperrealistas
- Simulación completa del mundo
- NPCs autónomos complejos
- Soporte VR
- Marketplace de contenido
- Voice/video chat integrado

## Nuestra Ventaja Competitiva

| Feature | Roleito | Roll20 | Foundry | Owlbear |
|---------|---------|--------|---------|---------|
| Auto wall detection | ✅ único | ❌ | ❌ | ❌ |
| 3D renderer nativo | ✅ | ❌ | ❌ módulos | ❌ |
| Local-first | ✅ | ❌ cloud | ✅ | ❌ cloud |
| AI-powered agents | ✅ | ❌ | ❌ | ❌ |
| Campaign memory | ✅ | ❌ | ❌ | ❌ |
| Zero cost | ✅ | ❌ subscription | ✅ $50 | ✅ |
| Player vision LoS | ✅ | ✅ Pro | ✅ | ❌ |

## Usuarios

### DM (Superadmin)

**Rol principal**: Administrador total de la campaña

**Funciones del VTT**:
- Cargar mapas y detectar muros automáticamente
- Colocar y mover tokens
- Asignar y configurar luces (punto, cono, direccional)
- Controlar niebla de guerra (revelar/ocultar áreas)
- Gestionar visibilidad de tokens para jugadores
- Rotar tokens (facing slider)
- Modo de iluminación de escena
- Clic derecho para acciones rápidas

**Funciones de campaña**:
- Crear y gestionar campañas
- Gestionar entidades (personajes, NPCs, ubicaciones)
- Registrar eventos y mantener canon
- Generar recaps
- Asignar jugadores a personajes

### Jugador

**Rol**: Participante de la sesión

**Funciones**:
- Mover su token con WASD
- Ver el mapa con niebla de guerra (solo lo que su personaje ve)
- Ver luces asignadas a su personaje
- Rotar modelo con Q/E
- Pedir luz al DM (light request)
- Tirar dados (futuro)
- Ver hoja de personaje (futuro)

**Restricciones**:
- No puede modificar canon
- No puede gestionar campañas
- Solo ve información autorizada por el DM
- No puede ver tokens ocultos
- No puede ver áreas en niebla
