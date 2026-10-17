// @vitest-environment jsdom
import { act, fireEvent, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAnchoredMenu } from './useAnchoredMenu'

/** jsdom no calcula layout: el rect hay que fabricarlo. */
function anchorAt(left: number, top: number, width = 100, height = 20) {
  const el = document.createElement('button')
  el.setAttribute('data-anchor', 'build')
  document.body.appendChild(el)
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect
  return el
}

describe('useAnchoredMenu', () => {
  it('alinea con el borde izquierdo del botón por defecto', () => {
    const { result } = renderHook(() =>
      useAnchoredMenu({ open: false, onClose: () => {}, anchorId: 'build' }),
    )
    const el = anchorAt(120, 40)

    let rect: { left: number; top: number }
    act(() => {
      rect = result.current.anchorFrom(el)
    })

    expect(rect!.left).toBe(120)
    expect(rect!.top).toBe(60)
  })

  it('align end alinea el borde DERECHO usando el ancho del menú', () => {
    const { result } = renderHook(() =>
      useAnchoredMenu({
        open: false,
        onClose: () => {},
        anchorId: 'build',
        align: 'end',
        width: 150,
      }),
    )
    const el = anchorAt(100, 40, 100, 20)

    let rect: { left: number; top: number }
    act(() => {
      rect = result.current.anchorFrom(el)
    })

    expect(rect!.left).toBe(200 - 150)
  })

  it('respeta el gap, incluso negativo', () => {
    const { result } = renderHook(() =>
      useAnchoredMenu({ open: false, onClose: () => {}, anchorId: 'build', gap: -2 }),
    )
    const el = anchorAt(100, 40, 100, 20)

    let rect: { left: number; top: number }
    act(() => {
      rect = result.current.anchorFrom(el)
    })

    expect(rect!.top).toBe(58)
  })

  it('nunca se pega al borde del viewport (EDGE = 8)', () => {
    const { result } = renderHook(() =>
      useAnchoredMenu({ open: false, onClose: () => {}, anchorId: 'build' }),
    )
    const el = anchorAt(-30, -30, 10, 10)

    let rect: { left: number; top: number }
    act(() => {
      rect = result.current.anchorFrom(el)
    })

    expect(rect!.left).toBe(8)
  })

  it('click afuera cierra; click en el ancla o en el menú NO', () => {
    const onClose = vi.fn()
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useAnchoredMenu({ open, onClose, anchorId: 'build' }),
      { initialProps: { open: true } },
    )

    const trigger = document.createElement('button')
    trigger.setAttribute('data-anchor', 'build')
    document.body.appendChild(trigger)

    const menu = document.createElement('div')
    menu.setAttribute('data-anchored-menu', 'build')
    document.body.appendChild(menu)

    fireEvent.mouseDown(trigger)
    fireEvent.mouseDown(menu)
    expect(onClose).not.toHaveBeenCalled()

    const outside = document.createElement('button')
    document.body.appendChild(outside)
    fireEvent.mouseDown(outside)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Cerrado: los listeners se desregistraron.
    rerender({ open: false })
    onClose.mockClear()
    fireEvent.mouseDown(outside)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Escape cierra solo con el menú abierto', () => {
    const onClose = vi.fn()
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useAnchoredMenu({ open, onClose, anchorId: 'build' }),
      { initialProps: { open: true } },
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender({ open: false })
    onClose.mockClear()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})