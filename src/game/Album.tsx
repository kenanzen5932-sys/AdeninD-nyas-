import { useEffect, useState } from "react";
import * as THREE from "three";
import { uiStore } from "./store";
import p1 from "@/assets/photo1.jpg.asset.json";
import p2 from "@/assets/photo2.jpg.asset.json";
import p3 from "@/assets/photo3.jpg.asset.json";
import p4 from "@/assets/photo4.jpg.asset.json";

export const PHOTOS = [
  { url: p1.url, w: 616, h: 1334, label: "Aden & Never 🌸" },
  { url: p2.url, w: 750, h: 1110, label: "Masal Anımız ✨" },
  { url: p3.url, w: 576, h: 1024, label: "Birlikte Sonsuzluk 💗" },
  { url: p4.url, w: 1125, h: 655, label: "Aşk Dünyası 🌟" },
];

export const WALL_PHOTOS = [
  // Ev 1 (Aden'in Köşkü - Sol Ev, x: -14, z: -30):
  // Giriş kapısının SOL duvarı: Fotoğraf 1 (p1 - Aden & Never)
  {
    id: "wall-photo-0",
    photoIndex: 0,
    houseId: "house-1",
    houseName: "Aden'in Köşkü",
    position: [-18.325, 2.15, -24.84] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    name: "Aden & Never 🌸",
  },
  // Giriş kapısının SAĞ duvarı: Fotoğraf 2 (p2 - Masal Anımız)
  {
    id: "wall-photo-1",
    photoIndex: 1,
    houseId: "house-1",
    houseName: "Aden'in Köşkü",
    position: [-9.675, 2.15, -24.84] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    name: "Masal Anımız ✨",
  },
  // Ev 2 (Never'ın Köşkü - Sağ Ev, x: 14, z: -30):
  // Giriş kapısının SOL duvarı: Fotoğraf 3 (p3 - Birlikte Sonsuzluk)
  {
    id: "wall-photo-2",
    photoIndex: 2,
    houseId: "house-2",
    houseName: "Never'ın Köşkü",
    position: [9.675, 2.15, -24.84] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    name: "Birlikte Sonsuzluk 💗",
  },
  // Giriş kapısının SAĞ duvarı: Fotoğraf 4 (p4 - Aşk Dünyası)
  {
    id: "wall-photo-3",
    photoIndex: 3,
    houseId: "house-2",
    houseName: "Never'ın Köşkü",
    position: [18.325, 2.15, -24.84] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    name: "Aşk Dünyası 🌟",
  },
];

const photoTexCache = new Map<string, THREE.Texture>();

// Tarayıcı açılır açılmaz 4 fotoğrafı arka planda hemen belleğe al
if (typeof window !== "undefined") {
  const loader = new THREE.TextureLoader();
  PHOTOS.forEach((p) => {
    loader.load(p.url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      photoTexCache.set(p.url, t);
    });
  });
}

function WallPhotoItem({
  photo,
  item,
}: {
  photo: (typeof PHOTOS)[number];
  item: (typeof WALL_PHOTOS)[number];
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(() => photoTexCache.get(photo.url) ?? null);

  useEffect(() => {
    if (photoTexCache.has(photo.url)) {
      setTex(photoTexCache.get(photo.url)!);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(photo.url, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.generateMipmaps = true;
      loaded.minFilter = THREE.LinearMipmapLinearFilter;
      photoTexCache.set(photo.url, loaded);
      setTex(loaded);
    });
  }, [photo.url]);

  // Duvardaki çerçeve boyutu: Max boyut 2.2m (Duvara tam oturan ferah orantı)
  const maxDim = 2.2;
  const ratio = maxDim / Math.max(photo.w, photo.h);
  const pw = photo.w * ratio;
  const ph = photo.h * ratio;

  const handleClick = (e: any) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    uiStore.set({ albumOpen: true, albumIndex: item.photoIndex });
  };

  return (
    <group position={item.position} rotation={item.rotation}>
      {/* 1. Lüks Koyu Ceviz Ağacı Dış Çerçeve */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[pw + 0.22, ph + 0.22, 0.04]} />
        <meshStandardMaterial color="#3e2723" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* 2. Altın Yaldızlı İç Çerçeve / Pah */}
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[pw + 0.09, ph + 0.09, 0.02]} />
        <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.7} />
      </mesh>

      {/* 3. Beyaz Matlık / Paspartu */}
      <mesh position={[0, 0, 0.046]}>
        <planeGeometry args={[pw + 0.04, ph + 0.04]} />
        <meshBasicMaterial color="#fffef7" />
      </mesh>

      {/* 4. Kristal Netliğinde Gerçek Fotoğraf (Tıklanabilir) */}
      {tex ? (
        <mesh
          position={[0, 0, 0.05]}
          onClick={handleClick}
          onPointerOver={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "auto";
          }}
        >
          <planeGeometry args={[pw, ph]} />
          <meshBasicMaterial
            key={tex.id}
            map={tex}
            side={THREE.FrontSide}
            toneMapped={false}
          />
        </mesh>
      ) : (
        <mesh position={[0, 0, 0.05]} onClick={handleClick}>
          <planeGeometry args={[pw, ph]} />
          <meshBasicMaterial color="#ffccd5" />
        </mesh>
      )}

      {/* 5. Çerçeve Üstü Zarif Tablo Aydınlatması (Pirinç Aplik Lamba) */}
      <group position={[0, ph / 2 + 0.16, 0.1]}>
        {/* Lamba Bağlantı Kolu */}
        <mesh position={[0, -0.05, -0.06]} rotation-x={Math.PI / 4}>
          <cylinderGeometry args={[0.015, 0.015, 0.12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Yatay Lamba Borusu */}
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.022, 0.022, Math.min(pw * 0.7, 1.1)]} />
          <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 6. Altın İsim Plaketi */}
      <mesh position={[0, -ph / 2 - 0.14, 0.025]}>
        <boxGeometry args={[Math.min(pw * 0.7, 1.0), 0.1, 0.015]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function AlbumWall() {
  return (
    <group>
      {WALL_PHOTOS.map((item) => {
        const p = PHOTOS[item.photoIndex]!;
        return <WallPhotoItem key={item.id} item={item} photo={p} />;
      })}
    </group>
  );
}

export const SkyPhotos = AlbumWall;
