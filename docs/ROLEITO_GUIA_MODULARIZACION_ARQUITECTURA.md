# Guía de refactorización arquitectónica y calidad de código para Roleito

**Tipo:** directiva de ingeniería para agentes de programación  
**Alcance:** frontend, backend, integración entre capas, pruebas y evolución del proyecto  
**Prioridad:** transversal y progresiva; no equivale a reescribir toda la aplicación

---

## 1. Objetivo

Mejorar de forma sostenida la estructura interna de Roleito para que el código sea **modular, legible, cohesivo, reutilizable, testeable y fácil de extender**, evitando duplicación, componentes sobredimensionados, dependencias innecesarias y abstracciones prematuras.

El agente debe revisar el código existente antes de modificarlo y refactorizarlo con cambios pequeños, verificables y compatibles con el comportamiento actual. La meta no es maximizar la cantidad de patrones de diseño, interfaces, carpetas o archivos: es reducir el coste de comprender, probar, corregir y extender el sistema.

Esta directiva abarca, entre otros:

- Descomposición de componentes React y extracción de lógica reutilizable.
- Diseño de props, tipos, contratos y composición de componentes.
- Separación entre presentación, estado, lógica de aplicación y dominio.
- Modularización del backend FastAPI y separación de rutas, servicios, dominio y persistencia.
- Reutilización de validaciones, transformaciones, reglas y algoritmos sin crear dependencias circulares.
- Uso justificado de patrones de diseño y principios SOLID.
- Reducción de duplicación y de acoplamiento entre frontend, backend, renderizado 3D y detección de mapas.
- Pruebas, migraciones seguras y documentación de decisiones relevantes.

## 2. Contexto técnico conocido

Roleito es una mesa virtual para campañas de rol, con mapas 2D, escenas, personajes, herramientas de dirección de juego y evolución prevista hacia experiencias 3D.

Stack conocido:

- **Frontend:** React, TypeScript, Vite, Tailwind CSS y React Router.
- **Renderizado:** Three.js, React Three Fiber y Drei.
- **Backend:** Python, FastAPI, SQLAlchemy y SQLite.
- **Visión por computadora:** OpenCV para análisis y detección de elementos en mapas.
- **Arquitectura de escena:** `SceneGraph` y `SceneItem`, con renderizadores especializados.
- **Arquitectura orientada a eventos:** eventos para comunicar cambios donde corresponda.

Archivos o módulos mencionados anteriormente —verificar que sigan existiendo y que su contenido no haya cambiado—:

- `ItemRenderer.tsx`, con renderizadores como `WallRenderer` y `DoorRenderer`.
- `SceneRenderer.tsx`.
- `DmDashboard.tsx`.
- `PlayerView.tsx`.
- `backend/wall_detection.py`.
- `backend/routes.py`.
- `backend/scene_routes.py`.
- `wall-collision.ts`.

**Regla de contexto:** estos nombres son pistas para explorar el repositorio, no autorización para asumir que la estructura actual sigue igual. Inspeccionar el código real y sus imports antes de diseñar la refactorización.

---

## 3. Instrucción principal para el agente

Actúa como **arquitecto de software y revisor senior de código**, con experiencia en React/TypeScript, Python/FastAPI, SQLAlchemy, sistemas gráficos 2D/3D y aplicaciones orientadas a dominio.

Antes de implementar una feature nueva o modificar una existente:

1. Inspecciona los módulos involucrados, sus consumidores, sus dependencias y sus pruebas.
2. Identifica responsabilidades mezcladas, duplicación, acoplamiento, contratos confusos, tipos débiles, efectos secundarios y puntos de extensión.
3. Propón una estructura más simple cuando exista un problema real de diseño.
4. Implementa en incrementos pequeños, preservando el comportamiento externo salvo que un cambio sea intencional y esté documentado.
5. Ejecuta las pruebas y comprobaciones disponibles; no afirmes que pasaron si no se ejecutaron.
6. Resume qué se cambió, qué problema resuelve, qué riesgos quedan y qué se verificó.

**No conviertas cada mejora en una reescritura completa.** No cambies grandes partes del sistema solo por preferencia estética. Prioriza las zonas que generan bugs, duplicación, cambios difíciles o bloquean funcionalidades reales.

