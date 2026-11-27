# PLAN DE IMPLEMENTACIÓN — Editor y catálogo de marcos para personajes de 22W22

> **Tipo:** Plan de análisis e implementación incremental  
> **Módulo:** Creación y edición de personajes dentro de una campaña  
> **Referencia funcional:** https://gmcrafttavern.com/token-maker/#maker  
> **Prioridad:** Media/Alta  
> **Estado:** Fase 0 (auditoría) CERRADA — adaptado el 2026-11-20 al flujo real de `apps/dm/src/pages/CharacterForm.tsx`.
> **Decisiones confirmadas:** configuración versionada en `visual_config_json`; marcos animados (GIF/WebM/MP4) permitidos como capa decorativa del retrato.
> **Regla principal:** adaptar la arquitectura existente de 22W22. No crear un subsistema paralelo ni reemplazar el flujo actual de personajes.

---

## 1. Objetivo

Incorporar al formulario de creación y edición de personajes de una campaña una herramienta para aplicar marcos decorativos a la imagen/ilustración del personaje.

El DM debe poder:

1. Cargar o seleccionar la imagen del personaje desde el flujo que ya existe.
2. Abrir una opción **«Marco»** dentro del bloque de retrato, sin abandonar ni perder datos del formulario.
3. Desplegar un editor lateral reutilizando el `Dialog` existente.
4. Elegir un marco desde un catálogo visual con miniaturas suficientemente grandes para distinguir sus detalles.
5. Ajustar independientemente la imagen del personaje y el marco.
6. Previsualizar el resultado en tiempo real, incluidos marcos animados.
7. Guardar selección y configuración versionada en el personaje.
8. Incorporar nuevos marcos manualmente al catálogo de la campaña, sin tocar código.

El editor debe servir tanto para personajes nuevos como para personajes ya creados.

## 2. Referencia funcional y alcance de la adaptación

La referencia GM Craft Tavern propone un flujo de composición de retrato + marco: importar una imagen, seleccionar/importar un borde, posicionar y redimensionar las capas por separado y generar una composición final.

Tomar como referencia conceptual:

- Capas independientes para retrato y marco.
- Ajustes de escala y posición.
- Catálogo de marcos seleccionables.
- Importación de marcos propios.
- Previsualización inmediata.
- Conservación de la proporción y transparencia del marco.

No copiar su interfaz literalmente ni incorporar dependencias, recursos o servicios externos sin evaluar previamente su licencia, necesidad y compatibilidad.

**Alcance inicial:** marcos estáticos y animados (GIF/WebM/MP4) como capa decorativa del retrato en 2D. Quedan fuera: vídeo como retrato, composición exportada, marketplace, eliminación automática de fondos y generación de imágenes. El token 3D/R3F sigue usando marco estático; la animación no se proyecta sobre el modelo 3D.

## 3. Auditoría previa (Fase 0) — RESUELTA

Auditoría ejecutada antes de tocar código. Resultado: casi toda la infraestructura ya existe; el plan original asumía lo contrario.

### 3.1 Frontend — reutilizar

- Pantalla real: `apps/dm/src/pages/CharacterForm.tsx` (misma pantalla para «Nuevo personaje» y «Editar personaje», `isEdit`).
- Control de retrato actual: `CharacterForm.tsx:204-237` (`fileInput`, `portraitPreview`). El botón **«Marco»** va en ese bloque, dentro del mismo `<form>`.
- Catálogo base ya existente: `apps/dm/public/frames/catalog.json` + `gold.svg`, `silver.svg`, `iron.svg`, `magical.svg`.
- Selector de marco ya implementado en `CharacterDetail.tsx:214-224` y `CharacterSheet.tsx:450`. Extender el patrón, no duplicarlo.
- Render del marco en tablero: `TokenSprite.tsx:12-26` recibe `frameUrl` y lo carga con `THREE.TextureLoader` (`58-64`).
- Drawer/modal reutilizable: `components/PreferencesDrawer.tsx` sobre `components/ui/Dialog`.
- Estilos: tokens CSS `var(--bg-*)`, `var(--text-*)`, `var(--accent)`; i18n `t()` con `locales/es|en/translation.json`.

