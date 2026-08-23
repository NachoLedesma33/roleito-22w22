# DM-SUPER-ADMIN.md

> Especificación del Dashboard DM como Superadmin.
>
> Panel principal de administración donde el DM controla toda la campaña.
> Los jugadores son secundarios (no NPCs).

---

# 1. Concepto

El DM es el usuario principal que carga todo para las sesiones.

```text
DM = SUPERADMIN
  ↓
Carga contenido para sesiones
  ↓
Gestiona jugadores secundarios
  ↓
Controla todo desde un panel
```

**Requisito del DM**: "Mientras más detallado del lado del DM mejor porque la idea es hacerte un tablero donde vos manejes todo como un súper admin"

---

# 2. Principios

```text
1. DM como autoridad total
2. Panel centralizado de control
3. Carga de contenido antes de sesiones
4. Gestión de jugadores secundarios
5. Control de acceso a información
```

---

# 3. Arquitectura del Dashboard

```text
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD DM (SUPERADMIN)                                 │
├─────────────────────────────────────────────────────────────┤
│  HEADER                                                    │
│  [Campaña Actual] [Sesión Actual] [Perfil DM]             │
├──────────────┬──────────────────────────────────────────────┤
│  SIDEBAR     │  MAIN VIEW                                   │
│              │                                              │
│  ┌────────┐  │  ┌──────────────────────────────────────┐   │
│  │ Menú   │  │  │  Vista actual                        │   │
│  │        │  │  │                                      │   │
│  │ Camp.  │  │  │  [Dashboard / Personajes / Mapas /   │   │
│  │ Jugad. │  │  │   Sesiones / NPCs / Assets]         │   │
│  │ Sesion │  │  │                                      │   │
│  │ Pers.  │  │  │                                      │   │
│  │ NPCs   │  │  │                                      │   │
│  │ Mapas  │  │  │                                      │   │
│  │ Assets │  │  └──────────────────────────────────────┘   │
│  │        │  │                                              │
│  └────────┘  │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  STATUS BAR                                                 │
│  Campaña | Sesión | Jugadores | Mapas | Último guardado    │
└─────────────────────────────────────────────────────────────┘
```

---

# 4. Secciones del Dashboard

## 4.1 Panel de Campaña

```text
Vista general de la campaña:
  □ Nombre de campaña
  □ Descripción
  □ Fecha de creación
  □ Número de sesiones
  □ Número de personajes
  □ Número de NPCs
  □ Número de mapas
  □ Estado de la campaña
```

## 4.2 Gestión de Jugadores

```text
Crear jugador secundario:
  □ Nombre
  □ Email (opcional)
  □ Permisos
  □ Personaje asignado

Gestionar jugadores:
  □ Ver lista de jugadores
  □ Editar jugador
  □ Eliminar jugador
  □ Asignar personaje
  □ Cambiar permisos
  □ Ver estado de jugador
```

## 4.3 Gestión de Sesiones

```text
Crear sesión:
  □ Nombre
  □ Fecha
  □ Descripción
  □ Objetivos
  □ Notas del DM

Preparar sesión:
  □ Cargar información del DM
  □ Asignar mapa
  □ Asignar personajes presentes
  □ Definir NPCs relevantes
  □ Establecer escena inicial

Controlar sesión:
  □ Iniciar sesión
  □ Pausar sesión
  □ Finalizar sesión
  □ Ver estado actual
```

## 4.4 Cuaderno de Decisiones del DM (tipo Notion)

El DM necesita un sistema para anotar y organizar sus decisiones.

### Concepto

```text
El DM es "medio reina" y quiere anotar todo:
- Qué pasa según los dados
- Sus reglas caseras
- Decisiones tomadas durante la sesión
- Todo debe poder editarse y persistirse
```

### Estructura del Cuaderno

```text
Campaña
  ├── Sesiones
  │     ├── Sesión 001
  │     │     ├── Notas de sesión
  │     │     ├── Decisiones tomadas
  │     │     ├── Reglas aplicadas
  │     │     └── Resultados de dados
  │     └── Sesión 002
  │           └── ...
  ├── Reglas del DM
  │     ├── Reglas de combate
  │     ├── Reglas de habilidades
  │     ├── Reglas especiales
  │     └── Reglas dinámicas (cambian)
  ├── Decisiones Importantes
  │     ├── Decisiones de narrativa
  │     ├── Decisiones de reglas
  │     └── Decisiones de personajes
  └── Notas Generales
        ├── Ideas
        ├── Pendientes
        └── Referencias
```

### Tipos de Nota

