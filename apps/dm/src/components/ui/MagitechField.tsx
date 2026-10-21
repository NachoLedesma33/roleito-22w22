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
 * Campo del acceso, en clave "Magitech": no hay caja, hay una linea de
 * bronce apagada que se enciende de cian a violeta al enfocar, y la tipografia
 * de maquina. El PIN no muestra los puntos del navegador: los digitos se
 * dibujan abajo, y el que acaba de entrar prende con un destello.
 *
 * El `type="password"` se mantiene (el PIN no se escribe en claro); lo que se
 * apaga es el color del texto, y el campo real queda debajo de los digitos.
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
      className="group relative"
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
          'w-full border-0 border-b border-white/10 bg-transparent pb-2 pt-1 font-mono text-ink',
          'placeholder:text-ink-muted',
          'focus:border-transparent focus:outline-none focus:ring-0',
          pin
            ? 'text-2xl tracking-[0.45em] text-transparent caret-azure-500'
            : 'text-lg tracking-wide',
        )}
      />

      {/* La linea que se enciende: cian al foco, con halo violeta. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-azure-500 via-arcana-500 to-transparent transition-transform duration-500 ease-standard group-focus-within:scale-x-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-azure-500 to-transparent opacity-0 blur-[3px] transition-all duration-500 group-focus-within:scale-x-100 group-focus-within:opacity-90"
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
                  filled ? 'bg-azure-500' : 'border border-white/15',
                )}
                initial={false}
                animate={{
                  scale: filled ? 1 : 0.75,
                  opacity: filled ? 1 : 0.4,
                  boxShadow: filled
                    ? '0 0 14px rgba(76,194,255,0.9)'
                    : '0 0 0px rgba(76,194,255,0)',
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
