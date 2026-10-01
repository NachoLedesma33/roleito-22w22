import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export const WEATHER_INTENSITY_MIN = 0.25;
export const WEATHER_INTENSITY_MAX = 4;

export function clampWeatherIntensity(v: number | null | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1;
  return Math.min(WEATHER_INTENSITY_MAX, Math.max(WEATHER_INTENSITY_MIN, v));
}

export const WEATHER_META: Record<string, { label: string; tint: string }> = {
  rain: { label: '🌧 Lluvia', tint: 'rgba(64, 88, 122, 0.16)' },
  snow: { label: '❄ Nieve', tint: 'rgba(198, 210, 232, 0.14)' },
  fog: { label: '🌫 Niebla', tint: 'rgba(212, 212, 218, 0.18)' },
};

export const WEATHER_NONE_LABEL = '🌤 Sin clima';

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
function Rain({ mapWidth, mapHeight, intensity }: { mapWidth: number; mapHeight: number; intensity: number }) {
  const ref = useRef<THREE.Points>(null);
  const k = clampWeatherIntensity(intensity);
  const active = Math.max(8, Math.round(N_RAIN * k));
  const speedK = 0.85 + 0.25 * k;
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
        size={0.045}
        sizeAttenuation
        transparent
        opacity={Math.min(0.85, 0.4 + 0.15 * k)}
        depthWrite={false}
      />
    </points>
  );
}

function Snow({ mapWidth, mapHeight, intensity }: { mapWidth: number; mapHeight: number; intensity: number }) {
  const ref = useRef<THREE.Points>(null);
  const k = clampWeatherIntensity(intensity);
  const active = Math.max(8, Math.round(N_SNOW * k));
  const speedK = 0.65 + 0.5 * k;
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
        size={0.09 * (0.8 + 0.15 * k)}
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

function FogDrift({ mapWidth, mapHeight, intensity }: { mapWidth: number; mapHeight: number; intensity: number }) {
  const group = useRef<THREE.Group>(null);
  const k = clampWeatherIntensity(intensity);
  const opacity = Math.min(0.62, 0.24 * k);
  const size = Math.max(mapWidth, mapHeight) * (0.5 + 0.13 * k);
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
      b.x += b.dir * b.speed * (0.6 + 0.5 * k) * step;
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
  if (weather === 'rain') return <Rain mapWidth={mapWidth} mapHeight={mapHeight} intensity={k} />;
  if (weather === 'snow') return <Snow mapWidth={mapWidth} mapHeight={mapHeight} intensity={k} />;
  if (weather === 'fog') return <FogDrift mapWidth={mapWidth} mapHeight={mapHeight} intensity={k} />;
  return null;
}