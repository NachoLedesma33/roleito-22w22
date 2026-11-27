import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type LegalKind = 'terms' | 'privacy' | 'ai' | 'content' | 'credits';

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { t } = useTranslation();
  const linkFocus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

  const pages: Record<LegalKind, { title: string; intro: string; sections: { title: string; body: string }[] }> = {
    terms: {
      title: t('legal.terms.title', 'Términos de uso'),
      intro: t(
        'legal.terms.intro',
        'Borrador técnico. Define cómo se usa Roleito. Requiere revisión de un abogado antes de publicarse.'
      ),
      sections: [
        {
          title: t('legal.terms.scopeTitle', 'Qué es Roleito'),
          body: t(
            'legal.terms.scope',
            'Roleito es un motor local-first para manejar campañas de rol. El DM decide qué entra en la campaña y qué se comparte con los jugadores.'
          ),
        },
        {
          title: t('legal.terms.accountsTitle', 'Perfil y sesiones'),
          body: t(
            'legal.terms.accounts',
            'El acceso usa un PIN elegido por el DM. Cerrar el navegador termina la sesión de esa pestaña. No compartas tu PIN ni tus links de invitación.'
          ),
        },
        {
          title: t('legal.terms.useTitle', 'Uso permitido'),
          body: t(
            'legal.terms.use',
            'Usá el engine para tus campañas y contenido propio. No lo uses para acosar, suplantar identidades, publicar material ilegal ni saturar el servicio.'
          ),
        },
        {
          title: t('legal.terms.filesTitle', 'Tus archivos'),
          body: t(
            'legal.terms.files',
            'La base y los assets viven en la máquina donde corre el servidor. Hacer backups es tu responsabilidad.'
          ),
        },
        {
          title: t('legal.terms.changesTitle', 'Cambios'),
          body: t(
            'legal.terms.changes',
            'Estos textos pueden cambiar. La versión publicada en el sitio es la que aplica desde su fecha de actualización.'
          ),
        },
      ],
    },
    privacy: {
      title: t('legal.privacy.title', 'Privacidad'),
      intro: t(
        'legal.privacy.intro',
        'Borrador técnico. Explica qué datos maneja Roleito. Requiere revisión de un abogado antes de publicarse.'
      ),
      sections: [
        {
          title: t('legal.privacy.localTitle', 'Datos de campaña'),
          body: t(
            'legal.privacy.local',
            'Las campañas, personajes, eventos y world state se guardan en la base local del servidor. No se envían a un proveedor externo salvo que actives una integración de IA.'
          ),
        },
        {
          title: t('legal.privacy.contactTitle', 'Formulario de contacto'),
          body: t(
            'legal.privacy.contact',
            'Nombre, correo, asunto y mensaje se guardan 90 días, o 30 si se marca respondido. Solo los lee el equipo que administra Roleito. No es un canal de emergencias.'
          ),
        },
        {
          title: t('legal.privacy.logsTitle', 'Registros técnicos'),
          body: t(
            'legal.privacy.logs',
            'El servidor puede registrar IP, hora y tipo de solicitud para limitar abusos y diagnosticar fallos. Los tokens de sesión viven en la pestaña del navegador.'
          ),
        },
        {
          title: t('legal.privacy.rightsTitle', 'Tus derechos'),
          body: t(
            'legal.privacy.rights',
            'Podés pedir acceso, corrección o borrado de tus mensajes por el formulario de contacto. Los textos legales definitivos deben confirmar el alcance de esos derechos.'
          ),
        },
      ],
    },
    ai: {
      title: t('legal.ai.title', 'Aviso sobre IA'),
      intro: t(
        'legal.ai.intro',
        'Borrador técnico. Explica cuándo interviene la IA. Requiere revisión de un abogado antes de publicarse.'
      ),
      sections: [
        {
          title: t('legal.ai.roleTitle', 'Qué hace'),
          body: t(
            'legal.ai.role',
            'La IA redacta escenas, resume sesiones y sugiere eventos. Todo lo que escribe queda como propuesta hasta que el DM lo aprueba.'
          ),
        },
        {
          title: t('legal.ai.providerTitle', 'Proveedores'),
          body: t(
            'legal.ai.provider',
            'Con proveedor local, el texto no sale de la máquina. Con proveedor externo, el texto de la campaña viaja a ese servicio; el tratamiento depende del contrato que tengas con él.'
          ),
        },
        {
          title: t('legal.ai.limitsTitle', 'Límites'),
          body: t(
            'legal.ai.limits',
            'La IA es probabilística y puede equivocarse. Revisá siempre el resultado antes de aprobarlo. No es una fuente de consejos legales, médicos ni financieros.'
          ),
        },
      ],
    },
    content: {
      title: t('legal.content.title', 'Aviso sobre contenido'),
      intro: t(
        'legal.content.intro',
        'Borrador técnico. Define responsabilidad sobre el contenido creado en Roleito. Requiere revisión de un abogado antes de publicarse.'
      ),
      sections: [
        {
          title: t('legal.content.ownershipTitle', 'Contenido del DM'),
          body: t(
            'legal.content.ownership',
            'Las campañas, mapas, notas y personajes que cargues son tuyos. Roleito no reclama propiedad sobre ese contenido.'
          ),
        },
        {
          title: t('legal.content.responseTitle', 'Reportes'),
          body: t(
            'legal.content.response',
            'Si encontrás contenido que vulnera estos términos, escribí por el formulario de contacto con el link o la referencia. El equipo puede revisarlo y retirarlo.'
          ),
        },
        {
          title: t('legal.content.assetsTitle', 'Assets de terceros'),
          body: t(
            'legal.content.assets',
            'Los assets incluidos conservan la licencia de sus autores. La lista de créditos está en la sección Créditos.'
          ),
        },
      ],
    },
    credits: {
      title: t('legal.credits.title', 'Créditos'),
      intro: t(
        'legal.credits.intro',
        'Programas y assets usados por Roleito. Las licencias completas están en el archivo NOTICE del repositorio.'
      ),
      sections: [
        {
          title: t('legal.credits.softwareTitle', 'Software'),
          body: t(
            'legal.credits.software',
            'React, TypeScript, Vite, Tailwind CSS, Three.js, React Three Fiber, FastAPI, SQLAlchemy y SQLite. Cada proyecto mantiene su propia licencia.'
          ),
        },
        {
          title: t('legal.credits.assetsTitle', 'Assets'),
          body: t(
            'legal.credits.assets',
            'Los mapas, audio y efectos bundled se listan en el archivo NOTICE con su fuente y licencia. Los archivos que subas vos no se incluyen ahí.'
          ),
        },
      ],
    },
  };

  const page = pages[kind];

  return (
    <div className="min-h-screen bg-bg text-ink" data-testid="legal-page" data-legal-kind={kind}>
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

      <main className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-brand">{t('legal.draft', 'Borrador — revisión legal pendiente')}</p>
        <h1 className="mt-4 text-4xl font-bold">{page.title}</h1>
        <p className="mt-6 text-lg text-ink-muted">{page.intro}</p>

        <div className="mt-12 grid gap-4">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border bg-surface p-6">
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
