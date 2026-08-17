# SETTING-INGESTION.md

## 1. Propósito

Este documento define cómo el RPG World Engine importa, procesa,
indexa y mantiene lore externo de un setting de campaña.

La fuente inicial es:

https://www.thearchiveinbetween.com/

La información importada debe permanecer separada de:

- Canon de campaña
- Eventos de sesión
- Hechos creados por jugadores
- Estado actual del mundo
- Decisiones del DM

El setting externo es una fuente de conocimiento de referencia.

NO es automáticamente canon de campaña.

---

## 2. Principio Fundamental

El sistema debe mantener la siguiente separación:

```text
SETTING EXTERNO
       ↓
LORE IMPORTADO
       ↓
LORE NORMALIZADO
       ↓
REFERENCIAS DE CAMPAÑA
       ↓
CANON DE CAMPAÑA
       ↓
ESTADO ACTUAL DEL MUNDO
```

La información nunca debe fluir automáticamente desde:

```text
SETTING EXTERNO
       ↓
CANON DE CAMPAÑA
```

sin validación explícita.

---

## 3. Fuente Inicial

Fuente primaria:

The Archive In Between

https://www.thearchiveinbetween.com/

El scraper debe descubrir la estructura real del sitio en lugar de asumir
patrones de URL, categorías, entidades o terminología específicas.

No hardcodear entidades ficticias que no se hayan descubierto de la fuente.

---

## 4. Objetivos

El sistema de ingestión debe poder:

1. Descubrir páginas públicas relevantes.
2. Descargar sus contenidos responsablemente.
3. Extraer información textual útil.
4. Preservar metadatos de la fuente.
5. Normalizar la información.
6. Detectar contenido duplicado.
7. Crear documentos Markdown buscables.
8. Crear metadatos legibles por máquina.
9. Mantener relaciones entre entidades del lore.
10. Detectar páginas actualizadas.
11. Evitar descargar contenido no cambiado.
12. Preservar procedencia.
13. Permitir validación manual.
14. Permitir actualizaciones incrementales.

---

## 5. Anti-Objetivos

El sistema de ingestión NO debe:

- Declarar automáticamente lore importado como canon de campaña.
- Inventar lore faltante.
- Reescribir información de la fuente como hecho sin procedencia.
- Modificar historia de campaña.
- Modificar personajes de jugadores.
- Modificar eventos de sesión.
- Generar eventos de campaña desde lore externo.
- Asumir que cada página pertenece a la campaña actual.
- Sobrescribir silenciosamente información validada manualmente.

---

## 6. Restricciones Legales y Operativas

El crawler debe comportarse como un cliente educado de la web pública.

Antes de crawlear:

1. Verificar robots.txt cuando esté disponible.
2. Verificar los Términos de Servicio del sitio cuando estén disponibles.
3. Respetar restricciones de crawleo.
4. Respetar límites de tasa.
5. Evitar peticiones paralelas agresivas.
6. Usar caché.
7. Evitar descargas repetidas innecesarias.
8. Identificar al crawler con un User-Agent razonable.
9. No intentar saltar controles de acceso.
10. No scrape contenido privado o autenticado.

Si el sitio prohíbe explícitamente el crawleo automatizado, detener la
ingestión automatizada y requerir un método de importación alternativo.

---

## 7. Estrategia de Crawl

El scraper debe seguir este pipeline:

```text
DESCUBRIR
    ↓
FILTRAR
    ↓
OBTENER
    ↓
CACHEAR
    ↓
EXTRAER
    ↓
NORMALIZAR
    ↓
CLASIFICAR
    ↓
INDEXAR
    ↓
RELACIONAR
    ↓
VALIDAR
```

---

## 8. Descubrimiento

El crawler debe comenzar desde el punto de entrada público del sitio.

Debe descubrir enlaces desde:

- Navegación principal
- Sitemap
- Enlaces internos
- Páginas de índice
- Páginas de archivo
- Páginas públicas de documentación
- Páginas públicas de historias
- Páginas públicas de lore

Preferir información del sitemap cuando esté disponible.

No crawlear dominios externos arbitrarios.

