# Sistema de diseño 22W22 (V2: alto contraste y theming)

Directrices globales de UI/UX de la plataforma: fantasía oscura, archivos
interdimensionales, magitech. **La regla manda sobre el gusto**: cuando una
componente nuevo choque con estas líneas, se cambia el componente.

## 1. Reglas estrictas

1. **CERO TRANSPARENCIAS EN HUDS/MODALES.** Prohibido `backdrop-blur` y
   colores con opacidad (`bg-black/50`) en **paneles que contengan texto**.
   Los fondos son **sólidos**: el texto tiene que leerse sin esfuerzo sobre
   el mapa o la imagen de fondo. Los *velos* de los modales (el fondo que
   tapa el mapa) sí son translúcidos: su trabajo es ese.
2. **ALTO CONTRASTE ABSOLUTO.** Prohibido los grises genéricos oscuros
   (`text-gray-400`, `text-gray-500`) para texto legible. El texto usa
   `text-primary` / `text-secondary` (tokens, no hex sueltos).
3. **CERO ESTILOS GENÉRICOS.** Nada de botones morados planos ni inputs de
   HTML estándar.
4. **THEMING.** Toda la paleta pasa por variables CSS: al cambiar de tema
   la interfaz muda sola, sin clases hardcodeadas.
5. **GRID sobre FLEX.** Para estructurar modales, listas y dashboards se
   prioriza CSS Grid (`grid-cols-[auto_1fr_auto]`) sobre `flex` anidado.

## 2. Tokens

Definidos en `apps/dm/src/index.css` (`:root` + cada tema). Son **alias** de
los tokens del tema: un tema los redefine y estos siguen al tema.

| Token | Para | Tailwind |
|---|---|---|
| `--bg-surface` | Fondo sólido de paneles y HUDs | `bg-surface` |
| `--bg-surface-elevated` | Tarjetas internas e inputs | `bg-surface-elevated` |
| `--text-primary` | Texto principal | `text-primary` |
| `--text-secondary` | Texto secundario (legible) | `text-secondary` |
| `--accent-primary` | Violeta magitech (interacción) | `text-accent-primary`, `bg-accent-primary` |
| `--accent-secondary` | Cian arcano (datos, foco) | `text-accent-secondary` |
| `--border-subtle` | Bordes separadores | `border-subtle` |

Los alias legacy (`--bg-primary`, `--text-primary`, `--accent`, …) siguen
vivos: conviven con los nuevos.

## 3. Tipografía

| Uso | Fuente | Tailwind |
|---|---|---|
| Títulos (H1, H2, headers de modales) | **Cinzel** | `font-display` |
| Cuerpo y formularios | **Montserrat** | `font-sans` (default) |
| Datos críticos (relojes, PV/PM, campos de máquina) | **Space Mono** | `font-mono` |

Las tres se cargan desde `index.html`. Los títulos llevan `tracking-wide` y
`text-primary` (nunca con opacidad).

## 4. Componentes

### Contenedores y modales
- Fondo **sólido**: `bg-surface`.
- Borde sutil pero sólido: `border border-subtle`.
- Sombra dura y profunda: `shadow-[0_10px_40px_rgba(0,0,0,0.8)]` (da relieve
  sin desenfoques).

### Inputs, selects y textareas
- Fondo sólido más claro que el modal: `bg-surface-elevated` (da profundidad
  real).
- Borde inferior pronunciado o completo, y al enfocar cambia drásticamente:
  `focus:border-accent-primary focus:ring-1 focus:ring-accent-primary`.
- Texto ingresado: `text-primary` puro.

### Botones de acción
- Prohibido el fondo plano: o degradado sutil con variables
  (`from-accent-primary to-accent-primary-dark`) o fondo oscuro con borde
  brillante (`bg-surface-elevated border border-accent-primary`).
- Hover: no solo cambia de color, se siente activado:
  `hover:shadow-[0_0_15px_var(--accent-primary)]`.

### Barras de vida / recursos
- Gruesas, con fondo oscuro sólido (`bg-surface-elevated`) y relleno de color
  puro (rojo intenso para PV, cian/azul brillante para PM). Sin degradados
  que dificulten ver la cantidad exacta.

## 5. Verificación

`npm run lint` (0 errores), `npm run typecheck`, `npm run test --workspace=apps/dm`
y el e2e de lo afectado. La suite de a11y (`tests/e2e/a11y.spec.ts`) corre
axe sobre el landing, el login, el lobby, el detalle de campaña, el shell del
DM, la lista de jugadores y la vista del jugador: el contraste no se
negocia, axe lo verifica.
