import { useCallback, useState } from 'react';
import type { DiceRollResponse } from '@/lib/api';

/**
 * Máximo de toasts visibles. Antes estaba implícito: cada push hacía
 * `[...prev.slice(-4), nuevo]` y el poll de dados `.slice(-5)`. Los dos
 * números significaban lo mismo (5 en pantalla) y estaban repetidos en cada
 * call site.
 */
export const MAX_TOASTS = 5;

export interface ToastRoll {
  id: string;
  rollerName: string;
  diceType: number;
  count: number;
  results: number[];
  total: number;
  label: string | null;
  timestamp: number;
}

export function rollToToast(roll: DiceRollResponse): ToastRoll {
  return {
    id: roll.id,
    rollerName: roll.roller_name,
    diceType: roll.dice_type,
    count: roll.count,
    results: roll.results,
    total: roll.total,
    label: roll.label,
    timestamp: new Date(roll.created_at).getTime(),
  };
}

/**
 * Cola de notificaciones del VTT. `ToastRoll` nació para las tiradas de dados
 * y hoy la usan también los avisos (escena sincronizada, portal creado, muros
 * eliminados), construidos con los campos de una tirada. Separar la forma de
 * aviso de la de tirada es deuda conocida, NO de este refactor: cambiaría el
 * texto renderizado y los locators de e2e.
 */
export function useToastQueue() {
  const [toasts, setToasts] = useState<ToastRoll[]>([]);

  const push = useCallback((toast: ToastRoll) => {
    setToasts((prev) => [...prev, toast].slice(-MAX_TOASTS));
  }, []);

  const pushMany = useCallback((next: ToastRoll[]) => {
    setToasts((prev) => [...prev, ...next].slice(-MAX_TOASTS));
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, pushMany, dismiss };
}
