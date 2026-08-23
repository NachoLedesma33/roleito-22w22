# DM-NOTEBOOK.md

> Cuaderno de decisiones del DM (tipo Notion).
>
> Sistema para que el DM anote y organice sus decisiones, reglas y notas.
>
> **ESTADO: DRAFT — Pendiente confirmación del DM.**

---

# 1. Concepto

El DM es "medio reina" y quiere anotar todo lo que pasa en las sesiones.

```text
El DM:
  - Decide qué pasa según los dados
  - Puede cambiar sus reglas dinámicamente
  - Quiere anotar todo tipo Notion
  - Todo debe persistir y poder editarse
```

---

# 2. Por qué este sistema

```text
El DM amateur:
  - Tiene sus propias reglas
  - Las reglas pueden cambiar en el momento
  - Quiere recordar qué decidió
  - Quiere organizar sus notas
  - Necesita persistencia de información
```

---

# 3. Estructura del Cuaderno

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

---

# 4. Tipos de Nota

## 4.1 Nota de Sesión

```text
Qué pasó en la sesión:
  - Eventos importantes
  - Decisiones tomadas
  - Resultados de dados
  - Notas del DM
```

**Ejemplo:**
```text
NOTA DE SESIÓN 001
Fecha: 2026-08-18
Participantes: Ardan, Elena, Marcus

Eventos:
- Encontraron al guardia en el pasillo
- Combate: Ardan tiró 4, guardia tiró 3
- Ardan ganó, guardia huyó

Decisiones:
- Permití que Ardan usara su habilidad especial
- Cambié la regla de daño temporalmente

Notas:
- La sesión fue divertida
- Los jugadores disfrutaron el combate
```

## 4.2 Regla del DM

```text
Regla específica:
  - Qué regla es
  - Cuándo se aplica
  - Ejemplo de uso
  - ¿Puede cambiar? (sí/no)
  - Versión actual
```

**Ejemplo:**
```text
REGLA: Esquivar en combate
VERSIÓN: 2
PUEDE CAMBIAR: Sí

REGLA:
Cuando un jugador quiere esquivar, tira los dados que el DM indique
según Destreza (+ más dados, / estándar, − menos dados).
Si el resultado supera el ataque del enemigo, esquiva.

EJEMPLO:
Ardan (D=/) tira 2d6 = 4 + 5 = 9
Guardia ataca con 7
9 > 7 → Ardan esquiva

HISTORIAL:
v1 - 2026-08-18 20:00 - Regla original
v2 - 2026-08-18 20:30 - Editada (cambié fórmula)
```

## 4.3 Decisión

```text
Decisión tomada:
  - Qué decidió el DM
  - Por qué lo decidió
  - Consecuencias
  - ¿Se puede revertir?
```

**Ejemplo:**
```text
DECISIÓN: Permitir habilidad especial de Ardan
FECHA: 2026-08-18 20:15
SESIÓN: 001

QUÉ DECIDÍ:
Permití que Ardan usara su habilidad "Golpe Poderoso" aunque no tenía todos los requisitos.

POR QUÉ:
Para que la sesión fuera más divertida y el jugador se sintiera bien.

CONSECUENCIAS:
- Ardan hizo más daño de lo normal
- El combate terminó antes

¿SE PUEDE REVERTIR?
Sí, puedo cambiarlo en la próxima sesión.
```

## 4.4 Resultado de Dado

```text
Qué tiró el jugador:
  - Tipo de dado
  - Cantidad
  - Resultado

Qué dijo el DM que pasaba:
  - Resultado narrativo
  - Consecuencias

Resultado final:
  - Qué realmente pasó
```

**Ejemplo:**
```text
RESULTADO DE DADO
SESIÓN: 001
HORA: 20:45

JUGADOR: Ardan
TIRADA: 2d6 (Destreza /, DM indica cantidad)
RESULTADO: 4 + 5 = 9

CONTEXTO:
Ardan quería escalar una pared

QUÉ DECIDÍ:
Con 9, puede escalar pero se lastima un poco

RESULTADO:
Ardan sube la pared pero se hace 1 de daño

NOTA:
En la próxima sesión quizás cambie la dificultad
```

---

# 5. Capacidades del Cuaderno

## 5.1 CRUD de Notas

```text
El DM puede:
  □ Crear notas
  □ Leer notas
  □ Editar notas
  □ Eliminar notas
  □ Organizar por carpetas
  □ Etiquetar notas
  □ Buscar notas
```

## 5.2 Persistencia

```text
Las notas:
  □ Se guardan automáticamente
  □ Persisten entre sesiones
  □ Se pueden versionar
  □ Se pueden exportar
  □ Se pueden importar
```

## 5.3 Vinculación

```text
Una nota puede estar vinculada a:
  □ Una sesión específica
  □ Un personaje
  □ Un NPC
  □ Una ubicación
  □ Un evento
  □ Una regla
```

## 5.4 Historial de Versiones

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

---

# 6. UI del Cuaderno

## 6.1 Panel Principal

```text
┌─────────────────────────────────────────────────────────────┐
│  CUADERNO DEL DM                                            │
├──────────────┬──────────────────────────────────────────────┤
│  CARPETAS    │  CONTENIDO                                   │
│              │                                              │
│  ▼ Sesiones  │  Nota seleccionada:                          │
│    001       │                                              │
│    002       │  Título: Regla de combate                    │
│              │  Contenido: ...                               │
│  ▼ Reglas    │                                              │
│    Combate   │  [Editar] [Eliminar] [Versiones]            │
│    Habilid.  │                                              │
│              │                                              │
│  ▼ Decisiones│                                              │
│    Narrativa │                                              │
│    Reglas    │                                              │
│              │                                              │
│  ▼ Notas     │                                              │
│    Ideas     │                                              │
│    Pendientes│                                              │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  BÚSQUEDA: [________________]  [Nueva nota]  [Exportar]     │
└─────────────────────────────────────────────────────────────┘
```

