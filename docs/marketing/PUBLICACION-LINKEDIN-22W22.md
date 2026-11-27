# Publicación 22W22 — LinkedIn + kit de demo

Borrador de comunicación. Todo lo funcional está verificado en `README.md`, `docs/roadmap/IMPLEMENTATION-STATUS.md` y `apps/dm/src/locales/es/translation.json`. Lo legal sigue siendo borrador técnico: revisión de abogado antes de publicar.

## 1. Propuesta de valor

**Frase central**

> 22W22 convierte tu campaña de D&D en un mundo que recuerda: mesa VTT 2D/3D, canon aprobado por el DM e IA que asiste sin decidir.

**A quién habla**

- DMs de D&D que quieren menos configuración y más juego.
- Jugadores que recién entran: nombre + PIN, mesa lista, guía del DM y FAQ.
- Recruiters y equipos de producto: proyecto real, local-first, frontend React/TS/Three.js, backend FastAPI/SQLAlchemy, 320 e2e verdes.

**Por qué se destaca**

| Diferencial | Cómo se cuenta |
|---|---|
| World State como fuente de verdad | Mapa, canon, memoria y narrativa no se contradicen: todo sale del mismo estado. |
| IA con permisos | Propone, redacta y sugiere. El canon lo firma el DM. Nunca escribe el DB directo. |
| Visión real por jugador | Niebla, líneas de visión, luces, sentidos especiales y secretos por rol. Sin spoilers. |
| Detección de muros y puertas | CV + IA sobre el mapa, con propuesta revisable por el DM antes de aplicarse. |
| Memoria persistente | Lo que pasó en la sesión 3 aparece en el resumen de la sesión 4. |
| Local-first | La campaña vive en SQLite en tu máquina. Sin nube obligatoria. |

**No decir** (evita promesas falsas): "único en el mercado", "multijugador online", "sincronización en nube", "combate completo", "gratis", "privacidad certificada".

---

## 2. Borrador LinkedIn — pegar tal cual

Pasé meses construyendo una mesa de D&D que recuerda lo que pasó en la sesión anterior.

No es otro mapa con tokens. Es **22W22 - D&D VTT**: un motor local-first donde el World State es la fuente de verdad, la IA propone y el DM decide.

Qué hace que la mesa se sienta distinta:

- Subís un mapa y el sistema detecta muros y puertas con CV + IA; vos revisás y aprobás antes de que entre al juego.
- Niebla estática y dinámica, líneas de visión reales, luces que se tapan con paredes, sentidos especiales y pedidos de luz del jugador.
- Cada jugador ve solo lo que su personaje ve: su niebla, su alcance, sin pestañas de DM ni spoilers.
- Tablero 2D/3D con tokens, rotación, escala, modelos 3D y marcos animados.
- Clima, audio ambiente y efectos visuales para 36 habilidades llegan al POV en vivo por WebSocket.
- Canon con flujo propuesto → revisado → aprobado. La memoria sobrevive entre sesiones y alimenta resúmenes y narración.
- Ocho agentes de IA ayudan con lore, recaps y redacción; ninguno escribe canon sin tu firma.
- Dados con historial y tiradas secretas, iniciativa, estado VIDA, cuaderno del DM con versionado, documentos para jugadores, misiones y calendario.
- Arrancar es simple: nombre, PIN, campaña, mesa. Hay guía del DM y preguntas frecuentes dentro de la app.
- Todo corre en tu máquina con SQLite: importás/exportás campañas y jugás en LAN o por túnel cuando querés.

Lo construí con React 18 + TypeScript strict + Vite + Tailwind + Three.js/R3F y FastAPI + SQLAlchemy + SQLite. Hoy: 358 tests unitarios, 242 de backend y 320 e2e en verde.

Si sos DM, probalo y decime qué le falta. Si estás del lado del reclutamiento o del producto, me interesa charlar sobre cómo se construye una herramienta así sin perder la autoridad del DM.

Repo: https://github.com/NachoLedesma33/22W22-DnD-VTT

#DnD #VTT #TabletopRPG #React #TypeScript #FastAPI #ThreeJS #LocalFirst #IA #DevLog

**Primer comentario (pegar justo después de publicar)**

> Detalle técnico para quien le interese: el renderer vive dentro de `apps/dm`, el core es bilingüe Python + TypeScript, y la IA nunca escribe al DB directo: todo entra por Event System y pasa por revisión del DM. Docs y decisiones de arquitectura están en el repo.

---

## 3. Foros de nicho — dónde y cómo

| Canal | Ángulo | Regla práctica |
|---|---|---|
| `r/DnD` | "Hice una mesa VTT que recuerda el canon entre sesiones" | Leer reglas de autopromo; aportar capturas y responder comentarios antes de soltar link. |
| `r/DMAcademy` | Problema concreto de DM: resúmenes, continuidad, secretos de jugadores | Enfocar en el problema, no en el producto. Link al final si aporta. |
| `r/VirtualTabletop` / `r/Roll20` | Comparativa honesta de visión, niebla y muros | Evitar "mejor que X"; comparar features con datos y admitir lo que falta. |
| EN World / foros de DriveThruRPG | Build log largo con decisiones de diseño | Formato hilo, no post de una línea. |
| Discord de DMs y servidores de campañas | Demo de 30 s + invitación a feedback | Pedir permiso a moderación antes de postear link. |
| Grupos de LinkedIn de DMs / game devs | Versionar el mismo post con gancho técnico | Reciclar el borrador de arriba, cambiar el primer párrafo. |

