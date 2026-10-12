import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { getDie, readResult, getFaceLabels, getFaceTexture, getSkinTexture, type DieSpec, type DieType, type SkinPattern } from '@/lib/dice3d'
import type { VidaAttr } from '@/lib/api'

const TRAY_DICE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20]
const MAX_DICE = 15
const DIE_SCALE = 0.5

const DIE_COLOR: Record<DieType, string> = {
  4: '#c9a24b',
  6: '#d9c7a3',
  8: '#9fb3c8',
  10: '#b98b5e',
  12: '#a4b494',
  20: '#c26b6b',
}

const LABEL_SIZE: Record<DieType, number> = {
  4: 0.28,
  6: 0.5,
  8: 0.42,
  10: 0.44,
  12: 0.4,
  20: 0.36,
}

interface Skin {
  id: string
  label: string
  color: string | null
  metalness: number
  roughness: number
  ink: string
  pattern: SkinPattern
}

const SKINS: Skin[] = [
  { id: 'clasico', label: 'Clásico', color: null, metalness: 0.25, roughness: 0.45, ink: '#111111', pattern: 'none' },
  { id: 'obsidiana', label: 'Obsidiana', color: '#2b2b33', metalness: 0.6, roughness: 0.2, ink: '#f2f2f2', pattern: 'gem' },
  { id: 'metal', label: 'Metal', color: '#b8bcc4', metalness: 0.9, roughness: 0.25, ink: '#1a1a1a', pattern: 'brushed' },
  { id: 'oro', label: 'Oro', color: '#c9a24b', metalness: 1.0, roughness: 0.25, ink: '#3a2c10', pattern: 'brushed' },
  { id: 'madera', label: 'Madera', color: '#7a5230', metalness: 0.0, roughness: 0.85, ink: '#f4e9d8', pattern: 'wood' },
  { id: 'piedra', label: 'Piedra', color: '#8a8d92', metalness: 0.1, roughness: 0.9, ink: '#1a1a1a', pattern: 'grain' },
  { id: 'marmol', label: 'Mármol', color: '#d9dce0', metalness: 0.2, roughness: 0.4, ink: '#222222', pattern: 'marble' },
  { id: 'cuero', label: 'Cuero', color: '#5a3a22', metalness: 0.0, roughness: 0.9, ink: '#f0e0c8', pattern: 'grain' },
  { id: 'rubi', label: 'Rubí', color: '#8b1e2d', metalness: 0.5, roughness: 0.3, ink: '#ffe6e6', pattern: 'gem' },
  { id: 'jade', label: 'Jade', color: '#2f8f6b', metalness: 0.3, roughness: 0.35, ink: '#ffffff', pattern: 'marble' },
  { id: 'meteorito', label: 'Meteorito', color: '#3b3f45', metalness: 0.7, roughness: 0.55, ink: '#eaeaea', pattern: 'grain' },
]

type Phase = 'aim' | 'rolling' | 'settled'

/** Entidad tiradora (personaje o PNJ) para elegir en la mesa. */
export interface DiceEntity {
  key: string
  name: string
  vigor: VidaAttr
  intelligence: VidaAttr
  dexterity: VidaAttr
  cunning: VidaAttr
}

const STATE_NAME: Record<VidaAttr, string> = {
  '+': 'Más',
  '/': 'Neutro',
  '-': 'Menos',
}

export type RollForm = DieType | 100

export interface DiceTrayResult {
  rolls: { diceType: number; count: number; results: number[]; total: number }[]
}

interface PoolEntry {
  key: string
  form: RollForm
}

interface PhysDie {
  type: DieType
  entryKey: string
  tens: boolean
}

interface LogicalResult {
  form: RollForm
  value: number
  raw?: number[]
}

function expandPool(pool: PoolEntry[]): PhysDie[] {
  const out: PhysDie[] = []
  for (const e of pool) {
    if (e.form === 100) {
      out.push({ type: 10, entryKey: e.key, tens: true })
      out.push({ type: 10, entryKey: e.key, tens: false })
    } else {
      out.push({ type: e.form, entryKey: e.key, tens: false })
    }
  }
  return out
}

