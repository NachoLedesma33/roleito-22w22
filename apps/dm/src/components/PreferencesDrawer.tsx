import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
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

  const [language, setLanguage] = useState<Language>(() =>
    i18n.language === 'en' ? 'en' : 'es'
  );
  const [reduced, setReduced] = useState(() => readStored<string>(REDUCED_KEY, '0') === '1');
  const [textSize, setTextSize] = useState(() => readStored<string>(TEXT_KEY, 'md'));

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-full max-h-full sm:max-h-full rounded-none right-0 left-auto top-0 translate-x-0 -translate-y-0 sm:translate-x-0 sm:translate-y-0 overflow-y-auto">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}