## 4. Principios de diseño que deben aplicarse

### 4.1 Cohesión alta y acoplamiento bajo

Cada módulo debe tener un propósito claro y un conjunto pequeño de razones para cambiar. Los módulos deben depender de contratos estables y no de detalles internos de otros módulos.

Preguntas para revisar un módulo:

- ¿Puede describirse su responsabilidad en una frase concreta?
- ¿Contiene lógica que pertenece a otra capa?
- ¿Para cambiar una regla de negocio hay que editar varios archivos no relacionados?
- ¿Importa módulos que a su vez lo importan, creando ciclos?
- ¿Expone más funciones, tipos o propiedades de las que sus consumidores necesitan?

### 4.2 SOLID con criterio

- **S — Responsabilidad única:** separar responsabilidades que evolucionan por motivos diferentes, no necesariamente crear una clase por función.
- **O — Abierto/cerrado:** permitir extensiones razonables mediante composición, estrategias o contratos cuando se prevén variantes reales.
- **L — Sustitución de Liskov:** una implementación alternativa debe respetar el contrato esperado.
- **I — Segregación de interfaces:** contratos pequeños y específicos; evitar interfaces gigantes que obliguen a depender de métodos irrelevantes.
- **D — Inversión de dependencias:** la lógica central no debería depender directamente de detalles reemplazables como una base de datos, una API externa o un motor de renderizado.

No introducir interfaces o clases abstractas en lenguajes o módulos donde una función pura, un tipo, un protocolo o una composición simple resuelvan mejor el problema.

### 4.3 DRY sin sobreabstracción

No duplicar lógica de negocio, validaciones, algoritmos o transformaciones que deban mantenerse sincronizados. Sin embargo, dos bloques parecidos no siempre representan el mismo concepto.

Extraer una abstracción cuando:

- existe una regla compartida que debe permanecer consistente;
- hay varias implementaciones reales de un mismo contrato;
- la lógica tiene significado de dominio propio;
- la extracción simplifica las llamadas y reduce cambios futuros.

No extraerla cuando:

- solo se ahorran unas pocas líneas sin ganar claridad;
- los casos son parecidos superficialmente, pero tienen reglas distintas;
- el nuevo helper necesita demasiados flags para servir a escenarios incompatibles;
- la abstracción añade más conceptos que los que elimina.

**Preferir duplicación pequeña y explícita antes que una abstracción genérica, difícil de entender y llena de excepciones.**

### 4.4 Composición antes que jerarquías complejas

En React, favorecer componentes compuestos, props explícitas, children, hooks específicos y funciones auxiliares puras frente a componentes monolíticos o jerarquías rígidas.

En Python, favorecer composición y funciones con responsabilidades claras. Usar clases cuando representen estado, identidad, invariantes o comportamiento que realmente lo requiera.

### 4.5 Separación de efectos secundarios

Mantener separadas, cuando sea útil, las reglas deterministas de los efectos secundarios:

- reglas de dominio y transformaciones puras;
- acceso a base de datos y sistema de archivos;
- llamadas de red;
- interacción con OpenCV;
- acceso al estado global;
- renderizado y efectos del ciclo de vida de React;
- física, animación y recursos gráficos de Three.js.

Esto mejora la capacidad de probar el comportamiento sin levantar toda la aplicación.

### 4.6 Tipos y contratos explícitos

Usar tipos que comuniquen el dominio. Evitar `any`, `dict` genéricos, estructuras ambiguas, cadenas mágicas y parámetros posicionales difíciles de interpretar cuando se puede definir un contrato más claro.

En TypeScript:

- Preferir `unknown` a `any` cuando el dato de entrada no está validado.
- Modelar estados excluyentes con uniones discriminadas cuando aporte claridad.
- Evitar tipos duplicados o casts que oculten errores.
- Definir tipos de dominio compartidos en un lugar adecuado, sin crear un paquete común gigante.

En Python:

- Añadir type hints en contratos importantes.
- Validar los datos externos en los límites del sistema (por ejemplo, con modelos Pydantic en FastAPI).
- No confundir validación de entrada con reglas de negocio.
- Usar modelos de dominio o esquemas separados cuando tengan propósitos diferentes.

---

## 5. Frontend: componentes React y diseño de props

