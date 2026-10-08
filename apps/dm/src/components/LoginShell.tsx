import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PinLogin from './PinLogin';

const VIDEO_SRC = '/ui/22w22Logo-animado.mp4';
const EXIT_MS = 850;

/**
 * Pantalla de login con el video de marca de fondo (loop, atenuado). Cuando la
 * sesión confirma que el PIN era correcto, el formulario se consume en una
 * animación de remolino y recién al terminar se avisa con `onExitComplete`:
 * atrás queda el video solo y arranca la intro a pantalla completa.
 */
export default function LoginShell({ onExitComplete }: { onExitComplete: () => void }) {
  const { session } = useAuth();
  const [exiting, setExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onExitComplete);
  doneRef.current = onExitComplete;

  useEffect(() => {
    if (!session || exiting) return;
    setExiting(true);
    // El video arranca recién cuando el perfil fue corroborado: simula la
    // entrada al lobby mientras el formulario se consume en el remolino.
    void videoRef.current?.play().catch(() => {});
  }, [session, exiting]);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => doneRef.current(), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [exiting]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover bg-black"
      />
      <div className="absolute inset-0 bg-black/65" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]"
        aria-hidden="true"
      />

      <div
        className={`relative z-10 ${exiting ? 'animate-vortex' : ''}`}
        style={{ transformOrigin: '50% 45%' }}
      >
        <PinLogin />
      </div>
    </div>
  );
}
