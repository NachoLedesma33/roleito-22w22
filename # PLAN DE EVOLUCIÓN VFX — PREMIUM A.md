# PLAN DE EVOLUCIÓN VFX — PREMIUM ABILITY VISUAL SYSTEM

**Proyecto:** Sistema de habilidades y efectos visuales 3D  
**Motor principal:** Three.js  
**Tecnologías complementarias:** WebGL, GLSL, GPU Particles, Three.Quarks, Post Processing  
**Tipo:** Renovación y expansión del sistema VFX existente  
**Prioridad:** Calidad visual AAA, naturalidad, variedad y rendimiento

---

# 1. VISIÓN GENERAL

## 1.1 Objetivo principal

Transformar sustancialmente el sistema visual de habilidades existente, reemplazando las partículas geométricas básicas por efectos visuales de calidad profesional, inspirados en videojuegos modernos de fantasía, RPG, MMORPG y acción.

Actualmente, el proyecto dispone de un sistema de habilidades y un catálogo de habilidades genéricas, entre ellas:

- Fuego.
- Agua.
- Rayo.
- Vacío.
- Otras categorías elementales.

Las habilidades actualmente utilizan partículas representadas mediante pequeñas esferas que recorren una trayectoria entre dos personajes.

Este comportamiento debe evolucionar visualmente.

**No se pretende desarrollar un nuevo sistema de habilidades, combate, lanzamiento, selección de objetivos ni administración de ataques.**

Se debe conservar el funcionamiento actual y sustituir o ampliar exclusivamente la representación visual de las habilidades.

## 1.2 Resultado esperado

Cada habilidad debe sentirse como un efecto visual elaborado individualmente, con identidad, movimiento, profundidad y personalidad.

Ejemplos:

- El fuego debe parecer fuego, no pequeñas esferas naranjas.
- El agua debe transmitir fluidez, viscosidad, salpicaduras y movimiento.
- Los rayos deben presentar ramificaciones eléctricas, arcos y descargas.
- El vacío debe producir distorsiones espaciales, absorción y desintegración.
- La energía mágica debe presentar partículas, ondas, trazos y fluctuaciones orgánicas.

Se debe priorizar una estética de videojuego profesional, evitando deliberadamente la apariencia de primitivas geométricas flotando por el escenario.

---

# 2. PRINCIPIOS ARTÍSTICOS Y VISUALES

## 2.1 Reglas fundamentales

Todos los efectos deben cumplir los siguientes criterios:

1. Evitar partículas representadas exclusivamente mediante esferas.
2. Evitar formas geométricas demasiado perfectas y artificiales.
3. Priorizar siluetas orgánicas, irregulares y animadas.
4. Utilizar texturas procedurales, shaders y sprites especializados.
5. Combinar diferentes capas de efectos para conseguir profundidad.
6. Incorporar movimiento secundario y turbulencias.
7. Utilizar transparencias y mezclas de materiales correctamente.
8. Evitar que todos los elementos se muevan a la misma velocidad.
9. Incorporar iluminación y emisión de luz cuando corresponda.
10. Diferenciar visualmente cada familia de habilidades.

## 2.2 Referencias de calidad

Tomar como referencia visual los efectos de:

- Diablo IV.
- Path of Exile 2.
- World of Warcraft.
- Lost Ark.
- Black Desert Online.
- Final Fantasy XIV.
- Elden Ring.
- League of Legends (especialmente sus habilidades mágicas).

No se busca copiar habilidades existentes, sino estudiar sus recursos visuales:

- Composición de partículas.
- Intensidad de iluminación.
- Transparencias.
- Contraste.
- Movimiento.
- Escala.
- Distribución de elementos.
- Efectos de impacto.
- Uso de humo, fuego, electricidad y energía.

## 2.3 Composición de efectos multicapa

Una habilidad premium no debería depender de un único emisor de partículas.

Por ejemplo, un proyectil de fuego podría combinar:

- Núcleo energético brillante.
- Llamas irregulares.
- Humo oscuro.
- Brasas desprendidas.
- Estelas de fuego.
- Distorsión térmica.
- Destellos secundarios.

Cada capa debe tener su propio comportamiento, velocidad, tamaño, opacidad y duración.

El resultado debe parecer un fenómeno visual compuesto y no un conjunto de objetos independientes.

---

# 3. INVESTIGACIÓN E INCORPORACIÓN DE TECNOLOGÍAS

Antes de implementar los efectos, analizar las bibliotecas compatibles con la versión actual de Three.js y la arquitectura existente.

No introducir dependencias innecesarias ni reemplazar el motor de renderizado sin una justificación técnica.

## 3.1 Three.Quarks

**Repositorio:** https://github.com/Alchemist0823/three.quarks