### 3.2 Backend y persistencia — reutilizar

- `Character.frame` ya existe: `backend/models.py:92`, migración automática en `backend/database.py:75`.
- Schema: `backend/schemas.py:121` (`CharacterCreate.frame`) y `:147` (`CharacterUpdate.frame`); `visual_config_json` en `:133`.
- DTO TS: `apps/dm/src/lib/api.ts:152`, `:206`, `:240`.
- `Character.visual_config_json` (`models.py:88`) libre en frontend: hoy solo aparece en los DTO. Guardará la configuración versionada.
- `Asset` (`models.py:260`) ya es el catálogo por campaña; upload `POST /campaigns/{campaign_id}/assets` en `backend/routes.py:386` (50 MB; exts actuales `.png/.jpg/.jpeg/.webp/.mp4/.webm/.glb/.gltf/.fbx`), listado en `routes.py:441-465`, rename/favorite/delete en `:470-...`.
- Guardado de archivos: `backend/services/assets.py:30` `save_campaign_file`.
- Upload de retrato/modelo: `backend/upload_routes.py:43+`. No tocar.
- Storage local: único precedente `apps/dm/src/lib/customAudio.ts:19` (IndexedDB). No crear otra capa local: la fuente pública será `Asset`/servidor.

### 3.3 Consumidores del retrato

- Ficha: `CharacterDetail.tsx`, `CharacterSheet.tsx` (selector de marco ya presente).
- Formulario: `CharacterForm.tsx` (falta el selector; este es el hueco real).
- Tablero: `TokenSprite.tsx` vía `frameUrl`.
- La composición es una capa visual sobre el retrato: nunca sobrescribe `portrait_path` ni `model_path`.

### 3.4 Decisiones confirmadas y límites

1. `frame` sigue siendo slug del catálogo base (`none|gold|silver|iron|magical`) o `custom` cuando hay asset propio.
2. `visual_config_json.frame` guarda `{ version, assetId?, scale, x, y }` más la configuración del retrato. Sin columnas nuevas.
3. Marcos propios = `Asset` de campaña; formatos admitidos: PNG/JPG/JPEG/WebP/GIF/MP4/WebM. SVG queda fuera salvo política de sanitización.
4. Marcos animados se muestran en 2D (`<img>` para GIF, `<video>` para MP4/WebM). En el token 3D solo marco estático; limitación explícita.
5. Sin composición final persistida: se renderiza en cliente desde original + marco + configuración.

**Criterio de salida:** cumplido. No agregar arquitectura nueva; extender lo listado.

---

## 4. Experiencia de usuario propuesta

### 4.1 Ubicación

Dentro de la pantalla actual de creación/edición de personaje, mantener la ficha principal con sus campos habituales.

Añadir una opción **«Marco»** dentro del bloque de retrato de `CharacterForm.tsx:204-237`, junto a «Cambiar imagen». Al activarla, abrir un `Dialog` lateral reutilizando `components/ui/Dialog` (mismo patrón que `PreferencesDrawer`), sin navegar ni perder el estado del `<form>`.

En escritorio:

- Ficha/formulario a la izquierda.
- Editor de marcos a la derecha.
- El editor debe tener un ancho suficiente para que las miniaturas y la previsualización sean legibles.
- Evitar que el panel tape campos importantes o fuerce una reducción extrema del formulario.

En pantallas pequeñas:

- Transformar el panel en una vista apilada, drawer o modal a pantalla completa, según los patrones ya existentes.
- Mantener accesibles los controles y la previsualización.
- No introducir scroll horizontal innecesario.

### 4.2 Estados del editor

Contemplar estos estados:

1. Sin imagen de personaje: mostrar una indicación para cargar/seleccionar primero una imagen.
2. Imagen cargada, sin marco: mostrar la imagen y permitir explorar el catálogo.
3. Marco seleccionado: mostrar composición y controles de ajuste.
4. Marco personalizado cargado: incorporarlo al catálogo y seleccionarlo.
5. Cambios sin guardar: advertir antes de cerrar o descartar.
6. Error de archivo: explicar el motivo y permitir reintentar.

El editor no debe borrar los campos de la ficha al abrirse, cerrarse o cambiar de marco.

### 4.3 Distribución del panel

Propuesta conceptual:

```text
┌──────────────────────────── FICHA DEL PERSONAJE ────────────────────────────┐
│ Nombre, atributos, descripción, imagen, modelo 3D...                       │
│                                                                            │
│ Imagen del personaje     [Cambiar imagen]                                  │
│ Marco                    [Abrir editor de marcos]                          │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── EDITOR DE MARCOS ──────────────────────────────┐
│ Marcos de la campaña                           [＋ Importar marco]          │
│                                                                            │
│ ┌───────────────────────┐   Catálogo                                       │
│ │                       │   ┌────────┐ ┌────────┐ ┌────────┐               │
│ │    PREVISUALIZACIÓN   │   │ Marco  │ │ Marco  │ │ Marco  │               │
│ │    PERSONAJE + MARCO  │   │   01   │ │   02   │ │   03   │               │
│ │                       │   └────────┘ └────────┘ └────────┘               │
│ └───────────────────────┘                                                  │
│                                                                            │
│ Ajustes de imagen                                                         │
│ Zoom [────●────]  X [────●────]  Y [────●────]  [Centrar]                 │
│                                                                            │
│ Ajustes del marco                                                         │
│ Escala [────●────]  X [────●────]  Y [────●────]  [Restablecer]           │
│                                                                            │
│ [Quitar marco]                                  [Cancelar] [Aplicar]       │
└────────────────────────────────────────────────────────────────────────────┘
```

Es una guía de distribución, no una obligación de replicar exactamente este wireframe. Adaptar a los componentes y estilos existentes.

---

## 5. Catálogo visual de marcos

El catálogo es una parte central de la funcionalidad. No debe ser una lista de nombres con iconos genéricos: cada elemento debe mostrar una previsualización real del marco.

### 5.1 Presentación

- Cuadrícula responsive de tarjetas.
- Miniaturas grandes, con proporción consistente.
- Fondo neutro o ajedrezado para hacer visible la transparencia.
- Mostrar el marco completo, no un recorte que oculte sus bordes.
- Nombre del marco.
- Indicador de selección claro.
- Hover/focus accesible.
- Tooltip o detalle ampliado cuando sea útil.
- No deformar los PNG para llenar las tarjetas: usar `object-fit: contain`.
- Permitir desplazarse por el catálogo sin perder la previsualización ni los ajustes actuales.

La miniatura debe mostrar el marco sobre una imagen de muestra neutra o un fondo de transparencia, para que se entienda su aspecto. La previsualización principal debe mostrar el marco sobre la imagen real del personaje.

### 5.2 Categorías y filtros

Preparar la estructura para categorías futuras, por ejemplo:

- Fantasía clásica.
- Medieval.
- Mágico.
- Oscuro.
- Nobleza.
- Naturaleza.
- Elemental.
- Ciencia ficción.
- Personalizados.

No es obligatorio cargar un catálogo extenso de inicio. Si el catálogo todavía es pequeño, evitar filtros vacíos o una navegación sobredimensionada.

### 5.3 Marcos base — ya existen

No crear marcos nuevos. El catálogo `apps/dm/public/frames/catalog.json` ya trae cinco entradas: `none` (Sin marco), `gold`, `silver`, `iron`, `magical`, con SVG propios en `apps/dm/public/frames/`. Reutilizarlos tal cual; son originales del repo.

