import { useRef, useEffect, useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useCinemaSync, type CinemaState } from "./cinemaSync";
import { uiStore } from "./store";

function epsilon(v: number): number {
  return Math.abs(v) < 1e-10 ? 0 : v;
}

function getCameraCSSMatrix(m: THREE.Matrix4): string {
  const el = m.elements;
  return `matrix3d(${epsilon(el[0])},${epsilon(-el[1])},${epsilon(el[2])},${epsilon(el[3])},${epsilon(el[4])},${epsilon(-el[5])},${epsilon(el[6])},${epsilon(el[7])},${epsilon(el[8])},${epsilon(-el[9])},${epsilon(el[10])},${epsilon(el[11])},${epsilon(el[12])},${epsilon(-el[13])},${epsilon(el[14])},${epsilon(el[15])})`;
}

function getObjectCSSMatrix(m: THREE.Matrix4): string {
  const el = m.elements;
  return `translate(-50%,-50%)matrix3d(${epsilon(el[0])},${epsilon(el[1])},${epsilon(el[2])},${epsilon(el[3])},${epsilon(-el[4])},${epsilon(-el[5])},${epsilon(-el[6])},${epsilon(-el[7])},${epsilon(el[8])},${epsilon(el[9])},${epsilon(el[10])},${epsilon(el[11])},${epsilon(el[12])},${epsilon(el[13])},${epsilon(el[14])},${epsilon(el[15])})`;
}

let globalCameraLayerEl: HTMLDivElement | null = null;
let globalScreenEl: HTMLDivElement | null = null;
let globalIframeEl: HTMLIFrameElement | null = null;

const _toScreen = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _screenCenter = new THREE.Vector3(0, 4.2, 33.72);

// Her animasyon karesinde Scene.tsx useFrame içinden çağrılır:
// Kameranın 3D dönüşümünü CSS matrisine senkronize eder (Sıfır gecikme, 60 FPS)
export function updateCinema3DTransform(camera: THREE.Camera, size: { width: number; height: number }) {
  if (!globalCameraLayerEl || !globalScreenEl) return;

  const persCam = camera as THREE.PerspectiveCamera;
  const fov = persCam.projectionMatrix.elements[5] * (size.height / 2);
  const camMat = getCameraCSSMatrix(camera.matrixWorldInverse);

  globalCameraLayerEl.style.transform = `perspective(${fov}px) translateZ(${fov}px) ${camMat} translate(${size.width / 2}px,${size.height / 2}px)`;

  // Kameranın ekrana bakıp bakmadığını ve mesafesini kontrol et
  _toScreen.subVectors(_screenCenter, camera.position);
  const dist = _toScreen.length();
  _toScreen.normalize();
  camera.getWorldDirection(_camDir);
  const dot = _toScreen.dot(_camDir);
  const isPlayerInFront = camera.position.z < 34.2;

  if (dot > 0.05 && isPlayerInFront && dist < 120) {
    if (globalScreenEl.style.display === "none") {
      globalScreenEl.style.display = "";
    }
  } else {
    if (globalScreenEl.style.display !== "none") {
      globalScreenEl.style.display = "none";
    }
  }
}

// -------------------------------------------------------------
// SİNEMA SESİ KONTROL FONKSİYONLARI (HUD Butonu Burayı Çağırır)
// -------------------------------------------------------------
export function toggleCinemaAudio() {
  const current = uiStore.get().cinemaSoundEnabled;
  setCinemaAudio(!current);
}

export function setCinemaAudio(enabled: boolean) {
  uiStore.set({ cinemaSoundEnabled: enabled });
  if (globalIframeEl?.contentWindow) {
    const cw = globalIframeEl.contentWindow;
    if (enabled) {
      cw.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
      cw.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), "*");
    } else {
      cw.postMessage(JSON.stringify({ event: "command", func: "mute", args: [] }), "*");
    }
  }
}