```text
1. NOTA DE SESIÓN
   - Qué pasó en la sesión
   - Eventos importantes
   - Decisiones tomadas

2. REGLA DEL DM
   - Regla específica
   - Cuándo se aplica
   - Ejemplo de uso
   - ¿Puede cambiar? (sí/no)

3. DECISIÓN
   - Qué decidió el DM
   - Por qué lo decidió
   - Consecuencias
   - ¿Se puede revertir?

4. RESULTADO DE DADO
   - Qué tiró el jugador
   - Qué dijo el DM que pasaba
   - Resultado final
```

### Ejemplo de Nota

```text
NOTA: Regla de combate - Esquivar
FECHA: 2026-08-18
SESIÓN: 001

REGLA:
Cuando un jugador quiere esquivar, tira los dados que el DM indique
según Destreza (+ más dados, / estándar, − menos dados).
Si el resultado supera el ataque del enemigo, esquiva.

EJEMPLO:
Ardan (D=/) tira 2d6 = 4 + 5 = 9
Guardia ataca con 7
9 > 7 → Ardan esquiva

NOTA DEL DM:
Esta regla puede cambiar si me parece muy fácil/difícil.

EDITADO: 2026-08-18 (cambié la fórmula)
```

### Capacidades del Cuaderno

```text
El DM puede:
  □ Crear notas
  □ Editar notas
  □ Eliminar notas
  □ Organizar por carpetas
  □ Etiquetar notas
  □ Buscar notas
  □ Exportar notas
  □ Importar notas

Las notas:
  □ Persisten entre sesiones
  □ Se guardan automáticamente
  □ Se pueden versionar
  □ Se pueden vincular a entidades
```

### Vinculación con Entidades

```text
Una nota puede estar vinculada a:
  □ Una sesión específica
  □ Un personaje
  □ Un NPC
  □ Una ubicación
  □ Un evento
  □ Una regla

Ejemplo:
Nota "Regla de combate" → vinculada a "Sesión 001"
Nota "Decisión sobre Ardan" → vinculada a "Personaje: Ardan"
```

### Historial de Versiones

```text
Cada nota tiene historial:
  v1 - 2026-08-18 20:00 - Regla original
  v2 - 2026-08-18 20:30 - Editada (cambié fórmula)
  v3 - 2026-08-18 21:00 - Editada (agregué ejemplo)

El DM puede:
  □ Ver versiones anteriores
  □ Revertir a versión anterior
  □ Comparar versiones
```

## 4.4 Gestión de Personajes

```text
Crear personaje:
  □ Nombre
  □ Clase
  □ Raza
  □ Nivel
  □ Estadísticas
  □ Habilidades
  □ Inventario
  □ Hechizos
  □ Antecedentes
  □ Retrato

Editar personaje:
  □ Modificar cualquier campo
  □ Actualizar estadísticas
  □ Agregar/quitar items
  □ Actualizar hechizos
  □ Cambiar retrato

Asignar personaje:
  □ Asignar a jugador
  □ Desasignar de jugador
  □ Ver historial de asignaciones
```

## 4.5 Gestión de NPCs

```text
Crear NPC:
  □ Nombre
  □ Tipo (aliado, enemigo, neutral)
  □ Ubicación
  □ Descripción
  □ Retrato
  □ Notas del DM

Editar NPC:
  □ Modificar cualquier campo
  □ Cambiar ubicación
  □ Cambiar estado
  □ Actualizar retrato

Gestionar NPCs:
  □ Ver lista de NPCs
  □ Filtrar por ubicación
  □ Filtrar por tipo
  □ Ver historial de apariciones
```

## 4.6 Gestión de Mapas

```text
Subir mapa:
  □ Seleccionar imagen
  □ Nombre del mapa
  □ Descripción
  □ Tipo (mundial, regional, local, batalla)
  □ Asignar a campaña

Editar mapa:
  □ Cambiar nombre
  □ Cambiar descripción
  □ Reemplazar imagen
  □ Eliminar mapa

Visualizar mapa:
  □ Ver mapa en panel
  □ Zoom
  □ Navegación
  □ Marcadores
  □ Capas
```

## 4.7 Gestión de Assets

```text
Subir assets:
  □ Imágenes (retratos, fondos, mapas)
  □ Audio (música, efectos)
  □ Documentos (notas, supplements)

Organizar assets:
  □ Por campaña
  □ Por tipo
  □ Por sesión
  □ Por entidad

Asignar assets:
  □ Retrato a personaje
  □ Retrato a NPC
  □ Fondo a escena
  □ Mapa a campaña
  □ Mapa a sesión
```

---

# 5. Flujo de Trabajo

## 5.1 Preparación de Campaña

