import { Brain, Eye, GitFork, Mail, Map, ScrollText, Sparkles, Volume2, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CyberHiveBackground from '../components/lightswind/cyber-hive';

const linkFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

/** Lee un token CSS resolviendo `var(--x)` anidados (para colores del canvas). */
function cssVar(name: string, seen: ReadonlySet<string> = new Set()): string {
  if (seen.has(name)) return '#8b5cf6';
  seen = new Set(seen).add(name);
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const nested = raw.match(/^var\((--[\w-]+)\)$/);
  if (nested) return cssVar(nested[1], seen);
  return raw || '#8b5cf6';
}

/**
 * Landing pública pre-login (§6.1 del plan). Sin sesión, es la pantalla de
 * entrada; con sesión, redirige al lobby de campañas.
 */
export default function Landing() {
  const { t } = useTranslation();

  const features: ReadonlyArray<{ icon: LucideIcon; img: string; title: string; desc: string }> = [
    {
      icon: Map,
      img: '/ui/2.jpg',
      title: t('landing.features.vtt.title', 'Mesa VTT'),
      desc: t(
        'landing.features.vtt.desc',
        'Grid exacto, niebla de guerra, luz y sombra que responden en vivo mientras la escena cambia.',
      ),
    },
    {
      icon: ScrollText,
      img: '/ui/3.jpg',
      title: t('landing.features.canon.title', 'Canon aprobado'),
      desc: t(
        'landing.features.canon.desc',
        'Nada entra al mundo sin tu firma: toda propuesta —tuya o de la IA— pasa por revisión antes de volverse canon.',
      ),
    },
    {
      icon: Brain,
      img: '/ui/4.jpg',
      title: t('landing.features.memory.title', 'Memoria viva'),
      desc: t(
        'landing.features.memory.desc',
        'El mundo recuerda cada sesión y lo usa al narrar la siguiente. Lo que pasó, sigue pasando.',
      ),
    },
    {
      icon: Eye,
      img: '/ui/5.jpg',
      title: t('landing.features.player.title', 'Vista de jugador'),
      desc: t(
        'landing.features.player.desc',
        'Cada jugador ve solo lo que debe ver: su alcance, su niebla, su mapa. Sin spoilers ni pestañas de DM.',
      ),
    },
    {
      icon: Sparkles,
      img: '/ui/6.jpg',
      title: t('landing.features.assist.title', 'Narrativa asistida'),
      desc: t(
        'landing.features.assist.desc',
        'La IA es tu copiloto: propone, redacta y sugiere, pero el canon siempre lo decidís vos.',
      ),
    },
    {
      icon: Volume2,
      img: '/ui/7.jpg',
      title: t('landing.features.atmosphere.title', 'Atmósfera'),
      desc: t(
        'landing.features.atmosphere.desc',
        'Audio, clima y transiciones acompañan la escena para que la mesa suene a lo que está pasando.',
      ),
    },
  ];

  const colorGrid = cssVar('--brand');
  const colorNodes = cssVar('--brand-hover');

  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <CyberHiveBackground
          colorGrid={colorGrid}
          colorNodes={colorNodes}
          speed={0.2}
          gridDensity={0.8}
          warpRadius={1.5}
          warpStrength={0.5}
          interactive
          hoverIntensity={0.15}
          mouseDamping={0.025}
          transparentBg
          className="opacity-60"
        />
      </div>
      <header className="relative z-10 bg-bg">
        <div className="relative mx-auto max-w-6xl px-6">
          <img
            src="/ui/logo22w22.png"
            alt={t('app.name')}
            className="absolute left-12 top-7 z-10 h-60 w-auto md:h-80"
          />
          <div className="flex justify-end pt-4">
            <Link
              to="/login"
              className={`rounded-md border border-border px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2 ${linkFocus}`}
            >
              {t('landing.login', 'Ingresar')}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-56 md:grid-cols-2 md:pb-28 md:pt-64">
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
            <img
              src="/ui/1.jpg"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        <section id="features">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src="/ui/8.jpg"
                alt=""
                aria-hidden="true"
                className="h-44 w-full object-cover md:h-64"
              />
            </div>
            <h2 className="mt-10 text-2xl font-semibold">
              {t('landing.featuresTitle', 'Todo en una sola mesa')}
            </h2>
            <p className="mt-2 max-w-2xl text-ink-muted">
              {t(
                'landing.featuresIntro',
                'Seis piezas que se construyen solas mientras jugás: todo lo que la mesa necesita, sin configurar nada dos veces.',
              )}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="overflow-hidden rounded-lg border border-border bg-surface">
                  <img
                    src={feature.img}
                    alt=""
                    aria-hidden="true"
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-5">
                    <feature.icon className="h-6 w-6 text-brand" aria-hidden="true" />
                    <h3 className="mt-3 font-medium">{feature.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src="/ui/logo22w22.png"
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-auto"
                />
                <span className="font-display text-lg font-semibold text-ink">
                  {t('app.name')}
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
                {t(
                  'landing.footer.blurb',
                  'Engine local-first para tus campañas de D&D. El mundo recuerda cada sesión.',
                )}
              </p>
            </div>

            <nav aria-label={t('landing.footer.product', 'Producto')}>
              <h2 className="text-sm font-semibold text-ink">
                {t('landing.footer.product', 'Producto')}
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                <li>
                  <a href="#features" className="transition-colors hover:text-ink">
                    {t('landing.footer.productFeatures', 'Características')}
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-ink">
                    {t('landing.footer.productLook', 'Cómo funciona')}
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-ink">
                    {t('landing.footer.productNews', 'Novedades')}
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label={t('landing.footer.resources', 'Recursos')}>
              <h2 className="text-sm font-semibold text-ink">
                {t('landing.footer.resources', 'Recursos')}
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                <li>
                  <a href="#" className="transition-colors hover:text-ink">
                    {t('landing.footer.resourcesDocs', 'Documentación')}
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-ink">
                    {t('landing.footer.resourcesGuide', 'Guía del DM')}
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-ink">
                    {t('landing.footer.resourcesFaq', 'Preguntas frecuentes')}
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label={t('landing.footer.community', 'Comunidad')}>
              <h2 className="text-sm font-semibold text-ink">
                {t('landing.footer.community', 'Comunidad')}
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                <li>
                  <a href="#" className="transition-colors hover:text-ink">
                    {t('landing.footer.communityDiscord', 'Discord')}
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-ink">
                    {t('landing.footer.communityBlog', 'Blog')}
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-ink">
                    {t('landing.footer.communityContact', 'Contacto')}
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-4 pt-6 text-xs text-ink-muted md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} {t('app.name')} ·{' '}
              {t('landing.footer.rights', 'Hecho para mesas de D&D.')}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/NachoLedesma33/roleito-22w22"
                aria-label="GitHub"
                className={`transition-colors hover:text-ink ${linkFocus}`}
              >
                <GitFork className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#"
                aria-label={t('landing.footer.contact', 'Contacto')}
                className={`transition-colors hover:text-ink ${linkFocus}`}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
