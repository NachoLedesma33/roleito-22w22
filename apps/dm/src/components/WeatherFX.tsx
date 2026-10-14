import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getEffectiveVolume, useAudioSettings } from '@/lib/audioSettings';

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
  // La tormenta sube cantidad, velocidad y tamaño del punto juntos: con la
  // cámara casi cenital, una lluvia intense de gotas chicas se lee como una
  // llovizna aunque haya el doble de partículas.
  rainStorm: { label: '⛈ Tormenta', tint: 'rgba(38, 56, 86, 0.28)', kind: 'rain', speed: 1.8, density: 2.4, grain: 1.3 },
  snow: { label: '❄ Nieve', tint: 'rgba(198, 210, 232, 0.14)', kind: 'snow', speed: 1, density: 1, grain: 1 },
  snowFlurry: { label: '❅ Nieve fina', tint: 'rgba(210, 220, 238, 0.10)', kind: 'snow', speed: 0.7, density: 0.5, grain: 0.8 },
  snowBlizzard: { label: '🌨 Ventisca', tint: 'rgba(226, 234, 248, 0.26)', kind: 'snow', speed: 2.2, density: 2.4, grain: 0.85 },
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
  /** false = el POV silenció el ambiente (el 🔇 del jugador): clima mudo, partículas siguen. */
  weatherAudioEnabled?: boolean;
}

const TOP_Y = 6.5;
const N_RAIN = 400;
const N_SNOW = 520;
// La densidad más alta de cualquier variante. El buffer tiene que aguantar
// TAMBIEN el multiplicador de la variante, no solo el de la intensidad: con el
// tope en `N * INTENSITY_MAX` la ventisca a intensidad 4 daba 320*4*1.5 = 1920
// contra un tope de 1280, y el Math.min se comía el 33% de la diferencia. Por
// eso el tope lleva el factor de densidad adentro.
const MAX_VARIANT_DENSITY = 2.4;
// Los buffers se alocan para el peor caso posible (intensidad máxima × variante
// más densa): setDrawRange solo puede recortar, nunca agregar vértices que no
// existen (si no, subir la intensidad no agrega gotas).
const N_RAIN_MAX = Math.round(N_RAIN * WEATHER_INTENSITY_MAX * MAX_VARIANT_DENSITY);
const N_SNOW_MAX = Math.round(N_SNOW * WEATHER_INTENSITY_MAX * MAX_VARIANT_DENSITY);

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

// ---------------------------------------------------------------------------
// Audio del clima (procedural, sin archivos): lluvia, viento y truenos.
// Mismo criterio que el sonido de los dados: solo ruido filtrado (sin
// osciladores tonales ni bucles reconocibles), así no suena a 8 bits ni a
// "sample". El volumen sigue la intensidad del clima. Es una capa aparte del
// audio de escena (`audio_path`), que es un archivo subido y suena en loop.
// ---------------------------------------------------------------------------

let weatherAudioCtx: AudioContext | null = null;
function getWeatherAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!weatherAudioCtx) weatherAudioCtx = new Ctor();
  return weatherAudioCtx;
}

const AUDIO_STILL = 0.0001;

/**
 * Ruido blanco (agudo) o rosa (grave) con empalme continuo para poder loopear
 * sin click. El rosa sale del filtro de Voss-McCartney (tres polos + blanco).
 */
function makeNoiseBuffer(ctx: AudioContext, color: 'white' | 'pink'): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * 4);
  const fade = Math.floor(sr * 0.08);
  const buffer = ctx.createBuffer(1, n, sr);
  const out = buffer.getChannelData(0);
  const gen = new Float32Array(n + fade);
  if (color === 'white') {
    for (let i = 0; i < gen.length; i++) gen[i] = Math.random() * 2 - 1;
  } else {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < gen.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      gen[i] = (b0 + b1 + b2 + w * 0.1848) * 0.45;
    }
  }
  // Crossfade de la cola sobre la cabeza: el loop cierra sin discontinuidad.
  for (let i = 0; i < n; i++) {
    if (i < fade) {
      const t = i / fade;
      out[i] = gen[n + i] * (1 - t) + gen[i] * t;
    } else {
      out[i] = gen[i];
    }
  }
  return buffer;
}

