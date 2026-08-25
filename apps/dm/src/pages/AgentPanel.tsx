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

type AgentResponse = {
  agent_id: string;
  status: string;
  data: SessionProcessResult | LoreResult | NarrationResult | null;
  error: string | null;
};

export default function AgentPanel() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'session' | 'lore' | 'narrate'>('session');
  const [sessionId, setSessionId] = useState('');
  const [question, setQuestion] = useState('');
  const [sceneDesc, setSceneDesc] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [moodHint, setMoodHint] = useState('');
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
      setError(e instanceof Error ? e.message : 'Failed');
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
      setError(e instanceof Error ? e.message : 'Failed');
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
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI Agents</h1>

      <div className="flex gap-2 mb-6">
        {(['session', 'lore', 'narrate'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null); setError(null); }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'session' ? 'Session Processor' : tab === 'lore' ? 'Lore Agent' : 'Narrator'}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {activeTab === 'session' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Session ID</label>
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
            {loading ? 'Processing...' : 'Process Session'}
          </button>
        </div>
      )}

      {activeTab === 'lore' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Question</label>
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
            {loading ? 'Querying...' : 'Ask Lore Agent'}
          </button>
        </div>
      )}

      {activeTab === 'narrate' && (
        <div className="grid gap-4 mb-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Scene Description</label>
            <textarea
              value={sceneDesc}
              onChange={(e) => setSceneDesc(e.target.value)}
              rows={3}
              placeholder="La bóveda antigua se extiende ante ustedes..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Current Action</label>
            <input
              type="text"
              value={currentAction}
              onChange={(e) => setCurrentAction(e.target.value)}
              placeholder="El grupo entra a la habitación..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Mood Hint</label>
            <input
              type="text"
              value={moodHint}
              onChange={(e) => setMoodHint(e.target.value)}
              placeholder="tense, mysterious, calm..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleNarrate}
            disabled={loading}
            className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Narration'}
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

          {activeTab === 'session' && result.data && 'summary' in result.data && (
            <SessionResult data={result.data as SessionProcessResult} />
          )}

          {activeTab === 'lore' && result.data && 'answer' in result.data && (
            <LoreResultView data={result.data as LoreResult} />
          )}

          {activeTab === 'narrate' && result.data && 'narration' in result.data && (
            <NarrationResultView data={result.data as NarrationResult} />
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
        <h3 className="text-sm font-semibold mb-1">Summary</h3>
        <p className="text-sm text-[var(--text-secondary)]">{data.summary}</p>
      </div>

      {data.events.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Events ({data.events.length})</h3>
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
          <h3 className="text-sm font-semibold mb-1">Thread Hooks</h3>
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
