import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { getDie, readResult, getFaceLabels, getFaceTexture, getSkinTexture, type DieSpec, type DieType, type SkinPattern } from '@/lib/dice3d'

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

/** Traqueteo de dados (ruido corto x10). */
function playClatter(): void {
  const ctx = getAudio()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  for (let i = 0; i < 10; i++) {
    const t = now + i * 0.05 + Math.random() * 0.02
    const buffer = ctx.createBuffer(1, 256, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / data.length)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    src.connect(gain).connect(ctx.destination)
    src.start(t)
    src.stop(t + 0.05)
  }
}

/** Golpe grave al asentarse los dados. */
function playThud(): void {
  const ctx = getAudio()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(160, now)
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.18)
  gain.gain.setValueAtTime(0.16, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.22)
}

function gridPosition(i: number, n: number, height: number): [number, number, number] {
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const gap = 1.05
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
}: {
  spec: DieSpec
  position: [number, number, number]
  index: number
  register: (index: number, body: RapierRigidBody | null) => void
  unregister: (index: number, body: RapierRigidBody | null) => void
  skin: Skin
  tens?: boolean
}) {
  const ref = useRef<RapierRigidBody>(null)

  useEffect(() => {
    const body = ref.current
    register(index, body)
    if (body) {
      body.setLinvel(
        { x: (Math.random() - 0.5) * 5, y: -1.5 - Math.random() * 3, z: (Math.random() - 0.5) * 5 },
        true,
      )
      body.setAngvel(
        { x: (Math.random() - 0.5) * 24, y: (Math.random() - 0.5) * 24, z: (Math.random() - 0.5) * 24 },
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
      restitution={0.35}
      friction={0.9}
      linearDamping={0.2}
      angularDamping={0.3}
      ccd
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

  useFrame((_, delta) => {
    if (done.current) return
    elapsed.current += delta
    const list = bodies.current
    const present = list.filter((b): b is RapierRigidBody => b !== null)
    if (!present.length) return

    let maxSpeed = 0
    for (const body of present) {
      const lv = body.linvel()
      const av = body.angvel()
      maxSpeed = Math.max(maxSpeed, Math.hypot(lv.x, lv.y, lv.z), Math.hypot(av.x, av.y, av.z))
    }
    still.current = maxSpeed < 0.12 ? still.current + 1 : 0

    const allPresent = present.length === list.length
    if ((allPresent && still.current > 24) || elapsed.current > 7) {
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
  const wallH = 1.4
  const baseY = wallH / 2 - 0.15

  const walls: { args: [number, number, number]; pos: [number, number, number] }[] = [
    { args: [thick, wallH, h], pos: [-(w / 2 - thick / 2), baseY, 0] },
    { args: [thick, wallH, h], pos: [w / 2 - thick / 2, baseY, 0] },
    { args: [w, wallH, thick], pos: [0, baseY, -(h / 2 - thick / 2)] },
    { args: [w, wallH, thick], pos: [0, baseY, h / 2 - thick / 2] },
  ]

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[0, -0.15, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[w, 0.3, h]} />
          <meshStandardMaterial color="#241c12" roughness={0.95} />
        </mesh>
        <CuboidCollider args={[w / 2, 0.15, h / 2]} />
      </RigidBody>
      {walls.map((wall, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={wall.pos}>
          <mesh receiveShadow>
            <boxGeometry args={wall.args} />
            <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
          </mesh>
          <CuboidCollider args={[wall.args[0] / 2, wall.args[1] / 2, wall.args[2] / 2]} />
        </RigidBody>
      ))}
    </>
  )
}

export default function DiceTray({
  onRolled,
  onClose,
}: {
  onRolled: (result: DiceTrayResult) => void
  onClose: () => void
}) {
  const [pool, setPool] = useState<PoolEntry[]>([{ key: 'd0', form: 6 }])
  const [phase, setPhase] = useState<Phase>('aim')
  const [throwId, setThrowId] = useState(0)
  const [results, setResults] = useState<LogicalResult[] | null>(null)
  const [muted, setMuted] = useState(false)
  const [skin, setSkin] = useState<Skin>(SKINS[0])
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const keyRef = useRef(1)

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
    if (!muted && !reductionMotion) playThud()

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
    onRolled({ rolls })
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
    if (!muted) playClatter()
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
      <div className="flex h-[540px] max-h-[92vh] w-[760px] max-w-[95vw] overflow-hidden rounded-lg border border-[var(--bg-tertiary)] bg-[var(--bg-primary)] shadow-2xl">
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
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 6]} intensity={1.4} castShadow />
            <directionalLight position={[-6, 4, -4]} intensity={0.4} />
            <Suspense fallback={null}>
              <Physics gravity={[0, -9.81, 0]}>
                <TrayWalls />
                {phase !== 'aim' &&
                  indices.map((i) => (
                    <DieBody
                      key={`${throwId}-${i}`}
                      spec={specs[i]}
                      position={gridPosition(i, phys.length, 3.2)}
                      index={i}
                      register={register}
                      unregister={unregister}
                      skin={skin}
                      tens={phys[i].tens}
                    />
                  ))}
                {phase !== 'aim' && <RestDetector key={throwId} bodies={bodies} specs={specs} onResults={finish} />}
              </Physics>
              {phase === 'aim' &&
                indices.map((i) => (
                  <DieMesh key={i} spec={specs[i]} position={gridPosition(i, phys.length, 1.6)} skin={skin} tens={phys[i].tens} />
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
  )
}
