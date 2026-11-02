# DICE-SYSTEM.md

> Sistema de dados para Roleito.
>
> Permite a jugadores y DM tirar dados personalizados.
>
> **ESTADO: DRAFT — Pendiente confirmación del DM.**

---

# 1. Concepto

Cada usuario (jugador o DM) puede tirar dados desde la interfaz.

```text
Jugador → Tira dados → Ve resultado en modal
DM → Tira dados → Ve resultado en modal
```

---

# 2. Dados Disponibles (6 tipos comunes)

| Dado | Caras | Forma | Uso principal |
|------|-------|-------|---------------|
| d4 | 4 | Tetraedro | Daño menor, magia básica |
| d6 | 6 | Cubo | **Uso principal del grupo** |
| d8 | 8 | Octaedro | Daño medio, habilidades |
| d10 | 10 | Trapezoedro | Porcentajes, escalas |
| d12 | 12 | Dodecaedro | Daño alto, críticos |
| d20 | 20 | Icosaedro | Tiradas importantes |

**Nota**: Estos son los dados comunes de D&D. El d6 es el dado principal del grupo.

---

# 3. Cantidad de Dados

El usuario selecciona un tipo de dado y puede tirar múltiples dados de ese mismo tipo:

```
1d6 → 1 dado de 6 caras
2d6 → 2 dados de 6 caras
3d6 → 3 dados de 6 caras
...
10d6 → 10 dados de 6 caras (máximo)
```

**Límite**: 1-10 dados por tirada

Ejemplos:
```
1d4 → 1 dado de 4 caras
3d6 → 3 dados de 6 caras
2d8 → 2 dados de 8 caras
5d10 → 5 dados de 10 caras
1d12 → 1 dado de 12 caras
10d20 → 10 dados de 20 caras (máximo)
```

---

# 4. Modal de Tirada

Cuando un usuario tira dados, se abre un modal:

```
┌─────────────────────────────────────────┐
│  TIRADA DE DADOS                        │
├─────────────────────────────────────────┤
│                                         │
│    [d6] [d6] [d6]  ← dados visuales    │
│                                         │
│    Resultado: 4 + 6 + 2 = 12           │
│                                         │
│  [Tirar de nuevo]  [Cerrar]            │
│                                         │
└─────────────────────────────────────────┘
```

---

# 5. Componentes del Modal

## 5.1 Header
```text
Título: "TIRADA DE DADOS"
Tipo de dado seleccionado: "d6"
Cantidad: 3
```

## 5.2 Dados Visuales
```text
Cada dado muestra:
- Forma del dado (visual)
- Número resultante
- Animación de tirada
```

## 5.3 Resultado
```text
Suma total: 12
Desglose: 4 + 6 + 2
```

## 5.4 Acciones
```text
[Tirar de nuevo] → Misma configuración
[Cerrar] → Cierra el modal
```

---

# 6. Flujo de Tirada

```text
1. Usuario selecciona tipo de dado (d6, d8, etc.)
2. Usuario selecciona cantidad (1-10)
3. Usuario hace clic en "Tirar"
4. Se abre modal con animación
5. Se muestra resultado
6. Usuario puede tirar de nuevo o cerrar
```

---

# 7. Personalización de Dados

## 7.1 Dados Predefinidos
```text
Los 6 dados están predefinidos en el sistema:
- d4 (daño menor)
- d6 (principal)
- d8 (daño medio)
- d10 (porcentajes)
- d12 (daño alto)
- d20 (tiradas importantes)
```

---

# 8. Uso en el Juego

> **DECISIÓN (2026-08-22)**: las tiradas son **INFORMATIVAS y MANUALES**.
>
> - No hay mapping fijo atributo→dados ni habilidad→atributo.
> - El atributo (`+` / `/` / `−`) es solo una **guía visual** para que el DM
>   decida cuántos dados tira el jugador ("tirás con 2 dados").
> - El sistema tira lo que se le pide y muestra el resultado; nada más.
> - La interpretación del resultado y las consecuencias son 100% del DM.
>
> Ver CHARACTER-STATS.md §1 y §4.

## 8.1 Tiradas de Combate
```text
Ataque: N dados que el DM indique vs Defensa
Daño:   los dados que defina el DM según arma/situación
Crítico: criterio del DM (ej: tirar más dados)
```