### 5.1 Responsabilidades de los componentes

Revisar si un componente mezcla demasiadas de estas responsabilidades:

- presentación visual;
- reglas de negocio;
- consultas o mutaciones de datos;
- estado de formularios;
- sincronización con URL o almacenamiento;
- eventos de teclado o ratón;
- coordinación de varios componentes;
- creación y destrucción de recursos de Three.js;
- detección de colisiones o geometría;
- manejo de errores y estados de carga.

Separarlas cuando eso haga que cada parte sea más fácil de entender o probar. No es obligatorio crear una capa distinta para cada responsabilidad si el componente es pequeño y claro.

Una estructura conceptual posible —adaptarla a la estructura real del repositorio—:

- **Componentes de UI:** muestran datos y emiten acciones.
- **Hooks de UI o aplicación:** encapsulan estado y comportamiento de React reutilizable.
- **Casos de uso / servicios de aplicación:** coordinan una acción de usuario o un flujo.
- **Dominio:** define conceptos, invariantes y reglas independientes de React.
- **Adaptadores:** conectan API, almacenamiento, eventos, renderer u otras tecnologías.

No hace falta implementar todas las capas para cada feature.

### 5.2 Cómo decidir si un componente debe dividirse

Considerar una extracción si se cumple una o más condiciones:

- tiene varias responsabilidades que cambian por separado;
- repite estructura o comportamiento ya presente;
- tiene lógica de estado difícil de seguir;
- es difícil de probar de forma aislada;
- posee demasiadas props relacionadas con distintas áreas;
- obliga a editar un componente enorme para agregar una variante;
- mezcla lógica de dominio con JSX o detalles de renderizado 3D.

No usar un número fijo de líneas como regla absoluta. Un componente largo puede ser cohesivo; uno corto puede estar mal diseñado.

### 5.3 Diseño de props

Las props son el contrato público del componente. Deben ser pequeñas, explícitas, coherentes y estables.

Buenas prácticas:

- Agrupar props en un objeto de configuración solo cuando formen un concepto real y cohesivo.
- Usar nombres semánticos (`onSelect`, `isVisible`, `sceneItem`) en lugar de nombres ambiguos (`data`, `value`, `handler`) cuando el contexto no sea evidente.
- Usar callbacks para comunicar acciones al padre, en lugar de permitir que el componente hijo modifique estado ajeno directamente.
- Separar datos de configuración, callbacks y contenido visual cuando ayude a entender el contrato.
- Definir valores por defecto de manera consistente.
- Evitar props booleanas que se multiplican y generan muchas combinaciones difíciles de mantener.
- Evitar pasar el objeto completo de una entidad cuando el componente solo necesita dos campos, salvo que sea importante mantener el contrato ligado a esa entidad.
- No crear un tipo compartido global solo porque dos componentes usan campos con el mismo nombre.
- No usar `...props` para reenviar indiscriminadamente propiedades sin entender el contrato de destino.
- Preferir composición (`children` o slots mediante props) cuando varios componentes necesitan variaciones estructurales.
- No crear un componente genérico para todos los casos si los casos tienen semánticas distintas.

Ejemplo orientativo:

```tsx
type WallRendererProps = {
  wall: WallSceneItem;
  selected?: boolean;
  onSelect?: (wallId: string) => void;
};

function WallRenderer({
  wall,
  selected = false,
  onSelect,
}: WallRendererProps) {
  // Renderizado de la pared y emisión de acciones.
}
```

Este ejemplo no obliga a que todos los renderizadores tengan esa forma. El contrato debe ajustarse al dominio y a las necesidades reales de selección, edición y renderizado.

### 5.4 Hooks personalizados

Extraer un hook cuando exista lógica de React reutilizable o una unidad de comportamiento compleja que convenga aislar. No convertir cada `useState` o `useEffect` en un hook independiente.

Los hooks deben:

- tener un propósito identificable;
- evitar mezclar responsabilidades no relacionadas;
- exponer una API pequeña;
- declarar claramente sus dependencias;
- limpiar listeners, suscripciones y recursos;
- evitar efectos que puedan expresarse como cálculos derivados;
- evitar que el estado derivado se duplique sin necesidad.

### 5.5 Estado y flujo de datos

