import { useRef, useCallback, useState, useEffect } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';

interface HudPanelProps {
  title: string;
  panelId: string;
  onClose: () => void;
  children: React.ReactNode;
  defaultX?: number;
  defaultY?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  className?: string;
  /** Oculta la × (el panel no se puede cerrar, solo minimizar). */
  hideClose?: boolean;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const MIN_HEIGHT = 150;
const BASE_Z = 20;
const MAX_Z = 29;
let nextZ = BASE_Z;
const STORAGE_PREFIX = 'roleito:hud:';
const EDGE = 6;
const SNAP = 20;

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

function loadSize(panelId: string): { width: number; height: number } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${panelId}:size`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSize(panelId: string, width: number, height: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${panelId}:size`, JSON.stringify({ width, height }));
  } catch {}
}

function loadPosition(panelId: string): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${panelId}:pos`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePosition(panelId: string, x: number, y: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${panelId}:pos`, JSON.stringify({ x, y }));
  } catch {}
}

const CURSORS: Record<ResizeEdge, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
};

/**
 * Botón de la cabecera. El `title` va también como `aria-label` porque los
 * locators de e2e los buscan por nombre accesible (y el SVG no aporta texto al
 * DOM).
 */
function PanelAction({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      {children}
    </button>
  );
}

// Global minimize registry
export type MinimizedCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type MinimizedEntry = {
  panelId: string;
  title: string;
  onRestore: () => void;
  /** Esquina donde cae el chip al minimizar: la más cercana al panel. */
  corner: MinimizedCorner;
};
let minimizedListeners: Array<() => void> = [];
const minimizedMap = new Map<string, MinimizedEntry>();

function emitMinimizedChange() {
  minimizedListeners.forEach((l) => l());
}

/**
 * Caja jugable (la pantalla del VTT): el canvas con escena. Los chips
 * minimizados viven acá adentro, no sobre el viewport, para no tapar el riel
 * lateral ni el TopBar. Si la página no markuppea la zona, cae al viewport.
 */
export function getStageRect(): { left: number; top: number; width: number; height: number } {
  const fallback = {
    left: 0,
    top: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  };
  if (typeof document === 'undefined') return fallback;
  const el = document.querySelector('[data-hud-stage]');
  if (!el) return fallback;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : fallback;
}

/**
 * Esquina de la pantalla del VTT más cercana al panel. Al minimizar, el chip
 * aparece donde el panel estaba: si lo arrastraste a la esquina inferior
 * izquierda, el chip tiene que caer ahí y no siempre abajo a la derecha.
 */
