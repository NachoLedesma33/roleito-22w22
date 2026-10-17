import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Character, PlayerSceneToken } from '@/lib/api';
import i18n from '@/lib/i18n';
import type { SceneItem } from '@core/domain/types';

/**
 * Frecuencia del poll de revisiones. 16ms (~62/s) porque cada respuesta es un
 * GET chico contra localhost; con el WS abierto el tick no llega a ejecutarse.
 */
const POLL_MS = 16;

/** Duración del crossfade al cambiar de escena. */
const FADE_IN_MS = 380;
const FADE_OUT_MS = 320;

/** Personaje jugable que el jugador puede impersonar en esta campaña. */
export interface PlayerCharOption {
  id: string;
  name: string;
  race: string;
  class_name: string;
  portrait_path: string | null;
  model_path: string | null;
}

/** A quién está mirando el jugador. `null` = todavía no eligió. */
export type Choice = { kind: 'character'; id: string } | { kind: 'spectator' } | null;

/** Lo que el DM puede cambiar entre snapshots, como lo ve el jugador. */
export interface JoinData {
  campaign_id: string;
  campaign_name: string;
  scene_id: string | null;
  scene_name: string;
  background_path: string | null;
  audio_path: string | null;
  weather: string | null;
  weather_intensity?: number | null;
  audio?: unknown;
  lighting: string;
  map_scale: number;
  model_y_offset: number;
  grid_size: number;
  grid_snap: boolean;
  /**
   * El DM encendió "recordar lo explorado" en esta escena. Con esto, el
   * jugador conserva la máscara de lo que ya vio entre sesiones
   * (`engineering/PLAN-VISION-PERCEPCION.md`, paso 6).
   */
  remember_explored?: boolean;
  characters: PlayerSceneToken[];
  player_characters: PlayerCharOption[];
  items: SceneItem[];
}

export interface UsePlayerSyncRefs {
  /**
   * Refs que el loop de movimiento también usa, así que los crea el
   * componente y los pasa: el hook comparte, no es dueño.
   */
  sceneIdRef: MutableRefObject<string | null>;
  choiceRef: MutableRefObject<Choice>;
  wasdTargetRef: MutableRefObject<{ x: number; z: number; rotation: number } | null>;
}

export interface UsePlayerSyncResult {
  data: JoinData | null;
  myChar: Character | null;
  choice: Choice;
  pickerOpen: boolean;
  loading: boolean;
  error: string | null;
  /** WebSocket o poll vivos: la vista muestra el punto de conexión. */
  live: boolean;
  /** Se pasa a los paneles del jugador para que recarguen cuando cambia. */
  panelRevision: string;
  notesDraft: string;
  fading: 'in' | 'out' | null;
  setNotesDraft: (v: string) => void;
  setChoice: (c: Choice) => void;
  setPickerOpen: (v: boolean) => void;
  setMyChar: (c: Character | null) => void;
  syncNotesDraft: (c: Character | null) => void;
  setFading: (v: 'in' | 'out' | null) => void;
  /** Trae la ficha del personaje. La usa el selector de personaje del componente. */
  fetchMyChar: (campaignId: string, charId: string) => Promise<Character | null>;
}

/**
 * Cómo el jugador se mantiene al día con lo que hace el DM.
 *
 * Tres caminos, en orden de preferencia: WebSocket (push de revisiones), poll
 * de `GET /invite/{code}/revision` como red de seguridad si el WS no abre, y
 * el fetch inicial al entrar con el código. El snapshot **no** se pide en
 * cada tick: se pide solo cuando la revisión cambió, que es lo que mantiene
 * barato el poll.
 */
