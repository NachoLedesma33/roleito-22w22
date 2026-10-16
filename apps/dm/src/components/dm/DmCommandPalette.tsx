import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export interface DmCommandPaletteProps {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  /** `string | undefined` como en `useParams`: los links se arman igual que antes. */
  campaignId: string | undefined;
  onToggleDice: () => void;
  onToggleInitiative: () => void;
  onToggleNotebook: () => void;
  onToggleRecap: () => void;
  onToggleCalendar: () => void;
  onToggleQuests: () => void;
  onToggleHandouts: () => void;
  /** Abre el mapa de la escena activa. El lookup queda en el dueño del estado. */
  onOpenActiveSceneMap: () => void;
  onToggleAiPanel: () => void;
  onToggleAssistant: () => void;
  onToggleQuickActions: () => void;
  onToggleSessionLog: () => void;
  onToggleSceneNotes: () => void;
  onToggleSceneSettings: () => void;
  onOpenBuildMenu: () => void;
}

/**
 * Paleta de comandos (Ctrl+K): navegación a las páginas de la campaña y
 * apertura de los paneles del VTT. Cada acción llega ya ligada; el componente
 * solo filtra por texto y cierra al elegir.
 */
export default function DmCommandPalette({
  query,
  onQueryChange,
  onClose,
  campaignId,
  onToggleDice,
  onToggleInitiative,
  onToggleNotebook,
  onToggleRecap,
  onToggleCalendar,
  onToggleQuests,
  onToggleHandouts,
  onOpenActiveSceneMap,
  onToggleAiPanel,
  onToggleAssistant,
  onToggleQuickActions,
  onToggleSessionLog,
  onToggleSceneNotes,
  onToggleSceneSettings,
  onOpenBuildMenu,
}: DmCommandPaletteProps) {
  const { t } = useTranslation();
  const q = query.trim().toLowerCase();

  const links = [
    { label: t('dm.cmdVtt', 'VTT'), icon: '◆', to: `/campaigns/${campaignId}` },
    { label: t('dm.cmdCampaignSummary', 'Resumen de la campaña'), icon: '◇', to: `/campaigns/${campaignId}/manage` },
    { label: t('dm.sideCharacters', 'Personajes'), icon: '♦', to: `/campaigns/${campaignId}/characters` },
    { label: t('dm.sideSessions', 'Sesiones'), icon: '♠', to: `/campaigns/${campaignId}/sessions` },
    { label: t('dm.sideScenes', 'Escenas'), icon: '▣', to: `/campaigns/${campaignId}/scenes` },
    { label: t('dm.cmdNarrative', 'Narrativa'), icon: '✒', to: `/campaigns/${campaignId}/narrative` },
    { label: t('dm.sidePlayers', 'Jugadores'), icon: '○', to: `/campaigns/${campaignId}/players` },
    { label: t('dm.sideMaps', 'Imágenes'), icon: '◇', to: `/campaigns/${campaignId}/maps` },
    { label: t('dm.sideAssets', 'Recursos'), icon: '□', to: `/campaigns/${campaignId}/assets` },
    { label: t('dm.cmdTts', 'Voz (TTS)'), icon: '♪', to: `/campaigns/${campaignId}/tts` },
    { label: t('dm.cmdAgents', 'Agentes'), icon: '🤖', to: `/campaigns/${campaignId}/agents` },
    { label: t('dm.cmdWorldState', 'Estado del mundo'), icon: '🌍', to: `/campaigns/${campaignId}/world-state` },
    { label: t('dm.cmdMemory', 'Memoria'), icon: '🧠', to: `/campaigns/${campaignId}/memory` },
  ];

  const actions = [
    { label: t('dm.dice', 'Tirar dados'), icon: '🎲', run: onToggleDice },
    { label: t('dm.initiativeTitle', 'Iniciativa'), icon: '⚔', run: onToggleInitiative },
    { label: t('dm.notebook', 'Cuaderno del DM'), icon: '📓', run: onToggleNotebook },
    { label: t('dm.recap', 'Resumen de sesión'), icon: '📋', run: onToggleRecap },
    { label: t('dm.calendarTitle', 'Calendario y relojes'), icon: '📅', run: onToggleCalendar },
    { label: t('dm.questsTitle', 'Tablón de misiones'), icon: '📜', run: onToggleQuests },
    { label: t('dm.handoutsTitle', 'Documentos para jugadores'), icon: '🗂', run: onToggleHandouts },
    { label: t('dm.openMapTitle', 'Abrir mapa'), icon: '🗺', run: onOpenActiveSceneMap },
    { label: t('dm.aiPanelTitle', 'Configuración de IA'), icon: '🤖', run: onToggleAiPanel },
    { label: t('dm.assistantTitle', 'Asistente del DM'), icon: '💬', run: onToggleAssistant },
    { label: t('dm.quickActionsTitle', 'Acciones rápidas'), icon: '⚡', run: onToggleQuickActions },
    { label: t('dm.sessionLogTitle', 'Bitácora de sesión'), icon: '📋', run: onToggleSessionLog },
    { label: t('dm.sceneNotesTitle', 'Notas de la escena'), icon: '📝', run: onToggleSceneNotes },
    { label: t('dm.sceneSettingsTitle', 'Ajustes de escena'), icon: '⚙', run: onToggleSceneSettings },
    { label: t('dm.buildPlain', 'Construir'), icon: '🧱', run: onOpenBuildMenu },
  ];

  const matches = (label: string) => !q || label.toLowerCase().includes(q);
  const hasResults =
    links.some((l) => matches(l.label)) || actions.some((a) => matches(a.label));

  return (
    <div
      data-testid="dm-command-palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/60"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded-xl shadow-2xl overflow-hidden">
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          placeholder={t('dm.cmdPlaceholder', 'Buscar acción… (Ctrl+K)')}
          className="w-full bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/60"
        />
        <div className="max-h-72 overflow-y-auto border-t border-[var(--bg-tertiary)]">
          {links.filter((l) => matches(l.label)).map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <span className="text-xs opacity-60">{l.icon}</span>
              {l.label}
            </Link>
          ))}
          {actions.filter((a) => matches(a.label)).map((a) => (
            <button
              key={a.label}
              onClick={() => { a.run(); onClose(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <span className="text-xs opacity-60">{a.icon}</span>
              {a.label}
            </button>
          ))}
          {!hasResults && (
            <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">{t('dm.noResults', 'Sin resultados')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
