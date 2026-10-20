import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiPost } from '@/lib/api';

interface SessionProcessResult {
  summary: string;
  events: { type: string; description: string; actors: string[]; importance: string }[];
  entities: {
    characters: { name: string; status: string }[];
    npcs: { name: string; status: string }[];
    locations: { name: string; type: string }[];
    items: { name: string; found_by: string | null }[];
  };
  thread_hooks: string[];
  character_changes: { character: string; change: string }[];
}

interface LoreResult {
  answer: string;
  entities_mentioned: string[];
  confidence: number;
  related_topics: string[];
  source_hint: string;
}

interface NarrationResult {
  narration: string;
  mood: string;
  environmental_cues: string[];
  suggested_effects: string[];
}

interface IngestResult {
  title: string;
  body: string;
  source: string;
  chars: number;
  segments: string[];
}

interface WorldStateResult {
  answer: string;
  positions: { name: string; location: string }[];
  active_quests: string[];
  confidence: number;
}

/** El estado real sobre el que respondio el agente (para no tomar su respuesta por un invento). */
interface WorldStateSnapshot {
  characters: { name: string; location: string }[];
  npcs: { name: string; location: string }[];
  locations: { name: string; description: string }[];
  quests: { title: string; status: string }[];
}

interface SceneResult {
  environment: string;
  lighting: string;
  atmosphere: Record<string, string>;
  structures: string[];
  mood: string;
}

type AgentResponse = {
  agent_id: string;
  status: string;
  data:
    | SessionProcessResult
    | LoreResult
    | NarrationResult
    | IngestResult
    | WorldStateResult
    | SceneResult
    | null;
  state?: WorldStateSnapshot;
  error: string | null;
};

type Tab = 'session' | 'lore' | 'narrate' | 'ingest' | 'worldState' | 'scene';

const TAB_LABELS: Record<Tab, string> = {
  session: 'Procesador de sesión',
  lore: 'Agente de Lore',
  narrate: 'Narrador',
  ingest: 'Ingesta',
  worldState: 'Estado del mundo',
  scene: 'Diseñador de escena',
};

const TABS: Tab[] = ['session', 'lore', 'narrate', 'ingest', 'worldState', 'scene'];

export default function AgentPanel() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('session');
  const [sessionId, setSessionId] = useState('');
  const [question, setQuestion] = useState('');
  const [sceneDesc, setSceneDesc] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [moodHint, setMoodHint] = useState('');
  const [ingestText, setIngestText] = useState('');
  const [worldQuestion, setWorldQuestion] = useState('');
  const [sceneConfigDesc, setSceneConfigDesc] = useState('');
  const [sceneMood, setSceneMood] = useState('');
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessSession = async () => {
    if (!campaignId || !sessionId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<AgentResponse>(
        `/campaigns/${campaignId}/agents/process-session`,
        { session_id: sessionId.trim() }
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo');
    } finally {
      setLoading(false);
    }
  };

  const handleLoreQuery = async () => {
    if (!campaignId || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<AgentResponse>(
        `/campaigns/${campaignId}/agents/lore`,
        { question: question.trim() }
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo');
    } finally {
      setLoading(false);
    }
  };

  const handleNarrate = async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<AgentResponse>(
        `/campaigns/${campaignId}/agents/narrate`,
        {
          scene_description: sceneDesc.trim() || undefined,
          current_action: currentAction.trim() || undefined,
          mood_hint: moodHint.trim() || undefined,
        }
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo');
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!campaignId || !ingestText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<AgentResponse>(
        `/campaigns/${campaignId}/agents/ingest`,
        { text: ingestText }
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo');
    } finally {
      setLoading(false);
    }
  };

  const handleWorldState = async () => {
    if (!campaignId || !worldQuestion.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<AgentResponse>(
        `/campaigns/${campaignId}/agents/world-state`,
        { question: worldQuestion.trim() }
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo');
    } finally {
      setLoading(false);
    }
  };

  const handleScene = async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<AgentResponse>(
        `/campaigns/${campaignId}/agents/scene`,
        { scene_description: sceneConfigDesc.trim(), mood: sceneMood.trim() }
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agentes de IA</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null); setError(null); }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {activeTab === 'session' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">ID de sesión</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="session-..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleProcessSession}
            disabled={loading || !sessionId.trim()}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Procesar sesión'}
          </button>
        </div>
      )}

      {activeTab === 'lore' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Pregunta</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Qué sabes sobre la bóveda?"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleLoreQuery}
            disabled={loading || !question.trim()}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Consultando...' : 'Consultar al Agente de Lore'}
          </button>
        </div>
      )}

      {activeTab === 'narrate' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Descripción de la escena</label>
            <textarea
              value={sceneDesc}
              onChange={(e) => setSceneDesc(e.target.value)}
              rows={3}
              placeholder="La bóveda antigua se extiende ante ustedes..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Acción actual</label>
            <input
              type="text"
              value={currentAction}
              onChange={(e) => setCurrentAction(e.target.value)}
              placeholder="El grupo entra a la habitación..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Pista de ambiente</label>
            <input
              type="text"
              value={moodHint}
              onChange={(e) => setMoodHint(e.target.value)}
              placeholder="tenso, misterioso, tranquilo..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleNarrate}
            disabled={loading}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar narración'}
          </button>
        </div>
      )}

      {activeTab === 'ingest' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Notas o documento</label>
            <textarea
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              rows={6}
              placeholder="Las notas crudas de la sesión..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm resize-y"
            />
          </div>
          <button
            onClick={handleIngest}
            disabled={loading || !ingestText.trim()}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Normalizando...' : 'Normalizar y segmentar'}
          </button>
        </div>
      )}

      {activeTab === 'worldState' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Pregunta sobre el estado</label>
            <input
              type="text"
              value={worldQuestion}
              onChange={(e) => setWorldQuestion(e.target.value)}
              placeholder="¿Dónde está el grupo?"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleWorldState}
            disabled={loading || !worldQuestion.trim()}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Consultando...' : 'Consultar el estado'}
          </button>
        </div>
      )}

      {activeTab === 'scene' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Descripción de la escena</label>
            <textarea
              value={sceneConfigDesc}
              onChange={(e) => setSceneConfigDesc(e.target.value)}
              rows={3}
              placeholder="Una cripta inundada de agua negra..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Ángulo deseado</label>
            <input
              type="text"
              value={sceneMood}
              onChange={(e) => setSceneMood(e.target.value)}
              placeholder="inquietante, solemne..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleScene}
            disabled={loading || !sceneConfigDesc.trim()}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Proponiendo...' : 'Proponer configuración'}
          </button>
        </div>
      )}

      {result && (
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              {result.agent_id}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              result.status === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}>
              {result.status}
            </span>
          </div>

          {/* La vista se elige por agent_id y no por el tab: lore y world-state
              devuelven los mismos campos (answer) y se confundirian. */}
          {result.agent_id === 'session-processor' && result.data && 'summary' in result.data && (
            <SessionResult data={result.data as SessionProcessResult} />
          )}

          {result.agent_id === 'lore' && result.data && 'answer' in result.data && (
            <LoreResultView data={result.data as LoreResult} />
          )}

          {result.agent_id === 'narrator' && result.data && 'narration' in result.data && (
            <NarrationResultView data={result.data as NarrationResult} />
          )}

          {result.agent_id === 'ingestion' && result.data && 'segments' in result.data && (
            <IngestResultView data={result.data as IngestResult} />
          )}

          {result.agent_id === 'world-state' && result.data && 'answer' in result.data && (
            <WorldStateResultView data={result.data as WorldStateResult} state={result.state} />
          )}

          {result.agent_id === 'scene' && result.data && 'environment' in result.data && (
            <SceneResultView data={result.data as SceneResult} />
          )}
        </div>
      )}
    </div>
  );
}

