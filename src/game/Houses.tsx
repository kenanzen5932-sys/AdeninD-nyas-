import { useMemo } from "react";
import * as THREE from "three";
import { local, uiStore, pushFx } from "./store";
import { sendBedState } from "./useMultiplayer";

export type BedInfo = {
  id: string; // e.g. "house-1-bed-1"
  name: string;
  x: number;
  y: number;
  z: number;
  blanketColor: string;
};

export type HouseData = {
  id: string;
  name: string;
  x: number;
  z: number;
  roofColor: string;
  wallColor: string;
  woodColor: string;
  beds: BedInfo[];
};

// Evler kuzey çayırında (z = -30), salıncaklardan ve merkezden tamamen ferah mesafede
// Dış cepheler kullanıcının isteğiyle tamamen tatlı pastel pembe tonlarına boyandı
export const HOUSES: HouseData[] = [
  {
    id: "house-1",
    name: "Aden'in Masal Köşkü 🌸",
    x: -14,
    z: -30,
    roofColor: "#ff4d8d", // Canlı tatlı pembe kiremit
    wallColor: "#ffaec9", // Dış cephe şeker pembe
    woodColor: "#7d3c53", // Bordo ahşap karkas
    beds: [
      {
        id: "house-1-bed-1",
        name: "Aden'in Yatağı 🌸",
        x: -14 - 4.2,
        y: 0.35,
        z: -30 - 2.8,
        blanketColor: "#ff4081",
      },
      {
        id: "house-1-bed-2",
        name: "Misafir Yatağı ✨",
        x: -14 + 4.2,
        y: 0.35,
        z: -30 - 2.8,
        blanketColor: "#ff80ab",
      },
    ],
  },
  {
    id: "house-2",
    name: "Never'ın Sevgi Köşkü 💜",
    x: 14,
    z: -30,
    roofColor: "#7e57c2", // Masalsı mor kiremit
    wallColor: "#f7bfd8", // Dış cephe pembe-leylak
    woodColor: "#5c3355", // Mor-kahve ahşap karkas
    beds: [
      {
        id: "house-2-bed-1",
        name: "Never'ın Yatağı 💜",
        x: 14 - 4.2,
        y: 0.35,
        z: -30 - 2.8,
        blanketColor: "#9575cd",
      },
      {
        id: "house-2-bed-2",
        name: "Misafir Yatağı 🌟",
        x: 14 + 4.2,
        y: 0.35,
        z: -30 - 2.8,
        blanketColor: "#b39ddb",
      },
    ],
  },
];

// Tüm yatakların düz listesi
export const ALL_BEDS: (BedInfo & { houseId: string })[] = HOUSES.flatMap((h) =>
  h.beds.map((b) => ({ ...b, houseId: h.id }))
);

export function lieOnBed(bedId: string) {
  const bed = ALL_BEDS.find((b) => b.id === bedId);
  if (!bed) return;
  local.actionState = "sleeping";
  local.targetId = bedId;
  local.pos.x = bed.x;
  local.pos.y = bed.y + 0.16; // Şiltenin üstüne tam oturur
  local.pos.z = bed.z;
  // rotY = 0: Baş -Z (yastıklar ve başucu), ayaklar +Z, yüz tavana bakar
  local.rotY = 0;

  pushFx(local.id, "💤");
  uiStore.set({
    activeAction: "sleeping",
    actionPrompt: null, // Yataktan Kalk butonu kaldırıldı, yürüyünce otomatik kalkar
  });
  sendBedState(bedId, "sleep");
}

export function leaveBed(bedId: string) {
  local.actionState = "none";
  local.targetId = "";
  const bed = ALL_BEDS.find((b) => b.id === bedId);
  if (bed) {
    // Yatağın önüne güvenli iniş
    local.pos.x = bed.x;
    local.pos.y = 0;
    local.pos.z = bed.z + 1.8;
  }
  uiStore.set({ activeAction: "none", actionPrompt: null });
  sendBedState(bedId, "leave");
}

