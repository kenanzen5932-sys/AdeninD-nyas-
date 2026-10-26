import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProceduralCharacter } from "./ProceduralCharacter";

function RotatingPreview({ model }: { model: string }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.5; // Podyumda tatlı 360 derece yavaş dönüş
    }
  });

  return (
    <group ref={group} position={[0, -0.85, 0]}>
      <ProceduralCharacter modelName={model} name="" isPreview={true} />
    </group>
  );
}

export function CharacterPreview({ model }: { model: string }) {
  return (
    <div className="relative size-full flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0.1, 3.3], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={1.9} />
        <directionalLight position={[4, 6, 5]} intensity={1.9} color="#fff8e7" />
        <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#ffd6e0" />
        <RotatingPreview model={model} />
      </Canvas>
    </div>
  );
}
