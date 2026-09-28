import { Suspense, useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Billboard, OrbitControls, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import TokenSprite from './TokenSprite';
import TokenModel from './TokenModel';
import ItemRenderer from './ItemRenderer';
import { buildOccluders } from '../lib/lightOcclusion';
import WallDrawerCanvas from './WallDrawerCanvas';
import ZoneDrawerCanvas from './ZoneDrawerCanvas';
import PortalDrawerCanvas, { createEmptyPortalDraft, type PortalDraft } from './PortalDrawerCanvas';
import FogOverlay from './FogOverlay';
import FogBrushCanvas from './FogBrushCanvas';
import FogRectCanvas from './FogRectCanvas';
import LightPlaceCanvas from './LightPlaceCanvas';
import TokenPlaceCanvas from './TokenPlaceCanvas';
import { extractFogRegions } from '../lib/fogMask';
import type { FogRegion } from '../lib/fogMask';
import type { MovementCell } from '../lib/movementRange';
import type { ZoneDraft } from './ZoneDrawer';
import type { ZoneGeometry } from './ZonePortal';
import { SceneItem } from '@core/domain/types';
import type { DrawState } from './WallDrawer';
import { STATUS_COLORS, STATUS_ICONS } from '@/lib/statusMarkers';

interface SceneEntity {
  id: string;
  sceneCharId: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  visible: boolean;
  portraitUrl?: string | null;
  modelUrl?: string | null;
  rotation?: number;
  tokenScale?: number;
  brightness?: number;
  facingOffset?: number;
  attachesLight?: boolean;
  statuses?: string[];
}

interface SceneRendererProps {
  backgroundUrl: string;
  characters: SceneEntity[];
  items?: SceneItem[];
  lighting?: string;
  selectedTokenId?: string | null;
  selectedItemIds?: string[];
  readOnly?: boolean;
  showZones?: boolean;
  movableEntityIds?: string[];
  mapScale?: number;
  modelYOffset?: number;
  gridSize?: number;
  gridSnap?: boolean;
  movementRange?: {
    tokenId: string;
    cellSize: number;
    cells: MovementCell[];
  } | null;
  drawState?: DrawState | null;
  zoneDraft?: ZoneDraft | null;
  onZoneAddPoint?: (point: { x: number; y: number }) => void;
  onZoneDragStart?: (point: { x: number; y: number }) => void;
  onZoneDragMove?: (point: { x: number; y: number }) => void;
  onZoneDragEnd?: (point: { x: number; y: number }) => void;
  onZoneFinish?: () => void;
  portalDraft?: PortalDraft | null;
  portalZones?: ZoneGeometry[];
  onPortalSelect?: (snap: import('./ZonePortal').EdgeSnap) => void;
  onPortalMove?: (point: import('@core/domain/types').Point2D) => void;
  onTokenClick?: (sceneCharId: string) => void;
  onItemClick?: (itemId: string) => void;
  onItemContextMenu?: (itemId: string, clientX: number, clientY: number) => void;
  onTokenDrop?: (sceneCharId: string, x: number, z: number) => void;
  onTokenDrag?: (sceneCharId: string, x: number, z: number) => void;
  onTokenContextMenu?: (sceneCharId: string, clientX: number, clientY: number) => void;
  onDrawStart?: (point: { x: number; y: number }) => void;
  onDrawMove?: (point: { x: number; y: number }) => void;
  onDrawEnd?: () => void;
  fogBrush?: { reveal: boolean; radius: number } | null;
  onFogPaint?: (point: { x: number; y: number }) => void;
  fogRect?: { reveal: boolean } | null;
  onFogRect?: (points: number[]) => void;
  fogColor?: string;
  playerFogRegions?: FogRegion[];
  zoneFogActive?: boolean;
  onZoneFogSelect?: (snap: import('./ZonePortal').EdgeSnap) => void;
  lightPlace?: { preset: string } | null;
  onLightPlace?: (point: { x: number; y: number }) => void;
  lightAttach?: { lightId: string | null } | null;
  tokenPlace?: { entity_type: string; entity_id: string } | null;
  onTokenPlace?: (entityType: string, entityId: string, x: number, z: number) => void;
  renderMode?: import('@/lib/overlayY').RenderMode;
}

type DragStarter = (
  sceneCharId: string,
  clientX?: number,
  clientY?: number,
  tokenX?: number,
  tokenZ?: number
) => void;

function SceneBackground({ url, mapScale = 1, modelYOffset = 0 }: { url: string; mapScale?: number; modelYOffset?: number }) {
  const isModel = /\.(glb|gltf)$/i.test(url);
  const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(url);

  if (isModel) {
    return <SceneBackgroundModel url={url} mapScale={mapScale} modelYOffset={modelYOffset} />;
  }
  if (isVideo) {
    return <SceneBackgroundVideo url={url} mapScale={mapScale} />;
  }

  return <SceneBackgroundImage url={url} mapScale={mapScale} />;
}

// Mapa animado: video reproducido en bucle como textura de fondo (VideoTexture).
// Igual plano/posición que las imágenes; el aspect sale de videoWidth/Height.
function SceneBackgroundVideo({ url, mapScale = 1 }: { url: string; mapScale?: number }) {
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.src = url;
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    textureRef.current = tex;
    const onMeta = () => {
      if (video.videoWidth && video.videoHeight) {
        setAspect(video.videoWidth / video.videoHeight);
        setTexture(tex);
      }
    };
    video.addEventListener('loadedmetadata', onMeta);
    video.play().catch(() => {});
    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.pause();
      video.src = '';
      textureRef.current = null;
      tex.dispose();
    };
  }, [url, gl]);

  useFrame(() => {
    const tex = textureRef.current;
    if (tex) tex.needsUpdate = true;
  });

  if (!texture || !aspect) return null;
  const height = 10 * mapScale;
  const width = height * aspect;
  return (
    <mesh
      name="scene-background"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

function SceneBackgroundImage({ url, mapScale = 1 }: { url: string; mapScale?: number }) {
  const gl = useThree((state) => state.gl);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tex = new THREE.TextureLoader().load(url, (loaded) => {
      if (!alive) return;
      const img = loaded.image as HTMLImageElement;
      if (img.width && img.height) setAspect(img.width / img.height);
      setTexture(loaded);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return () => {
      alive = false;
    };
  }, [url, gl]);

  if (!texture || !aspect) return null;
  const height = 10 * mapScale;
  const width = height * aspect;
  return (
    <mesh
      name="scene-background"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

function SceneBackgroundModel({ url, mapScale = 1, modelYOffset = 0 }: { url: string; mapScale?: number; modelYOffset?: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const minY = box.min.y;
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    c.position.y = -minY + modelYOffset;
    return c;
  }, [scene, modelYOffset]);

  return (
    <group name="scene-background" scale={[mapScale, mapScale, mapScale]}>
      <primitive object={cloned} />
    </group>
  );
}

function SceneLighting({ mode }: { mode: string }) {
  switch (mode) {
    case 'dark':
      return (
        <>
          <ambientLight intensity={0.8} />
          <pointLight position={[0, 5, 0]} intensity={1.0} color="#ff9944" />
          <directionalLight position={[3, 8, 3]} intensity={0.9} />
        </>
      );
    case 'dim':
      return (
        <>
          <ambientLight intensity={1.4} />
          <pointLight position={[0, 5, 0]} intensity={1.8} color="#ffcc77" />
          <directionalLight position={[3, 8, 3]} intensity={1.4} />
        </>
      );
    case 'bright':
      return (
        <>
          <ambientLight intensity={2.5} />
          <directionalLight position={[5, 10, 5]} intensity={3.0} />
          <directionalLight position={[-5, 8, -3]} intensity={1.5} />
        </>
      );
    case 'torchlight':
      return (
        <>
          <ambientLight intensity={1.2} />
          <pointLight position={[-3, 3, 0]} intensity={2.2} color="#ff6600" distance={14} />
          <pointLight position={[3, 3, 0]} intensity={2.2} color="#ff6600" distance={14} />
          <pointLight position={[0, 4, -2]} intensity={1.8} color="#ffaa44" distance={10} />
        </>
      );
    default:
      return (
        <>
          <ambientLight intensity={2.8} />
          <directionalLight position={[5, 10, 5]} intensity={3.2} />
          <directionalLight position={[-3, 6, -3]} intensity={1.5} />
        </>
      );
  }
}

function GridOverlay({ width, height, gridSize, renderMode = '2d' }: { width: number; height: number; gridSize: number; renderMode?: import('@/lib/overlayY').RenderMode }) {
  const gridY = renderMode === '2d' ? 0.015 : 0.02;
  const lines = useMemo(() => {
    const pts: THREE.Vector3[][] = [];
    const halfW = width / 2;
    const halfH = height / 2;
    for (let x = -halfW; x <= halfW; x += gridSize) {
      pts.push([new THREE.Vector3(x, gridY, -halfH), new THREE.Vector3(x, gridY, halfH)]);
    }
    for (let z = -halfH; z <= halfH; z += gridSize) {
      pts.push([new THREE.Vector3(-halfW, gridY, z), new THREE.Vector3(halfW, gridY, z)]);
    }
    return pts;
  }, [width, height, gridSize, gridY]);

  return (
    <group>
      {lines.map((pair, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(pair);
        return <lineSegments key={i} geometry={geo}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </lineSegments>;
      })}
    </group>
  );
}

const GROUND_Y = 0;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);

function DragController({
  onTokenDrop,
  onTokenDrag,
  onTokenPlace,
  gridSize,
  gridSnap,
  otherTokens,
}: {
  onTokenDrop?: (sceneCharId: string, x: number, z: number) => void;
  onTokenDrag?: (sceneCharId: string, x: number, z: number) => void;
  onTokenPlace?: (entityType: string, entityId: string, x: number, z: number) => void;
  gridSize?: number;
  gridSnap?: boolean;
  otherTokens?: Array<{ sceneCharId: string; x: number; z: number; tokenScale?: number }>;
}) {
  const { camera, gl, scene } = useThree();
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragState = useRef<{
    pending: boolean;
    active: boolean;
    sceneCharId: string;
    offsetX: number;
    offsetZ: number;
    startClientX: number;
    startClientY: number;
    captured: boolean;
  } | null>(null);
  const lastDragSendAtRef = useRef(0);

  const getGroundPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, hit);
      return hit;
    },
    [camera, gl, raycaster]
  );

  const clampToBackground = useCallback(
    (v: THREE.Vector3) => {
      const tokenRadius = 0.4;
      scene.traverse((o) => {
        if (o.name === 'scene-background' && o instanceof THREE.Mesh) {
          const params = (o.geometry as THREE.PlaneGeometry).parameters;
          if (!params) return;
          const halfW = params.width / 2 - tokenRadius;
          const halfD = params.height / 2 - tokenRadius;
          v.x = Math.min(halfW, Math.max(-halfW, v.x));
          v.z = Math.min(halfD, Math.max(-halfD, v.z));
        }
      });
      return v;
    },
    [scene]
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const applyDragPosition = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st?.active) return null;

      const hit = getGroundPoint(e.clientX, e.clientY);
      if (!hit) return null;

      hit.x += st.offsetX;
      hit.z += st.offsetZ;
      return clampToBackground(hit);
    };

    const onPointerMove = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st) return;

      if (!st.active) {
        const dx = e.clientX - st.startClientX;
        const dy = e.clientY - st.startClientY;
        if (dx * dx + dy * dy < 25) return;
        st.active = true;
      }

      if (!st.captured) {
        try {
          canvas.setPointerCapture(e.pointerId);
          st.captured = true;
        } catch {
          // pointer may already be released; drag continues without capture
        }
      }

      const newPos = applyDragPosition(e);
      if (!newPos) return;

      if (gridSnap && gridSize && gridSize > 0) {
        // Live snap to cell CENTER: the token snaps cell-to-cell while
        // dragging, so releasing never teleports it (grid lines = cell
        // borders, tokens sit on centers, matching the range overlay).
        newPos.x = (Math.round(newPos.x / gridSize - 0.5) + 0.5) * gridSize;
        newPos.z = (Math.round(newPos.z / gridSize - 0.5) + 0.5) * gridSize;
      }

      scene.traverse((child: THREE.Object3D) => {
        if (
          child.userData?.sceneCharId === dragState.current?.sceneCharId &&
          child instanceof THREE.Group &&
          child.children.length > 0
        ) {
          child.position.x = newPos.x;
          child.position.z = newPos.z;
        }
      });

      const now = performance.now();
      if (now - lastDragSendAtRef.current >= 16) {
        lastDragSendAtRef.current = now;
        onTokenDrag?.(st.sceneCharId, newPos.x, newPos.z);
      }
    };

    const releaseDrag = () => {
      dragState.current = null;
      lastDragSendAtRef.current = 0;
      if (controls) controls.enabled = true;
      canvas.style.cursor = 'auto';
    };

    const onPointerUp = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st) return;

      if (!st.active) {
        releaseDrag();
        return;
      }

      let newPos = applyDragPosition(e);
      if (newPos) {
        if (gridSnap && gridSize && gridSize > 0) {
          // Snap to cell CENTER (0.5 offset), matching the reachable-cell
          // overlay — the grid lines are cell borders, tokens sit on centers.
          newPos.x = (Math.round(newPos.x / gridSize - 0.5) + 0.5) * gridSize;
          newPos.z = (Math.round(newPos.z / gridSize - 0.5) + 0.5) * gridSize;
        }
        if (otherTokens) {
          const myRadius = 0.4;
          for (const other of otherTokens) {
            if (other.sceneCharId === st.sceneCharId) continue;
            const otherRadius = 0.4 * (other.tokenScale ?? 1);
            const minDist = myRadius + otherRadius;
            const dx = newPos.x - other.x;
            const dz = newPos.z - other.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist && dist > 0) {
              const push = (minDist - dist) / 2;
              const nx = dx / dist;
              const nz = dz / dist;
              newPos.x += nx * push;
              newPos.z += nz * push;
            }
          }
        }
        onTokenDrop?.(st.sceneCharId, newPos.x, newPos.z);
      }

      releaseDrag();
    };

    const onPointerCancel = () => {
      if (!dragState.current) return;
      releaseDrag();
    };

    const onDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types ?? [];
      if (types.includes('roleito/token')) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }
    };

    const onDrop = (e: DragEvent) => {
      const raw = e.dataTransfer?.getData('roleito/token');
      if (!raw) return;
      e.preventDefault();
      const sep = raw.indexOf(':');
      if (sep < 0) return;
      const entityType = raw.slice(0, sep);
      const entityId = raw.slice(sep + 1);
      const hit = getGroundPoint(e.clientX, e.clientY);
      if (!hit) return;
      const pos = clampToBackground(hit);
      if (gridSnap && gridSize && gridSize > 0) {
        pos.x = (Math.round(pos.x / gridSize - 0.5) + 0.5) * gridSize;
        pos.z = (Math.round(pos.z / gridSize - 0.5) + 0.5) * gridSize;
      }
      onTokenPlace?.(entityType, entityId, pos.x, pos.z);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('dragover', onDragOver);
    canvas.addEventListener('drop', onDrop);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('dragover', onDragOver);
      canvas.removeEventListener('drop', onDrop);
    };
  }, [gl, getGroundPoint, clampToBackground, onTokenDrop, onTokenDrag, onTokenPlace, controls, scene, gridSize, gridSnap, otherTokens]);

  // Expose startDrag via a global function on the canvas.
  // Mutating the external DOM canvas node inside an effect is intentional:
  // DOM nodes live outside React's render graph, but the immutability rule
  // cannot see that `canvas` aliases `gl.domElement` rather than a render value.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const canvas = gl.domElement as HTMLCanvasElement & {
      __startDrag?: DragStarter;
      __isTokenDragging?: (sceneCharId: string) => boolean;
    };
    canvas.__startDrag = (sceneCharId, clientX?, clientY?, tokenX = 0, tokenZ = 0) => {
      let offsetX = 0;
      let offsetZ = 0;
      if (clientX != null && clientY != null) {
        const grabPoint = getGroundPoint(clientX, clientY);
        if (grabPoint) {
          offsetX = tokenX - grabPoint.x;
          offsetZ = tokenZ - grabPoint.z;
        }
      }
      dragState.current = {
        pending: true,
        active: false,
        sceneCharId,
        offsetX,
        offsetZ,
        startClientX: clientX ?? 0,
        startClientY: clientY ?? 0,
        captured: false,
      };
      if (controls) controls.enabled = false;
      canvas.style.cursor = 'grabbing';
    };
    canvas.__isTokenDragging = (sceneCharId: string) => {
      const st = dragState.current;
      return !!st && st.sceneCharId === sceneCharId && st.active;
    };
    return () => {
      canvas.__startDrag = undefined;
      canvas.__isTokenDragging = undefined;
    };
  }, [gl, getGroundPoint, controls, scene]);
  /* eslint-enable react-hooks/immutability */

  return null;
}

