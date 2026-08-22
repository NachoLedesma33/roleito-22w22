import { useState, useEffect, useCallback } from 'react';
import HudPanel from './HudPanel';
import { api, Session, Event, Character, NPC } from '@/lib/api';

interface RecapPanelProps {
  campaignId: string;
  onClose: () => void;
}

function groupEvents(events: Event[]): Record<string, Event[]> {
  const groups: Record<string, Event[]> = {};
  for (const e of events) {
    const key = e.type || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

function buildEntityMap(chars: Character[], npcList: NPC[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of chars) map[c.id] = c.name;
  for (const n of npcList) map[n.id] = n.name;
  return map;
}

const EVENT_LABELS: Record<string, string> = {
  COMBAT: 'Combat',
  DIALOGUE: 'Dialogue',
  MOVEMENT: 'Movement',
  DISCOVERY: 'Discovery',
  ACTION: 'Actions',
  DECISION: 'Decisions',
  NPC_ACTION: 'NPC Actions',
  WORLD_CHANGE: 'World Changes',
  other: 'Other',
};

function buildRecapMarkdown(
  session: Session,
  events: Event[],
  entityMap: Record<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`# Session ${session.number} — ${session.title || 'Untitled'}`);
  lines.push(`**Date:** ${session.date} | **Status:** ${session.status}`);
  lines.push('');

  if (events.length === 0) {
    lines.push('*No events recorded this session.*');
  } else {
    const grouped = groupEvents(events);
    for (const [type, evts] of Object.entries(grouped)) {
      lines.push(`## ${EVENT_LABELS[type] || type}`);
      for (const e of evts) {
        const actor = entityMap[e.actor_id] || e.actor_id;
        const target = e.target_id ? entityMap[e.target_id] || e.target_id : null;
        const targetPart = target ? ` → ${target}` : '';
        lines.push(`- **${actor}**${targetPart}: ${e.description}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export default function RecapPanel({ campaignId, onClose }: RecapPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [recap, setRecap] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    Promise.all([
      api.sessions.list(campaignId),
      api.characters.list(campaignId),
      api.npcs.list(campaignId),
    ])
      .then(([sess, chars, npcList]) => {
        setSessions(sess);
        setCharacters(chars);
        setNpcs(npcList);
        const active = sess.find((s) => s.status === 'ACTIVE') || sess[0];
        if (active) setSelectedSessionId(active.id);
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  useEffect(() => {
    if (!selectedSessionId) return;
    api.events.listBySession(campaignId, selectedSessionId)
      .then((evts) => {
        setEvents(evts);
        const selected = sessions.find((s) => s.id === selectedSessionId);
        const entityMap = buildEntityMap(characters, npcs);
        setRecap(buildRecapMarkdown(selected || sessions[0], evts, entityMap));
      })
      .catch(() => {
        setEvents([]);
        setRecap('No events found for this session.');
      });
  }, [selectedSessionId, campaignId, sessions, characters, npcs]);

  const handleSave = useCallback(async () => {
    if (!selectedSessionId) return;
    await api.sessions.update(campaignId, selectedSessionId, { summary: draft });
    setRecap(draft);
    setEditing(false);
    setSessions((prev) =>
      prev.map((s) => (s.id === selectedSessionId ? { ...s, summary: draft } : s)),
    );
  }, [campaignId, selectedSessionId, draft]);

  const handleExport = useCallback(() => {
    const blob = new Blob([recap], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sel = sessions.find((s) => s.id === selectedSessionId);
    a.download = `session-${sel?.number || 0}-recap.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recap, sessions, selectedSessionId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  if (loading) {
    return (
      <HudPanel title="Session Recap" onClose={onClose} defaultX={200} defaultY={120} width={400}>
        <p className="text-xs text-[var(--text-secondary)]">Loading...</p>
      </HudPanel>
    );
  }

  return (
    <HudPanel title="Session Recap" onClose={onClose} defaultX={200} defaultY={120} width={440}>
      <div className="space-y-3">
        {/* Session Selector */}
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Session</p>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full text-xs bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1.5 border border-[var(--bg-tertiary)] focus:border-[var(--accent)] focus:outline-none"
          >
            {sessions.length === 0 && <option value="">No sessions</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.number} — {s.title || 'Untitled'} ({s.date})
              </option>
            ))}
          </select>
        </div>

        {/* Session Info */}
        {selectedSession && (
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
            <span className={`px-1.5 py-0.5 rounded ${
              selectedSession.status === 'ACTIVE'
                ? 'bg-emerald-900/50 text-emerald-400'
                : selectedSession.status === 'COMPLETED'
                ? 'bg-blue-900/50 text-blue-400'
                : 'bg-[var(--bg-tertiary)]'
            }`}>
              {selectedSession.status}
            </span>
            <span>{events.length} events</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                className="flex-1 text-xs px-2 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors font-medium"
              >
                Save Summary
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-2 py-1.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setDraft(recap); setEditing(true); }}
                className="flex-1 text-xs px-2 py-1.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Edit Summary
              </button>
              <button
                onClick={handleExport}
                className="flex-1 text-xs px-2 py-1.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Export .md
              </button>
            </>
          )}
        </div>

        {/* Recap Content */}
        <div className="bg-[var(--bg-tertiary)]/30 rounded-lg p-3">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full h-64 text-xs bg-[var(--bg-primary)] text-[var(--text-primary)] rounded p-2 border border-[var(--bg-tertiary)] focus:border-[var(--accent)] focus:outline-none resize-none font-mono"
              spellCheck={false}
            />
          ) : (
            <div className="max-h-64 overflow-y-auto text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
              {recap || 'No recap available. Click "Edit Summary" to write one.'}
            </div>
          )}
        </div>

        {/* Event Summary */}
        {events.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">
              Event Breakdown
            </p>
            <div className="space-y-0.5">
              {Object.entries(groupEvents(events)).map(([type, evts]) => (
                <div
                  key={type}
                  className="flex items-center justify-between px-2 py-1 rounded text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <span className="text-[var(--text-secondary)]">
                    {EVENT_LABELS[type] || type}
                  </span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {evts.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
