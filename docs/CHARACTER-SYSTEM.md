# CHARACTER-SYSTEM.md

> Sistema completo de personajes.
>
> Documentación relacionada:
>
> - `DOMAIN.md` — Tipos de dominio de personajes
> - `DATA-MODEL.md` — Modelo de datos de personajes
> - **`CHARACTER-STATS.md`** — Sistema VIDA de atributos (V, I, D, A)

---

# 1. Tipos de Personaje

```text
PLAYER    — Personaje jugador (controlado por jugador)
NPC       — Personaje no jugador (controlado por DM/IA)
CREATURE  — Criatura (bestia, monstruo, etc.)
```

---

# 2. Estados de Personaje

```text
alive       — Vivo (estado normal)
unconscious — Inconsciente (PV = 0)
dead        — Muerto
unknown     — Estado desconocido
archived    — Archivado (fuera de campaña activa)
```

---

# 3. Alcance de Conocimiento

Determina qué sabe el personaje:

```text
DM_ONLY        — Solo el DM conoce
PARTY_KNOWN    — Todo el grupo conoce
CHARACTER_KNOWN — Solo ese personaje conoce
PUBLIC         — Conocimiento público en el mundo
SECRET         — Secreto que nadie conoce
UNKNOWN        — Desconocido
```

---

# 4. Atributos y Stats

Ver `CHARACTER-STATS.md` para el sistema completo de:

```text
Atributos base:    V, I, D, A
Stats derivados:   PV, PM, Defensa
Recuperación:      Regeneración por hora
Resolución:        Combate y desafíos
```
