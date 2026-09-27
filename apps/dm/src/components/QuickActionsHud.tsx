import { Link } from 'react-router-dom';
import HudPanel from './HudPanel';

interface QuickActionsHudProps {
  campaignId: string;
  onClose: () => void;
}

export default function QuickActionsHud({ campaignId, onClose }: QuickActionsHudProps) {
  return (
    <HudPanel
      title="Acciones rápidas"
      panelId="quick-actions"
      onClose={onClose}
      defaultX={20}
      defaultY={80}
      defaultWidth={200}
    >
      <div className="space-y-1">
        <Link
          to={`/campaigns/${campaignId}/characters/new`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          + Nuevo personaje
        </Link>
        <Link
          to={`/campaigns/${campaignId}/sessions/new`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          + Nueva sesión
        </Link>
        <Link
          to={`/campaigns/${campaignId}/scenes`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Gestionar escenas
        </Link>
        <Link
          to={`/campaigns/${campaignId}/events`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Ver eventos
        </Link>
        <Link
          to={`/campaigns/${campaignId}/manage`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Vista general de campaña
        </Link>
      </div>
    </HudPanel>
  );
}