Patrón que funciona: primero valor (captura, tip, respuesta concreta), después link. Nunca soltar el repo como primer mensaje.

---

## 4. Prompt para la demo publicitaria

Copiar en la herramienta de video/editor con capacidades de storyboard. Reemplazar `[RUTA_CAPTURA]` por capturas reales de la app.

```text
Creá un video vertical 9:16 de 42 segundos para LinkedIn: demo publicitaria de 22W22 - D&D VTT.
Tono: producto real, técnico pero humano, sin hype. No es tráiler cinematográfico; es captura de pantalla real con motion graphics livianos.

REGLAS
- Usá SOLO capturas reales de la app. No inventes UI, botones ni nombres de menú.
- Datos ficticios: DM "Ardan", campaña "La Veta", personajes "Varek" y "María". Nada de datos reales de campaña.
- Voz en español rioplatense, ritmo pausado, sin muletillas. Subtítulos quemados, palabra por palabra.
- Música ambient oscura sin vocales, volumetría -18 LUFS; voz por encima.
- Paleta: fondo nocturno, acento ámbar, tipografía limpia. Logo animado local si está disponible: apps/dm/public/ui/22w22Logo-animado.mp4.
- Salida: MP4 H.264, 1080x1920, 30 fps, máximo 40 MB.

PLANOS
0-4 s | HOOK. Captura de la mesa en movimiento, token iluminado. Texto: "Tu campaña recuerda". VO: "Pasé meses construyendo una mesa que no olvida lo que pasó la sesión anterior."
4-11 s | MAPA. Subir mapa → detección de muros → propuesta revisada. Texto: "Muros detectados. Vos aprobás." VO: "Subís el mapa, el sistema propone muros y puertas, y el DM decide."
11-18 s | VISIÓN. Niebla, luz, vista del jugador con POV. Texto: "Cada jugador ve solo lo suyo." VO: "Niebla, líneas de visión y luces reales. Cada jugador ve solo lo que su personaje ve."
18-25 s | CANON + MEMORIA. Pipeline propuesto → revisado → aprobado, luego resumen de sesión. Texto: "La IA propone. El DM firma." VO: "La IA asiste, pero el canon siempre lo aprobás vos. Y lo que pasó, sigue pasando."
25-32 s | ATMÓSFERA. Clima, audio, una habilidad con VFX. Texto: "Clima, audio y 36 efectos." VO: "Clima, ambiente y efectos llegan en vivo a la vista del jugador."
32-38 s | JUEGO. Dados, iniciativa, cuaderno, misiones. Texto: "Todo en una mesa." VO: "Dados, iniciativa, notas, misiones y calendario, sin cambiar de pantalla."
38-42 s | CIERRE. Logo + texto: "22W22 - D&D VTT · Local-first". VO: "22W22. El mundo que tus sesiones recuerdan. Link en el primer comentario."

NEGATIVOS
- No muestres menús que no existen.
- No digas "online", "gratis", "único", "sin servidores" de forma absoluta.
- No incluyas caras de jugadores reales sin permiso.
```

**Si la herramienta no acepta capturas** (Runway, Pika, Synthesia): convertí cada plano en una instrucción de escena y subí las capturas como assets de referencia. El plano 18-25 s conviene hacerlo en editor, no con IA generativa: es donde más se nota una UI falsa.

---

## 5. Herramientas para producirla

| Etapa | Herramienta | Para qué |
|---|---|---|
| Guion | ChatGPT / Claude / Gemini | Cortar el borrador de arriba a 42 s y ajustar el gancho |
| Captura UI | Playwright con `recordVideo` en `playwright.config.ts` | Grabar flujo real corto: mapa → muros → visión → dados |
| Captura alternativa | OBS Studio (gratis) / Game Bar (Windows) | Grabar pantalla con voz en off en una toma |
| Edición | CapCut (rápido, subtítulos auto) o DaVinci Resolve (gratis, más control) | Armar los 7 planos, recortar, quemar subtítulos |
| Gráficos | Canva o Figma | Textos, paleta, thumbnail para LinkedIn |
| Voz | ElevenLabs / Azure TTS, o voz propia + Audacity | Locución y limpieza de ruido |
| Música | YouTube Audio Library / Epidemic Sound / Artlist | Ambient sin vocales, licencia clara |
| B-roll opcional | Runway / Pika | Transiciones o planos atmosféricos; nunca UI falsa |
| Avatar opcional | Synthesia | Solo si querés presenter; baja prioridad para demo de producto |
| Publicación | LinkedIn (subida nativa, 9:16) | Mejor alcance que un link externo; primer comentario con repo |

Orden recomendado: captura real → edición → voz → subtítulos → música → export → publicación. Grabar la voz al final evita regrabar por cambios de timing.

## 6. Checklist antes de publicar

- [ ] Abogado revisó textos legales y de privacidad.
- [ ] Capturas tomadas de `566dfc4` o posterior, sin datos reales de campaña.
- [ ] Ninguna frase dice "único", "online", "nube", "gratis" ni "privacidad certificada".
- [ ] Link del repo apunta a `https://github.com/NachoLedesma33/22W22-DnD-VTT`.
- [ ] Video tiene subtítulos quemados y thumbnail con la marca completa.
- [ ] `venv\Scripts\python.exe scripts\check-docs-consistency.py` sin errores nuevos.