```text
1. Crear campaña
2. Agregar jugadores
3. Crear personajes
4. Asignar personajes a jugadores
5. Subir mapas
6. Crear NPCs
7. Configurar permisos
8. Campaña lista para sesiones
```

## 5.2 Preparación de Sesión

```text
1. Crear sesión
2. Seleccionar mapa
3. Definir personajes presentes
4. Definir NPCs relevantes
5. Cargar información del DM
6. Establecer escena inicial
7. Definir objetivos
8. Sesión lista para jugar
```

## 5.3 Durante la Sesión

```text
1. Iniciar sesión
2. Mostrar mapa
3. Ubicar personajes
4. Controlar NPCs
5. Registrar eventos
6. Cambiar escenas
7. Gestionar combate
8. Tomar notas
```

## 5.4 Finalización de Sesión

```text
1. Finalizar sesión
2. Revisar eventos
3. Confirmar canon
4. Actualizar estado del mundo
5. Generar recap
6. Guardar snapshot
7. Sesión completada
```

---

# 6. Permisos

## 6.1 DM (Superadmin)

```text
□ Ver todo
□ Editar todo
□ Eliminar todo
□ Crear todo
□ Gestionar jugadores
□ Gestionar permisos
□ Acceso completo
```

## 6.2 Jugador (Secundario)

```text
□ Ver su personaje
□ Ver su ficha
□ Ver mapas asignados
□ Ver información autorizada
□ Editar sus notas
□ NO puede modificar canon
□ NO puede gestionar campañas
□ NO puede ver información de otros jugadores
```

---

# 7. API Endpoints

## 7.1 Campañas

```text
POST   /api/campaigns                    Crear campaña
GET    /api/campaigns                    Listar campañas
GET    /api/campaigns/{id}               Ver campaña
PUT    /api/campaigns/{id}               Actualizar campaña
DELETE /api/campaigns/{id}               Eliminar campaña
```

## 7.2 Jugadores

```text
POST   /api/campaigns/{id}/players       Crear jugador
GET    /api/campaigns/{id}/players       Listar jugadores
GET    /api/campaigns/{id}/players/{pid} Ver jugador
PUT    /api/campaigns/{id}/players/{pid} Actualizar jugador
DELETE /api/campaigns/{id}/players/{pid} Eliminar jugador
```

## 7.3 Personajes

```text
POST   /api/campaigns/{id}/characters         Crear personaje
GET    /api/campaigns/{id}/characters         Listar personajes
GET    /api/campaigns/{id}/characters/{cid}   Ver personaje
PUT    /api/campaigns/{id}/characters/{cid}   Actualizar personaje
DELETE /api/campaigns/{id}/characters/{cid}   Eliminar personaje
POST   /api/campaigns/{id}/characters/{cid}/assign  Asignar a jugador
```

## 7.4 NPCs

```text
POST   /api/campaigns/{id}/npcs         Crear NPC
GET    /api/campaigns/{id}/npcs         Listar NPCs
GET    /api/campaigns/{id}/npcs/{nid}   Ver NPC
PUT    /api/campaigns/{id}/npcs/{nid}   Actualizar NPC
DELETE /api/campaigns/{id}/npcs/{nid}   Eliminar NPC
```

## 7.5 Mapas

```text
POST   /api/campaigns/{id}/maps         Subir mapa
GET    /api/campaigns/{id}/maps         Listar mapas
GET    /api/campaigns/{id}/maps/{mid}   Ver mapa
PUT    /api/campaigns/{id}/maps/{mid}   Actualizar mapa
DELETE /api/campaigns/{id}/maps/{mid}   Eliminar mapa
POST   /api/campaigns/{id}/maps/{mid}/markers   Crear marcador
PUT    /api/campaigns/{id}/maps/{mid}/markers/{mkid}  Actualizar marcador
DELETE /api/campaigns/{id}/maps/{mid}/markers/{mkid}  Eliminar marcador
```

## 7.6 Sesiones

```text
POST   /api/campaigns/{id}/sessions              Crear sesión
GET    /api/campaigns/{id}/sessions              Listar sesiones
GET    /api/campaigns/{id}/sessions/{sid}        Ver sesión
PUT    /api/campaigns/{id}/sessions/{sid}        Actualizar sesión
POST   /api/campaigns/{id}/sessions/{sid}/start  Iniciar sesión
POST   /api/campaigns/{id}/sessions/{sid}/end    Finalizar sesión
GET    /api/campaigns/{id}/sessions/current      Ver sesión actual
```

## 7.7 Assets

```text
POST   /api/campaigns/{id}/assets         Subir asset
GET    /api/campaigns/{id}/assets         Listar assets
GET    /api/campaigns/{id}/assets/{aid}   Ver asset
DELETE /api/campaigns/{id}/assets/{aid}   Eliminar asset
```

