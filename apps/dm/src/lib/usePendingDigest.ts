import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Cada cuanto se mira el digest. 15s alcanza: es un badge y un aviso, no una
 * alerta. El digest es un conteo en el backend, no una llamada al modelo
 * (no gasta API key).
 */
const POLL_MS = 15_000;

/**
 * Cuenta lo que espera la decision del DM (propuestas de evento, canon en
 * revision). `onGrow` se dispara cuando el numero CRECE: algo nuevo pide la
 * atencion del DM. La primera lectura no dispara nada (no es un cambio).
 */
export function usePendingDigest(campaignId: string | undefined, onGrow?: (pending: number) => void) {
  const [pending, setPending] = useState(0);
  const lastRef = useRef<number | null>(null);
  const onGrowRef = useRef(onGrow);

  useEffect(() => {
    onGrowRef.current = onGrow;
  });

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;

    const check = async () => {
      try {
        const digest = await api.agents.digest(campaignId);
        if (cancelled) return;
        const grew = lastRef.current !== null && digest.pending > lastRef.current;
        lastRef.current = digest.pending;
        setPending(digest.pending);
        if (grew) onGrowRef.current?.(digest.pending);
      } catch {
        // El digest es informativo: si falla, no interrumpe nada.
      }
    };

    void check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [campaignId]);

  return { pending };
}
