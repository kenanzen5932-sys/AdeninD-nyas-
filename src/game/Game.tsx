import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { Hud } from "./Hud";
import { useMultiplayer } from "./useMultiplayer";
import { initCinemaSync } from "./cinemaSync";
import { Cinema3DOverlay } from "./Cinema3DOverlay";

export default function Game() {
  useMultiplayer(true);

  useEffect(() => {
    const cleanup = initCinemaSync();
    return cleanup;
  }, []);

  return (
    <div className="fixed inset-0 touch-none bg-[#6ec1f7]">
      {/* 1. CSS3D YouTube Katmanı: Canvas'ın arkasında (z-index: 1) durur */}
      <Cinema3DOverlay />

      {/* 2. WebGL 3D Tuvali: z-index: 2. NoBlending deliği sayesinde video arkasından görünür,
             öndeki karakter modelleri videonun üstünde/önünde doğal olarak durur! */}
      <Canvas
        className="absolute inset-0 pointer-events-auto"
        style={{ zIndex: 2 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        camera={{ position: [0, 5, 14], fov: 60, near: 0.4, far: 500 }}
      >
        <Scene />
      </Canvas>

      {/* 3. HUD Arayüzü: z-index: 10 (Butonlar, mikrofon ve ses kontrolleri) */}
      <Hud />
    </div>
  );
}
