import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { layerCount, memoByKey, sampleVfx, type VfxLayer, type VfxType } from '../lib/vfxParticles';

export interface VfxEffect {
  id: number;
  type: 'fire' | 'ice' | 'lightning' | 'heal' | 'void';
  from: [number, number, number];
  to: [number, number, number];
  duration: number;
  startedAt?: number;
}

const LAYERS: VfxLayer[] = ['core', 'trail', 'motes', 'impact', 'aftermath'];

function makeTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, '#ffffffaa');
  grad.addColorStop(1, '#ffffff00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function getTexture(type: VfxType): THREE.Texture {
  return memoByKey(`vfx-texture-${type}`, makeTexture);
}

interface LayerBuffers {
  positions: Float32Array;
  colors: Float32Array;
  positionAttr: THREE.BufferAttribute;
  colorAttr: THREE.BufferAttribute;
}

export function VfxBurst({ effect }: { effect: VfxEffect }) {
  const startedRef = useRef<number | null>(null);
  const pointsRefs = useRef<(THREE.Points | null)[]>([]);
  const materialRefs = useRef<(THREE.PointsMaterial | null)[]>([]);
  const texture = useMemo(() => getTexture(effect.type), [effect.type]);

  const buffers = useMemo<LayerBuffers[]>(
    () =>
      LAYERS.map((layer) => {
        const count = layerCount(layer);
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          positions[i * 3] = effect.from[0];
          positions[i * 3 + 1] = effect.from[1];
          positions[i * 3 + 2] = effect.from[2];
        }
        return {
          positions,
          colors,
          positionAttr: new THREE.BufferAttribute(positions, 3),
          colorAttr: new THREE.BufferAttribute(colors, 3),
        };
      }),
    [effect.from],
  );

  useFrame(({ clock }) => {
    if (startedRef.current === null) startedRef.current = clock.elapsedTime;
    const t = (clock.elapsedTime - startedRef.current) / (effect.duration / 1000);
    if (t >= 1) {
      for (const points of pointsRefs.current) if (points) points.visible = false;
      return;
    }

    for (let li = 0; li < LAYERS.length; li++) {
      const points = pointsRefs.current[li];
      const mat = materialRefs.current[li];
      if (!points || !mat) continue;
      const b = buffers[li];
      const particles = sampleVfx(LAYERS[li], {
        type: effect.type,
        t,
        duration: effect.duration,
        seed: effect.id,
      });
      let alphaSum = 0;
      let sizeSum = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const progress = Math.min(1, t + (i / particles.length) * 0.3);
        b.positions[i * 3] = effect.from[0] + (effect.to[0] - effect.from[0]) * progress + p.offset[0];
        b.positions[i * 3 + 1] = effect.from[1] + (effect.to[1] - effect.from[1]) * progress + p.offset[1];
        b.positions[i * 3 + 2] = effect.from[2] + (effect.to[2] - effect.from[2]) * progress + p.offset[2];
        const shade = 0.6 + 0.4 * p.size;
        b.colors[i * 3] = p.color[0] * shade;
        b.colors[i * 3 + 1] = p.color[1] * shade;
        b.colors[i * 3 + 2] = p.color[2] * shade;
        alphaSum += p.alpha;
        sizeSum += p.size;
      }
      b.positionAttr.needsUpdate = true;
      b.colorAttr.needsUpdate = true;
      mat.opacity = Math.min(1, alphaSum / particles.length);
      mat.size = 0.25 + (sizeSum / particles.length) * 0.9;
      points.visible = alphaSum > 0;
    }
  });

  return (
    <>
      {LAYERS.map((layer, li) => (
        <points key={layer} ref={(el) => { pointsRefs.current[li] = el; }}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={layerCount(layer)}
              array={buffers[li].positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={layerCount(layer)}
              array={buffers[li].colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={(el) => { materialRefs.current[li] = el; }}
            map={texture}
            size={0.8}
            transparent
            opacity={1}
            vertexColors
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      ))}
    </>
  );
}
