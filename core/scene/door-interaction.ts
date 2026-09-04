import { useCallback } from 'react'
import { SceneItem, DoorMetadata } from '@core/domain/types'
import { SceneGraph } from '@core/scene/scene-graph'

export interface DoorInteraction {
  toggleDoor: (itemId: string) => void
  lockDoor: (itemId: string) => void
  unlockDoor: (itemId: string) => void
  setDoorState: (itemId: string, state: DoorMetadata['state']) => void
}

export function useDoorInteraction(
  graph: SceneGraph,
  onItemsChange?: (items: SceneItem[]) => void,
): DoorInteraction {
  const updateDoor = useCallback((itemId: string, state: DoorMetadata['state']) => {
    const item = graph.getItem(itemId)
    if (!item || item.metadata.type !== 'door') return

    graph.updateItem(itemId, {
      metadata: { ...item.metadata, state },
    })

    onItemsChange?.(graph.getItems())
  }, [graph, onItemsChange])

  const toggleDoor = useCallback((itemId: string) => {
    const item = graph.getItem(itemId)
    if (!item || item.metadata.type !== 'door') return

    const meta = item.metadata as DoorMetadata
    const next: DoorMetadata['state'] = meta.state === 'open' ? 'closed' : 'open'
    updateDoor(itemId, next)
  }, [graph, updateDoor])

  const lockDoor = useCallback((itemId: string) => {
    updateDoor(itemId, 'locked')
  }, [updateDoor])

  const unlockDoor = useCallback((itemId: string) => {
    updateDoor(itemId, 'closed')
  }, [updateDoor])

  return { toggleDoor, lockDoor, unlockDoor, setDoorState: updateDoor }
}