function SessionResult({ data }: { data: SessionProcessResult }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Resumen</h3>
        <p className="text-sm text-[var(--text-secondary)]">{data.summary}</p>
      </div>

      {data.events.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Eventos ({data.events.length})</h3>
          <div className="space-y-1">
            {data.events.map((e, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded ${
                  e.importance === 'CRITICAL' ? 'bg-red-900/50 text-red-400' :
                  e.importance === 'HIGH' ? 'bg-orange-900/50 text-orange-400' :
                  'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}>
                  {e.type.replace(/_/g, ' ')}
                </span>
                <span>{e.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.thread_hooks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Ganchos de hilo</h3>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1">
            {data.thread_hooks.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function LoreResultView({ data }: { data: LoreResult }) {
  return (
    <div className="space-y-3">
      <p className="text-sm">{data.answer}</p>
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span>Confidence: {Math.round(data.confidence * 100)}%</span>
        {data.source_hint && <span>Source: {data.source_hint}</span>}
      </div>
      {data.entities_mentioned.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)]">
          Entities: {data.entities_mentioned.join(', ')}
        </div>
      )}
    </div>
  );
}

function NarrationResultView({ data }: { data: NarrationResult }) {
  return (
    <div className="space-y-3">
      <div className="text-sm whitespace-pre-wrap leading-relaxed italic">
        {data.narration}
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)]">Mood: {data.mood}</span>
      </div>
      {data.environmental_cues.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)]">
          Cues: {data.environmental_cues.join(', ')}
        </div>
      )}
      {data.suggested_effects.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)]">
          Effects: {data.suggested_effects.join(', ')}
        </div>
      )}
    </div>
  );
}

function IngestResultView({ data }: { data: IngestResult }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span>{data.chars} caracteres</span>
        <span>{data.segments.length} segmentos</span>
        <span>origen: {data.source}</span>
      </div>
      {data.segments.length > 0 && (
        <div className="space-y-2">
          {data.segments.map((seg, i) => (
            <div key={i} className="text-xs text-[var(--text-secondary)] border-l-2 border-[var(--bg-tertiary)] pl-2">
              {seg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorldStateResultView({ data, state }: { data: WorldStateResult; state?: WorldStateSnapshot }) {
  return (
    <div className="space-y-3">
      <p className="text-sm">{data.answer}</p>
      <div className="text-xs text-[var(--text-secondary)]">
        Confidence: {Math.round(data.confidence * 100)}%
      </div>
      {state && (
        <div className="text-xs text-[var(--text-secondary)] space-y-1">
          <div>El agente respondió sobre este estado:</div>
          {state.characters.length > 0 && (
            <div>
              Personajes: {state.characters.map((c) => `${c.name} (${c.location})`).join(', ')}
            </div>
          )}
          {state.quests.length > 0 && (
            <div>
              Misiones: {state.quests.map((q) => `${q.title} [${q.status}]`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SceneResultView({ data }: { data: SceneResult }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)]">Entorno: {data.environment}</span>
        <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)]">Luz: {data.lighting}</span>
        <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)]">Ángulo: {data.mood}</span>
      </div>
      {Object.keys(data.atmosphere).length > 0 && (
        <div className="text-xs text-[var(--text-secondary)]">
          Ambiente: {Object.entries(data.atmosphere).map(([k, v]) => `${k}: ${v}`).join(', ')}
        </div>
      )}
      {data.structures.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)]">
          Estructuras: {data.structures.join(', ')}
        </div>
      )}
    </div>
  );
}