---

## 9. Restricción de Dominio

Por defecto:

Permitido:

```text
https://www.thearchiveinbetween.com/
```

Potencialmente permitido:

Otros paths en el mismo dominio.

Dominios externos descubiertos a través de enlaces NO deben ser crawleados
recursivamente a menos que estén explícitamente configurados.

Los enlaces externos deben almacenarse como referencias.

---

## 10. Normalización de URLs

Antes de almacenar una URL:

- Normalizar esquema.
- Normalizar hostname.
- Eliminar fragmentos innecesarios.
- Normalizar barras finales cuando sea apropiado.
- Detectar URLs equivalentes.
- Prevenir crawleo duplicado.

Ejemplo:

```text
/pagina
/pagina/
/pagina#seccion
```

no deben convertirse automáticamente en tres documentos independientes.

---

## 11. Estado del Crawl

Mantener una base de datos local del crawl.

Información mínima:

```text
url
url_canonica
estado
http_estado
hash_contenido
ultima_obtencion
ultima_modificacion
etag
profundidad_crawl
tipo_contenido
error
```

---

## 12. Caché Local

El contenido descargado debe cachearse localmente.

Estructura sugerida:

```text
/data/setting-cache/
├── raw/
├── normalized/
├── metadata/
└── index/
```

La caché previene peticiones de red innecesarias.

---

## 13. Crawl Incremental

En ejecuciones posteriores:

1. Verificar si la URL fue previamente descargada.
2. Usar headers de caché HTTP cuando se soporten.
3. Comparar hashes de contenido.
4. Descargar solo recursos cambiados.
5. Preservar versiones anteriores cuando sea útil.

El scraper no debe re-descargar el setting completo en cada ejecución.

---

## 14. Preservación del Fuente Original

Cuando sea práctico, preservar la representación descargada original.

Ejemplo:

```text
/data/setting-cache/raw/
```

Los datos raw existen para:

- Depuración
- Reprocesamiento
- Procedencia
- Mejoras del parser
- Comparación histórica

Los datos raw no deben tratarse como lore normalizado.

---

## 15. Extracción de Contenido

El pipeline de extracción debe priorizar contenido significativo.

Extraer:

- Título de la página
- Encabezados
- Párrafos
- Listas
- Tablas
- Metadatos importantes
- Enlaces internos
- Imágenes
- Texto alternativo de imágenes
- Fechas de publicación/actualización públicas cuando estén disponibles

Ignorar o minimizar:

- Navegación
- Menús
- Banners de cookies
- Pies de página
- UI repetida
- Publicidad
- Elementos de rastreo
- Elementos decorativos

---

## 16. Preservar Estructura

No aplanar todo el contenido en un solo bloque de texto.

Preservar:

```text
Título
Jerarquía de encabezados
Párrafos
Listas
Tablas
Enlaces
Secciones
```

Ejemplo:

```md
# Nombre de Entidad

## Descripción

...

## Historia

...

## Entidades Relacionadas

- Entidad A
- Entidad B
```

---

## 17. Formato del Documento Fuente

Los documentos normalizados deben almacenarse como Markdown.

Ejemplo:

```text
/data/settings/archive-in-between/
├── setting/
├── universes/
├── entities/
├── locations/
├── factions/
├── characters/
├── concepts/
├── stories/
└── index/
```

Las categorías reales deben determinarse desde la fuente.

No forzar contenido en una categoría si la fuente no proporciona
suficiente evidencia.

---

## 18. Front Matter

Cada documento Markdown normalizado debe contener metadatos.

Ejemplo:

```yaml
---
id: setting-xxxxxxxx
tipo: unknown
titulo: Ejemplo
url_fuente: https://www.thearchiveinbetween.com/ejemplo
dominio_fuente: thearchiveinbetween.com
hash_fuente: abcdef
primera_importacion: 2026-08-17
ultima_verificacion: 2026-08-17
ultimo_cambio: 2026-08-17
estado: imported
confianza: source
---
```

El `tipo` real debe determinarse desde el contenido.

---

## 19. IDs Estables

Cada documento importado debe recibir un identificador estable.