function summarize(pool: PoolEntry[]): string {
  const counts = new Map<RollForm, number>()
  for (const e of pool) counts.set(e.form, (counts.get(e.form) ?? 0) + 1)
  return [...counts.entries()].map(([f, n]) => (f === 100 ? `${n}d100` : `${n}d${f}`)).join(' + ')
}

let audioCtx: AudioContext | null = null
function getAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  return audioCtx
}

/** Impacto realista de un dado contra la mesa u otro dado.
 *
 *  Sintetiza un golpe de madera: un transitorio de banda ancha (el "toc" seco
 *  del contacto) más una única formante resonante breve que da el cuerpo de la
 *  madera. NO usa osciladores tonales ni colas largas — eran justamente los que
 *  producían el timbre a tambor/8-bit. El volumen sigue la energía del golpe
 *  (∝ velocidad²) y cada impacto varía leve en centro de frecuencia y nivel,
 *  así ningún golpe suena idéntico. El control de cadencia es POR DADO
 *  (ver DieBody), no global, para no acallar impactos independientes. */
function playImpact(strength: number, muted: boolean): void {
  if (muted) return
  const ctx = getAudio()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime

  // Energía normalizada: golpe apenas perceptible (0) .. fuerte (1).
  const e = Math.min(1, Math.max(0, (strength - 0.8) / 6))
  const vol = 0.05 + e * 0.3

  // Un único buffer de ruido corto con caída rápida (el transitorio).
  const dur = 0.05
  const buffer = ctx.createBuffer(1, Math.max(32, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let j = 0; j < data.length; j++) {
    data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 4)
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer

  const master = ctx.createGain()
  master.gain.value = vol
  master.connect(ctx.destination)

  // Cuerpo de madera: formante resonante grave-media, muy breve (sin tono).
  const body = ctx.createBiquadFilter()
  body.type = 'bandpass'
  body.frequency.value = 230 + Math.random() * 160
  body.Q.value = 3.2
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(1, now)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

  // Click seco del contacto: agudo, brevísimo y discreto.
  const click = ctx.createBiquadFilter()
  click.type = 'bandpass'
  click.frequency.value = 2400 + Math.random() * 1600
  click.Q.value = 0.6
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0.5, now)
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012)

  src.connect(body).connect(bodyGain).connect(master)
  src.connect(click).connect(clickGain).connect(master)
  src.start(now)
  src.stop(now + dur)
}

function gridPosition(i: number, n: number, height: number, gap = 1.55): [number, number, number] {
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const x = ((i % cols) - (cols - 1) / 2) * gap
  const z = (Math.floor(i / cols) - (rows - 1) / 2) * gap
  return [x, height, z]
}

