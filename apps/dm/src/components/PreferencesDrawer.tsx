import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { useAuth } from '@/contexts/AuthContext';
import { THEMES, useTheme } from '@/contexts/ThemeContext';
import { LANGUAGES, type Language } from '@/lib/i18n';

const REDUCED_KEY = 'roleito:reduced-motion';
const TEXT_KEY = 'roleito:text-size';

const TEXT_SIZES = [
  { id: 'sm', px: 14 },
  { id: 'md', px: 16 },
  { id: 'lg', px: 18 },
] as const;

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return raw as T;
  } catch {
    /* localStorage no disponible */
  }
  return fallback;
}

export default function PreferencesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { logoutAll, exportMyData, deleteMyData } = useAuth();
  const navigate = useNavigate();

  const [language, setLanguage] = useState<Language>(() =>
    i18n.language === 'en' ? 'en' : 'es'
  );
  const [reduced, setReduced] = useState(() => readStored<string>(REDUCED_KEY, '0') === '1');
  const [textSize, setTextSize] = useState(() => readStored<string>(TEXT_KEY, 'md'));
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [killing, setKilling] = useState(false);
  const [killError, setKillError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [privacyError, setPrivacyError] = useState('');

  useEffect(() => {
    const el = document.documentElement;
    if (reduced) {
      el.dataset.motion = 'reduced';
    } else {
      delete el.dataset.motion;
    }
    try {
      localStorage.setItem(REDUCED_KEY, reduced ? '1' : '0');
    } catch {
      /* localStorage no disponible */
    }
  }, [reduced]);

  useEffect(() => {
    const px = TEXT_SIZES.find((s) => s.id === textSize)?.px ?? 16;
    document.documentElement.style.fontSize = `${px}px`;
    try {
      localStorage.setItem(TEXT_KEY, textSize);
    } catch {
      /* localStorage no disponible */
    }
  }, [textSize]);

  const confirmLogoutAll = async () => {
    setKilling(true);
    setKillError('');
    try {
      await logoutAll();
      setLogoutAllOpen(false);
      onOpenChange(false);
      navigate('/');
    } catch (err) {
      setKillError(err instanceof Error ? err.message : t('common.error', 'Error'));
    } finally {
      setKilling(false);
    }
  };

  const downloadData = async () => {
    setExporting(true);
    setPrivacyError('');
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roleito-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : t('common.error', 'Error'));
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setPrivacyError('');
    try {
      await deleteMyData();
      setDeleteOpen(false);
      onOpenChange(false);
      navigate('/');
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : t('common.error', 'Error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-full max-h-full sm:max-h-full rounded-none right-0 left-auto top-0 translate-x-0 -translate-y-0 sm:translate-x-0 sm:translate-y-0 overflow-y-auto max-sm:left-auto max-sm:top-0 max-sm:bottom-auto max-sm:max-h-full">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.description', 'Preferencias locales de esta consola')} ({t('settings.localNote')}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('settings.language')}
            </span>
            <select
              value={language}
              onChange={(e) => {
                const lng = e.target.value as Language;
                setLanguage(lng);
                void i18n.changeLanguage(lng);
              }}
              className="mt-1 w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('settings.theme')}
            </span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as (typeof THEMES)[number]['id'])}
              className="mt-1 w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              {THEMES.map((th) => (
                <option key={th.id} value={th.id}>
                  {th.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('settings.textSize')}
            </span>
            <select
              value={textSize}
              onChange={(e) => setTextSize(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="sm">{t('settings.textSmall')}</option>
              <option value="md">{t('settings.textMedium')}</option>
              <option value="lg">{t('settings.textLarge')}</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('settings.reducedMotion')}
            </span>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
          </label>

          <div className="border-t border-[var(--bg-tertiary)] pt-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('settings.securityTitle', 'Seguridad')}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t('settings.securityBody', 'Cerrá todas las sesiones de tu perfil, incluida esta.')}
            </p>
            <button
              type="button"
              data-testid="logout-all-button"
              onClick={() => setLogoutAllOpen(true)}
              className="mt-3 rounded px-3 py-2 text-sm border border-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {t('settings.logoutAll', 'Cerrar todas las sesiones')}
            </button>
          </div>

          <div className="border-t border-[var(--bg-tertiary)] pt-5" data-testid="privacy-section">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('settings.privacyTitle', 'Tus datos')}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t('settings.privacyBody', 'Descargá tus datos o borrá este perfil. Las campañas de la instalación no se borran.')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="privacy-export-button"
                disabled={exporting}
                onClick={() => void downloadData()}
                className="rounded px-3 py-2 text-sm border border-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-60"
              >
                {exporting
                  ? t('settings.exporting', 'Descargando...')
                  : t('settings.exportData', 'Descargar mis datos')}
              </button>
              <button
                type="button"
                data-testid="privacy-delete-button"
                onClick={() => {
                  setPrivacyError('');
                  setDeleteOpen(true);
                }}
                className="rounded px-3 py-2 text-sm border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                {t('settings.deleteData', 'Borrar mi perfil')}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={logoutAllOpen} onOpenChange={setLogoutAllOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.logoutAllTitle', '¿Cerrar todas las sesiones?')}</DialogTitle>
          <DialogDescription>
            {t('settings.logoutAllDesc', 'Se cierran todas las pestañas y dispositivos de este perfil, incluida la actual. Necesitás el PIN para volver a entrar.')}
          </DialogDescription>
        </DialogHeader>
        {killError && <p role="alert" className="text-sm text-[var(--danger)]">{killError}</p>}
        <DialogFooter>
          <button
            type="button"
            onClick={() => setLogoutAllOpen(false)}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            data-testid="logout-all-confirm"
            disabled={killing}
            onClick={confirmLogoutAll}
            className="text-sm text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded px-3 py-1.5 transition-colors disabled:opacity-60"
          >
            {killing ? t('settings.logoutAllWorking', 'Cerrando...') : t('settings.logoutAll', 'Cerrar todas las sesiones')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.deleteTitle', '¿Borrar tu perfil?')}</DialogTitle>
          <DialogDescription>
            {t('settings.deleteDesc', 'Se borran tu perfil y todas sus sesiones. Las campañas de esta instalación siguen existiendo: descargá tus datos antes si querés conservarlas.')}
          </DialogDescription>
        </DialogHeader>
        {privacyError && <p role="alert" className="text-sm text-[var(--danger)]">{privacyError}</p>}
        <DialogFooter>
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            data-testid="privacy-delete-confirm"
            disabled={deleting}
            onClick={() => void confirmDelete()}
            className="text-sm text-white bg-[var(--danger)] hover:opacity-90 rounded px-3 py-1.5 transition-colors disabled:opacity-60"
          >
            {deleting ? t('settings.deleting', 'Borrando...') : t('settings.deleteData', 'Borrar mi perfil')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}