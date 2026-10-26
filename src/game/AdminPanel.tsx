import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  Key,
  Users,
  Tv,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Square,
  UserX,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  Wifi,
  Sparkles,
  X,
} from "lucide-react";
import { uiStore, local } from "./store";
import { kickPlayer } from "./useMultiplayer";
import {
  useCinemaSync,
  adminSetVideo,
  adminPlayPause,
  adminSeek,
  adminStopVideo,
  extractYoutubeId,
} from "./cinemaSync";
import { verifyAdminPassword, isSessionAdmin, setSessionAdmin } from "./adminConfig";

type ConnectedPlayer = {
  id: string;
  name: string;
  gender: "male" | "female";
  model?: string;
  ip?: string;
  joinedAt?: number;
};

function useAdminLivePlayers() {
  const [livePlayers, setLivePlayers] = useState<ConnectedPlayer[]>([]);
  const adminChannelRef = useRef<any>(null);

  useEffect(() => {
    const ch = supabase.channel("aden-world");
    adminChannelRef.current = ch;

    const parsePresence = () => {
      const state = ch.presenceState<{ name: string; gender: "male" | "female"; model?: string; ip?: string; joinedAt?: number }>();
      const list: ConnectedPlayer[] = [];
      for (const [id, metas] of Object.entries(state)) {
        if (!metas || metas.length === 0) continue;
        const meta = metas[0];
        list.push({
          id,
          name: meta?.name || "Bilinmiyor",
          gender: meta?.gender || "female",
          model: meta?.model || (meta?.gender === "male" ? "never_classic" : "aden_princess"),
          ip: meta?.ip || "Yerel Bağlantı",
          joinedAt: meta?.joinedAt || Date.now(),
        });
      }
      setLivePlayers(list);
    };

    ch.on("presence", { event: "sync" }, parsePresence)
      .on("presence", { event: "join" }, parsePresence)
      .on("presence", { event: "leave" }, parsePresence)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          parsePresence();
        }
      });

    const iv = setInterval(parsePresence, 2000);

    return () => {
      clearInterval(iv);
      void supabase.removeChannel(ch);
      adminChannelRef.current = null;
    };
  }, []);

  const kick = (targetId: string, reason?: string) => {
    kickPlayer(targetId, reason);
    if (adminChannelRef.current) {
      try {
        adminChannelRef.current.send({
          type: "broadcast",
          event: "kick_player",
          payload: { targetId, reason: reason || "Yönetici tarafından lobiye gönderildiniz. 🛑" },
        });
      } catch {}
    }
  };

  return { livePlayers, kick };
}

