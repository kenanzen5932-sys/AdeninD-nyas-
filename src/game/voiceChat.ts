import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type RemoteTrack,
  type RemoteParticipant,
  type LocalAudioTrack,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { local, uiStore } from "./store";
import { requestFullScreenSafely } from "./fullscreen";

let currentRoom: Room | null = null;
let localAudioTrack: LocalAudioTrack | null = null;
const attachedAudioElements = new Set<HTMLAudioElement>();
let connectingPromise: Promise<boolean> | null = null;

export async function connectVoiceChat(): Promise<boolean> {
  if (currentRoom && currentRoom.state === "connected") return true;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      // Supabase Edge Function'dan token ve url iste
      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: {
          roomName: "aden-world-voice",
          participantName: local.name || "Aden",
          participantIdentity: local.id || `aden-${Date.now()}`,
        },
      });

      if (error || !data?.token || !data?.url) {
        const errMsg = data?.error || error?.message || "LiveKit secret bilgileri eksik";
        console.warn("[VoiceChat] LiveKit bağlanamadı:", errMsg);
        uiStore.set({
          voiceConnected: false,
          voiceNotice: "LiveKit Secret'ları Supabase'e eklenince sesli sohbet anında aktifleşir! 🎙️",
        });
        setTimeout(() => uiStore.set({ voiceNotice: null }), 4500);
        return false;
      }

      const room = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      currentRoom = room;

      // Diğer oyuncuların ses parçaları gelince otomatik oynat
      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, _pub, _participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLAudioElement;
            el.muted = uiStore.get().voiceDeafened;
            attachedAudioElements.add(el);
          }
        }
      );

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        const detached = track.detach();
        detached.forEach((el) => {
          if (el instanceof HTMLAudioElement) {
            attachedAudioElements.delete(el);
          }
        });
      });

      room.on(RoomEvent.Disconnected, () => {
        uiStore.set({ voiceConnected: false, voiceMicOn: false });
        if (localAudioTrack) {
          localAudioTrack.stop();
          localAudioTrack = null;
        }
        currentRoom = null;
      });

      // Odaya bağlan (Kullanıcı ilk girişte sadece dinleyicidir, mikrofon izni henüz istenmez)
      await room.connect(data.url, data.token);

      uiStore.set({
        voiceConnected: true,
        voiceMicOn: false,
      });

      console.log("[VoiceChat] LiveKit odasına başarıyla bağlanıldı!");
      return true;
    } catch (err: any) {
      console.warn("[VoiceChat] Bağlantı hatası:", err);
      uiStore.set({
        voiceConnected: false,
        voiceNotice: `Sesli sohbet bağlantı hatası: ${err.message || "Bilinmiyor"}`,
      });
      setTimeout(() => uiStore.set({ voiceNotice: null }), 4500);
      return false;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

// Mikrofon açma / kapatma
export async function toggleMicrophone() {
  // 1. Tarayıcıda mikrofon desteği kontrolü (Güvenli bağlantı HTTPS veya localhost gerekir)
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    uiStore.set({
      voiceMicOn: false,
      voiceNotice:
        "Tarayıcınız bu bağlantıda mikrofona izin vermiyor. Lütfen HTTPS veya localhost üzerinden girin! 🔒",
    });
    setTimeout(() => uiStore.set({ voiceNotice: null }), 5000);
    return;
  }

  const current = uiStore.get().voiceMicOn;
  const target = !current;

  // 2. Eğer henüz LiveKit odasına bağlı değilse önce bağlan
  if (!currentRoom || currentRoom.state !== "connected") {
    const ok = await connectVoiceChat();
    if (!ok) return;
  }

  if (!currentRoom) return;

  try {
    if (target) {
      // Mikrofonu AÇ: Eğer daha önce ses parçası oluşturulmadıysa oluştur ve odaya yayınla
      if (!localAudioTrack) {
        // Bu çağrı doğrudan getUserMedia'yı tetikler ve tarayıcının mikrofon izin penceresini açar!
        localAudioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        await currentRoom.localParticipant.publishTrack(localAudioTrack as any);
        // Mikrofon izni verildikten sonra sesi yayınla
      } else {
        await localAudioTrack.unmute();
      }

      uiStore.set({ voiceMicOn: true });
    } else {
      // Mikrofonu KAPAT (Mute)
      if (localAudioTrack) {
        await localAudioTrack.mute();
      }
      uiStore.set({ voiceMicOn: false });
    }
  } catch (err: any) {
    console.error("[VoiceChat] Mikrofon izin/yayın hatası:", err);
    let msg = "Mikrofon açılamadı!";
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      msg = "Mikrofon izni reddedildi. Lütfen tarayıcı adres çubuğundaki kilit simgesinden izin verin! 🎙️";
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      msg = "Cihazınızda mikrofon bulunamadı! 🎙️❌";
    } else if (err.message) {
      msg = `Mikrofon hatası: ${err.message}`;
    }

    uiStore.set({
      voiceMicOn: false,
      voiceNotice: msg,
    });
    setTimeout(() => uiStore.set({ voiceNotice: null }), 5000);
  } finally {
    // İzin penceresi kapandığında tam ekranı tekrar tetikle
    requestFullScreenSafely();
  }
}

// Kulaklık (Gelen Sesleri Aç / Kapat)
export function toggleDeafen() {
  const current = uiStore.get().voiceDeafened;
  const target = !current;

  uiStore.set({ voiceDeafened: target });

  // Mevcut tüm oyuncu seslerini sessize al veya aç
  attachedAudioElements.forEach((el) => {
    el.muted = target;
  });
}

export function disconnectVoiceChat() {
  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack = null;
  }
  if (currentRoom) {
    currentRoom.disconnect();
    currentRoom = null;
  }
  attachedAudioElements.clear();
  uiStore.set({ voiceConnected: false, voiceMicOn: false });
}
