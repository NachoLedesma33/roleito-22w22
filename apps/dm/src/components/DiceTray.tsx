import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { getDie, readResult, getFaceLabels, getVertexLabels, type DieSpec, type DieType } from '@/lib/dice3d'

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

type Phase = 'aim' | 'rolling' | 'settled'

export interface DiceTrayResult {
  diceType: DieType
  count: number
  results: number[]
  total: number
}

function gridPosition(i: number, n: number, height: number): [number, number, number] {
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const gap = 1.05
  const x = ((i % cols) - (cols - 1) / 2) * gap
  const z = (Math.floor(i / cols) - (rows - 1) / 2) * gap
  return [x, height, z]
}

function DieMesh({ spec, position, opacity = 1 }: { spec: DieSpec; position: [number, number, number]; opacity?: number }) {
  const labels = useMemo(() => (spec.type === 4 ? getVertexLabels(spec) : getFaceLabels(spec)), [spec])
  return (
    <group position={position} scale={DIE_SCALE}>
      <mesh geometry={spec.geometry} castShadow>
        <meshStandardMaterial
          color={DIE_COLOR[spec.type]}
          metalness={0.25}
          roughness={0.45}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {labels.map((l, i) => (
        <mesh key={i} position={l.position} quaternion={l.quaternion} scale={spec.type === 4 ? 0.5 : 0.4}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshBasicMaterial color="#111111" transparent opacity={0.92} />
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
}: {
  spec: DieSpec
  position: [number, number, number]
  index: number
  register: (index: number, body: RapierRigidBody | null) => void
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
    return () => register(index, null)
  }, [index, register])

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
          <meshStandardMaterial color={DIE_COLOR[spec.type]} metalness={0.25} roughness={0.45} />
        </mesh>
        {useMemo(() => (spec.type === 4 ? getVertexLabels(spec) : getFaceLabels(spec)), [spec]).map((l, i) => (
          <mesh key={i} position={l.position} quaternion={l.quaternion} scale={spec.type === 4 ? 0.4 : 0.32}>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial color="#111111" transparent opacity={0.95} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  )
}

function RestDetector({
  bodies,
  spec,
  onResults,
}: {
  bodies: { current: (RapierRigidBody | null)[] }
  spec: DieSpec
  onResults: (results: number[]) => void
}) {
  const still = useRef(0)
  const elapsed = useRef(0)
  const done = useRef(false)

  useFrame((_, delta) => {
    if (done.current) return
    elapsed.current += delta
    const list = bodies.current.filter((b): b is RapierRigidBody => b !== null)
    if (!list.length) return

    let maxSpeed = 0
    for (const body of list) {
      const lv = body.linvel()
      const av = body.angvel()
      maxSpeed = Math.max(maxSpeed, Math.hypot(lv.x, lv.y, lv.z), Math.hypot(av.x, av.y, av.z))
    }
    still.current = maxSpeed < 0.12 ? still.current + 1 : 0

    if (still.current > 24 || elapsed.current > 6) {
      done.current = true
      onResults(
        list.map((body) => {
          const r = body.rotation()
          return readResult(spec, new THREE.Quaternion(r.x, r.y, r.z, r.w))
        }),
      )
    }
  })

  return null
}

function TrayWalls() {
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[0, -0.15, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[7, 0.3, 5]} />
          <meshStandardMaterial color="#241c12" roughness={0.95} />
        </mesh>
        <CuboidCollider args={[3.5, 0.15, 2.5]} />
      </RigidBody>
      {(
        [
          { args: [0.3, 1.5, 5], pos: [-3.35, 0.6, 0] },
          { args: [0.3, 1.5, 5], pos: [3.35, 0.6, 0] },
          { args: [7, 1.5, 0.3], pos: [0, 0.6, -2.35] },
          { args: [7, 1.5, 0.3], pos: [0, 0.6, 2.35] },
        ] as { args: [number, number, number]; pos: [number, number, number] }[]
      ).map((wall, i) => (
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
  const [diceType, setDiceType] = useState<DieType>(6)
  const [count, setCount] = useState(1)
  const [phase, setPhase] = useState<Phase>('aim')
  const [throwId, setThrowId] = useState(0)
  const [results, setResults] = useState<number[] | null>(null)
  const bodies = useRef<(RapierRigidBody | null)[]>([])

  const reductionMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const spec = getDie(diceType)
  const indices = Array.from({ length: count }, (_, i) => i)

  const register = useCallback((index: number, body: RapierRigidBody | null) => {
    bodies.current[index] = body
  }, [])

  const finish = (values: number[]) => {
    setResults(values)
    setPhase('settled')
    onRolled({
      diceType,
      count: values.length,
      results: values,
      total: values.reduce((a, b) => a + b, 0),
    })
  }

  const pickType = (type: DieType) => {
    if (phase === 'rolling') return
    setResults(null)
    setPhase('aim')
    if (type !== diceType) {
      setDiceType(type)
      setCount(1)
      return
    }
    setCount((c) => Math.min(MAX_DICE, c + 1))
  }

  const doThrow = () => {
    if (count === 0 || phase === 'rolling') return
    if (reductionMotion) {
      finish(Array.from({ length: count }, () => Math.floor(Math.random() * diceType) + 1))
      return
    }
    bodies.current = []
    setResults(null)
    setPhase('rolling')
    setThrowId((id) => id + 1)
  }

  const clearTray = () => {
    setCount(0)
    setResults(null)
    setPhase('aim')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-phase={phase}>
      <div className="flex h-[540px] max-h-[92vh] w-[760px] max-w-[95vw] overflow-hidden rounded-lg border border-[var(--bg-tertiary)] bg-[var(--bg-primary)] shadow-2xl">
        <aside className="w-24 shrink-0 border-r border-[var(--bg-tertiary)] p-2">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Dados</p>
          <div className="flex flex-col gap-1">
            {TRAY_DICE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => pickType(type)}
                aria-pressed={type === diceType}
                className={`rounded py-2 font-mono text-sm font-bold transition-colors ${
                  type === diceType
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                d{type}
              </button>
            ))}
          </div>
        </aside>

        <div className="relative flex-1">
          <Canvas shadows camera={{ position: [0, 7.5, 7], fov: 45 }} onCreated={({ gl }) => (gl.toneMapping = THREE.ACESFilmicToneMapping)}>
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
                      spec={spec}
                      position={gridPosition(i, count, 3.2)}
                      index={i}
                      register={register}
                    />
                  ))}
                {phase !== 'aim' && <RestDetector key={throwId} bodies={bodies} spec={spec} onResults={finish} />}
              </Physics>
              {phase === 'aim' &&
                indices.map((i) => (
                  <DieMesh key={i} spec={spec} position={gridPosition(i, count, 1.6)} />
                ))}
            </Suspense>
          </Canvas>

          {results && (
            <div
              className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded bg-black/50 px-2 py-1"
              data-results={results.join(',')}
            >
              {results.map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold ${
                    r === diceType ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white'
                  }`}
                >
                  {r}
                </span>
              ))}
              <span className="ml-1 font-mono text-xs text-white/80">
                = {results.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-3">
            <span className="text-[11px] text-[var(--text-secondary)]">
              {count === 0 ? 'Sin dados' : `${count} × d${diceType}`}
              {count >= MAX_DICE ? ' · máximo 15' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCount((c) => Math.max(0, c - 1))}
                disabled={phase === 'rolling' || count === 0}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-40"
              >
                Quitar último
              </button>
              <button
                onClick={clearTray}
                disabled={phase === 'rolling' || count === 0}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-40"
              >
                Vaciar
              </button>
              <button
                onClick={doThrow}
                disabled={phase === 'rolling' || count === 0}
                className="rounded bg-[var(--accent)] px-5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {phase === 'rolling' ? 'Tirando...' : 'Tirar'}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded bg-black/40 px-2 py-1 text-xs text-white/80 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