function DraggableToken({
  entity,
  isSelected,
  isMovable,
  onClick,
  onContextMenu,
}: {
  entity: SceneEntity;
  isSelected: boolean;
  isMovable: boolean;
  onClick?: (sceneCharId: string) => void;
  onContextMenu?: (sceneCharId: string, clientX: number, clientY: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.sceneCharId = entity.sceneCharId;
    }
  }, [entity.sceneCharId]);

  // Apply position imperatively: guarantees the Three.js group moves even if
  // R3F skips array-prop reconciliation on `<group position={[...]}>`.
  // Skip while THIS token is drag-active: the drag handler owns the group
  // position directly; applying stale entity coords mid-drag makes it erratic.
  useEffect(() => {
    if (!groupRef.current) return;
    const canvas = document.querySelector('canvas') as
      | (HTMLCanvasElement & { __isTokenDragging?: (id: string) => boolean })
      | null;
    if (canvas?.__isTokenDragging?.(entity.sceneCharId)) return;
    groupRef.current.position.set(entity.x, entity.y, entity.z);
  }, [entity.x, entity.y, entity.z]);

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
      if (isMovable) {
        const canvas = document.querySelector('canvas') as (HTMLCanvasElement & {
          __startDrag?: DragStarter;
        }) | null;
        if (canvas?.__startDrag) {
          const native = (e as unknown as { nativeEvent?: PointerEvent }).nativeEvent;
          canvas.__startDrag(
            entity.sceneCharId,
            native?.clientX,
            native?.clientY,
            entity.x,
            entity.z
          );
        }
      }

      onClick?.(entity.sceneCharId);
    },
    [entity, isMovable, onClick]
  );

  const invisible = (entity.statuses ?? []).includes('invisible');
  const [modelH, setModelH] = useState(0);
  const tokenScale = entity.tokenScale ?? 1;
  const topY = entity.modelUrl
    ? (modelH > 0 ? modelH * tokenScale * 1.06 : 1.15 * tokenScale)
    : 1.3 * tokenScale;

  return (
    <group ref={groupRef} position={[entity.x, entity.y, entity.z]}>
      {entity.modelUrl ? (
        <TokenModel
          id={entity.sceneCharId}
          name={entity.name}
          type={entity.type}
          position={[0, 0, 0]}
          modelUrl={entity.modelUrl}
          rotation={(entity.rotation ?? 0) + (entity.facingOffset ?? 0)}
          isSelected={isSelected}
          tokenScale={entity.tokenScale ?? 1}
          brightness={entity.brightness ?? 0}
          invisible={invisible}
          onHeight={setModelH}
          onPointerDown={handlePointerDown}
          onContextMenu={(e) => {
            const domEvent = e as unknown as PointerEvent;
            onContextMenu?.(entity.sceneCharId, domEvent.clientX, domEvent.clientY);
          }}
        />
      ) : (
        <TokenSprite
          id={entity.sceneCharId}
          name={entity.name}
          type={entity.type}
          position={[0, 0, 0]}
          portraitUrl={entity.portraitUrl}
          isSelected={isSelected}
          tokenScale={entity.tokenScale ?? 1}
          invisible={invisible}
          onPointerDown={handlePointerDown}
          onContextMenu={(e) => {
            const domEvent = e as unknown as PointerEvent;
            onContextMenu?.(entity.sceneCharId, domEvent.clientX, domEvent.clientY);
          }}
        />
      )}
      <StatusIconMarkers
        statuses={entity.statuses ?? []}
        tokenScale={tokenScale}
        topY={topY}
      />
      <StatusEffects
        statuses={entity.statuses ?? []}
        tokenScale={tokenScale}
        topY={topY}
      />
    </group>
  );
}

