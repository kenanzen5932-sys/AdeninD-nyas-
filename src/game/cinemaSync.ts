import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CinemaState = {
  id: string;
  video_id: string;
  title: string;
  status: "playing" | "paused";
  seek_time: number;
  updated_at: string;
};

export const defaultCinemaState: CinemaState = {
  id: "main",
  video_id: "",
  title: "",
  status: "paused",
  seek_time: 0,
  updated_at: new Date().toISOString(),
};

let currentCinemaState: CinemaState = { ...defaultCinemaState };
const cinemaListeners = new Set<(state: CinemaState) => void>();
let isInitialized = false;
let cinemaChannelRef: ReturnType<typeof supabase.channel> | null = null;
let pollIntervalId: any = null;

export function getCinemaState(): CinemaState {
  return currentCinemaState;
}

function setLocalCinemaState(next: CinemaState) {
  const changed =
    next.video_id !== currentCinemaState.video_id ||
    next.status !== currentCinemaState.status ||
    next.title !== currentCinemaState.title;

  currentCinemaState = { ...next };
  cinemaListeners.forEach((fn) => {
    try {
      fn(currentCinemaState);
    } catch {}
  });

  if (changed) {
    console.log(
      `%c🍿 [Sinema Durum Güncellendi]: Video="${next.title || 'Boş'}" (${next.video_id || 'KAPALI'}) | Durum=${next.status} | Saniye=${next.seek_time}`,
      "background: #831843; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: bold;"
    );
  }
}

export function setCinemaStateDirectly(next: CinemaState) {
  console.log(`%c⚡ [Sinema Realtime Alındı]: ID=${next.video_id || "KAPALI"} | Durum=${next.status}`, "color: #10b981; font-weight: bold;");
  setLocalCinemaState(next);
}

function broadcastCinema(next: CinemaState) {
  console.log(`%c📡 [Sinema Broadcast Gönderiliyor]: ${next.video_id || "KAPALI"} (${next.status})`, "color: #a855f7; font-weight: bold;");

  // 1. Dedicated cinema channel broadcast (if subscribed)
  if (cinemaChannelRef) {
    try {
      cinemaChannelRef.send({
        type: "broadcast",
        event: "cinema_sync",
        payload: next,
      }).catch(() => {});
    } catch {}
  }

  // 2. Main world channel broadcast (redundant delivery)
  try {
    const ch = supabase.getChannels().find((c) => c.topic === "realtime:aden-world");
    if (ch) {
      ch.send({
        type: "broadcast",
        event: "cinema_sync",
        payload: next,
      }).catch(() => {});
    }
  } catch {}
}

/**
 * YouTube linkinden video ID'sini (11 karakter) hatasız ve tüm formatlardan ayrıştırır.
 * Desteklenen formatlar:
 * - https://www.youtube.com/watch?v=XXXX
 * - https://youtu.be/XXXX
 * - https://m.youtube.com/watch?v=XXXX
 * - https://www.youtube.com/shorts/XXXX
 * - https://www.youtube.com/live/XXXX
 * - https://www.youtube.com/embed/XXXX
 * - Ham 11 karakterlik ID
 */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes("youtu.be")) {
      const firstSegment = url.pathname.slice(1).split("/")[0];
      const id = firstSegment ? firstSegment.split("?")[0] : null;
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      for (let i = 0; i < parts.length; i++) {
        const seg = parts[i];
        const nextSeg = parts[i + 1];
        if (seg && ["shorts", "embed", "live", "v"].includes(seg) && nextSeg) {
          const id = nextSeg.split("?")[0];
          if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
        }
      }
    }
  } catch {}

  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/i
  );
  return match && match[1] ? match[1] : null;
}

/**
 * YouTube oEmbed API'sinden video başlığını maksimum 2 saniye zaman aşımı ile çeker.
 * Hızlı ve asla donmaz.
 */
export async function fetchYoutubeTitle(videoId: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data?.title) return data.title;
    }
  } catch {
    /* sessizce fallback */
  }
  return `YouTube Video (${videoId})`;
}

/**
 * Veritabanından mevcut durumu çeker ve yerel duruma uygular.
 */
async function fetchDbState() {
  try {
    const { data, error } = await (supabase as any)
      .from("cinema_state")
      .select("*")
      .eq("id", "main")
      .maybeSingle();

    if (error) {
      console.warn("⚠️ [Sinema DB Hatası]:", error.message || error);
      return;
    }

    if (data) {
      const next: CinemaState = {
        id: String(data.id ?? "main"),
        video_id: String(data.video_id ?? ""),
        title: String(data.title ?? ""),
        status: (data.status as "playing" | "paused") || "paused",
        seek_time: Number(data.seek_time) || 0,
        updated_at: String(data.updated_at ?? new Date().toISOString()),
      };

      // Değişiklik varsa güncelle
      if (
        next.video_id !== currentCinemaState.video_id ||
        next.status !== currentCinemaState.status ||
        Math.abs(next.seek_time - currentCinemaState.seek_time) > 2 ||
        next.title !== currentCinemaState.title
      ) {
        setLocalCinemaState(next);
      }
    }
  } catch (err) {
    console.warn("⚠️ [Sinema İstek Hatası]:", err);
  }
}

/**
 * Sinema senkronizasyonunu otomatik başlatan güvenli tekil (singleton) motor.
 * Hem WebSocket broadcast'i hem de 1.5 saniyelik DB yoklama (polling) emniyetini yönetir.
 */
