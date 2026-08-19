# CHARACTER-STATS.md

> Sistema de atributos y estadísticas de personajes.
>
> Basado en el sistema VIDA (Vigor, Inteligencia, Destreza, Astucia).
>
> **ESTADO: DRAFT — Pendiente confirmación del DM.**

---

# 1. Atributos Base

Cuatro atributos numéricos definen cada personaje o criatura:

| Sigla | Nombre    | Descripción |
|-------|-----------|-------------|
| **V** | Vigor     | Fuerza física, constitución, salud, masa corporal |
| **I** | Inteligencia | Capacidad mental, memoria, lógica, resistencia psíquica/mágica |
| **D** | Destreza  | Agilidad, coordinación ojo-mano, reflejos, velocidad |
| **A** | Astucia   | Percepción, intuición, instinto de supervivencia, anticipación táctica |

---

# 2. Fórmulas de Estadísticas Derivadas

Estadísticas calculadas automáticamente a partir de los atributos base:

```
PV (Puntos de Vida)  = (Vigor * 2) + Destreza
PM (Puntos de Mente)  = (Inteligencia * 2) + Astucia
Defensa (Evasión)     = Destreza + Astucia
```

| Estadística | Fórmula | Representa |
|-------------|---------|------------|
| **PV**      | `(V * 2) + D` | Daño físico que el cuerpo puede soportar antes de caer |
| **PM**      | `(I * 2) + A` | Resistencia al estrés mental, locura, control mental, energía mágica |
| **Defensa** | `D + A` | Dificultad base que un atacante debe superar para impactar |

---

# 3. Recuperación (Sustento)

Tasas fijas de recuperación durante descanso:

| Tipo | Rate | Condición |
|------|------|-----------|
| Regeneración Física | **[Vigor]** PV / hora | Descanso completo |
| Regeneración Mental | **[Inteligencia]** PM / hora | Descanso completo |

---

# 4. Uso en Resolución de Combate

```
INICIATIVA:
1. DM dice: "Tiren dados para la iniciativa"
2. Cada jugador tira 1d6 (o dado que DM indique)
3. DM tira por enemigos/NPCs
4. DM carga resultados en orden
5. Se establece orden de turnos

COMBATE:
Atacante: tira contra Defensa del objetivo
Defensa = Destreza + Astucia del objetivo

Si tiro >= Defensa → Impacto
Si tiro < Defensa  → Fallo/Evasión
```

---

# 5. Sistema de Dados

## Dados Disponibles (6 tipos comunes)

| Dado | Caras | Forma | Uso principal |
|------|-------|-------|---------------|
| d4 | 4 | Tetraedro | Daño menor, magia básica |
| d6 | 6 | Cubo | **Uso principal del grupo** |
| d8 | 8 | Octaedro | Daño medio, habilidades |
| d10 | 10 | Trapezoedro | Porcentajes, escalas |
| d12 | 12 | Dodecaedro | Daño alto, críticos |
| d20 | 20 | Icosaedro | Tiradas importantes |

## Cantidad de Dados

El usuario selecciona un tipo de dado y puede tirar múltiples dados de ese mismo tipo:

```
1d6 → 1 dado de 6 caras
2d6 → 2 dados de 6 caras
3d6 → 3 dados de 6 caras
...
10d6 → 10 dados de 6 caras (máximo)
```

**Límite**: 1-10 dados por tirada

## Modal de Tirada

```
┌─────────────────────────────────────────┐
│  TIRADA DE DADOS                        │
├─────────────────────────────────────────┤
│                                         │
│  Tipo: [d6 ▼]                           │
│  Cantidad: [-] 3 [+]                    │
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

# 6. Creación de Personaje

Al crear un personaje:

```
1. Asignar valores a V, I, D, A (rango pendiente de definir)
2. Calcular automáticamente PV, PM, Defensa
3. PV y PM son barras de recursos consumibles
4. Disminuyen con daño/estrés
5. Se recuperan con descanso según tasas de §3
6. Seleccionar dados de daño según clase/arma
```

---

# 7. Notas Pendientes

```text
□ Rango permitido para atributos base (1-10? 1-20?)
□ ¿Hay modificadores de clase/raza?
□ ¿Críticos? ¿Fisuras?
□ ¿Límite de PV/PM en 0? (¿muerte vs inconsciente?)
□ ¿Regeneración en combate?
□ ¿Coste de habilidades especiales en PM?
□ ¿Resistencia psíquica separada de PM?
□ ¿Armadura modifica Defensa?
□ ¿Bonificaciones por equipo?
□ ¿Dado especial de salvada? (pendiente info del DM)
□ ¿Cómo funciona la mecánica de salvada?
□ ¿Qué atributo se usa para salvadas?
□ ¿Hay dados personalizados para la campaña?
```

---

# 8. Impacto en el Sistema

```text
Character Model       → atributos VIDA + stats derivados
Character Creation    → formulario con 4 inputs + stats auto-calculados
Session Events        → eventos de daño consumen PV/PM
DM Control UI         → barras de PV/PM visibles por personaje
Renderer              → indicadores de estado visual
Context System        → estado de salud para agentes IA
Dice System           → tiradas de dados por jugador
Dice Modal            → visualización de dados tirados
```

---

# 8. Almacenamiento (Recomendación)

```text
Opción A: campos dedicados en Character
  character.vigor, character.intelligence, ...
  → Simple, queryable, explícito

Opción B: JSON embebido
  character.stats_json = { "vigor": 5, ... }
  → Flexible, no requiere migration

Opción C (recomendada): campos base + JSON derivados
  V, I, D, A como campos dedicados (fijos)
  PV, PM, Defensa como JSON calculado (derivable)
  → Mejor de ambos mundos
```
