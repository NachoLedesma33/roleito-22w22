import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import PinLogin from './PinLogin';

const VIDEO_SRC = '/ui/22w22Logo-animado.mp4';
const EXIT_MS = 1250;

/**
 * Particulas del desbloqueo. Posiciones fijas (nada de azar: el mismo
 * estallido en cada corrida) que salen disparadas del centro cuando el
 * formulario se abre y se disuelve.
 */
const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2 ? 0.14 : -0.14);
  const dist = 130 + (i % 3) * 70;
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist * 0.55),
    delay: (i % 6) * 0.035,
    tone: i % 2 ? 'bg-azure-500' : 'bg-arcana-500',
  };
});

/**
 * Pantalla de login con el video de marca de fondo (loop, atenuado). Cuando la
 * sesión confirma que el PIN era correcto, el formulario **se abre**: el boton
 * emite el pulso de luz, los campos se van hacia arriba, la placa de vidrio se
 * disuelve en particulas y deja ver el portal de fondo. Recien al terminar se
 * avisa con `onExitComplete`: atras queda el video solo y arranca la intro a
 * pantalla completa.
 */
export default function LoginShell({ onExitComplete }: { onExitComplete: () => void }) {
  const { session } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onExitComplete);
  doneRef.current = onExitComplete;

  useEffect(() => {
    if (!session || unlocking) return;
    setUnlocking(true);
    // El video arranca recién cuando el perfil fue corroborado: simula la
    // entrada al lobby mientras el formulario se abre.
    void videoRef.current?.play().catch(() => {});
  }, [session, unlocking]);

  useEffect(() => {
    if (!unlocking) return;
    const t = window.setTimeout(() => doneRef.current(), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [unlocking]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover bg-black"
      />
      {/* El velo se aclara al abrirse: el portal de fondo tiene que verse. */}
      <motion.div
        className="absolute inset-0 bg-black"
        aria-hidden="true"
        animate={{ opacity: unlocking ? 0.35 : 0.65 }}
        transition={{ duration: 0.9 }}
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]"
        aria-hidden="true"
      />

      {/* El portal que se abre detras del formulario. */}
      {unlocking && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(76,194,255,0.4),rgba(124,77,224,0.2)_45%,transparent_70%)] blur-2xl"
          initial={{ opacity: 0, scale: 0.25 }}
          animate={{ opacity: 1, scale: 1.6 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}

      <div className="relative z-10">
        <motion.div
          animate={
            unlocking
              ? { opacity: 0, scale: 1.08, filter: 'blur(10px)' }
              : { opacity: 1, scale: 1, filter: 'blur(0px)' }
          }
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        >
          <PinLogin unlocking={unlocking} />
        </motion.div>
      </div>

      {unlocking && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full ${p.tone}`}
              initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.95, delay: p.delay, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