export function ensureCinemaSync(): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;

  console.log("%c🎬 [Sinema Sync] Motoru başlatıldı. Realtime kanal ve veritabanı dinleniyor...", "color: #ec4899; font-weight: bold; font-size: 13px;");

  // 1. Veritabanından hemen çek
  void fetchDbState();

  // 2. 1.5 saniyelik aralıklarla DB yoklama başlat (fail-safe)
  if (!pollIntervalId) {
    pollIntervalId = setInterval(() => {
      void fetchDbState();
    }, 1500);
  }

  // 3. Realtime WebSocket kanalına abone ol
  const ch = supabase.channel("cinema-sync-channel", {
    config: { broadcast: { self: true } },
  });
  cinemaChannelRef = ch;

  ch.on("broadcast", { event: "cinema_sync" }, ({ payload }) => {
    if (payload && typeof payload === "object" && "video_id" in payload) {
      console.log(`%c⚡ [Sinema WebSocket Broadcast Geldi]: ${payload.video_id} (${payload.status})`, "color: #10b981; font-weight: bold;");
      setLocalCinemaState(payload as CinemaState);
    }
  }).subscribe();

  return () => {
    // Bileşen unmount olsa bile tekil bağlantı korunabilir veya durdurulabilir
  };
}

export function initCinemaSync(): () => void {
  return ensureCinemaSync();
}

/**
 * React hook: Sinema durumunu anlık dinler ve otomatik senkronize eder.
 */
export function useCinemaSync(): CinemaState {
  const [state, setState] = useState<CinemaState>(() => getCinemaState());

  useEffect(() => {
    ensureCinemaSync();
    const listener = (next: CinemaState) => setState({ ...next });
    cinemaListeners.add(listener);
    setState({ ...currentCinemaState });
    return () => {
      cinemaListeners.delete(listener);
    };
  }, []);

  return state;
}

// -------------------------------------------------------------
// ADMİN KONTROL FONKSİYONLARI (Veritabanına yazar ve anında broadcast eder)
// -------------------------------------------------------------

export async function adminSetVideo(urlOrId: string, customTitle?: string) {
  ensureCinemaSync();
  const videoId = extractYoutubeId(urlOrId);
  if (!videoId) throw new Error("Geçersiz YouTube linki veya Video ID!");

  console.log(`%c🎬 [Admin] YouTube Videosu Ayarlanıyor: ID=${videoId}`, "color: #06b6d4; font-weight: bold;");

  const title = customTitle || (await fetchYoutubeTitle(videoId));
  const next: CinemaState = {
    id: "main",
    video_id: videoId,
    title,
    status: "playing",
    seek_time: 0,
    updated_at: new Date().toISOString(),
  };

  setLocalCinemaState(next);

  // Veritabanına kaydet
  const res = await (supabase as any).from("cinema_state").upsert({
    id: "main",
    video_id: next.video_id,
    title: next.title,
    status: next.status,
    seek_time: next.seek_time,
    updated_at: next.updated_at,
  });

  if (res.error) {
    console.error("❌ [Admin DB Yazma Hatası]:", res.error);
  } else {
    console.log("✅ [Admin DB Yazma Başarılı]:", next.title);
  }

  // Hızlı tepki için realtime broadcast gönder
  broadcastCinema(next);

  return next;
}

export async function adminPlayPause(isPlaying: boolean, currentTime: number) {
  ensureCinemaSync();
  const current = getCinemaState();
  if (!current.video_id) return;

  console.log(`%c🎬 [Admin Play/Pause]: ${isPlaying ? "BAŞLAT" : "DURDUR"} (saniye: ${currentTime})`, "color: #06b6d4; font-weight: bold;");

  const next: CinemaState = {
    ...current,
    status: isPlaying ? "playing" : "paused",
    seek_time: Math.max(0, currentTime),
    updated_at: new Date().toISOString(),
  };

  setLocalCinemaState(next);

  await (supabase as any).from("cinema_state").upsert({
    id: "main",
    video_id: next.video_id,
    title: next.title,
    status: next.status,
    seek_time: next.seek_time,
    updated_at: next.updated_at,
  });

  broadcastCinema(next);
}

export async function adminSeek(newTimeSeconds: number, currentlyPlaying: boolean) {
  ensureCinemaSync();
  const current = getCinemaState();
  if (!current.video_id) return;

  console.log(`%c🎬 [Admin Seek]: ${newTimeSeconds}s`, "color: #06b6d4; font-weight: bold;");

  const next: CinemaState = {
    ...current,
    status: currentlyPlaying ? "playing" : "paused",
    seek_time: Math.max(0, newTimeSeconds),
    updated_at: new Date().toISOString(),
  };

  setLocalCinemaState(next);

  await (supabase as any).from("cinema_state").upsert({
    id: "main",
    video_id: next.video_id,
    title: next.title,
    status: next.status,
    seek_time: next.seek_time,
    updated_at: next.updated_at,
  });

  broadcastCinema(next);
}

export async function adminStopVideo() {
  ensureCinemaSync();
  console.log("%c🎬 [Admin]: Sinema ekranı kapatıldı.", "color: #ef4444; font-weight: bold;");

  const next: CinemaState = {
    id: "main",
    video_id: "",
    title: "",
    status: "paused",
    seek_time: 0,
    updated_at: new Date().toISOString(),
  };

  setLocalCinemaState(next);

  await (supabase as any).from("cinema_state").upsert({
    id: "main",
    video_id: "",
    title: "",
    status: "paused",
    seek_time: 0,
    updated_at: next.updated_at,
  });

  broadcastCinema(next);
}