/** Mezcla base por variante: cuánta "lluvia/nieve" aguda y cuánto viento. */
const WEATHER_AUDIO: Record<string, { hiss: number; wind: number }> = {
  rain: { hiss: 1, wind: 0.12 },
  rainDrizzle: { hiss: 0.5, wind: 0.06 },
  rainStorm: { hiss: 1.7, wind: 0.85 },
  snow: { hiss: 0.4, wind: 0.35 },
  snowFlurry: { hiss: 0.25, wind: 0.2 },
  snowBlizzard: { hiss: 0.8, wind: 1.4 },
  fog: { hiss: 0.14, wind: 0.16 },
  fogDense: { hiss: 0.2, wind: 0.28 },
};

interface WeatherVoice {
  /** Ajusta niveles para una intensidad ya normalizada (0.25..4). */
  setLevel: (k: number) => void;
  dispose: () => void;
}

function buildWeatherVoice(ctx: AudioContext, weather: string): WeatherVoice {
  const layer = WEATHER_AUDIO[weather] ?? { hiss: 0.4, wind: 0.15 };
  const thunderOn = weather === 'rainStorm';
  let thunderLevel = 0.45;
  let disposed = false;
  let thunderTimer = 0;

  const master = ctx.createGain();
  master.gain.setValueAtTime(AUDIO_STILL, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(Math.max(AUDIO_STILL, getEffectiveVolume('weather')), ctx.currentTime + 1);
  master.connect(ctx.destination);

  const stops: Array<() => void> = [];
  const track = (node: AudioBufferSourceNode | OscillatorNode) => {
    stops.push(() => {
      try {
        node.stop();
      } catch {
        /* ya detenido */
      }
    });
  };

  // Lluvia/nieve: ruido blanco pasado por un pasa-altos, el "shhh" de las gotas.
  const hissSrc = ctx.createBufferSource();
  hissSrc.buffer = makeNoiseBuffer(ctx, 'white');
  hissSrc.loop = true;
  const hissHp = ctx.createBiquadFilter();
  hissHp.type = 'highpass';
  hissHp.frequency.value = 700;
  hissHp.Q.value = 0.5;
  const hissLp = ctx.createBiquadFilter();
  hissLp.type = 'lowpass';
  hissLp.frequency.value = 8000;
  hissLp.Q.value = 0.4;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0;
  hissSrc.connect(hissHp).connect(hissLp).connect(hissGain).connect(master);
  hissSrc.start();
  track(hissSrc);

  // Viento: ruido rosa grave; un LFO lento le da el "resuello" (ráfagas).
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = makeNoiseBuffer(ctx, 'pink');
  windSrc.loop = true;
  const windLp = ctx.createBiquadFilter();
  windLp.type = 'lowpass';
  windLp.frequency.value = 480;
  windLp.Q.value = 0.7;
  const windGain = ctx.createGain();
  windGain.gain.value = 0;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.07;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth).connect(windGain.gain);
  lfo.start();
  track(lfo);
  windSrc.connect(windLp).connect(windGain).connect(master);
  windSrc.start();
  track(windSrc);

  // Trueno: ruido grave con caída larga (retumbo) y, a veces, un chasquido.
  const playThunder = () => {
    const now = ctx.currentTime;
    const level = Math.max(0.15, thunderLevel);
    const dur = 2.6 + Math.random() * 1.4;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(220 + Math.random() * 80, now);
    lp.frequency.exponentialRampToValueAtTime(60, now + dur);
    const g = ctx.createGain();
    const peak = 0.5 * level * (0.7 + Math.random() * 0.6);
    g.gain.setValueAtTime(AUDIO_STILL, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.05);
    g.gain.exponentialRampToValueAtTime(AUDIO_STILL, now + dur);
    src.connect(lp).connect(g).connect(master);
    src.start(now);
    src.stop(now + dur);
    if (Math.random() < 0.55) {
      const cdur = 0.35;
      const cbuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * cdur), ctx.sampleRate);
      const cd = cbuf.getChannelData(0);
      for (let i = 0; i < cd.length; i++) {
        cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cd.length, 3);
      }
      const csrc = ctx.createBufferSource();
      csrc.buffer = cbuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + Math.random() * 1200;
      bp.Q.value = 0.6;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.28 * level, now);
      cg.gain.exponentialRampToValueAtTime(AUDIO_STILL, now + cdur);
      csrc.connect(bp).connect(cg).connect(master);
      csrc.start(now);
      csrc.stop(now + cdur);
    }
  };

  const scheduleThunder = () => {
    if (disposed || !thunderOn) return;
    // Más seguido (y más fuerte) cuanto más intensa la tormenta.
    const base = 11 - 7 * thunderLevel;
    const delay = base * (0.6 + Math.random() * 0.9) * 1000;
    thunderTimer = window.setTimeout(() => {
      playThunder();
      scheduleThunder();
    }, delay);
  };
  scheduleThunder();

  const setLevel = (k: number) => {
    const now = ctx.currentTime;
    // El master aplica el master global × el canal clima (ver audioSettings).
    master.gain.setTargetAtTime(Math.max(AUDIO_STILL, getEffectiveVolume('weather')), now, 0.15);
    hissGain.gain.setTargetAtTime(layer.hiss * 0.05 * k, now, 0.3);
    const wind = layer.wind * 0.06 * k;
    windGain.gain.setTargetAtTime(wind, now, 0.4);
    lfoDepth.gain.setTargetAtTime(wind * 0.6, now, 0.4);
    thunderLevel = Math.min(1, 0.25 + 0.2 * k);
  };

  const dispose = () => {
    disposed = true;
    window.clearTimeout(thunderTimer);
    const now = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(AUDIO_STILL, master.gain.value), now);
      master.gain.exponentialRampToValueAtTime(AUDIO_STILL, now + 0.3);
    } catch {
      /* contexto cerrado */
    }
    window.setTimeout(() => {
      for (const stop of stops) stop();
      try {
        master.disconnect();
      } catch {
        /* ya desconectado */
      }
    }, 380);
  };

  return { setLevel, dispose };
}