Fase 1 solo los expone en el formulario con miniaturas legibles. No hay placeholders nuevos ni licencias que revisar.

### 5.4 Importación manual de marcos por el DM

Botón **«Importar marco»** dentro del panel. Flujo adaptado al endpoint existente:

1. Selector de archivos.
2. Validación de extensión/tamaño por `POST /campaigns/{campaign_id}/assets` (`routes.py:386`). Agregar `.gif` a `allowed_exts`; `.mp4`/`.webm` ya están permitidos.
3. Previsualización antes de confirmar (GIF animado; MP4/WebM con `<video loop muted playsInline>`).
4. Nombre del marco + categoría opcional (campos ya soportados por `Asset.name` / `Asset.category`).
5. Guardar vía endpoint existente y mostrar de inmediato en la cuadrícula.
6. Seleccionarlo escribe `frame: 'custom'` + `visual_config_json.frame.assetId`.

Formatos admitidos: PNG, JPG/JPEG, WebP (transparencia), GIF, MP4, WebM. JPEG sin transparencia se admite con advertencia. SVG requiere sanitización server-side; queda fuera hasta que exista esa política.

El catálogo distingue marcos base (`/frames/*`) de marcos de campaña (`Asset`).

### 5.5 Gestión de assets

Reutilizar endpoints ya presentes, sin crear nuevos:

- Listar: `GET /campaigns/{campaign_id}/assets` (`routes.py:441`).
- Renombrar: `PUT .../assets/{asset_id}/name` (`routes.py:505`).
- Favorito: `PUT .../assets/{asset_id}/favorite` (`routes.py:488`).
- Eliminar: `DELETE .../assets/{asset_id}` (`routes.py:470`).

Reglas:

- No permitir borrar marcos base (`/frames/*`): no son `Asset`.
- Antes de borrar un marco en uso, contar personajes con `visual_config_json.frame.assetId` igual y avisar.
- No borrar el archivo físico si sigue referenciado: el delete actual borra registro + archivo (`remove_asset_file`); bloquear el botón mientras haya referencias.
- Los endpoints ya llevan `Depends(require_dm)`; no relajar.
- La vista del jugador resuelve URLs por `GET /campaigns/invite/{code}/assets` (`routes.py:553`); verificar `shared_with`/acceso al `/api/static/` del marco antes de darlo por visible en POV.

---

## 6. Editor de composición

### 6.1 Capas

El editor trabaja, como mínimo, con dos capas:

- **Capa inferior:** imagen del personaje.
- **Capa superior:** marco transparente.

El marco se superpone a la imagen. Ambas capas deben mantener transformaciones independientes.

No modificar el archivo original ni el modelo 3D.

### 6.2 Ajustes de la imagen

Controles:

- Zoom/escala.
- Posición horizontal.
- Posición vertical.
- Centrar.
- Ajustar a área.
- Restablecer valores.

Interacción deseable:

- Arrastrar la imagen dentro del área de composición.
- Zoom con slider.
- Opcionalmente rueda del mouse cuando el cursor esté sobre la previsualización.
- Límites que impidan perder completamente la imagen fuera del marco.
- Mantener proporción; no deformar la imagen.

### 6.3 Ajustes del marco

Controles:

- Escala.
- Posición horizontal.
- Posición vertical.
- Restablecer valores.

El marco debe poder ajustarse sin mover la imagen. En la mayoría de los casos se utilizará centrado y con escala uniforme, pero no imponerlo si impide adaptar marcos con distintos diseños.

### 6.4 Área de composición y proporciones

No asumir que todos los marcos son circulares. Preparar el sistema para marcos cuadrados, verticales, horizontales y otras proporciones.

Cada marco debe tener metadatos de proporción/formato o permitir calcularlos desde el asset.

La previsualización debe:

- Respetar la proporción de la composición.
- Mostrar transparencia correctamente.
- Recortar la imagen según el área definida.
- Evitar bordes serruchados o escalado de baja calidad.
- Mostrar nítido en el tamaño real del preview; no hay archivo de salida.