**Documentación:** https://docs.quarks.art/docs

Biblioteca especializada en sistemas de partículas para Three.js.

Capacidades relevantes:

- Emisores de partículas.
- Emisión desde diferentes geometrías.
- Partículas con curvas de comportamiento.
- Trails y estelas.
- Sub-emisores.
- Animación mediante spritesheets.
- Sistemas de partículas configurables.
- Serialización de configuraciones.
- Renderizado agrupado para reducir draw calls.

Aplicaciones propuestas:

- Fuego.
- Humo.
- Brasas.
- Explosiones.
- Energía mágica.
- Partículas de impacto.
- Fragmentos.
- Chispas.
- Estelas.

**Prioridad de evaluación: MUY ALTA.**

Es una de las primeras bibliotecas que se deben probar para renovar el sistema actual.

## 3.2 Post Processing

**Repositorio:** https://github.com/pmndrs/postprocessing

**Documentación:** https://pmndrs.github.io/postprocessing/public/docs/

Biblioteca para incorporar efectos de posprocesamiento al renderizado.

Efectos interesantes:

- Bloom.
- God Rays.
- Depth of Field.
- Chromatic Aberration.
- Motion Blur mediante soluciones compatibles.
- Shock Wave.
- Glitch.
- Color Grading.
- Vignette.
- SSAO.

Aplicaciones:

- Resplandor de habilidades mágicas.
- Ondas de choque.
- Destellos de explosiones.
- Rayos de luz.
- Distorsiones espaciales.
- Mejora de la iluminación percibida.

**Prioridad de evaluación: ALTA.**

No aplicar todos los efectos globalmente. Algunos deben activarse únicamente durante habilidades concretas para evitar sobrecargar la imagen.

## 3.3 Shaders GLSL personalizados

Three.js permite crear efectos mediante shaders personalizados.

Investigar y desarrollar shaders específicos para:

- Fuego procedural.
- Humo volumétrico simulado.
- Electricidad.
- Energía mágica.
- Distorsión de pantalla.
- Ondas expansivas.
- Disolución.
- Fragmentación.
- Fluidos estilizados.
- Superficies energéticas.

Los shaders deben utilizarse cuando proporcionen una mejora visual o de rendimiento frente a una solución basada exclusivamente en geometrías y partículas tradicionales.

## 3.4 GPU Particles

Evaluar sistemas de partículas que ejecuten la mayor parte de sus cálculos en GPU.

Objetivos:

- Reducir el trabajo de CPU.
- Permitir mayor cantidad de partículas.
- Conseguir movimientos complejos.
- Implementar turbulencias.
- Incorporar fuerzas y campos de movimiento.
- Gestionar grandes cantidades de partículas sin crear miles de objetos individuales.

Evaluar compatibilidad con el backend gráfico real del proyecto.

## 3.5 Plume

**Repositorio:** https://github.com/travisdmathis/plume

Investigar esta alternativa de partículas GPU con arquitectura inspirada en Niagara.

Características interesantes:

- Simulación GPU.
- Compute shaders.
- Emisores modulares.
- Eventos y sub-emisores.
- Colisiones.
- Editor visual de nodos.

**Advertencia:** se encuentra en etapa pre-1.0 y utiliza tecnologías TSL/WebGPU. No asumir compatibilidad directa con el renderizador actual. Evaluarlo como alternativa experimental, no como dependencia obligatoria.

## 3.6 Criterio de selección

No es necesario utilizar todas las bibliotecas.

La arquitectura recomendada es híbrida:

- Three.js: motor principal.
- Three.Quarks: sistemas de partículas.
- GLSL: efectos especiales personalizados.
- Post Processing: iluminación y efectos de pantalla.
- GPU Particles: simulaciones complejas cuando sean convenientes.

La selección definitiva debe realizarse después de un prototipo y una prueba de compatibilidad.

---

# 4. RENOVACIÓN DE LAS FAMILIAS ELEMENTALES

La renovación debe abarcar las categorías existentes y permitir incorporar muchas más.

Cada familia debe disponer de un lenguaje visual propio.

## 4.1 FUEGO — Fire VFX

**Identidad:** agresividad, calor, combustión y destrucción.

<ANALOGÍA VISUAL>

Efectos que deben desarrollarse:

- Llamas orgánicas.
- Lenguas de fuego animadas.
- Brasas incandescentes.
- Chispas de combustión.
- Humo oscuro.
- Distorsión térmica.
- Explosiones de fuego.
- Columnas de llamas.
- Anillos de combustión.
- Estelas ardientes.
- Superficies temporalmente incendiadas.
- Ondas expansivas de calor.

Habilidades propuestas:

1. Fire Bolt — Proyectil de fuego.
2. Flame Burst — Explosión de llamas.
3. Inferno — Columna de fuego.
4. Fireball — Bola de fuego de gran tamaño.
5. Flame Wave — Ola de fuego.
6. Meteor Strike — Impacto de meteorito.
7. Phoenix Dive — Descenso de energía ígnea.
8. Burning Chains — Cadenas ardientes.
9. Flame Whirlwind — Tornado de fuego.
10. Solar Eruption — Erupción solar.

## 4.2 AGUA — Water VFX

**Identidad:** fluidez, presión, movimiento y transparencia.

Efectos:

- Chorros de agua.
- Gotas de diferentes tamaños.
- Salpicaduras.
- Neblina húmeda.
- Ondas circulares.
- Vórtices.
- Corrientes.
- Proyectiles fluidos.
- Chorros de presión.
- Fragmentación en gotas.
- Superficies con distorsión refractiva.
- Anillos de agua.

Habilidades:

1. Water Bolt.
2. Aqua Lance.
3. Tidal Wave.
4. Water Whip.
5. Hydro Burst.
6. Whirlpool.
7. Tsunami.
8. Rainfall.
9. Water Prison.
10. Abyssal Current.

## 4.3 RAYO — Lightning VFX

**Identidad:** velocidad, electricidad, energía y descarga.

Efectos:

- Arcos eléctricos ramificados.
- Descargas irregulares.
- Electricidad alrededor del proyectil.
- Chispas.
- Pulsos eléctricos.
- Rayos ramificados hacia diferentes direcciones.
- Destellos de alta intensidad.
- Estelas eléctricas.
- Ondas electromagnéticas.
- Campos eléctricos.

Habilidades:

1. Lightning Bolt.
2. Thunder Strike.
3. Chain Lightning.
4. Thunderstorm.
5. Electric Burst.
6. Thunder Spear.
7. Static Field.
8. Lightning Cage.
9. Storm Surge.
10. Divine Thunder.

## 4.4 VACÍO — Void VFX

**Identidad:** absorción, oscuridad, distorsión y destrucción espacial.

Esta categoría debe tener una identidad particularmente elaborada.

Efectos:

- Núcleos oscuros.
- Distorsiones de espacio.
- Partículas absorbidas hacia un punto central.
- Fragmentos que desaparecen.
- Ondas gravitacionales.
- Anillos de energía oscura.
- Grietas espaciales.
- Humo negro.
- Distorsiones cromáticas.
- Campos de absorción.
- Efectos de desintegración.

Habilidades:

1. Void Bolt.
2. Black Hole.
3. Gravity Collapse.
4. Void Rift.
5. Dark Singularity.
6. Entropy Wave.
7. Spatial Rupture.
8. Abyssal Prison.
9. Devouring Pulse.
10. Oblivion.

## 4.5 HIELO — Ice VFX

**Identidad:** frío, cristalización, fragmentación y congelamiento.

Efectos:

- Fragmentos de hielo.
- Cristales irregulares.
- Escarcha.
- Niebla fría.
- Congelación progresiva.
- Estalactitas.
- Ondas de congelamiento.
- Fragmentación cristalina.
- Polvo helado.
- Superficies congeladas.

Habilidades:

1. Frost Bolt.
2. Ice Shard.
3. Frozen Lance.
4. Blizzard.
5. Ice Nova.
6. Frost Wall.
7. Glacial Spike.
8. Frozen Prison.
9. Crystal Storm.
10. Absolute Zero.

## 4.6 TIERRA — Earth VFX

**Identidad:** peso, fuerza, fragmentación y movimiento del terreno.

Efectos:

- Rocas irregulares.
- Fragmentos de piedra.
- Polvo.
- Grietas en el terreno.
- Ondas sísmicas.
- Columnas de roca.
- Escombros.
- Derrumbes.
- Ondas de impacto.
- Fragmentación de superficies.

Habilidades:

1. Rock Throw.
2. Earth Spike.
3. Stone Fist.
4. Earthquake.
5. Boulder Crash.
6. Stone Wall.
7. Seismic Wave.
8. Earth Prison.
9. Mountain Breaker.
10. Titan's Wrath.

## 4.7 VIENTO — Wind VFX

**Identidad:** velocidad, presión atmosférica y movimiento.

Efectos:

- Corrientes de aire.
- Hojas y partículas arrastradas.
- Espirales.
- Tornados.
- Ondas de presión.
- Distorsiones atmosféricas.
- Estelas.
- Polvo suspendido.

Habilidades:

1. Wind Blade.
2. Air Cutter.
3. Tornado.
4. Cyclone.
5. Wind Burst.
6. Vacuum Sphere.
7. Tempest.
8. Air Prison.
9. Skyfall.
10. Hurricane.

