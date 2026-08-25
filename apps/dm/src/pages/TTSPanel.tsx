import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API = 'http://localhost:8000/api';

interface TTSConfig {
  provider: string;
  voice: string;
  speed: number;
  language: string;
}

interface Voice {
  id: string;
  name: string;
  language: string;
}

export default function TTSPanel() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [text, setText] = useState('');
  const [config, setConfig] = useState<TTSConfig | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API}/tts/config`);
      const data = await res.json();
      setConfig(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    }
  };

  const loadVoices = async () => {
    try {
      const res = await fetch(`${API}/tts/voices`);
      const data = await res.json();
      setVoices(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load voices');
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setDuration(null);

    try {
      const res = await fetch(`${API}/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail || 'TTS generation failed');
      }

      const durationMs = res.headers.get('X-TTS-Duration-Ms');
      if (durationMs) setDuration(parseInt(durationMs));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    if (!config) return;
    try {
      await fetch(`${API}/tts/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save config');
    }
  };

  const VOICE_EXAMPLES: Record<string, { text: string; label: string }[]> = {
    'es-AR-TomasNeural': [
      {
        label: 'Narrador',
        text: 'La antorcha parpadea débilmente en la pared de la cueva. Un olor acre a humedad llena el aire. Al fondo, una sombra se mueve.',
      },
      {
        label: 'Monstruo',
        text: '¡No pasaréis! Esta tumba es mía desde que el mundo era joven. ¡Volved con vuestras vidas o quedad para siempre!',
      },
    ],
    'es-AR-ElenaNeural': [
      {
        label: 'Hechicera',
        text: 'Las estrellas me susurran secretos antiguos. El poder fluye entre mis dedos como agua viva. ¿Estás preparado para escuchar la verdad?',
      },
      {
        label: 'Tabernera',
        text: 'Bienvenidos, viajeros. Tengan cuidado con el ogro del bosque. El último que lo vio nunca volvió a contarlo. ¿Les sirvo una pinta?',
      },
    ],
  };

  useEffect(() => {
    loadConfig();
    loadVoices();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">TTS — Text to Speech</h1>

      <div className="grid gap-4 mb-6">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Narration Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="La antorcha parpadea débilmente en la pared de la cueva..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm resize-y"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Speech'}
          </button>

          {duration !== null && (
            <span className="text-xs text-[var(--text-secondary)] self-center">
              Duration: {(duration / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {audioUrl && (
          <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
            <audio ref={audioRef} controls className="w-full" src={audioUrl} />
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Voces Argentinas Disponibles</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Tomas</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400">Masculino</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">es-AR-TomasNeural</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Voz masculina argentina, tono amigable y natural.</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(VOICE_EXAMPLES['es-AR-TomasNeural'] || []).map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => {
                    setText(ex.text);
                    setConfig((c) => c ? { ...c, voice: 'es-AR-TomasNeural' } : c);
                  }}
                  className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Elena</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-pink-900/50 text-pink-400">Femenino</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">es-AR-ElenaNeural</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Voz femenina argentina, tono cálido y expresivo.</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(VOICE_EXAMPLES['es-AR-ElenaNeural'] || []).map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => {
                    setText(ex.text);
                    setConfig((c) => c ? { ...c, voice: 'es-AR-ElenaNeural' } : c);
                  }}
                  className="text-xs px-2 py-1 rounded bg-pink-900/30 text-pink-300 hover:bg-pink-900/50 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-3">
          Voces neurales de Microsoft Edge, gratuitas y sin límites. Acento rioplatense argentino. Clic en un ejemplo para cargar el texto y la voz; luego "Generate Speech".
        </p>
      </div>

      <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>

        {config && (
          <div className="grid gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Provider
              </label>
              <select
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
              >
                <option value="edge">Edge TTS (Gratis, Neural)</option>
                <option value="mock">Mock (Testing)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Voice
              </label>
              <select
                value={config.voice}
                onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Speed: {config.speed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.speed}
                onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Language
              </label>
              <select
                value={config.language}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <button
              onClick={handleConfigSave}
              className="self-start px-4 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-tertiary)]/80"
            >
              Save Config
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
