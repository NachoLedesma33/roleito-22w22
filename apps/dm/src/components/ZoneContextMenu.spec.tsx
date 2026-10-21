// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SceneItem, ZoneMetadata } from '@core/domain/types'
import { SceneLayer } from '@core/domain/types'
import ZoneContextMenu from './ZoneContextMenu'

afterEach(cleanup)

function zona(overrides: Partial<ZoneMetadata> = {}): SceneItem {
  return {
    id: 'zone-1',
    name: 'Sala del dragon',
    x: 0, y: 0, rotation: 0, scale: 1,
    width: 0, height: 0,
    layer: SceneLayer.OVERLAY, zIndex: 0,
    visible: true, locked: false,
    disableHit: false, disableAutoZIndex: false,
    attachmentIds: [], disableAttachmentBehavior: [],
    metadata: {
      type: 'zone', zoneType: 'polygon', origin: 'ai', touchedByDm: false,
      shadowOnly: false, fillColor: '#334155', fillOpacity: 0.35, portals: [],
      ...overrides,
    },
    shape: { type: 'polygon', points: [0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6], fill: '#334155' },
  }
}

function renderMenu(item: SceneItem, onUpdate = vi.fn()) {
  render(
    <ZoneContextMenu
      x={0}
      y={0}
      item={item}
      portals={[]}
      onUpdate={onUpdate}
      onTogglePortal={vi.fn()}
      onDeletePortal={vi.fn()}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  return onUpdate
}

describe('ZoneContextMenu', () => {
  it('la zona tiene los flags del borde (tapa la vista / bloquea el movimiento)', () => {
    // La zona ES la pared: los flags son los del muro. Antes la zona solo
    // tenia "solo sombra" (todo el perimeter).
    renderMenu(zona())
    const checks = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checks).toHaveLength(3)
    // Sin flags = muro solido: los dos estan prendidos.
    expect(checks[1].checked).toBe(true)
    expect(checks[2].checked).toBe(true)
  })

  it('los flags apagados vienen apagados', () => {
    renderMenu(zona({ lineOfSight: false, movement: false }))
    const checks = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checks[1].checked).toBe(false)
    expect(checks[2].checked).toBe(false)
  })

  it('apagar "bloquea el movimiento" devuelve el metadata actualizado', () => {
    const onUpdate = renderMenu(zona())
    const checks = screen.getAllByRole('checkbox') as HTMLInputElement[]
    fireEvent.click(checks[2])

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const patch = onUpdate.mock.calls[0][0]
    expect(patch.metadata.movement).toBe(false)
    // El resto del metadata se conserva.
    expect(patch.metadata.origin).toBe('ai')
    expect(patch.metadata.lineOfSight).toBeUndefined()
  })

  it('apagar "tapa la vista" devuelve el metadata actualizado', () => {
    const onUpdate = renderMenu(zona())
    const checks = screen.getAllByRole('checkbox') as HTMLInputElement[]
    fireEvent.click(checks[1])

    const patch = onUpdate.mock.calls[0][0]
    expect(patch.metadata.lineOfSight).toBe(false)
    expect(patch.metadata.movement).toBeUndefined()
  })

  it('editar una zona de la IA la marca como tocada por el DM', () => {
    // El flag `touchedByDm` es lo que hace que su edicion mande sobre la
    // deteccion: la re-deteccion no le pisa encima.
    const onUpdate = renderMenu(zona({ origin: 'ai', touchedByDm: false }))
    fireEvent.change(screen.getByLabelText('Opacidad: 35%'), {
      target: { value: '0.6' },
    })

    const patch = onUpdate.mock.calls[0][0]
    expect(patch.metadata.fillOpacity).toBe(0.6)
    expect(patch.metadata.touchedByDm).toBe(true)
  })

  it('el menu deja editar el nombre y el relleno', () => {
    const onUpdate = renderMenu(zona())
    fireEvent.change(screen.getByLabelText('Nombre de la zona'), {
      target: { value: 'Galeria del Wyrm' },
    })
    expect(onUpdate).toHaveBeenCalledWith({ name: 'Galeria del Wyrm' })
    expect(screen.getByLabelText('Color de relleno')).toBeTruthy()
  })
})