/**
 * Componente sin DOM: monta/actualiza el audio del clima. Reconstruye la voz
 * solo cuando cambia el tipo de clima; la intensidad se aplica por rampa para
 * no reiniciar el audio en cada tick.
 */
function WeatherAudio({ weather, intensity, enabled }: { weather: string; intensity: number; enabled: boolean }) {
  const voiceRef = useRef<WeatherVoice | null>(null);
  // Re-lee el volumen cuando cambia (el master global o el canal clima).
  const settings = useAudioSettings();
  useEffect(() => {
    const ctx = getWeatherAudio();
    if (!ctx) return;
    let voice: WeatherVoice | null = null;
    try {
      voice = buildWeatherVoice(ctx, weather);
      voiceRef.current = voice;
    } catch {
      // El audio nunca debe romper la escena: si WebAudio falla, siguen las
      // partículas y el overlay.
      voice = null;
    }
    let resume = () => {};
    if (ctx.state === 'suspended') {
      void ctx.resume();
      // El navegador exige un gesto para desbloquear el audio.
      resume = () => {
        if (ctx.state === 'suspended') void ctx.resume();
      };
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    }
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      try {
        voice?.dispose();
      } catch {
        /* contexto ya cerrado */
      }
      if (voiceRef.current === voice) voiceRef.current = null;
    };
  }, [weather]);
  useEffect(() => {
    try {
      voiceRef.current?.setLevel(enabled ? clampWeatherIntensity(intensity) : 0);
    } catch {
      /* contexto ya cerrado */
    }
  }, [intensity, settings.master, settings.weather, enabled]);
  return null;
}

export default function WeatherFX({
  weather,
  mapWidth,
  mapHeight,
  intensity = 1,
  weatherAudioEnabled = true,
}: WeatherFXProps) {
  const k = clampWeatherIntensity(intensity);
  // Se resuelve por id, no por switch: las variantes comparten componente y se
  // diferencian solo en los tres multiplicadores. Un id desconocido cae en null
  // y no dibuja, que es lo que ya pasaba con cualquier clima no implementado.
  const meta = weather ? WEATHER_META[weather] : undefined;
  if (!meta) return null;
  const { kind, speed, density, grain } = meta;
  const shared = { mapWidth, mapHeight, intensity: k, speed, density, grain };
  const audio = <WeatherAudio weather={weather as string} intensity={k} enabled={weatherAudioEnabled} />;
  if (kind === 'rain') return <>{audio}<Rain {...shared} /></>;
  if (kind === 'snow') return <>{audio}<Snow {...shared} /></>;
  return <>{audio}<FogDrift {...shared} /></>;
}