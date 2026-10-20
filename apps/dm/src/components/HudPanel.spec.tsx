// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import HudPanel, { useMinimizedPanels } from './HudPanel'

// Sin globals en vitest no corre el auto-cleanup de RTL: los tests comparten
// document.
afterEach(cleanup)

// jsdom no implementa pointer capture: el panel lo usa para arrastrar sin
// soltar el puntero fuera de la barra.
beforeEach(() => {
  localStorage.clear()
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})

/** Barra de arrastre: el header es el primer hijo del panel. */
function barra(panelId: string) {
  return screen.getByTestId(`hud-${panelId}`).firstElementChild as HTMLElement
}

/** Los 8 handles de resize: después del header y del contenido, en el orden del array `edges`. */
function handle(panelId: string, edge: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') {
  const panel = screen.getByTestId(`hud-${panelId}`)
  const handles = Array.from(panel.children).slice(2)
  return handles[['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].indexOf(edge)] as HTMLElement
}

function geom(panelId: string) {
  const el = screen.getByTestId(`hud-${panelId}`)
  return {
    left: (el as HTMLElement).style.left,
    top: (el as HTMLElement).style.top,
    width: (el as HTMLElement).style.width,
  }
}

describe('HudPanel', () => {
  it('arranca con la geometría default', () => {
    render(
      <HudPanel title="Ini" panelId="ini" onClose={() => {}} defaultX={100} defaultY={100}>
        cuerpo
      </HudPanel>,
    )
    expect(geom('ini')).toEqual({ left: '100px', top: '100px', width: '300px' })
  })

  it('el drag sigue al puntero y al soltar snappea a múltiplos de 20', () => {
    render(
      <HudPanel title="Drag" panelId="drag" onClose={() => {}} defaultX={100} defaultY={100}>
        cuerpo
      </HudPanel>,
    )

    // pointerdown en (150,140) con el panel en (100,100): offset (50,40).
    fireEvent.pointerDown(barra('drag'), { clientX: 150, clientY: 140, pointerId: 1 })
    fireEvent.pointerMove(barra('drag'), { clientX: 177, clientY: 155, pointerId: 1 })
    // Todavía sin snap: sigue al puntero menos el offset.
    expect(geom('drag')).toMatchObject({ left: '127px', top: '115px' })

    fireEvent.pointerUp(barra('drag'), { pointerId: 1 })
    // snap(127)=120, snap(115)=120.
    expect(geom('drag')).toEqual({ left: '120px', top: '120px', width: '300px' })
  })

  it('el resize por el borde este crece y respeta maxWidth', () => {
    render(
      <HudPanel title="Rz" panelId="rz" onClose={() => {}} defaultWidth={300} maxWidth={600}>
        cuerpo
      </HudPanel>,
    )

    fireEvent.pointerDown(handle('rz', 'e'), { clientX: 300, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(handle('rz', 'e'), { clientX: 950, clientY: 0, pointerId: 1 })
    // 300 + 650 = 950, pero el tope es 600.
    expect(geom('rz').width).toBe('600px')
  })

  it('el resize por el borde oeste mueve la x y respeta minWidth', () => {
    render(
      <HudPanel title="W" panelId="w" onClose={() => {}} defaultX={100} defaultWidth={300}>
        cuerpo
      </HudPanel>,
    )

    fireEvent.pointerDown(handle('w', 'w'), { clientX: 200, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(handle('w', 'w'), { clientX: 150, clientY: 0, pointerId: 1 })
    // 300 - (-50) = 350 de ancho y la x compensa: 100 + (300 - 350) = 50.
    expect(geom('w')).toMatchObject({ left: '50px', width: '350px' })

    fireEvent.pointerMove(handle('w', 'w'), { clientX: 1000, clientY: 0, pointerId: 1 })
    // dx=800 dejaría 300-800: el ancho no baja de minWidth (200 default).
    expect(geom('w').width).toBe('200px')
  })

  it('persiste posición y tamaño en localStorage y los restaura al montar', () => {
    render(
      <HudPanel title="P" panelId="persist" onClose={() => {}} defaultX={100} defaultY={100}>
        cuerpo
      </HudPanel>,
    )
    fireEvent.pointerDown(barra('persist'), { clientX: 150, clientY: 140, pointerId: 1 })
    fireEvent.pointerMove(barra('persist'), { clientX: 177, clientY: 155, pointerId: 1 })
    fireEvent.pointerUp(barra('persist'), { pointerId: 1 })

    expect(localStorage.getItem('roleito:hud:v2:persist:pos')).toBe(
      JSON.stringify({ x: 120, y: 120 }),
    )
    expect(localStorage.getItem('roleito:hud:v2:persist:size')).toBe(
      JSON.stringify({ width: 300, height: 300 }),
    )

    // Un panel del mismo id arranca donde quedó, no en el default. Dos paneles
    // comparten el testid: el segundo es el que restaura.
    render(
      <HudPanel title="P2" panelId="persist" onClose={() => {}}>
        cuerpo
      </HudPanel>,
    )
    const restaurado = screen.getAllByTestId('hud-persist')[1] as HTMLElement
    expect(restaurado.style.left).toBe('120px')
    expect(restaurado.style.top).toBe('120px')
  })

  it('minimizar saca el panel, lo registra y restaurar lo vuelve a mostrar', () => {
    const { result } = renderHook(() => useMinimizedPanels())
    render(
      <HudPanel title="Mini" panelId="mini" onClose={() => {}}>
        cuerpo
      </HudPanel>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Minimizar' }))
    expect(screen.queryByTestId('hud-mini')).toBeNull()
    expect(result.current.map((e) => e.panelId)).toContain('mini')

    act(() => {
      result.current.find((e) => e.panelId === 'mini')!.onRestore()
    })
    expect(screen.getByTestId('hud-mini')).toBeTruthy()
  })

  it('maximizar ocupa casi toda la pantalla y restaurar devuelve la geometría previa', () => {
    render(
      <HudPanel title="Mx" panelId="mx" onClose={() => {}} defaultX={100} defaultY={100}>
        cuerpo
      </HudPanel>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Maximizar' }))
    expect(geom('mx')).toMatchObject({ left: '4vw', top: '4vh', width: '92vw' })

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
    expect(geom('mx')).toEqual({ left: '100px', top: '100px', width: '300px' })
  })

  it('hideClose oculta la × pero deja minimizar', () => {
    render(
      <HudPanel title="H" panelId="h" onClose={() => {}} hideClose>
        cuerpo
      </HudPanel>,
    )
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Minimizar' })).toBeTruthy()
  })
})
