import { useState, useCallback, useEffect, useRef } from 'react';
import HudPanel from './HudPanel';
import { api, Character, NPC, InventoryItem, Spell, CampaignAbility } from '@/lib/api';
import { STATUS_OPTIONS } from '@/lib/statusMarkers';
import { ABILITY_ICON_OPTIONS, abilityIconView, abilityFallbackGlyph } from '@/lib/abilityIcons';

interface CharacterSheetProps {
  entity: Character | NPC;
  entityType: 'character' | 'npc';
  campaignId: string;
  onUpdate: (updated: Character | NPC) => void;
  onClose: () => void;
  statuses?: string[];
}

function portraitUrl(path: string | null): string | null {
  if (!path) return null;
  return `/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
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
  statuses = [],
}: CharacterSheetProps) {
  const [tab, setTab] = useState<Tab>('stats');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(entity.description);
  const [currentHp, setCurrentHp] = useState(entity.current_pv ?? entity.max_pv);
  const [currentPm, setCurrentPm] = useState(entity.current_pm ?? entity.max_pm);
  const fileInput = useRef<HTMLInputElement>(null);
  const iconFileInput = useRef<HTMLInputElement>(null);
  // A qué habilidad le está apuntando el input de archivo de icono.
  const iconAbilityId = useRef<string>('');
  const [iconTarget, setIconTarget] = useState<string | null>(null);

  const inventory: InventoryItem[] = entity.inventory_json || [];
  const spells: Spell[] = entity.spells_json || [];
  const pUrl = portraitUrl(entity.portrait_path);

  const [catalog, setCatalog] = useState<CampaignAbility[]>([]);
  const reloadCatalog = useCallback(async () => {
    try {
      setCatalog(await api.abilities.list(campaignId));
    } catch {
      // el catalogo es auxiliar: si falla, la ficha sigue funcionando
    }
  }, [campaignId]);

  useEffect(() => {
    reloadCatalog();
  }, [reloadCatalog]);

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
    // alta y baja cambian el catalogo (owners, o la fila si es nueva)
    await reloadCatalog();
  }, [campaignId, entity.id, entityType, onUpdate, reloadCatalog]);

  const addItem = () => {
    const newItem: InventoryItem = { id: genId(), name: 'Nuevo objeto', description: '', quantity: 1 };
    handleSaveInventory([...inventory, newItem]);
  };

  const updateItem = (id: string, field: keyof InventoryItem, value: string | number | boolean) => {
    handleSaveInventory(inventory.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string) => {
    handleSaveInventory(inventory.filter((i) => i.id !== id));
  };

  const addSpell = () => {
    const newSpell: Spell = { id: genId(), name: 'Nuevo conjuro', description: '', level: 1, cost_pm: 1, icon: null };
    handleSaveSpells([...spells, newSpell]);
  };

  const updateSpell = (id: string, field: keyof Spell, value: string | number) => {
    handleSaveSpells(spells.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSpell = (id: string) => {
    handleSaveSpells(spells.filter((s) => s.id !== id));
  };

  // El catalogo es de campaña: aprender no copia la habilidad, solo agrega el
  // enlace. Por eso aparece con el mismo id que ya tiene el catálogo.
  const learnSpell = (ability: CampaignAbility) => {
    handleSaveSpells([
      ...spells,
      {
        id: ability.id,
        name: ability.name,
        description: ability.description,
        level: ability.level,
        cost_pm: ability.cost_pm,
        icon: ability.icon,
      },
    ]);
  };

  const unknownAbilities = catalog.filter((a) => !spells.some((s) => s.id === a.id));
  const ownersOf = (id: string) => catalog.find((a) => a.id === id)?.owners ?? 1;

  // El icono vive en la fila del catálogo compartido. Si la habilidad está en
  // la ficha viaja en el guardado normal de spells_json — que además crea la
  // fila cuando el conjuro es nuevo—; si solo está en el catálogo, va por
  // endpoint, que es cuando la fila ya existe.
  const applyIcon = async (abilityId: string, icon: string | null) => {
    const spell = spells.find((s) => s.id === abilityId);
    if (spell) {
      handleSaveSpells(spells.map((s) => (s.id === abilityId ? { ...s, icon } : s)));
      if (icon === null && spell.icon) {
        try {
          // había un archivo subido: borrarlo además de limpiar la columna.
          await api.abilities.clearIcon(campaignId, abilityId);
        } catch {
          // un archivo huérfano no rompe nada
        }
      }
      return;
    }
    try {
      if (icon) await api.abilities.setIcon(campaignId, abilityId, icon);
      else await api.abilities.clearIcon(campaignId, abilityId);
    } catch {
      // el catálogo es auxiliar: un icono fallido no rompe la ficha
    }
    await reloadCatalog();
  };

  const uploadIcon = async (abilityId: string, file: File) => {
    try {
      const updated = await api.abilities.uploadIcon(campaignId, abilityId, file);
      if (spells.some((s) => s.id === abilityId)) {
        handleSaveSpells(spells.map((s) => (s.id === abilityId ? { ...s, icon: updated.icon } : s)));
      } else {
        await reloadCatalog();
      }
    } catch {
      // subida de icono no fatal
    }
  };

  const handleIconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadIcon(iconAbilityId.current, file);
    e.target.value = '';
  };

  const iconChip = (icon: string | null, name: string) => {
    const view = abilityIconView(icon);
    if (!view) {
      return <span className="text-[var(--text-secondary)]">{abilityFallbackGlyph(name)}</span>;
    }
    if (view.kind === 'glyph') return <span>{view.glyph}</span>;
    return <img src={view.url} alt="" className="w-full h-full object-cover" />;
  };

  const iconPicker = (abilityId: string, currentIcon: string | null) => {
    if (iconTarget !== abilityId) return null;
    return (
      <div className="mt-1 p-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] space-y-1.5">
        <div className="grid grid-cols-9 gap-1">
          {ABILITY_ICON_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                void applyIcon(abilityId, opt.id);
                setIconTarget(null);
              }}
              title={opt.label}
              className={`h-6 rounded text-sm leading-none hover:bg-[var(--bg-tertiary)] ${
                currentIcon === opt.id ? 'bg-[var(--bg-tertiary)]' : ''
              }`}
            >
              {opt.glyph}
            </button>
          ))}
        </div>
        <div className="flex gap-1 text-[10px]">
          <button
            onClick={() => {
              iconAbilityId.current = abilityId;
              iconFileInput.current?.click();
            }}
            className="px-1.5 py-0.5 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
          >
            Subir imagen
          </button>
          <button
            onClick={() => {
              void applyIcon(abilityId, null);
              setIconTarget(null);
            }}
            className="px-1.5 py-0.5 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-red-400"
          >
            Quitar
          </button>
          <button
            onClick={() => setIconTarget(null)}
            className="ml-auto px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  return (
    <HudPanel
      title={`${entity.name} — Ficha`}
      panelId={`char-${entity.id}`}
      onClose={onClose}
      defaultX={120}
      defaultY={60}
      defaultWidth={380}
    >
      <div className="space-y-3">
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
        <input ref={iconFileInput} type="file" accept="image/*" className="hidden" onChange={handleIconFile} />

        {/* Portrait + Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => fileInput.current?.click()}
            className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            title="Hacé clic para subir retrato"
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
                : `PNJ · ${entity.status === 'alive' ? 'Vivo' : entity.status === 'dead' ? 'Muerto' : entity.status}`}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                entity.status === 'alive' ? 'bg-emerald-900/50 text-emerald-400' :
                entity.status === 'dead' ? 'bg-red-900/50 text-red-400' :
                'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}>
                {entity.status === 'alive' ? 'Vivo' : entity.status === 'dead' ? 'Muerto' : entity.status}
              </span>
            </div>
            {statuses.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wide">Estado</span>
                {statuses.map((s) => {
                  const opt = STATUS_OPTIONS.find((o) => o.id === s);
                  if (!opt) return null;
                  return (
                    <span
                      key={s}
                      title={opt.label}
                      className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                  );
                })}
              </div>
            )}
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
              <p className={`text-sm font-bold ${a.color}`}>{a.value === '-' ? '−' : a.value}</p>
            </div>
          ))}
        </div>

        {/* Derived Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="text-center bg-[var(--bg-tertiary)]/50 rounded py-1">
            <p className="text-[9px] text-[var(--text-secondary)]">PV máx.</p>
            <p className="text-xs font-bold text-red-400">{entity.max_pv}</p>
          </div>
          <div className="text-center bg-[var(--bg-tertiary)]/50 rounded py-1">
            <p className="text-[9px] text-[var(--text-secondary)]">PM máx.</p>
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
              {{ stats: 'Características', inventory: 'Inventario', spells: 'Conjuros' }[t]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'stats' && (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Descripción</p>
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
                      Guardar
                    </button>
                    <button
                      onClick={() => { setEditingDesc(false); setDescDraft(entity.description); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => setEditingDesc(true)}
                  className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-pre-wrap"
                >
                  {entity.description || 'Hacé clic para agregar descripción...'}
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
                  title="Equipado"
                />
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 text-xs bg-transparent text-[var(--text-primary)] focus:outline-none"
                  placeholder="Nombre del objeto"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 text-center text-[10px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded text-[var(--text-primary)] focus:outline-none"
                  title="Cantidad"
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-[var(--text-secondary)] hover:text-red-400 text-[10px] opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="w-full text-[10px] py-1.5 rounded border border-dashed border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              + Agregar objeto
            </button>
          </div>
        )}

        {tab === 'spells' && (
          <div className="space-y-1.5">
            {spells.map((spell) => (
              <div key={spell.id} className="bg-[var(--bg-tertiary)]/30 rounded px-2 py-1.5 group">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIconTarget(iconTarget === spell.id ? null : spell.id)}
                    title="Elegir icono"
                    className="w-5 h-5 shrink-0 rounded overflow-hidden border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] flex items-center justify-center text-[11px] leading-none hover:border-[var(--accent)]"
                  >
                    {iconChip(spell.icon, spell.name)}
                  </button>
                  <span className="text-[10px] text-blue-400 font-mono">Lv{spell.level}</span>
                  <input
                    value={spell.name}
                    onChange={(e) => updateSpell(spell.id, 'name', e.target.value)}
                    className="flex-1 text-xs bg-transparent text-[var(--text-primary)] focus:outline-none"
                    placeholder="Nombre del conjuro"
                  />
                  <span className="text-[10px] text-blue-300">{spell.cost_pm} PM</span>
                  <button
                    onClick={() => removeSpell(spell.id)}
                    className="text-[var(--text-secondary)] hover:text-red-400 text-[10px] opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
                {iconPicker(spell.id, spell.icon)}
                {ownersOf(spell.id) > 1 && (
                  <div className="text-[9px] text-amber-400/80 mt-0.5">
                    Compartida con {ownersOf(spell.id)} fichas: editarla la cambia en todas
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={addSpell}
              className="w-full text-[10px] py-1.5 rounded border border-dashed border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              + Agregar conjuro
            </button>

            {unknownAbilities.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[9px] uppercase tracking-wide text-[var(--text-secondary)]">
                  Catálogo de la campaña
                </div>
                {unknownAbilities.map((ability) => (
                  <div
                    key={ability.id}
                    className="bg-[var(--bg-tertiary)]/20 rounded px-2 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIconTarget(iconTarget === ability.id ? null : ability.id)}
                        title="Elegir icono"
                        className="w-5 h-5 shrink-0 rounded overflow-hidden border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] flex items-center justify-center text-[11px] leading-none hover:border-[var(--accent)]"
                      >
                        {iconChip(ability.icon, ability.name)}
                      </button>
                      <span className="text-[10px] text-blue-400 font-mono">Lv{ability.level}</span>
                      <span className="flex-1 text-xs text-[var(--text-primary)] truncate">
                        {ability.name}
                      </span>
                      <span className="text-[10px] text-blue-300">{ability.cost_pm} PM</span>
                      <button
                        onClick={() => learnSpell(ability)}
                        title="Aprender"
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-[11px] leading-none px-1"
                      >
                        +
                      </button>
                    </div>
                    {iconPicker(ability.id, ability.icon)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