function StatusIconMarkers({
  statuses,
  tokenScale,
  topY,
}: {
  statuses: string[];
  tokenScale: number;
  topY: number;
}) {
  const visible = statuses.filter((s) => STATUS_ICONS[s]).slice(0, 5);
  if (visible.length === 0) return null;
  const n = visible.length;
  return (
    <Billboard position={[0, topY, 0]}>
      {visible.map((s, i) => (
        <group key={s} position={[(i - (n - 1) / 2) * 0.52 * tokenScale, 0, 0]}>
          <mesh renderOrder={60}>
            <circleGeometry args={[0.22 * tokenScale, 24]} />
            <meshBasicMaterial
              color={STATUS_COLORS[s]}
              transparent
              opacity={0.85}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <Text
            fontSize={0.22 * tokenScale}
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.01]}
            renderOrder={61}
          >
            {STATUS_ICONS[s]}
          </Text>
        </group>
      ))}
    </Billboard>
  );
}

interface Particle {
  age: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  phase: number;
  sizeMul: number;
}

type ParticleSpawn = (p: Particle, t: number, scale: number) => void;
type ParticleStep = (p: Particle, dt: number, t: number, scale: number) => {
  x: number;
  y: number;
  z: number;
  s: number;
};

function ParticleField({
  count,
  color,
  size,
  scale,
  spawn,
  step,
  additive = false,
}: {
  count: number;
  color: string;
  size: number;
  scale: number;
  spawn: ParticleSpawn;
  step: ParticleStep;
  additive?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const parts = useRef<Particle[]>([]);
  if (parts.current.length === 0) {
    for (let i = 0; i < count; i++) {
      const p: Particle = {
        age: 0,
        maxLife: 1,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        phase: Math.random() * Math.PI * 2,
        sizeMul: 1,
      };
      spawn(p, 0, scale);
      p.age = Math.random() * p.maxLife;
      parts.current.push(p);
    }
  }
  const lastT = useRef(0);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const dt = Math.min(t - lastT.current, 0.05) || 0.016;
    lastT.current = t;
    const mesh = meshRef.current;
    if (!mesh) return;
    parts.current.forEach((p, i) => {
      p.age += dt;
      if (p.age >= p.maxLife) {
        spawn(p, t, scale);
        p.age = 0;
      }
      const r = step(p, dt, t, scale);
      dummy.position.set(r.x, r.y, r.z);
      dummy.scale.setScalar(Math.max(size * scale * p.sizeMul * r.s, 0.0001));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
      frustumCulled={false}
      renderOrder={58}
    >
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.85}
        depthWrite={false}
        toneMapped={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

function StunOrbit({ scale, y }: { scale: number; y: number }) {
  const grp = useRef<THREE.Group>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (grp.current) grp.current.rotation.y = t * 2.2;
    const a = ringARef.current;
    if (a) {
      a.rotation.x = Math.PI / 2 + Math.sin(t * 1.15 + 0.5) * 0.55;
      a.rotation.y = t * 0.7;
      a.scale.set(1 + 0.28 * Math.sin(t * 1.35), 1, 1 - 0.22 * Math.sin(t * 1.35));
    }
    const b = ringBRef.current;
    if (b) {
      b.rotation.x = Math.PI / 2 + Math.cos(t * 0.95 + 1.7) * 0.45;
      b.rotation.y = -t * 0.5;
      b.scale.set(1 - 0.22 * Math.sin(t * 1.2 + 2), 1, 1 + 0.26 * Math.sin(t * 1.2 + 2));
    }
  });
  const r = 0.18 * scale;
  const ringR = 0.24 * scale;
  return (
    <group ref={grp} position={[0, y, 0]}>
      <mesh ref={ringARef} renderOrder={57}>
        <torusGeometry args={[ringR, 0.008 * scale, 8, 40]} />
        <meshBasicMaterial color="#eab308" transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ringBRef} renderOrder={57}>
        <torusGeometry args={[ringR * 0.8, 0.008 * scale, 8, 40]} />
        <meshBasicMaterial color="#eab308" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <Billboard key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <Text fontSize={0.09 * scale} anchorX="center" anchorY="middle">
              ⭐
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}

function RestraintChains({ scale }: { scale: number }) {
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (grp.current) {
      grp.current.rotation.z = Math.sin(clock.elapsedTime * 2.5) * 0.05;
      grp.current.rotation.x = Math.sin(clock.elapsedTime * 1.7 + 1) * 0.04;
    }
  });
  const midH = 0.5 * scale;
  const anchors: [number, number][] = [
    [0.3, 0.3],
    [-0.3, 0.3],
    [0.3, -0.3],
    [-0.3, -0.3],
  ];
  const baseDir = new THREE.Vector3(0, 0, 1);
  const LINKS = 5;
  return (
    <group ref={grp}>
      {anchors.map(([ax, az], i) => {
        const x0 = ax * scale;
        const z0 = az * scale;
        const dir = new THREE.Vector3(-x0, midH, -z0).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(baseDir, dir);
        const q90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        q.multiply(q90);
        const e = new THREE.Euler().setFromQuaternion(q);
        return (
          <group key={i}>
            {Array.from({ length: LINKS }, (_, l) => {
              const t = l / (LINKS - 1);
              const sag = Math.sin(t * Math.PI) * 0.035 * scale;
              return (
                <mesh
                  key={l}
                  position={[x0 * (1 - t), t * midH - sag, z0 * (1 - t)]}
                  rotation={[e.x, e.y, e.z + (l % 2) * (Math.PI / 2)]}
                  scale={[1.6, 1, 1]}
                >
                  <torusGeometry args={[0.055 * scale, 0.019 * scale, 8, 14]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.45} />
                </mesh>
              );
            })}
          </group>
        );
      })}
      <mesh position={[0, midH, 0]} renderOrder={58}>
        <torusGeometry args={[0.07 * scale, 0.022 * scale, 8, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

function SleepZ({ scale, y }: { scale: number; y: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const cyc = (t * 0.55 + i * 0.33) % 1;
      m.position.y = y + cyc * 0.42 * scale;
      m.position.x = (-0.12 + i * 0.11 + Math.sin(cyc * Math.PI) * 0.03) * scale;
      m.scale.setScalar(0.75 + 0.45 * cyc);
      const mat = m.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = Math.sin(Math.PI * cyc);
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <Text
          key={i}
          ref={(el) => { if (el) refs.current[i] = el; }}
          fontSize={0.19 * scale}
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0]}
          color="#ffffff"
        >
          z
        </Text>
      ))}
    </group>
  );
}

