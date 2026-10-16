import type { LucideIcon } from 'lucide-react';
import PlayerQuestPanel from '@/components/PlayerQuestPanel';
import PlayerCalendarPanel from '@/components/PlayerCalendarPanel';
import PlayerHandoutPanel from '@/components/PlayerHandoutPanel';

/** Paneles de información que el jugador abre desde la topbar. */
export type PlayerPanelId = 'quests' | 'calendar' | 'handouts';

/** Botón de un panel ya resuelto: ícono, título y si está abierto. */
export interface PlayerPanelToggle {
  id: PlayerPanelId;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  testId?: string;
}

export interface PlayerPanelTogglesProps {
  toggles: PlayerPanelToggle[];
}

const IDLE =
  'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/70';
const ACTIVE = 'bg-[var(--accent)] text-white';

/**
 * Botones de los paneles de información del jugador. Solo presentación: los
 * recibe ya resueltos (qué ícono, qué título, si está activo) para que la vista
 * no los escriba uno por uno.
 */
export function PlayerPanelToggles({ toggles }: PlayerPanelTogglesProps) {
  return (
    <>
      {toggles.map(({ id, label, icon: Icon, active, onClick, testId }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          data-testid={testId}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${active ? ACTIVE : IDLE}`}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </>
  );
}

export interface PlayerPanelsProps {
  campaignId: string;
  /** Revisión del snapshot: misiones y documentos recargan cuando cambia. */
  revision: string;
  open: Partial<Record<PlayerPanelId, boolean>>;
  onClose: (id: PlayerPanelId) => void;
}

/** Los paneles abiertos. Cada uno pide sus datos solo mientras está montado. */
export function PlayerPanels({ campaignId, revision, open, onClose }: PlayerPanelsProps) {
  return (
    <>
      {open.quests && (
        <PlayerQuestPanel campaignId={campaignId} revision={revision} onClose={() => onClose('quests')} />
      )}
      {open.calendar && (
        <PlayerCalendarPanel campaignId={campaignId} onClose={() => onClose('calendar')} />
      )}
      {open.handouts && (
        <PlayerHandoutPanel campaignId={campaignId} revision={revision} onClose={() => onClose('handouts')} />
      )}
    </>
  );
}