## 6.2 Editor de Nota

```text
┌─────────────────────────────────────────────────────────────┐
│  EDITOR DE NOTA                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Título: [________________________________]                │
│                                                             │
│  Carpeta: [Sesiones > 001 ▼]                               │
│                                                             │
│  Etiquetas: [combate] [regla] [+ agregar]                  │
│                                                             │
│  Vincular a: [Personaje: Ardan ▼]                          │
│                                                             │
│  Contenido:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Editor de texto rico]                             │   │
│  │                                                     │   │
│  │  - Negrita                                          │   │
│  │  - Cursiva                                          │   │
│  │  - Listas                                           │   │
│  │  - Código                                           │   │
│  │  - Imágenes                                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Guardar]  [Vista previa]  [Cancelar]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 7. Flujo de Trabajo

## 7.1 Durante la Sesión

```text
1. DM necesita anotar algo rápido
2. Abre el cuaderno
3. Crea nota rápida
4. La nota se guarda automáticamente
5. Continúa la sesión
```

## 7.2 Después de la Sesión

```text
1. DM revisa notas de la sesión
2. Edita y organiza
3. Agrega decisiones importantes
4. Actualiza reglas si es necesario
5. Todo se persiste automáticamente
```

## 7.3 Antes de la Próxima Sesión

```text
1. DM revisa notas anteriores
2. Revisa reglas actualizadas
3. Prepara nueva sesión
4. Consulta decisiones pasadas
```

---

# 8. Ejemplo de Uso

## Escenario: Combate

```text
TURNO DE ARDAN:
1. Jugador tira 2d6 (D=/, DM indica) = 4 + 5 = 9
2. DM decide: "Esquiva el ataque"
3. DM anota en cuaderno:
   - Resultado: 9
   - Decisión: Esquiva
   - Regla aplicada: Esquivar (v2)
   - Nota: "Funcionó bien, mantener regla"

TURNO DEL GUARDIA:
1. DM tira por guardia: 1d6 = 3
2. DM decide: "Ataque fallido"
3. DM anota:
   - Resultado: 3
   - Decisión: Fallo
   - Nota: "Guardia es débil"
```

## Escenario: Regla Dinámica

```text`
PROBLEMA:
La regla de daño parece muy fuerte

ACCIÓN DEL DM:
1. DM abre cuaderno
2. Busca "Regla de daño"
3. Edita la regla:
   - Antes: 2d6 por ataque
   - Ahora: 1d6
4. Guarda cambios
5. Anota: "Cambié regla porque era muy fuerte"

RESULTADO:
- Regla actualizada
- Historial guardado
- Próxima sesión usa nueva regla
```

---

# 9. Modelos de Datos

## 9.1 Notebook Note

```typescript
interface NotebookNote {
  id: string;
  campaign_id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  linked_to?: {
    type: 'session' | 'character' | 'npc' | 'location' | 'event' | 'rule';
    id: string;
  };
  version: number;
  created_at: string;
  updated_at: string;
}
```

## 9.2 Note Version

```typescript
interface NoteVersion {
  id: string;
  note_id: string;
  version: number;
  content: string;
  created_at: string;
  change_summary?: string;
}
```

## 9.3 Notebook Folder

```typescript
interface NotebookFolder {
  id: string;
  campaign_id: string;
  name: string;
  parent_id?: string;
  created_at: string;
}
```

---

# 10. API Endpoints

```text
POST   /api/campaigns/{id}/notebook/notes         Crear nota
GET    /api/campaigns/{id}/notebook/notes         Listar notas
GET    /api/campaigns/{id}/notebook/notes/{nid}   Ver nota
PUT    /api/campaigns/{id}/notebook/notes/{nid}   Actualizar nota
DELETE /api/campaigns/{id}/notebook/notes/{nid}   Eliminar nota

GET    /api/campaigns/{id}/notebook/notes/{nid}/versions  Ver versiones
POST   /api/campaigns/{id}/notebook/notes/{nid}/versions  Crear versión

GET    /api/campaigns/{id}/notebook/folders       Listar carpetas
POST   /api/campaigns/{id}/notebook/folders       Crear carpeta
```

---

# 11. Notas Pendientes

```text
□ ¿El cuaderno es por campaña o global?
□ ¿Las notas son privadas del DM o compartidas?
□ ¿Se pueden adjuntar archivos (imágenes, PDFs)?
□ ¿Hay límite de notas?
□ ¿Se pueden buscar por contenido completo?
□ ¿Se pueden exportar a markdown?
□ ¿Se pueden importar desde markdown?
□ ¿Hay atajos de teclado?
□ ¿Se puede usar offline?
□ ¿Las notas se sincronizan entre dispositivos?
```

---

# 12. Impacto en el Sistema

```text
Frontend:
  → Componente de cuaderno
  → Editor de notas
  → Navegador de carpetas
  → Historial de versiones

Backend:
  → CRUD de notas
  → Almacenamiento de versiones
  → Búsqueda de contenido
  → Vinculación con entidades

Integración:
  → Sesiones pueden tener notas
  → Personajes pueden tener notas
  → Reglas son notas especiales
  → Decisiones se registran
```

---

# 13. Notas

```text
- El cuaderno es tipo Notion para el DM
- Todo se puede crear, editar, eliminar
- Las notas persisten entre sesiones
- Historial de versiones para ver cambios
- Vinculación con entidades del juego
- Persistencia automática
- El DM tiene control total sobre sus notas
```