## 4.8 LUZ — Light VFX

**Identidad:** energía luminosa, pureza, radiación y poder celestial.

Efectos:

- Rayos volumétricos simulados.
- Partículas luminosas.
- Aros de energía.
- Destellos.
- Pulsos.
- Ondas radiantes.
- Fragmentos de luz.
- Columnas luminosas.
- Explosiones solares.

Habilidades:

1. Holy Bolt.
2. Radiant Spear.
3. Solar Beam.
4. Divine Nova.
5. Celestial Rain.
6. Light Prison.
7. Sacred Explosion.
8. Judgment.
9. Solar Flare.
10. Heaven's Wrath.

## 4.9 SOMBRA — Shadow VFX

**Identidad:** oscuridad, corrupción, sigilo y energía siniestra.

Efectos:

- Humo oscuro.
- Sombras orgánicas.
- Fragmentos negros.
- Energía violeta.
- Ondas de oscuridad.
- Tentáculos energéticos.
- Manchas que se expanden.
- Partículas que se desvanecen.
- Distorsiones visuales.

Habilidades:

1. Shadow Bolt.
2. Dark Wave.
3. Shadow Claw.
4. Nightfall.
5. Phantom Strike.
6. Dark Tendrils.
7. Soul Drain.
8. Shadow Explosion.
9. Eclipse.
10. Nightmare.

## 4.10 NATURALEZA — Nature VFX

**Identidad:** vida, crecimiento, raíces y energía natural.

Efectos:

- Hojas.
- Pétalos.
- Esporas.
- Polvo orgánico.
- Raíces.
- Enredaderas.
- Polen luminoso.
- Flores que aparecen.
- Ondas de crecimiento.
- Espinas.

Habilidades:

1. Nature Bolt.
2. Thorn Spear.
3. Root Grasp.
4. Vine Whip.
5. Nature's Wrath.
6. Spore Cloud.
7. Bloom Burst.
8. Ancient Roots.
9. Forest Guardian.
10. Verdant Storm.

## 4.11 ARCANO — Arcane VFX

**Identidad:** magia, conocimiento, energía inestable y manipulación.

Efectos:

- Runas luminosas.
- Glifos.
- Símbolos flotantes.
- Círculos mágicos.
- Energía concentrada.
- Fragmentos geométricos irregulares.
- Ondas arcanas.
- Portales.
- Distorsiones mágicas.
- Partículas de energía.

Habilidades:

1. Arcane Bolt.
2. Arcane Missile.
3. Arcane Explosion.
4. Mana Surge.
5. Arcane Orb.
6. Rune Prison.
7. Mystic Spiral.
8. Arcane Rift.
9. Astral Collapse.
10. Forbidden Spell.

## 4.12 VENENO — Poison VFX

**Identidad:** toxicidad, corrosión, contaminación y degradación.

Efectos:

- Gases tóxicos.
- Burbujas.
- Líquidos corrosivos.
- Salpicaduras.
- Humo verdoso.
- Esporas.
- Nubes persistentes.
- Gotas viscosas.
- Partículas suspendidas.

Habilidades:

1. Poison Dart.
2. Toxic Cloud.
3. Acid Splash.
4. Venom Burst.
5. Corrosive Wave.
6. Plague.
7. Venomous Chains.
8. Toxic Rain.
9. Biohazard.
10. Pestilence.

## 4.13 SANGRE — Blood VFX

**Identidad:** energía vital, sacrificio, rituales y corrupción.

Efectos:

- Gotas y chorros de líquido.
- Ondas carmesí.
- Partículas de energía vital.
- Fragmentos orgánicos estilizados.
- Sellos rituales.
- Cadenas sanguíneas.
- Explosiones carmesí.
- Absorción de energía.

Habilidades:

1. Blood Bolt.
2. Blood Spear.
3. Crimson Wave.
4. Blood Rain.
5. Sanguine Chains.
6. Blood Explosion.
7. Hemorrhage.
8. Blood Prison.
9. Crimson Eclipse.
10. Blood Sacrifice.

---

# 5. NUEVAS CATEGORÍAS AVANZADAS

Además de los elementos tradicionales, incorporar familias especiales para aumentar las posibilidades visuales del catálogo.

## 5.1 GRAVEDAD

- Gravitational Pull.
- Gravity Well.
- Meteor Swarm.
- Compression Field.
- Singularity.
- Gravitational Collapse.

Efectos visuales: atracción de partículas, deformaciones, órbitas, campos de fuerza y colapsos.

## 5.2 TIEMPO

- Time Warp.
- Temporal Rift.
- Chrono Burst.
- Time Stop.
- Temporal Echo.
- Rewind.

