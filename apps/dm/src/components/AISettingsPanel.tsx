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

const REMOTE_MODELS = [
  { group: 'Groq (gratis)', models: [
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  ]},
  { group: 'OpenRouter (multi-provider)', models: [
    { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'openai/gpt-4o', label: 'GPT-4o' },
    { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
    { id: 'mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1 24B' },
  ]},
  { group: 'OpenAI', models: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ]},
  { group: 'Ollama (local)', models: [
    { id: 'gemma3:4b', label: 'Gemma 3 4B' },
    { id: 'llama3', label: 'Llama 3' },
    { id: 'mistral', label: 'Mistral 7B' },
    { id: 'phi3', label: 'Phi-3 Mini' },
  ]},
];

const LOCAL_MODELS = [
  { id: 'gemma3:4b', label: 'Gemma 3 4B' },
  { id: 'llama3', label: 'Llama 3' },
  { id: 'mistral', label: 'Mistral 7B' },
  { id: 'phi3', label: 'Phi-3 Mini' },
  { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B' },
];

export default function AISettingsPanel({ onClose }: AISettingsPanelProps) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null } | null>(null);
  const [saveError, setSaveError] = useState('');
  const [vaultStatus, setVaultStatus] = useState<Record<string, boolean>>({});
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    Promise.all([api.ai.getConfig(), api.vault.status()])
      .then(([cfg, vs]) => {
        setSettings(cfg);
        setVaultStatus(vs);
      })
      .catch(() => setSaveError('No se pudo cargar la configuración'));
  }, []);

  if (!settings) {
    return (
      <HudPanel title="IA" panelId="ai-settings" onClose={onClose} defaultX={420} defaultY={90} defaultWidth={340}>
        <p className="text-xs text-[var(--text-secondary)]">
          {saveError || 'Cargando...'}
        </p>
      </HudPanel>
    );
  }

  const update = (patch: Partial<AISettings>) => setSettings({ ...settings, ...patch });
  const hasRemoteKey = vaultStatus.remote === true;

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    try {
      await api.vault.store('remote', apiKey.trim());
      setVaultStatus({ ...vaultStatus, remote: true });
      setKeySaved(true);
      setApiKey('');
      setTimeout(() => setKeySaved(false), 2000);
    } catch {
      setSaveError('Error al guardar API key');
    }
  };

  const handleDeleteKey = async () => {
    try {
      await api.vault.delete('remote');
      setVaultStatus({ ...vaultStatus, remote: false });
    } catch {
      setSaveError('Error al eliminar API key');
    }
  };

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
        usage: res.usage,
      });
    } catch {
      setTestResult({ ok: false, text: 'Error de red al contactar el backend' });
    }
    setTesting(false);
  };

  return (
    <HudPanel title="IA" panelId="ai-settings" onClose={onClose} defaultX={420} defaultY={90} defaultWidth={340}>
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

            <div className="mt-2 p-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                  API Key
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    hasRemoteKey
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {hasRemoteKey ? 'Guardada en Vault' : 'No configurada'}
                </span>
              </div>

              {hasRemoteKey ? (
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 text-[var(--text-primary)]"
                    placeholder="••••••••"
                    data-testid="api-key-input"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteKey}
                    className="text-[10px] px-2 py-1 rounded border border-red-800/50 text-red-400 hover:bg-red-950/50 transition-colors"
                  >
                    Borrar
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 text-[var(--text-primary)]"
                    placeholder="sk-..."
                    data-testid="api-key-input"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    disabled={!apiKey.trim()}
                    className="text-[10px] px-2 py-1 rounded bg-emerald-800/50 text-emerald-300 hover:bg-emerald-800 transition-colors disabled:opacity-40"
                  >
                    {keySaved ? 'Guardada' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {settings.provider !== 'mock' && (
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              Modelo
            </label>
            <select
              value={settings.model ?? ''}
              onChange={(e) => update({ model: e.target.value || null })}
              className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              data-testid="ai-model-select"
            >
              <option value="">
                {settings.provider === 'local' ? 'Default (Ollama decide)' : 'Default del provider'}
              </option>
              {settings.provider === 'local'
                ? LOCAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))
                : REMOTE_MODELS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.models.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))
              }
            </select>
            <input
              type="text"
              value={settings.model ?? ''}
              onChange={(e) => update({ model: e.target.value || null })}
              className="w-full text-xs mt-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              placeholder="o escribí un modelo manualmente"
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
            {testResult.ok && testResult.usage && (
              <div className="mt-1 pt-1 border-t border-emerald-800/30 text-emerald-400/70">
                ~{testResult.usage.total_tokens} tokens
                {testResult.usage.prompt_tokens > 0 && (
                  <span className="ml-1">
                    ({testResult.usage.prompt_tokens} in / {testResult.usage.completion_tokens} out)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