// -------------------------------------------------------------
// 3D DÜNYAYA DOĞRUDAN GÖMÜLÜ SİNEMA EKRANI KATMANI
// WebGL tuvalinin ARKASINDA (z-index: 1) durur.
// WebGL'deki NoBlending delik sayesinde ekrandan kusursuz görünür
// ve önüne karakter geçtiğinde karakter videonun ÖNÜNDE kalır!
// -------------------------------------------------------------
export function Cinema3DOverlay() {
  const state: CinemaState = useCinemaSync();
  const ui = useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    globalCameraLayerEl = cameraLayerRef.current;
    globalScreenEl = screenRef.current;
    globalIframeEl = iframeRef.current;
    return () => {
      globalCameraLayerEl = null;
      globalScreenEl = null;
      globalIframeEl = null;
    };
  }, []);

  // 12 metre genişlik, 6.75 metre yükseklik (16:9 sinema en-boy oranı)
  // Ekran merkez koordinatları: x=0, y=4.2, z=33.72
  const objTransform = useMemo(() => {
    const screenMatrix = new THREE.Matrix4();
    screenMatrix.compose(
      new THREE.Vector3(0, 4.2, 33.72),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)),
      new THREE.Vector3(12.0 / 1280, 6.75 / 720, 1)
    );
    return getObjectCSSMatrix(screenMatrix);
  }, []);

  const initialStartSec = useMemo(() => {
    const elapsed = state.status === "playing"
      ? Math.max(0, (Date.now() - new Date(state.updated_at).getTime()) / 1000)
      : 0;
    return Math.max(0, Math.floor(state.seek_time + elapsed));
  }, [state.video_id]);

  console.log(
    `%c🖥️ [Sinema 3D Gömülü Ekran]: Video=${state.video_id || "YOK (Standby)"} | Durum=${state.status} | Başlık="${state.title}" | Ses=${ui.cinemaSoundEnabled ? "OTOMATİK AÇIK" : "KAPALI"}`,
    "color: #f59e0b; font-weight: bold;"
  );

  // Ses Durumu Değiştiğinde YouTube API'ye Komut Gönder (Video kesilmeden/yeniden başlamadan anında ses açar/kapatır)
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    const cw = iframeRef.current.contentWindow;
    if (ui.cinemaSoundEnabled) {
      cw.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
      cw.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), "*");
    } else {
      cw.postMessage(JSON.stringify({ event: "command", func: "mute", args: [] }), "*");
    }
  }, [ui.cinemaSoundEnabled]);

  // Yeni Video Geldiğinde Ses Durumunu Uygula
  useEffect(() => {
    if (!state.video_id) return;
    globalIframeEl = iframeRef.current;

    const syncAudio = () => {
      if (iframeRef.current?.contentWindow && uiStore.get().cinemaSoundEnabled) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), "*");
      }
    };

    syncAudio();
    const t1 = setTimeout(syncAudio, 400);
    const t2 = setTimeout(syncAudio, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [state.video_id]);

  // Play / Pause / Seek senkronizasyonu
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !state.video_id) return;
    try {
      const cw = iframeRef.current.contentWindow;
      const cmd = state.status === "playing" ? "playVideo" : "pauseVideo";
      cw.postMessage(JSON.stringify({ event: "command", func: cmd, args: [] }), "*");
    } catch {}
  }, [state.status]);

  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !state.video_id) return;
    try {
      const cw = iframeRef.current.contentWindow;
      cw.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [state.seek_time, true] }), "*");
    } catch {}
  }, [state.seek_time]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 1, // Canvas'ın (z-index: 2) ARKASINDA! WebGL delik açınca arkadan pürüzsüz görünür!
      }}
    >
      {/* Three.js CSS3D View Katmanı */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transformOrigin: "0 0",
          pointerEvents: "none",
        }}
      >
        {/* Kamera 3D Perspektif Katmanı */}
        <div
          ref={cameraLayerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            pointerEvents: "none",
          }}
        >
          {/* Koltukların Karşısındaki Dev Ekrana Birebir Kilitli 3D Pano */}
          <div
            ref={screenRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1280px",
              height: "720px",
              transform: objTransform,
              backfaceVisibility: "hidden",
              pointerEvents: "auto",
              borderRadius: "20px",
              overflow: "hidden",
              backgroundColor: "#030712",
              border: "5px solid rgba(236, 72, 153, 0.85)",
              boxShadow: "0 0 70px rgba(236, 72, 153, 0.7), inset 0 0 30px rgba(0, 0, 0, 0.9)",
              userSelect: "none",
            }}
          >
            {state.video_id ? (
              <div style={{ position: "relative", width: "1280px", height: "720px", backgroundColor: "#000000" }}>
                {/* Gerçek YouTube Videosu - Doğrudan 3D Ekran Yüzeyinde.
                    youtube-nocookie yerine standart www.youtube.com kullanıldı ve kısıtlayıcı origin kaldırıldı.
                    Bu sayede mobildeki "Video kullanılamıyor" telif/müzik videosu engeli tamamen kalkar! */}
                <iframe
                  id="cinema-youtube-iframe"
                  key={state.video_id}
                  ref={iframeRef}
                  src={`https://www.youtube.com/embed/${state.video_id}?autoplay=1&mute=1&start=${initialStartSec}&controls=1&rel=0&playsinline=1&enablejsapi=1`}
                  title={state.title || "YouTube Cinema"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  style={{
                    width: "1280px",
                    height: "720px",
                    border: "none",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    display: "block",
                    pointerEvents: "auto",
                  }}
                />
              </div>
            ) : (
              /* Standby / Bekleme Ekranı */
              <div
                style={{
                  width: "1280px",
                  height: "720px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "40px",
                  background: "linear-gradient(180deg, #020617 0%, #1e1b4b 60%, #4c0519 100%)",
                  color: "#ffffff",
                }}
              >
                <div style={{ fontSize: "96px", marginBottom: "20px" }}>🍿</div>
                <h2
                  style={{
                    fontSize: "44px",
                    fontWeight: 900,
                    letterSpacing: "2px",
                    background: "linear-gradient(90deg, #f472b6, #fda4af, #c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  ADEN & NEVER AÇIK HAVA SİNEMASI
                </h2>
                <p
                  style={{
                    marginTop: "20px",
                    color: "rgba(251, 207, 232, 0.9)",
                    fontSize: "22px",
                    fontWeight: 600,
                    maxWidth: "800px",
                    lineHeight: "1.5",
                  }}
                >
                  Admin panelinden YouTube videosu açıldığında burada canlı ve senkronize olarak başlayacaktır.
                </p>
                <div style={{ marginTop: "32px", display: "flex", gap: "16px" }}>
                  <span
                    style={{
                      padding: "10px 24px",
                      borderRadius: "9999px",
                      background: "rgba(236, 72, 153, 0.25)",
                      color: "#f472b6",
                      border: "1px solid rgba(236, 72, 153, 0.5)",
                      fontSize: "16px",
                      fontWeight: 700,
                    }}
                  >
                    ✨ 10 Koltuklu Özel Amfitiyatro
                  </span>
                  <span
                    style={{
                      padding: "10px 24px",
                      borderRadius: "9999px",
                      background: "rgba(168, 85, 247, 0.25)",
                      color: "#c084fc",
                      border: "1px solid rgba(168, 85, 247, 0.5)",
                      fontSize: "16px",
                      fontWeight: 700,
                    }}
                  >
                    🎬 Gerçek Zamanlı Senkronizasyon
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