## 8.2 Tiradas de Habilidades

Sin mapping fijo. El DM mira el estado del atributo relevante (guía visual)
y decide cuántos dados tira el jugador:

```text
+ → más dados de lo estándar
/ → cantidad estándar
− → menos dados de lo estándar
```

Ejemplos (la relación con el atributo la define el DM en cada caso):

```text
Persuasión, Investigación, Sigilo, Resistencia, etc.
→ el DM anuncia la tirada y el jugador tira lo indicado
```

## 8.3 Tiradas Especiales
```text
Salvación: ??? (pendiente info del DM)
Iniciativa: ver §16 — cada jugador tira el dado que el DM indique
Percepción: como cualquier tirada — el DM define tipo y cantidad
```

---

# 9. Log de Tiradas

```text
Cada tirada se persiste en la tabla dice_rolls (SQLite):
- entity_type: "character" | "npc" | null
- entity_id: id del personaje/NPC
- entity_name: nombre para display
- roller_name: "DM" | nombre del jugador
- dice_type: 4|6|8|10|12|20
- count: 1-10
- results: [4, 6, 2] (JSON)
- total: 12
- label: "Sigilo — Aria" (opcional)
- created_at: timestamp

Límite: máx 20 tiradas por entity_id (trim automático al crear).
```

## 9.1 Sync en Tiempo Real

```text
Las tiradas se sincronizan entre DM y todos los jugadores
usando el mismo mecanismo de polling que ya existe (1s).

Flujo:
1. Jugador/DM tira dados → POST /campaigns/{id}/rolls
2. Backend guarda en DB + incluye hash del último roll en la revisión
3. Polling del cliente detecta cambio en revisión
4. GET /campaigns/{id}/rolls/recent?since={timestamp}
5. Toast notification en todos los clientes conectados

Cola de toasts:
- Se muestra hasta la siguiente tirada (se reemplaza)
- Máx 5 toasts visibles en cola
- Cada toast se desliza desde la derecha con animación
- Desaparece tras 6 segundos o con la siguiente tirada

Endpoints:
- POST /api/campaigns/{id}/rolls — crear tirada
- GET /api/campaigns/{id}/rolls/recent?since={ts} — rolls nuevos
- GET /api/campaigns/{id}/rolls/history/{entity_id} — historial (máx 20)
```

---

# 10. UI del Panel de Dados

## 10.1 Botón de Dados
```text
En la UI del jugador/jugadores:
[BOTÓN DADOS] → Abre panel de tirada
```

## 10.2 Panel de Tirada
```text
┌─────────────────────────────────────────┐
│  PANEL DE DADOS                         │
├─────────────────────────────────────────┤
│                                         │
│  Tipo: [d6 ▼]                           │
│  Cantidad: [-] 3 [+]                    │
│                                         │
│  [TIRAR DADOS]                          │
│                                         │
│  Última tirada: 12 (3d6)               │
│                                         │
└─────────────────────────────────────────┘
```

## 10.3 Historial
```text
Lista de últimas tiradas:
- 12 (3d6) - Ataque
- 8 (2d6) - Habilidad
- 15 (3d6) - Daño
```

---

# 11. Permisos

```text
Jugador:
  ✓ Puede tirar dados por su personaje asignado
  ✓ Ve toast de todas las tiradas (suyo y de otros)
  ✓ Ve historial propio en el panel de dados

DM:
  ✓ Puede tirar dados por cualquier personaje/NPC
  ✓ Ve toast de todas las tiradas
  ✓ Ve historial completo de todos los personajes
  ✓ Selecciona libremente personaje/NPC en el roller
```

---

# 12. Notas Pendientes

```text
✓ ¿Las tiradas son públicas o privadas? → PÚBLICAS: todos ven todo
✓ ¿El DM ve todas las tiradas de jugadores? → SÍ, vía toast + historial
✓ ¿Hay modificadores por atributo? → NO (2026-08-22): sin modificadores ni
  mapping fijo; atributo = guía visual para el DM (ver §8)
□ ¿Cómo se integra con el sistema de combate?
□ ¿Dado especial de salvada? (pendiente info del DM)
□ ¿Animaciones de dados 3D o 2D?
□ ¿Sonidos al tirar dados?
□ ¿Se pueden guardar configuraciones de tirada?
```

