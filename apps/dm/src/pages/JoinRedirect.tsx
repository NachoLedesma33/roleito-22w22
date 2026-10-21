import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

/**
 * El link fijo del playtest remoto: `https://<tu-dominio>/join`.
 *
 * El host no cambia nunca (se pega una vez en el Discord de la mesa) y el
 * backend resuelve que campaña esta abierta al público. Si no hay ninguna,
 * se avisa (no es una puerta abierta: el DM tiene que abrir la partida).
 */
export default function JoinRedirect() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.campaigns
      .activeInvite()
      .then((r) => {
        if (cancelled) return;
        window.location.replace(`/campaigns/join/${r.invite_code}`);
      })
      .catch(() => {
        if (!cancelled) setError('no partida');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-[var(--text-primary)]">
      <p className="text-sm text-[var(--text-secondary)]">
        {error
          ? t('join.noOpenGame', 'No hay ninguna partida abierta. Preguntale al DM.')
          : t('join.opening', 'Abriendo la partida...')}
      </p>
    </main>
  );
}
