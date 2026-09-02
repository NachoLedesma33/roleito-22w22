import { useState, useRef, useEffect, useCallback } from 'react';
import HudPanel from './HudPanel';
import { api } from '@/lib/api';

interface DMAssistantProps {
  campaignId: string;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  entities?: string[];
  confidence?: number;
  source?: string;
}

export default function DMAssistant({ campaignId, onClose }: DMAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await api.agents.lore(campaignId, q);
      if (res.status === 'success' && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data!.answer,
            entities: res.data!.entities_mentioned,
            confidence: res.data!.confidence,
            source: res.data!.source_hint,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${res.error || 'No se pudo obtener respuesta'}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error de red al contactar el agente.' },
      ]);
    }
    setLoading(false);
  }, [campaignId, input, loading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <HudPanel title="DM Assistant" panelId="dm-assistant" onClose={onClose} defaultX={500} defaultY={150} defaultWidth={380}>
      <div className="flex flex-col gap-2" style={{ height: '400px' }}>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-2 pr-1"
          data-testid="dm-assistant-messages"
        >
          {messages.length === 0 && (
            <div className="text-[10px] text-[var(--text-secondary)] text-center py-8">
              <p className="mb-1 text-violet-400">Asistente de IA</p>
              <p>Preguntale sobre el lore de tu campaña,</p>
              <p>personajes, ubicaciones, eventos...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-xs rounded-lg px-2.5 py-2 ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)]/20 text-[var(--text-primary)] ml-6'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] mr-6'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.role === 'assistant' && msg.entities && msg.entities.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-[var(--bg-tertiary)]">
                  <div className="flex flex-wrap gap-1">
                    {msg.entities.map((e, j) => (
                      <span
                        key={j}
                        className="text-[9px] px-1 py-0.5 rounded bg-violet-900/30 text-violet-400"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                  {msg.confidence !== undefined && (
                    <div className="text-[9px] text-[var(--text-secondary)] mt-1">
                      Confidence: {Math.round(msg.confidence * 100)}%
                      {msg.source && ` · Source: ${msg.source}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-2 mr-6 animate-pulse">
              Pensando...
            </div>
          )}
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntale algo a tu campaña..."
            disabled={loading}
            className="flex-1 text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2.5 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
            data-testid="dm-assistant-input"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="text-xs px-3 py-1.5 rounded bg-violet-800/60 text-violet-300 hover:bg-violet-800 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : '→'}
          </button>
        </div>
      </div>
    </HudPanel>
  );
}
