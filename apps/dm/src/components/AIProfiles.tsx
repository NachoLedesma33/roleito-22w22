import { useEffect, useState } from 'react';
import { api, AIAdapter, AIModel, AIProfile } from '@/lib/api';

const AGENT_LABELS: Record<string, string> = {
  'session-processor': 'Procesador de sesión',
  lore: 'Lore',
  narrator: 'Narrador',
  recap: 'Recap',
  'world-state': 'Estado del mundo',
  scene: 'Escena',
  ingestion: 'Ingesta',
  'narrative-parser': 'Parser de narrativa',
  'wall-detection': 'Detección de paredes',
};

interface Draft {
  id: string;
  adapter: string;
  base_url: string;
  model: string;
  label: string;
  key_ref: string;
}

const EMPTY_DRAFT: Draft = {
  id: '',
  adapter: 'openai_compatible',
  base_url: '',
  model: '',
  label: '',
  key_ref: '',
};

/**
 * Los perfiles de proveedor: a quién le pregunto.
 *
 * La key se guarda en el vault (por el `key_ref` del perfil) y nunca vuelve
 * en una respuesta: la UI solo sabe si hay key.
 */
export default function AIProfiles() {
  const [adapters, setAdapters] = useState<AIAdapter[]>([]);
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [defaultProfile, setDefaultProfile] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelSource, setModelSource] = useState<'discovered' | 'manual'>('manual');
  const [agentModels, setAgentModels] = useState<Record<string, string | null>>({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = async () => {
    try {
      const [adaptersRes, profilesRes, agentsRes] = await Promise.all([
        api.ai.adapters(),
        api.ai.profiles(),
        api.ai.agentModels(),
      ]);
      setAdapters(adaptersRes.adapters);
      setProfiles(profilesRes.profiles);
      setDefaultProfile(profilesRes.default_profile);
      setAgentModels(agentsRes.agents);
    } catch {
      setError('No se pudieron cargar los perfiles');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const current = profiles.find((p) => p.id === selected) || null;

  const startNew = () => {
    setSelected(null);
    setDraft(EMPTY_DRAFT);
    setModels([]);
    setModelSource('manual');
    setApiKey('');
    setError('');
  };

  const edit = (profile: AIProfile) => {
    setSelected(profile.id);
    setDraft({
      id: profile.id,
      adapter: profile.adapter,
      base_url: profile.base_url,
      model: profile.model || '',
      label: profile.label,
      key_ref: profile.key_ref || profile.id,
    });
    setModels([]);
    setModelSource('manual');
    setApiKey('');
    setError('');
  };

  const discover = async () => {
    setError('');
    setInfo('');
    try {
      const res = await api.ai.models(draft.id || undefined);
      setModels(res.models);
      setModelSource(res.source);
      if (res.source === 'manual') {
        setInfo('Este proveedor no expone la lista de modelos: escribí el id a mano.');
      }
    } catch {
      setError('No se pudo descubrir los modelos');
    }
  };

  const save = async () => {
    setError('');
    try {
      const payload = {
        adapter: draft.adapter,
        base_url: draft.base_url,
        model: draft.model || null,
        label: draft.label || draft.id,
        key_ref: draft.key_ref || draft.id,
      };
      if (selected) {
        await api.ai.updateProfile(selected, payload);
      } else {
        await api.ai.createProfile({ ...payload, id: draft.id });
      }
      if (apiKey.trim()) {
        // La key va al vault, con el nombre del perfil.
        await api.vault.store(draft.key_ref || draft.id, apiKey.trim());
        setApiKey('');
      }
      await load();
      setInfo('Perfil guardado.');
    } catch {
      setError('No se pudo guardar el perfil');
    }
  };

  const remove = async () => {
    if (!selected) return;
    setError('');
    try {
      await api.ai.deleteProfile(selected);
      startNew();
      await load();
      setInfo('Perfil borrado.');
    } catch {
      setError('No se pudo borrar el perfil');
    }
  };

  const setDefault = async (id: string) => {
    setError('');
    try {
      await api.ai.setAgentModels(
        Object.fromEntries(Object.entries(agentModels).filter(([, v]) => v)) as Record<string, string>,
        id,
      );
      await load();
    } catch {
      setError('No se pudo cambiar el perfil por defecto');
    }
  };

  const changeAgent = async (agentId: string, profileId: string) => {
    setError('');
    const next = { ...agentModels, [agentId]: profileId || null };
    setAgentModels(next);
    try {
      await api.ai.setAgentModels(
        Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Record<string, string>,
      );
    } catch {
      setError('No se pudo guardar el modelo por agente');
    }
  };

  const adapterMeta = adapters.find((a) => a.id === draft.adapter);

  return (
    <div className="space-y-3" data-testid="ai-profiles">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
          Perfiles de proveedor
        </span>
        <button
          type="button"
          onClick={startNew}
          className="text-[10px] px-2 py-1 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          data-testid="ai-profile-new"
        >
          Nuevo
        </button>
      </div>

      <div className="space-y-1">
        {profiles.length > 0 && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex-1 text-[var(--text-secondary)]">Perfil por defecto</span>
            <select
              value={defaultProfile}
              onChange={(e) => void setDefault(e.target.value)}
              className="text-[10px] bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-1 text-[var(--text-primary)]"
              data-testid="ai-default-profile"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label || p.id}
                </option>
              ))}
            </select>
          </div>
        )}
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded border cursor-pointer ${
              selected === p.id
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
            onClick={() => edit(p)}
            data-testid={`ai-profile-${p.id}`}
          >
            <span className="font-medium">{p.label || p.id}</span>
            <span className="opacity-70">{p.adapter}</span>
            {p.model && <span className="opacity-70">{p.model}</span>}
            <span className="ml-auto">
              {p.has_key ? 'con key' : 'sin key'}
              {p.id === defaultProfile ? ' · default' : ''}
            </span>
          </div>
        ))}
        {profiles.length === 0 && (
          <p className="text-[10px] text-[var(--text-secondary)]">Sin perfiles todavía.</p>
        )}
      </div>

      <div className="space-y-2 border-t border-[var(--bg-tertiary)] pt-2">
        {!selected && (
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              Nombre del perfil
            </label>
            <input
              type="text"
              value={draft.id}
              onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase() })}
              placeholder="groq"
              className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              data-testid="ai-profile-id"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Adapter
          </label>
          <select
            value={draft.adapter}
            onChange={(e) => setDraft({ ...draft, adapter: e.target.value })}
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            data-testid="ai-profile-adapter"
          >
            {adapters.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          {adapterMeta && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">{adapterMeta.covers}</p>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            URL base
          </label>
          <input
            type="text"
            value={draft.base_url}
            onChange={(e) => setDraft({ ...draft, base_url: e.target.value })}
            placeholder="https://api.groq.com/openai/v1"
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            data-testid="ai-profile-url"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Clave de API
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={current?.has_key ? 'Guardada en el Vault (escribí para cambiarla)' : 'sk-...'}
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            data-testid="ai-profile-key"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Modelo
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              placeholder="llama-3.1-8b-instant"
              className="flex-1 text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              data-testid="ai-profile-model"
            />
            <button
              type="button"
              onClick={discover}
              className="text-[10px] px-2 py-1 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              data-testid="ai-profile-discover"
            >
              Descubrir
            </button>
          </div>
          {modelSource === 'discovered' && models.length > 0 && (
            <select
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              className="w-full text-xs mt-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              data-testid="ai-profile-models"
            >
              <option value="">Elegí un modelo</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} ({m.id})
                </option>
              ))}
            </select>
          )}
        </div>

        {adapterMeta?.external && (
          <p
            className="text-[10px] text-amber-500/80"
            data-testid="ai-profile-privacy"
          >
            Este proveedor externo recibe el texto de tu campaña.
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            className="flex-1 text-xs px-2 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
            data-testid="ai-profile-save"
          >
            Guardar perfil
          </button>
          {selected && (
            <button
              type="button"
              onClick={remove}
              className="text-[10px] px-2 py-1.5 rounded border border-red-800/50 text-red-400 hover:bg-red-950/50 transition-colors"
              data-testid="ai-profile-delete"
            >
              Borrar
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 border-t border-[var(--bg-tertiary)] pt-2">
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
          Modelo por agente
        </span>
        {Object.entries(AGENT_LABELS).map(([agentId, label]) => (
          <div key={agentId} className="flex items-center gap-2 text-[10px]">
            <span className="flex-1 text-[var(--text-secondary)]">{label}</span>
            <select
              value={agentModels[agentId] || ''}
              onChange={(e) => void changeAgent(agentId, e.target.value)}
              className="text-[10px] bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-1 text-[var(--text-primary)]"
              data-testid={`ai-agent-model-${agentId}`}
            >
              <option value="">usar el default</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label || p.id}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="text-[10px] text-[var(--text-secondary)]" role="status">
          {info}
        </p>
      )}
    </div>
  );
}
