// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SceneGraph } from '@core/scene/scene-graph'
import { SceneLayer } from '@core/domain/types'
import type { SceneItem } from '@core/domain/types'

const detectWalls = vi.fn()
const getItems = vi.fn()
const saveItems = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    scenes: {
      detectWalls: (...args: unknown[]) => detectWalls(...args),
      getItems: (...args: unknown[]) => getItems(...args),
      saveItems: (...args: unknown[]) => saveItems(...args),
    },
  },
}))

vi.mock('@/lib/i18n', () => ({
  default: { t: (_key: string, fallback?: string) => fallback ?? _key },
}))

import { useWallDetection } from './useWallDetection'

function autoItem(id: string, type: 'wall' | 'door' = 'wall'): SceneItem {
  return {
    id,
    name: id,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    width: 0,
    height: 0,
    zIndex: 0,
    layer: SceneLayer.MAP,
    visible: true,
    locked: false,
    disableHit: false,
    disableAutoZIndex: false,
    attachmentIds: [],
    disableAttachmentBehavior: [],
    shape: { type: 'line', points: [0, 0, 1, 1], stroke: '#fff', strokeWidth: 1 },
    metadata:
      type === 'wall'
        ? {
            type: 'wall',
            wallType: 'solid',
            material: 'stone',
            height: 8,
            thickness: 1,
            opacity: 0.12,
            lineOfSight: true,
            movement: true,
            soundOcclusion: 0.8,
          }
        : { type: 'door', state: 'closed', material: 'wood', autoClose: false },
  }
}

function setup(initial: SceneItem[] = [], items: SceneItem[] = []) {
  const graph = new SceneGraph()
  for (const item of initial) graph.addItem(item)
  const onChange = vi.fn()
  const push = vi.fn()
  const { result } = renderHook(() =>
    useWallDetection({
      campaignId: 'camp-1',
      sceneId: 'scene-1',
      graphRef: graph,
      items,
      handleItemsChange: onChange,
      push,
    }),
  )
  return { result, graph, onChange, push }
}

const WALLS_RETURNED = [autoItem('wall-auto-1'), autoItem('wall-auto-2'), autoItem('door-auto-1', 'door')]