Para marcos circulares, la máscara debe venir en el SVG/PNG del marco. No asumir que todo PNG de marco ya incluye la máscara de recorte.

**Importante:** separar el área visible de la imagen (máscara/ventana) del dibujo ornamental del marco. Si el diseño de los marcos requiere una máscara particular, definir cómo se configura por asset. No inferir automáticamente una máscara perfecta solo por detectar transparencia.

### 6.5 Renderizado en cliente

Sin librerías nuevas. No hay exportación de composición en esta entrega.

- Retrato: `<img>` con el `portrait_path` existente.
- Marco base y marco propio raster: `<img>` con `/frames/<slug>.svg` o la `url` del `Asset`.
- Marco animado: `<img src=...>` para GIF; `<video autoPlay loop muted playsInline src=...>` para MP4/WebM.
- Un único componente `FramePreview` en `apps/dm/src/components/` concentra esa decisión y se usa en `CharacterForm`, `CharacterDetail` y `CharacterSheet`.
- La capa superior lleva `object-contain`; la inferior respeta el `object-cover` existente. Ajustes de escala/X/Y se aplican por CSS `transform` sobre cada capa.
- Three.js/R3F queda fuera: `TokenSprite` sigue recibiendo un `frameUrl` estático. No convertir vídeo a `VideoTexture` en esta fase.

---

## 7. Persistencia y modelo de datos

No crear `FrameAsset` ni tablas nuevas. La entidad de marcos propios es `Asset` (`models.py:260`) y la configuración vive en `Character.visual_config_json` (`models.py:88`).

### 7.1 Mapeo a lo que ya existe

| Concepto del plan original | Realidad en 22W22 |
|---|---|
| `FrameAsset` | `Asset` con `asset_type='image'`, `category='frames'` |
| `is_system` | Marcos base en `/frames/*.svg`; no son filas en DB |
| `asset_path` / `url` | `Asset.file_path` → `url` calculada en `routes.py:451-464` |
| `thumbnail` | Misma `url`; el navegador escala la miniatura |
| `mime_type` | Derivable de extensión / `asset_type`; no columna nueva |
| `created_by` | No existe en `Asset`; no agregar para el MVP |

### 7.2 Configuración del personaje

`Character.frame` conserva su significado actual: slug del catálogo base (`none|gold|silver|iron|magical`). Para un marco propio se escribe `custom`.

`visual_config_json` guarda la configuración versionada:

```json
{
  "version": 1,
  "portrait": { "scale": 1, "x": 0, "y": 0 },
  "frame": {
    "assetId": "<asset_id>",
    "scale": 1,
    "x": 0,
    "y": 0
  }
}
```

- `assetId` ausente con `frame: 'custom'` = estado inválido; el editor lo evita y las vistas caen al marco base o a `none`.
- Unidades: escala multiplicativa; `x`/`y` en píxeles normalizados respecto al canvas cuadrado (rango `-0.5..0.5`).
- No persistir objetos de canvas ni estado de React.
- Personajes antiguos: `frame` con slug válido y `visual_config_json={}` siguen renderizando igual.

### 7.3 Composición derivada

Estrategia A: renderizado en cliente. No se guarda imagen compuesta. Razones: el marco animado no tiene composición plana, el original queda intacto y el marco se puede cambiar después. `portrait_path` y `model_path` no se modifican.

---

## 8. Integración con el flujo actual de personajes