export function usePlayerSync(code: string | undefined, refs: UsePlayerSyncRefs): UsePlayerSyncResult {
  const { sceneIdRef, choiceRef, wasdTargetRef } = refs;

  const [data, setData] = useState<JoinData | null>(null);
  const [myChar, setMyChar] = useState<Character | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [panelRevision, setPanelRevision] = useState('');
  const [fading, setFading] = useState<'in' | 'out' | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const lastRevRef = useRef<string>('');

  const fetchSnapshot = useCallback(async (): Promise<JoinData> => {
    const res = await fetch(`/api/campaigns/invite/${code}`);
    if (!res.ok) throw new Error(i18n.t('pv.invalidCode', 'Código de invitación inválido'));
    return res.json();
  }, [code]);

  const fetchMyChar = useCallback(async (campaignId: string, charId: string) => {
    const res = await fetch(`/api/campaigns/${campaignId}/characters/${charId}`);
    if (!res.ok) return null;
    return res.json() as Promise<Character>;
  }, []);

  const syncNotesDraft = useCallback((char: Character | null) => {
    setNotesDraft(char?.player_notes ?? '');
  }, []);

  const applySnapshot = useCallback(
    (snap: JoinData) => {
      if (sceneIdRef.current !== null && snap.scene_id !== sceneIdRef.current) {
        setFading('in');
        window.setTimeout(() => {
          sceneIdRef.current = snap.scene_id;
          setData(snap);
          wasdTargetRef.current = null;
          setFading('out');
          window.setTimeout(() => setFading(null), FADE_OUT_MS);
        }, FADE_IN_MS);
      } else {
        sceneIdRef.current = snap.scene_id;
        setData(snap);
      }
    },
    [sceneIdRef, wasdTargetRef],
  );

  // Join inicial: una vez por código.
  useEffect(() => {
    if (!code) return;
    fetchSnapshot()
      .then((snap) => {
        sceneIdRef.current = snap.scene_id;
        setData(snap);
        setLoading(false);

        const stored = localStorage.getItem(`roleito:pv:${code}`);
        if (stored === 'spectator') {
          const c: Choice = { kind: 'spectator' };
          choiceRef.current = c;
          setChoice(c);
        } else if (stored && snap.player_characters.some((p) => p.id === stored)) {
          const c: Choice = { kind: 'character', id: stored };
          choiceRef.current = c;
          setChoice(c);
          fetchMyChar(snap.campaign_id, stored).then((ch) => {
            if (ch) {
              setMyChar(ch);
              syncNotesDraft(ch);
            }
          });
        } else if (snap.player_characters.length > 0) {
          setPickerOpen(true);
        }
      })
      .catch((err: Error) => {
        setError(err.message || i18n.t('pv.joinFailed', 'No se pudo unir a la campaña'));
        setLoading(false);
      });
  }, [code, fetchSnapshot, fetchMyChar, syncNotesDraft, sceneIdRef, choiceRef]);

  // Sync continuo. Depende de `data` a propósito: cuando llega un snapshot el
  // WS se reabre, así que cambiar de escena y reconectar comparten camino.
  useEffect(() => {
    if (!code || !data) return;
    let cancelled = false;
    let timer: number;
    let ws: WebSocket | null = null;

    const applyRevision = async (revision: string) => {
      if (cancelled) return;
      if (revision === lastRevRef.current) return;
      lastRevRef.current = revision;
      setPanelRevision(revision);
      const snap = await fetchSnapshot();
      if (cancelled) return;
      applySnapshot(snap);

      const c = choiceRef.current;
      if (c?.kind === 'character') {
        fetchMyChar(snap.campaign_id, c.id).then((ch) => {
          if (ch) {
            setMyChar(ch);
            syncNotesDraft(ch);
          }
        });
      }
    };

    const pollRevision = async () => {
      try {
        const res = await fetch(`/api/campaigns/invite/${code}/revision`);
        if (!res.ok) throw new Error('revision failed');
        const { revision } = (await res.json()) as { revision: string };
        if (cancelled) return;
        setLive(true);
        await applyRevision(revision);
      } catch {
        if (!cancelled) setLive(false);
      }
    };

    const tick = async () => {
      if (ws && ws.readyState === WebSocket.OPEN) return; // el WS cubre el sync
      if (!ws || ws.readyState === WebSocket.CLOSED) connectWs();
      await pollRevision();
      if (!cancelled && !(ws && ws.readyState === WebSocket.OPEN)) {
        timer = window.setTimeout(tick, POLL_MS);
      }
    };

    const connectWs = () => {
      if (cancelled) return;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
      const sock = new WebSocket(`/api/ws/invite/${code}`);
      ws = sock;
      sock.onopen = () => {
        if (cancelled) return;
        setLive(true);
        void pollRevision();
      };
      sock.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string; revision?: string };
          if (msg.type === 'revision' && msg.revision) {
            setLive(true);
            void applyRevision(msg.revision);
          }
        } catch {
          // mensaje no JSON: ignorar
        }
      };
      sock.onclose = () => {
        if (cancelled) return;
        if (ws === sock) ws = null;
        setLive(false);
        timer = window.setTimeout(tick, POLL_MS);
      };
    };

    connectWs();
    timer = window.setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (ws) ws.close();
    };
  }, [code, data, fetchSnapshot, applySnapshot, fetchMyChar, syncNotesDraft, choiceRef]);

  return {
    data,
    myChar,
    choice,
    pickerOpen,
    loading,
    error,
    live,
    panelRevision,
    notesDraft,
    fading,
    setNotesDraft,
    setChoice,
    setPickerOpen,
    setMyChar,
    syncNotesDraft,
    setFading,
    fetchMyChar,
  };
}
