import { SceneItem, SceneLayer } from '../domain/types'

export class SceneGraph {
  private items: Map<string, SceneItem> = new Map()

  getItem(id: string): SceneItem | undefined {
    return this.items.get(id)
  }

  getItems(): SceneItem[] {
    return Array.from(this.items.values())
  }

  getItemsByLayer(layer: SceneLayer): SceneItem[] {
    return this.getItems()
      .filter((i) => i.layer === layer)
      .sort((a, b) => a.zIndex - b.zIndex)
  }

  getVisibleItems(): SceneItem[] {
    return this.getItems().filter((i) => i.visible)
  }

  addItem(item: SceneItem): void {
    this.items.set(item.id, item)
  }

  updateItem(id: string, patch: Partial<SceneItem>): void {
    const item = this.items.get(id)
    if (!item) return
    this.items.set(id, { ...item, ...patch })
  }

  removeItem(id: string): void {
    this.items.delete(id)
  }

  attachItem(parentId: string, childId: string): void {
    const parent = this.items.get(parentId)
    const child = this.items.get(childId)
    if (!parent || !child) return
    if (!parent.attachmentIds.includes(childId)) {
      parent.attachmentIds.push(childId)
    }
  }

  detachItem(parentId: string, childId: string): void {
    const parent = this.items.get(parentId)
    if (!parent) return
    parent.attachmentIds = parent.attachmentIds.filter((id) => id !== childId)
  }

  reorderItem(id: string, layer: SceneLayer, zIndex: number): void {
    const item = this.items.get(id)
    if (!item) return
    item.layer = layer
    item.zIndex = zIndex
  }

  lockItem(id: string): void {
    const item = this.items.get(id)
    if (item) item.locked = true
  }

  unlockItem(id: string): void {
    const item = this.items.get(id)
    if (item) item.locked = false
  }

  hideItem(id: string): void {
    const item = this.items.get(id)
    if (item) item.visible = false
  }

  showItem(id: string): void {
    const item = this.items.get(id)
    if (item) item.visible = true
  }

  resolveRenderOrder(): SceneItem[] {
    return this.getVisibleItems().sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer
      return a.zIndex - b.zIndex
    })
  }

  toJSON(): SceneItem[] {
    return this.getItems()
  }

  static fromJSON(items: SceneItem[]): SceneGraph {
    const graph = new SceneGraph()
    for (const item of items) {
      graph.addItem(item)
    }
    return graph
  }

  static createItem(overrides: Partial<SceneItem> & { id: string; name: string }): SceneItem {
    return {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      width: 1,
      height: 1,
      layer: SceneLayer.TOKENS,
      zIndex: 0,
      visible: true,
      locked: false,
      disableHit: false,
      disableAutoZIndex: false,
      attachmentIds: [],
      disableAttachmentBehavior: [],
      metadata: { type: 'token', characterId: '', ownerId: '' },
      ...overrides,
    }
  }
}
