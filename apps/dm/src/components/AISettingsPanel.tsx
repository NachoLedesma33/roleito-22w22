import { useEffect, useState } from 'react';
import HudPanel from './HudPanel';
import AIProfiles from './AIProfiles';
import { api, AISettings, AIAuditEntry, AIUsage, AIBilling } from '@/lib/api';

interface AISettingsPanelProps {
  onClose: () => void;
  /** La campaña actual: el plan de la monetización es por campaña. */
  campaignId?: string;
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
  { group: 'Google AI Studio (vision)', models: [
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (recomendado)' },
    { id: 'gemini-3.6-flash-lite', label: 'Gemini 3.6 Flash Lite' },
  ]},
  { group: 'Ollama local (vision, CPU)', models: [
    { id: 'moondream', label: 'Moondream (1.7 GB, lento)' },
    { id: 'llava', label: 'LLaVA 7B (4.7 GB)' },
  ]},
];

const LOCAL_MODELS = [
  { id: 'gemma3:4b', label: 'Gemma 3 4B' },
  { id: 'llama3', label: 'Llama 3' },
  { id: 'mistral', label: 'Mistral 7B' },
  { id: 'phi3', label: 'Phi-3 Mini' },
  { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B' },
];

export default function AISettingsPanel({ onClose, campaignId }: AISettingsPanelProps) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null } | null>(null);
  const [saveError, setSaveError] = useState('');
  const [vaultStatus, setVaultStatus] = useState<Record<string, boolean>>({});
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [audit, setAudit] = useState<AIAuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [billing, setBilling] = useState<AIBilling | null>(null);

  useEffect(() => {
    Promise.all([api.ai.getConfig(), api.vault.status(), api.ai.usage()])
      .then(([cfg, vs, ug]) => {
        setSettings(cfg);
        setVaultStatus(vs);
        setUsage(ug);
      })
      .catch(() => setSaveError('No se pudo cargar la configuración'));
  }, []);

  useEffect(() => {
    api.ai
      .billing(campaignId)
      .then(setBilling)
      .catch(() => setBilling(null));
  }, [campaignId]);

  if (!settings) {
    return (
      <HudPanel title="IA" panelId="ai-settings" onClose={onClose} defaultX={Math.max(8, window.innerWidth - 380)} defaultY={120} defaultWidth={360}>
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

  const handleAudit = async () => {
    setShowAudit((v) => !v);
    if (!showAudit) {
      try {
        const res = await api.ai.audit(25);
        setAudit(res.entries);
      } catch {
        setSaveError('No se pudo leer la auditoría');
      }
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
    <HudPanel title="IA" panelId="ai-settings" onClose={onClose} defaultX={Math.max(8, window.innerWidth - 380)} defaultY={120} defaultWidth={360}>
      <div className="space-y-3" data-testid="ai-settings-panel">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Proveedor
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
              URL de Ollama
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
              URL base de la API (compatible OpenAI)
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
                  Clave de API
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

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Tope diario por campaña
          </label>
          <input
            type="number"
            min={0}
            value={settings.daily_call_limit ?? 0}
            onChange={(e) => update({ daily_call_limit: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            data-testid="ai-daily-limit"
          />
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            Requests a la IA por día y campaña. 0 = sin tope. Protege tu API key
            (no es un cobro al jugador).
          </p>
          {usage && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5" data-testid="ai-usage">
              Hoy: {usage.usage.calls} llamadas
              {usage.limit > 0 && ` de ${usage.limit}`}
            </p>
          )}
        </div>

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

        <div className="pt-1 border-t border-[var(--bg-tertiary)]">
          <AIProfiles />
        </div>

        <div className="pt-1 border-t border-[var(--bg-tertiary)]" data-testid="ai-billing">
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={billing?.enabled ?? false}
              onChange={async (e) => {
                const enabled = e.target.checked;
                try {
                  await api.ai.setBilling({ enabled });
                  setBilling(await api.ai.billing(campaignId));
                } catch {
                  setSaveError('No se pudo cambiar la monetización');
                }
              }}
              data-testid="ai-billing-toggle"
            />
            Monetización
          </label>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            Apagada por defecto. Encendida, cada campaña tiene un plan con un
            límite de llamadas por día. El pago en sí no está conectado.
          </p>
          {billing?.enabled && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Hoy: {billing.usage?.calls ?? 0} llamadas
              {billing.quota ? ` de ${billing.quota}` : ''}
            </p>
          )}
        </div>

        <div className="pt-1 border-t border-[var(--bg-tertiary)]">
          <button
            type="button"
            onClick={handleAudit}
            className="text-[10px] px-2 py-1 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            data-testid="ai-audit-toggle"
          >
            {showAudit ? 'Ocultar auditoría' : 'Ver auditoría'}
          </button>

          {showAudit && (
            <div className="mt-2 space-y-1" data-testid="ai-audit-list">
              {audit.length === 0 && (
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Sin llamadas registradas.
                </p>
              )}
              {audit.map((e, i) => (
                <div
                  key={`${e.ts}-${i}`}
                  className="text-[10px] font-mono text-[var(--text-secondary)] flex gap-1.5"
                >
                  <span className={e.status === 'ok' ? 'text-emerald-400/80' : 'text-red-400/80'}>
                    {e.status}
                  </span>
                  <span className="text-[var(--text-primary)]">{e.agent}</span>
                  <span>{e.model || e.provider}</span>
                  <span>{e.latency_ms}ms</span>
                  <span className="opacity-60">#{e.prompt_sha.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </HudPanel>
  );
}
