import { useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { uiStore } from "./store";

export const SOCCER_FIELD = {
  center: { x: 22, z: 14 },
  length: 22, // from x: 11 to x: 33
  width: 14,  // from z: 7 to z: 21
  goalWidth: 3.6,
  goalHeight: 2.2,
  goalDepth: 1.2,
};

function GoalMesh({ x, z, facing }: { x: number; z: number; facing: "right" | "left" }) {
  const dir = facing === "right" ? 1 : -1;
  const postColor = "#ffffff";
  const netColor = facing === "right" ? "#f472b6" : "#a855f7";

  return (
    <group position={[x, 0, z]}>
      {/* Sol Direk */}
      <mesh position={[0, 1.1, -1.8]}>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 12]} />
        <meshToonMaterial color={postColor} />
      </mesh>
      {/* Sağ Direk */}
      <mesh position={[0, 1.1, 1.8]}>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 12]} />
        <meshToonMaterial color={postColor} />
      </mesh>
      {/* Üst Direk (Crossbar) */}
      <mesh position={[0, 2.2, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.08, 0.08, 3.6, 12]} />
        <meshToonMaterial color={postColor} />
      </mesh>

      {/* Arka File Destek Direkleri */}
      <mesh position={[-dir * 1.1, 0.55, -1.8]} rotation-z={dir * 0.45}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshToonMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[-dir * 1.1, 0.55, 1.8]} rotation-z={dir * 0.45}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshToonMaterial color="#cbd5e1" />
      </mesh>

      {/* Kale Filesi (Yarı saydam petek dokusu) */}
      <mesh position={[-dir * 0.6, 1.1, 0]}>
        <boxGeometry args={[1.2, 2.18, 3.55]} />
        <meshBasicMaterial
          color={netColor}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Takım Bayrağı */}
      <group position={[0, 2.6, 1.8]}>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
          <meshToonMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[dir * 0.2, 0.65, 0]}>
          <planeGeometry args={[0.4, 0.28]} />
          <meshToonMaterial color={netColor} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function ScoreboardCanvas() {
  const score = useSyncExternalStore(
    uiStore.subscribe,
    () => uiStore.get().soccerScore,
    () => ({ pink: 0, purple: 0 })
  );

  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    return new THREE.CanvasTexture(c);
  }, []);

  useMemo(() => {
    const canvas = texture.image as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    // Gradyan Arka Plan
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(1, "#311042");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Rose gold çerçeve
    ctx.strokeStyle = "#ff70a6";
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, 500, 244);

    // Başlık
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#fbcfe8";
    ctx.textAlign = "center";
    ctx.fillText("⚽ MASAL STADYUMU 🏆", 256, 48);

    // Takım İsimleri
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#ff6b9d";
    ctx.fillText("🌸 Pembe Takım", 130, 96);

    ctx.fillStyle = "#c084fc";
    ctx.fillText("Mor Takım 💜", 382, 96);

    // Skorlar
    ctx.font = "bold 76px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${score.pink}`, 130, 185);
    ctx.fillText("-", 256, 180);
    ctx.fillText(`${score.purple}`, 382, 185);

    // Alt bilgilendirme
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Topa yaklaş ve şut çek!", 256, 230);

    texture.needsUpdate = true;
  }, [score, texture]);

  return texture;
}

export function SoccerField() {
  const scoreTex = ScoreboardCanvas();
  const c = SOCCER_FIELD.center;

  return (
    <group position={[c.x, 0, c.z]}>
      {/* 1. Canlı Çim Saha Zemin Deseni (Hafif çizgili futbol çimi) */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.008}>
        <planeGeometry args={[22.4, 14.4]} />
        <meshToonMaterial
          color="#38a169"
          polygonOffset
          polygonOffsetFactor={-0.5}
          polygonOffsetUnits={-0.5}
        />
      </mesh>

      {/* 2. Beyaz Saha Çizgileri */}
      {/* Dış Çerçeve */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
        <planeGeometry args={[22, 14]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Orta Çizgi */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.013, 0]}>
        <planeGeometry args={[0.1, 14]} />
        <meshBasicMaterial color="#ffffff" polygonOffset polygonOffsetFactor={-1.5} />
      </mesh>

      {/* Orta Yuvarlak */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.014, 0]}>
        <ringGeometry args={[2.3, 2.42, 32]} />
        <meshBasicMaterial color="#ffffff" polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* Orta Başlama Noktası */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshBasicMaterial color="#ffffff" polygonOffset polygonOffsetFactor={-2.2} />
      </mesh>

      {/* Sol Ceza Sahası */}
      <mesh rotation-x={-Math.PI / 2} position={[-8.8, 0.013, 0]}>
        <planeGeometry args={[4.4, 6.8]} />
        <meshBasicMaterial color="#ffffff" wireframe polygonOffset polygonOffsetFactor={-1.5} />
      </mesh>

      {/* Sağ Ceza Sahası */}
      <mesh rotation-x={-Math.PI / 2} position={[8.8, 0.013, 0]}>
        <planeGeometry args={[4.4, 6.8]} />
        <meshBasicMaterial color="#ffffff" wireframe polygonOffset polygonOffsetFactor={-1.5} />
      </mesh>

      {/* 3. İki Uçtaki Kaleler */}
      {/* Sol Kale (Pembe Takım Kalesi) */}
      <GoalMesh x={-11} z={0} facing="right" />
      {/* Sağ Kale (Mor Takım Kalesi) */}
      <GoalMesh x={11} z={0} facing="left" />

      {/* 4. Saha Kenarı 4 Köşe Bayrağı */}
      {([
        [-11, -7],
        [-11, 7],
        [11, -7],
        [11, 7],
      ] as const).map(([fx, fz], idx) => (
        <group key={idx} position={[fx, 0, fz]}>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.3, 8]} />
            <meshToonMaterial color="#f1f5f9" />
          </mesh>
          <mesh position={[0.16, 1.15, 0]}>
            <planeGeometry args={[0.32, 0.2]} />
            <meshToonMaterial color="#ef4444" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* 5. Saha Kenarında Havada Duran Dev 3D Skor Panosu */}
      <group position={[0, 4.8, -8.2]}>
        {/* Tabela Direkleri */}
        <mesh position={[-2.2, -2.4, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 4.8, 12]} />
          <meshToonMaterial color="#475569" />
        </mesh>
        <mesh position={[2.2, -2.4, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 4.8, 12]} />
          <meshToonMaterial color="#475569" />
        </mesh>
        {/* Skor Ekranı */}
        <mesh>
          <planeGeometry args={[5.2, 2.6]} />
          <meshBasicMaterial map={scoreTex} side={THREE.DoubleSide} />
        </mesh>
        {/* Arka Kapak */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[5.3, 2.7, 0.1]} />
          <meshToonMaterial color="#1e1b4b" />
        </mesh>
      </group>
    </group>
  );
}