export function AdminPanel({ onClose }: { onClose?: () => void }) {
  const [authorized, setAuthorized] = useState(() => isSessionAdmin());
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Canlı oyuncu bağlantısı
  const { livePlayers, kick } = useAdminLivePlayers();
  const ui = useSyncExternalStore(uiStore.subscribe, uiStore.get);

  // Odadaki canlı oyuncular
  let allPlayers = [...livePlayers];
  if (allPlayers.length === 0 && ui.players.length > 0) {
    allPlayers = [...ui.players];
  } else if (allPlayers.length === 0 && local.name) {
    allPlayers = [{
      id: local.id || "local",
      name: local.name,
      gender: local.gender,
      model: local.characterModel,
      ip: local.ip || "Yerel Bağlantı",
      joinedAt: local.joinedAt || Date.now(),
    }];
  }

  // Sinema kontrolleri
  const cinemaState = useCinemaSync();
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [submittingVideo, setSubmittingVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<"players" | "cinema">("players");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setSessionAdmin(true);
      setAuthorized(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Hatalı şifre! (İpucu: aden veya aden123)");
    }
  };

  const handleLogout = () => {
    setSessionAdmin(false);
    setAuthorized(false);
    setPasswordInput("");
  };

  const handleKick = (playerId: string, playerName: string) => {
    if (window.confirm(`"${playerName}" adlı oyuncuyu lobiye göndermek istediğinize emin misiniz?`)) {
      kick(playerId, "Yönetici tarafından lobiye gönderildiniz. 🛑");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleSetVideo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = videoUrlInput.trim();
    if (!url) return;
    const vid = extractYoutubeId(url);
    if (!vid) {
      alert("Geçersiz YouTube linki! Lütfen geçerli bir YouTube video linki girin.");
      return;
    }
    try {
      setSubmittingVideo(true);
      const res = await adminSetVideo(url);
      showToast(`🎬 "${res.title}" başarıyla dev sinemada başlatıldı!`);
      setVideoUrlInput("");
    } catch (err: any) {
      alert(err.message || "Video yüklenirken hata oluştu!");
    } finally {
      setSubmittingVideo(false);
    }
  };

  // 1. ŞİFRE GİRİŞ EKRANI
  if (!authorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-white/95 to-pink-50/90 p-6 sm:p-8 shadow-2xl border-2 border-pink-300 text-center">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}

          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 text-white shadow-lg mb-4">
            <Shield className="size-7" />
          </div>

          <h2 className="font-display text-2xl font-black text-gray-900 tracking-tight">
            Yönetici Girişi 🛡️
          </h2>
          <p className="mt-1.5 text-xs text-gray-600 font-medium">
            Gerçek zamanlı oyuncu yönetimi ve dev sinema ekranını kontrol etmek için şifreni gir.
          </p>

          <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-3">
            <div className="relative flex items-center">
              <Key className="absolute left-3.5 size-4 text-pink-400" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Yönetici şifresi..."
                autoFocus
                className="w-full rounded-2xl bg-white/90 border border-pink-200 pl-10 pr-4 py-3 text-sm font-semibold text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-400 shadow-inner"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-red-500 animate-shake">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 py-3 text-sm font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Panele Giriş Yap ✨
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. ADMİN YÖNETİM PANELİ
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative flex flex-col w-full max-w-4xl h-[90vh] max-h-[720px] rounded-3xl bg-slate-950/95 border-2 border-pink-500/40 text-white shadow-2xl overflow-hidden">
        {/* Üst Başlık Barı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="font-display font-black text-lg text-white flex items-center gap-2">
                <span>Aden Dünyası Admin Paneli</span>
                <span className="text-[10px] bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full border border-pink-400/40">
                  CANLI
                </span>
              </h1>
              <p className="text-xs text-slate-400">Canlı Oyuncular & Dev Sinema Ekranı Yönetimi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition-colors cursor-pointer"
              title="Çıkış Yap"
            >
              <LogOut className="size-3.5" />
              <span>Çıkış</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 transition-colors cursor-pointer"
                title="Paneli Kapat"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Seçimi */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-6 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("players")}
            className={`flex items-center gap-2 py-3 px-2 font-display text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "players"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="size-4" />
            <span>Aktif Oyuncular ({allPlayers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cinema")}
            className={`flex items-center gap-2 py-3 px-2 font-display text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "cinema"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tv className="size-4" />
            <span>Dev Sinema Kontrolü 🍿</span>
          </button>
        </div>

        {/* İçerik Bölgesi */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OYUNCU LİSTESİ */}
          {activeTab === "players" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Şu Anda Dünyada Olanlar ({allPlayers.length})
                </span>
                <span className="text-xs text-pink-400 font-medium">
                  🟢 Realtime Senkronize
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {allPlayers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                    <div className="text-4xl mb-2">🏖️</div>
                    <p className="text-sm font-bold text-slate-300">Şu anda oyunda aktif oyuncu yok</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Yeni bir oyuncu masal dünyasına girdiğinde burada canlı olarak listelenecektir.
                    </p>
                  </div>
                ) : (
                  allPlayers.map((p) => {
                    const isMe = p.id === local.id;
                    const joinedDate = new Date(p.joinedAt || Date.now());
                    const timeStr = joinedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-pink-500/40 transition-all shadow-sm"
                    >
                      {/* Sol: Oyuncu Profili */}
                      <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-400/30 text-2xl shadow-inner shrink-0">
                          {p.gender === "female" ? "🌸" : "⭐"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-white text-base">
                              {p.name || "Aden"}
                            </span>
                            {isMe && (
                              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold border border-pink-400/30">
                                Sen
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              ({p.gender === "female" ? "Kız" : "Erkek"})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <span>Model: <strong className="text-slate-300 font-medium">{p.model || "aden_princess"}</strong></span>
                            <span>•</span>
                            <span>Giriş: {timeStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* Orta: IP Adresi */}
                      <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
                        <Wifi className="size-3.5 text-emerald-400" />
                        <span className="font-mono text-xs text-emerald-300 font-semibold">
                          {p.ip || "Yerel Bağlantı"}
                        </span>
                        {p.ip && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(p.ip!)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="IP Kopyala"
                          >
                            {copiedIp === p.ip ? (
                              <Check className="size-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Sağ: Lobiye At Butonu */}
                      <div className="flex items-center justify-end shrink-0">
                        <button
                          type="button"
                          onClick={() => handleKick(p.id, p.name)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-display text-xs font-bold shadow-md hover:shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <UserX className="size-3.5" />
                          <span>Lobiye Gönder 🚫</span>
                        </button>
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          )}

          {/* TAB 2: DEV SİNEMA KONTROLÜ */}
          {activeTab === "cinema" && (
            <div className="space-y-6">
              {/* Bildirim Toast'u */}
              {toastMsg && (
                <div className="p-3.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-400 shrink-0" />
                    <span>{toastMsg}</span>
                  </div>
                  <button type="button" onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* YouTube Link Girişi */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-pink-400 uppercase tracking-wider">
                    Yeni YouTube Videosu Yayınla
                  </label>
                  <span className="text-[11px] text-slate-400">
                    URL, Shorts, Mobil veya Ham ID yapıştırılabilir
                  </span>
                </div>

                <form onSubmit={handleSetVideo} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Örn: https://www.youtube.com/watch?v=... veya youtu.be/..."
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={submittingVideo || !videoUrlInput.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-display font-bold text-sm shadow-md disabled:opacity-50 transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <Play className="size-4 fill-current" />
                    <span>{submittingVideo ? "Yükleniyor..." : "Yayınla & Başlat"}</span>
                  </button>
                </form>

                {/* Algılanan Video Önizlemesi */}
                {(() => {
                  const detectedId = extractYoutubeId(videoUrlInput);
                  if (!detectedId) return null;
                  return (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-pink-500/40 animate-in fade-in">
                      <img
                        src={`https://img.youtube.com/vi/${detectedId}/mqdefault.jpg`}
                        alt="Önizleme"
                        className="w-24 h-14 object-cover rounded-lg border border-pink-500/30 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="size-3.5" /> Geçerli Video Algılandı (ID: {detectedId})
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          "Yayınla & Başlat" veya aşağıdaki "Başlat" butonuna tıklayarak oyundaki dev ekrana gönderebilirsiniz.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Hızlı Örnek Videolar */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs text-slate-400">
                  <span className="shrink-0 font-medium text-slate-500">Hızlı Seçim:</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await adminSetVideo("https://www.youtube.com/watch?v=jfKfPfyJRdk", "Lofi Girl - Relaxing Beats");
                      showToast(`☕ "${res.title}" başlatıldı!`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-300 shrink-0 cursor-pointer"
                  >
                    ☕ Lofi Beats
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await adminSetVideo("https://www.youtube.com/watch?v=5qap5aO4i9A", "Lofi Hip Hop - Chilledcow");
                      showToast(`🎧 "${res.title}" başlatıldı!`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 shrink-0 cursor-pointer"
                  >
                    🎧 Rahatlatıcı Müzik
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await adminSetVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Rick Astley - Never Gonna Give You Up");
                      showToast(`🕺 "${res.title}" başlatıldı!`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 shrink-0 cursor-pointer"
                  >
                    🕺 Eğlenceli Dans
                  </button>
                </div>
              </div>

              {/* Aktif Oynatılan Video Kartı ve Kontroller */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-pink-500/30 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">
                      Şu Anda Sinemada Canlı Yayınlanan
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {cinemaState.title || "Henüz video başlatılmadı"}
                    </h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      cinemaState.status === "playing"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : cinemaState.video_id
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {cinemaState.status === "playing"
                      ? "▶️ OYNATILIYOR"
                      : cinemaState.video_id
                      ? "⏸️ DURAKLATILDI"
                      : "⚫ EKRAN KAPALI"}
                  </span>
                </div>

                {/* Canlı Video Küçük Önizleme Kartı */}
                {cinemaState.video_id ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <img
                      src={`https://img.youtube.com/vi/${cinemaState.video_id}/mqdefault.jpg`}
                      alt="Aktif Video"
                      className="w-36 h-20 object-cover rounded-lg border border-pink-500/30 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          DEV EKRANDA CANLI
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {cinemaState.video_id}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1 truncate">
                        {cinemaState.title || "YouTube Video"}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Durum: <strong className="text-slate-200">{cinemaState.status === "playing" ? "Oynatılıyor ▶️" : "Duraklatıldı ⏸️"}</strong> • Süre: {Math.floor(cinemaState.seek_time)} sn
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-500">
                    Şu anda ekranda açık olan video yok. Yukarıdan bir YouTube linki yapıştırıp "Yayınla & Başlat" veya "Başlat" butonuna tıklayabilirsiniz.
                  </div>
                )}

                {/* Kontrol Butonları */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      adminSeek(Math.max(0, cinemaState.seek_time - 10), cinemaState.status === "playing");
                      showToast("⏪ 10 saniye geri sarıldı.");
                    }}
                    disabled={!cinemaState.video_id}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Rewind className="size-4" />
                    <span>-10 sn</span>
                  </button>

                  {cinemaState.status === "playing" ? (
                    <button
                      type="button"
                      onClick={() => {
                        adminPlayPause(false, cinemaState.seek_time);
                        showToast("⏸️ Video duraklatıldı.");
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Pause className="size-4 fill-current" />
                      <span>Durdur (Herkes İçin)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (cinemaState.video_id) {
                          adminPlayPause(true, cinemaState.seek_time);
                          showToast("▶️ Video başlatıldı!");
                        } else if (videoUrlInput.trim()) {
                          handleSetVideo();
                        }
                      }}
                      disabled={!cinemaState.video_id && !videoUrlInput.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-display font-extrabold text-sm shadow-md disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
                    >
                      <Play className="size-4 fill-current" />
                      <span>Başlat (Herkes İçin)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      adminSeek(cinemaState.seek_time + 10, cinemaState.status === "playing");
                      showToast("⏩ 10 saniye ileri sarıldı.");
                    }}
                    disabled={!cinemaState.video_id}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <span>+10 sn</span>
                    <FastForward className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      adminSeek(0, cinemaState.status === "playing");
                      showToast("⏮️ Video başa alındı.");
                    }}
                    disabled={!cinemaState.video_id}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <RotateCcw className="size-4" />
                    <span>Başa Al</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Sinema ekranını kapatmak istediğinize emin misiniz?")) {
                        adminStopVideo();
                        showToast("⏹️ Sinema ekranı kapatıldı.");
                      }
                    }}
                    disabled={!cinemaState.video_id}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Square className="size-4 fill-current" />
                    <span>Ekranı Kapat</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
