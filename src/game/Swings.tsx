import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { local, uiStore } from "./store";
import { sendSwingPush, sendSwingState } from "./useMultiplayer";

export type SwingData = {
  id: string;
  x: number;
  z: number;
  rot: number; // facing angle
  sitterId: string | null;
  amplitude: number;
};

// 4 adet salıncak, aralıkları birbirine yaklaştırıldı (Batı sahilinde x = -30, z: 9, 3, -3, -9)
export const SWING_ITEMS: SwingData[] = [
  { id: "swing-1", x: -30, z: 9, rot: 0, sitterId: null, amplitude: 0.08 },
  { id: "swing-2", x: -30, z: 3, rot: 0, sitterId: null, amplitude: 0.08 },
  { id: "swing-3", x: -30, z: -3, rot: 0, sitterId: null, amplitude: 0.08 },
  { id: "swing-4", x: -30, z: -9, rot: 0, sitterId: null, amplitude: 0.08 },
];

export const swingStates = new Map<
  string,
  {
    angle: number;
    amplitude: number;
    phase: number;
    sitterId: string | null;
  }
>();

SWING_ITEMS.forEach((s) => {
  swingStates.set(s.id, { angle: 0, amplitude: 0.06, phase: Math.random() * 5, sitterId: null });
});

export function pushSwing(id: string) {
  const st = swingStates.get(id);
  if (st) {
    st.amplitude = Math.min(0.85, st.amplitude + 0.35);
    sendSwingPush(id, st.amplitude);
  }
}

export function sitOnSwing(id: string) {
  local.actionState = "sitting";
  local.targetId = id;
  const st = swingStates.get(id);
  if (st) {
    st.sitterId = local.id;
    st.amplitude = Math.max(0.28, st.amplitude);
  }
  uiStore.set({ activeAction: "sitting", actionPrompt: null });
  sendSwingState(id, "sit");
}

export function leaveSwing(id: string) {
  local.actionState = "none";
  local.targetId = "";
  const s = SWING_ITEMS.find((item) => item.id === id);
  if (s) {
    local.pos.x = s.x + 1.8;
    local.pos.z = s.z;
    local.pos.y = 0;
  }
  const st = swingStates.get(id);
  if (st) st.sitterId = null;
  uiStore.set({ activeAction: "none", actionPrompt: null });
  sendSwingState(id, "leave");
}

function SingleSwing({ item }: { item: SwingData }) {
  const seatRef = useRef<THREE.Group>(null);
  const st = useMemo(() => swingStates.get(item.id)!, [item.id]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    st.phase += dt * 2.2;
    // Sallanma genliği sönümleme
    const baseAmp = st.sitterId ? 0.25 : 0.05;
    if (st.amplitude > baseAmp) {
      st.amplitude = THREE.MathUtils.lerp(st.amplitude, baseAmp, dt * 0.4);
    } else {
      st.amplitude = baseAmp;
    }
    st.angle = Math.sin(st.phase) * st.amplitude;

    if (seatRef.current) {
      // Z ekseninde rotasyon: seat ileri (+X) ve geri (-X) sallanır
      seatRef.current.rotation.z = st.angle;
    }

    // Oturan karakter adanın merkezine (+X yönüne) bakar, ayakları ileri doğru sallanır
    if (local.actionState === "sitting" && local.targetId === item.id) {
      const ropeL = 2.0;
      const dx = Math.sin(st.angle) * ropeL;
      const dy = 2.7 - Math.cos(st.angle) * ropeL;
      local.pos.x = item.x + dx;
      local.pos.y = dy - 0.35;
      local.pos.z = item.z;
      local.rotY = Math.PI / 2; // +X (merkeze) doğru oturur
    }
  });

  return (
    <group position={[item.x, 0, item.z]}>
      {/* Yan A-şeklinde ahşap ayaklar (Z ekseninde sol ve sağ) */}
      {[-1.2, 1.2].map((offset) => (
        <group key={offset} position={[0, 0, offset]}>
          <mesh position={[-0.45, 1.4, 0]} rotation-z={-0.2}>
            <cylinderGeometry args={[0.08, 0.1, 2.9, 8]} />
            <meshToonMaterial color="#9c6644" />
          </mesh>
          <mesh position={[0.45, 1.4, 0]} rotation-z={0.2}>
            <cylinderGeometry args={[0.08, 0.1, 2.9, 8]} />
            <meshToonMaterial color="#9c6644" />
          </mesh>
        </group>
      ))}

      {/* Üst Taşıyıcı Ahşap Kiriş (Z ekseni boyunca) */}
      <mesh position={[0, 2.7, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 2.8, 8]} />
        <meshToonMaterial color="#7f5539" />
      </mesh>

      {/* Kiriş Üzerinde Sevimli Gündüz Süsleri */}
      {[-0.9, -0.45, 0, 0.45, 0.9].map((z, idx) => (
        <mesh key={idx} position={[0, 2.72, z]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color={idx % 2 === 0 ? "#ffd166" : "#ff70a6"}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* Salıncak Oturak Grubu (Üst kirişten sarkar ve Z ekseninde döner) */}
      <group ref={seatRef} position={[0, 2.7, 0]}>
        {/* Halatlar */}
        {[-0.5, 0.5].map((z) => (
          <mesh key={z} position={[0, -1, z]}>
            <cylinderGeometry args={[0.015, 0.015, 2.0, 6]} />
            <meshStandardMaterial color="#f4ebd0" roughness={0.7} />
          </mesh>
        ))}

        {/* Ahşap Oturak Tahtası (Genişlik X: 0.55m, Derinlik Z: 1.25m) */}
        <mesh position={[0, -2, 0]}>
          <boxGeometry args={[0.55, 0.08, 1.25]} />
          <meshToonMaterial color="#ff70a6" />
        </mesh>
      </group>
    </group>
  );
}

export function Swings() {
  return (
    <group>
      {SWING_ITEMS.map((item) => (
        <SingleSwing key={item.id} item={item} />
      ))}
    </group>
  );
}
