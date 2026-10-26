export type RoomSkin = {
  id: string;
  label: string;
  modelUrl?: string;
  modelScale?: number;
  floorOffset?: number;
  /** Coordenadas donde debe aparecer el mapa de juego */
  mapAnchor: { x: number; y: number; z: number };
  /** Posición inicial de cámara relativa al anclaje */
  camera: { x: number; y: number; z: number };
  roomRadius: number;
};

export const ROOM_SKINS: RoomSkin[] = [
  {
    id: 'none',
    label: 'Sin cuarto (vacío)',
    modelUrl: undefined,
    mapAnchor: { x: 0, y: 0, z: 0 },
    camera: { x: 0, y: 8, z: 8 },
    roomRadius: 25,
  },
  {
    id: 'oggys',
    label: "Oggy's Room",
    modelUrl: '/room/oggys-room/scene.gltf',
    modelScale: 40,
    floorOffset: -30,
    mapAnchor: { x: 0, y: 136, z: 0 },
    camera: { x: 0, y: 140, z: 12 },
    roomRadius: 19 * 40,
  },
  {
    id: 'skybox-anime',
    label: 'Anime Sky (skybox)',
    modelUrl: '/room/skybox-anime-sky/scene.glb',
    modelScale: 300,
    floorOffset: 0,
    mapAnchor: { x: 0, y: 0, z: 0 },
    camera: { x: 0, y: 2, z: 6 },
    roomRadius: 100000,
  },
];

export const DEFAULT_ROOM_SKIN = 'oggys';

export function getRoomSkin(id?: string | null): RoomSkin {
  if (!id) return ROOM_SKINS.find((s) => s.id === DEFAULT_ROOM_SKIN) || ROOM_SKINS[0];
  return ROOM_SKINS.find((s) => s.id === id) || ROOM_SKINS.find((s) => s.id === DEFAULT_ROOM_SKIN) || ROOM_SKINS[0];
}
