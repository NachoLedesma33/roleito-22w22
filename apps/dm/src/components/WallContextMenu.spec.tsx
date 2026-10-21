// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import type { SceneItem, WallMetadata } from '@core/domain/types'
import { SceneLayer } from '@core/domain/types'
import WallContextMenu from './WallContextMenu'

afterEach(cleanup)

function muro(overrides: Partial<WallMetadata> = {}): SceneItem {
  return {
    id: 'wall-1',
    name: 'Muro del crypta',
    x: 0, y: 0, rotation: 0, scale: 1,
    width: 0, height: 0,
    layer: SceneLayer.MAP, zIndex: 0,
    visible: true, locked: false,
    disableHit: false, disableAutoZIndex: false,
    attachmentIds: [], disableAttachmentBehavior: [],
    metadata: {
      type: 'wall', wallType: 'solid', material: 'stone',
      height: 8, thickness: 10, opacity: 0.12,
      lineOfSight: true, movement: true, soundOcclusion: 0.8,
      ...overrides,
    },
    shape: { type: 'line', points: [0.2, 0.5, 0.8, 0.5], stroke: '#fff', strokeWidth: 1 },
  }
}

describe('WallContextMenu', () => {
  it('muestra el nombre y los flags del item', () => {
    render(
      <WallContextMenu
        x={10}
        y={20}
        item={muro({ lineOfSight: false, movement: false })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect((screen.getByLabelText('Nombre del muro') as HTMLInputElement).value).toBe('Muro del crypta')
    // Los flags apagados vienen apagados.
    const checks = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checks[0].checked).toBe(false)
    expect(checks[1].checked).toBe(false)
  })

  it('apagar "bloquea el movimiento" devuelve el metadata actualizado', () => {
    const onUpdate = vi.fn()
    render(
      <WallContextMenu
        x={0}
        y={0}
        item={muro()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const checks = screen.getAllByRole('checkbox') as HTMLInputElement[]
    fireEvent.click(checks[1])

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const patch = onUpdate.mock.calls[0][0]
    expect(patch.metadata.movement).toBe(false)
    // El resto del metadata se conserva.
    expect(patch.metadata.material).toBe('stone')
    expect(patch.metadata.lineOfSight).toBe(true)
  })

  it('renombrar devuelve el name nuevo', () => {
    const onUpdate = vi.fn()
    render(
      <WallContextMenu
        x={0}
        y={0}
        item={muro()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nombre del muro'), {
      target: { value: 'Muro norte' },
    })

    expect(onUpdate).toHaveBeenCalledWith({ name: 'Muro norte' })
  })
})
