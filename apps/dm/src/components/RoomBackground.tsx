import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

/**
 * Fondo de "cuarto virtual" usando el modelo glTF de Oggy's room.
 *
 * Se escala para que sea MUCHO mÃ¡s grande que los tableros (que miden ~20
 * unidades con map_scale=1), de modo que el tablero queda como una mesa en
 * el centro del cuarto. El radio de la cÃ¡mara se ajusta al tamaÃ±o del cuarto.
 *
 * Ajustar MODEL_BASE_SCALE / FLOOR_Y_OFFSET acÃ¡ para "acomodarlo".
 */
const ROOM_URL = '/room/oggys-room/scene.gltf';

/** Escala base sobre el modelo (~38 unidades de ancho). 40 => ~1520 unidades (mucho mÃ¡s grande que el tablero). */
const MODEL_BASE_SCALE = 40;
/** Baja el modelo para que el piso quede bien por debajo del tablero (mapa flotando en el medio). */
const FLOOR_Y_OFFSET = -30;

export default function RoomBackground({
  skin = 'oggys',
  mapScale = 1,
}: { size?: number; skin?: string; mapScale?: number }) {
  const { scene } = useGLTF(ROOM_URL);
  void skin;
  void mapScale;

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        // El cuarto es decoraciÃ³n: no debe capturar clics ni arrastres.
        mesh.raycast = () => {};
      }
    });
    return c;
  }, [scene]);

  // TamaÃ±o FIJO: el cuarto virtual no crece con el mapa de juego.
  const scale = MODEL_BASE_SCALE;

  // sin clamp de cÃ¡mara (evita tirones)

  return (
    <primitive object={cloned} scale={scale} position={[0, FLOOR_Y_OFFSET, 0]} />
  );
}
