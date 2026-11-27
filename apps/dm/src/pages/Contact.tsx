import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { api, CONTACT_CONSENT_VERSION } from '@/lib/api';

export default function Contact() {
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState('');
  const linkFocus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';
  const fieldClass =
    'mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    if (data.get('consent') !== 'on') {
      setError(t('contact.consentError'));
      return;
    }
    setSending(true);
    try {
      const receipt = await api.contact.send({
        name: String(data.get('name') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        subject: String(data.get('subject') ?? '').trim(),
        message: String(data.get('message') ?? '').trim(),
        consent: true,
        consent_version: CONTACT_CONSENT_VERSION,
        website: String(data.get('website') ?? ''),
      });
      if (!receipt.stored || !receipt.ticket) {
        setError(t('contact.error'));
        return;
      }
      setTicket(receipt.ticket);
      formRef.current?.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.startsWith('429') ? t('contact.rateLimited') : t('contact.error'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink" data-testid="contact-page">
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
        <p className="text-xs uppercase tracking-[0.2em] text-brand">{t('landing.nav.contact')}</p>
        <h1 className="mt-4 text-4xl font-bold">{t('contact.title')}</h1>
        <p className="mt-6 text-lg text-ink-muted">{t('contact.intro')}</p>

        <div className="mt-8 rounded-xl border border-brand bg-surface-2 p-5" data-testid="contact-external">
          <h2 className="text-base font-semibold">Contacto por correo</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Usá este formulario para que tu consulta me llegue por correo. El formulario de abajo solo guarda el
            mensaje en tu equipo.
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSem8-ahFhuuFpBHKSWZAEGW-Zbum2_tBmbFt8eOtaJMdTxM_Q/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-4 inline-flex rounded-md bg-brand px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover ${linkFocus}`}
          >
            Abrir formulario de contacto
          </a>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-surface p-5" id="contact-notice">
          <h2 className="text-sm font-semibold">{t('contact.noticeTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t('contact.notice')}</p>
        </div>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          data-testid="contact-form"
          aria-describedby="contact-notice"
          className="mt-10 grid gap-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="text-sm font-medium">
                {t('contact.name')}
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="text-sm font-medium">
                {t('contact.email')}
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-subject" className="text-sm font-medium">
              {t('contact.subject')}
            </label>
            <input
              id="contact-subject"
              name="subject"
              type="text"
              required
              minLength={3}
              maxLength={120}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="text-sm font-medium">
              {t('contact.message')}
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={7}
              className={fieldClass}
            />
          </div>

          <label htmlFor="contact-consent" className="flex items-start gap-3 text-sm">
            <input id="contact-consent" name="consent" type="checkbox" required className="mt-1" />
            <span>
              {t('contact.consent')}{' '}
              <span className="text-ink-muted">
                ({t('contact.consentVersion', 'Versión {{version}}', { version: CONTACT_CONSENT_VERSION })})
              </span>
            </span>
          </label>

          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {error && (
            <p role="alert" data-testid="contact-error" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={sending}
              className={`rounded-md bg-brand px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-60 ${linkFocus}`}
            >
              {sending ? t('contact.sending') : t('contact.submit')}
            </button>
          </div>
        </form>
      </main>

      <Dialog open={Boolean(ticket)} onOpenChange={(open) => !open && setTicket('')}>
        <DialogContent data-testid="contact-success">
          <DialogHeader>
            <DialogTitle>{t('contact.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('contact.dialogBody', { ticket })}</DialogDescription>
          </DialogHeader>
          <p data-testid="contact-ticket" className="font-mono text-sm font-semibold text-brand">
            {ticket}
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setTicket('')}
              className={`rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-2 ${linkFocus}`}
            >
              {t('contact.close')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
