import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';

export default function SessionForm() {
  const { id: campaignId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const isEdit = sessionId && sessionId !== 'new';
  const navigate = useNavigate();

  const [number, setNumber] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [summary, setSummary] = useState('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && campaignId && sessionId) {
      api.sessions.get(campaignId, sessionId)
        .then((s) => {
          setNumber(s.number);
          setDate(s.date);
          setTitle(s.title);
          setRawNotes(s.raw_notes);
          setSummary(s.summary);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (campaignId) {
      api.sessions.list(campaignId)
        .then((list) => {
          if (list.length > 0) {
            setNumber(Math.max(...list.map((s) => s.number)) + 1);
          }
        })
        .catch(() => {});
    }
  }, [campaignId, sessionId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim() || !campaignId) {
      setError('Date is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = { number, date, title, raw_notes: rawNotes, summary };
      if (isEdit) {
        await api.sessions.update(campaignId, sessionId!, data);
        navigate(`/campaigns/${campaignId}/sessions/${sessionId}`);
      } else {
        const sess = await api.sessions.create(campaignId, data);
        navigate(`/campaigns/${campaignId}/sessions/${sess.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Editar sesión' : 'Nueva sesión'}
      </h1>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Número</label>
            <input
              type="number"
              min={1}
              value={number}
              onChange={(e) => setNumber(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="Título de la sesión..."
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Notas crudas</label>
          <textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-32 resize-none"
            placeholder="Notas de la sesión, eventos, decisiones..."
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Resumen</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-24 resize-none"
            placeholder="Resumen de la sesión..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear sesión'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