function nearestCorner(x: number, y: number, width: number, height: number): MinimizedCorner {
  const stage = getStageRect();
  // Centro del panel contra el centro de la pantalla del VTT.
  const cx = x + width / 2;
  const cy = y + height / 2;
  const vertical = cy < stage.top + stage.height / 2 ? 'top' : 'bottom';
  const horizontal = cx < stage.left + stage.width / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}`;
}

export function useMinimizedPanels(): MinimizedEntry[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    minimizedListeners.push(listener);
    return () => {
      minimizedListeners = minimizedListeners.filter((l) => l !== listener);
    };
  }, []);
  return Array.from(minimizedMap.values());
}

function registerMinimized(entry: MinimizedEntry) {
  minimizedMap.set(entry.panelId, entry);
  emitMinimizedChange();
}

function unregisterMinimized(panelId: string) {
  minimizedMap.delete(panelId);
  emitMinimizedChange();
}

export default function HudPanel({
  title,
  panelId,
  onClose,
  children,
  defaultX = 100,
  defaultY = 100,
  defaultWidth = 300,
  defaultHeight = 300,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
  minHeight = MIN_HEIGHT,
  className = '',
  hideClose = false,
}: HudPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const saved = useRef(loadSize(panelId));
  const savedPos = useRef(loadPosition(panelId));

  const [pos, setPos] = useState({
    x: savedPos.current?.x ?? defaultX,
    y: savedPos.current?.y ?? defaultY,
  });
  const [size, setSize] = useState({
    width: saved.current?.width ?? defaultWidth,
    height: saved.current?.height ?? defaultHeight,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<ResizeEdge | null>(null);
  const [zIndex, setZIndex] = useState(BASE_Z);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const prevGeom = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });

  const bringToFront = useCallback(() => {
    nextZ = Math.min(nextZ + 1, MAX_Z);
    setZIndex(nextZ);
  }, []);

  useEffect(() => {
    saveSize(panelId, size.width, size.height);
  }, [panelId, size.width, size.height]);

  useEffect(() => {
    savePosition(panelId, pos.x, pos.y);
  }, [panelId, pos.x, pos.y]);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
    const stage = getStageRect();
    registerMinimized({
      panelId,
      title,
      onRestore: () => setMinimized(false),
      // Geometría visible: si está maximizado ocupa casi toda la pantalla, así
      // que usamos la caja entera para no mandarlo a una esquina rara.
      corner: maximized
        ? nearestCorner(stage.left, stage.top, stage.width, stage.height)
        : nearestCorner(pos.x, pos.y, size.width, size.height),
    });
  }, [panelId, title, maximized, pos.x, pos.y, size.width, size.height]);

  const handleMaximize = useCallback(() => {
    if (maximized) {
      const g = prevGeom.current;
      if (g) {
        setPos({ x: g.x, y: g.y });
        setSize({ width: g.w, height: g.h });
      }
      setMaximized(false);
    } else {
      prevGeom.current = { x: pos.x, y: pos.y, w: size.width, h: size.height };
      setMaximized(true);
    }
  }, [maximized, pos, size]);

  useEffect(() => {
    if (!minimized) {
      unregisterMinimized(panelId);
    }
  }, [minimized, panelId]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!panelRef.current || maximized) return;
      e.preventDefault();
      e.stopPropagation();
      bringToFront();
      dragOffset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos, bringToFront, maximized]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setPos((p) => ({ x: snap(p.x), y: snap(p.y) }));
    }
    setIsDragging(false);
  }, [isDragging]);

  const handleResizeDown = useCallback(
    (edge: ResizeEdge) => (e: React.PointerEvent) => {
      if (maximized) return;
      e.preventDefault();
      e.stopPropagation();
      bringToFront();
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: size.width,
        h: size.height,
        px: pos.x,
        py: pos.y,
      };
      setResizeEdge(edge);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [size, pos, bringToFront, maximized]
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeEdge) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const s = resizeStart.current;
      let newW = s.w;
      let newH = s.h;
      let newX = s.px;
      let newY = s.py;

      if (resizeEdge.includes('e')) newW = Math.max(minWidth, Math.min(maxWidth, s.w + dx));
      if (resizeEdge.includes('w')) {
        newW = Math.max(minWidth, Math.min(maxWidth, s.w - dx));
        newX = s.px + (s.w - newW);
      }
      if (resizeEdge.includes('s')) newH = Math.max(minHeight, s.h + dy);
      if (resizeEdge.includes('n')) {
        newH = Math.max(minHeight, s.h - dy);
        newY = s.py + (s.h - newH);
      }

      setSize({ width: newW, height: newH });
      setPos({ x: newX, y: newY });
    },
    [resizeEdge, minWidth, maxWidth, minHeight]
  );

  const handleResizeUp = useCallback(() => {
    setResizeEdge(null);
  }, []);

  if (minimized) return null;

  const edges: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <div
      ref={panelRef}
      data-testid={`hud-${panelId}`}
      className={`fixed flex flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-primary)] [backdrop-filter:blur(8px)] rounded-[var(--radius-lg)] shadow-2xl shadow-black/50 ${className}`}
      style={
        maximized
          ? { left: '4vw', top: '4vh', width: '92vw', height: '88vh', zIndex, cursor: 'default' }
          : {
              left: pos.x,
              top: pos.y,
              width: size.width,
              height: size.height,
              maxHeight: '80vh',
              zIndex,
              cursor: isDragging ? 'grabbing' : resizeEdge ? CURSORS[resizeEdge] : 'default',
            }
      }
    >
      {/*
        Barra de arrastre. Antes era una tira absoluta de 24px encima del
        contenido y el cuerpo tenía que compensarla con `pt-6`: por eso los
        botones quedaban pegados al borde y el contenido starting right below.
        Ahora la barra es una fila real del flujo y el cuerpo no necesita hack.
      */}
      <div
        className={`flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 select-none ${
          maximized ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{ height: 36 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="pointer-events-none flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          {title}
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          <PanelAction onClick={handleMinimize} label="Minimizar">
            <Minus className="h-3.5 w-3.5" />
          </PanelAction>
          <PanelAction onClick={handleMaximize} label={maximized ? 'Restaurar' : 'Maximizar'}>
            {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          </PanelAction>
          {hideClose ? null : (
            <PanelAction onClick={onClose} label="Cerrar">
              <X className="h-3.5 w-3.5" />
            </PanelAction>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-none">{children}</div>

      {/* Edge/corner resize handles */}
      {edges.map((edge) => {
        const isCorner = edge.length === 2;
        const style: React.CSSProperties = { position: 'absolute', zIndex: 10 };

        if (edge.includes('n')) { style.top = -2; style.height = EDGE; }
        if (edge.includes('s')) { style.bottom = -2; style.height = EDGE; }
        if (edge.includes('e')) { style.right = -2; style.width = EDGE; }
        if (edge.includes('w')) { style.left = -2; style.width = EDGE; }

        if (isCorner) {
          style.width = EDGE * 2;
          style.height = EDGE * 2;
        } else {
          if (edge === 'n' || edge === 's') {
            style.left = EDGE * 2;
            style.right = EDGE * 2;
          } else {
            style.top = EDGE * 2;
            style.bottom = EDGE * 2;
          }
        }

        return (
          <div
            key={edge}
            className={`opacity-0 hover:opacity-100 transition-opacity ${resizeEdge === edge ? '!opacity-100' : ''}`}
            style={{ ...style, cursor: CURSORS[edge] }}
            onPointerDown={handleResizeDown(edge)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
          />
        );
      })}
    </div>
  );
}
