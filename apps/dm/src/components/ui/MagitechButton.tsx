import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MagitechButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  /** El boton emite el pulso de luz del desbloqueo. */
  unlocking?: boolean;
}

/**
 * Boton del acceso: placa oscura con borde violeta sutil y un halo que
 * aparece al pasar por encima. No es un bloque morado: es una pieza de
 * maquinaria con energia contenida. El cursor lo atrae apenas (magnetico).
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
        'group relative w-full overflow-hidden rounded-lg border border-purple-500/50 bg-zinc-900/90',
        'px-6 py-3 font-sans text-sm font-medium tracking-wide text-gray-100',
        'transition-shadow duration-base hover:shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:border-purple-400/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] group-hover:animate-[magitech-sweep_1.1s_ease-out]"
      />
      {unlocking && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg border border-cyan-400"
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.35 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