- La opción de marco solo debe estar disponible cuando exista una imagen de personaje compatible.
- Si el usuario cambia la imagen original después de ajustar el marco, conservar el marco y su configuración, recalculando la previsualización.
- Si elimina la imagen original, limpiar o suspender la composición según el comportamiento actual del formulario.
- Si cambia de marco, mantener la configuración de imagen siempre que sea razonable; restablecer solo ajustes incompatibles y explicarlo.
- Al guardar el personaje, persistir la selección y configuración dentro de la misma operación lógica de creación/edición.
- Si falla la subida del marco o la imagen, no perder los demás datos del personaje.
- Si se cierra el panel sin aplicar, descartar únicamente los cambios del editor, no el formulario completo.
- Si se edita un personaje existente, cargar su marco y configuración actuales.
- Los personajes antiguos sin marco deben seguir funcionando sin migraciones destructivas ni errores.

### 8.1 Vistas consumidoras

- Formulario (`CharacterForm`): panel lateral + preview en vivo.
- Ficha (`CharacterDetail`, `CharacterSheet`): ya tienen selector de marco; sustituir el `<img>` estático por `FramePreview` y respetar `visual_config_json`.
- Tablero (`TokenSprite`): seguir pasando `frameUrl` estático. Si el marco elegido es animado, usar el marco base configurado o `null`; nunca intentar animar dentro de R3F en esta fase.
- Listado/vista del jugador: consumir la misma `url` del `Asset`; validar acceso desde `/campaigns/invite/{code}/assets`.

No imponer marco al modelo 3D ni tocar materiales, texturas o geometría.

---

## 9. Backend, seguridad y validaciones

Cambios backend mínimos:

1. `backend/routes.py:394` — agregar `.gif` a `allowed_exts` para marcos animados. `.mp4`/`.webm` ya están.
2. Validar MIME real y tamaño con la lógica existente de `upload_asset`; rechazar GIF/MP4 corruptos.
3. `category='frames'` al guardar el asset del marco; el listado ya devuelve `category`.
4. Sin endpoints nuevos: CRUD de assets ya cubre listar/importar/renombrar/favorite/borrar.
5. Guardar la config del personaje por `PUT /campaigns/{campaign_id}/characters/{id}` con `CharacterUpdate` (`schemas.py:125`), que ya acepta `frame` y `visual_config_json`.

Seguridad:

- Los endpoints de assets ya exigen `Depends(require_dm)`; no relajar.
- No confiar en extensión: validar cabecera del archivo.
- Tope actual: 50 MB por asset (`routes.py:400`); reutilizar, no duplicar.
- Evitar rutas con nombres de usuario: `save_campaign_file` ya usa UUID (`routes.py:405-407`).
- No servir SVG arbitrario: queda fuera del MVP.
- No borrar assets referenciados por personajes (ver `5.5`).
- Sin servicios cloud de pago ni dependencias de terceros obligatorias.

---

## 10. Experiencia visual y calidad

El editor debe sentirse parte de 22W22, no una página externa incrustada.

Criterios:

- Reutilizar tipografía, colores, espaciados, bordes y componentes del proyecto.
- Mantener jerarquía clara entre catálogo, previsualización y controles.
- Las miniaturas deben ser grandes y legibles.
- La selección debe ser evidente.
- Los sliders deben mostrar valores o feedback suficiente.
- Añadir estados de carga, vacío y error.
- Evitar que el catálogo haga saltar el layout al cargar imágenes.
- Usar carga diferida si el catálogo crece.
- No mostrar marcos pixelados en miniaturas si existen assets de mayor resolución.
- Accesibilidad básica: controles con etiquetas, foco visible, navegación por teclado y botones con nombres comprensibles.

### 10.1 Rendimiento

- No recargar la imagen del marco en cada movimiento de slider: aplicar CSS `transform`.
- No hay exportación final: solo se renderiza la previsualización.
- Debounce/throttle solo donde aporte valor, sin introducir retraso perceptible en la interacción.
- Revocar object URLs de retratos al cambiarlos; no hay canvas temporal.
- Cachear miniaturas.
- Evitar cargar todos los archivos originales del catálogo a máxima resolución.

---

## 11. Fases de implementación

Fase 0 cerrada (sección 3). Cada fase siguiente = un tema = 1 commit + CI verde (`lint → typecheck → vitest → pytest → docs consistency`).

