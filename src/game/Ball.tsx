import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { local, pushFx } from "./store";
import { sendBallKick } from "./useMultiplayer";

export const BALL_RADIUS = 0.45;

export const ballState = {
  pos: { x: 7.5, y: BALL_RADIUS, z: 7.5 },
  vel: { x: 0, y: 0, z: 0 },
};

// Top dokusu: Sevimli masalsı pembe, mor ve beyaz dilimli futbol topu
function ballTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;

  // 6 renkli dikey dilim
  const colors = ["#ff5d8f", "#ffffff", "#b388ff", "#ffffff", "#ff85a2", "#38bdf8"];
  const sliceW = 512 / colors.length;
  colors.forEach((col, idx) => {
    g.fillStyle = col;
    g.fillRect(idx * sliceW, 0, sliceW, 256);
  });

  // Üstüne sevimli yıldız ve kalp desenleri
  g.fillStyle = "#ff2d87";
  g.beginPath();
  g.arc(128, 128, 32, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = "#7c4dff";
  g.beginPath();
  g.arc(384, 128, 32, 0, Math.PI * 2);
  g.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function resetBall() {
  ballState.pos.x = 7.5;
  ballState.pos.y = BALL_RADIUS;
  ballState.pos.z = 7.5;
  ballState.vel.x = 0;
  ballState.vel.y = 0;
  ballState.vel.z = 0;
}

export function kickBall() {
  // Karakterin baktığı yöne veya oyuncudan topa doğru güçlü şut
  const dx = ballState.pos.x - local.pos.x;
  const dz = ballState.pos.z - local.pos.z;
  const len = Math.hypot(dx, dz) || 1;

  let dirX = dx / len;
  let dirZ = dz / len;

  // Eğer çok üstündeyse oyuncunun baktığı açıyı kullan
  if (len < 0.1) {
    dirX = Math.sin(local.rotY);
    dirZ = Math.cos(local.rotY);
  }

  // Güçlü kavisli havadan şut!
  const power = 19;
  ballState.vel.x = dirX * power + (Math.random() - 0.5) * 2;
  ballState.vel.y = 9.2; // Yüksek kavis
  ballState.vel.z = dirZ * power + (Math.random() - 0.5) * 2;

  sendBallKick({
    x: ballState.pos.x,
    y: ballState.pos.y,
    z: ballState.pos.z,
    vx: ballState.vel.x,
    vy: ballState.vel.y,
    vz: ballState.vel.z,
  });
}

export function onRemoteBallKick(payload: { x: number; y: number; z: number; vx: number; vy: number; vz: number }) {
  ballState.pos.x = payload.x;
  ballState.pos.y = payload.y;
  ballState.pos.z = payload.z;
  ballState.vel.x = payload.vx;
  ballState.vel.y = payload.vy;
  ballState.vel.z = payload.vz;
}

export function Ball() {
  const meshRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => (typeof window !== "undefined" ? ballTexture() : null), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // 1. Yerçekimi ve Fizik
    ballState.vel.y -= 22 * dt;
    ballState.pos.x += ballState.vel.x * dt;
    ballState.pos.y += ballState.vel.y * dt;
    ballState.pos.z += ballState.vel.z * dt;

    // Zemin Çarpışması ve Zıplama
    if (ballState.pos.y <= BALL_RADIUS) {
      ballState.pos.y = BALL_RADIUS;
      if (Math.abs(ballState.vel.y) > 0.8) {
        ballState.vel.y = -ballState.vel.y * 0.68; // Zıplama sönümü
      } else {
        ballState.vel.y = 0;
      }
      // Zemin sürtünmesi
      ballState.vel.x *= Math.max(0, 1 - 3.2 * dt);
      ballState.vel.z *= Math.max(0, 1 - 3.2 * dt);
    } else {
      // Hava sürtünmesi
      ballState.vel.x *= Math.max(0, 1 - 0.4 * dt);
      ballState.vel.z *= Math.max(0, 1 - 0.4 * dt);
    }

    // Ada Kenarından Geri Sekme (Yarıçap 48 metre)
    const distFromCenter = Math.hypot(ballState.pos.x, ballState.pos.z);
    if (distFromCenter > 47) {
      const normalX = ballState.pos.x / distFromCenter;
      const normalZ = ballState.pos.z / distFromCenter;
      ballState.pos.x = normalX * 47;
      ballState.pos.z = normalZ * 47;
      ballState.vel.x = -ballState.vel.x * 0.75;
      ballState.vel.z = -ballState.vel.z * 0.75;
    }

    // 2. Oyuncu İle Çarpışma (Üstüne yürüyünce itme / sürme)
    const px = local.pos.x;
    const pz = local.pos.z;
    const dx = ballState.pos.x - px;
    const dz = ballState.pos.z - pz;
    const distToPlayer = Math.hypot(dx, dz);
    const minDist = 0.42 + BALL_RADIUS; // Oyuncu gövdesi + top

    if (distToPlayer < minDist && distToPlayer > 0.001) {
      const pushFactor = (minDist - distToPlayer);
      const nx = dx / distToPlayer;
      const nz = dz / distToPlayer;
      ballState.pos.x += nx * pushFactor;
      ballState.pos.z += nz * pushFactor;
      // İtme hızı aktarımı
      ballState.vel.x += nx * 6.5;
      ballState.vel.z += nz * 6.5;
      if (ballState.pos.y <= BALL_RADIUS + 0.05) {
        ballState.vel.y = 2.2; // Hafif sekiş
      }
    }

    // 4. Görsel Pozisyon ve Yuvarlanma Rotasyonu
    if (meshRef.current) {
      meshRef.current.position.set(ballState.pos.x, ballState.pos.y, ballState.pos.z);
      meshRef.current.rotation.x += ballState.vel.z * dt * 2.4;
      meshRef.current.rotation.z -= ballState.vel.x * dt * 2.4;
    }

    // 5. Dinamik Zemin Gölgesi
    if (shadowRef.current) {
      shadowRef.current.position.set(ballState.pos.x, 0.02, ballState.pos.z);
      const height = Math.max(0, ballState.pos.y - BALL_RADIUS);
      const shadowScale = Math.max(0.2, 1 - height * 0.14);
      shadowRef.current.scale.set(shadowScale, shadowScale, shadowScale);
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.5 - height * 0.08);
    }
  });

  return (
    <group>
      {/* 3D Futbol Topu */}
      <mesh ref={meshRef} position={[ballState.pos.x, ballState.pos.y, ballState.pos.z]}>
        <sphereGeometry args={[BALL_RADIUS, 24, 24]} />
        <meshStandardMaterial map={tex} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Top Zemin Gölgesi */}
      <mesh ref={shadowRef} rotation-x={-Math.PI / 2} position={[ballState.pos.x, 0.02, ballState.pos.z]}>
        <circleGeometry args={[BALL_RADIUS * 1.15, 16]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}
