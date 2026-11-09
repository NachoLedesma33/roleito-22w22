import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface VfxEffect {
  id: number;
  type: 'fire' | 'ice' | 'lightning' | 'heal' | 'void';
  from: [number, number, number];
  to: [number, number, number];
  duration: number;
  startedAt?: number;
}

const COLORS: Record<VfxEffect['type'], string> = {
  fire: '#ff6600',
  ice: '#00ccff',
  lightning: '#ffff00',
  heal: '#00ff66',
  void: '#9900ff',
};

function makeTexture(color: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, color + '88');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function VfxBurst({ effect }: { effect: VfxEffect }) {
  const pointsRef = useRef<THREE.Points>(null);
  const startedRef = useRef<number | null>(null);
  const count = 150;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = effect.from[0];
      arr[i * 3 + 1] = effect.from[1];
      arr[i * 3 + 2] = effect.from[2];
    }
    return arr;
  }, [effect.from]);

  const texture = useMemo(() => makeTexture(COLORS[effect.type]), [effect.type]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    if (startedRef.current === null) startedRef.current = clock.elapsedTime;
    const t = (clock.elapsedTime - startedRef.current) / (effect.duration / 1000);
    if (t >= 1) {
      pointsRef.current.visible = false;
      return;
    }
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const frac = i / count;
      const progress = Math.min(1, t + frac * 0.3);
      arr[i * 3] = effect.from[0] + (effect.to[0] - effect.from[0]) * progress + (Math.random() - 0.5) * 1.5;
      arr[i * 3 + 1] = effect.from[1] + (effect.to[1] - effect.from[1]) * progress + Math.sin(progress * Math.PI) * 3;
      arr[i * 3 + 2] = effect.from[2] + (effect.to[2] - effect.from[2]) * progress + (Math.random() - 0.5) * 1.5;
    }
    pos.needsUpdate = true;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 1 - t;
    mat.size = 0.3 + (1 - t) * 0.5;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.8}
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}