describe('useWallDetection', () => {
  beforeEach(() => {
    detectWalls.mockReset()
    detectWalls.mockResolvedValue({ items: WALLS_RETURNED, wall_count: 2, door_count: 1 })
    getItems.mockReset()
    getItems.mockResolvedValue({ items: [] })
    saveItems.mockReset()
    saveItems.mockResolvedValue({})
  })

  it('agrega los items detectados y deja la propuesta abierta', async () => {
    const { result, graph } = setup()

    await act(async () => {
      await result.current.handleAutoDetect()
    })

    expect(graph.getItems().map((i) => i.id)).toEqual(['wall-auto-1', 'wall-auto-2', 'door-auto-1'])
    expect(result.current.detectProposal).toEqual({
      ids: ['wall-auto-1', 'wall-auto-2', 'door-auto-1'],
      walls: 2,
      doors: 1,
      rooms: [],
    })
  })

  it('regenera el set automático: no apila el anterior', async () => {
    // El grafo arranca con un set viejo YA APROBADO (y un muro a mano).
    const { result, graph } = setup([
      autoItem('wall-auto-viejo-1'),
      autoItem('wall-auto-viejo-2'),
      autoItem('wall-mano-1'),
    ])

    await act(async () => {
      await result.current.handleAutoDetect()
    })

    const ids = graph.getItems().map((i) => i.id)
    expect(ids).not.toContain('wall-auto-viejo-1')
    expect(ids).not.toContain('wall-auto-viejo-2')
    // Y el set nuevo no duplica: 3 items, no 6.
    expect(ids).toHaveLength(4)
    // Lo dibujado a mano sobrevive a la detección.
    expect(ids).toContain('wall-mano-1')
  })

  it('descartar saca los items de la propuesta', async () => {
    const { result, graph } = setup([autoItem('wall-mano-1')])

    await act(async () => {
      await result.current.handleAutoDetect()
    })
    expect(graph.getItems().length).toBe(4)

    act(() => result.current.handleDetectDiscard())

    expect(result.current.detectProposal).toBeNull()
    expect(graph.getItems().map((i) => i.id)).toEqual(['wall-mano-1'])
  })

  it('aprobar deja los items en el grafo y cierra la propuesta', async () => {
    const { result, graph } = setup()

    await act(async () => {
      await result.current.handleAutoDetect()
    })
    act(() => result.current.handleDetectApprove())

    expect(result.current.detectProposal).toBeNull()
    expect(graph.getItems().length).toBe(3)
  })

  it('pruneProposal saca un item de la propuesta y la cierra si era el último', async () => {
    const { result } = setup([autoItem('wall-auto-1')])
    detectWalls.mockResolvedValue({ items: [autoItem('wall-auto-1')], wall_count: 1, door_count: 0 })

    await act(async () => {
      await result.current.handleAutoDetect()
    })
    expect(result.current.detectProposal?.ids).toEqual(['wall-auto-1'])

    act(() => result.current.pruneProposal('wall-auto-1'))
    await waitFor(() => expect(result.current.detectProposal).toBeNull())
  })

  it('sin items detectados no abre propuesta', async () => {
    detectWalls.mockResolvedValue({ items: [], wall_count: 0, door_count: 0 })
    const { result, push } = setup()

    await act(async () => {
      await result.current.handleAutoDetect()
    })

    expect(result.current.detectProposal).toBeNull()
    expect(push).toHaveBeenCalled()
  })

  it('si la detección falla avisa y no rompe el grafo', async () => {
    detectWalls.mockRejectedValue(new Error('boom'))
    const { result, graph, push } = setup([autoItem('wall-mano-1')])

    await act(async () => {
      await result.current.handleAutoDetect()
    })

    expect(result.current.detectProposal).toBeNull()
    expect(graph.getItems().map((i) => i.id)).toEqual(['wall-mano-1'])
    expect(push).toHaveBeenCalled()
  })

  it('avisa cuando se pidió IA pero la detección la hizo computer vision', async () => {
    detectWalls.mockResolvedValue({
      items: WALLS_RETURNED,
      wall_count: 2,
      door_count: 1,
      ai_used: false,
    })
    const { result, push } = setup()

    act(() => result.current.toggleAi())
    await act(async () => {
      await result.current.handleAutoDetect()
    })

    const labels = push.mock.calls.map((c) => String(c[0].label ?? ''))
    expect(labels.some((l) => l.includes('computer vision'))).toBe(true)
  })

  it('no avisa cuando la detección sí la hizo la IA', async () => {
    detectWalls.mockResolvedValue({
      items: WALLS_RETURNED,
      wall_count: 2,
      door_count: 1,
      ai_used: true,
    })
    const { result, push } = setup()

    act(() => result.current.toggleAi())
    await act(async () => {
      await result.current.handleAutoDetect()
    })

    const labels = push.mock.calls.map((c) => String(c[0].label ?? ''))
    expect(labels.some((l) => l.includes('computer vision'))).toBe(false)
  })

  it('los items detectados quedan pendientes de revision', async () => {
    const { result, graph } = setup()

    await act(async () => {
      await result.current.handleAutoDetect()
    })

    // El flag viaja con el item: sin esto, recargar la pagina dejaba los muros
    // aceptados sin que nadie los revisara.
    expect(graph.getItems().every((i) => i.pendingReview)).toBe(true)
  })

  it('aprobar saca el flag de pendiente', async () => {
    const { result, graph } = setup()

    await act(async () => {
      await result.current.handleAutoDetect()
    })
    act(() => result.current.handleDetectApprove())

    expect(graph.getItems().every((i) => !i.pendingReview)).toBe(true)
  })

  it('reabre la propuesta que quedo sin revisar', () => {
    const pendiente = { ...autoItem('wall-auto-pend'), pendingReview: true }
    const puerta = { ...autoItem('door-auto-pend', 'door'), pendingReview: true }
    const { result } = setup([], [pendiente, puerta])

    expect(result.current.detectProposal).toEqual({
      ids: ['wall-auto-pend', 'door-auto-pend'],
      walls: 1,
      doors: 1,
      rooms: [],
    })
  })

  it('no reabre nada si no hay items pendientes', () => {
    const { result } = setup([], [autoItem('wall-auto-1')])
    expect(result.current.detectProposal).toBeNull()
  })

  it('la propuesta muestra las salas que encontró la detección', async () => {
    detectWalls.mockResolvedValue({
      items: WALLS_RETURNED,
      wall_count: 2,
      door_count: 1,
      rooms: [{ id: 'room-1', label: 'Room 1', area: 1200, polygon: [] }],
    })
    const { result } = setup()

    await act(async () => {
      await result.current.handleAutoDetect()
    })

    // Antes las salas se descartaban en silencio: el DM veia muros y no sabia
    // que el detector también habia encontrado rooms.
    expect(result.current.detectProposal?.rooms).toEqual([
      { id: 'room-1', label: 'Room 1', area: 1200 },
    ])
  })

  it('detecta en varias escenas y deja cada propuesta pendiente', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.handleAutoDetectAll([{ id: 'scene-a' }, { id: 'scene-b' }])
    })

    // Cada escena guardo su propuesta con el flag: el DM la revisa al entrar.
    expect(saveItems).toHaveBeenCalledTimes(2)
    for (const call of saveItems.mock.calls) {
      const [, sceneId, items] = call as unknown as [string, string, SceneItem[]]
      expect(['scene-a', 'scene-b']).toContain(sceneId)
      expect(items.every((i) => i.pendingReview)).toBe(true)
    }
  })

  it('el batch regenera el set automatico de cada escena', async () => {
    getItems.mockResolvedValue({
      items: [autoItem('wall-auto-viejo'), { ...autoItem('wall-mano-1') }],
    })
    const { result } = setup()

    await act(async () => {
      await result.current.handleAutoDetectAll([{ id: 'scene-a' }])
    })

    const [, , items] = saveItems.mock.calls[0] as unknown as [string, string, SceneItem[]]
    const ids = items.map((i) => i.id)
    // El set viejo se fue y lo dibujado a mano sigue.
    expect(ids).not.toContain('wall-auto-viejo')
    expect(ids).toContain('wall-mano-1')
  })
})