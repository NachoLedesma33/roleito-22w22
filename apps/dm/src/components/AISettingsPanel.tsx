import { useEffect, useState } from 'react';
import HudPanel from './HudPanel';
import { api, AISettings } from '@/lib/api';

interface AISettingsPanelProps {
  onClose: () => void;
}

const PROVIDER_LABELS: Record<AISettings['provider'], string> = {
  mock: 'Mock (sin IA real)',
  local: 'Local — Ollama',
  remote: 'Remoto — API OpenAI-compatible',
};

export default function AISettingsPanel({ onClose }: AISettingsPanelProps) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.ai
      .getConfig()
      .then(setSettings)
      .catch(() => setSaveError('No se pudo cargar la configuración'));
  }, []);

  if (!settings) {
    return (
      <HudPanel title="IA" onClose={onClose} defaultX={420} defaultY={90} width={340}>
        <p className="text-xs text-[var(--text-secondary)]">
          {saveError || 'Cargando...'}
        </p>
      </HudPanel>
    );
  }

  const update = (patch: Partial<AISettings>) => setSettings({ ...settings, ...patch });

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const saved = await api.ai.updateConfig(settings);
      setSettings(saved);
    } catch {
      setSaveError('Error al guardar');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.ai.updateConfig(settings);
      const res = await api.ai.test();
      setTestResult({
        ok: res.ok,
        text: res.ok
          ? `OK (${res.latency_ms}ms): ${res.response}`
          : `Error: ${res.error}`,
      });
    } catch {
      setTestResult({ ok: false, text: 'Error de red al contactar el backend' });
    }
    setTesting(false);
  };

  return (
    <HudPanel title="IA" onClose={onClose} defaultX={420} defaultY={90} width={340}>
      <div className="space-y-3" data-testid="ai-settings-panel">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Provider
          </label>
          <select
            value={settings.provider}
            onChange={(e) => update({ provider: e.target.value as AISettings['provider'] })}
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            data-testid="ai-provider-select"
          >
            {(Object.keys(PROVIDER_LABELS) as AISettings['provider'][]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {settings.provider === 'local' && (
          <div data-testid="ai-local-url">
            <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              Ollama URL
            </label>
            <input
              type="text"
              value={settings.local_base_url}
              onChange={(e) => update({ local_base_url: e.target.value })}
              className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              placeholder="http://localhost:11434"
            />
          </div>
        )}

        {settings.provider === 'remote' && (
          <div data-testid="ai-remote-url">
            <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              API base URL (OpenAI-compatible)
            </label>
            <input
              type="text"
              value={settings.remote_base_url}
              onChange={(e) => update({ remote_base_url: e.target.value })}
              className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              placeholder="https://api.groq.com/openai/v1"
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              La API key se lee de <code>REMOTE_API_KEY</code> en backend/.env — nunca se guarda acá.
            </p>
          </div>
        )}

        {settings.provider !== 'mock' && (
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              Modelo (vacío = default del provider)
            </label>
            <input
              type="text"
              value={settings.model ?? ''}
              onChange={(e) => update({ model: e.target.value || null })}
              className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              placeholder={settings.provider === 'local' ? 'llama3' : 'llama-3.1-8b-instant'}
            />
          </div>
        )}

        {saveError && (
          <p className="text-xs text-red-400" role="alert">
            {saveError}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 text-xs px-2 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            data-testid="ai-test-button"
          >
            {testing ? 'Probando...' : 'Probar conexión'}
          </button>
        </div>

        {testResult && (
          <div
            className={`text-xs rounded p-2 border break-words ${
              testResult.ok
                ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300'
                : 'border-red-800/50 bg-red-950/40 text-red-300'
            }`}
            data-testid="ai-test-result"
            role="status"
          >
            {testResult.text}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