- Mantener el estado lo más cerca posible de los componentes que lo necesitan.
- Elevar estado solo cuando deba compartirse.
- Evitar duplicar el mismo dato en varios lugares.
- Separar estado transitorio de UI de estado persistente del dominio.
- Evitar un store global para todo el proyecto.
- Definir una fuente de verdad clara para escenas, selección, visibilidad y edición.
- Evitar mutaciones silenciosas de objetos compartidos.
- En operaciones asíncronas, manejar estados de carga, éxito, error y cancelación cuando correspondan.

### 5.6 Frontend 3D

Separar explícitamente, cuando sea necesario:

- datos de escena y dominio (`SceneGraph`, `SceneItem`);
- transformación de datos a primitivas gráficas;
- componentes React Three Fiber;
- geometría y cálculos puros;
- interacción del usuario;
- física y colisiones;
- selección, visibilidad y reglas de juego;
- carga, caché y liberación de recursos.

No colocar reglas de negocio importantes exclusivamente dentro de un renderer. No hacer que el modelo de dominio dependa de Three.js si puede evitarse. No duplicar cálculos geométricos entre renderizado, colisiones y herramientas de edición: compartirlos mediante contratos adecuados y funciones puras cuando las reglas sean realmente las mismas.

Los componentes de renderizado deben liberar correctamente listeners, geometrías, materiales, texturas u otros recursos que hayan creado y posean. No liberar recursos compartidos sin verificar su propiedad y ciclo de vida.

---

## 6. Backend: FastAPI, servicios y persistencia

### 6.1 Responsabilidades por capa

Usar esta separación como guía, no como estructura de carpetas obligatoria:

- **Routers/endpoints:** HTTP, parámetros, autenticación/autorización si aplica, códigos de estado y serialización.
- **Schemas:** contratos de entrada y salida de la API.
- **Servicios/casos de uso:** coordinación de operaciones y reglas de aplicación.
- **Dominio:** reglas, invariantes y conceptos independientes de FastAPI y SQLAlchemy cuando el coste de separarlos esté justificado.
- **Repositorios/consultas:** acceso y persistencia de datos cuando haya valor real en aislarlos.
- **Infraestructura/adaptadores:** SQLite, filesystem, OpenCV, motores de renderizado u otros detalles técnicos.

Evitar que los endpoints contengan consultas complejas, algoritmos extensos, lógica de dominio y orquestación de múltiples subsistemas. A la vez, no crear servicios y repositorios ceremoniales para operaciones CRUD triviales sin beneficio claro.

### 6.2 Transacciones y persistencia

- Definir con claridad quién inicia, confirma y revierte una transacción.
- Evitar que múltiples capas hagan `commit()` de manera impredecible.
- No devolver objetos ORM como contrato público de API si eso acopla el cliente a la persistencia.
- Evitar consultas duplicadas y patrones N+1.
- Manejar errores de persistencia sin filtrar información interna al cliente.
- No mezclar migraciones de esquema, reglas de dominio y lógica de endpoints.
- Mantener consistencia entre la base SQLite y los archivos/recursos externos, considerando fallos parciales.

### 6.3 Validación y errores

- Validar forma y tipos de datos en el borde HTTP.
- Aplicar invariantes de negocio en el lugar que corresponda para que también se respeten desde otros puntos de entrada.
- Usar excepciones específicas o resultados explícitos cuando mejoren la claridad.
- Traducir errores internos a respuestas HTTP coherentes.
- No capturar todas las excepciones para devolver un éxito falso o esconder fallos.
- No exponer rutas locales, trazas, secretos ni detalles internos innecesarios en respuestas.

### 6.4 Procesamiento de mapas y OpenCV

Para detección de paredes, puertas, contornos y otros elementos:

- Separar lectura/preprocesamiento de imagen, detección, normalización geométrica, validación, revisión del usuario y conversión a escena.
- Mantener los algoritmos de visión por computadora desacoplados de los endpoints y de los renderizadores.
- Definir contratos claros de entrada/salida para cada etapa.
- Representar incertidumbre o confianza cuando sea útil.
- Normalizar coordenadas y unidades en una frontera definida.
- Evitar que el detector escriba directamente en demasiados subsistemas.
- Mantener trazable qué parte es detección automática y qué parte fue corregida manualmente.
- Probar los algoritmos con imágenes y casos representativos, incluyendo entradas inválidas y mapas difíciles.

