import { useState, useRef, useEffect } from 'react';
import HudPanel from './HudPanel';

interface LogEntry {
  id: string;
  time: string;
  text: string;
}

interface SessionLogHudProps {
  sessionId: string | null;
  sessionTitle: string;
  onClose: () => void;
}

export default function SessionLogHud({ sessionId, sessionTitle, onClose }: SessionLogHudProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setEntries((prev) => [...prev, { id: crypto.randomUUID(), time, text }]);
    setInput('');
  };

  return (
    <HudPanel
      title={`Session Log${sessionTitle ? ` — ${sessionTitle}` : ''}`}
      panelId="session-log"
      onClose={onClose}
      defaultX={window.innerWidth - 340}
      defaultY={80}
      defaultWidth={320}
    >
      {!sessionId && (
        <p className="text-[10px] text-[var(--text-secondary)] mb-2 italic">
          No active session
        </p>
      )}
      <div ref={scrollRef} className="space-y-2 max-h-60 overflow-y-auto mb-2">
        {entries.length === 0 && (
          <p className="text-[10px] text-[var(--text-secondary)] italic">
            No entries yet. Add a note below.
          </p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="text-xs">
            <span className="text-[var(--text-secondary)] mr-1.5">{entry.time}</span>
            <span className="text-[var(--text-primary)]">{entry.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add note..."
          className="flex-1 text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          +
        </button>
      </div>
    </HudPanel>
  );
}