### Fase 1 — Botón «Marco» + catálogo base en el formulario

- `CharacterForm.tsx:204-237`: botón «Marco» que abre `Dialog` lateral sin navegar.
- Cuadrícula con los 5 marcos de `catalog.json` + `FramePreview`.
- Selección escribe `frame` en el estado local; «Quitar marco» vuelve a `none`.
- Sin persistencia nueva todavía: se guarda con el `handleSubmit` existente.

**Criterio de salida:** en «Nuevo personaje» se puede elegir/quitar marco sin perder datos del formulario.

**RESUELTO (2026-11-20, `1321851`, `cd9ef18`):** dialog visual con catálogo base y persistencia de `frame` al crear/editar.

### Fase 2 — Persistencia de la configuración

- Escribir `frame` + `visual_config_json.frame` en `CharacterCreate`/`CharacterUpdate` existentes.
- Cargar la configuración al abrir «Editar personaje».
- Controles de escala/X/Y del marco y del retrato sobre `FramePreview`.
- Compatibilidad con personajes sin `visual_config_json`.

**Criterio de salida:** marco y ajustes sobreviven a guardar, recargar y reabrir.

**RESUELTO (2026-11-20, `e0009b6`, `c9978ce`):** `frame` + `visual_config_json.frame` versionado, escala/X/Y del marco con preview en vivo y carga al editar. Queda fuera: controles independientes del retrato.

### Fase 3 — Marcos propios y animados

- `routes.py:394`: agregar `.gif`.
- Importar marco vía `POST .../assets` con `category='frames'`; preview GIF/MP4/WebM.
- Resolver `assetId` → `url` desde el listado de assets en las vistas 2D.
- `TokenSprite`: marco estático explícito para marcos animados.

**Criterio de salida:** un DM importa un GIF o MP4, lo selecciona y se ve animado en ficha y formulario.

**RESUELTO (2026-11-20, `a561217`, `53dbbbb`, `1f37f75`, `f83f073`, `63eceaa`, `f7ed952`):** `.gif` y `category='frames'` en assets; import/preview animado; `assetId` resuelto en ficha, formulario y tablero. `TokenSprite` sigue con marco estático: vídeo se omite en 3D sin URL rota.

### Fase 4 — Robustez y docs

- Errores de upload, asset huérfano/referenciado, POV y permisos.
- Locators e2e si cambia texto visible o nombre accesible.
- `docs/roadmap/IMPLEMENTATION-STATUS.md`, doc de la feature y `check-docs-consistency.py`.

**RESUELTO (2026-11-20):** e2e CH6-CH8 + CS20, lint/typecheck/vitest/pytest verdes, `check-docs-consistency.py` OK. Pendiente documentado, no implementado: verificación de POV/permisos y guard de asset referenciado.

**AJUSTE EN TABLERO (2026-11-20, `6a508d9`, `f5ba4d6`):** slider «Tamaño del marco» en el popup de doble clic. Edita `visual_config_json.frame.scale` — el mismo campo que el formulario — con preview en vivo en `TokenSprite` vía `frameScale`. Solo aparece en tokens 2D con marco; tokens 3D (`model_path`) no ofrecen el control. E2E D20 verifica persistencia; spec completa de dashboard 12/12.

---

## 12. Pruebas y criterios de aceptación

### Funcionales

- [x] «Marco» aparece en «Nuevo personaje» y en «Editar personaje».
- [x] El panel abre sin navegar y conserva todos los campos del formulario.
- [x] Se ven los 5 marcos base con miniaturas reales.
- [x] Se puede seleccionar y quitar un marco (`none`).
- [ ] Escala/X/Y de retrato y marco son independientes y se ven en vivo. **Parcial**: solo marco (`c9978ce`); retrato sigue sin controles.
- [x] Se puede importar PNG/WebP/GIF/MP4/WebM como marco de campaña (`a561217`).
- [x] El marco importado aparece en el catálogo y se puede seleccionar (`1f37f75`).
- [x] GIF y MP4/WebM se animan en ficha y formulario (`<img>`/`<video>`; GIF verificado en CH7).
- [x] Configuración y selección se guardan y se recuperan (`cd9ef18`, `c9978ce`).
- [x] Cambiar el retrato no destruye marco ni configuración (endpoints separados).
- [x] Personajes antiguos sin configuración siguen funcionando (fallbacks).
- [x] Modelo 3D y retrato original intactos.

