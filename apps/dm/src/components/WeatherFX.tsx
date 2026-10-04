import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export const WEATHER_INTENSITY_MIN = 0.25;
export const WEATHER_INTENSITY_MAX = 4;

export function clampWeatherIntensity(v: number | null | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1;
  return Math.min(WEATHER_INTENSITY_MAX, Math.max(WEATHER_INTENSITY_MIN, v));
}

export type WeatherKind = 'rain' | 'snow' | 'fog';

export interface WeatherMeta {
  label: string;
  tint: string;
  /** qué componente dibuja esta variante */
  kind: WeatherKind;
  /** multiplicador de velocidad. En niebla es la velocidad a la que deriva */
  speed: number;
  /**
   * multiplicador de cantidad. En lluvia y nieve es la cantidad de
   * partículas; en niebla, donde no hay partículas sino 3 planos, es la
   * opacidad. Por eso es "densidad" y no "count".
   */
  density: number;
  /** multiplicador del tamaño del punto (lluvia/nieve) o del blob (niebla) */
  grain: number;
}

// Las tres ids viejas (rain/snow/fog) se quedan tal cual, con multiplicadores
// 1: hay escenas ya guardadas en la base con esos strings y una lluvia que
// "cambia" al refactorizar el clima rompe campañas que funcionaban.
export const WEATHER_META: Record<string, WeatherMeta> = {
  rain: { label: '🌧 Lluvia', tint: 'rgba(64, 88, 122, 0.16)', kind: 'rain', speed: 1, density: 1, grain: 1 },
  rainDrizzle: { label: '🌦 Llovizna', tint: 'rgba(96, 118, 148, 0.12)', kind: 'rain', speed: 0.7, density: 0.5, grain: 0.8 },
  rainStorm: { label: '⛈ Tormenta', tint: 'rgba(38, 56, 86, 0.28)', kind: 'rain', speed: 1.5, density: 1.6, grain: 1.15 },
  snow: { label: '❄ Nieve', tint: 'rgba(198, 210, 232, 0.14)', kind: 'snow', speed: 1, density: 1, grain: 1 },
  snowBlizzard: { label: '🌨 Ventisca', tint: 'rgba(226, 234, 248, 0.26)', kind: 'snow', speed: 1.9, density: 1.5, grain: 0.85 },
  fog: { label: '🌫 Niebla', tint: 'rgba(212, 212, 218, 0.18)', kind: 'fog', speed: 1, density: 1, grain: 1 },
  fogDense: { label: '🌁 Niebla densa', tint: 'rgba(198, 200, 210, 0.34)', kind: 'fog', speed: 0.5, density: 1.6, grain: 1.7 },
};

export const WEATHER_NONE_LABEL = '🌤 Sin clima';

/** Solo para los encabezados del menú. El submenú agrupa por tipo, no por id. */
export const WEATHER_KIND_LABEL: Record<WeatherKind, string> = {
  rain: 'Lluvia',
  snow: 'Nieve',
  fog: 'Niebla',
};

interface WeatherFXProps {
  weather: string | null;
  mapWidth: number;
  mapHeight: number;
  intensity?: number | null;
}

const TOP_Y = 6.5;
const N_RAIN = 400;
const N_SNOW = 320;
// Los buffers se alocan para la intensidad MÁXIMA: setDrawRange solo puede
// recortar, nunca agregar vértices que no existen (si no, subir la intensidad no agrega gotas).
const N_RAIN_MAX = Math.round(N_RAIN * WEATHER_INTENSITY_MAX);
const N_SNOW_MAX = Math.round(N_SNOW * WEATHER_INTENSITY_MAX);