// Çatının üstünde yürüme ve iniş hesaplaması (Beşik çatı eğim matematiği)
export function getRoofHeight(x: number, z: number, currentY: number): number | null {
  for (const h of HOUSES) {
    const dx = Math.abs(x - h.x);
    const dz = Math.abs(z - h.z);
    // Çatı sınırları (saçak payıyla birlikte: Genişlik 14.5m -> dx <= 7.6m, Derinlik 10.0m -> dz <= 5.6m)
    if (dx <= 7.6 && dz <= 5.6) {
      // Eğimli kiremit çatı: Merkez mahyada 7.1m, yan saçaklarda 4.3m
      const slope = Math.max(0, 1 - dx / 7.25);
      const roofY = 4.2 + slope * 2.8 + 0.12;
      // Karakter çatı hizasında veya yukarısındaysa çatı zemini olarak kabul et
      if (currentY >= 3.8 || currentY >= roofY - 0.5) {
        return roofY;
      }
    }
  }
  return null;
}

function SingleHouse({ house }: { house: HouseData }) {
  // Ev boyutları: Genişlik 14.5m, Derinlik 10.0m, Duvar Yüksekliği 4.2m (Geniş master suite)
  const W = 14.5;
  const D = 10.0;
  const H = 4.2;
  const halfW = W / 2; // 7.25
  const halfD = D / 2; // 5.0
  const doorW = 2.8; // Geniş ve ferah kapı girişi
  const frontWallSegW = (W - doorW) / 2; // 5.85
  const roofH = 2.8; // Çatı yüksekliği

  // Çatı geometrisi: Kusursuz üçgen alınlık duvarları (köşeleri asla dışarı taşmaz)
  const gableGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-halfW, 0);
    s.lineTo(0, roofH);
    s.lineTo(halfW, 0);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: false });
  }, [halfW, roofH]);

  const pitchAngle = Math.atan2(roofH, halfW); // ~0.44 rad
  const slopeLen = Math.hypot(halfW, roofH) + 0.65; // ~6.7m saçaklı kanat uzunluğu

  return (
    <group position={[house.x, 0, house.z]}>
      {/* 1. Taş Temel / Kaide (Hafifçe toprağa gömülü) */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[W + 0.6, 0.12, D + 0.6]} />
        <meshToonMaterial color="#78716c" />
      </mesh>

      {/* 2. Ahşap Zemin / Parke - Çimle sıfıra yakın (y=0.015), ayaklar içine gömülmez */}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[W + 0.2, 0.03, D + 0.2]} />
        <meshToonMaterial color="#c68b59" />
      </mesh>

      {/* 3. Giriş Taş Verandası (Engelsiz düz zemin) */}
      <mesh position={[0, 0.01, halfD + 1.0]}>
        <boxGeometry args={[doorW + 1.4, 0.02, 1.8]} />
        <meshToonMaterial color="#a8a29e" />
      </mesh>

      {/* 4. Arka Duvar (-Z) - Pembe Dış Cephe */}
      <mesh position={[0, H / 2, -halfD]}>
        <boxGeometry args={[W, H, 0.28]} />
        <meshToonMaterial color={house.wallColor} />
      </mesh>

      {/* 5. Sol Duvar (-X) - Pembe Dış Cephe */}
      <mesh position={[-halfW, H / 2, 0]}>
        <boxGeometry args={[0.28, H, D]} />
        <meshToonMaterial color={house.wallColor} />
      </mesh>

      {/* 6. Sağ Duvar (+X) - Pembe Dış Cephe */}
      <mesh position={[halfW, H / 2, 0]}>
        <boxGeometry args={[0.28, H, D]} />
        <meshToonMaterial color={house.wallColor} />
      </mesh>

      {/* 7. Ön Duvar (Sol ve Sağ kanatlar) - Pembe Dış Cephe */}
      <mesh position={[-halfW + frontWallSegW / 2, H / 2, halfD]}>
        <boxGeometry args={[frontWallSegW, H, 0.28]} />
        <meshToonMaterial color={house.wallColor} />
      </mesh>
      <mesh position={[halfW - frontWallSegW / 2, H / 2, halfD]}>
        <boxGeometry args={[frontWallSegW, H, 0.28]} />
        <meshToonMaterial color={house.wallColor} />
      </mesh>
      {/* Kapı Üstü Lento Duvarı (Giriş tamamen engelsiz ve açık) */}
      <mesh position={[0, H - 0.45, halfD]}>
        <boxGeometry args={[doorW + 0.05, 0.9, 0.3]} />
        <meshToonMaterial color={house.wallColor} />
      </mesh>

      {/* 8. Ahşap Köşe Dikmeleri ve Kapı Çerçevesi */}
      {([
        [-halfW, -halfD],
        [halfW, -halfD],
        [-halfW, halfD],
        [halfW, halfD],
        [-doorW / 2, halfD],
        [doorW / 2, halfD],
      ] as const).map(([px, pz], idx) => (
        <mesh key={idx} position={[px, H / 2, pz]}>
          <boxGeometry args={[0.34, H + 0.05, 0.34]} />
          <meshToonMaterial color={house.woodColor} />
        </mesh>
      ))}

      {/* 9. KAPALI İÇ TAVAN (İçerideyken dışarının ve göğün görünmesini tamamen engeller) */}
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[W + 0.2, 0.2, D + 0.2]} />
        <meshToonMaterial color="#fff4eb" />
      </mesh>
      {/* Tavan Ahşap Kirişleri */}
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, H - 0.09, 0]}>
          <boxGeometry args={[0.25, 0.2, D]} />
          <meshToonMaterial color={house.woodColor} />
        </mesh>
      ))}

      {/* 10. DÜZELTİLMİŞ KUSURSUZ BEŞİK ÇATI VE GERÇEK ÜÇGEN ALINLIKLAR */}
      {/* Ön Üçgen Alınlık Duvarı (Tam üçgen, taşma/köşe fırlaması yok) */}
      <mesh geometry={gableGeo} position={[0, H, halfD - 0.28]}>
        <meshToonMaterial color={house.wallColor} />
      </mesh>
      {/* Arka Üçgen Alınlık Duvarı */}
      <mesh geometry={gableGeo} position={[0, H, -halfD]}>
        <meshToonMaterial color={house.wallColor} />
      </mesh>

      {/* Sol Çatı Kanadı (Tam açılı kiremit çatı) */}
      <mesh
        position={[-halfW / 2 - 0.12, H + roofH / 2 + 0.08, 0]}
        rotation-z={pitchAngle}
      >
        <boxGeometry args={[slopeLen, 0.22, D + 1.2]} />
        <meshToonMaterial color={house.roofColor} />
      </mesh>
      {/* Sağ Çatı Kanadı (Tam açılı kiremit çatı) */}
      <mesh
        position={[halfW / 2 + 0.12, H + roofH / 2 + 0.08, 0]}
        rotation-z={-pitchAngle}
      >
        <boxGeometry args={[slopeLen, 0.22, D + 1.2]} />
        <meshToonMaterial color={house.roofColor} />
      </mesh>

      {/* Mahya Kirişi (Çatının tepe çizgisi) */}
      <mesh position={[0, H + roofH + 0.08, 0]}>
        <boxGeometry args={[0.42, 0.32, D + 1.3]} />
        <meshToonMaterial color={house.woodColor} />
      </mesh>

      {/* 11. Sevimli Taş Çatı Bacası ve Masalsı Duman */}
      <mesh position={[halfW - 2.0, H + roofH * 0.45, -1.2]}>
        <boxGeometry args={[0.75, 1.5, 0.75]} />
        <meshToonMaterial color="#78716c" />
      </mesh>
      <mesh position={[halfW - 2.0, H + roofH * 0.45 + 1.0, -1.2]}>
        <sphereGeometry args={[0.32, 10, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
      </mesh>

      {/* --- İÇ MEKAN: 2 AYRI YATAK VE GENİŞ SUİTE MOBİLYALARI --- */}

      {/* BÜYÜK YUVARLAK ORTA HALI */}
      <mesh position={[0, 0.025, 0.6]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[2.7, 32]} />
        <meshToonMaterial color="#ffd6e0" />
      </mesh>

      {/* YATAK 1: SOL YATAK (Aden'in Pembe Yatağı) */}
      <group position={[-4.2, 0.015, -2.8]}>
        {/* Karyola Ahşabı */}
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[2.3, 0.44, 3.2]} />
          <meshToonMaterial color={house.woodColor} />
        </mesh>
        {/* Yatak Başı (Arka duvara yaslı, -Z tarafı) */}
        <mesh position={[0, 0.95, -1.55]}>
          <boxGeometry args={[2.4, 1.3, 0.18]} />
          <meshToonMaterial color={house.woodColor} />
        </mesh>
        {/* Beyaz Şilte */}
        <mesh position={[0, 0.48, 0.05]}>
          <boxGeometry args={[2.1, 0.28, 2.9]} />
          <meshToonMaterial color="#ffffff" />
        </mesh>
        {/* Renkli Yorgan */}
        <mesh position={[0, 0.58, 0.4]}>
          <boxGeometry args={[2.12, 0.14, 2.1]} />
          <meshToonMaterial color={house.beds[0]?.blanketColor ?? "#ff4081"} />
        </mesh>
        {/* Yastık (Başucu -Z tarafında) */}
        <mesh position={[0, 0.66, -1.05]} rotation-x={0.15}>
          <boxGeometry args={[1.3, 0.18, 0.6]} />
          <meshToonMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* YATAK 2: SAĞ YATAK (Misafir / Never Yatağı) */}
      <group position={[4.2, 0.015, -2.8]}>
        {/* Karyola Ahşabı */}
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[2.3, 0.44, 3.2]} />
          <meshToonMaterial color={house.woodColor} />
        </mesh>
        {/* Yatak Başı */}
        <mesh position={[0, 0.95, -1.55]}>
          <boxGeometry args={[2.4, 1.3, 0.18]} />
          <meshToonMaterial color={house.woodColor} />
        </mesh>
        {/* Beyaz Şilte */}
        <mesh position={[0, 0.48, 0.05]}>
          <boxGeometry args={[2.1, 0.28, 2.9]} />
          <meshToonMaterial color="#ffffff" />
        </mesh>
        {/* Renkli Yorgan */}
        <mesh position={[0, 0.58, 0.4]}>
          <boxGeometry args={[2.12, 0.14, 2.1]} />
          <meshToonMaterial color={house.beds[1]?.blanketColor ?? "#b39ddb"} />
        </mesh>
        {/* Yastık */}
        <mesh position={[0, 0.66, -1.05]} rotation-x={0.15}>
          <boxGeometry args={[1.3, 0.18, 0.6]} />
          <meshToonMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Yatak Başucu Komodinleri */}
      {[-5.8, 5.8].map((kx) => (
        <group key={kx} position={[kx, 0.015, -3.8]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[0.9, 0.7, 0.9]} />
            <meshToonMaterial color={house.woodColor} />
          </mesh>
          {/* Komodin Üstü Gece Lambası */}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
            <meshToonMaterial color="#d4af37" />
          </mesh>
          <mesh position={[0, 1.05, 0]}>
            <coneGeometry args={[0.26, 0.28, 8, 1, true]} />
            <meshToonMaterial color="#fff0f5" />
          </mesh>
          <pointLight position={[0, 1.05, 0]} color="#ffeaa7" intensity={0.9} distance={3.5} />
        </group>
      ))}

      {/* Duvar Aplikleri */}
      {[-halfD / 2, halfD / 2].map((wz) => (
        <group key={wz}>
          <pointLight position={[-halfW + 0.4, 2.6, wz]} color="#ffeaa7" intensity={1.1} distance={5.5} />
          <pointLight position={[halfW - 0.4, 2.6, wz]} color="#ffeaa7" intensity={1.1} distance={5.5} />
        </group>
      ))}

      {/* Şirin Tavan Avizesi */}
      <group position={[0, H - 0.3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.1, 0.35, 8]} />
          <meshToonMaterial color="#d4af37" />
        </mesh>
        <pointLight color="#fff0f5" intensity={1.8} distance={7.5} />
      </group>
    </group>
  );
}

export function Houses() {
  return (
    <group>
      {HOUSES.map((h) => (
        <SingleHouse key={h.id} house={h} />
      ))}
    </group>
  );
}