Efectos: imágenes residuales, duplicación temporal, distorsiones, ondas concéntricas y fragmentación de secuencias.

## 5.3 CRISTAL

- Crystal Lance.
- Crystal Bloom.
- Prism Explosion.
- Shattered Prism.
- Crystal Rain.
- Prismatic Beam.

Efectos: refracción, fragmentación, destellos, prismas y cristales de diferentes tamaños.

## 5.4 SONIDO

- Sonic Boom.
- Resonance Wave.
- Echo Burst.
- Sound Barrier.
- Vibrational Collapse.
- Sonic Lance.

Efectos: ondas de presión, anillos de expansión, distorsión atmosférica y vibraciones.

## 5.5 ESPACIO Y PORTALES

- Dimensional Rift.
- Portal Strike.
- Spatial Collapse.
- Rift Explosion.
- Dimensional Chains.
- Astral Gateway.

Efectos: grietas espaciales, portales, distorsiones, partículas absorbidas y desplazamientos.

## 5.6 CAOS

- Chaos Bolt.
- Unstable Energy.
- Reality Break.
- Chaos Storm.
- Entropy Explosion.
- Mutation Field.

Efectos: energía multicolor, fragmentación, deformaciones y movimientos impredecibles controlados.

## 5.7 METAL

- Metal Spear.
- Iron Rain.
- Magnetic Storm.
- Steel Burst.
- Magnetic Prison.
- Shrapnel Explosion.

Efectos: fragmentos metálicos, chispas, atracción magnética y deformaciones.

---

# 6. ARQUITECTURA VISUAL DE LAS HABILIDADES

La implementación debe permitir construir efectos complejos mediante componentes visuales reutilizables.

No desarrollar un sistema de combate alternativo.

## 6.1 Capas visuales

Cada habilidad podrá componerse de diferentes capas:

| Capa | Función |
|---|---|
| Core | Núcleo energético |
| Trail | Estela de desplazamiento |
| Particles | Partículas secundarias |
| Aura | Aura o campo energético |
| Distortion | Distorsión espacial o térmica |
| Light | Iluminación y emisión |
| Impact | Efecto de impacto |
| Shockwave | Onda expansiva |
| Debris | Fragmentos y residuos |
| Smoke | Humo, polvo o niebla |
| Residual | Efectos que permanecen temporalmente |

No todas las habilidades deben utilizar todas las capas.

## 6.2 Fases visuales

Conservar los eventos y la secuencia de ejecución que utiliza actualmente el proyecto.

Mejorar su representación visual mediante tres fases:

**A. Travel / Trayectoria**

- Aparición del efecto.
- Formación del núcleo.
- Desplazamiento.
- Estela.
- Partículas secundarias.
- Animación de energía.

**B. Impact / Impacto**

- Destello.
- Explosión o dispersión.
- Onda expansiva.
- Fragmentos.
- Humo.
- Partículas de impacto.

**C. Aftermath / Residuo**

- Partículas descendentes.
- Humo que desaparece.
- Brasas.
- Energía residual.
- Fragmentos que caen.
- Disipación progresiva.

La duración y composición deben variar según la habilidad.

---

# 7. SISTEMA DE TRAYECTORIAS Y MOVIMIENTO

No todas las habilidades deben desplazarse como un proyectil recto.

Incorporar diferentes comportamientos visuales:

1. Straight Projectile: desplazamiento directo.
2. Curved Projectile: trayectoria curva.
3. Homing Projectile: seguimiento visual del objetivo.
4. Spiral Projectile: desplazamiento helicoidal.
5. Lightning Arc: conexión eléctrica ramificada.
6. Energy Beam: conexión energética continua.
7. Wave: propagación de una onda.
8. Swarm: múltiples proyectiles.
9. Portal Travel: aparición y desaparición espacial.
10. Teleportation: desplazamiento instantáneo con efectos de transición.
11. Chain Reaction: conexiones sucesivas entre objetivos.
12. Expanding Field: expansión desde un centro.
13. Orbiting Energy: partículas orbitando un núcleo.
14. Falling Impact: caída desde una posición superior.
15. Ground Eruption: surgimiento desde el suelo.

Los efectos deben respetar las posiciones y referencias que proporciona el sistema existente.

No cambiar la lógica que determina atacante, objetivo o ejecución de la habilidad.

---

# 8. EFECTOS DE IMPACTO PREMIUM

Uno de los aspectos más importantes de la renovación será mejorar considerablemente los impactos.

Un proyectil no debe limitarse a desaparecer al alcanzar al objetivo.

Crear una biblioteca de impactos reutilizables:

- Small Energy Burst.
- Heavy Explosion.
- Elemental Shockwave.
- Radial Energy Pulse.
- Ground Crack.
- Fire Detonation.
- Electric Discharge.
- Water Splash.
- Ice Shatter.
- Void Implosion.
- Arcane Flash.
- Poison Cloud.
- Crystal Fragmentation.
- Gravitational Collapse.
- Sonic Pressure Wave.
- Dimensional Rupture.

Cada impacto debe poder combinar efectos de partículas, geometrías, shaders y posprocesamiento.

También deben existir variantes según la intensidad:

- Impacto ligero.
- Impacto medio.
- Impacto pesado.
- Impacto crítico.
- Impacto definitivo.

Estas variantes representan exclusivamente diferencias visuales y no deben introducir nuevas reglas de combate.

---

# 9. CALIDAD DE PARTÍCULAS Y TÉCNICAS DE RENDERIZADO

## 9.1 Eliminar la apariencia de esferas

Las partículas actuales deben sustituirse progresivamente por recursos visuales más elaborados.

Priorizar:

- Sprites con texturas alpha.
- Texturas procedurales.
- Billboards orientados a cámara.
- Partículas estiradas según velocidad.
- Mesh particles con siluetas orgánicas.
- Trails dinámicos.
- Shaders con ruido animado.
- Sistemas de partículas GPU.

## 9.2 Variación natural

Evitar que todas las partículas tengan:

- El mismo tamaño.
- La misma velocidad.
- La misma trayectoria.
- El mismo color.
- La misma duración.
- El mismo momento de aparición.

Incorporar variación controlada mediante curvas, ruido y distribuciones deterministas cuando corresponda.

## 9.3 Humo y niebla

El humo debe presentar:

- Expansión progresiva.
- Bordes irregulares.
- Transparencia variable.
- Movimiento turbulento.
- Desvanecimiento natural.
- Diferentes escalas.
- Superposición de capas.

Evitar las típicas esferas grises transparentes.

## 9.4 Trails

Las estelas deben tener:

- Anchura variable.
- Desvanecimiento progresivo.
- Ruido.
- Deformación.
- Gradientes de color.
- Transparencia.
- Movimiento asociado al proyectil.

## 9.5 Iluminación

Evaluar:

- Emission maps.
- Bloom selectivo.
- Point lights temporales.
- Iluminación radial.
- Pulsos de intensidad.
- Reflejos y refracción cuando corresponda.

Evitar utilizar luces dinámicas excesivas para cada partícula.

---

# 10. SISTEMA DE CONFIGURACIÓN VISUAL

Cada habilidad debe poder configurarse independientemente.

Propuesta conceptual:

```ts
interface AbilityVFXConfig {
  id: string;
  category: string;
  visualStyle: string;

  travelEffect?: string;
  impactEffect?: string;
  aftermathEffect?: string;

  particleQuality: "low" | "medium" | "high" | "ultra";

  intensity: number;
  scale: number;
  duration: number;

  enableTrails: boolean;
  enableDistortion: boolean;
  enableLighting: boolean;
  enablePostProcessing: boolean;
}
```

Este esquema es orientativo. El agente debe adaptarlo a los modelos y convenciones que ya existen.

No duplicar información del sistema de habilidades.

## 10.1 Presets visuales

Implementar configuraciones reutilizables:

- Performance.
- Balanced.
- High Quality.
- Ultra Quality.

Deben controlar:

- Cantidad de partículas.
- Resolución de texturas.
- Calidad de shaders.
- Complejidad de trails.
- Distorsiones.
- Efectos secundarios.
- Iluminación.
- Posprocesamiento.

Los presets no deben cambiar la identidad visual de la habilidad, solamente su nivel de detalle y complejidad.

---

# 11. REUTILIZACIÓN Y COMPOSICIÓN

Desarrollar una biblioteca de recursos visuales reutilizables.

Ejemplos:

- FireCore.
- FlameTrail.
- SmokeEmitter.
- ElectricArc.
- EnergyBurst.
- MagicRune.
- ShockwaveRing.
- WaterSplash.
- IceFragments.
- VoidDistortion.
- CrystalShatter.
- LightningFlash.
- GroundDebris.
- EnergyAbsorption.
- TemporalEcho.

Una habilidad podrá combinar varios de estos recursos.

Ejemplo conceptual:

**Meteor Strike**

- Núcleo incandescente.
- Estela de fuego.
- Humo oscuro.
- Brasas.
- Destello de impacto.
- Onda expansiva.
- Fragmentos.
- Humo residual.

Esto permite ampliar el catálogo sin desarrollar cada efecto completamente desde cero.

---

# 12. RENDIMIENTO Y OPTIMIZACIÓN

La calidad visual debe acompañarse de una implementación eficiente.

