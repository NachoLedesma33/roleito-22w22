import { useEffect, useRef, useState } from 'react';

interface VoiceRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: VoiceResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface VoiceResultEvent extends Event {
  results: ArrayLike<{ isFinal: boolean } & ArrayLike<{ transcript: string }>>;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => VoiceRecognition;
    webkitSpeechRecognition?: new () => VoiceRecognition;
  }
}

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  lang?: string;
  disabled?: boolean;
}

export default function VoiceInputButton({ onResult, lang = 'es-ES', disabled = false }: VoiceInputButtonProps) {
  const recRef = useRef<VoiceRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [supported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );

  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {
        /* cierre al desmontar */
      }
    },
    [],
  );

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* stop idempotente */
      }
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      let text = '';
      for (let i = 0; i < ev.results.length; i += 1) {
        const r = ev.results[i];
        if (r.isFinal) text += r[0]?.transcript ?? '';
      }
      if (!text && ev.results.length > 0) {
        text = ev.results[ev.results.length - 1][0]?.transcript ?? '';
      }
      const clean = text.trim();
      if (clean) onResult(clean);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      data-testid="voice-input-toggle"
      title={listening ? 'Detener dictado' : 'Dictar por voz'}
      aria-pressed={listening}
      className={`text-xs px-2 py-1.5 rounded transition-colors disabled:opacity-50 ${
        listening
          ? 'bg-red-800/70 text-red-200 animate-pulse'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      🎙
    </button>
  );
}
