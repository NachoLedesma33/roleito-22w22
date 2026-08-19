import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import TokenSprite from './TokenSprite';

interface SceneEntity {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  visible: boolean;
  portraitUrl?: string | null;
}

interface SceneRendererProps {
  backgroundUrl: string;
  characters: SceneEntity[];
  lighting?: string;
}

function SceneBackground({ url }: { url: string }) {
  const texture = useTexture(url);
  const img = texture.image as HTMLImageElement;
  const aspect = img.width / img.height;
  const width = 10 * aspect;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[width, 10]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

function SceneLighting({ mode }: { mode: string }) {
  switch (mode) {
    case 'dark':
      return (
        <>
          <ambientLight intensity={0.15} />
          <pointLight position={[0, 5, 0]} intensity={0.4} color="#ff9944" />
        </>
      );
    case 'dim':
      return (
        <>
          <ambientLight intensity={0.3} />
          <pointLight position={[0, 5, 0]} intensity={0.6} color="#ffcc77" />
        </>
      );
    case 'bright':
      return (
        <>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={1.0} />
        </>
      );
    case 'torchlight':
      return (
        <>
          <ambientLight intensity={0.2} />
          <pointLight position={[-3, 3, 0]} intensity={0.8} color="#ff6600" distance={12} />
          <pointLight position={[3, 3, 0]} intensity={0.8} color="#ff6600" distance={12} />
        </>
      );
    default:
      return (
        <>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={0.8} />
        </>
      );
  }
}

export default function SceneRenderer({ backgroundUrl, characters, lighting = 'neutral' }: SceneRendererProps) {
  const visibleChars = useMemo(() => characters.filter((c) => c.visible), [characters]);

  return (
    <Canvas
      camera={{ position: [0, 8, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneLighting mode={lighting} />
      <Suspense fallback={null}>
        <SceneBackground url={backgroundUrl} />
      </Suspense>
      {visibleChars.map((ch) => (
        <TokenSprite
          key={ch.id}
          name={ch.name}
          type={ch.type}
          position={[ch.x, ch.y, ch.z]}
          portraitUrl={ch.portraitUrl}
        />
      ))}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={25}
      />
    </Canvas>
  );
}
