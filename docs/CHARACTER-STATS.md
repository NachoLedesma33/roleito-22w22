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
Atacante: tira contra Defensa del objetivo
Defensa = Destreza + Astucia del objetivo

Si tiro >= Defensa → Impacto
Si tiro < Defensa  → Fallo/Evasión
```

---

# 5. Creación de Personaje

Al crear un personaje:

```
1. Asignar valores a V, I, D, A (rango pendiente de definir)
2. Calcular automáticamente PV, PM, Defensa
3. PV y PM son barras de recursos consumibles
4. Disminuyen con daño/estrés
5. Se recuperan con descanso según tasas de §3
```

---

# 6. Notas Pendientes

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
```

---

# 7. Impacto en el Sistema

Este sistema afecta:

```text
Character Model       → atributos VIDA + stats derivados
Character Creation    → formulario con 4 inputs + stats auto-calculados
Session Events        → eventos de daño consumen PV/PM
DM Control UI         → barras de PV/PM visibles por personaje
Renderer              → indicadores de estado visual
Context System        → estado de salud para agentes IA
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