function StatusEffects({ statuses, tokenScale, topY }: { statuses: string[]; tokenScale: number; topY: number }) {
  const s = tokenScale;
  const fireLayers = [
    { color: '#f97316', count: 10, size: 0.07, vy: 0.2, life: 0.75 },
    { color: '#fbbf24', count: 12, size: 0.05, vy: 0.3, life: 0.62 },
    { color: '#fde047', count: 8, size: 0.034, vy: 0.42, life: 0.5 },
  ] as const;
  return (
    <group>
      {statuses.includes('bleeding') && (
        <ParticleField
          count={10}
          color="#ef4444"
          size={0.045}
          scale={s}
          spawn={(p, _t, scale) => {
            p.x = (Math.random() - 0.5) * 0.4 * scale;
            p.y = topY + (Math.random() - 0.5) * 0.12 * scale;
            p.z = (Math.random() - 0.5) * 0.22 * scale;
            p.vx = (Math.random() - 0.5) * 0.06;
            p.vy = -0.16 * scale - Math.random() * 0.1 * scale;
            p.vz = (Math.random() - 0.5) * 0.05;
            p.maxLife = 0.5 + Math.random() * 0.35;
            p.sizeMul = 0.75 + Math.random() * 0.5;
          }}
          step={(p, dt, _t, _s) => {
            const a = Math.min(p.age / p.maxLife, 1);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            return { x: p.x, y: p.y, z: p.z, s: Math.sin(Math.PI * a) * 0.9 };
          }}
        />
      )}
      {statuses.includes('burning') &&
        fireLayers.map((L) => (
          <ParticleField
            key={L.color}
            count={L.count}
            color={L.color}
            size={L.size}
            scale={s}
            additive
            spawn={(p, _t, scale) => {
              const a = Math.random() * Math.PI * 2;
              const r = Math.random() * 0.28 * scale;
              p.x = Math.cos(a) * r;
              p.z = Math.sin(a) * r;
              p.y = 0.04 * scale + Math.random() * 0.45 * scale;
              p.vx = (Math.random() - 0.5) * 0.18;
              p.vy = L.vy * scale + Math.random() * 0.12 * scale;
              p.vz = (Math.random() - 0.5) * 0.18;
              p.maxLife = L.life * (0.8 + Math.random() * 0.45);
              p.sizeMul = 0.7 + Math.random() * 0.6;
            }}
            step={(p, dt, t, _s) => {
              const a = Math.min(p.age / p.maxLife, 1);
              p.x += (p.vx + Math.sin(t * 14 + p.age * 9) * 0.035) * dt;
              p.y += p.vy * dt;
              p.z += p.vz * dt;
              return { x: p.x, y: p.y, z: p.z, s: Math.sin(Math.PI * a) };
            }}
          />
        ))}
      {statuses.includes('poisoned') && (
        <ParticleField
          count={8}
          color="#22c55e"
          size={0.09}
          scale={s}
          spawn={(p, _t, scale) => {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.35 * scale;
            p.x = Math.cos(a) * r;
            p.z = Math.sin(a) * r;
            p.y = 0.08 * scale + Math.random() * 0.7 * scale;
            p.vx = (Math.random() - 0.5) * 0.04;
            p.vy = 0.06 * scale + Math.random() * 0.04 * scale;
            p.vz = (Math.random() - 0.5) * 0.04;
            p.maxLife = 1.1 + Math.random() * 0.5;
            p.sizeMul = 1;
          }}
          step={(p, dt, _t, _s) => {
            const a = Math.min(p.age / p.maxLife, 1);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            return { x: p.x, y: p.y, z: p.z, s: Math.sin(Math.PI * a) };
          }}
        />
      )}
      {statuses.includes('concentrating') && (
        <ParticleField
          count={10}
          color="#60a5fa"
          size={0.035}
          scale={s}
          spawn={(p, _t, scale) => {
            const a = Math.random() * Math.PI * 2;
            const r = 0.1 + Math.random() * 0.45;
            p.x = Math.cos(a) * r * scale;
            p.z = Math.sin(a) * r * scale;
            p.y = (topY - 0.3 * scale) + Math.random() * 0.4 * scale;
            p.vx = (Math.random() - 0.5) * 0.03;
            p.vy = 0.2 * scale + Math.random() * 0.1 * scale;
            p.vz = (Math.random() - 0.5) * 0.03;
            p.maxLife = 0.8 + Math.random() * 0.4;
            p.sizeMul = 0.8 + Math.random() * 0.4;
          }}
          step={(p, dt, t, _s) => {
            const a = Math.min(p.age / p.maxLife, 1);
            p.x += (p.vx + Math.sin(t * 9 + p.phase) * 0.015) * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            return { x: p.x, y: p.y, z: p.z, s: Math.sin(Math.PI * a) * (0.6 + 0.4 * Math.sin(t * 5 + p.phase)) };
          }}
        />
      )}
      {statuses.includes('blinded') && (
        <ParticleField
          count={6}
          color="#9ca3af"
          size={0.05}
          scale={s}
          spawn={(p, _t, scale) => {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.35 * scale;
            p.x = Math.cos(a) * r;
            p.z = Math.sin(a) * r;
            p.y = (topY - 0.2 * scale) + Math.random() * 0.35 * scale;
            p.vx = (Math.random() - 0.5) * 0.02;
            p.vy = 0.05 * scale;
            p.vz = (Math.random() - 0.5) * 0.02;
            p.maxLife = 1.4 + Math.random() * 0.5;
            p.sizeMul = 1;
          }}
          step={(p, dt, t, _s) => {
            const a = Math.min(p.age / p.maxLife, 1);
            p.x += (p.vx + Math.cos(t * 0.7 + p.phase) * 0.01) * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            return { x: p.x, y: p.y, z: p.z, s: Math.sin(Math.PI * a) * 0.55 };
          }}
        />
      )}
      {statuses.includes('invisible') && (
        <ParticleField
          count={12}
          color="#c4b5fd"
          size={0.03}
          scale={s}
          spawn={(p, _t, scale) => {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.42 * scale;
            p.x = Math.cos(a) * r;
            p.z = Math.sin(a) * r;
            p.y = 0.05 * scale + Math.random() * (topY - 0.05 * scale);
            p.vx = (Math.random() - 0.5) * 0.04;
            p.vy = 0.1 * scale;
            p.vz = (Math.random() - 0.5) * 0.04;
            p.maxLife = 1 + Math.random() * 0.5;
            p.sizeMul = 0.6 + Math.random() * 0.6;
          }}
          step={(p, dt, t, _s) => {
            const a = Math.min(p.age / p.maxLife, 1);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            return { x: p.x, y: p.y, z: p.z, s: Math.max(0.15, Math.abs(Math.sin(t * 3 + p.phase))) * (1 - a) };
          }}
        />
      )}
      {statuses.includes('stunned') && <StunOrbit scale={s} y={topY - 0.08 * s} />}
      {statuses.includes('restrained') && <RestraintChains scale={s} />}
      {statuses.includes('prone') && <SleepZ scale={s} y={topY + 0.1 * s} />}
    </group>
  );
}

