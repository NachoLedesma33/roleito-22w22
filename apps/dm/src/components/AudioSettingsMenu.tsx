import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
import { setAudioVolume, useAudioSettings, type AudioSettingKey } from '@/lib/audioSettings';

const ROWS: { key: AudioSettingKey; labelKey: string; fallback: string }[] = [
  { key: 'master', labelKey: 'audio.master', fallback: 'General' },
  { key: 'weather', labelKey: 'audio.weather', fallback: 'Clima' },
  { key: 'dice', labelKey: 'audio.dice', fallback: 'Dados' },
];

const PANEL_W = 224; // w-56
const PANEL_H = 232;

interface AudioSettingsMenuProps {
  className?: string;
  /** true en el DM: muestra el checkbox de sincronización. */
  canSync?: boolean;
  /** el DM activa/desactiva la sincronización. */
  onToggleSync?: (synced: boolean) => void;
  /** además de guardar local, persiste el valor compartido (solo con sync activo). */
  onVolumeChange?: (key: AudioSettingKey, value: number) => void;
}

/**
 * Regulador de volumen compartido (DM y jugador): un master global mas un
 * control por canal, para que los sonidos no se tapen entre si. Los cambios se
 * persisten y se sincronizan entre pestanas (ver lib/audioSettings).
 *
 * El DM puede tildar "Sincronizar sonido" para empujar su volumen a todos los
 * jugadores; mientras esté sincronizado, los sliders del jugador quedan
 * bloqueados siguiendo al DM.
 *
 * El panel va en `position: fixed` con la posicion calculada desde el boton y
 * recortada al viewport: en la barra vertical izquierda del DM un `absolute`
 * se saldria por el borde de la pantalla y quedaria recortado.
 */
export default function AudioSettingsMenu({
  className = '',
  canSync = false,
  onToggleSync,
  onVolumeChange,
}: AudioSettingsMenuProps) {
  const { t } = useTranslation();
  const settings = useAudioSettings();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const open = pos !== null;
  const close = () => setPos(null);
  // El jugador sigue al DM: no puede tocar los sliders mientras esté sincronizado.
  const locked = settings.synced && !canSync;

  const openMenu = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8));
    let top = r.bottom + 6;
    if (top + PANEL_H > window.innerHeight - 8) top = Math.max(8, r.top - PANEL_H - 6);
    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null);
    };
    const onResize = () => setPos(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div ref={rootRef} className={`shrink-0 ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t('audio.title', 'Volumen del audio')}
        data-testid="audio-volume"
        className={`text-xs px-2 py-1 rounded transition-colors ${
          open
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/70'
        }`}
      >
        <Volume2 className="h-3.5 w-3.5" />
      </button>
      {pos && (
        <div
          role="dialog"
          data-testid="audio-volume-menu"
          style={{ top: pos.top, left: pos.left, width: PANEL_W }}
          className="fixed z-50 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] shadow-lg p-3 space-y-2"
        >
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
            {t('audio.title', 'Volumen del audio')}
          </p>
          {ROWS.map((r) => (
            <label key={r.key} className="block">
              <span className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-0.5">
                <span>{t(r.labelKey, r.fallback)}</span>
                <span className="text-[var(--accent)]" data-testid={`audio-volume-${r.key}-value`}>
                  {pct(settings[r.key])}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings[r.key]}
                disabled={locked}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAudioVolume(r.key, v);
                  if (settings.synced) onVolumeChange?.(r.key, v);
                }}
                data-testid={`audio-volume-${r.key}`}
                className={`w-full accent-[var(--accent)] ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </label>
          ))}
          {canSync && (
            <div className="pt-1 border-t border-[var(--bg-tertiary)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.synced}
                  onChange={(e) => onToggleSync?.(e.target.checked)}
                  data-testid="audio-sync"
                  className="accent-[var(--accent)]"
                />
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {t('audio.sync', 'Sincronizar sonido')}
                </span>
              </label>
              <p className="text-[10px] text-[var(--text-secondary)] opacity-70 mt-0.5">
                {t('audio.syncHint', 'Aplica este volumen a todos los jugadores')}
              </p>
            </div>
          )}
          {locked && (
            <p className="text-[10px] text-[var(--text-secondary)] opacity-70" data-testid="audio-synced-note">
              {t('audio.syncedByDm', 'Sincronizado por el DM')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
