import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export interface PinFormProps {
  /** Nombre del perfil (no el id interno). */
  nameValue: string;
  onNameChange: (value: string) => void;
  pinValue: string;
  onPinChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  error?: string;
  loading?: boolean;
  /** Perfiles guardados para elegir (opcional). */
  aside?: ReactNode;
  /** Links secundarios: crear DM, cambiar PIN, volver. */
  footer?: ReactNode;
  testId?: string;
}

const inputClass =
  'w-full text-center bg-surface-2 border border-border rounded-lg py-3 text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

/**
 * Formulario clásico nombre de perfil + PIN, sin lógica de auth ni cromo de
 * pantalla: solo la tarjeta. Se puede montar en el login actual o dentro de una
 * landing.
 */
export default function PinForm({
  nameValue,
  onNameChange,
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
  const { t } = useTranslation();

  return (
    <div className="space-y-5" data-testid={testId}>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="pin-form-name" className="sr-only">
            {t('login.profileName', 'Nombre de perfil')}
          </label>
          <input
            id="pin-form-name"
            type="text"
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value.trim())}
            placeholder={t('login.profileName', 'Nombre de perfil')}
            autoComplete="username"
            spellCheck={false}
            autoFocus
            data-testid="login-dm-name"
            className={`${inputClass} text-lg`}
          />
        </div>

        <div>
          <label htmlFor="pin-form-pin" className="sr-only">
            {t('login.pinLabel', 'PIN de 4 a 8 dígitos')}
          </label>
          <input
            id="pin-form-pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pinValue}
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ''))}
            placeholder="····"
            autoComplete="current-password"
            aria-describedby="pin-form-pin-hint"
            data-testid="login-pin"
            className={`${inputClass} text-3xl tracking-[0.5em]`}
          />
          <p id="pin-form-pin-hint" className="mt-1 text-center text-xs text-ink-muted">
            {t('login.pinHint', '4 a 8 dígitos')}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            data-testid="login-error"
            className="text-sm text-danger text-center"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full"
        >
          {loading ? '...' : submitLabel}
        </Button>
      </form>

      {aside}
      {footer}
    </div>
  );
}
