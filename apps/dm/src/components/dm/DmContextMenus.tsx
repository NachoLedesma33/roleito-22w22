import { useTranslation } from 'react-i18next';
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu';
import DoorContextMenu from '@/components/DoorContextMenu';
import WallContextMenu from '@/components/WallContextMenu';
import ZoneContextMenu from '@/components/ZoneContextMenu';
import type { PortalRef, SceneItem } from '@core/domain/types';

/** Posición en viewport de un menú contextual, más el item al que pertenece. */
export interface ItemMenuState {
  x: number;
  y: number;
  itemId: string;
}

export interface DoorMenuState extends ItemMenuState {
  /** `DoorMetadata['state']`, que el backend serializa como string suelto. */
  state: string;
}

export interface DmContextMenusProps {
  /** Menú genérico de token (acciones de escena, estados de combate, etc.). */
  contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
  onCloseContextMenu: () => void;
  doorMenu: DoorMenuState | null;
  onCloseDoorMenu: () => void;
  wallMenu: ItemMenuState | null;
  onCloseWallMenu: () => void;
  zoneMenu: ItemMenuState | null;
  onCloseZoneMenu: () => void;
  lightMenu: ItemMenuState | null;
  onCloseLightMenu: () => void;
  fogMenu: ItemMenuState | null;
  onCloseFogMenu: () => void;
  /**
   * Portales de la zona, resueltos por el dueño del grafo de escena. Se pasa
   * la función y no el ref: este componente no debe saber de `graphRef`.
   */
  getZonePortals: (itemId: string) => PortalRef[];
  /** El item del grafo, para los menus que lo editan (el del muro). */
  getItem: (itemId: string) => SceneItem | undefined;
  onDeleteItem: (itemId: string) => void;
  /** Edita un item del grafo (el Modo Hibrido: el DM afina lo que propuso la IA). */
  onUpdateItem: (itemId: string, patch: Partial<SceneItem>) => void;
  onToggleDoor: (itemId: string) => void;
  onLockDoor: (itemId: string) => void;
  onUnlockDoor: (itemId: string) => void;
  onTogglePortal: (portalId: string) => void;
  onDeletePortal: (portalId: string) => void;
}

/**
 * Los seis menús contextuales del canvas de DM. Solo presentación: recibe el
 * estado de cada menú y las acciones ya ligadas a `itemId`.
 */
export default function DmContextMenus({
  contextMenu,
  onCloseContextMenu,
  doorMenu,
  onCloseDoorMenu,
  wallMenu,
  onCloseWallMenu,
  zoneMenu,
  onCloseZoneMenu,
  lightMenu,
  onCloseLightMenu,
  fogMenu,
  onCloseFogMenu,
  getZonePortals,
  getItem,
  onDeleteItem,
  onUpdateItem,
  onToggleDoor,
  onLockDoor,
  onUnlockDoor,
  onTogglePortal,
  onDeletePortal,
}: DmContextMenusProps) {
  const { t } = useTranslation();

  return (
    <>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={onCloseContextMenu}
        />
      )}

      {doorMenu && (
        <DoorContextMenu
          x={doorMenu.x}
          y={doorMenu.y}
          doorState={doorMenu.state as 'open' | 'closed' | 'locked'}
          onToggle={() => onToggleDoor(doorMenu.itemId)}
          onLock={() => onLockDoor(doorMenu.itemId)}
          onUnlock={() => onUnlockDoor(doorMenu.itemId)}
          onDelete={() => onDeleteItem(doorMenu.itemId)}
          onClose={onCloseDoorMenu}
        />
      )}

      {wallMenu && getItem(wallMenu.itemId) && (
        <WallContextMenu
          x={wallMenu.x}
          y={wallMenu.y}
          item={getItem(wallMenu.itemId)!}
          onUpdate={(patch) => onUpdateItem(wallMenu.itemId, patch)}
          onDelete={() => onDeleteItem(wallMenu.itemId)}
          onClose={onCloseWallMenu}
        />
      )}

      {zoneMenu && (
        <ZoneContextMenu
          x={zoneMenu.x}
          y={zoneMenu.y}
          portals={getZonePortals(zoneMenu.itemId)}
          onTogglePortal={onTogglePortal}
          onDeletePortal={onDeletePortal}
          onDelete={() => onDeleteItem(zoneMenu.itemId)}
          onClose={onCloseZoneMenu}
        />
      )}

      {lightMenu && (
        <ContextMenu
          x={lightMenu.x}
          y={lightMenu.y}
          items={[
            { label: t('dm.deleteLight', 'Eliminar luz'), icon: '🗑️', danger: true, onClick: () => onDeleteItem(lightMenu.itemId) },
          ]}
          onClose={onCloseLightMenu}
        />
      )}

      {fogMenu && (
        <ContextMenu
          x={fogMenu.x}
          y={fogMenu.y}
          items={[
            { label: t('dm.deleteFogRegion', 'Eliminar región de niebla'), icon: '🗑️', danger: true, onClick: () => onDeleteItem(fogMenu.itemId) },
          ]}
          onClose={onCloseFogMenu}
        />
      )}
    </>
  );
}
