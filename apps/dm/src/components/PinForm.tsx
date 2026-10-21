import type { FormEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import MagitechField from '@/components/ui/MagitechField';
import MagitechButton from '@/components/ui/MagitechButton';

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
  /** El acceso fue corroborado: el formulario se abre y se disuelve. */
  unlocking?: boolean;
}

/**
 * Formulario clásico nombre de perfil + PIN, sin lógica de auth ni cromo de
 * pantalla: solo la tarjeta. Se puede montar en el login actual o dentro de una
 * landing.
 *
 * Estilo "Magitech": la caja la pone la pantalla (`PinLogin`); acá van los
 * campos sin marco, la linea que se enciende al enfocar y el boton de
 * energia. Cuando `unlocking` prende, los campos se van hacia arriba y el
 * boton emite el pulso de luz: el formulario se esta abriendo.
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
  unlocking = false,
}: PinFormProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6" data-testid={testId}>
      <motion.form
        onSubmit={onSubmit}
        className="flex flex-col gap-6"
        animate={unlocking ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <MagitechField
          id="pin-form-name"
          value={nameValue}
          onChange={(v) => onNameChange(v.trim())}
          label={t('login.profileName', 'Nombre de perfil')}
          placeholder={t('login.profileName', 'Nombre de perfil')}
          autoComplete="username"
          autoFocus
          spellCheck={false}
          testId="login-dm-name"
          unlocking={unlocking}
        />

        <div>
          <MagitechField
            id="pin-form-pin"
            value={pinValue}
            onChange={(v) => onPinChange(v.replace(/\D/g, ''))}
            label={t('login.pinLabel', 'PIN de 4 a 8 dígitos')}
            pin
            maxLength={8}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="current-password"
            describedBy="pin-form-pin-hint"
            testId="login-pin"
            unlocking={unlocking}
          />
          <p id="pin-form-pin-hint" className="mt-2 text-center text-xs text-gray-400">
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

        <MagitechButton
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          unlocking={unlocking}
        >
          {loading ? '...' : submitLabel}
        </MagitechButton>
      </motion.form>

      <motion.div
        className="flex flex-col gap-4"
        animate={unlocking ? { opacity: 0, y: -12 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {aside}
        {footer}
      </motion.div>
    </div>
  );
}
