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

const STYLE: Record<VfxType, { size: number; spread: number; arc: number }> = {
  fire: { size: 0.42, spread: 1.5, arc: 2.2 },
  ice: { size: 0.22, spread: 1.4, arc: 2.6 },
  lightning: { size: 0.14, spread: 0.6, arc: 1.4 },
  heal: { size: 0.38, spread: 1.1, arc: 2.8 },
  void: { size: 0.2, spread: 1.6, arc: 2 },
};

function makeTexture(type: VfxType): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(32, 32);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  if (type === 'ice') {
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 30);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(0, -6);
    ctx.lineTo(26, 0);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'lightning') {
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -30);
    ctx.lineTo(6, -8);
    ctx.lineTo(-6, 4);
    ctx.lineTo(8, 28);
    ctx.stroke();
  } else if (type === 'void') {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'fire') {
    const grad = ctx.createRadialGradient(0, 6, 2, 0, 0, 30);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, '#ffffffcc');
    grad.addColorStop(1, '#ffffff00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(18, -4, 12, 14);
    ctx.quadraticCurveTo(0, 30, -12, 14);
    ctx.quadraticCurveTo(-18, -4, 0, -30);
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.45, '#ffffffaa');
    grad.addColorStop(1, '#ffffff00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function getTexture(type: VfxType): THREE.Texture {
  return memoByKey(`vfx-texture-${type}`, () => makeTexture(type));
}

interface LayerBuffers {
  positions: Float32Array;
  colors: Float32Array;
}

export function VfxBurst({ effect, offsetY = 0 }: { effect: VfxEffect; offsetY?: number }) {
  const startedRef = useRef<number | null>(null);
  const pointsRefs = useRef<(THREE.Points | null)[]>([]);
  const materialRefs = useRef<(THREE.PointsMaterial | null)[]>([]);
  const texture = useMemo(() => getTexture(effect.type), [effect.type]);
  const style = STYLE[effect.type];

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
        return { positions, colors };
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
      const posAttr = points.geometry.attributes.position as THREE.BufferAttribute | undefined;
      const colAttr = points.geometry.attributes.color as THREE.BufferAttribute | undefined;
      if (!posAttr || !colAttr) continue;
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
        const arc = Math.sin(progress * Math.PI) * style.arc;
        b.positions[i * 3] = effect.from[0] + (effect.to[0] - effect.from[0]) * progress + p.offset[0] * style.spread;
        b.positions[i * 3 + 1] =
          effect.from[1] + offsetY + (effect.to[1] - effect.from[1]) * progress + p.offset[1] * style.spread + arc;
        b.positions[i * 3 + 2] = effect.from[2] + (effect.to[2] - effect.from[2]) * progress + p.offset[2] * style.spread;
        const shade = 0.6 + 0.4 * p.size;
        b.colors[i * 3] = p.color[0] * shade;
        b.colors[i * 3 + 1] = p.color[1] * shade;
        b.colors[i * 3 + 2] = p.color[2] * shade;
        alphaSum += p.alpha;
        sizeSum += p.size;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      mat.opacity = Math.min(1, alphaSum / particles.length);
      mat.size = style.size * (0.75 + 0.25 * (sizeSum / particles.length));
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
