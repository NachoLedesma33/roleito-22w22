import { useEffect, useCallback, useState } from 'react';
import type { DiceRollResponse } from '@/lib/api';

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

interface ToastContainerProps {
  toasts: ToastRoll[];
  onDismiss: (id: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function rollToToast(roll: DiceRollResponse): ToastRoll {
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

export { rollToToast };

function SingleToast({ toast, onDismiss }: { toast: ToastRoll; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const nat20 = toast.results.some((r) => r === toast.diceType);
  const nat1 = toast.results.some((r) => r === 1);

  return (
    <div
      className={`toast-slide ${exiting ? 'toast-slide-out' : 'toast-slide-in'} pointer-events-auto`}
    >
      <div
        className={`relative bg-gray-900/95 backdrop-blur border rounded-lg shadow-xl px-3 py-2.5 max-w-xs ${
          nat20
            ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
            : nat1
            ? 'border-red-500/60 ring-1 ring-red-500/30'
            : 'border-gray-700/60'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
            🎲 {toast.rollerName}
          </span>
          {toast.label && (
            <span className="text-[9px] text-gray-500 truncate max-w-[140px]">
              {toast.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {toast.results.map((r, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-mono font-bold ${
                r === toast.diceType
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                  : r === 1
                  ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {r}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-mono">
            {toast.count}d{toast.diceType}
          </span>
          <span className="text-[9px] text-gray-600">
            {formatTime(toast.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const handleDismiss = useCallback(
    (id: string) => () => onDismiss(id),
    [onDismiss]
  );

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.slice(-3).map((t) => (
        <SingleToast key={t.id} toast={t} onDismiss={handleDismiss(t.id)} />
      ))}
    </div>
  );
}