Objetivos:

- Evitar crear y destruir miles de objetos continuamente.
- Utilizar pooling.
- Agrupar partículas cuando sea posible.
- Reutilizar geometrías y materiales.
- Evitar materiales duplicados.
- Reducir draw calls.
- Limitar luces dinámicas.
- Controlar transparencias y overdraw.
- Implementar LOD visual.
- Gestionar correctamente los recursos al finalizar cada efecto.
- Evitar fugas de memoria.
- Utilizar GPU cuando sea beneficioso.

## 12.1 Rendimiento adaptable

La cantidad de partículas debe adaptarse al nivel de calidad seleccionado.

No todas las habilidades necesitan miles de partículas para verse profesionales.

Es preferible una composición visual inteligente con buenas texturas, shaders y movimiento que una cantidad excesiva de partículas simples.

## 12.2 Compatibilidad

Antes de adoptar una biblioteca:

1. Comprobar compatibilidad con la versión instalada de Three.js.
2. Comprobar compatibilidad con el renderizador existente.
3. Comprobar compatibilidad con React Three Fiber si corresponde.
4. Verificar licencias.
5. Medir rendimiento.
6. Evaluar mantenimiento y estabilidad.
7. Verificar que no interfiera con el sistema actual.

---

# 13. CATÁLOGO Y ORGANIZACIÓN DE HABILIDADES

Ampliar el catálogo existente con las nuevas familias elementales y especiales.

Objetivo inicial:

- 13 familias elementales principales.
- 7 familias especiales adicionales.
- 10 habilidades por familia como primera colección de referencia.

Esto representa aproximadamente 200 habilidades visuales potenciales.

No es obligatorio implementar las 200 simultáneamente. Se debe avanzar por familias y priorizar la calidad de cada una.

Cada habilidad debe contar con:

- Identificador estable.
- Nombre.
- Categoría.
- Descripción visual.
- Efecto de trayectoria.
- Efecto de impacto.
- Efecto residual.
- Configuración de calidad.
- Recursos reutilizables.
- Duraciones.
- Parámetros visuales.

No crear habilidades vacías que compartan exactamente el mismo efecto y solamente cambien de color.

Cada habilidad debe tener una composición reconocible.

---

# 14. VISUALIZACIÓN Y PRUEBAS DE EFECTOS

Desarrollar un entorno de pruebas para validar visualmente los VFX sin modificar el sistema de combate.

El entorno debe permitir:

- Visualizar habilidades individualmente.
- Reproducir trayectorias.
- Reproducir impactos.
- Ver efectos residuales.
- Cambiar presets de calidad.
- Modificar parámetros visuales.
- Comparar variantes.
- Repetir animaciones.
- Visualizar diferentes familias.
- Probar efectos con distintos tamaños y distancias.

Si ya existe una herramienta de visualización de habilidades, ampliar esa herramienta en lugar de crear otra innecesaria.

La finalidad es facilitar el trabajo artístico y técnico.

---

# 15. PLAN DE IMPLEMENTACIÓN POR ETAPAS

## FASE 0 — Auditoría del sistema actual

Antes de modificar archivos:

- Identificar el catálogo actual.
- Identificar cómo se representan las partículas.
- Localizar los componentes responsables de los efectos.
- Identificar cómo se obtienen las posiciones de los personajes.
- Identificar los eventos de inicio, trayectoria e impacto.
- Revisar la gestión del ciclo de vida de los efectos.
- Identificar dependencias y versión de Three.js.
- Revisar integración con React Three Fiber, si corresponde.

**Entregable:** diagnóstico técnico y propuesta de integración.

No modificar la lógica funcional existente.

## FASE 1 — Infraestructura visual premium

- Seleccionar biblioteca de partículas.
- Evaluar Three.Quarks.
- Evaluar postprocessing.
- Preparar recursos compartidos.
- Preparar materiales y shaders.
- Establecer convenciones visuales.
- Incorporar pooling.
- Establecer presets de calidad.

**Entregable:** infraestructura preparada y primeros efectos funcionales.

## FASE 2 — Renovación de las habilidades existentes

Priorizar las categorías que ya están disponibles:

1. Fuego.
2. Agua.
3. Rayo.
4. Vacío.

Cada una debe tener:

- Proyectil premium.
- Trayectoria.
- Estela.
- Impacto.
- Efecto residual.
- Variantes de intensidad.

**Entregable:** cuatro familias completamente renovadas.

## FASE 3 — Nuevas familias elementales

Incorporar:

1. Hielo.
2. Tierra.
3. Viento.
4. Luz.
5. Sombra.
6. Naturaleza.
7. Arcano.
8. Veneno.
9. Sangre.

