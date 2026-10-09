import { useEffect, useRef, useState } from 'react';

const VIDEO_SRC = '/ui/22w22Logo-animado.mp4';

/**
 * Intro de arranque de perfil (§6.3): tapa la pantalla con el video a 1.6x y
 * solo llama a `onDone` cuando termina (o cuando se salta). Nunca corta el
 * video de golpe aunque el destino ya esté listo: la página de campañas se
 * muestra recién después del `ended`.
 */
export default function ProfileIntro({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = 1.6;
    const onTime = () => {
      if (video.duration) setProgress((video.currentTime / video.duration) * 100);
    };
    video.addEventListener('timeupdate', onTime);
    // Primero intenta con sonido; si el autoplay lo bloquea, baja a muted.
    const playWithSound = async () => {
      try {
        await video.play();
      } catch {
        video.muted = true;
        try {
          await video.play();
        } catch {
          finish();
        }
      }
    };
    void playWithSound();
    return () => video.removeEventListener('timeupdate', onTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Cargando el mundo"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        playsInline
        autoPlay
        onEnded={finish}
        onError={finish}
        className="h-full w-full object-cover"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-6 py-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-white/80">Cargando el mundo…</span>
        <button
          type="button"
          onClick={finish}
          className="rounded-md border border-white/30 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Saltar ▸
        </button>
      </div>
    </div>
  );
}
