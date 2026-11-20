import { useEffect, useRef, useState, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import type { VidaAttr } from '@/lib/api';
import { VidaAttrsInput, NumberInput } from '@/components/VidaInputs';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

type FrameOption = { id: string; name: string; url: string | null; type?: string };
type FrameLayout = { scale: number; x: number; y: number };

function frameLayoutOf(config: Record<string, unknown>): FrameLayout {
  const cfg = (config.frame ?? {}) as Partial<FrameLayout>;
  return { scale: cfg.scale ?? 1, x: cfg.x ?? 0, y: cfg.y ?? 0 };
}

function FrameThumb({ option, className = 'h-20 w-20' }: { option: FrameOption; className?: string }) {
  if (!option.url) {
    return <span className="text-xs text-[var(--text-secondary)]">—</span>;
  }
  if (option.type === 'video') {
    return <video src={option.url} autoPlay loop muted playsInline className={`${className} object-contain`} />;
  }
  return <img src={option.url} alt="" className={`${className} object-contain`} />;
}

function ModelPreview({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
    </group>
  );
}

export default function CharacterForm() {
  const { t } = useTranslation();
  const { id: campaignId, characterId } = useParams<{ id: string; characterId: string }>();
  const isEdit = characterId && characterId !== 'new';
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('player');
  const [description, setDescription] = useState('');
  const [className, setClassName] = useState('');
  const [race, setRace] = useState('');
  const [vigor, setVigor] = useState<VidaAttr>('/');
  const [intelligence, setIntelligence] = useState<VidaAttr>('/');
  const [dexterity, setDexterity] = useState<VidaAttr>('/');
  const [cunning, setCunning] = useState<VidaAttr>('/');
  const [maxPv, setMaxPv] = useState(10);
  const [maxPm, setMaxPm] = useState(10);
  const [defense, setDefense] = useState(5);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [frame, setFrame] = useState('none');
  const [frameDialogOpen, setFrameDialogOpen] = useState(false);
  const [frameDraft, setFrameDraft] = useState('none');
  const [frameOptions, setFrameOptions] = useState<FrameOption[]>([]);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [frameAssetId, setFrameAssetId] = useState<string | null>(null);
  const [visualConfig, setVisualConfig] = useState<Record<string, unknown>>({});
  const frameFileInput = useRef<HTMLInputElement>(null);
  const [canUseVfx, setCanUseVfx] = useState(false);
  const [modelPreviewUrl, setModelPreviewUrl] = useState<string | null>(null);
  const modelFileInput = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);

  const frameLayout = frameLayoutOf(visualConfig);
  const updateFrameLayout = (patch: Partial<FrameLayout>) =>
    setVisualConfig((prev) => ({
      ...prev,
      frame: { ...((prev.frame ?? {}) as Record<string, unknown>), ...patch },
    }));

  useEffect(() => {
    if (isEdit && campaignId && characterId) {
      api.characters.get(campaignId, characterId)
        .then((c) => {
          setName(c.name);
          setType(c.type);
          setDescription(c.description);
          setClassName(c.class_);
          setRace(c.race);
          setVigor(c.vigor);
          setIntelligence(c.intelligence);
          setDexterity(c.dexterity);
          setCunning(c.cunning);
          setMaxPv(c.max_pv);
          setMaxPm(c.max_pm);
          setDefense(c.defense);
          setFrame(c.frame ?? 'none');
          setCanUseVfx(c.can_use_vfx ?? false);
          setVisualConfig(c.visual_config_json ?? {});
          const frameCfg = (c.visual_config_json?.frame ?? {}) as { assetId?: string };
          setFrameAssetId(frameCfg.assetId ?? null);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [campaignId, characterId, isEdit]);

  useEffect(() => {
    if (!frameDialogOpen) return;
    let cancelled = false;
    setFrameError(null);
    Promise.all([
      fetch('/frames/catalog.json').then((res) => {
        if (!res.ok) throw new Error('catalog');
        return res.json() as Promise<FrameOption[]>;
      }),
      campaignId
        ? api.campaigns.listAssets(campaignId).then((res) =>
            res.assets
              .filter((asset) => asset.category === 'frames')
              .map((asset) => ({
                id: `asset:${asset.asset_id}`,
                name: asset.name,
                url: asset.url,
                type: asset.type,
              })),
          )
        : Promise.resolve([] as FrameOption[]),
    ])
      .then(([base, own]) => {
        if (!cancelled) setFrameOptions([...base, ...own]);
      })
      .catch(() => {
        if (!cancelled) setFrameError(t('characterForm.frameCatalogError', 'No se pudo cargar el catálogo de marcos'));
      });
    return () => {
      cancelled = true;
    };
  }, [frameDialogOpen, campaignId, t]);

  const openFrameEditor = () => {
    setFrameDraft(frame === 'custom' && frameAssetId ? `asset:${frameAssetId}` : frame);
    setFrameDialogOpen(true);
  };

  const applyFrame = () => {
    if (frameDraft.startsWith('asset:')) {
      setFrame('custom');
      setFrameAssetId(frameDraft.slice('asset:'.length));
    } else {
      setFrame(frameDraft);
      setFrameAssetId(null);
    }
    setFrameDialogOpen(false);
  };

  const importFrame = async (file: File) => {
    if (!campaignId) return;
    setFrameError(null);
    try {
      const uploaded = (await api.campaigns.uploadAsset(campaignId, file, 'frames')) as {
        asset_id: string;
        name: string;
        url: string;
        type: string;
      };
      const option: FrameOption = {
        id: `asset:${uploaded.asset_id}`,
        name: uploaded.name,
        url: uploaded.url,
        type: uploaded.type,
      };
      setFrameOptions((prev) => [...prev, option]);
      setFrameDraft(option.id);
    } catch (e: unknown) {
      setFrameError(e instanceof Error ? e.message : t('characterForm.frameImportError', 'No se pudo importar el marco'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !campaignId) {
      setError(t('characterForm.nameRequired', 'El nombre es obligatorio'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        name,
        type,
        description,
        class_name: className,
        race,
        vigor,
        intelligence,
        dexterity,
        cunning,
        max_pv: maxPv,
        max_pm: maxPm,
        defense,
        frame: frame === 'none' ? null : frame,
        visual_config_json: {
          ...visualConfig,
          frame: { version: 1, assetId: frameAssetId ?? undefined, ...frameLayout },
        },
        can_use_vfx: canUseVfx,
      };
      if (isEdit) {
        await api.characters.update(campaignId, characterId!, data);
        if (portraitFile) {
          await api.characters.uploadPortrait(campaignId, characterId!, portraitFile);
        }
        if (modelFile) {
          await api.characters.uploadModel(campaignId, characterId!, modelFile);
        }
        navigate(`/campaigns/${campaignId}/characters/${characterId}`);
      } else {
        const char = await api.characters.create(campaignId, data);
        if (portraitFile) {
          await api.characters.uploadPortrait(campaignId, char.id, portraitFile);
        }
        if (modelFile) {
          await api.characters.uploadModel(campaignId, char.id, modelFile);
        }
        navigate(`/campaigns/${campaignId}/characters/${char.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('characterForm.saveError', 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? t('characterForm.titleEdit', 'Editar personaje') : t('characterForm.titleNew', 'Nuevo personaje')}
      </h1>

      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('characterForm.name', 'Nombre')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            placeholder={t('characterForm.namePlaceholder', 'Nombre del personaje')}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('characterForm.type', 'Tipo')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="player">{t('characterTypes.player', 'Jugador')}</option>
              <option value="npc">{t('characterTypes.npc', 'PNJ')}</option>
              <option value="creature">{t('characterTypes.creature', 'Criatura')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('characterForm.race', 'Raza')}</label>
            <input
              type="text"
              value={race}
              onChange={(e) => setRace(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder={t('characterForm.racePlaceholder', 'Humano, Elfo...')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('characterForm.class', 'Clase')}</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            placeholder={t('characterForm.classPlaceholder', 'Guerrero, Mago...')}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('characterForm.description', 'Descripción')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] h-24 resize-none"
            placeholder={t('characterForm.descriptionPlaceholder', 'Descripción del personaje...')}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('characterForm.portrait', 'Retrato')}</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="w-20 h-20 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl font-bold text-[var(--accent)] overflow-hidden shrink-0 border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-all"
            >
              {portraitPreview ? (
                <img src={portraitPreview} alt={t('characterForm.portraitPreviewAlt', 'Preview')} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">📷</span>
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPortraitFile(file);
                  setPortraitPreview(URL.createObjectURL(file));
                }
                e.target.value = '';
              }}
            />
            <div className="text-xs text-[var(--text-secondary)]">
              <p>{portraitFile ? portraitFile.name : t('characterForm.noFile', 'No hay archivo seleccionado')}</p>
              <p className="mt-1">{t('characterForm.portraitHint', 'Opcional. Subí un retrato para este personaje.')}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('characterForm.model', 'Modelo 3D (.glb)')}</label>
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => modelFileInput.current?.click()}
              className="w-20 h-20 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden shrink-0 border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-all"
            >
              {modelPreviewUrl ? (
                <div className="w-full h-full">
                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--text-secondary)]">{t('common.loading')}</div>}>
                    <Canvas camera={{ position: [0, 1, 2.5], fov: 40 }}>
                      <ambientLight intensity={1.2} />
                      <directionalLight position={[2, 3, 1]} intensity={1.5} />
                      <ModelPreview url={modelPreviewUrl} />
                      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0} />
                    </Canvas>
                  </Suspense>
                </div>
              ) : (
                <span className="text-2xl">🧊</span>
              )}
            </button>
            <input
              ref={modelFileInput}
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setModelFile(file);
                  setModelPreviewUrl(URL.createObjectURL(file));
                }
                e.target.value = '';
              }}
            />
            <div className="text-xs text-[var(--text-secondary)]">
              <p>{modelFile ? modelFile.name : t('characterForm.noFile', 'No hay archivo seleccionado')}</p>
              <p className="mt-1">{t('characterForm.modelHint', 'Opcional. Subí un modelo 3D .glb. Si se setea, se renderiza como token 3D en la escena.')}</p>
              {modelPreviewUrl && (
                <button
                  type="button"
                  onClick={() => { setModelFile(null); setModelPreviewUrl(null); }}
                  className="mt-1 text-[var(--danger)] hover:opacity-80"
                >
                  {t('characterForm.removeModel', 'Quitar modelo')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-[var(--bg-tertiary)]" />
          <span className="text-xs text-[var(--text-secondary)]">O</span>
          <div className="flex-1 h-px bg-[var(--bg-tertiary)]" />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            {t('characterForm.frame', 'Marco del token (2D, sin modelo 3D)')}
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t('characterForm.frameOpen', 'Abrir editor de marcos')}
              onClick={openFrameEditor}
              className="flex items-center gap-3 rounded border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {(() => {
                const selected = frameOptions.find((option) =>
                  frame === 'custom' ? option.id === `asset:${frameAssetId}` : option.id === frame,
                );
                if (selected) return <FrameThumb option={selected} className="h-10 w-10" />;
                if (frame !== 'none' && !frame.startsWith('asset:')) {
                  return <img src={`/frames/${frame}.svg`} alt="" className="h-10 w-10 object-contain" />;
                }
                return <span className="grid h-10 w-10 place-items-center rounded bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]">—</span>;
              })()}
              <span>
                {frameOptions.find((option) =>
                  frame === 'custom' ? option.id === `asset:${frameAssetId}` : option.id === frame,
                )?.name ?? (frame === 'none' ? t('characterForm.frameNone', 'Sin marco') : frame)}
              </span>
            </button>
            <span className="text-xs text-[var(--text-secondary)]">
              {t('characterForm.frameHint', 'Marco decorativo para el retrato 2D.')}
            </span>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={canUseVfx} onChange={(e) => setCanUseVfx(e.target.checked)} />
            Puede usar VFX (habilidades visuales)
          </label>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">{t('characterForm.attributes', 'Atributos (VIDA)')}</label>
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
          <label className="block text-sm text-[var(--text-secondary)] mb-2">{t('characterForm.stats', 'Características')}</label>
          <div className="grid grid-cols-3 gap-3">
            <NumberInput label={t('characterForm.maxPv', 'Max PV')} value={maxPv} onChange={setMaxPv} />
            <NumberInput label={t('characterForm.maxPm', 'Max PM')} value={maxPm} onChange={setMaxPm} />
            <NumberInput label={t('characterForm.defense', 'Defensa')} value={defense} onChange={setDefense} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? t('characterForm.saving', 'Guardando...')
              : isEdit
                ? t('characterForm.save', 'Guardar cambios')
                : t('characterForm.create', 'Crear personaje')}
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>

      <Dialog open={frameDialogOpen} onOpenChange={setFrameDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('characterForm.frameDialogTitle', 'Marco del personaje')}</DialogTitle>
          </DialogHeader>
          {frameError ? (
            <p className="text-sm text-[var(--danger)]">{frameError}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {frameOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={frameDraft === option.id}
                  onClick={() => setFrameDraft(option.id)}
                  className={`flex flex-col items-center gap-2 rounded border p-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    frameDraft === option.id
                      ? 'border-[var(--accent)] bg-[var(--bg-secondary)]'
                      : 'border-[var(--bg-tertiary)] hover:border-[var(--accent)]'
                  }`}
                >
                  <span className="grid h-24 w-24 place-items-center rounded bg-[var(--bg-tertiary)]">
                    <FrameThumb option={option} />
                  </span>
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
          )}
          {frameDraft !== 'none' && (
            <div className="flex justify-center py-2">
              <div style={{ transform: `translate(${frameLayout.x}px, ${frameLayout.y}px) scale(${frameLayout.scale})` }}>
                {(() => {
                  const selected = frameOptions.find((option) => option.id === frameDraft);
                  return selected ? (
                    <FrameThumb option={selected} />
                  ) : (
                    <img src={`/frames/${frameDraft}.svg`} alt="" className="h-20 w-20 object-contain" />
                  );
                })()}
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 border-t border-[var(--bg-tertiary)] pt-3">
            <div>
              <label htmlFor="frame-scale" className="block text-xs text-[var(--text-secondary)] mb-1">
                {t('characterForm.frameScale', 'Escala del marco')}
              </label>
              <input
                id="frame-scale"
                type="number"
                step="0.1"
                min="0.1"
                value={frameLayout.scale}
                onChange={(e) => updateFrameLayout({ scale: Number(e.target.value) })}
                className="w-full text-sm bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-2 py-1"
              />
            </div>
            <div>
              <label htmlFor="frame-x" className="block text-xs text-[var(--text-secondary)] mb-1">
                {t('characterForm.frameX', 'Desplazamiento X del marco')}
              </label>
              <input
                id="frame-x"
                type="number"
                step="1"
                value={frameLayout.x}
                onChange={(e) => updateFrameLayout({ x: Number(e.target.value) })}
                className="w-full text-sm bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-2 py-1"
              />
            </div>
            <div>
              <label htmlFor="frame-y" className="block text-xs text-[var(--text-secondary)] mb-1">
                {t('characterForm.frameY', 'Desplazamiento Y del marco')}
              </label>
              <input
                id="frame-y"
                type="number"
                step="1"
                value={frameLayout.y}
                onChange={(e) => updateFrameLayout({ y: Number(e.target.value) })}
                className="w-full text-sm bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-2 py-1"
              />
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <div>
              <input
                ref={frameFileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                aria-label={t('characterForm.frameImport', 'Importar marco')}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importFrame(file);
                  e.target.value = '';
                }}
              />
              <Button variant="outline" type="button" onClick={() => frameFileInput.current?.click()}>
                {t('characterForm.frameImport', 'Importar marco')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setFrameDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={applyFrame}>
                {t('characterForm.frameApply', 'Aplicar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