---

# 13. Impacto en el Sistema

```text
Frontend:
  → Componente de modal de dados
  → Panel de selección de dados
  → Historial de tiradas
  → Animaciones de dados

Backend:
  → Endpoint para tiradas
  → Almacenamiento de historial
  → Validación de permisos
  → Integración con eventos

Integración:
  → Combate usa tiradas
  → Habilidades usan tiradas
  → Salvadas usan tiradas (pendiente)
  → Eventos pueden incluir tiradas
```

---

# 14. Ejemplo de Implementación

```typescript
interface DiceRoll {
  id: string;
  user_id: string;
  dice_type: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
  count: number; // 1-10
  results: number[];
  total: number;
  timestamp: string;
  context?: string;
}

interface DicePanel {
  isOpen: boolean;
  selectedDice: string;
  count: number;
  lastRoll?: DiceRoll;
  history: DiceRoll[];
}
```

---

# 16. Sistema de Iniciativa

## Concepto

Al inicio de cada combate, el DM dice "tiren dados para la iniciativa".
Esto determina el orden de los turnos.

## Flujo de Iniciativa

```text
1. DM anuncia: "Tiren dados para la iniciativa"
2. Cada jugador tira dados (ej: 1d6)
3. DM tira por los enemigos/NPCs
4. DM carga resultados en orden
5. Se establece el orden de turnos
```

## Tirada de Iniciativa

```text
Jugador:
  - Tira 1d6 (o el dado que el DM indique)
  - Resultado = su iniciativa

DM:
  - Tira por cada enemigo/NPC
  - Resultado = iniciativa del enemigo
```

## Ejemplo

```text
JUGADORES:
  Ardan: 4
  Elena: 6
  Marcus: 2

ENEMIGOS (tira DM):
  Guardia 1: 3
  Guardia 2: 5

ORDEN DE TURNOS:
  1. Elena (6)
  2. Guardia 2 (5)
  3. Ardan (4)
  4. Guardia 1 (3)
  5. Marcus (2)
```

## Panel de Iniciativa

```text
┌─────────────────────────────────────────┐
│  ORDEN DE INICIATIVA                    │
├─────────────────────────────────────────┤
│                                         │
│  1. Elena (Jugador)      → 6           │
│  2. Guardia 2 (Enemigo)  → 5           │
│  3. Ardan (Jugador)      → 4           │
│  4. Guardia 1 (Enemigo)  → 3           │
│  5. Marcus (Jugador)     → 2           │
│                                         │
│  [Siguiente turno]  [Finalizar combate]│
│                                         │
└─────────────────────────────────────────┘
```

## Control por el DM

```text
El DM:
  □ Annuncia la tirada de iniciativa
  □ Tira por los enemigos/NPCs
  □ Carga los resultados
  □ Establece el orden de turnos
  □ Controla el flujo del combate
  □ Puede modificar el orden si es necesario
```

## Permisos

```text
Jugador:
  □ Tira sus propios dados de iniciativa
  □ Ve el orden de turnos
  □ Sabe cuándo le toca

DM:
  □ Tira por enemigos/NPCs
  □ Carga todos los resultados
  □ Controla el orden
  □ Puede modificar el orden
```

# 17. Notas

```text
- El sistema es simple: select dice → roll → see result
- Las tiradas son informativas y manuales (decisión 2026-08-22, ver §8):
  el sistema tira lo pedido y muestra el resultado; interpretación 100% del DM
- Máximo 10 dados por tirada (limitado por UI)
- 6 tipos de dados comunes: d4, d6, d8, d10, d12, d20
- El d6 es el dado principal del grupo
- El usuario selecciona tipo y cantidad
- Ejemplo: 3d6 = 3 dados de 6 caras
- Las tiradas se persisten en DB (dice_rolls) con trim a 20 por entity_id
- Sync en tiempo real vía polling (mismo mecanismo de revisión existente)
- Toast notifications: se muestran hasta la siguiente tirada
- DM puede tirar por cualquier personaje; jugadores por el suyo
- NO se muestra la sumatoria — solo los resultados individuales de cada dado
- La integración con combate es posterior al MVP
- Iniciativa: DM annuncia, jugadores tiran, DM tira por enemigos
- DM controla el orden de turnos
```
