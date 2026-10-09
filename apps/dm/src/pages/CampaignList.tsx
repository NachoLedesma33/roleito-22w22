import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, Campaign } from '@/lib/api';

const COVER_FALLBACK = '/ui/22w22-logo-roleito.jpg';
const VIDEO_BG_SRC = '/ui/22w22background.mp4';

export default function CampaignList() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'delete' | 'edit' | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.campaigns.list()
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === campaigns.length) {
        return new Set();
      }
      return new Set(campaigns.map((c) => c.id));
    });
  }, [campaigns]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return;
    await api.campaigns.delete(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} campaign(s)?`)) return;
    await api.campaigns.bulkDelete(ids);
    setCampaigns((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const handleBulkEdit = async () => {
    const ids = Array.from(selectedIds);
    const data: { name?: string; description?: string } = {};
    if (editName.trim()) data.name = editName.trim();
    if (editDescription.trim()) data.description = editDescription.trim();
    if (Object.keys(data).length === 0) {
      setBulkAction(null);
      return;
    }
    await api.campaigns.bulkUpdate(ids, data);
    setCampaigns((prev) =>
      prev.map((c) => {
        if (!selectedIds.has(c.id)) return c;
        return { ...c, ...data };
      })
    );
    setSelectedIds(new Set());
    setBulkAction(null);
    setEditName('');
    setEditDescription('');
  };

  const handleExport = async (id: string) => {
    const data = await api.campaigns.export(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkExportAll = async () => {
    const ids = Array.from(selectedIds);
    const data = await api.campaigns.bulkExport(ids);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-bulk-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkExportIndividual = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleExport(id);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      const campaign = await api.campaigns.import(data);
      navigate(`/campaigns/${campaign.id}`);
    };
    input.click();
  };

  const openBulkEdit = () => {
    setEditName('');
    setEditDescription('');
    setBulkAction('edit');
  };

  if (loading) return <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

  const hasSelection = selectedIds.size > 0;
  const allSelected = campaigns.length > 0 && selectedIds.size === campaigns.length;

  return (
    <div className="relative">
      <video
        src={VIDEO_BG_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover bg-[var(--bg)] pointer-events-none"
      />
      <div className="fixed inset-0 bg-black/70 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('lobby.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {campaigns.length} {campaigns.length === 1 ? 'campaña' : 'campañas'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setSelectMode((v) => !v)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              selectMode
                ? 'bg-[var(--accent)] text-[var(--on-brand)] shadow-md'
                : 'bg-[var(--surface)] border border-[var(--bg-tertiary)] shadow-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('lobby.select')}
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 text-sm rounded bg-[var(--surface)] border border-[var(--bg-tertiary)] shadow-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('lobby.import')}
          </button>
          <Link
            to="/campaigns/new"
            className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-[var(--on-brand)] hover:bg-[var(--accent-hover)] shadow-md transition-colors"
          >
            {t('lobby.newCampaign')}
          </Link>
        </div>
      </div>

      {selectMode && (
        <>
          {hasSelection && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent)] flex items-center gap-4">
              <span className="text-sm text-[var(--text-primary)]">
                {selectedIds.size} seleccionadas
              </span>
              <button
                onClick={handleBulkDelete}
                className="text-xs px-3 py-1.5 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={handleBulkExportAll}
                className="text-xs px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Exportar (combinado)
              </button>
              <button
                onClick={handleBulkExportIndividual}
                className="text-xs px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Exportar (individual)
              </button>
              <button
                onClick={openBulkEdit}
                className="text-xs px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Editar
              </button>
              <button
                onClick={clearSelection}
                className="text-xs px-3 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Limpiar
              </button>
            </div>
          )}

          {bulkAction === 'edit' && (
            <div className="mb-4 p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                Editar {selectedIds.size} campaña(s)
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nuevo nombre (vacío = mantener)"
                  className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Nueva descripción (vacío = mantener)"
                  className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkEdit}
                    className="px-3 py-1.5 text-sm rounded bg-[var(--accent)] text-[var(--on-brand)] hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Aplicar
                  </button>
                  <button
                    onClick={() => setBulkAction(null)}
                    className="px-3 py-1.5 text-sm rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">Todavía no hay campañas</p>
          <p className="text-sm">Creá una o importá una campaña existente.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {selectMode && (
            <label className="flex items-center gap-2 px-1 py-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </label>
          )}
          {campaigns.map((c) => (
            <div
              key={c.id}
              data-testid="campaign-card"
              className={`group relative rounded-xl overflow-hidden border bg-[var(--surface)] transition-colors ${
                selectedIds.has(c.id)
                  ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40'
                  : 'border-[var(--bg-tertiary)] hover:border-[var(--accent)]'
              }`}
            >
              <div className="relative aspect-[16/9]">
                <img
                  src={COVER_FALLBACK}
                  alt=""
                  className="h-full w-full object-cover opacity-50 transition-opacity group-hover:opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/30 to-transparent" />
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="absolute top-3 left-3 w-4 h-4 rounded border-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="block hover:opacity-90 transition-opacity"
                  >
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                      {c.name}
                    </h2>
                    {c.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-secondary)] mt-2 opacity-60">
                      {t('lobby.updatedAt')} {new Date(c.updated_at).toLocaleDateString()}
                    </p>
                  </Link>
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      to={`/campaigns/${c.id}`}
                      className="px-3 py-1.5 text-sm rounded bg-[var(--accent)] text-[var(--on-brand)] hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      {t('common.continue')}
                    </Link>
                    <Link
                      to={`/campaigns/${c.id}/manage`}
                      className="px-3 py-1.5 text-sm rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {t('common.manage')}
                    </Link>
                    {!selectMode && (
                      <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleExport(c.id)}
                          className="px-2 py-1 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          Exportar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 text-xs rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Link
            to="/campaigns/new"
            className="rounded-xl border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] bg-[var(--surface)]/60 flex flex-col items-center justify-center gap-2 aspect-[16/9] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            <span className="text-3xl leading-none">+</span>
            <span className="text-sm">{t('lobby.newCampaign')}</span>
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}