El ID no debe depender exclusivamente del título del documento.

Estrategia posible:

```text
setting-{hash}
```

o:

```text
source-{hash-url-normalizada}
```

La implementación debe asegurar que cambios pequeños en el título no creen
entidades duplicadas innecesariamente.

---

## 20. Procedencia

Cada hecho normalizado debe poder rastrearse hasta su fuente.

Procedencia mínima:

```text
url_fuente
id_documento_fuente
seccion_fuente
hash_fuente
fecha_obtencion
```

Cuando sea posible, preservar la ubicación del encabezado o párrafo
de la fuente.

---

## 21. Sin Lore Alucinado

El proceso de ingestión nunca debe generar hechos que no estén presentes
en la fuente.

La IA puede:

- Clasificar
- Resumir
- Extraer entidades
- Identificar relaciones
- Normalizar terminología

Pero NO debe:

- Inventar información faltante
- Resolver contradicciones sin evidencia
- Adivinar identidades
- Rellenar fechas faltantes
- Inventar relaciones
- Asumir causalidad no declarada

---

## 22. Extracción Asistida por IA

La IA puede usarse opcionalmente después de la extracción determinista.

Pipeline recomendado:

```text
HTML RAW
    ↓
EXTRACCIÓN DE TEXTO
    ↓
PARSEO ESTRUCTURAL
    ↓
EXTRACCIÓN POR IA
    ↓
VALIDACIÓN
    ↓
MARKDOWN NORMALIZADO
```

La IA no debe reemplazar la extracción determinista cuando la extracción
determinista es suficiente.

---

## 23. Extracción de Entidades

El sistema puede identificar:

```text
Personajes
Ubicaciones
Organizaciones
Facciones
Objetos
Especies
Eventos
Universos
Historias
Conceptos
Otras Entidades del Setting
```

Estas categorías son sugerencias.

La taxonomía real debe adaptarse a la fuente.

---

## 24. Relaciones entre Entidades

Las relaciones pueden extraerse cuando la fuente lo soporte explícitamente.

Ejemplo:

```text
Personaje A
    └── member_of
         ↓
Facción B
```

o:

```text
Personaje A
    └── located_in
         ↓
Ubicación B
```

Cada relación debe tener procedencia.

---

## 25. Confianza de Relaciones

Las relaciones deben tener un nivel de confianza.

Ejemplo:

```text
explicita
derivada
incierta
```

`explicita` significa que la fuente establece directamente la relación.

`derivada` significa que la relación se infiere razonablemente.

`incierta` significa que el sistema detectó una posible relación pero no
puede establecerla de manera confiable.

Solo las relaciones `explicitas` deben tratarse como hechos de setting
autoritativos sin revisión.

---

## 26. Fuente vs Interpretación

El sistema debe distinguir:

```text
HECHO DE FUENTE
```

de:

```text
INTERPRETACIÓN DEL SISTEMA
```

Ejemplo:

```yaml
hecho_fuente: true
inferido: false
```

versus:

```yaml
hecho_fuente: false
inferido: true
```

---

## 27. Índice del Setting

Generar un índice para recuperación eficiente.

Ejemplo:

```text
/data/settings/archive-in-between/index/
├── INDEX.md
├── entities.json
├── relationships.json
└── search-index/
```

El índice debe permitir a la IA localizar documentos relevantes sin leer
el setting completo.

---

## 28. Estrategia de Recuperación

La IA NO debe cargar el setting completo en el contexto.

En su lugar:

```text
CONSULTA
    ↓
ÍNDICE
    ↓
DOCUMENTOS RELEVANTES
    ↓
SECCIONES RELEVANTES
    ↓
CONTEXTO DE IA
```

Solo debe cargarse el lore relevante.

---

## 29. Presupuesto de Contexto

Cada solicitud de IA debe intentar minimizar el contexto.

Preferido:

```text
1-5 documentos relevantes
```

en lugar de:

```text
Setting completo
```

La cantidad exacta depende de la operación.

---

## 30. Integración con Campaña

El setting es referenciado por campañas.

Ejemplo:

