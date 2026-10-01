import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

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
}

const TOP_Y = 6.5;
const N_RAIN = 320;
const N_SNOW = 260;

function Rain({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const N = N_RAIN;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 6);
    const vel = new Float32Array(N);
    const seed = new Float32Array(N);
    const halfW = mapWidth / 2 + 4;
    const halfD = mapHeight / 2 + 4;
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 2 * halfW;
      const z = (Math.random() - 0.5) * 2 * halfD;
      const y = Math.random() * TOP_Y;
      vel[i] = 6 + Math.random() * 3;
      seed[i] = Math.random() * Math.PI * 2;
      pos[i * 6] = x;
      pos[i * 6 + 1] = y;
      pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x - 0.04;
      pos[i * 6 + 4] = y - 0.28;
      pos[i * 6 + 5] = z - 0.04;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.userData = { vel, seed, halfW, halfD };
    return g;
  }, [mapWidth, mapHeight]);
  useFrame((_, dt) => {
    const l = ref.current;
    if (!l) return;
    const attr = l.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    const { vel, seed, halfW, halfD } = geo.userData as {
      vel: Float32Array;
      seed: Float32Array;
      halfW: number;
      halfD: number;
    };
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < N_RAIN; i++) {
      const headIdx = i * 6;
      let y1 = array[headIdx + 1] - vel[i] * step;
      if (y1 < 0.05) {
        array[headIdx] = (Math.random() - 0.5) * 2 * halfW;
        array[headIdx + 1] = TOP_Y + Math.random() * 0.8;
        array[headIdx + 2] = (Math.random() - 0.5) * 2 * halfD;
        y1 = array[headIdx + 1];
      }
      const sway = Math.sin(seed[i] * 3.0) * 0.06;
      array[headIdx + 3] = array[headIdx] + sway;
      array[headIdx + 4] = y1 - 0.28;
      array[headIdx + 5] = array[headIdx + 2] + sway * 0.4;
    }
    attr.needsUpdate = true;
  });
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#9db8d8" transparent opacity={0.5} depthWrite={false} />
    </lineSegments>
  );
}

function Snow({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const N = N_SNOW;
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
    for (let i = 0; i < N_SNOW; i++) {
      const idx = i * 3;
      array[idx + 1] -= vel[i] * step;
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
      <pointsMaterial color="#eef3fa" size={0.09} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
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

function FogDrift({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
  const group = useRef<THREE.Group>(null);
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
      b.x += b.dir * b.speed * step;
      if (b.x > halfW) b.x = -halfW;
      if (b.x < -halfW) b.x = halfW;
      m.position.x = b.x;
      m.position.z = b.z;
    }
  });
  const size = Math.max(mapWidth, mapHeight) * 0.55;
  return (
    <group ref={group}>
      {blobs.map((b, i) => (
        <mesh key={i} position={[b.x, 0.12, b.z]} scale={1.2 + i * 0.4}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial map={tex} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function WeatherFX({ weather, mapWidth, mapHeight }: WeatherFXProps) {
  if (weather === 'rain') return <Rain mapWidth={mapWidth} mapHeight={mapHeight} />;
  if (weather === 'snow') return <Snow mapWidth={mapWidth} mapHeight={mapHeight} />;
  if (weather === 'fog') return <FogDrift mapWidth={mapWidth} mapHeight={mapHeight} />;
  return null;
}