import * as THREE from "three";
import { CINEMA_SEATS } from "./CinemaSeats";

// -------------------------------------------------------------
// TEKİL SİNEMA KOLTUĞU MESH BİLEŞENİ
// -------------------------------------------------------------
function CinemaSeatMesh({ seat }: { seat: (typeof CINEMA_SEATS)[number] }) {
  return (
    <group position={[seat.x, seat.y, seat.z]} rotation-y={seat.rot}>
      {/* Koltuk Taban Destek Ayağı */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.44, 8]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Koltuk Minderi (Kadife Bordo/Mor) */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.75, 0.16, 0.7]} />
        <meshStandardMaterial color="#9d174d" roughness={0.7} />
      </mesh>

      {/* Sırt Yaslama Minderi */}
      <mesh position={[0, 0.88, -0.28]} rotation-x={-0.12}>
        <boxGeometry args={[0.75, 0.75, 0.14]} />
        <meshStandardMaterial color="#831843" roughness={0.7} />
      </mesh>

      {/* Sol ve Sağ Kolçaklar */}
      <mesh position={[-0.42, 0.62, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.65]} />
        <meshStandardMaterial color="#4c0519" roughness={0.5} />
      </mesh>
      <mesh position={[0.42, 0.62, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.65]} />
        <meshStandardMaterial color="#4c0519" roughness={0.5} />
      </mesh>

      {/* Kolçaktaki Bardaklık & İçecek */}
      <mesh position={[0.42, 0.72, 0.24]}>
        <cylinderGeometry args={[0.05, 0.04, 0.14, 8]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.3} />
      </mesh>

      {/* Koltuk Numarası Rozeti */}
      <mesh position={[0, 1.25, -0.22]} rotation-x={-0.12}>
        <boxGeometry args={[0.18, 0.1, 0.02]} />
        <meshStandardMaterial color="#fbcfe8" roughness={0.2} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// DEV EKRAN VE SİNEMA ALANI ANA 3D MESH BİLEŞENİ
// (Tamamen saf Three.js mesh'leridir; HTML R3F hatası oluşturmaz)
// -------------------------------------------------------------
export function Cinema() {
  return (
    <group>
      {/* 1. DEV SİNEMA EKRANI YAPISI (z = 34, koltuklara bakıyor) */}
      <group position={[0, 0, 34]}>
        {/* Sahne Podyumu (Ahşap platform) */}
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[14.5, 0.5, 3.5]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>

        {/* Ekran Ana Gövdesi (Siyah Çerçeve ve Arka Duvar) */}
        <mesh position={[0, 4.2, 0]}>
          <boxGeometry args={[12.4, 7.2, 0.5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
        </mesh>

        {/* 3D Delik (Occlusion Hole): WebGL tuvalinde tam ekran boyutunda delik açar.
            Arkadaki CSS3D YouTube videosu bu delikten kusursuz şekilde görünür.
            Önüne karakter geçtiğinde WebGL onu çizer ve video karakterin ARKASINDA kalır! */}
        <mesh position={[0, 4.2, -0.26]}>
          <planeGeometry args={[12.0, 6.75]} />
          <meshBasicMaterial
            color="#000000"
            transparent={true}
            opacity={0}
            blending={THREE.NoBlending}
            side={THREE.DoubleSide}
            depthWrite={true}
          />
        </mesh>

        {/* Ekran Arkası Neon Pembe/Mor Çerçeve Işığı */}
        <mesh position={[0, 4.2, 0.28]}>
          <planeGeometry args={[12.8, 7.6]} />
          <meshBasicMaterial color="#ec4899" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>

        {/* Sol Hoparlör Kulesi */}
        <group position={[-6.8, 3.5, 0]}>
          <mesh>
            <boxGeometry args={[0.9, 6.5, 0.8]} />
            <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 2.0, -0.42]}>
            <circleGeometry args={[0.25, 16]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
          <mesh position={[0, 0.0, -0.42]}>
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial color="#a855f7" />
          </mesh>
        </group>

        {/* Sağ Hoparlör Kulesi */}
        <group position={[6.8, 3.5, 0]}>
          <mesh>
            <boxGeometry args={[0.9, 6.5, 0.8]} />
            <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 2.0, -0.42]}>
            <circleGeometry args={[0.25, 16]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
          <mesh position={[0, 0.0, -0.42]}>
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial color="#a855f7" />
          </mesh>
        </group>
      </group>

      {/* 2. İKİNCİ SIRA YÜKSELTİLMİŞ AHŞAP BASAMAĞI (z = 18.0) */}
      <mesh position={[0, 0.175, 18.0]}>
        <boxGeometry args={[10.5, 0.35, 2.2]} />
        <meshStandardMaterial color="#92400e" roughness={0.8} />
      </mesh>

      {/* 3. 10 ADET SİNEMA KOLTUĞU */}
      {CINEMA_SEATS.map((seat) => (
        <CinemaSeatMesh key={seat.id} seat={seat} />
      ))}
    </group>
  );
}