### 6.5 Concurrencia y trabajo pesado

Si una tarea de análisis, generación o procesamiento puede ser larga, no bloquear innecesariamente el event loop de FastAPI. Elegir mecanismos de ejecución acordes al coste y al entorno actual, sin introducir colas distribuidas o sistemas complejos si el proyecto no los necesita.

---

## 7. Contratos entre frontend y backend

- Definir esquemas de API estables y documentados.
- Diferenciar modelos internos de dominio de los DTO/schemas públicos.
- Evitar que el frontend dependa de nombres de columnas SQL o estructuras ORM.
- Centralizar cliente HTTP, manejo común de errores y serialización cuando aporte consistencia.
- No duplicar manualmente contratos de forma divergente. Si es viable, generar tipos a partir de OpenAPI o mantener un mecanismo verificable de sincronización.
- Versionar o migrar contratos con cuidado cuando cambien formatos persistidos o datos existentes.
- Mantener explícita la conversión entre formatos de coordenadas, IDs, estados y unidades.

---

## 8. Patrones de diseño: cuándo sí y cuándo no

El agente debe seleccionar patrones según el problema concreto, no intentar utilizar todos.

| Patrón / técnica | Aplicación potencial en Roleito | Evitar cuando |
|---|---|---|
| **Strategy** | Variantes intercambiables de detección, colisión, selección de algoritmo o proveedor | Solo existe una implementación y no se prevén variantes razonables |
| **Adapter** | Encapsular OpenCV, almacenamiento, API o renderer detrás de un contrato estable | El adaptador solo reenvía llamadas y no reduce acoplamiento |
| **Factory** | Crear tipos de `SceneItem`, renderizadores o recursos a partir de datos validados | Un `switch` simple y local es más claro |
| **Repository** | Aislar consultas y persistencia complejas o reemplazables | Es una capa vacía que repite uno a uno SQLAlchemy |
| **Observer / Pub-Sub** | Notificar cambios a subsistemas realmente independientes | Un callback explícito es más sencillo; el flujo de eventos se vuelve invisible |
| **Command** | Acciones de DM, operaciones reversibles, historial o undo/redo | Solo envuelve una función sin aportar semántica |
| **State** | Ciclos de vida complejos de escenas, detección, cargas o sesiones | Un enum y transiciones simples bastan |
| **Composite** | Jerarquías de escenas, grupos de objetos y transformaciones anidadas | La jerarquía no tiene operaciones recursivas reales |
| **Facade** | Dar una API simple sobre un subsistema complejo | Oculta demasiados comportamientos o crea un módulo central omnipotente |
| **Dependency Injection** | Sustituir almacenamiento, reloj, detector o servicio durante pruebas | Requiere un contenedor global complejo para pocos servicios |
| **Pure functions** | Geometría, normalización, reglas y transformaciones deterministas | La operación depende genuinamente de estado o recursos externos |
| **Ports and Adapters / Hexagonal** | Aislar dominio de HTTP, base de datos, archivos y motores técnicos | La ceremonia de capas supera el valor en una función pequeña |
| **DTO / Mapper** | Separar contratos externos, dominio y persistencia | Se crean conversiones duplicadas sin diferencias semánticas reales |

### Regla para adoptar un patrón

Antes de introducirlo, el agente debe explicar brevemente:

1. Qué problema actual resuelve.
2. Qué acoplamiento o duplicación reduce.
3. Qué coste de complejidad introduce.
4. Por qué una solución más sencilla no es suficiente.
5. Cómo se probará.

---

## 9. Organización de módulos y archivos

- Organizar preferentemente por **feature o dominio** cuando eso mantenga juntas las piezas que cambian juntas; utilizar carpetas técnicas para infraestructura transversal cuando corresponda.
- Evitar tanto archivos gigantes como una fragmentación en decenas de archivos diminutos.
- Mantener imports en una dirección coherente.
- Evitar dependencias circulares y módulos `utils` o `common` que terminen acumulando lógica sin cohesión.
- Nombrar archivos, funciones, tipos y variables según su responsabilidad.
- Exportar solo la API pública necesaria de cada módulo.
- Mantener los detalles internos privados.
- No mover muchos archivos de forma masiva si no aporta una mejora concreta.
- No cambiar nombres públicos, formatos guardados o endpoints sin revisar sus consumidores.