```text
SETTING
The Archive In Between
        ↓
CAMPAÑA
Nuestra Campaña
        ↓
REFERENCIAS
Ubicaciones relevantes
Facciones relevantes
Personajes relevantes
Conceptos relevantes
```

La campaña no debe duplicar el setting completo.

---

## 31. Anulación por Campaña

Una campaña puede establecer hechos específicos de su propia línea temporal.

Ejemplo:

```text
SETTING:
La Ubicación X existe.

CAMPAÑA:
El grupo destruyó la Ubicación X.

ESTADO ACTUAL:
La Ubicación X está destruida.
```

El estado de campaña toma precedencia para la campaña.

La información original del setting debe permanecer preservada.

---

## 32. Capas de Canon

Usar capas de canon explícitas:

```text
CANON_DE_SETTING
CANON_DE_CAMPAÑA
CANON_DE_SESION
ESTADO_ACTUAL
```

Prioridad para la simulación de campaña:

```text
ESTADO_ACTUAL
    ↓
CANON_DE_CAMPAÑA
    ↓
HISTORIAL_SESION
    ↓
CANON_DE_SETTING
```

Esto NO significa que la campaña modifique el setting externo.

Solo significa que la campaña establece su propio estado.

---

## 33. Validación Manual

El lore importado puede tener estado:

```text
importado
revisado
aprobado
deprecado
en_conflicto
```

Solo la información revisada/aprobada debe tratarse como validada por
el proyecto.

---

## 34. Conflictos

Si dos páginas de la fuente parecen contradictorias:

NO elegir automáticamente una.

Crear:

```text
conflicto
```

y preservar ambas referencias de fuente.

Ejemplo:

```yaml
estado: en_conflicto
```

El DM o maintainer del proyecto puede decidir posteriormente cómo manejarlo.

---

## 35. Actualizaciones

Cuando una página de la fuente cambia:

```text
VERSIÓN ANTIGUA
       ↓
VERSIÓN NUEVA
       ↓
DIFF
       ↓
REVISIÓN
```

No sobrescribir silenciosamente información local validada.

---

## 36. Eliminaciones

Si una página previamente descubierta desaparece:

No eliminar inmediatamente el documento local.

Marcar:

```yaml
estado: fuente_no_disponible
```

Preservar la última versión conocida y la procedencia.

---

## 37. Límite de Tasa

El crawler debe usar tasas de petición conservadoras.

Evitar:

```text
cientos de solicitudes simultáneas
```

Preferir:

```text
baja concurrencia
+
demora
+
caché
```

Los valores exactos deben ser configurables.

Ejemplo:

```yaml
crawler:
  max_concurrency: 2
  delay_ms: 1000
```

Estos son valores por defecto, no obligatorios.

---

## 38. Manejo de Fallos

Si una petición falla:

```text
REINTENTAR
    ↓
BACKOFF
    ↓
REGISTRAR ERROR
```

No reintentar infinitamente.

---

## 39. Registro de Errores

Mantener:

```text
/data/setting-cache/metadata/errors.jsonl
```

Cada error debe incluir:

```text
timestamp
url
tipo_error
http_estado
intentos
mensaje
```

---

## 40. Manifiesto del Crawl

Mantener un manifiesto:

```text
/data/setting-cache/metadata/manifest.json
```

Conteniendo:

```text
id_crawl
inicio
fin
paginas_descubiertas
paginas_descargadas
paginas_cambiadas
paginas_sin_cambio
paginas_fallidas
```

---

## 41. Reproducibilidad

Un crawl debe ser reproducible.

Almacenar:

```text
versión_crawler
versión_parser
configuración
timestamp_crawl
hashes_fuente
```

---

## 42. Versionado del Parser

Si el algoritmo de extracción cambia:

```text
parser_v1
parser_v2
```

el sistema debe poder reprocesar el contenido raw cacheado sin
re-descargar el sitio web.

---

## 43. Pipeline de Procesamiento Sugerido

