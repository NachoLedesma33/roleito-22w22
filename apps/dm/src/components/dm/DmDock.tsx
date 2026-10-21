import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface DockAction {
  /** Clave estable para React y para differentiating dos acciones con el mismo título. */
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** El panel está abierto: el botón se pinta como activo. */
  active?: boolean;
  /** Variante de color para los paneles que no usan el acento (el asistente). */
  activeClassName?: string;
  testId?: string;
  /** Pendientes que esperan al DM: se muestran como badge sobre el boton. */
  badge?: number;
  /** testid del badge, para los specs. */
  badgeTestId?: string;
}

export interface DmDockProps {
  expanded: boolean;
  onExpand: () => void;
  /**
   * Botones agrupados: cada grupo se renderiza seguido y los grupos se
   * separan con una línea vertical. El dock separa "sesión" de
   * "herramientas" visualmente, y el array lo dice sin flags de layout.
   */
  groups: DockAction[][];
}

const IDLE =
  'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]';
const ACTIVE = 'bg-[var(--accent)] text-white';

/**
 * Dock inferior de acciones del DM. Abierto por defecto en desktop; en
 * pantallas chicas se colapsa a la píldora "⋯" y se despliega al hacer hover.
 */
export default function DmDock({ expanded, onExpand, groups }: DmDockProps) {
  const { t } = useTranslation();

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 max-w-[94vw]"
      onMouseEnter={onExpand}
      title={t('dm.dmActions', 'Acciones del DM')}
    >
      {/* Sólido, sin blur: el backdrop-blur se fundía con cada mapa y perdía
          contraste. `--surface` (obsidian-900) es el color característico del
          tema y al ser opaco tapa lo que haya debajo. */}
      <div className="flex items-center gap-0.5 rounded-full bg-[var(--surface)] border border-[var(--bg-tertiary)] px-2 py-1.5 shadow-xl overflow-x-auto">
        {!expanded ? (
          <button
            onClick={onExpand}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title={t('dm.dmActions', 'Acciones del DM')}
            aria-label={t('dm.dmActions', 'Acciones del DM')}
          >
            ⋯
          </button>
        ) : (
          groups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5">
              {gi > 0 && <div className="w-px h-5 bg-[var(--bg-tertiary)] mx-1" />}
              {group.map((action) => {
                const Icon = action.icon;
                const badge = action.badge ?? 0;
                return (
                  <button
                    key={action.key}
                    onClick={action.onClick}
                    className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${action.active ? (action.activeClassName ?? ACTIVE) : IDLE}`}
                    title={action.label}
                    aria-label={badge ? `${action.label} (${badge})` : action.label}
                    data-testid={action.testId}
                  >
                    <Icon className="h-5 w-5" />
                    {badge > 0 && (
                      <span
                        aria-hidden="true"
                        data-testid={action.badgeTestId}
                        className="absolute -right-0.5 -top-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center"
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