Una estructura conceptual posible para una feature:

```text
feature/
  components/       # UI específica de la feature
  hooks/            # comportamiento React reutilizable
  application/      # casos de uso, si son necesarios
  domain/           # reglas y tipos propios, si aportan valor
  infrastructure/   # API, persistencia o adaptadores
  __tests__/        # pruebas relacionadas
```

No es una plantilla obligatoria. En módulos pequeños, una estructura plana puede ser más clara.

Para el backend, una separación equivalente podría usar `routers`, `schemas`, `services`, `domain` y `repositories`, pero solo donde las responsabilidades y el tamaño lo justifiquen.

---

## 10. Calidad, mantenibilidad y rendimiento

### 10.1 Legibilidad

- Preferir nombres claros sobre comentarios que expliquen nombres confusos.
- Dividir expresiones complejas en pasos con intención semántica.
- Evitar booleanos y flags que cambien muchas ramas de comportamiento.
- Reducir anidamiento excesivo con retornos tempranos cuando mejore la lectura.
- Comentar el **porqué** de decisiones no obvias, restricciones, invariantes y compromisos; no narrar cada línea.
- Eliminar código muerto solo después de confirmar que no se usa indirectamente o mediante mecanismos dinámicos.

### 10.2 Rendimiento sin optimización prematura

- Medir o identificar un coste real antes de introducir cachés, memoización o complejidad adicional.
- En React, evitar renders costosos cuando exista evidencia o un camino claro de mejora; no añadir `useMemo`/`useCallback` indiscriminadamente.
- En Three.js, gestionar instancias y recursos gráficos de manera consciente.
- En backend, revisar consultas, procesamiento síncrono y operaciones sobre archivos.
- Preservar la capacidad de trabajar en hardware modesto y no asumir GPU dedicada.
- No sacrificar claridad por microoptimizaciones sin impacto medible.

### 10.3 Seguridad y robustez

- Validar entradas externas y rutas de archivos.
- Evitar exposición de secretos, trazas o información local sensible.
- Restringir operaciones de archivo a ubicaciones esperadas.
- No confiar en datos recibidos desde el cliente.
- Manejar errores y recursos en estados parciales.
- No agregar telemetría, servicios externos, cuentas o APIs pagas como parte de una refactorización sin autorización explícita.

---

## 11. Pruebas y criterios de aceptación

Cada refactorización debe tener una estrategia de verificación proporcional al riesgo.

### Frontend

- Pruebas unitarias para reglas puras, transformaciones y hooks cuando proceda.
- Pruebas de componentes para estados importantes y acciones del usuario.
- Pruebas de integración para flujos de escena, selección, edición y comunicación con API.
- Verificar renderizado y limpieza de recursos cuando se toquen componentes 3D.
- Comprobar accesibilidad básica de controles interactivos cuando se modifiquen.

### Backend

- Pruebas unitarias de reglas de dominio y algoritmos.
- Pruebas de routers y contratos HTTP.
- Pruebas de persistencia para consultas y transacciones importantes.
- Casos inválidos, errores y límites de entrada.
- Pruebas de detección de mapas con ejemplos representativos y resultados esperados.

### Antes de cerrar un cambio

- Ejecutar las pruebas existentes relevantes.
- Ejecutar lint, type-check o build si están configurados.
- Revisar errores y advertencias nuevos.
- Confirmar que no se rompieron imports, rutas, endpoints, persistencia ni formatos.
- Si una comprobación no se puede ejecutar, decirlo explícitamente.
- No modificar o eliminar pruebas simplemente para que el cambio pase.

---

## 12. Flujo de trabajo requerido para el agente

### Fase A — Diagnóstico

1. Leer las instrucciones del repositorio y la documentación existente.
2. Inspeccionar los módulos relevantes y sus consumidores.
3. Dibujar mentalmente o documentar el flujo de datos y dependencias.
4. Identificar problemas concretos y clasificarlos por impacto y riesgo.
5. Detectar el comportamiento actual que debe preservarse.
6. Evitar cambios antes de entender las relaciones entre módulos.

