# CHARACTER-STATS.md

> Sistema de atributos y estadísticas de personajes.
>
> Basado en el sistema VIDA (Vigor, Inteligencia, Destreza, Astucia).
>
> **REGLA VIGENTE**: los atributos NO son numéricos — cada uno es
> `+` (más), `/` (neutro) o `−` (menos). El DM usa el estado para indicar
> cuántos dados tira el jugador; todo lo demás lo resuelve el DM según cada caso.
>
> **ESTADO: DRAFT — Pendiente confirmación del DM.**

---

# 1. Atributos Base

Cuatro atributos cualitativos definen cada personaje o criatura. **No son números**:
cada atributo toma uno de tres estados.

| Sigla | Nombre    | Descripción |
|-------|-----------|-------------|
| **V** | Vigor     | Fuerza física, constitución, salud, masa corporal |
| **I** | Inteligencia | Capacidad mental, memoria, lógica, resistencia psíquica/mágica |
| **D** | Destreza  | Agilidad, coordinación ojo-mano, reflejos, velocidad |
| **A** | Astucia   | Percepción, intuición, instinto de supervivencia, anticipación táctica |

## Escala de valores

| Símbolo | Nombre  | Significado en la mesa |
|---------|---------|------------------------|
| **+**   | Más     | El DM indica al jugador tirar **más dados** de lo estándar |
| **/**   | Neutro  | Cantidad **estándar** de dados |
| **−**   | Menos   | El DM indica al jugador tirar **menos dados** de lo estándar |

El uso principal es que el DM pueda indicar cuántos dados tira el jugador según
el estado del atributo relevante para la tirada. La cantidad exacta por estado
y cualquier otro efecto quedan a criterio del DM según cada situación.

---

# 2. Estadísticas Derivadas

PV, PM y Defensa siguen existiendo como conceptos, pero **no se derivan de
fórmulas numéricas** (los atributos ya no son números):

| Estadística | Representa |
|-------------|------------|
| **PV**      | Daño físico que el cuerpo puede soportar antes de caer |
| **PM**      | Resistencia al estrés mental, locura, control mental, energía mágica |
| **Defensa** | Dificultad base que un atacante debe superar para impactar |

El valor concreto de cada una lo maneja el DM según cada personaje/situación.

> **Obsoleto** (modelo anterior con atributos numéricos):
> `PV = (V * 2) + D`, `PM = (I * 2) + A`, `Defensa = D + A`.

---

# 3. Recuperación (Sustento)

La recuperación durante descanso la maneja el DM según cada caso, teniendo en
cuenta el estado de Vigor (física) e Inteligencia (mental):

| Tipo | Atributo relevante | Condición |
|------|--------------------|-----------|
| Regeneración Física | Vigor (+ / / −) | Descanso completo |
| Regeneración Mental | Inteligencia (+ / / −) | Descanso completo |

Vigor o Inteligencia en `+` → recuperan más rápido; en `−` → más lento;
en `/` → ritmo estándar. Cifras exactas: criterio del DM.

---

# 4. Uso en Resolución de Combate

```
INICIATIVA:
1. DM dice: "Tiren dados para la iniciativa"
2. Cada jugador tira los dados que el DM indique
   (Destreza + / − puede sumar o restar dados)
3. DM tira por enemigos/NPCs
4. DM carga resultados en orden
5. Se establece orden de turnos

COMBATE:
Atacante tira los dados que el DM indique contra
la Defensa del objetivo (definida por el DM según
Destreza y Astucia del objetivo).

Si el resultado supera la Defensa → Impacto
Si no → Fallo/Evasión
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
1. Asignar estado a V, I, D, A: + (más), / (neutro) o − (menos)
2. PV, PM y Defensa los define el DM según cada personaje
3. PV y PM son barras de recursos consumibles
4. Disminuyen con daño/estrés
5. Se recuperan con descanso según §3
6. Seleccionar dados de daño según clase/arma
```

---

# 7. Notas Pendientes

```text
□ Cantidad estándar de dados por tirada (¿cuántos dados tira un atributo en /?)
□ ¿Cuántos dados suma/resta exactamente + y −? (¿1? ¿2? ¿lo decide el DM cada vez?)
□ ¿PV/PM iniciales según estado de atributos o valor fijo?
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
Character Model       → atributos VIDA (+ / / −) + PV/PM/Defensa
Character Creation    → 4 selectores de estado (+ / / −), PV/PM los define el DM
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
  character.stats_json = { "vigor": "+", ... }
  → Flexible, no requiere migration

Opción C (recomendada): campos base + JSON derivados
  V, I, D, A como campos dedicados (fijos)
  PV, PM, Defensa como JSON calculado (derivable)
  → Mejor de ambos mundos
```

> **Implementado (2026-08-22)**: Opción A — V, I, D, A como columnas `String` con
> valores `+` / `/` / `-` (default `/`), y Max PV / Max PM / Defensa como columnas
> `Integer` definidas por el DM (defaults 10/10/5, sin fórmulas). Migración automática:
> los atributos numéricos legacy se convierten a `/` al arrancar el backend
> (`DATA_MIGRATIONS` en `database.py`). Los PV/PM actuales previos se preservan tal cual.
