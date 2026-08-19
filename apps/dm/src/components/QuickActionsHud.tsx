import { Link } from 'react-router-dom';
import HudPanel from './HudPanel';

interface QuickActionsHudProps {
  campaignId: string;
  onClose: () => void;
}

export default function QuickActionsHud({ campaignId, onClose }: QuickActionsHudProps) {
  return (
    <HudPanel
      title="Quick Actions"
      onClose={onClose}
      defaultX={20}
      defaultY={80}
      width={200}
    >
      <div className="space-y-1">
        <Link
          to={`/campaigns/${campaignId}/characters/new`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          + New Character
        </Link>
        <Link
          to={`/campaigns/${campaignId}/sessions/new`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          + New Session
        </Link>
        <Link
          to={`/campaigns/${campaignId}/scenes`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Manage Scenes
        </Link>
        <Link
          to={`/campaigns/${campaignId}/events`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          View Events
        </Link>
        <Link
          to={`/campaigns/${campaignId}/manage`}
          className="block text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Campaign Overview
        </Link>
      </div>
    </HudPanel>
  );
}
