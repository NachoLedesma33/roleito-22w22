import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { AMBIENT_TRACKS, AmbientMixer, resolveSceneTracks, type AmbientTrack, type AmbientScene } from './ambientAudio'

function track(id: string, scene: AmbientScene, kind: AmbientTrack['kind']): AmbientTrack {
  return { id, src: `/audio/${id}.ogg`, scene, kind, loop: kind !== 'stinger', gain: 0.8 }
}

describe('resolveSceneTracks', () => {
  const tracks: AmbientTrack[] = [
    track('m1', 'medieval', 'music'),
    track('a1', 'medieval', 'ambience'),
    track('s1', 'medieval', 'stinger'),
    track('m2', 'sci-fi', 'music'),
  ]

  it('returns only tracks matching the requested scene', () => {
    expect(resolveSceneTracks('medieval', tracks).map((t) => t.id)).toEqual(['m1', 'a1', 's1'])
    expect(resolveSceneTracks('sci-fi', tracks).map((t) => t.id)).toEqual(['m2'])
  })

  it('preserves each track kind and fields without mutation', () => {
    const result = resolveSceneTracks('medieval', tracks)
    expect(result.map((t) => t.kind)).toEqual(['music', 'ambience', 'stinger'])
    expect(result[0]).toBe(tracks[0])
  })

  it('returns empty array when no track matches', () => {
    expect(resolveSceneTracks('combat', tracks)).toEqual([])
  })

  it('returns empty array for an empty registry', () => {
    expect(resolveSceneTracks('campaign', [])).toEqual([])
  })
})

describe('AMBIENT_TRACKS', () => {
  const scenes: AmbientScene[] = ['medieval', 'sci-fi', 'combat', 'suspense', 'campaign']

  it('every track has a non-empty src and a valid scene', () => {
    for (const t of AMBIENT_TRACKS) {
      expect(t.src.startsWith('/api/static/')).toBe(true)
      expect(scenes).toContain(t.scene)
    }
  })

  it('every track src resolves to an imported file', () => {
    for (const t of AMBIENT_TRACKS) {
      const rel = decodeURIComponent(t.src.replace('/api/static/', ''))
      const abs = path.resolve(process.cwd(), '../../data/assets', rel)
      expect(existsSync(abs), `${t.id} -> ${rel}`).toBe(true)
    }
  })
})

describe('combat and suspense layers', () => {
  it('both scenes expose an ambience layer and a stinger', () => {
    for (const scene of ['combat', 'suspense'] as AmbientScene[]) {
      const rows = resolveSceneTracks(scene, AMBIENT_TRACKS)
      expect(rows.some((t) => t.kind === 'ambience'), `${scene} ambience`).toBe(true)
      expect(rows.some((t) => t.kind === 'stinger'), `${scene} stinger`).toBe(true)
    }
  })

  it('stingers never loop and music always does', () => {
    expect(AMBIENT_TRACKS.filter((t) => t.kind === 'stinger').every((t) => !t.loop)).toBe(true)
    expect(AMBIENT_TRACKS.filter((t) => t.kind === 'music').every((t) => t.loop)).toBe(true)
  })
})

class FakeParam {
  value = 1
  calls: number[] = []
  setTargetAtTime(v: number, _t: number) { this.calls.push(v); this.value = v }
  setValueAtTime(v: number, _t: number) { this.calls.push(v); this.value = v }
}

class FakeNode {
  gain = new FakeParam()
  connections: FakeNode[] = []
  connect(n: FakeNode) { this.connections.push(n); return n }
}

class FakeSource extends FakeNode {
  loop = false
  buffer: unknown = null
  onended: (() => void) | null = null
  start() {}
  stop() {}
}

const createdCtx: FakeCtx[] = []

class FakeCtx {
  constructor() { createdCtx.push(this) }
  currentTime = 0
  state = 'running'
  destination = new FakeNode()
  sources: FakeSource[] = []
  createGain() { return new FakeNode() }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s }
  async decodeAudioData(_b: ArrayBuffer) { return {} as AudioBuffer }
  async resume() {}
  async close() {}
}

describe('AmbientMixer stinger ducking', () => {
  it('lowers looping music while a stinger plays and restores it after', async () => {
    createdCtx.length = 0
    vi.stubGlobal('window', { AudioContext: FakeCtx })
    vi.stubGlobal('fetch', async () => ({ arrayBuffer: async () => new ArrayBuffer(0) }))
    const mixer = new AmbientMixer(AMBIENT_TRACKS)
    try {
      mixer.setScene('medieval')
      await new Promise((r) => setTimeout(r, 0))
      const ctx = createdCtx[0]
      expect(ctx.sources.length).toBeGreaterThanOrEqual(2)
      const musicGain = (ctx.sources[0].connections[0] as FakeNode).gain as FakeParam
      expect(musicGain.calls[musicGain.calls.length - 1]).toBe(0.5)

      mixer.playStinger('medieval-jingle')
      await new Promise((r) => setTimeout(r, 0))
      const ducked = musicGain.calls[musicGain.calls.length - 1]
      expect(ducked).toBeLessThan(0.5)

      const stinger = ctx.sources[ctx.sources.length - 1]
      stinger.onended?.()
      expect(musicGain.calls[musicGain.calls.length - 1]).toBe(0.5)
    } finally {
      mixer.dispose()
      vi.unstubAllGlobals()
    }
  })
})
