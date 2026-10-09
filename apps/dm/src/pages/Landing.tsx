import { Brain, Eye, Map, ScrollText, Sparkles, Volume2, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const linkFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

/**
 * Landing pública pre-login (§6.1 del plan). Sin sesión, es la pantalla de
 * entrada; con sesión, redirige al lobby de campañas.
 */
export default function Landing() {
  const { t } = useTranslation();

  const features: ReadonlyArray<{ icon: LucideIcon; title: string; desc: string }> = [
    {
      icon: Map,
      title: t('landing.features.vtt.title', 'Mesa VTT'),
      desc: t('landing.features.vtt.desc', 'Grid, niebla de guerra, luz e iluminación en tiempo real.'),
    },
    {
      icon: ScrollText,
      title: t('landing.features.canon.title', 'Canon aprobado'),
      desc: t('landing.features.canon.desc', 'Las propuestas pasan por revisión del DM antes de volver mundo.'),
    },
    {
      icon: Brain,
      title: t('landing.features.memory.title', 'Memoria viva'),
      desc: t('landing.features.memory.desc', 'El mundo recuerda lo que pasó y lo usa en la próxima sesión.'),
    },
    {
      icon: Eye,
      title: t('landing.features.player.title', 'Vista de jugador'),
      desc: t('landing.features.player.desc', 'Cada jugador ve solo lo que debe ver, sin pestañas ni trampas.'),
    },
    {
      icon: Sparkles,
      title: t('landing.features.assist.title', 'Narrativa asistida'),
      desc: t('landing.features.assist.desc', 'La IA asiste al DM; nunca escribe el canon por su cuenta.'),
    },
    {
      icon: Volume2,
      title: t('landing.features.atmosphere.title', 'Atmósfera'),
      desc: t('landing.features.atmosphere.desc', 'Audio, clima y transiciones para que la mesa suene a lo que pasa.'),
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-wide">{t('app.name')}</span>
          <Link
            to="/login"
            className={`rounded-md border border-border px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2 ${linkFocus}`}
          >
            {t('landing.login', 'Ingresar')}
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">{t('app.tagline')}</h1>
            <div className="mt-6 h-1 w-24 bg-brand" aria-hidden="true" />
            <p className="mt-6 text-lg text-ink-muted">
              {t('landing.subtitle', 'Un engine persistente para tu campaña.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/login"
                className={`rounded-md bg-brand px-6 py-3 font-medium text-on-brand transition-colors hover:bg-brand-hover ${linkFocus}`}
              >
                {t('landing.cta')}
              </Link>
              <a
                href="#features"
                className={`rounded-md border border-border px-6 py-3 text-ink transition-colors hover:bg-surface-2 ${linkFocus}`}
              >
                {t('landing.demo')} ▸
              </a>
            </div>
          </div>

          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-surface">
            <video
              src="/ui/22w22background.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        <section id="features" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold">
              {t('landing.featuresTitle', 'Todo en una sola mesa')}
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-lg border border-border bg-surface p-5">
                  <feature.icon className="h-6 w-6 text-brand" aria-hidden="true" />
                  <h3 className="mt-3 font-medium">{feature.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-ink-muted">
        {t('app.name')} · {t('landing.footer', 'engine local-first para RPGs')}
      </footer>
    </div>
  );
}
