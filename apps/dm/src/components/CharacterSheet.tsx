import { useState, useCallback, useRef } from 'react';
import HudPanel from './HudPanel';
import { api, Character, NPC, InventoryItem, Spell } from '@/lib/api';

interface CharacterSheetProps {
  entity: Character | NPC;
  entityType: 'character' | 'npc';
  campaignId: string;
  onUpdate: (updated: Character | NPC) => void;
  onClose: () => void;
}

function portraitUrl(path: string | null): string | null {
  if (!path) return null;
  return `http://localhost:8000/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

function genId(): string {
  return crypto.randomUUID();
}

type Tab = 'stats' | 'inventory' | 'spells';

export default function CharacterSheet({
  entity,
  entityType,
  campaignId,
  onUpdate,
  onClose,
}: CharacterSheetProps) {
  const [tab, setTab] = useState<Tab>('stats');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(entity.description);
  const [currentHp, setCurrentHp] = useState(entity.current_pv ?? entity.max_pv);
  const [currentPm, setCurrentPm] = useState(entity.current_pm ?? entity.max_pm);
  const fileInput = useRef<HTMLInputElement>(null);

  const inventory: InventoryItem[] = entity.inventory_json || [];
  const spells: Spell[] = entity.spells_json || [];
  const pUrl = portraitUrl(entity.portrait_path);

  const handlePortraitUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (entityType === 'character') {
        const updated = await api.characters.uploadPortrait(campaignId, entity.id, file);
        onUpdate(updated);
      } else {
        const updated = await api.npcs.uploadPortrait(campaignId, entity.id, file);
        onUpdate(updated);
      }
    } catch {
      // portrait upload failure is non-fatal; keep current portrait
    }
    e.target.value = '';
  }, [campaignId, entity.id, entityType, onUpdate]);

  const handleSaveHp = useCallback(async () => {
    const clamped = Math.max(0, Math.min(entity.max_pv, currentHp));
    setCurrentHp(clamped);
    if (entityType === 'character') {
      const updated = await api.characters.update(campaignId, entity.id, { current_pv: clamped });
      onUpdate(updated);
    } else {
      const updated = await api.npcs.update(campaignId, entity.id, { current_pv: clamped });
      onUpdate(updated);
    }
  }, [campaignId, entity, currentHp, entityType, onUpdate]);

  const handleSavePm = useCallback(async () => {
    const clamped = Math.max(0, Math.min(entity.max_pm, currentPm));
    setCurrentPm(clamped);
    if (entityType === 'character') {
      const updated = await api.characters.update(campaignId, entity.id, { current_pm: clamped });
      onUpdate(updated);
    } else {
      const updated = await api.npcs.update(campaignId, entity.id, { current_pm: clamped });
      onUpdate(updated);
    }
  }, [campaignId, entity, currentPm, entityType, onUpdate]);

  const handleSaveDescription = useCallback(async () => {
    setEditingDesc(false);
    if (descDraft === entity.description) return;
    if (entityType === 'character') {
      const updated = await api.characters.update(campaignId, entity.id, { description: descDraft });
      onUpdate(updated);
    } else {
      const updated = await api.npcs.update(campaignId, entity.id, { description: descDraft });
      onUpdate(updated);
    }
  }, [campaignId, entity, descDraft, entityType, onUpdate]);

  const handleSaveInventory = useCallback(async (newInv: InventoryItem[]) => {
    if (entityType === 'character') {
      const updated = await api.characters.update(campaignId, entity.id, { inventory_json: newInv });
      onUpdate(updated);
    } else {
      const updated = await api.npcs.update(campaignId, entity.id, { inventory_json: newInv });
      onUpdate(updated);
    }
  }, [campaignId, entity.id, entityType, onUpdate]);

  const handleSaveSpells = useCallback(async (newSpells: Spell[]) => {
    if (entityType === 'character') {
      const updated = await api.characters.update(campaignId, entity.id, { spells_json: newSpells });
      onUpdate(updated);
    } else {
      const updated = await api.npcs.update(campaignId, entity.id, { spells_json: newSpells });
      onUpdate(updated);
    }
  }, [campaignId, entity.id, entityType, onUpdate]);

  const addItem = () => {
    const newItem: InventoryItem = { id: genId(), name: 'New Item', description: '', quantity: 1 };
    handleSaveInventory([...inventory, newItem]);
  };

  const updateItem = (id: string, field: keyof InventoryItem, value: string | number | boolean) => {
    handleSaveInventory(inventory.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string) => {
    handleSaveInventory(inventory.filter((i) => i.id !== id));
  };

  const addSpell = () => {
    const newSpell: Spell = { id: genId(), name: 'New Spell', description: '', level: 1, cost_pm: 1 };
    handleSaveSpells([...spells, newSpell]);
  };

  const updateSpell = (id: string, field: keyof Spell, value: string | number) => {
    handleSaveSpells(spells.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSpell = (id: string) => {
    handleSaveSpells(spells.filter((s) => s.id !== id));
  };

  return (
    <HudPanel
      title={`${entity.name} — Sheet`}
      onClose={onClose}
      defaultX={120}
      defaultY={60}
      width={380}
    >
      <div className="space-y-3">
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />

        {/* Portrait + Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => fileInput.current?.click()}
            className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            title="Click to upload portrait"
          >
            {pUrl ? (
              <img src={pUrl} alt={entity.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xl font-bold text-[var(--accent)]">
                {entity.name.charAt(0)}
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{entity.name}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {entityType === 'character'
                ? `${(entity as Character).race} ${(entity as Character).class_}`
                : `NPC · ${entity.status}`}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                entity.status === 'alive' ? 'bg-emerald-900/50 text-emerald-400' :
                entity.status === 'dead' ? 'bg-red-900/50 text-red-400' :
                'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}>
                {entity.status}
              </span>
            </div>
          </div>
        </div>

        {/* VIDA Attributes */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Vigor', abbr: 'V', value: entity.vigor, color: 'text-red-400' },
            { label: 'Intel', abbr: 'I', value: entity.intelligence, color: 'text-blue-400' },
            { label: 'Dest', abbr: 'D', value: entity.dexterity, color: 'text-green-400' },
            { label: 'Astuc', abbr: 'A', value: entity.cunning, color: 'text-yellow-400' },
          ].map((a) => (
            <div key={a.abbr} className="text-center bg-[var(--bg-tertiary)] rounded py-1.5">
              <p className="text-[9px] text-[var(--text-secondary)]">{a.label}</p>
              <p className={`text-sm font-bold ${a.color}`}>{a.value}</p>
            </div>
          ))}
        </div>

        {/* Derived Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="text-center bg-[var(--bg-tertiary)]/50 rounded py-1">
            <p className="text-[9px] text-[var(--text-secondary)]">Max PV</p>
            <p className="text-xs font-bold text-red-400">{entity.max_pv}</p>
          </div>
          <div className="text-center bg-[var(--bg-tertiary)]/50 rounded py-1">
            <p className="text-[9px] text-[var(--text-secondary)]">Max PM</p>
            <p className="text-xs font-bold text-blue-400">{entity.max_pm}</p>
          </div>
          <div className="text-center bg-[var(--bg-tertiary)]/50 rounded py-1">
            <p className="text-[9px] text-[var(--text-secondary)]">Defensa</p>
            <p className="text-xs font-bold text-green-400">{entity.defense}</p>
          </div>
        </div>

        {/* PV/PM Controls */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-red-400 w-6">PV</span>
            <button
              onClick={() => setCurrentHp((h) => Math.max(0, h - 1))}
              className="w-6 h-6 rounded bg-red-900/50 hover:bg-red-800 text-red-300 text-xs flex items-center justify-center"
            >-</button>
            <input
              type="number"
              value={currentHp}
              onChange={(e) => setCurrentHp(Math.max(0, parseInt(e.target.value) || 0))}
              onBlur={handleSaveHp}
              className="flex-1 text-center text-xs bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded px-1 py-0.5 text-red-400 font-mono focus:outline-none focus:border-[var(--accent)]"
            />
            <span className="text-[10px] text-[var(--text-secondary)]">/ {entity.max_pv}</span>
            <button
              onClick={() => setCurrentHp((h) => Math.min(entity.max_pv, h + 1))}
              className="w-6 h-6 rounded bg-green-900/50 hover:bg-green-800 text-green-300 text-xs flex items-center justify-center"
            >+</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-400 w-6">PM</span>
            <button
              onClick={() => setCurrentPm((p) => Math.max(0, p - 1))}
              className="w-6 h-6 rounded bg-red-900/50 hover:bg-red-800 text-red-300 text-xs flex items-center justify-center"
            >-</button>
            <input
              type="number"
              value={currentPm}
              onChange={(e) => setCurrentPm(Math.max(0, parseInt(e.target.value) || 0))}
              onBlur={handleSavePm}
              className="flex-1 text-center text-xs bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded px-1 py-0.5 text-blue-400 font-mono focus:outline-none focus:border-[var(--accent)]"
            />
            <span className="text-[10px] text-[var(--text-secondary)]">/ {entity.max_pm}</span>
            <button
              onClick={() => setCurrentPm((p) => Math.min(entity.max_pm, p + 1))}
              className="w-6 h-6 rounded bg-green-900/50 hover:bg-green-800 text-green-300 text-xs flex items-center justify-center"
            >+</button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-[var(--bg-tertiary)]/50 rounded p-0.5">
          {(['stats', 'inventory', 'spells'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-[10px] py-1.5 rounded capitalize transition-colors ${
                tab === t
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'stats' && (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Description</p>
              {editingDesc ? (
                <div>
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    className="w-full h-24 text-xs bg-[var(--bg-primary)] text-[var(--text-primary)] rounded p-2 border border-[var(--bg-tertiary)] focus:border-[var(--accent)] focus:outline-none resize-none"
                    autoFocus
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={handleSaveDescription}
                      className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent)] text-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingDesc(false); setDescDraft(entity.description); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => setEditingDesc(true)}
                  className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-pre-wrap"
                >
                  {entity.description || 'Click to add description...'}
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="space-y-1.5">
            {inventory.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)]/30 rounded px-2 py-1.5 group">
                <input
                  type="checkbox"
                  checked={item.equipped || false}
                  onChange={(e) => updateItem(item.id, 'equipped', e.target.checked)}
                  className="w-3 h-3"
                  title="Equipped"
                />
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 text-xs bg-transparent text-[var(--text-primary)] focus:outline-none"
                  placeholder="Item name"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 text-center text-[10px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded text-[var(--text-primary)] focus:outline-none"
                  title="Quantity"
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-[var(--text-secondary)] hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="w-full text-[10px] py-1.5 rounded border border-dashed border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              + Add Item
            </button>
          </div>
        )}

        {tab === 'spells' && (
          <div className="space-y-1.5">
            {spells.map((spell) => (
              <div key={spell.id} className="bg-[var(--bg-tertiary)]/30 rounded px-2 py-1.5 group">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-blue-400 font-mono">Lv{spell.level}</span>
                  <input
                    value={spell.name}
                    onChange={(e) => updateSpell(spell.id, 'name', e.target.value)}
                    className="flex-1 text-xs bg-transparent text-[var(--text-primary)] focus:outline-none"
                    placeholder="Spell name"
                  />
                  <span className="text-[10px] text-blue-300">{spell.cost_pm} PM</span>
                  <button
                    onClick={() => removeSpell(spell.id)}
                    className="text-[var(--text-secondary)] hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addSpell}
              className="w-full text-[10px] py-1.5 rounded border border-dashed border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              + Add Spell
            </button>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
