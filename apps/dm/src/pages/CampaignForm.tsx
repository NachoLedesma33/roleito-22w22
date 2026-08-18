import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';

export default function CampaignForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      api.campaigns.get(id!)
        .then((c) => {
          setName(c.name);
          setDescription(c.description);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await api.campaigns.update(id!, { name, description });
        navigate(`/campaigns/${id}`);
      } else {
        const campaign = await api.campaigns.create({ name, description });
        navigate(`/campaigns/${campaign.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Edit Campaign' : 'New Campaign'}
      </h1>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="Campaign name"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-32 resize-none"
            placeholder="Describe your campaign..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