**Entregable:** catálogo elemental ampliado.

## FASE 4 — Familias especiales

Incorporar:

1. Gravedad.
2. Tiempo.
3. Cristal.
4. Sonido.
5. Espacio.
6. Caos.
7. Metal.

**Entregable:** biblioteca de efectos especiales.

## FASE 5 — Impactos y efectos avanzados

- Explosiones multicapa.
- Distorsiones espaciales.
- Ondas expansivas.
- Efectos de absorción.
- Fragmentación.
- Campos energéticos.
- Efectos ambientales residuales.

**Entregable:** biblioteca avanzada de impactos.

## FASE 6 — Optimización

- Medición de FPS.
- Medición de draw calls.
- Uso de memoria.
- Optimización de emisores.
- Control de overdraw.
- Ajustes de GPU.
- LOD.
- Limpieza de recursos.

**Entregable:** sistema optimizado con diferentes niveles de calidad.

## FASE 7 — Control de calidad visual

Revisar todas las habilidades implementadas.

Comprobar:

- Que no parezcan esferas flotantes.
- Que no existan geometrías excesivamente artificiales.
- Que las trayectorias sean fluidas.
- Que los impactos tengan fuerza visual.
- Que cada elemento tenga identidad propia.
- Que los efectos no desaparezcan abruptamente.
- Que no se produzcan errores visuales.
- Que las habilidades sean legibles.
- Que la calidad sea consistente entre familias.

**Entregable:** catálogo VFX premium validado.

---

# 16. CRITERIOS DE ACEPTACIÓN

La renovación se considerará satisfactoria cuando:

- Las partículas básicas originales hayan sido reemplazadas en las habilidades renovadas.
- Se mantenga intacta la lógica de ejecución de habilidades.
- Las trayectorias visuales funcionen con los personajes existentes.
- Los efectos de impacto sean independientes y configurables.
- Existan efectos residuales.
- Cada familia tenga identidad visual propia.
- Se puedan componer efectos mediante recursos reutilizables.
- Existan presets de calidad.
- No haya fugas de memoria.
- El rendimiento sea aceptable.
- Se mantenga la compatibilidad con el motor y la arquitectura actual.
- Las nuevas habilidades se puedan incorporar sin reestructurar todo el sistema.

---

# 17. RESTRICCIONES IMPORTANTES

El agente debe respetar estas condiciones durante todo el desarrollo:

**NO HACER:**

- Crear un sistema nuevo de utilización de habilidades.
- Crear un sistema nuevo de combate.
- Modificar la selección de objetivos.
- Modificar la lógica de daño.
- Cambiar cómo se determina el atacante.
- Cambiar cómo se determina el objetivo.
- Reemplazar innecesariamente el motor Three.js.
- Incorporar dependencias sin evaluar su compatibilidad.
- Crear habilidades que sean únicamente esferas de colores diferentes.
- Utilizar geometrías primitivas como recurso visual principal.
- Sobrecargar todos los efectos con bloom y luces.
- Sacrificar rendimiento sin justificación.

**SÍ HACER:**

- Renovar los efectos visuales existentes.
- Reutilizar el sistema actual.
- Mantener las interfaces de integración existentes siempre que sea posible.
- Incorporar bibliotecas especializadas.
- Desarrollar shaders personalizados cuando aporten valor.
- Crear efectos multicapa.
- Mejorar trayectorias, impactos y residuos.
- Incorporar familias nuevas.
- Priorizar calidad artística.
- Optimizar cada implementación.

---

# 18. INSTRUCCIONES FINALES PARA EL AGENTE

Este documento es un plan maestro de evolución visual, no una especificación para implementar todo de una sola vez.

Antes de comenzar:

1. Analizar el código existente.
2. Documentar los puntos de integración.
3. Identificar qué componentes pueden reutilizarse.
4. Determinar qué biblioteca ofrece la mejor relación entre calidad, compatibilidad y rendimiento.
5. Presentar una arquitectura propuesta.
6. Establecer un orden de implementación.

Posteriormente, desarrollar cada fase de manera independiente.

**Prioridad absoluta: calidad visual.**

No se busca simplemente aumentar la cantidad de partículas. Se busca que cada habilidad tenga una presentación visual elaborada, natural, dinámica y profesional.

Una habilidad de fuego debe transmitir combustión. Una de agua debe transmitir fluidez. Una de rayo debe transmitir electricidad. Una de vacío debe transmitir distorsión y absorción.

La diferencia debe estar en la naturaleza del efecto, no únicamente en su color.

El resultado final debe acercarse a la calidad visual de un videojuego comercial moderno, manteniendo la arquitectura existente y evitando introducir complejidad innecesaria en el sistema funcional de habilidades.