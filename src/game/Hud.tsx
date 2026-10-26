import { useEffect, useRef, useSyncExternalStore, useState, useMemo } from "react";
import { Volume1, Volume2, VolumeX, Heart, Users, X, ChevronLeft, ChevronRight, UserCheck, MessageSquare, Send, Trophy, Mic, MicOff, Headphones, Maximize, Shield } from "lucide-react";
import { input, local, uiStore } from "./store";
import { setMuted, setVolume } from "./music";
import { PHOTOS } from "./Album";
import { sendFx, sendChatMessage, sendSocialAction, remotes } from "./useMultiplayer";
import { connectVoiceChat, toggleMicrophone, toggleDeafen, disconnectVoiceChat } from "./voiceChat";
import { isFullscreen, requestFullScreenSafely, toggleFullScreen } from "./fullscreen";
import { AdminPanel } from "./AdminPanel";
import { useCinemaSync } from "./cinemaSync";
import { toggleCinemaAudio } from "./Cinema3DOverlay";

function useUI() {
  return useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const R = 50;
  const move = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId || !base.current) return;
    const b = base.current.getBoundingClientRect();
    let dx = e.clientX - (b.left + b.width / 2);
    let dy = e.clientY - (b.top + b.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    input.moveX = dx / R;
    input.moveY = -dy / R;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const end = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    input.moveX = 0;
    input.moveY = 0;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
  };
  return (
    <div
      ref={base}
      className="joy-base pointer-events-auto absolute bottom-6 left-8 touch-none"
      onPointerDown={(e) => { pid.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div ref={knob} className="joy-knob" />
    </div>
  );
}

function CameraDrag() {
  const last = useRef<{ id: number; x: number; y: number } | null>(null);

  return (
    <div
      className="pointer-events-auto absolute inset-y-0 right-0 w-2/3 touch-none"
      onPointerDown={(e) => { last.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        const l = last.current;
        if (!l || l.id !== e.pointerId) return;
        input.camYaw -= (e.clientX - l.x) * 0.008;
        input.camPitch = Math.min(1.1, Math.max(-0.4, input.camPitch + (e.clientY - l.y) * 0.005));
        l.x = e.clientX; l.y = e.clientY;
      }}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
    />
  );
}

function useKeyboard() {
  useEffect(() => {
    const keys = new Set<string>();
    const update = () => {
      input.moveX = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      input.moveY = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " ") {
        if (local.flying) input.flyUp = true;
        else input.jump = true;
        e.preventDefault();
        return;
      }
      if (k === "shift" || k === "c") {
        if (local.flying) {
          input.flyDown = true;
          e.preventDefault();
          return;
        }
      }
      if (k === "q") input.camYaw += 0.15;
      if (k === "e" || k === "f") { input.triggerAction = true; return; }
      keys.add(k); update();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " ") input.flyUp = false;
      if (k === "shift" || k === "c") input.flyDown = false;
      keys.delete(k); update();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
}

export function Hud() {
  const ui = useUI();
  useKeyboard();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [playersOpen, setPlayersOpen] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const cinemaState = useCinemaSync();

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => chatInputRef.current?.focus(), 60);
    }
  }, [chatOpen]);

  // Sesli sohbete ilk girişte dinleyici olarak otomatik bağlan
  useEffect(() => {
    void connectVoiceChat();
    return () => {
      disconnectVoiceChat();
    };
  }, []);

  // Mobilde mikrofon izni penceresi veya başka bir sebeple tam ekrandan çıkıldığında
  // ekrana ilk dokunuşta otomatik olarak tam ekrana geri dön
  useEffect(() => {
    const ensureFullscreen = () => {
      if (window.innerWidth > window.innerHeight && !isFullscreen()) {
        requestFullScreenSafely();
      }
    };
    window.addEventListener("pointerdown", ensureFullscreen, { passive: true });
    window.addEventListener("touchstart", ensureFullscreen, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", ensureFullscreen);
      window.removeEventListener("touchstart", ensureFullscreen);
    };
  }, []);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatText.trim();
    if (!msg) return;
    if (msg === "/admin" || msg === "!admin") {
      uiStore.set({ adminModalOpen: true });
      setChatText("");
      setChatOpen(false);
      return;
    }
    sendChatMessage(msg);
    setChatText("");
    setChatOpen(false);
  };

  const [nearbyPlayer, setNearbyPlayer] = useState<{ id: string; name: string } | null>(null);

  // Yakındaki diğer oyuncuyu algıla (< 2.4 metre mesafede)
  useEffect(() => {
    const interval = setInterval(() => {
      let found: { id: string; name: string } | null = null;
      for (const p of uiStore.get().players) {
        if (p.id === local.id) continue;
        const r = remotes.get(p.id);
        if (!r) continue;
        const dx = local.pos.x - r.target.x;
        const dy = local.pos.y - r.target.y;
        const dz = local.pos.z - r.target.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 2.4) {
          found = { id: p.id, name: p.name };
          break;
        }
      }
      setNearbyPlayer(found);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const allPlayers = ui.players.length > 0
    ? ui.players
    : [{ id: local.id, name: local.name || "Aden", gender: local.gender }];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      <CameraDrag />

      {/* İki Oyuncu Yakınlaşınca Çıkan Romantik / Sosyal Etkileşim Barı */}
      {nearbyPlayer && ui.activeAction === "none" && (
        <div className="pointer-events-auto absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-gradient-to-r from-purple-950/95 via-pink-950/95 to-purple-950/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-pink-400/50 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="text-xs font-bold text-pink-200 mr-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span className="max-w-[90px] truncate">{nearbyPlayer.name}</span>:
          </div>
          <button
            type="button"
            onClick={() => {
              input.moveX = 0;
              input.moveY = 0;
              sendSocialAction(nearbyPlayer.id, "kiss");
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-500/25 hover:bg-pink-500/40 border border-pink-400/50 text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
            title="Öpücük gönder"
          >
            <span>💋</span> Öp
          </button>
          <button
            type="button"
            onClick={() => {
              input.moveX = 0;
              input.moveY = 0;
              sendSocialAction(nearbyPlayer.id, "hug");
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/50 text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
            title="Sıkıca sarıl"
          >
            <span>🫂</span> Sarıl
          </button>
          <button
            type="button"
            onClick={() => {
              input.moveX = 0;
              input.moveY = 0;
              sendSocialAction(nearbyPlayer.id, "handshake");
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/25 hover:bg-indigo-500/40 border border-indigo-400/50 text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
            title="Tokalaş"
          >
            <span>🤝</span> Tokalaş
          </button>
        </div>
      )}


      {/* Sol Üst Bar: Çevrimiçi Düğmesi, Mesaj Girişi ve Başlık */}
      <div className="absolute left-4 top-3 flex items-start gap-2 z-20 pointer-events-none">
        {/* 1. Sütun: Çevrimiçi Butonu ve Tam Altında Açılan Sadece Siyah Liste */}
        <div className="flex flex-col items-start pointer-events-auto">
          <button
            type="button"
            className="hud-chip flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0"
            onClick={() => setPlayersOpen((v) => !v)}
            title="Çevrimiçi oyuncuları gör"
          >
            <Users className="size-4 text-pink-500" />
            <span className="font-bold text-gray-700">{allPlayers.length} Çevrimiçi</span>
          </button>

          {/* Çevrimiçi Açılır Listesi: SADECE SİYAH, başlık yok, emoji yok, sadece isim ve (sen) */}
          {playersOpen && (
            <div className="mt-1 flex flex-col gap-1 w-32 bg-black/90 backdrop-blur-md rounded-xl p-1.5 shadow-2xl border border-white/20 max-h-36 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {allPlayers.map((p) => {
                const isMe = p.id === local.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-2 py-0.5 rounded text-xs font-semibold text-white/95"
                  >
                    <span className="truncate">{p.name || "Aden"}</span>
                    {isMe && (
                      <span className="text-[10px] text-pink-400 font-bold ml-1 shrink-0">
                        sen
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Sütun: Mesaj Yaz Butonu ve Tam Altında "Aden'in Masal Dünyası" Yazısı */}
        <div className="flex flex-col items-start pointer-events-auto">
          {!chatOpen ? (
            <button
              type="button"
              className="hud-chip flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm text-pink-600 font-bold text-xs shrink-0"
              onClick={() => setChatOpen(true)}
              title="Mesaj yaz"
            >
              <MessageSquare className="size-3.5 text-pink-500" />
              <span>Mesaj Yaz 💬</span>
            </button>
          ) : (
            <form
              onSubmit={handleSendChat}
              className="flex items-center bg-white/95 backdrop-blur-md border border-pink-300 rounded-full px-2.5 py-1 shadow-md focus-within:ring-2 focus-within:ring-pink-400 transition-all animate-in slide-in-from-left-2 duration-150"
            >
              <input
                ref={chatInputRef}
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Mesajını yaz..."
                maxLength={45}
                className="bg-transparent text-xs text-gray-800 placeholder-gray-400 font-medium outline-none w-28 sm:w-44 md:w-56"
              />
              <button
                type="submit"
                className="flex size-6 items-center justify-center rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-transform active:scale-90 ml-1 shrink-0"
                aria-label="Gönder"
              >
                <Send className="size-3" />
              </button>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-0.5 shrink-0"
                onClick={() => {
                  setChatOpen(false);
                  setChatText("");
                }}
                aria-label="Kapat"
              >
                <X className="size-3.5" />
              </button>
            </form>
          )}

          {/* Aden'in Masal Dünyası Yazısı */}
          <div className="mt-1 px-1 -ml-3">
            <span className="font-display text-[11px] font-bold text-pink-900 drop-shadow-sm tracking-wide bg-white/70 px-2.5 py-0.5 rounded-full border border-pink-200/70 shadow-xs">
              Aden'in Masal Dünyası
            </span>
          </div>
        </div>

        {/* 3. Sütun: Mikrofon ve Hemen Sağında Ses (Kulaklık) Butonu - Boşluksuz Yan Yana */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {/* Mikrofon Açma / Kapama Butonu */}
          <button
            type="button"
            onClick={toggleMicrophone}
            className={`hud-chip flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm font-bold text-xs shrink-0 ${
              ui.voiceMicOn
                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300 shadow-emerald-200"
                : "text-gray-700 bg-white/85 hover:bg-white"
            }`}
            title={ui.voiceMicOn ? "Mikrofonu Kapat" : "Mikrofonu Aç (İzin ister)"}
          >
            {ui.voiceMicOn ? (
              <>
                <Mic className="size-3.5 text-white animate-pulse" />
                <span className="text-white text-[11px]">Mikrofon Açık</span>
              </>
            ) : (
              <>
                <MicOff className="size-3.5 text-rose-500" />
                <span className="text-[11px] text-gray-700">Mikrofon</span>
              </>
            )}
          </button>

          {/* Kulaklık / Gelen Ses Butonu - Mikrofonun hemen sağında */}
          <button
            type="button"
            onClick={toggleDeafen}
            className={`hud-chip flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm font-bold text-xs shrink-0 ${
              ui.voiceDeafened
                ? "bg-rose-500 text-white border-rose-300"
                : "text-gray-700 bg-white/85 hover:bg-white"
            }`}
            title={ui.voiceDeafened ? "Gelen Sesleri Aç" : "Gelen Sesleri Sustur (Kulaklığı Kapat)"}
          >
            {ui.voiceDeafened ? (
              <>
                <VolumeX className="size-3.5 text-white" />
                <span className="text-[11px] text-white">Susturuldu</span>
              </>
            ) : (
              <>
                <Headphones className="size-3.5 text-pink-500" />
                <span className="text-[11px] text-gray-700">Ses</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sesli Sohbet Bildirimi / Bilgilendirme Toast */}
      {ui.voiceNotice && (
        <div className="pointer-events-none absolute left-4 top-16 z-30 flex items-center gap-2 bg-black/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-pink-400/40 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-semibold">{ui.voiceNotice}</span>
        </div>
      )}

      {/* Sağ Üst Bar: Ses Ayarları */}
      <div className="pointer-events-auto absolute right-4 top-3 flex items-center gap-2">
        {/* Video Sesi Aç / Kapat Butonu (MP3 Sesinin Hemen Solunda) */}
        <button
          type="button"
          onClick={toggleCinemaAudio}
          className={`hud-chip flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm font-bold text-xs shrink-0 ${
            ui.cinemaSoundEnabled
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 shadow-amber-200"
              : "text-gray-700 bg-white/85 hover:bg-white"
          }`}
          title={ui.cinemaSoundEnabled ? "Video Sesini Kapat" : "Video Sesini Aç"}
        >
          {ui.cinemaSoundEnabled ? (
            <>
              <Volume2 className="size-3.5 text-white animate-pulse" />
              <span className="text-[11px] text-white">Video Sesi Açık</span>
            </>
          ) : (
            <>
              <VolumeX className="size-3.5 text-amber-500" />
              <span className="text-[11px] text-gray-700">Video Sesi Kapalı</span>
            </>
          )}
        </button>

        <div className="hud-volume">
          <Volume1 className="size-4 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ui.volume}
            aria-label="Ses seviyesi"
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (ui.muted && v > 0) setMuted(false);
              localStorage.setItem("aden-volume", String(v));
              uiStore.set({ volume: v, muted: ui.muted && v > 0 ? false : ui.muted });
            }}
          />
        </div>
        <button
          className="hud-round"
          aria-label={ui.muted ? "Sesi aç" : "Sesi kapat"}
          onClick={() => {
            const m = !ui.muted;
            setMuted(m);
            localStorage.setItem("aden-muted", m ? "1" : "0");
            uiStore.set({ muted: m });
          }}
        >
          {ui.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        {/* Tam Ekran Butonu */}
        <button
          type="button"
          className="hud-round cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-transform"
          aria-label="Tam Ekran"
          title="Tam Ekran"
          onClick={toggleFullScreen}
        >
          <Maximize className="size-4 text-pink-600" />
        </button>
      </div>

      <Joystick />

      {/* Sağ Alt Butonlar */}
      <div className="absolute bottom-6 right-6 flex items-end gap-2.5">
        <div className="flex flex-col items-center gap-2.5">
          {/* Topa Vur Butonu: Küçük Kalp Emojisi Üstünde Sağda - Sabit durur, oynama/zıplama yok */}
          {ui.actionPrompt?.type === "kick_ball" && (
            <button
              type="button"
              className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold text-xs shadow-lg border-2 border-white cursor-pointer active:scale-95 transition-transform"
              onClick={() => {
                input.triggerAction = true;
              }}
            >
              <span>⚽</span>
              <span>Topa Vur!</span>
            </button>
          )}

          {/* Kalp Gönder Butonu (Dans Üstünde) */}
          <button
            type="button"
            className="hud-round pointer-events-auto cursor-pointer"
            aria-label="Kalp gönder"
            onClick={() => sendFx("💗")}
          >
            <Heart className="size-6 fill-current text-pink-500" />
          </button>

          {/* Dans Butonu */}
          <button
            type="button"
            className="hud-dance pointer-events-auto cursor-pointer"
            data-active={ui.dancing}
            onClick={() => {
              local.dancing = !local.dancing;
              uiStore.set({ dancing: local.dancing });
            }}
          >
            💃 Dans
          </button>

          {/* Uçma & Zıplama Butonları: Kuş emojisi kaldırıldı */}
          <div className="flex items-center gap-2">
            {/* Uçarken Süpermen Yukarı ve Aşağı Uçuş Kontrolleri */}
            {ui.flying && (
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  className="size-11 rounded-full flex items-center justify-center font-black text-sm bg-white/90 text-pink-600 shadow-md border-2 border-pink-200 active:scale-90 transition-transform cursor-pointer select-none"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    input.flyUp = true;
                  }}
                  onPointerUp={() => {
                    input.flyUp = false;
                  }}
                  onPointerCancel={() => {
                    input.flyUp = false;
                  }}
                  title="Yukarı Uç"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="size-11 rounded-full flex items-center justify-center font-black text-sm bg-white/90 text-pink-600 shadow-md border-2 border-pink-200 active:scale-90 transition-transform cursor-pointer select-none"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    input.flyDown = true;
                  }}
                  onPointerUp={() => {
                    input.flyDown = false;
                  }}
                  onPointerCancel={() => {
                    input.flyDown = false;
                  }}
                  title="Aşağı Uç"
                >
                  ▼
                </button>
              </div>
            )}

            <button
              type="button"
              className="hud-fly pointer-events-auto shrink-0 select-none cursor-pointer"
              data-active={ui.flying}
              onClick={() => {
                local.flying = !local.flying;
                uiStore.set({ flying: local.flying });
                input.flyUp = false;
                input.flyDown = false;
              }}
              title="Uçma Modu"
            >
              {ui.flying ? "İn" : "Uç"}
            </button>

            {!ui.flying && (
              <button
                type="button"
                className="hud-jump pointer-events-auto cursor-pointer select-none"
                onPointerDown={() => (input.jump = true)}
              >
                Zıpla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dinamik Etkileşim Butonu (Yalnızca Oturma/Uzanma - Kalk/İn butonları kaldırıldı) */}
      {ui.actionPrompt && ui.actionPrompt.type !== "kick_ball" && (
        <button
          className="hud-action-btn pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2"
          onClick={() => {
            input.triggerAction = true;
          }}
        >
          {ui.actionPrompt.label}
        </button>
      )}

      {/* Albüm Yakınlaşma Butonu */}
      {ui.nearAlbum && !ui.albumOpen && !ui.actionPrompt && (
        <button
          className="hud-read pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2"
          onClick={() => uiStore.set({ albumOpen: true })}
        >
          📸 Albümü Aç
        </button>
      )}

      {/* Albüm Görüntüleyici */}
      {ui.albumOpen && <AlbumViewer />}

      {/* Şifreli Yönetici Paneli */}
      {ui.adminModalOpen && (
        <AdminPanel onClose={() => uiStore.set({ adminModalOpen: false })} />
      )}

      {/* Lobiye Gönderilme Bildirimi (Oyundan Atılma) */}
      {ui.kickedReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl border-2 border-red-300">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 text-3xl mb-3">
              🛑
            </div>
            <h3 className="font-display text-xl font-black text-gray-900">
              Lobiye Gönderildiniz
            </h3>
            <p className="mt-2 text-xs text-gray-600 font-medium">
              {ui.kickedReason}
            </p>
            <button
              type="button"
              onClick={() => {
                uiStore.set({ kickedReason: null });
                window.location.reload();
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 py-3 text-sm font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Lobiye Dön 🌸
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumViewer() {
  const ui = useUI();
  const [i, setI] = useState(() => ui.albumIndex ?? 0);
  const startX = useRef<number | null>(null);
  const n = PHOTOS.length;
  const go = (d: number) => setI((v) => (v + d + n) % n);
  const close = () => uiStore.set({ albumOpen: false });
  return (
    <div className="album-overlay pointer-events-auto absolute inset-0 flex items-center justify-center" onClick={close}>
      <div
        className="album-card"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="flex w-full items-center justify-between">
          <h3 className="font-display text-xl text-primary">📸 Anı Albümü</h3>
          <span className="text-sm font-bold text-muted-foreground">
            {i + 1} / {n}
          </span>
          <button className="hud-round size-9" aria-label="Kapat" onClick={close}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 w-full flex-1 items-center gap-2">
          <button className="hud-round shrink-0" aria-label="Önceki" onClick={() => go(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex h-full min-w-0 flex-1 items-center justify-center">
            <img src={PHOTOS[i]!.url} alt={`Anı ${i + 1}`} className="album-photo" draggable={false} />
          </div>
          <button className="hud-round shrink-0" aria-label="Sonraki" onClick={() => go(1)}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}