### Fase B — Plan pequeño

Presentar un plan conciso con:

- problema detectado;
- módulos afectados;
- diseño propuesto;
- beneficios esperados;
- riesgos y compatibilidad;
- pruebas a ejecutar.

Para cambios pequeños, este plan puede ser breve. Pedir confirmación solo si la decisión cambia arquitectura pública, persistencia, contratos importantes o alcance; no bloquear tareas rutinarias con preguntas innecesarias.

### Fase C — Refactorización incremental

- Hacer cambios cohesionados y revisables.
- Mantener compatibilidad cuando sea razonable.
- Extraer una responsabilidad por vez.
- Actualizar consumidores y pruebas en el mismo cambio.
- Evitar mezclar refactorización extensa con una feature no relacionada.
- No reescribir archivos completos si un cambio localizado es más seguro.
- Mantener cada etapa en un estado que pueda comprobarse.

### Fase D — Verificación

- Ejecutar las comprobaciones pertinentes.
- Inspeccionar el diff para detectar cambios accidentales.
- Buscar duplicación nueva, imports no usados, ciclos y tipos débiles.
- Verificar que las abstracciones no introduzcan complejidad desproporcionada.

### Fase E — Informe

Al terminar, resumir:

1. Qué problema se encontró.
2. Qué responsabilidades se separaron o qué abstracción se introdujo.
3. Por qué esa decisión es adecuada.
4. Qué archivos y contratos cambiaron.
5. Qué pruebas y comandos se ejecutaron y sus resultados reales.
6. Qué deuda técnica queda y qué se recomienda abordar después.

---

## 13. Priorización de la deuda técnica

No intentar “limpiar todo el proyecto” en una sola operación. Ordenar oportunidades por:

- **Impacto:** bugs, dificultad de cambio, duplicación relevante, riesgo de regresión.
- **Frecuencia:** cuánto se modifica o utiliza ese módulo.
- **Alcance:** cuántos módulos dependen del problema.
- **Riesgo:** posibilidad de romper comportamiento o datos.
- **Coste:** esfuerzo para corregir y verificar.

Prioridad recomendada:

1. Errores de diseño que ya causan bugs o bloquean una feature.
2. Acoplamientos entre dominio, persistencia, API y renderizado.
3. Duplicación de reglas que deben ser consistentes.
4. Componentes/endpoints demasiado responsables o difíciles de probar.
5. Contratos y tipos ambiguos.
6. Limpieza estilística menor.

Crear una lista breve de deuda técnica real y abordarla cuando se trabaje en los módulos afectados. No convertir el proyecto en una refactorización permanente que impida entregar funcionalidades.

---

## 14. Antipatrones que se deben evitar

- **God component / God service:** un componente, endpoint o servicio que coordina todo y contiene toda la lógica.
- **Prop drilling innecesario:** pasar datos a través de capas que no los usan; evaluar composición o un estado compartido acotado.
- **Context/store global para todo:** vuelve invisibles las dependencias y complica las pruebas.
- **Boolean blindness:** múltiples flags que generan combinaciones confusas.
- **Mega `utils.ts` / `helpers.py`:** funciones no relacionadas agrupadas solo por conveniencia.
- **Abstracción especulativa:** construir sistemas de plugins, factories o interfaces para variantes hipotéticas.
- **Repository vacío:** duplicar cada llamada ORM sin aportar aislamiento o lógica.
- **Herencia profunda:** jerarquías rígidas que dificultan entender el comportamiento.
- **Event bus omnipresente:** comunicación indirecta que dificulta rastrear quién cambia qué.
- **Duplicación de fuentes de verdad:** almacenar el mismo estado de escena o entidad en varios lugares sin sincronización definida.
- **Tipos genéricos excesivos:** tipos parametrizados difíciles de entender para ahorrar una pequeña cantidad de código.
- **Refactorización cosmética masiva:** renombrar/mover todo sin beneficio demostrable.
- **Migración disruptiva sin necesidad:** cambiar a otra arquitectura, framework o librería solo por preferencia.
- **Comentarios que ocultan mal diseño:** explicar una función inmanejable en lugar de separar responsabilidades.
- **Manejo de errores silencioso:** capturar excepciones, ignorarlas o devolver datos falsos.
- **Optimización prematura:** añadir cachés, memoización o concurrencia sin una necesidad comprobada.