---

# 8. Modelos de Datos

## 8.1 Player

```typescript
interface Player {
  id: string;
  campaign_id: string;
  name: string;
  email?: string;
  character_id?: string;
  permissions: PlayerPermissions;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface PlayerPermissions {
  can_view_world: boolean;
  can_view_character: boolean;
  can_view_npcs: boolean;
  can_view_maps: boolean;
  can_edit_notes: boolean;
  can_view_recaps: boolean;
}
```

## 8.2 Map

```typescript
interface Map {
  id: string;
  campaign_id: string;
  name: string;
  description?: string;
  type: 'world' | 'regional' | 'local' | 'battle' | 'custom';
  image_path: string;
  thumbnail_path?: string;
  markers: Marker[];
  created_at: string;
  updated_at: string;
}

interface Marker {
  id: string;
  map_id: string;
  x: number;
  y: number;
  type: 'character' | 'npc' | 'location' | 'note' | 'custom';
  label: string;
  color: string;
  entity_id?: string;
  notes?: string;
}
```

## 8.3 CharacterSheet

```typescript
interface CharacterSheet {
  id: string;
  character_id: string;
  campaign_id: string;
  version: number;
  data: CharacterData;
  created_at: string;
  updated_at: string;
}

interface CharacterData {
  basic: {
    name: string;
    class: string;
    race: string;
    level: number;
    background?: string;
  };
  stats: {
    hp: number;
    max_hp: number;
    ac: number;
    speed: number;
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  abilities: string[];
  inventory: string[];
  spells?: string[];
  notes?: string;
  portrait?: string;
}
```

---

# 9. UI Components

## 9.1 Sidebar

```text
Componente de navegación:
  □ Lista de secciones
  □ Indicador de sección actual
  □ Colapsable
  □ Iconos por sección
  □ Badges (conteo de elementos)
```

## 9.2 Main View

```text
Vista principal:
  □ Renderiza sección seleccionada
  □ Responsive
  □ Scroll independiente
  □ Breadcrumb
  □ Acciones rápidas
```

## 9.3 Status Bar

```text
Barra de estado:
  □ Campaña actual
  □ Sesión actual
  □ Número de jugadores
  □ Número de mapas
  □ Último guardado
  □ Indicador de conexión
```

## 9.4 Forms

```text
Formularios:
  □ Validación
  □ Auto-guardado
  □ Deshacer/Rehacer
  □ Campos condicionales
  □ Subida de archivos
```

---

# 10. Consideraciones Técnicas

## 10.1 Rendimiento

```text
□ Lazy loading de secciones
□ Paginación de listas
□ Cache de imágenes
□ Optimización de consultas
□ Debounce en búsquedas
```

## 10.2 Persistencia

```text
□ Auto-guardado cada 30 segundos
□ Guardado manual
□ Optimistic updates
□ Manejo de conflictos
□ Backup automático
```

## 10.3 Seguridad

```text
□ Autenticación de DM
□ Autorización por campaña
□ Validación de permisos
□ Protección de datos sensibles
□ Log de acciones
```

## 10.4 Usabilidad

```text
□ Atajos de teclado
□ Drag and drop
□ Tooltips
□ Loading states
□ Error handling
□ Empty states
```

---

# 11. Testing

## 11.1 Unit Tests

```text
□ Test de modelos
□ Test de permisos
□ Test de validación
□ Test de utilidades
```

## 11.2 Integration Tests

```text
□ Test de flujo de campaña
□ Test de flujo de sesión
□ Test de gestión de jugadores
□ Test de gestión de mapas
□ Test de persistencia
```

## 11.3 E2E Tests

```text
□ Test de creación de campaña
□ Test de asignación de personajes
□ Test de subida de mapas
□ Test de inicio de sesión
□ Test de finalización de sesión
```

---

# 12. Futuras Mejoras

```text
□ Modo oscuro
□ Personalización de dashboard
□ Widgets configurables
□ Notificaciones
□ Búsqueda global
□ Filtros avanzados
□ Exportación de reportes
□ Integración con calendarización
□ Modo presentación para sesiones
□ Soporte para múltiples monitores
```

---

# 13. Notas

```text
- El DM es el usuario principal y tiene control total
- Los jugadores son secundarios pero no NPCs
- El dashboard debe ser intuitivo y rápido
- La carga de contenido es antes de las sesiones
- Todo se controla desde un panel centralizado
- Los permisos son importantes para controlar acceso
- Los mapas son esenciales para la visualización
- Las fichas de jugador son necesarias para el sistema
```