// La cámara es casi cenital: un segmento vertical se escorza hacia la cámara y
// "flota". Por eso la lluvia usa <points> (como la nieve, que sí cae visible),
// pero más chica y mucho más rápida.
function Rain({
  mapWidth,
  mapHeight,
  intensity,
  speed = 1,
  density = 1,
  grain = 1,
}: {
  mapWidth: number;
  mapHeight: number;
  intensity: number;
  speed?: number;
  density?: number;
  grain?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const k = clampWeatherIntensity(intensity);
  const active = Math.min(N_RAIN_MAX, Math.max(8, Math.round(N_RAIN * k * density)));
  const speedK = (0.85 + 0.25 * k) * speed;
  const geo = useMemo(() => {
    const N = N_RAIN_MAX;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N);
    const seed = new Float32Array(N);
    const windX = new Float32Array(N);
    const halfW = mapWidth / 2 + 4;
    const halfD = mapHeight / 2 + 4;
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2 * halfW;
      pos[i * 3 + 1] = Math.random() * TOP_Y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * halfD;
      // Caída rápida (la lluvia cae, no flota); el viento solo rompe la retícula.
      vel[i] = 16 + Math.random() * 8;
      seed[i] = Math.random() * Math.PI * 2;
      windX[i] = (Math.random() - 0.5) * 0.3;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.userData = { vel, seed, windX, halfW, halfD };
    return g;
  }, [mapWidth, mapHeight]);
  useEffect(() => {
    geo.setDrawRange(0, active);
  }, [geo, active]);
  useFrame(({ clock }, dt) => {
    const l = ref.current;
    if (!l) return;
    const attr = l.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    const { vel, seed, windX, halfW, halfD } = geo.userData as {
      vel: Float32Array;
      seed: Float32Array;
      windX: Float32Array;
      halfW: number;
      halfD: number;
    };
    const step = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    for (let i = 0; i < active; i++) {
      const idx = i * 3;
      // Viento suave y unidireccional: la caída manda, el viento solo desvía.
      const gust = 0.8 + 0.3 * Math.sin(t * 0.3 + seed[i]);
      array[idx] += windX[i] * gust * step;
      array[idx + 1] -= vel[i] * speedK * step;
      if (array[idx + 1] < 0.02) {
        array[idx] = (Math.random() - 0.5) * 2 * halfW;
        array[idx + 1] = TOP_Y + Math.random() * 1.2;
        array[idx + 2] = (Math.random() - 0.5) * 2 * halfD;
      }
      if (array[idx] > halfW) array[idx] = -halfW;
      else if (array[idx] < -halfW) array[idx] = halfW;
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#a9c4e4"
        size={0.045 * grain}
        sizeAttenuation
        transparent
        opacity={Math.min(0.85, 0.4 + 0.15 * k)}
        depthWrite={false}
      />
    </points>
  );
}

function Snow({
  mapWidth,
  mapHeight,
  intensity,
  speed = 1,
  density = 1,
  grain = 1,
}: {
  mapWidth: number;
  mapHeight: number;
  intensity: number;
  speed?: number;
  density?: number;
  grain?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const k = clampWeatherIntensity(intensity);
  const active = Math.min(N_SNOW_MAX, Math.max(8, Math.round(N_SNOW * k * density)));
  const speedK = (0.65 + 0.5 * k) * speed;
  const geo = useMemo(() => {
    const N = N_SNOW_MAX;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N);
    const seed = new Float32Array(N);
    const halfW = mapWidth / 2 + 4;
    const halfD = mapHeight / 2 + 4;
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2 * halfW;
      pos[i * 3 + 1] = Math.random() * TOP_Y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * halfD;
      vel[i] = 0.5 + Math.random() * 0.6;
      seed[i] = Math.random() * Math.PI * 2;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.userData = { vel, seed, halfW, halfD };
    return g;
  }, [mapWidth, mapHeight]);
  useEffect(() => {
    geo.setDrawRange(0, active);
  }, [geo, active]);
  useFrame(({ clock }, dt) => {
    const p = ref.current;
    if (!p) return;
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    const { vel, seed, halfW, halfD } = geo.userData as {
      vel: Float32Array;
      seed: Float32Array;
      halfW: number;
      halfD: number;
    };
    const t = clock.elapsedTime;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < active; i++) {
      const idx = i * 3;
      array[idx + 1] -= vel[i] * speedK * step;
      array[idx] += Math.sin(t * 0.6 + seed[i]) * 0.35 * step;
      array[idx + 2] += Math.cos(t * 0.5 + seed[i]) * 0.35 * step;
      if (array[idx + 1] < 0.02) {
        array[idx + 1] = TOP_Y + Math.random() * 0.6;
        array[idx] = (Math.random() - 0.5) * 2 * halfW;
        array[idx + 2] = (Math.random() - 0.5) * 2 * halfD;
      }
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#eef3fa"
        size={0.09 * (0.8 + 0.15 * k) * grain}
        sizeAttenuation
        transparent
        opacity={Math.min(1, 0.6 + 0.12 * k)}
        depthWrite={false}
      />
    </points>
  );
}

function makeFogTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, 'rgba(218, 223, 232, 0.8)');
  grad.addColorStop(1, 'rgba(218, 223, 232, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function FogDrift({
  mapWidth,
  mapHeight,
  intensity,
  speed = 1,
  density = 1,
  grain = 1,
}: {
  mapWidth: number;
  mapHeight: number;
  intensity: number;
  speed?: number;
  density?: number;
  grain?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const k = clampWeatherIntensity(intensity);
  // En niebla "density" es opacidad y "grain" es el tamaño del blob: no hay
  // partículas que multiplicar, hay 3 planos que achican o agrandan.
  const opacity = Math.min(0.62, 0.24 * k * density);
  const size = Math.max(mapWidth, mapHeight) * (0.5 + 0.13 * k) * grain;
  const tex = useMemo(() => makeFogTexture(), []);
  const blobs = useMemo(() => {
    const halfW = mapWidth / 2;
    const halfD = mapHeight / 2;
    return [0, 1, 2].map(() => ({
      x: (Math.random() - 0.5) * halfW,
      z: (Math.random() - 0.5) * halfD,
      speed: 0.10 + Math.random() * 0.08,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));
  }, [mapWidth, mapHeight]);
  useFrame((_, dt) => {
    const grp = group.current;
    if (!grp) return;
    const step = Math.min(dt, 0.05);
    const halfW = mapWidth / 2 + 6;
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      const m = grp.children[i];
      if (!m) continue;
      b.x += b.dir * b.speed * (0.6 + 0.5 * k) * speed * step;
      if (b.x > halfW) b.x = -halfW;
      if (b.x < -halfW) b.x = halfW;
      m.position.x = b.x;
      m.position.z = b.z;
    }
  });
  return (
    <group ref={group}>
      {blobs.map((b, i) => (
        <mesh key={i} position={[b.x, 0.12, b.z]} scale={1.2 + i * 0.4}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function WeatherFX({
  weather,
  mapWidth,
  mapHeight,
  intensity = 1,
}: WeatherFXProps) {
  const k = clampWeatherIntensity(intensity);
  // Se resuelve por id, no por switch: las variantes comparten componente y se
  // diferencian solo en los tres multiplicadores. Un id desconocido cae en null
  // y no dibuja, que es lo que ya pasaba con cualquier clima no implementado.
  const meta = weather ? WEATHER_META[weather] : undefined;
  if (!meta) return null;
  const { kind, speed, density, grain } = meta;
  const shared = { mapWidth, mapHeight, intensity: k, speed, density, grain };
  if (kind === 'rain') return <Rain {...shared} />;
  if (kind === 'snow') return <Snow {...shared} />;
  return <FogDrift {...shared} />;
}