---

## 15. Checklist para revisar cada feature nueva

Antes de considerar terminada una feature, el agente debe evaluar:

- [ ] Las responsabilidades están claras y no hay lógica de dominio importante atrapada en la UI o el endpoint.
- [ ] Las funciones y componentes tienen contratos comprensibles.
- [ ] Las props son explícitas, coherentes y no exponen detalles innecesarios.
- [ ] La lógica reutilizada tiene una única implementación cuando debe mantenerse consistente.
- [ ] No se introdujeron abstracciones especulativas.
- [ ] Los patrones de diseño elegidos resuelven un problema concreto.
- [ ] Las dependencias fluyen en una dirección razonable y no hay ciclos.
- [ ] Los datos externos se validan en el límite correcto.
- [ ] Los errores se manejan sin ocultar fallos ni filtrar detalles sensibles.
- [ ] El acceso a base de datos y archivos está separado de las reglas cuando aporta valor.
- [ ] Los recursos de React/Three.js y los listeners tienen un ciclo de vida correcto.
- [ ] Los contratos entre frontend y backend siguen siendo coherentes.
- [ ] Se añadieron o actualizaron pruebas relevantes.
- [ ] Se ejecutaron las comprobaciones disponibles y se reportaron resultados reales.
- [ ] La solución es proporcional al problema y no introduce infraestructura innecesaria.

El checklist no debe aplicarse mecánicamente para crear archivos o capas que no aportan valor. Si un punto no corresponde a la feature, se puede marcar como no aplicable.

---

## 16. Revisión arquitectónica inicial sugerida para Roleito

En una primera pasada, inspeccionar —sin asumir de antemano que estén mal diseñados— estos posibles límites:

1. **SceneGraph y SceneItem:** ¿son la fuente de verdad de los elementos de escena? ¿Están desacoplados de React y Three.js?
2. **Renderizadores de elementos:** ¿`WallRenderer`, `DoorRenderer` y otros comparten solo la lógica que realmente es común? ¿Las variantes se modelan mediante composición o estrategias cuando hace falta?
3. **SceneRenderer:** ¿coordina el renderizado o también contiene reglas de dominio, edición, colisiones y persistencia?
4. **DmDashboard y PlayerView:** ¿comparten componentes de presentación y lógica de aplicación sin forzar una UI genérica inadecuada?
5. **Detección de mapas:** ¿la detección, normalización geométrica, revisión manual y generación de escena son etapas distinguibles y comprobables?
6. **Colisiones y geometría:** ¿renderizado, detección y colisiones duplican cálculos o usan convenciones distintas de coordenadas?
7. **Rutas FastAPI:** ¿los endpoints coordinan la solicitud o acumulan lógica de dominio y persistencia?
8. **SQLAlchemy y esquemas API:** ¿los contratos externos dependen demasiado del modelo de base de datos?
9. **Eventos:** ¿cada evento tiene propósito, contrato y propietario claros? ¿Se puede rastrear qué suscriptores reaccionan?
10. **Pruebas:** ¿las reglas importantes pueden probarse sin montar toda la aplicación?

Para cada problema confirmado, proponer un cambio pequeño, medible y compatible. No refactorizar un módulo únicamente porque aparece en esta lista.

---

## 17. Definición de éxito

La refactorización está dando resultado cuando:

- una feature nueva puede añadirse modificando una cantidad acotada de módulos;
- los cambios de UI no obligan a modificar reglas de dominio;
- las reglas de dominio pueden probarse sin levantar React, FastAPI o Three.js;
- cambiar un algoritmo o adaptador no obliga a reescribir consumidores;
- los contratos son claros y los errores aparecen cerca de su origen;
- la duplicación importante disminuye sin crear abstracciones opacas;
- los tests detectan regresiones relevantes;
- un agente nuevo puede orientarse leyendo pocos módulos y sus contratos;
- el proyecto sigue entregando funcionalidades en lugar de quedar atrapado en refactorizaciones interminables.

**Principio final:** optimizar para la claridad del diseño y la facilidad de cambio, no para el número de patrones, capas, interfaces o archivos. Toda abstracción debe ganarse su lugar.
