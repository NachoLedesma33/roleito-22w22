import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Campaign } from '@/lib/api';
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
  const [urlPublica, setUrlPublica] = useState('');

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

  const code = campaign?.invite_code ?? null;
  const port = window.location.port ? `:${window.location.port}` : '';
  const path = code ? `/campaigns/join/${code}` : '';
  const urls: { url: string; hint: string }[] = [];
  if (code) {
    // El link que se manda es el que el DM pega como "URL publica": si juega
    // con un tunel (o abre la app desde el tunel), ese es el unico que
    // llega a los jugadores de otra casa o ciudad.
    const publica = urlPublica.trim().replace(/\/$/, '');
    if (publica) {
      urls.push({
        url: `${publica}${path}`,
        hint: t('dm.invitePublic', 'Link publico (tunel)'),
      });
    } else {
      urls.push({
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
          <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-secondary mb-1">
            {t('dm.invitePublicLabel', 'URL publica (si usas un tunel)')}
            <input
              type="text"
              value={urlPublica}
              onChange={(e) => setUrlPublica(e.target.value)}
              placeholder="https://mi-tunel.trycloudflare.com"
              aria-label={t('dm.invitePublicLabel', 'URL publica (si usas un tunel)')}
              className="mt-1 w-full rounded bg-[var(--bg-tertiary)] border border-[var(--bg-secondary)] px-2 py-1 font-mono text-[0.65rem] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
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