function MovementRangeOverlay({
  cells,
  cellSize,
  renderMode,
}: {
  cells: MovementCell[];
  cellSize: number;
  renderMode: string;
}) {
  const y = renderMode === '2d' ? 0.09 : 0.25;
  return (
    <group>
      {cells.map((c, i) =>
        c.cost <= 0 ? null : (
          <mesh
            key={i}
            position={[c.x, y, c.y]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={60}
          >
            <planeGeometry args={[cellSize * 0.92, cellSize * 0.92]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
          </mesh>
        ),
      )}
    </group>
  );
}

export default function SceneRenderer({
  backgroundUrl,
  characters,
  items = [],
  lighting = 'neutral',
  selectedTokenId,
  selectedItemIds = [],
  readOnly = false,
  showZones = false,
  movableEntityIds,
  mapScale = 1,
  modelYOffset = 0,
  gridSize = 0,
  gridSnap = false,
  movementRange = null,
  drawState = null,
  zoneDraft = null,
  onZoneAddPoint,
  onZoneDragStart,
  onZoneDragMove,
  onZoneDragEnd,
  onZoneFinish,
  portalDraft = null,
  portalZones = [],
  onPortalSelect,
  onPortalMove,
  onTokenClick,
  onItemClick,
  onItemContextMenu,
  onTokenDrop,
  onTokenDrag,
  onTokenContextMenu,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  fogBrush = null,
  onFogPaint,
  fogRect = null,
  onFogRect,
  fogColor = 'rgba(15, 23, 42, 0.55)',
  playerFogRegions = [],
  zoneFogActive = false,
  onZoneFogSelect,
  lightPlace = null,
  onLightPlace,
  lightAttach = null,
  tokenPlace = null,
  onTokenPlace,
  renderMode = '2d',
}: SceneRendererProps) {
  const visibleChars = useMemo(() => characters.filter((c) => c.visible), [characters]);
  const renderItems = useMemo(() => {
    return items
      .filter((i) => i.visible && (showZones || i.metadata.type !== 'zone'))
      .sort((a, b) => {
        if (a.layer !== b.layer) return a.layer - b.layer
        return a.zIndex - b.zIndex
      })
  }, [items, showZones]);
  const attachedLight = useMemo(() => {
    const info = new Map<string, { pos: [number, number, number]; rotation: number }>();
    for (const item of items) {
      const meta = item.metadata as { type?: string; attachedTo?: string } | undefined;
      if (item.visible && meta?.type === 'light' && meta.attachedTo) {
        const ch = visibleChars.find((c) => c.sceneCharId === meta.attachedTo);
        if (ch)       info.set(item.id, { pos: [ch.x, 0, ch.z], rotation: ch.rotation ?? 0 });
      }
    }
    return info;
  }, [items, visibleChars]);
  const fogRegions = useMemo(
    () => [...extractFogRegions(items), ...(playerFogRegions ?? [])],
    [items, playerFogRegions],
  );
  const drawing = !!drawState || !!zoneDraft || !!portalDraft || !!fogBrush || !!fogRect || zoneFogActive || !!lightPlace || !!lightAttach || !!tokenPlace;
  const hasDrag = !drawing && (!readOnly || (movableEntityIds && movableEntityIds.length > 0));
  const justSelectedRef = useRef(false);
  const [imageAspect, setImageAspect] = useState(1);
  const mapHeight = 10 * mapScale;
  const mapWidth = mapHeight * imageAspect;
  const occluders = useMemo(
    () => buildOccluders(items ?? [], mapWidth, mapHeight),
    [items, mapWidth, mapHeight],
  );
  const maxDistance = Math.max(25, mapScale * 15);

  useEffect(() => {
    if (!backgroundUrl) return;
    if (/\.(glb|gltf)$/i.test(backgroundUrl)) {
      setImageAspect(1);
      return;
    }
    if (/\.(mp4|webm|mov|ogg)$/i.test(backgroundUrl)) {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        if (video.videoWidth && video.videoHeight) setImageAspect(video.videoWidth / video.videoHeight);
      };
      video.src = backgroundUrl;
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.width && img.height) setImageAspect(img.width / img.height);
    };
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  const handleCanvasPointerMissed = useCallback(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    onTokenClick?.('');
  }, [onTokenClick]);

  const handleTokenClickWrap = useCallback((id: string) => {
    justSelectedRef.current = true;
    setTimeout(() => { justSelectedRef.current = false; }, 0);
    onTokenClick?.(id);
  }, [onTokenClick]);

  return (
    <Canvas
      camera={{ position: [0, 8, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={handleCanvasPointerMissed}
    >
      <SceneLighting mode={lighting} />
      <Suspense fallback={null}>
        <SceneBackground url={backgroundUrl} mapScale={mapScale} modelYOffset={modelYOffset} />
      </Suspense>
      {gridSize > 0 && <GridOverlay width={mapWidth} height={mapHeight} gridSize={gridSize} renderMode={renderMode} />}
      {movementRange && (
        <MovementRangeOverlay
          cells={movementRange.cells}
          cellSize={movementRange.cellSize}
          renderMode={renderMode}
        />
      )}
      {hasDrag && (
        <DragController
          onTokenDrop={onTokenDrop}
          onTokenDrag={onTokenDrag}
          onTokenPlace={onTokenPlace}
          gridSize={gridSize}
          gridSnap={gridSnap}
          otherTokens={visibleChars.map((c) => ({
            sceneCharId: c.sceneCharId,
            x: c.x,
            z: c.z,
            tokenScale: c.tokenScale,
          }))}
        />
      )}
      {visibleChars.map((ch) => {
        const isMovable = movableEntityIds
          ? movableEntityIds.includes(ch.sceneCharId)
          : !readOnly;
        return (
          <DraggableToken
            key={ch.sceneCharId}
            entity={ch}
            isSelected={isMovable && selectedTokenId === ch.sceneCharId}
            isMovable={isMovable}
            onClick={isMovable ? handleTokenClickWrap : undefined}
            onContextMenu={isMovable ? onTokenContextMenu : undefined}
          />
        );
      })}
      {renderItems.map((item) => (
        <ItemRenderer
          key={item.id}
          item={item}
          isSelected={selectedItemIds.includes(item.id)}
          readOnly={readOnly}
          showZones={showZones}
          onClick={onItemClick ? () => onItemClick(item.id) : undefined}
          onContextMenu={onItemContextMenu ? (e) => onItemContextMenu(item.id, e.clientX, e.clientY) : undefined}
          mapScale={mapScale}
          imageAspect={imageAspect}
          positionOverride={item.metadata.type === 'light' ? attachedLight.get(item.id)?.pos : undefined}
          rotationOverride={item.metadata.type === 'light' ? attachedLight.get(item.id)?.rotation : undefined}
          occluders={occluders}
          renderMode={renderMode}
        />
      ))}
      {drawState && onDrawStart && onDrawMove && onDrawEnd && (
        <WallDrawerCanvas
          drawState={drawState}
          onDrawStart={onDrawStart}
          onDrawMove={onDrawMove}
          onDrawEnd={onDrawEnd}
          renderMode={renderMode}
        />
      )}
      {zoneDraft && onZoneAddPoint && onZoneDragStart && onZoneDragMove && onZoneDragEnd && onZoneFinish && (
        <ZoneDrawerCanvas
          draft={zoneDraft}
          onAddPoint={onZoneAddPoint}
          onDragStart={onZoneDragStart}
          onDragMove={onZoneDragMove}
          onDragEnd={onZoneDragEnd}
          onFinishPolygon={onZoneFinish}
          renderMode={renderMode}
        />
      )}
      {(portalDraft && onPortalSelect && onPortalMove) && (
        <PortalDrawerCanvas
          draft={portalDraft}
          zones={portalZones}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          onSelect={onPortalSelect}
          onMove={onPortalMove}
          renderMode={renderMode}
        />
      )}
      {(zoneFogActive && onZoneFogSelect) && (
        <PortalDrawerCanvas
          draft={createEmptyPortalDraft()}
          zones={portalZones}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          onSelect={onZoneFogSelect}
          onMove={() => {}}
          snapMode="inside"
          renderMode={renderMode}
        />
      )}
      {fogRegions.length > 0 && (
        <FogOverlay regions={fogRegions} color={fogColor} mapWidth={mapWidth} mapHeight={mapHeight} renderMode={renderMode} />
      )}
      {fogBrush && onFogPaint && (
        <FogBrushCanvas
          reveal={fogBrush.reveal}
          radius={fogBrush.radius}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          onPaint={onFogPaint}
          renderMode={renderMode}
        />
      )}
      {fogRect && onFogRect && (
        <FogRectCanvas
          reveal={fogRect.reveal}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          onRect={onFogRect}
          renderMode={renderMode}
        />
      )}
      {lightPlace && onLightPlace && (
        <LightPlaceCanvas
          presetKey={lightPlace.preset}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          onPlace={onLightPlace}
          renderMode={renderMode}
        />
      )}
      {tokenPlace && onTokenPlace && (
        <TokenPlaceCanvas
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          onPlace={(p) => onTokenPlace(tokenPlace.entity_type, tokenPlace.entity_id, p.x, p.z)}
        />
      )}
      <OrbitControls
        makeDefault
        enabled={!drawing}
        enablePan={!drawing}
        enableZoom={!drawing}
        enableRotate={!drawing}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={maxDistance}
      />
    </Canvas>
  );
}
