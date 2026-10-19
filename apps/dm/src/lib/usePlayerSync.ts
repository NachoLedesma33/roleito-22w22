import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Character, PlayerSceneToken } from '@/lib/api';
import i18n from '@/lib/i18n';
import type { SceneItem } from '@core/domain/types';

/**
 * Frecuencia del poll de revisiones. 16ms (~62/s) porque cada respuesta es un
 * GET chico contra localhost; con el WS abierto el tick no llega a ejecutarse.
 */
/**
 * Respaldo del WS. Arranca rapido para recuperar una conexion caida y se
 * aleja si el WS no levanta: 16 ms fijos eran 62 peticiones/s por jugador.
 */
const POLL_FAST_MS = 250;
const POLL_SLOW_MS = 2000;

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
  /**
   * Primer snapshot aplicado. El loop de sync depende de ESTO y no de `data`:
   * `data` cambia identidad con cada merge de `scene_characters` (un movimiento
   * de token), y con `data` en las deps el WS se cerraba y reabria POR MOVIMIENTO,
   * bajando el snapshot completo en el onopen. Costo medido: 47 KB + hueco de
   * reconexion por cada 15 cm recorridos = POV del jugador siempre atrasado.
   */
  const [joined, setJoined] = useState(false);
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
        setJoined(true);
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

  /**
 * Aplica posiciones que llegan por WS sin bajar el snapshot.
 *
 * Es la diferencia entre 47 KB y 0 KB por cada 15 cm que se mueve un token: el
 * snapshot trae escenas, NPCs, quests, handouts e `items_json` de TODA la
 * campaña, y se entera además de que cambió una x. Con un token en movimiento eso
 * son ~7 descargas por segundo y el hilo principal a 10 FPS (medido).
 *
 * El parche es identity-preserving por personaje: si no cambió nada se devuelve
 * el mismo objeto, así que `PlayerView` no reinicia sus interpolaciones.
 *
 * SAFEGUARD: nunca reduce el número de personajes. Si el merge produce menos
 * que el estado previo, algo va mal (IDs que no matchean, scene_id erróneo)
 * y nos quedamos con el estado previo completo + log de diagnóstico.
 */
const applySceneCharacters = useCallback((sceneId: string, incoming: unknown[]) => {
  setData((prev) => {
    if (!prev || prev.scene_id !== sceneId || incoming.length === 0) {
      if (import.meta.env?.DEV && !prev) console.debug('[sync] applySceneCharacters: sin data previo');
      if (import.meta.env?.DEV && prev?.scene_id !== sceneId) console.debug('[sync] applySceneCharacters: scene_id mismatch', { prev: prev?.scene_id, msg: sceneId });
      return prev;
    }
    const byId = new Map<string, Record<string, unknown>>();
    for (const c of incoming as Array<Record<string, unknown>>) {
      if (typeof c?.id === 'string') byId.set(c.id as string, c);
    }
    if (byId.size === 0) return prev;
    if (import.meta.env?.DEV) console.debug('[sync] applySceneCharacters', { sceneId, incomingIds: Array.from(byId.keys()), prevCount: prev.characters.length });
    let changed = false;
    const characters = prev.characters.map((c) => {
      const u = byId.get(c.id);
      if (!u) return c;
      const samePose =
        u.x === c.x && u.y === c.y && u.z === c.z &&
        (u.rotation ?? 0) === (c.rotation ?? 0);
      // Posición igual pero `last_move_at`/velocidad nueva: eso SÍ importa para
      // la extrapolación, así que solo se devuelve el mismo objeto si no cambió.
      if (samePose && u.last_move_at === c.last_move_at) return c;
      changed = true;
      return { ...c, ...(u as Partial<typeof c>) };
    });
    // SAFEGUARD: si por alguna razón perdimos personajes, NO aplicar el cambio
    if (characters.length !== prev.characters.length) {
      console.error('[sync] applySceneCharacters: PERDIDA DE PERSONAJES detectada', {
        before: prev.characters.length,
        after: characters.length,
        incomingIds: Array.from(byId.keys()),
        prevIds: prev.characters.map(c => c.id),
      });
      return prev;
    }
    return changed ? { ...prev, characters } : prev;
  });
}, []);

  // Sync continuo. Depende de `joined` (una sola vez) y NO de `data`: cada
  // merge de `scene_characters` cambiaba `data` y reabria el WS por movimiento.
  useEffect(() => {
    if (!code || !joined) return;
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

    // Backoff del sondeo. Antes: 16 ms fijos. Con el WS caido eso son 62
    // peticiones por segundo y POR JUGADOR, y cada una son 6 SELECTs + un sha1
    // del estado entero de la campana. En una mesa de 5 personas son 310
    // peticiones/s de respaldo para algo que el WS ya cubria: el respaldo se
    // estaba comiendo el backend entero. Arranca en 250 ms y sube hasta 2 s si
    // sigue sin abrir, y vuelve a 250 ms apenas el WS levanta.
    let pollDelayMs = POLL_FAST_MS;
    const scheduleNextPoll = () => {
      if (!cancelled) timer = window.setTimeout(tick, pollDelayMs);
      pollDelayMs = Math.min(pollDelayMs * 2, POLL_SLOW_MS);
    };

    const tick = async () => {
      if (ws && ws.readyState === WebSocket.OPEN) return; // el WS cubre el sync
      if (!ws || ws.readyState === WebSocket.CLOSED) connectWs();
      await pollRevision();
      if (!cancelled && !(ws && ws.readyState === WebSocket.OPEN)) scheduleNextPoll();
    };

    const connectWs = () => {
      if (cancelled) return;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
      const sock = new WebSocket(`/api/ws/invite/${code}`);
      ws = sock;
      sock.onopen = () => {
        if (cancelled) return;
        setLive(true);
        pollDelayMs = POLL_FAST_MS;
        void pollRevision();
      };
      sock.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(ev.data as string) as {
            type?: string;
            revision?: string;
            scene_id?: string;
            characters?: unknown[];
          };
          if (import.meta.env?.DEV) console.debug('[sync] WS message', { type: msg.type, scene_id: msg.scene_id, chars: msg.characters?.length });
          if (msg.type === 'revision' && msg.revision) {
            setLive(true);
            void applyRevision(msg.revision);
          } else if (msg.type === 'scene_characters' && msg.scene_id) {
            setLive(true);
            // Camino barato: un token se movio. NO se baja el snapshot.
            applySceneCharacters(msg.scene_id, msg.characters ?? []);
          }
        } catch {
          // mensaje no JSON: ignorar
        }
      };
      sock.onclose = () => {
        if (cancelled) return;
        if (ws === sock) ws = null;
        setLive(false);
        scheduleNextPoll();
      };
    };

    connectWs();
    scheduleNextPoll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (ws) ws.close();
    };
  }, [code, joined, fetchSnapshot, applySnapshot, fetchMyChar, syncNotesDraft, choiceRef, applySceneCharacters]);

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
