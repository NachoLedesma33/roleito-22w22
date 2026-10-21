import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface MagitechFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Etiqueta (queda para lectores de pantalla; a la vista, la linea de luz). */
  label: string;
  placeholder?: string;
  /** PIN: los digitos se dibujan con destello en vez de los puntos nativos. */
  pin?: boolean;
  /** Tope de caracteres. Sin tope (undefined) el campo no limita nada. */
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric';
  pattern?: string;
  describedBy?: string;
  testId?: string;
  /** El corrector del navegador no tiene nada que decir sobre un alias. */
  spellCheck?: boolean;
  /** Durante el desbloqueo el campo se desvanece hacia arriba. */
  unlocking?: boolean;
}

/**
 * Campo del acceso, en clave "Magitech": no hay caja, hay una unica linea
 * inferior gris que al enfocar se pone cian (con su halo). El fondo es
 * transparente o negro muy translucido — nunca blanco — y lo que se escribe
 * es blanco brillante.
 *
 * El PIN no muestra los puntos del navegador: los digitos se dibujan abajo,
 * y el que acaba de entrar prende con un destello. El `type="password"` se
 * mantiene (el PIN no se escribe en claro); lo que se apaga es el color del
 * texto, y el campo real queda debajo de los digitos.
 */
export default function MagitechField({
  id,
  value,
  onChange,
  label,
  placeholder,
  pin = false,
  maxLength,
  autoComplete,
  autoFocus,
  inputMode,
  pattern,
  describedBy,
  testId,
  spellCheck,
  unlocking = false,
}: MagitechFieldProps) {
  return (
    <motion.div
      className="relative"
      animate={unlocking ? { opacity: 0, y: -18 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={pin ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        inputMode={inputMode}
        pattern={pattern}
        aria-describedby={describedBy}
        data-testid={testId}
        spellCheck={spellCheck}
        className={cn(
          'magitech-input w-full rounded-none border-0 border-b border-subtle bg-surface-elevated',
          'px-3 pb-2 pt-1 text-center font-mono text-primary placeholder:text-secondary',
          'focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary',
          'focus:shadow-[0_10px_24px_-12px_var(--accent-secondary)]',
          pin && 'text-2xl tracking-[0.45em] text-transparent caret-accent-secondary',
        )}
      />

      {pin && (
        <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
          {Array.from({ length: maxLength ?? 8 }).map((_, i) => {
            const filled = i < value.length;
            return (
              <motion.span
                key={i}
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  filled ? 'bg-accent-secondary' : 'border border-subtle',
                )}
                initial={false}
                animate={{
                  scale: filled ? 1 : 0.75,
                  opacity: filled ? 1 : 0.45,
                  boxShadow: filled
                    ? '0 0 14px rgba(34,211,238,0.9)'
                    : '0 0 0px rgba(34,211,238,0)',
                }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
