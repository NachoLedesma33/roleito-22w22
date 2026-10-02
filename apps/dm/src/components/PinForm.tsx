import type { FormEvent, ReactNode } from 'react';

export interface PinFormProps {
  idValue: string;
  onIdChange: (value: string) => void;
  pinValue: string;
  onPinChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  error?: string;
  loading?: boolean;
  /** Lista de IDs guardados para autocompletar (opcional). */
  aside?: ReactNode;
  /** Links secundarios: crear DM, cambiar PIN, volver. */
  footer?: ReactNode;
  testId?: string;
}

const inputClass =
  'w-full text-center bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors';

/**
 * Formulario clásico ID + PIN, sin lógica de auth ni cromo de pantalla: solo la
 * tarjeta. Se puede montar en el login actual o dentro de una landing.
 */
export default function PinForm({
  idValue,
  onIdChange,
  pinValue,
  onPinChange,
  onSubmit,
  submitLabel,
  error,
  loading,
  aside,
  footer,
  testId = 'pin-form',
}: PinFormProps) {
  return (
    <div className="space-y-5" data-testid={testId}>
      <form onSubmit={onSubmit} className="space-y-5">
        <input
          type="text"
          value={idValue}
          onChange={(e) => onIdChange(e.target.value.trim())}
          placeholder="ID de DM"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          data-testid="login-dm-id"
          className={`${inputClass} font-mono text-sm tracking-wider`}
        />

        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pinValue}
          onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="PIN"
          data-testid="login-pin"
          className={`${inputClass} text-2xl tracking-[0.5em]`}
        />

        {error && (
          <p data-testid="login-error" className="text-xs text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : submitLabel}
        </button>
      </form>

      {aside}
      {footer}
    </div>
  );
}
