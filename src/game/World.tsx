import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Dünya yarıçapı 30'dan 50'ye büyütüldü (neredeyse 3 kat geniş alan)
export const WORLD_RADIUS = 50;

// Anı albüm panosu doğu sahilinde (x = 32), adanın merkezine dönük
export const ALBUM = { x: 32, z: 0, rot: -Math.PI / 2, scale: 1.6 };

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const TREES: [number, number, number][] = [];

// Çarpışma engelleri: Genişletilmiş dünya, kuzeydeki evler ve batıdaki salıncaklar
export const COLLIDERS: { x: number; z: number; r: number }[] = [
  // Çeşme (Ada Merkezi)
  { x: 0, z: 0, r: 2.3 },
  
  // Ev 1 (Aden) Dış Duvarları (x: -14, z: -30, W: 14.5, D: 10.0)
  // Arka Duvar (-Z: -35.0)
  { x: -19.5, z: -35.0, r: 1.3 },
  { x: -16.0, z: -35.0, r: 1.3 },
  { x: -12.0, z: -35.0, r: 1.3 },
  { x: -8.5, z: -35.0, r: 1.3 },
  // Yan Duvarlar (-X: -21.25 ve +X: -6.75)
  { x: -21.25, z: -33.5, r: 1.3 },
  { x: -21.25, z: -30.0, r: 1.3 },
  { x: -21.25, z: -26.5, r: 1.3 },
  { x: -6.75, z: -33.5, r: 1.3 },
  { x: -6.75, z: -30.0, r: 1.3 },
  { x: -6.75, z: -26.5, r: 1.3 },
  // Ön Duvar Yan Kanatları (Kapı ortada x: -15.4..-12.6 arası açık)
  { x: -19.5, z: -25.0, r: 1.3 },
  { x: -16.8, z: -25.0, r: 1.3 },
  { x: -11.2, z: -25.0, r: 1.3 },
  { x: -8.5, z: -25.0, r: 1.3 },

  // Ev 2 (Never) Dış Duvarları (x: 14, z: -30, W: 14.5, D: 10.0)
  // Arka Duvar (-Z: -35.0)
  { x: 8.5, z: -35.0, r: 1.3 },
  { x: 12.0, z: -35.0, r: 1.3 },
  { x: 16.0, z: -35.0, r: 1.3 },
  { x: 19.5, z: -35.0, r: 1.3 },
  // Yan Duvarlar (-X: 6.75 ve +X: 21.25)
  { x: 6.75, z: -33.5, r: 1.3 },
  { x: 6.75, z: -30.0, r: 1.3 },
  { x: 6.75, z: -26.5, r: 1.3 },
  { x: 21.25, z: -33.5, r: 1.3 },
  { x: 21.25, z: -30.0, r: 1.3 },
  { x: 21.25, z: -26.5, r: 1.3 },
  // Ön Duvar Yan Kanatları (Kapı ortada x: 12.6..15.4 arası açık)
  { x: 8.5, z: -25.0, r: 1.3 },
  { x: 11.2, z: -25.0, r: 1.3 },
  { x: 16.8, z: -25.0, r: 1.3 },
  { x: 19.5, z: -25.0, r: 1.3 },

  // 4 Adet Salıncak Ayakları (Batı Sahili x: -30, z = 9, 3, -3, -9)
  { x: -30, z: 10.2, r: 0.4 },
  { x: -30, z: 7.8, r: 0.4 },
  { x: -30, z: 4.2, r: 0.4 },
  { x: -30, z: 1.8, r: 0.4 },
  { x: -30, z: -1.8, r: 0.4 },
  { x: -30, z: -4.2, r: 0.4 },
  { x: -30, z: -7.8, r: 0.4 },
  { x: -30, z: -10.2, r: 0.4 },

  // Doğu Çayırı Büyük Kamp Ateşi Ocağı (x: 22, z: 14)
  { x: 22, z: 14, r: 1.8 },

  // Açık Hava Sineması Dev Ekranı & Hoparlör Kuleleri (z: 34)
  { x: 0, z: 34.0, r: 2.2 },
  { x: -4.0, z: 34.0, r: 2.0 },
  { x: 4.0, z: 34.0, r: 2.0 },
  { x: -6.8, z: 34.0, r: 1.2 },
  { x: 6.8, z: 34.0, r: 1.2 },
];

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  s.bezierCurveTo(-0.2, -0.6, -1.2, -0.3, -1.2, 0.35);
  s.bezierCurveTo(-1.2, 0.95, -0.5, 1.15, 0, 0.6);
  s.bezierCurveTo(0.5, 1.15, 1.2, 0.95, 1.2, 0.35);
  s.bezierCurveTo(1.2, -0.3, 0.2, -0.6, 0, -1);
  return s;
}