function DieMesh({ spec, position, skin, tens = false, opacity = 1 }: { spec: DieSpec; position: [number, number, number]; skin: Skin; tens?: boolean; opacity?: number }) {
  const labels = useMemo(() => getFaceLabels(spec), [spec])
  return (
    <group position={position} scale={DIE_SCALE}>
      <mesh geometry={spec.geometry} castShadow>
        <meshStandardMaterial
          color={skin.color ?? DIE_COLOR[spec.type]}
          map={getSkinTexture(skin.pattern) ?? undefined}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {labels.map((l, i) => (
        <mesh key={i} position={l.position} quaternion={l.quaternion}>
          <planeGeometry args={[LABEL_SIZE[spec.type], LABEL_SIZE[spec.type]]} />
          <meshBasicMaterial map={getFaceTexture(tens ? (l.value % 10) * 10 : l.value, 128, skin.ink)} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function DieBody({
  spec,
  position,
  index,
  register,
  unregister,
  skin,
  tens = false,
  onImpact,
}: {
  spec: DieSpec
  position: [number, number, number]
  index: number
  register: (index: number, body: RapierRigidBody | null) => void
  unregister: (index: number, body: RapierRigidBody | null) => void
  skin: Skin
  tens?: boolean
  onImpact: (strength: number) => void
}) {
  const ref = useRef<RapierRigidBody>(null)
  // Control de cadencia por dado: evita duplicados del mismo impacto y
  // contactos insignificantes, sin acallar golpes de otros dados.
  const lastHit = useRef(0)

  useEffect(() => {
    const body = ref.current
    register(index, body)
    if (body) {
      // Lanzamiento caótico: cada dado sale en una dirección aleatoria con
      // fuerza y giro fuertes para que rueden y piquen. La caja (paredes altas +
      // techo) garantiza que ninguno se salga, así que podemos ser salvajes.
      const ang = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 5
      body.setLinvel(
        {
          x: Math.cos(ang) * speed,
          y: 1 + Math.random() * 1.6,
          z: Math.sin(ang) * speed,
        },
        true,
      )
      body.setAngvel(
        { x: (Math.random() - 0.5) * 70, y: (Math.random() - 0.5) * 70, z: (Math.random() - 0.5) * 70 },
        true,
      )
    }
    return () => unregister(index, body)
  }, [index, register, unregister])

  return (
    <RigidBody
      ref={ref}
      colliders="hull"
      position={position}
      scale={DIE_SCALE}
      restitution={0.3}
      friction={0.8}
      linearDamping={0.4}
      angularDamping={0.8}
      ccd
      onCollisionEnter={() => {
        const body = ref.current
        if (!body) return
        const v = body.linvel()
        const speed = Math.hypot(v.x, v.y, v.z)
        // Descarta vibraciones/roces demasiado débiles.
        if (speed < 1.2) return
        const t = performance.now()
        // Ventana por dado: corta el duplicado de un mismo impacto.
        if (t - lastHit.current < 55) return
        lastHit.current = t
        onImpact(speed)
      }}
    >
      <group>
        <mesh geometry={spec.geometry} castShadow>
          <meshStandardMaterial
            color={skin.color ?? DIE_COLOR[spec.type]}
            map={getSkinTexture(skin.pattern) ?? undefined}
            metalness={skin.metalness}
            roughness={skin.roughness}
          />
        </mesh>
        {useMemo(() => getFaceLabels(spec), [spec]).map((l, i) => (
          <mesh key={i} position={l.position} quaternion={l.quaternion}>
            <planeGeometry args={[LABEL_SIZE[spec.type], LABEL_SIZE[spec.type]]} />
            <meshBasicMaterial map={getFaceTexture(tens ? (l.value % 10) * 10 : l.value, 128, skin.ink)} transparent depthWrite={false} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  )
}

function RestDetector({
  bodies,
  specs,
  onResults,
}: {
  bodies: { current: (RapierRigidBody | null)[] }
  specs: DieSpec[]
  onResults: (results: number[]) => void
}) {
  const still = useRef(0)
  const elapsed = useRef(0)
  const done = useRef(false)
  const frame = useRef(0)
  const anchor = useRef<{ x: number; y: number; z: number }[]>([])

  useFrame((_, delta) => {
    if (done.current) return
    elapsed.current += delta
    frame.current += 1
    const list = bodies.current
    const present = list.filter((b): b is RapierRigidBody => b !== null)
    if (!present.length) return

    let maxSpin = 0
    const cur: { x: number; y: number; z: number }[] = []
    for (let i = 0; i < list.length; i++) {
      const body = list[i]
      if (!body) {
        cur[i] = anchor.current[i] ?? { x: 0, y: 0, z: 0 }
        continue
      }
      const p = body.translation()
      cur[i] = { x: p.x, y: p.y, z: p.z }
      const av = body.angvel()
      maxSpin = Math.max(maxSpin, Math.hypot(av.x, av.y, av.z))
    }

    // Se evalúa cada ~8 frames comparando la posición contra la última muestra:
    // el desplazamiento NETO en la ventana ignora el jitter de velocidad del
    // solver cuando los dados quedan apilados, y sí detecta a los que ruedan.
    if (frame.current % 8 === 0) {
      let moved = 0
      for (let i = 0; i < cur.length; i++) {
        const a = anchor.current[i]
        if (a) moved += Math.abs(cur[i].x - a.x) + Math.abs(cur[i].y - a.y) + Math.abs(cur[i].z - a.z)
      }
      anchor.current = cur
      const quiet = moved < 0.8 && maxSpin < 3
      still.current = quiet ? still.current + 1 : 0
    }

    const allPresent = present.length === list.length
    if ((allPresent && still.current > 8) || elapsed.current > 5.5) {
      done.current = true
      onResults(
        list.map((body, i) => {
          if (!body) return 0
          const r = body.rotation()
          return readResult(specs[i], new THREE.Quaternion(r.x, r.y, r.z, r.w))
        }),
      )
    }
  })

  return null
}

function TrayWalls() {
  const { viewport } = useThree()
  const w = viewport.width
  const h = viewport.height
  const thick = 0.8
  const wallH = 1.4 // altura visible de la pared (borde de la bandeja)
  const colliderH = 8 // altura real del collider (invisible): sella la caja y evita rebotes fuera
  const baseY = wallH / 2 - 0.15
  const colliderBaseY = colliderH / 2 - 0.15
  const ceilingY = colliderH - 0.15

  const walls: { size: [number, number, number]; x: number; z: number }[] = [
    { size: [thick, wallH, h], x: -(w / 2 - thick / 2), z: 0 },
    { size: [thick, wallH, h], x: w / 2 - thick / 2, z: 0 },
    { size: [w, wallH, thick], x: 0, z: -(h / 2 - thick / 2) },
    { size: [w, wallH, thick], x: 0, z: h / 2 - thick / 2 },
  ]

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[0, -0.15, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[w, 0.3, h]} />
          <meshStandardMaterial color="#241c12" roughness={0.95} />
        </mesh>
        {/* Piso grueso (el collider baja muy por debajo): evita que un dado a
            alta velocidad lo atraviese (tunneling) y caiga fuera de la caja. */}
        <CuboidCollider args={[w / 2, 1.0, h / 2]} position={[0, -0.85, 0]} />
      </RigidBody>
      {walls.map((wall, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[wall.x, 0, wall.z]}>
          <mesh position={[0, baseY, 0]} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
          </mesh>
          <CuboidCollider
            args={[wall.size[0] / 2, colliderH / 2, wall.size[2] / 2]}
            position={[0, colliderBaseY, 0]}
          />
        </RigidBody>
      ))}
      {/* Techo invisible: garantiza que ningún dado se salga por arriba. */}
      <RigidBody type="fixed" colliders={false} position={[0, ceilingY, 0]}>
        <CuboidCollider args={[w / 2, 0.15, h / 2]} />
      </RigidBody>
    </>
  )
}

export default function DiceTray({
  onRolled,
  onClose,
  entities = [],
  fixedEntityKey,
}: {
  onRolled: (result: DiceTrayResult, ctx: { entityKey: string; skill: string }) => void
  onClose: () => void
  entities?: DiceEntity[]
  fixedEntityKey?: string
}) {
  const [pool, setPool] = useState<PoolEntry[]>([{ key: 'd0', form: 6 }])
  const [phase, setPhase] = useState<Phase>('aim')
  const [throwId, setThrowId] = useState(0)
  const [results, setResults] = useState<LogicalResult[] | null>(null)
  const [muted, setMuted] = useState(false)
  const [skin, setSkin] = useState<Skin>(SKINS[0])
  const [entityKey, setEntityKey] = useState(fixedEntityKey ?? '')
  const [skill, setSkill] = useState('')
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const keyRef = useRef(1)

  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const selected = entities.find((e) => e.key === entityKey) ?? null
  const chars = entities.filter((e) => e.key.startsWith('char:'))
  const npcs = entities.filter((e) => e.key.startsWith('npc:'))

  const handleImpact = useCallback((strength: number) => {
    playImpact(strength, mutedRef.current)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reductionMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const phys = useMemo(() => expandPool(pool), [pool])
  const specs = useMemo(() => phys.map((p) => getDie(p.type)), [phys])
  const indices = Array.from({ length: phys.length }, (_, i) => i)

  const register = useCallback((index: number, body: RapierRigidBody | null) => {
    bodies.current[index] = body
  }, [])

  const unregister = useCallback((index: number, body: RapierRigidBody | null) => {
    if (body && bodies.current[index] !== body) return
    bodies.current[index] = null
  }, [])

  const finish = (values: number[]) => {
    let cursor = 0
    const logical: LogicalResult[] = []
    for (const e of pool) {
      if (e.form === 100) {
        const tens = values[cursor++] ?? 1
        const units = values[cursor++] ?? 1
        let v = (tens % 10) * 10 + (units % 10)
        if (v === 0) v = 100
        logical.push({ form: 100, value: v, raw: [tens, units] })
      } else {
        logical.push({ form: e.form, value: values[cursor++] ?? 1 })
      }
    }
    setResults(logical)
    setPhase('settled')

    const groups = new Map<number, number[]>()
    const rolls: DiceTrayResult['rolls'] = []
    for (const r of logical) {
      if (r.form === 100) {
        rolls.push({ diceType: 10, count: 2, results: r.raw ?? [1, 1], total: r.value })
      } else {
        const arr = groups.get(r.form) ?? []
        arr.push(r.value)
        groups.set(r.form, arr)
      }
    }
    for (const [t, res] of groups) {
      rolls.push({ diceType: t, count: res.length, results: res, total: res.reduce((a, b) => a + b, 0) })
    }
    onRolled({ rolls }, { entityKey, skill })
  }

  const addStd = (type: DieType) => {
    if (phase === 'rolling') return
    setResults(null)
    setPhase('aim')
    setPool((p) => (expandPool(p).length + 1 > MAX_DICE ? p : [...p, { key: 'd' + keyRef.current++, form: type }]))
  }

  const addD100 = () => {
    if (phase === 'rolling') return
    setResults(null)
    setPhase('aim')
    setPool((p) => (expandPool(p).length + 2 > MAX_DICE ? p : [...p, { key: 'd' + keyRef.current++, form: 100 }]))
  }

  const removeLast = () => {
    if (phase === 'rolling') return
    setResults(null)
    setPhase('aim')
    setPool((p) => p.slice(0, -1))
  }

  const doThrow = () => {
    if (phys.length === 0 || phase === 'rolling') return
    if (reductionMotion) {
      finish(phys.map((p) => Math.floor(Math.random() * p.type) + 1))
      return
    }
    bodies.current = []
    setResults(null)
    setPhase('rolling')
    setThrowId((id) => id + 1)
  }

  const clearTray = () => {
    if (phase === 'rolling') return
    setResults(null)
    setPhase('aim')
    setPool([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-phase={phase}>
      <div className="flex h-[560px] max-h-[92vh] w-[820px] max-w-[95vw] flex-col overflow-hidden rounded-lg border border-[var(--bg-tertiary)] bg-[var(--bg-primary)] shadow-2xl">
        {!fixedEntityKey && (
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--bg-tertiary)] p-2">
            <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Tirada para</span>
            <select
              aria-label="Tirada para"
              value={entityKey}
              onChange={(e) => setEntityKey(e.target.value)}
              className="rounded border border-[var(--bg-tertiary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)]"
            >
              <option value="">— Sin personaje —</option>
              {chars.length > 0 && (
                <optgroup label="Personajes">
                  {chars.map((c) => (
                    <option key={c.key} value={c.key}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {npcs.length > 0 && (
                <optgroup label="PNJs">
                  {npcs.map((n) => (
                    <option key={n.key} value={n.key}>{n.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <input
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Habilidad (ej: Sigilo) — opcional"
              className="flex-1 rounded border border-[var(--bg-tertiary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />
            {selected && (
              <div className="flex items-center gap-1">
                {([['Vigor', selected.vigor], ['Inteligencia', selected.intelligence], ['Destreza', selected.dexterity], ['Astucia', selected.cunning]] as const).map(([n, v]) => (
                  <span key={n} title={`${n}: ${STATE_NAME[v]}`} className="rounded border border-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    <b className="text-[var(--text-primary)]">{v === '-' ? '−' : v}</b> {n[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex min-h-0 flex-1">
        <aside className="w-24 shrink-0 overflow-y-auto border-r border-[var(--bg-tertiary)] p-2">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Dados</p>
          <div className="flex flex-col gap-1">
            {TRAY_DICE_TYPES.map((type) => {
              const n = pool.filter((e) => e.form === type).length
              return (
                <button
                  key={type}
                  onClick={() => addStd(type)}
                  className={`flex items-center justify-between rounded px-2 py-2 font-mono text-sm font-bold transition-colors ${
                    n > 0
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>d{type}</span>
                  {n > 0 && <span className="text-[10px]">×{n}</span>}
                </button>
              )
            })}
            {(() => {
              const n = pool.filter((e) => e.form === 100).length
              return (
                <button
                  onClick={addD100}
                  className={`flex items-center justify-between rounded px-2 py-2 font-mono text-sm font-bold transition-colors ${
                    n > 0
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>d100</span>
                  {n > 0 && <span className="text-[10px]">×{n}</span>}
                </button>
              )
            })()}
          </div>
          <p className="mb-2 mt-3 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Skin</p>
          <div className="flex flex-col gap-1">
            {SKINS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSkin(s)}
                title={s.label}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                  s.id === skin.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm border border-black/30"
                  style={{ backgroundColor: s.color ?? '#d9c7a3' }}
                />
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="relative flex-1">
          <Canvas shadows camera={{ position: [0, 9, 0.01], fov: 36 }} onCreated={({ gl, camera }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; camera.lookAt(0, 0, 0) }}>
            <color attach="background" args={['#181410']} />
            <ambientLight intensity={0.9} />
            <hemisphereLight args={['#ffffff', '#3a2c1c', 0.8]} />
            <directionalLight position={[5, 10, 6]} intensity={1.5} castShadow />
            <directionalLight position={[-6, 4, -4]} intensity={0.7} />
            <directionalLight position={[0, 7, 9]} intensity={0.5} />
            <Suspense fallback={null}>
              <Physics gravity={[0, -9.81, 0]} timeStep={1 / 120}>
                <TrayWalls />
                {phase !== 'aim' &&
                  indices.map((i) => (
                    <DieBody
                      key={`${throwId}-${i}`}
                      spec={specs[i]}
                      position={gridPosition(i, phys.length, 1.6)}
                      index={i}
                      register={register}
                      unregister={unregister}
                      skin={skin}
                      tens={phys[i].tens}
                      onImpact={handleImpact}
                    />
                  ))}
                {phase !== 'aim' && <RestDetector key={throwId} bodies={bodies} specs={specs} onResults={finish} />}
              </Physics>
              {phase === 'aim' &&
                indices.map((i) => (
                  <DieMesh key={i} spec={specs[i]} position={gridPosition(i, phys.length, 1)} skin={skin} tens={phys[i].tens} />
                ))}
            </Suspense>
          </Canvas>

          {results && (
            <div
              className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded bg-black/50 px-2 py-1"
              data-results={results.map((r) => r.value).join(',')}
            >
              {results.map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold ${
                    r.value === (r.form === 100 ? 100 : r.form)
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {r.value}
                </span>
              ))}
              <span className="ml-1 font-mono text-xs text-white/80">
                = {results.reduce((a, r) => a + r.value, 0)}
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-3">
            <span className="text-[11px] text-[var(--text-secondary)]">
              {phys.length === 0 ? 'Sin dados' : summarize(pool)}
              {phys.length >= MAX_DICE ? ' · máximo 15' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={removeLast}
                disabled={phase === 'rolling' || phys.length === 0}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-40"
              >
                Quitar último
              </button>
              <button
                onClick={clearTray}
                disabled={phase === 'rolling' || phys.length === 0}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-40"
              >
                Vaciar
              </button>
              <button
                onClick={doThrow}
                disabled={phase === 'rolling' || phys.length === 0}
                className="rounded bg-[var(--accent)] px-5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {phase === 'rolling' ? 'Tirando...' : 'Tirar'}
              </button>
            </div>
          </div>

          <div className="absolute right-3 top-3 flex gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              title={muted ? 'Activar sonido' : 'Silenciar'}
              className="rounded bg-black/40 px-2 py-1 text-xs text-white/80 hover:text-white"
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={onClose}
              className="rounded bg-black/40 px-2 py-1 text-xs text-white/80 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
