import { Brain, Dices, Eye, Map, ScrollText, Sparkles, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: Map,
    title: 'Mesa VTT',
    desc: 'Grid, niebla de guerra, luz e iluminación en tiempo real.',
  },
  {
    icon: ScrollText,
    title: 'Canon aprobado',
    desc: 'Las propuestas pasan por revisión del DM antes de volver mundo.',
  },
  {
    icon: Brain,
    title: 'Memoria viva',
    desc: 'El mundo recuerda lo que pasó y lo usa en la próxima sesión.',
  },
  {
    icon: Eye,
    title: 'Vista de jugador',
    desc: 'Cada jugador ve solo lo que debe ver, sin pestañas ni trampas.',
  },
  {
    icon: Sparkles,
    title: 'Narrativa asistida',
    desc: 'La IA asiste al DM; nunca escribe el canon por su cuenta.',
  },
  {
    icon: Volume2,
    title: 'Atmósfera',
    desc: 'Audio, clima y transiciones para que la mesa suene a lo que pasa.',
  },
];

const linkFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

/**
 * Landing pública pre-login (§6.1 del plan). Sin sesión, es la pantalla de
 * entrada; con sesión, redirige al lobby de campañas.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-wide">Roleito</span>
          <Link
            to="/login"
            className={`rounded-md border border-border px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2 ${linkFocus}`}
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              El mundo que tus sesiones recuerdan
            </h1>
            <div className="mt-6 h-1 w-24 bg-brand" aria-hidden="true" />
            <p className="mt-6 text-lg text-ink-muted">
              Un engine persistente para tu campaña.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/login"
                className={`rounded-md bg-brand px-6 py-3 font-medium text-on-brand transition-colors hover:bg-brand-hover ${linkFocus}`}
              >
                Comenzar
              </Link>
              <a
                href="#features"
                className={`rounded-md border border-border px-6 py-3 text-ink transition-colors hover:bg-surface-2 ${linkFocus}`}
              >
                Ver cómo funciona ▸
              </a>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="flex aspect-square items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface to-surface-2"
          >
            <Dices className="h-40 w-40 text-brand" strokeWidth={1} />
          </div>
        </section>

        <section id="features" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold">Todo en una sola mesa</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-surface p-5"
                >
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
        Roleito · engine local-first para RPGs
      </footer>
    </div>
  );
}
