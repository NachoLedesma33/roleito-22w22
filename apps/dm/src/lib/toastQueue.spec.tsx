// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MAX_TOASTS, rollToToast, useToastQueue, type ToastRoll } from './toastQueue'

function toast(id: string): ToastRoll {
  return {
    id,
    rollerName: 'DM',
    diceType: 20,
    count: 1,
    results: [1],
    total: 1,
    label: null,
    timestamp: 0,
  }
}

describe('useToastQueue', () => {
  it('encola y saca en orden', () => {
    const { result } = renderHook(() => useToastQueue())

    act(() => result.current.push(toast('a')))
    act(() => result.current.push(toast('b')))
    expect(result.current.toasts.map((t) => t.id)).toEqual(['a', 'b'])

    act(() => result.current.dismiss('a'))
    expect(result.current.toasts.map((t) => t.id)).toEqual(['b'])
  })

  it(`nunca pasa de ${MAX_TOASTS} visibles: saca la más vieja`, () => {
    const { result } = renderHook(() => useToastQueue())

    act(() => {
      for (let i = 0; i < MAX_TOASTS + 3; i++) result.current.push(toast(`t${i}`))
    })

    expect(result.current.toasts).toHaveLength(MAX_TOASTS)
    expect(result.current.toasts[0].id).toBe('t3')
    expect(result.current.toasts[MAX_TOASTS - 1].id).toBe(`t${MAX_TOASTS + 2}`)
  })

  it('pushMany mete varios de una y respeta el tope', () => {
    const { result } = renderHook(() => useToastQueue())

    act(() => result.current.pushMany([toast('a'), toast('b')]))
    expect(result.current.toasts.map((t) => t.id)).toEqual(['a', 'b'])

    act(() => result.current.pushMany([toast('c'), toast('d'), toast('e'), toast('f'), toast('g')]))
    expect(result.current.toasts).toHaveLength(MAX_TOASTS)
    expect(result.current.toasts.map((t) => t.id)).toEqual(['c', 'd', 'e', 'f', 'g'])
  })

  it('dismiss de un id que no está no rompe nada', () => {
    const { result } = renderHook(() => useToastQueue())

    act(() => result.current.push(toast('a')))
    act(() => result.current.dismiss('no-existe'))
    expect(result.current.toasts.map((t) => t.id)).toEqual(['a'])
  })
})

describe('rollToToast', () => {
  it('mapea la respuesta de la API al toast, con fecha en ms', () => {
    const roll = {
      id: 'roll-1',
      campaign_id: 'c',
      roller_name: 'Aria',
      roller_type: 'character',
      dice_type: 6,
      count: 2,
      results: [3, 5],
      total: 8,
      label: 'contra el ogro',
      created_at: '2026-10-17T12:00:00Z',
    }
    const t = rollToToast(roll as never)

    expect(t.id).toBe('roll-1')
    expect(t.rollerName).toBe('Aria')
    expect(t.diceType).toBe(6)
    expect(t.results).toEqual([3, 5])
    expect(t.total).toBe(8)
    expect(t.label).toBe('contra el ogro')
    expect(t.timestamp).toBe(new Date(roll.created_at).getTime())
  })
})