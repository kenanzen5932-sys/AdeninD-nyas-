import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { local, pushFx, showParkourNotice } from "./store";

export type MushroomPad = {
  id: string;
  x: number;
  y: number; // cap height
  z: number;
  radius: number;
  bounceForce: number;
  capColor: string;
  dotColor: string;
};

// Eski oturma alanının olduğu güneybatı çayırına taşındı (x: -20, z: 22 civarı)
export const MUSHROOMS: MushroomPad[] = [
  { id: "mush-1", x: -16.5, y: 0.9, z: 19, radius: 1.25, bounceForce: 14.0, capColor: "#ff4d8d", dotColor: "#ffffff" },
  { id: "mush-2", x: -20.2, y: 1.6, z: 21.5, radius: 1.3, bounceForce: 15.0, capColor: "#a855f7", dotColor: "#38bdf8" },
  { id: "mush-3", x: -24.0, y: 2.3, z: 25.0, radius: 1.35, bounceForce: 15.5, capColor: "#f59e0b", dotColor: "#ffffff" },
  { id: "mush-4", x: -20.5, y: 2.9, z: 28.5, radius: 1.3, bounceForce: 16.0, capColor: "#10b981", dotColor: "#fef08a" },
  { id: "mush-5", x: -15.8, y: 2.0, z: 26.5, radius: 1.25, bounceForce: 14.5, capColor: "#ec4899", dotColor: "#ffffff" },
];

export const PARKOUR_START = { x: -14, z: 16 };
export const PARKOUR_FINISH = { x: -12.5, z: 23 };

let finishCooldown = 0;

export function checkParkourCollisions(
  p: { x: number; y: number; z: number },
  vyRef: { current: number }
) {
  // 1. Mantar Üstüne Basma ve Zıplama Kontrolü
  for (const m of MUSHROOMS) {
    const dist2D = Math.hypot(p.x - m.x, p.z - m.z);
    if (dist2D < m.radius && Math.abs(p.y - m.y) < 0.75 && vyRef.current <= 1.0) {
      vyRef.current = m.bounceForce;
      p.y = m.y + 0.1;
      break;
    }
  }

  // 2. Bitiş Çizgisi Kontrolü (etiket kaldırıldı)
  const distFinish = Math.hypot(p.x - PARKOUR_FINISH.x, p.z - PARKOUR_FINISH.z);
  if (distFinish < 2.0 && finishCooldown <= 0) {
    finishCooldown = 8.0;
  }
}

function MushroomMesh({ m }: { m: MushroomPad }) {
  const capRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (capRef.current) {
      const t = state.clock.elapsedTime + m.x;
      capRef.current.scale.y = 1 + Math.sin(t * 3.5) * 0.04;
      capRef.current.scale.x = 1 - Math.sin(t * 3.5) * 0.02;
      capRef.current.scale.z = 1 - Math.sin(t * 3.5) * 0.02;
    }
  });

  return (
    <group position={[m.x, 0, m.z]}>
      {/* Beyaz Gövde / Sap */}
      <mesh position={[0, m.y / 2, 0]}>
        <cylinderGeometry args={[m.radius * 0.35, m.radius * 0.48, m.y, 14]} />
        <meshToonMaterial color="#f8fafc" />
      </mesh>

      {/* Zıplatan Mantar Şapkası */}
      <group ref={capRef} position={[0, m.y, 0]}>
        <mesh>
          <sphereGeometry args={[m.radius, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshToonMaterial color={m.capColor} />
        </mesh>
        {/* Şapka Altı Yumuşak Kenar */}
        <mesh rotation-x={Math.PI / 2} position-y={0.02}>
          <circleGeometry args={[m.radius * 0.96, 16]} />
          <meshToonMaterial color="#fdf2f8" />
        </mesh>
        {/* Sevimli Papatya / Benek Noktaları */}
        {([
          [0, m.radius * 0.92, 0],
          [m.radius * 0.55, m.radius * 0.65, 0],
          [-m.radius * 0.55, m.radius * 0.65, 0],
          [0, m.radius * 0.65, m.radius * 0.55],
          [0, m.radius * 0.65, -m.radius * 0.55],
        ] as const).map(([dx, dy, dz], idx) => (
          <mesh key={idx} position={[dx, dy, dz]}>
            <circleGeometry args={[0.22, 12]} />
            <meshBasicMaterial color={m.dotColor} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Parkour() {
  return (
    <group>
      {/* Zıp-Zıp Masal Mantar Trambolinleri */}
      {MUSHROOMS.map((m) => (
        <MushroomMesh key={m.id} m={m} />
      ))}
    </group>
  );
}
