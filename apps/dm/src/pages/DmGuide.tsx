import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Manual público del DM: qué hace el engine y dónde están los límites reales. */
export default function DmGuide() {
  const { t } = useTranslation();
  const linkFocus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

  const sections = [
    { key: 'flow', title: t('dmGuide.flowTitle', 'El flujo de una sesión'), body: t('dmGuide.flow') },
    { key: 'vtt', title: t('dmGuide.vttTitle', 'Mesa VTT'), body: t('dmGuide.vtt') },
    { key: 'canon', title: t('dmGuide.canonTitle', 'Canon aprobado'), body: t('dmGuide.canon') },
    { key: 'ai', title: t('dmGuide.aiTitle', 'IA copiloto'), body: t('dmGuide.ai') },
    { key: 'security', title: t('dmGuide.securityTitle', 'Seguridad'), body: t('dmGuide.security') },
    { key: 'limits', title: t('dmGuide.limitsTitle', 'Límites y responsabilidades'), body: t('dmGuide.limits') },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink" data-testid="dm-guide">
      <header className="relative z-10 bg-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className={`flex items-center gap-3 ${linkFocus}`}>
            <img src="/ui/logo22w22.webp" alt="" aria-hidden="true" className="h-10 w-auto" />
            <span className="font-display text-lg font-semibold">{t('app.name')}</span>
          </Link>
          <Link
            to="/login"
            className={`rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-2 ${linkFocus}`}
          >
            {t('landing.login', 'Ingresar')}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-brand">{t('public.pages.guide', 'Guía del DM')}</p>
        <h1 className="mt-4 text-4xl font-bold">{t('dmGuide.title', 'Manual de uso del DM')}</h1>
        <p className="mt-6 text-lg text-ink-muted">{t('dmGuide.intro')}</p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.key} className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-brand/40 bg-surface p-6">
          <h2 className="text-lg font-semibold">{t('dmGuide.contactTitle', '¿Quedó una duda?')}</h2>
          <p className="mt-3 text-sm text-ink-muted">{t('dmGuide.contactBody')}</p>
          <Link
            to="/contact"
            className={`mt-5 inline-block rounded-md bg-brand px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover ${linkFocus}`}
          >
            {t('landing.nav.contact', 'Contacto')}
          </Link>
        </section>
      </main>
    </div>
  );
}
