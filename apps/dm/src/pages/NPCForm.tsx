import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { VidaAttr } from '@/lib/api';
import { VidaAttrsInput, NumberInput } from '@/components/VidaInputs';
import { Button } from '@/components/ui/Button';

export default function NPCForm() {
  const { t } = useTranslation();
  const { id: campaignId, npcId } = useParams<{ id: string; npcId: string }>();
  const isEdit = npcId && npcId !== 'new';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vigor, setVigor] = useState<VidaAttr>('/');
  const [intelligence, setIntelligence] = useState<VidaAttr>('/');
  const [dexterity, setDexterity] = useState<VidaAttr>('/');
  const [cunning, setCunning] = useState<VidaAttr>('/');
  const [maxPv, setMaxPv] = useState(10);
  const [maxPm, setMaxPm] = useState(10);
  const [defense, setDefense] = useState(5);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && campaignId && npcId) {
      api.npcs.get(campaignId, npcId)
        .then((n) => {
          setName(n.name);
          setDescription(n.description);
          setVigor(n.vigor);
          setIntelligence(n.intelligence);
          setDexterity(n.dexterity);
          setCunning(n.cunning);
          setMaxPv(n.max_pv);
          setMaxPm(n.max_pm);
          setDefense(n.defense);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [campaignId, npcId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !campaignId) {
      setError(t('npcForm.nameRequired', 'El nombre es obligatorio'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        name,
        description,
        vigor,
        intelligence,
        dexterity,
        cunning,
        max_pv: maxPv,
        max_pm: maxPm,
        defense,
      };
      if (isEdit) {
        await api.npcs.update(campaignId, npcId!, data);
        navigate(`/campaigns/${campaignId}/npcs/${npcId}`);
      } else {
        const npc = await api.npcs.create(campaignId, data);
        navigate(`/campaigns/${campaignId}/npcs/${npc.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('npcForm.saveError', 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? t('npcForm.titleEdit', 'Editar PNJ') : t('npcForm.titleNew', 'Nuevo PNJ')}
      </h1>

      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('npcForm.name', 'Nombre')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            placeholder={t('npcForm.namePlaceholder', 'Nombre del PNJ')}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('npcForm.description', 'Descripción')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-24 resize-none"
            placeholder={t('npcForm.descriptionPlaceholder', '¿Quién es este PNJ?')}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">{t('npcForm.attributes', 'Atributos (VIDA)')}</label>
          <VidaAttrsInput
            vigor={vigor}
            intelligence={intelligence}
            dexterity={dexterity}
            cunning={cunning}
            onChange={(attr, v) => {
              if (attr === 'vigor') setVigor(v);
              else if (attr === 'intelligence') setIntelligence(v);
              else if (attr === 'dexterity') setDexterity(v);
              else setCunning(v);
            }}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">{t('npcForm.stats', 'Características')}</label>
          <div className="grid grid-cols-3 gap-3">
            <NumberInput label={t('npcForm.maxPv', 'Max PV')} value={maxPv} onChange={setMaxPv} />
            <NumberInput label={t('npcForm.maxPm', 'Max PM')} value={maxPm} onChange={setMaxPm} />
            <NumberInput label={t('npcForm.defense', 'Defensa')} value={defense} onChange={setDefense} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? t('npcForm.saving', 'Guardando...')
              : isEdit
                ? t('npcForm.save', 'Guardar cambios')
                : t('npcForm.create', 'Crear PNJ')}
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