### Seguridad y datos

- [x] Solo DM administra el catálogo; endpoints existentes no relajados (`require_dm`).
- [x] DM no altera assets de otra campaña (filtro por `campaign_id`).
- [x] Archivos inválidos o >50 MB se rechazan (`routes.py:395-403`).
- [ ] No se borra un asset referenciado por un personaje. **Pendiente**: el delete existente no chequea referencias.
- [x] SVG no se acepta sin sanitización (no está en `allowed_exts`).

### Visuales y rendimiento

- [x] Catálogo responsive, transparencia visible, selección clara.
- [x] `object-contain` en marcos, sin deformación.
- [x] `<video>` con `loop muted playsInline`; sin autoplay con sonido.
- [x] Sin saltos de layout al cargar miniaturas (contenedores de tamaño fijo).
- [x] Sin bloqueos al mover sliders (N/A: inputs numéricos, no sliders).

---

## 13. Fuera de alcance inicial

- Exportación de la composición a PNG/WebP/GIF/WebM.
- Vídeo como retrato del personaje.
- Animación del marco dentro del token 3D/R3F.
- Editor de dibujo libre ni máscaras vectoriales avanzadas.
- Marketplace, packs automáticos o generación IA de marcos.
- Edición de materiales/geometría 3D.
- SVG sin sanitización server-side.
- Capturas/poster generados a partir de vídeo.

---

## 14. Restricciones para el agente

1. **No rehacer el creador de personajes.** Integrar en `CharacterForm.tsx`.
2. **No crear segundo sistema de archivos.** Reutilizar `Asset` + `save_campaign_file`.
3. **No duplicar modelos, servicios, componentes ni endpoints** ya existentes.
4. No columnas nuevas: `frame` + `visual_config_json` alcanzan.
5. No introducir dependencias grandes; CSS + `<img>`/`<video>` bastan.
6. No acoplar la composición 2D a R3F.
7. No sobrescribir retrato ni modelo 3D.
8. No incorporar recursos con licencia dudosa; los 5 marcos base son propios del repo.
9. Una fase por commit; no implementar todo de golpe.
10. Si cambia texto visible o nombre accesible, grepear `tests/e2e` y actualizar locators en el mismo commit.
11. Añadir/actualizar pruebas en módulos afectados.
12. Si una premisa de este plan no coincide con el repo, adaptar y explicar antes de introducir arquitectura nueva.
13. No cerrar ni reiniciar servicios en `5173`, `5174` u `8000`.

## 15. Entregables esperados

- Editor integrado en «Nuevo personaje» y «Editar personaje» sin navegación.
- Catálogo visual con los 5 marcos base existentes.
- Importación de marcos propios por campaña, incluidos GIF/MP4/WebM.
- Ajustes independientes de retrato y marco.
- Persistencia versionada en `visual_config_json` + `frame`.
- Visualización en ficha, formulario y tablero dentro de los límites 2D.
- Validaciones y docs actualizadas.

## 16. Definición de terminado

Un DM crea un personaje, carga su retrato, abre «Marco», elige un marco base o importa uno propio (incluido GIF/MP4), ajusta ambas capas, guarda y reabre conservando la composición; el retrato original, el resto de la ficha y el modelo 3D quedan intactos. Marcos animados se ven animados en 2D; en el token 3D se usa marco estático.

**Principio rector:** integrar primero, reutilizar después y construir solo lo que realmente falte.