export const heartGeometry = (() => {
  let g: THREE.ExtrudeGeometry | null = null;
  return () => {
    if (!g) {
      g = new THREE.ExtrudeGeometry(heartShape(), {
        depth: 0.5,
        bevelEnabled: true,
        bevelSize: 0.12,
        bevelThickness: 0.12,
        bevelSegments: 2,
        curveSegments: 10,
      });
      g.center();
    }
    return g;
  };
})();

// Canlı ve taptaze yeşil çimen dokusu (Gündüz masal teması)
function grassTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  
  // Canlı yeşil zemin
  g.fillStyle = "#52b788";
  g.fillRect(0, 0, 512, 512);

  const r = rng(777);
  // Çimen ton çeşitliliği
  const shades = ["#5bb974", "#40916c", "#74c69d", "#62c976", "#459a58"];
  for (let i = 0; i < 4000; i++) {
    const s = shades[Math.floor(r() * shades.length)]!;
    g.fillStyle = s;
    const w = 2 + r() * 4;
    const h = 2 + r() * 4;
    g.fillRect(r() * 512, r() * 512, w, h);
  }

  // Sevimli kır çiçekleri ve papatyalar
  const flowers = ["#ffffff", "#ffde59", "#ff9ec6", "#ffd166"];
  for (let i = 0; i < 70; i++) {
    const col = flowers[Math.floor(r() * flowers.length)]!;
    const fx = r() * 512;
    const fy = r() * 512;
    g.fillStyle = col;
    g.beginPath();
    g.arc(fx, fy, 2.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffb703";
    g.beginPath();
    g.arc(fx, fy, 1, 0, Math.PI * 2);
    g.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(18, 18);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function letterTex(ch: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(0,0,0,0)";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#111111"; // Tam siyah renk
  g.font = "900 170px Fredoka, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(ch, 128, 134);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Fountain() {
  const geo = useMemo(() => heartGeometry(), []);
  const heartGroup = useRef<THREE.Group>(null);
  const texA = useMemo(() => (typeof window !== "undefined" ? letterTex("A") : null), []);
  const texN = useMemo(() => (typeof window !== "undefined" ? letterTex("N") : null), []);

  useFrame((s) => {
    if (heartGroup.current) {
      heartGroup.current.rotation.y = s.clock.elapsedTime * 0.6;
      heartGroup.current.position.y = 2.6 + Math.sin(s.clock.elapsedTime * 2) * 0.15;
    }
  });

  return (
    <group>
      {/* Beyaz Mermer Havuz */}
      <mesh position-y={0.3}>
        <cylinderGeometry args={[2.2, 2.4, 0.6, 28]} />
        <meshToonMaterial color="#f0f4f8" />
      </mesh>
      {/* Turkuaz Gündüz Suyu */}
      <mesh position-y={0.55} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.95, 28]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.4} />
      </mesh>
      {/* Orta Mermer Sütun */}
      <mesh position-y={1.2}>
        <cylinderGeometry args={[0.25, 0.4, 1.4, 12]} />
        <meshToonMaterial color="#e2e8f0" />
      </mesh>

      {/* Parlayan Sevgi Kalbi ve İki Tarafındaki Siyah A & N Harfleri */}
      <group ref={heartGroup} scale={0.78}>
        <mesh geometry={geo}>
          <meshStandardMaterial color="#ff2d87" emissive="#ff1a75" emissiveIntensity={0.6} roughness={0.2} />
        </mesh>
        {/* Ön Yüz: Siyah 'A' Harfi (Aden) */}
        {texA && (
          <mesh position={[0, 0.16, 0.28]}>
            <planeGeometry args={[1.0, 1.0]} />
            <meshBasicMaterial map={texA} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        )}
        {/* Arka Yüz: Siyah 'N' Harfi (Never) */}
        {texN && (
          <mesh position={[0, 0.16, -0.28]} rotation-y={Math.PI}>
            <planeGeometry args={[1.0, 1.0]} />
            <meshBasicMaterial map={texN} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        )}
      </group>
      <pointLight position={[0, 2.7, 0]} color="#ff69b4" intensity={2.0} distance={9} />
    </group>
  );
}

export function World() {
  const tex = useMemo(() => grassTexture(), []);
  return (
    <>
      {/* Yüzen Ada Gövdesi (Yarıçap 50m - openEnded: üst kapak kaldırıldı, çimenle çakışma/kararma olmaz) */}
      <mesh position-y={-2.2}>
        <cylinderGeometry args={[WORLD_RADIUS + 0.5, 6, 4.4, 64, 1, true]} />
        <meshToonMaterial color="#5c4033" />
      </mesh>
      {/* Yeşil Çimenli Ada Yüzeyi */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <circleGeometry args={[WORLD_RADIUS + 0.5, 64]} />
        <meshToonMaterial map={tex} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <Fountain />
    </>
  );
}
