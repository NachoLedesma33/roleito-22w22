import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MagitechButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  /** El boton emite el pulso de luz del desbloqueo. */
  unlocking?: boolean;
}

/**
 * Boton del acceso, en clave "Magitech": no es un bloque morado, es una
 * placa de bronce con energia arcana concentrandose. El cursor la atrae
 * apenas (efecto magnetico), al pasar por encima barre una luz y el halo
 * late.
 */
export default function MagitechButton({
  children,
  className,
  unlocking = false,
  ...props
}: MagitechButtonProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });

  return (
    <motion.button
      type="submit"
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * 10);
        y.set(((e.clientY - r.top) / r.height - 0.5) * 6);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'group relative w-full overflow-hidden rounded-lg px-6 py-3 font-display text-sm uppercase tracking-[0.25em] text-obsidian-950',
        'shadow-[0_0_28px_-6px_rgba(76,194,255,0.5)] transition-shadow duration-base hover:shadow-[0_0_44px_-4px_rgba(124,77,224,0.75)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(110deg,var(--azure-500)_0%,var(--arcana-600)_45%,var(--brass-500)_100%)]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(70%_130%_at_50%_125%,rgba(255,255,255,0.5),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] group-hover:animate-[magitech-sweep_1.1s_ease-out]"
      />
      {unlocking && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg border border-azure-500"
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.35 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
