import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Campaign } from '@/lib/api';
import { Check, Copy } from 'lucide-react';
import AnchoredMenu from '@/components/ui/AnchoredMenu';
import { useAnchoredMenu } from '@/lib/useAnchoredMenu';

interface InviteMenuProps {
  campaign: Campaign | null;
  /** Avisa que la campaña cambió (el backend genera el código). */
  onCampaignChange?: (campaign: Campaign) => void;
}

/**
 * El invite de la campaña: las URLs que el DM puede compartir con la mesa.
 *
 * El link se armaba con `window.location.origin`: si el DM abrió la app en
 * localhost, ese link no le sirve a nadie de la mesa (localhost es la máquina
 * de cada uno). Con los IPs de la LAN —los reporta el backend— el DM ve la
 * URL que sí funciona desde el celular o la laptop de al lado.
 */
export default function InviteMenu({ campaign, onCampaignChange }: InviteMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [ips, setIps] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  /** La URL publica (el tunel), si el DM esta jugando desde una. */
  // Arranca con el origen de la app: si el DM esta jugando por el tunel (o
  // por su dominio), ESA es la URL que llega a los jugadores. Con el campo
  // vacio el menu ofrecia el link de localhost (inutil para la mesa) y el
  // boton de copiar no tenía nada que copiar.
  const [urlPublica, setUrlPublica] = useState(() => window.location.origin);

  // Si el DM juega en LOCAL, el origen es localhost (no le sirve a nadie de
  // la mesa): entonces se ofrece la URL del tunel que tiene abierta, que el
  // backend conoce (el script del tunel la deja en `data/tunnel_url.txt`).
  // Y si no hay tunel, se recuerda la ultima URL pegada a mano.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(
      window.location.origin,
    );
    if (!esLocal) {
      // El DM esta entrando por el tunel: su origen ES la URL publica.
      setUrlPublica(window.location.origin);
      return;
    }
    // Primero la ultima URL pegada a mano (para no esperar al backend), y
    // despues la del tunel vivo, que gana: es la que sirve ahora.
    const recordada = localStorage.getItem('roleito:invite:public-url');
    if (recordada) setUrlPublica(recordada);
    void api.network
      .publicUrl()
      .then((r) => {
        if (cancelled || !r.public_url) return;
        setUrlPublica(r.public_url);
      })
      .catch(() => {
        // sin tunel y sin URL recordada: el menu ofrece los links de la LAN
      });
    return () => {
      cancelled = true;
    };
  }, [open]);
  /** La partida abierta al publico: detras del link fijo `/join`. */
  const [abierta, setAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const menu = useAnchoredMenu({
    open,
    onClose: () => setOpen(false),
    anchorId: 'invite',
    align: 'end',
    width: 280,
    gap: 6,
  });

  // Los IPs se piden al abrir: no hacen falta antes y no se gastan en cada
  // render.
  useEffect(() => {
    if (!open || ips.length > 0) return;
    let cancelled = false;
    void api.network
      .ips()
      .then((r) => {
        if (!cancelled) setIps(r.ips ?? []);
      })
      .catch(() => {
        if (!cancelled) setIps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ips.length]);

  // Los settings de la campaña dicen si la partida esta abierta al publico.
  useEffect(() => {
    const settings = (campaign?.settings_json ?? {}) as { public_join?: boolean };
    setAbierta(settings.public_join === true);
  }, [campaign?.settings_json]);

  const toggleAbierta = useCallback(async () => {
    if (!campaign) return;
    setGuardando(true);
    try {
      const updated = await api.campaigns.setPublicJoin(campaign.id, !abierta);
      setAbierta(!abierta);
      onCampaignChange?.(updated);
    } catch {
      // si no se pudo guardar, el estado sigue como estaba
    } finally {
      setGuardando(false);
    }
  }, [abierta, campaign, onCampaignChange]);

  const code = campaign?.invite_code ?? null;
  /** El link fijo: el mismo para todas las partidas (el atajo `/join`). */
  const urlFija = `${window.location.origin}/join`;

  // Un tunel efimero (Cloudflare quick, tunnelmole) cambia de URL en cada
  // partida: el link "/join" NO es fijo ahi. Con un dominio propio (o
  // Tailscale Funnel) si lo es.
  const publica = urlPublica.trim().replace(/\/$/, '');
  const hostEphemeral = /\.trycloudflare\.com|\.tunnelmole\.net/i.test(publica);
  // El origen de la app: si el DM esta en localhost, ese link no le sirve a
  // nadie de la mesa (localhost es la maquina de cada uno).
  const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(publica);
  const port = window.location.port ? `:${window.location.port}` : '';
  const path = code ? `/campaigns/join/${code}` : '';
  const urls: { url: string; hint: string }[] = [];
  if (code) {
    // El link que se manda es el que el DM pega como "URL publica": si juega
    // con un tunel (o abre la app desde el tunel), ese es el unico que
    // llega a los jugadores de otra casa o ciudad.
    if (publica) {
      urls.push({
        url: `${publica}${path}`,
        hint: esLocal
          ? t('dm.inviteHere', 'Desde esta maquina')
          : t('dm.invitePublic', 'Link publico (tunel)'),
      });
    } else {      urls.push({
        url: `${window.location.origin}${path}`,
        hint: t('dm.inviteHere', 'Desde esta maquina'),
      });
    }
    for (const ip of ips) {
      urls.push({
        url: `http://${ip}${port}${path}`,
        hint: t('dm.inviteLan', 'En la red local (LAN)'),
      });
    }
  }

  /** El DM puede pegar la URL a mano: se recuerda para la proxima. */
  const recordarUrl = useCallback((url: string) => {
    setUrlPublica(url);
    try {
      if (url) localStorage.setItem('roleito:invite:public-url', url);
    } catch {
      // sin localStorage: se usa solo en esta sesion
    }
  }, []);

  const copy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(url);
        window.setTimeout(() => setCopied(null), 2000);
      } catch {
        // Sin permiso de portapapeles: la URL queda visible para copiarla a mano.
      }
    },
    [],
  );

  const openMenu = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      menu.anchorFrom(e.currentTarget);
      setOpen(true);
      if (!code && campaign) {
        try {
          const updated = await api.campaigns.generateInviteCode(campaign.id);
          onCampaignChange?.(updated);
        } catch {
          // Sin código no hay link: el menu lo avisa.
        }
      }
    },
    [campaign, code, menu, onCampaignChange],
  );

  return (
    <>
      <button
        onClick={openMenu}
        data-anchor="invite"
        data-testid="invite-button"
        className="text-xs px-2 py-1 rounded transition-colors shrink-0 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title={t('dm.copyInviteTitle', 'Copiar link de invitación para jugadores')}
      >
        {code ? t('dm.invite', '🔗 Invitar') : t('dm.getInvite', '🔗 Obtener invitación')}
      </button>

      <AnchoredMenu
        open={open}
        rect={menu.rect}
        anchorId="invite"
        testId="invite-menu"
        minWidth={280}
      >
        <div className="px-3 py-2" data-testid="invite-menu-content">
          <label className="flex items-center gap-2 text-[0.65rem] text-secondary">
            <input
              type="checkbox"
              checked={abierta}
              disabled={guardando}
              onChange={toggleAbierta}
              data-testid="invite-public-toggle"
            />
            {t('dm.invitePublicGame', 'Partida abierta: cualquiera con el link entra')}
          </label>
          {abierta && (
            <button
              type="button"
              onClick={() => copy(urlFija)}
              data-testid="invite-fixed-link"
              className="block w-full text-left px-2 py-1.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]"
            >
              <span className="block font-mono text-xs text-[var(--text-primary)] truncate">
                {urlFija}
              </span>
              <span className="block text-[0.65rem] text-secondary">
                {copied === urlFija
                  ? t('dm.inviteCopied', 'Copiado')
                  : t('dm.inviteFixedLink', 'Link fijo: el mismo para todas las partidas')}
              </span>
            </button>
          )}
          {hostEphemeral && (
            <p
              className="text-[0.65rem] text-[var(--warning)]"
              data-testid="invite-ephemeral-hint"
            >
              {t(
                'dm.inviteEphemeral',
                'Este tunel cambia de URL en cada partida: comparti el link de la partida (el de arriba), no el fijo.',
              )}
            </p>
          )}
          <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-secondary mb-1">
            {t('dm.invitePublicLabel', 'URL publica (si usas un tunel)')}
            <div className="mt-1 flex items-center gap-1">
              <input
                type="text"
                value={urlPublica}
                onChange={(e) => recordarUrl(e.target.value)}
                placeholder="https://mi-tunel.trycloudflare.com"
                aria-label={t('dm.invitePublicLabel', 'URL publica (si usas un tunel)')}
                className="w-full rounded bg-[var(--bg-tertiary)] border border-[var(--bg-secondary)] px-2 py-1 font-mono text-[0.65rem] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => copy(publica)}
                disabled={!publica}
                data-testid="invite-copy-public-url"
                title={t('dm.inviteCopyUrl', 'Copiar la URL publica')}
                aria-label={t('dm.inviteCopyUrl', 'Copiar la URL publica')}
                className="shrink-0 p-1.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:hover:text-[var(--text-secondary)]"
              >
                {copied === publica ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </label>
          {urls.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">
              {t('dm.inviteNoCode', 'Generando el codigo de invitacion...')}
            </p>
          ) : (
            <>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
                {t('dm.inviteTitle', 'Link para la mesa')}
              </p>
              {urls.map((u) => (
                <button
                  key={u.url}
                  onClick={() => copy(u.url)}
                  data-testid="invite-url"
                  className="block w-full text-left px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)]"
                >
                  <span className="block font-mono text-xs text-[var(--text-primary)] truncate">
                    {u.url}
                  </span>
                  <span className="block text-[0.65rem] text-[var(--text-secondary)]">
                    {copied === u.url ? t('dm.inviteCopied', 'Copiado') : u.hint}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </AnchoredMenu>
    </>
  );
}
