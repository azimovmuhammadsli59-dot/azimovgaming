import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function SpinningArenaCore({ accent }: { accent: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.65;
      groupRef.current.rotation.x = Math.sin(performance.now() * 0.0012) * 0.15;
    }
  });

  return (
    <Float speed={2.2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef}>
        <mesh>
          <octahedronGeometry args={[1.05, 0]} />
          <meshStandardMaterial
            color={accent}
            roughness={0.22}
            metalness={0.82}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.45, 0.07, 12, 48]} />
          <meshStandardMaterial
            color="#e2e8f0"
            roughness={0.25}
            metalness={0.85}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[1.65, 0.045, 10, 48]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      </group>
    </Float>
  );
}

export function ArenaEmblem3D({ accent = '#f59e0b' }: { accent?: string }) {
  return (
    <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto">
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 5, 4]} intensity={1.8} color="#fffbeb" />
        <directionalLight position={[-4, -2, -3]} intensity={0.8} color={accent} />
        <SpinningArenaCore accent={accent} />
      </Canvas>
    </div>
  );
}
