import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Secciones del footer todavia sin contenido: ruta real, mensaje claro. */
export default function PlaceholderPage({
  page,
}: {
  page: 'faq' | 'discord' | 'blog' | 'news' | 'docs';
}) {
  const { t } = useTranslation();
  const linkFocus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

  return (
    <div className="min-h-screen bg-bg text-ink" data-testid="public-placeholder">
      <header className="relative z-10 bg-bg">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className={`flex items-center gap-3 ${linkFocus}`}>
            <img src="/ui/logo22w22.webp" alt="" aria-hidden="true" className="h-10 w-auto" />
            <span className="font-display text-lg font-semibold">{t('app.name')}</span>
          </Link>
          <nav aria-label={t('landing.footer.resources', 'Recursos')} className="flex items-center gap-5 text-sm">
            <Link to="/guide" className={`hidden text-ink-muted transition-colors hover:text-ink sm:inline ${linkFocus}`}>
              {t('landing.nav.guide', 'Guía del DM')}
            </Link>
            <Link to="/faq" className={`hidden text-ink-muted transition-colors hover:text-ink sm:inline ${linkFocus}`}>
              {t('landing.nav.faq', 'Preguntas frecuentes')}
            </Link>
            <Link to="/contact" className={`text-ink-muted transition-colors hover:text-ink ${linkFocus}`}>
              {t('landing.nav.contact', 'Contacto')}
            </Link>
            <Link
              to="/login"
              className={`rounded-md border border-border px-4 py-2 text-ink transition-colors hover:bg-surface-2 ${linkFocus}`}
            >
              {t('landing.login', 'Ingresar')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-brand">{t('public.soon', 'En preparación')}</p>
        <h1 className="mt-4 text-4xl font-bold">{t(`public.pages.${page}`)}</h1>
        <p className="mt-6 text-lg text-ink-muted">{t('public.soonBody')}</p>
        <Link
          to="/"
          className={`mt-10 inline-block rounded-md border border-border px-5 py-2 text-sm transition-colors hover:bg-surface-2 ${linkFocus}`}
        >
          ← {t('public.backHome', 'Volver al inicio')}
        </Link>
      </main>
    </div>
  );
}