```text
SITIO WEB
    ↓
CRAWLER
    ↓
CACHÉ RAW
    ↓
PARSER HTML
    ↓
MODELO DE DOCUMENTO
    ↓
EXTRACCIÓN DE ENTIDADES
    ↓
EXTRACCIÓN DE RELACIONES
    ↓
NORMALIZACIÓN
    ↓
MARKDOWN
    ↓
ÍNDICE
    ↓
BÚSQUEDA / RECUPERACIÓN
```

---

## 44. Base de Datos Local

SQLite puede usarse para metadatos del crawl e índices.

Tablas ejemplo:

```text
source_pages
crawl_runs
source_versions
entities
relationships
documents
document_entities
document_relationships
crawl_errors
```

La base de datos debe permanecer ligera.

---

## 45. Markdown como Representación Humana

Markdown debe permanecer como la representación legible por humanos
canonical del lore normalizado.

SQLite debe soportar principalmente:

```text
metadatos
indexado
relaciones
búsqueda
estado del crawl
```

No hacer que la base de datos sea la única representación del lore.

---

## 46. Estructura de Directorios Sugerida

```text
/data/
└── settings/
    └── archive-in-between/
        ├── README.md
        ├── setting/
        ├── universes/
        ├── entities/
        ├── locations/
        ├── factions/
        ├── characters/
        ├── stories/
        ├── concepts/
        ├── index/
        └── metadata/
```

Caché del crawler:

```text
/data/
└── setting-cache/
    ├── raw/
    ├── normalized/
    └── metadata/
```

---

## 47. README del Setting

Crear:

```text
/data/settings/archive-in-between/README.md
```

Debe explicar:

- Fuente
- Fecha de importación
- Versión de importación
- Número de documentos
- Estado de validación
- Última sincronización
- Limitaciones conocidas

---

## 48. Índice del Setting

Crear:

```text
/data/settings/archive-in-between/index/INDEX.md
```

El índice debe proporcionar enlaces a todos los documentos importados
agrupados por categoría descubierta.

---

## 49. Búsqueda

El sistema debe soportar consultas como:

```text
"¿Quién es PERSONAJE_X?"

"¿Qué es UBICACIÓN_X?"

"¿Qué facciones están relacionadas con PERSONAJE_X?"

"¿Qué se sabe sobre UBICACIÓN_X?"

"¿Qué historias mencionan ENTIDAD_X?"

"¿Qué pasó en UNIVERSO_X?"
```

---

## 50. Recuperación de Contexto

Para una solicitud de IA:

```text
Pregunta del Usuario
        ↓
Detección de Entidades
        ↓
Índice del Setting
        ↓
Documentos Relevantes
        ↓
Secciones Relevantes
        ↓
Contexto
```

La IA no debe leer automáticamente todos los archivos.

---

## 51. Recuperación Consciente de Campaña

Si el usuario pregunta:

```text
"¿Qué sabemos de este personaje?"
```

el sistema debe distinguir:

```text
INFORMACIÓN DEL SETTING
+
INFORMACIÓN DE CAMPAÑA
+
ESTADO ACTUAL
```

Ejemplo de salida interna:

```text
contexto_setting
contexto_campana
estado_actual
```

---

## 52. Atribución de Fuente

Las respuestas generadas por IA basadas en información del setting deben
poder identificar el documento fuente.

Ejemplo:

```text
Fuente:
The Archive In Between
Documento:
entity-example.md
```

---

## 53. Protección del Canon de Campaña

El proceso de ingestión NUNCA debe modificar automáticamente:

```text
/data/campaigns/
```

a menos que esté explícitamente instruido por una operación de gestión
de campaña.

La ingestión del setting es funcionalidad de importación/lectura.

---

## 54. Separación de Responsabilidades

El crawler maneja:

```text
WEB → SETTING LOCAL
```

El sistema de campaña maneja:

```text
SETTING LOCAL → REFERENCIAS DE CAMPAÑA
```

El sistema de sesión maneja:

```text
CAMPAÑA → EVENTOS DE SESIÓN
```

El sistema de canon maneja:

```text
EVENTOS → CANON
```

---

## 55. Implementación Inicial

La primera implementación NO debe intentar construir cada funcionalidad
avanzada de IA.

Implementar en este orden:

1. Restricción de dominio
2. Verificación de robots.txt / políticas
3. Descubrimiento de URLs
4. Cola de crawl
5. Obtención HTTP
6. Caché local
7. Hashing de contenido
8. Extracción HTML
9. Normalización a Markdown
10. Metadatos
11. Actualizaciones incrementales
12. Índice
13. Búsqueda
14. Extracción de entidades
15. Extracción de relaciones
16. Enriquecimiento IA opcional

---

## 56. Primer Hito

El primer hito es la ingestión exitosa del setting público en:

```text
/data/settings/archive-in-between/
```

con:

```text
Markdown
+
metadatos
+
URLs de fuente
+
hashes
+
índice
```

No se requiere IA para este hito.

---

## 57. Segundo Hito

El segundo hito agrega:

```text
Extracción de entidades
+
relaciones
+
búsqueda
```

---

## 58. Tercer Hito

El tercer hito agrega:

```text
Clasificación asistida por IA
+
resumen
+
recuperación de contexto
```

---

## 59. Cuarto Hito

El cuarto hito agrega la integración con campaña:

```text
SETTING
    ↓
REFERENCIAS DE CAMPAÑA
```

sin modificar documentos fuente del setting.

---

## 60. Quinto Hito

El quinto hito permite que el motor de narrativa/sesiones consulte
información del setting durante una sesión en vivo.

---

## 61. Pruebas

Las pruebas deben verificar:

- Las URLs duplicadas se evitan.
- Los dominios externos no se crawlean recursivamente.
- La caché funciona.
- Las páginas sin cambio no se re-descargan innecesariamente.
- Las URLs de fuente se preservan.
- Los hashes son estables.
- El Markdown es válido.
- Las páginas desaparecidas no se eliminan inmediatamente.
- Los archivos de campaña no son modificados por la ingestión.
- La IA no puede crear silenciosamente hechos de fuente.
- Los conflictos se preservan.
- El crawl incremental funciona.

---

## 62. Criterios de Aceptación

El sistema de ingestión se considera funcional cuando:

```text
[ ] Puede descubrir páginas públicas.
[ ] Respeta las restricciones de crawl.
[ ] Puede crawlear incrementalmente.
[ ] Almacena datos raw/caché localmente.
[ ] Extrae contenido significativo.
[ ] Genera Markdown.
[ ] Preserva URLs de fuente.
[ ] Genera IDs estables.
[ ] Detecta duplicados.
[ ] Detecta páginas cambiadas.
[ ] Mantiene metadatos del crawl.
[ ] Construye un índice.
[ ] Soporta recuperación relevante.
[ ] Mantiene el setting separado del canon de campaña.
[ ] No inventa lore.
[ ] Puede re-ejecutarse de forma segura.
```

---

## 63. Regla Arquitectónica Importante

El Sistema de Ingestión del Setting es un PIPELINE DE IMPORTACIÓN DE DATOS.

NO es:

```text
GENERADOR DE HISTORIAS CON IA
```

NO es:

```text
GESTOR DE CAMPAÑAS
```

NO es:

```text
AUTORIDAD DE CANON
```

ES:

```text
FUENTE EXTERNA
       ↓
BASE DE CONOCIMIENTO LOCAL
```

---

## 64. Extensiones Futuras

Funcionalidades futuras posibles:

```text
Detección de cambios automática
Visor de diffs de lore
Gráfico de entidades
Búsqueda semántica
Búsqueda vectorial
Resúmenes con IA
Respuesta de preguntas de lore
Detección de conflictos
Versionado de setting
UI de citación de fuentes
```

Estas solo deben implementarse después de que el pipeline básico de
ingestión funcione.

---

## 65. Principio Final

El sistema siempre debe poder responder:

```text
"¿De dónde vino esta pieza de lore?"
```

Si no puede responder esa pregunta, la información no debe considerarse
totalmente confiable.

La fuente de verdad para la información de setting importada es la fuente
externa.

La fuente de verdad para los eventos de campaña es la campaña.

La fuente de verdad para el estado actual es el sistema de sesión/estado
del mundo.

Nunca confundir estas tres capas.
```
