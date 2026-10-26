import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { local, uiStore } from "./store";

export type CampfireLog = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  facingAngle: number;
};

// Sahanın olduğu geniş doğu çayırına taşındı (x: 22, z: 14) ve çok daha büyük yapıldı
export const CAMPFIRE_CENTER = { x: 22, z: 14 };

const LOG_RADIUS = 3.0; // Ateş ocağı etrafında 3.0m geniş oturma çemberi
const LOG_COUNT = 8;    // 8 kişilik dev sohbet çemberi

export const CAMPFIRE_LOGS: CampfireLog[] = Array.from({ length: LOG_COUNT }).map((_, i) => {
  const angle = (i * Math.PI * 2) / LOG_COUNT;
  const x = +(CAMPFIRE_CENTER.x + Math.sin(angle) * LOG_RADIUS).toFixed(2);
  const z = +(CAMPFIRE_CENTER.z + Math.cos(angle) * LOG_RADIUS).toFixed(2);
  // Merkeze doğru bakar
  const facingAngle = angle + Math.PI;
  return {
    id: `campfire-log-${i + 1}`,
    name: `Kütük ${i + 1}`,
    x,
    y: 0.48,
    z,
    facingAngle,
  };
});

export function sitOnCampfire(logId: string) {
  const log = CAMPFIRE_LOGS.find((l) => l.id === logId);
  if (!log) return;
  local.actionState = "sitting";
  local.targetId = logId;
  local.pos.x = log.x;
  local.pos.y = log.y;
  local.pos.z = log.z;
  local.rotY = log.facingAngle;
  uiStore.set({ activeAction: "sitting", actionPrompt: null });
}

export function leaveCampfire(logId: string) {
  const log = CAMPFIRE_LOGS.find((l) => l.id === logId);
  local.actionState = "none";
  local.targetId = "";
  if (log) {
    const dirX = Math.sin(log.facingAngle + Math.PI);
    const dirZ = Math.cos(log.facingAngle + Math.PI);
    local.pos.x = log.x + dirX * 1.1;
    local.pos.y = 0;
    local.pos.z = log.z + dirZ * 1.1;
  }
  uiStore.set({ activeAction: "none", actionPrompt: null });
}

export function Campfire() {
  const fireRef1 = useRef<THREE.Mesh>(null);
  const fireRef2 = useRef<THREE.Mesh>(null);
  const fireRef3 = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Büyük alev titreşimi
    if (fireRef1.current) {
      fireRef1.current.scale.y = 1 + Math.sin(t * 11) * 0.16;
      fireRef1.current.scale.x = 1 + Math.cos(t * 9) * 0.12;
      fireRef1.current.scale.z = 1 + Math.sin(t * 13) * 0.12;
    }
    if (fireRef2.current) {
      fireRef2.current.scale.y = 1 + Math.cos(t * 14) * 0.22;
      fireRef2.current.scale.x = 1 + Math.sin(t * 12) * 0.14;
      fireRef2.current.scale.z = 1 + Math.cos(t * 10) * 0.14;
    }
    if (fireRef3.current) {
      fireRef3.current.scale.y = 1 + Math.sin(t * 16) * 0.18;
      fireRef3.current.rotation.y = t * 1.2;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 3.2 + Math.sin(t * 15) * 0.5 + Math.cos(t * 20) * 0.4;
    }
  });

  const c = CAMPFIRE_CENTER;

  return (
    <group position={[c.x, 0, c.z]}>
      {/* 1. Geniş Taş Döşeme Zemin Halkası (Plaza) */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.008}>
        <circleGeometry args={[4.4, 32]} />
        <meshToonMaterial
          color="#a8a29e"
          polygonOffset
          polygonOffsetFactor={-0.5}
          polygonOffsetUnits={-0.5}
        />
      </mesh>

      {/* 2. Dev Yuvarlak Taş Ocak Çemberi */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.5, 1.8, 0.4, 20]} />
        <meshToonMaterial color="#64748b" />
      </mesh>

      {/* Ocak İçi Kömür / Kor Zemini */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.25}>
        <circleGeometry args={[1.4, 20]} />
        <meshToonMaterial color="#0f172a" />
      </mesh>

      {/* 3. Büyük Çapraz Odun Kütükleri */}
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((rot, idx) => (
        <mesh key={idx} position={[0, 0.35, 0]} rotation-y={rot} rotation-x={0.14}>
          <cylinderGeometry args={[0.13, 0.15, 2.2, 8]} />
          <meshToonMaterial color="#78350f" />
        </mesh>
      ))}

      {/* 4. Büyük Çıtırdayan Alev Modelleri */}
      {/* Dış Turuncu Alev */}
      <mesh ref={fireRef1} position={[0, 0.95, 0]}>
        <coneGeometry args={[0.65, 1.4, 8]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.88} />
      </mesh>
      {/* İç Parlak Sarı Kor Alev */}
      <mesh ref={fireRef2} position={[0, 0.85, 0]}>
        <coneGeometry args={[0.42, 1.1, 8]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.95} />
      </mesh>
      {/* Kor Kıvılcım Çekirdeği */}
      <mesh ref={fireRef3} position={[0, 0.65, 0]}>
        <coneGeometry args={[0.26, 0.75, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      {/* Güçlü Sıcak Gece Işığı */}
      <pointLight ref={lightRef} position={[0, 1.2, 0]} color="#ff7a00" intensity={3.5} distance={15} />

      {/* 5. Etrafındaki 8 Adet Büyük Oturma Kütüğü */}
      {CAMPFIRE_LOGS.map((log) => {
        const lx = log.x - c.x;
        const lz = log.z - c.z;
        return (
          <group key={log.id} position={[lx, 0, lz]}>
            {/* Ahşap Kütük Gövdesi */}
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.46, 0.5, 0.5, 16]} />
              <meshToonMaterial color="#854d0e" />
            </mesh>
            {/* Kütük Üstü Kesik Yaş Halkaları */}
            <mesh rotation-x={-Math.PI / 2} position-y={0.502}>
              <circleGeometry args={[0.44, 16]} />
              <meshToonMaterial color="#ca8a04" />
            </mesh>
            {/* Geniş ve Rahat Pembe Minder */}
            <mesh rotation-x={-Math.PI / 2} position-y={0.506}>
              <circleGeometry args={[0.36, 16]} />
              <meshToonMaterial color="#fbcfe8" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
