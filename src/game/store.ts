// Mutable game state shared between the 3D scene (read every frame) and the HUD.
// Per-frame values are plain mutable fields (no React re-render); UI values go
// through a tiny subscribe store.

export type Gender = "male" | "female";
export type ActionState = "none" | "sitting" | "sleeping";

export type ActionPrompt = {
  type: "sit_swing" | "push_swing" | "lie_bed" | "leave" | "kick_ball" | "sit_campfire" | "look_photo" | "sit_cinema";
  label: string;
  targetId: string;
};

export const input = {
  moveX: 0, // -1..1 (joystick / keyboard)
  moveY: 0, // -1..1 forward positive
  jump: false,
  flyUp: false,
  flyDown: false,
  camYaw: 0, // camera orbit angle
  camPitch: 0.35,
  triggerAction: false,
};

export const local = {
  id: "",
  name: "",
  gender: "female" as Gender,
  characterModel: "aden_princess",
  pos: { x: 0, y: 0, z: 8 },
  rotY: 0,
  moving: false,
  dancing: false,
  flying: false,
  actionState: "none" as ActionState,
  targetId: "" as string, // swing-1, bed-1, campfire-1, cinema-seat-1 etc.
  ip: "",
  joinedAt: Date.now(),
};

export async function fetchClientIp(): Promise<string> {
  if (local.ip) return local.ip;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        local.ip = data.ip;
        return data.ip;
      }
    }
  } catch {
    // fallback
  }
  local.ip = "Yerel Bağlantı";
  return local.ip;
}

export type Fx = { key: number; playerId: string; emoji: string; t: number };

export type SocialActionType = "kiss" | "hug" | "handshake";
export type SocialActionState = {
  action: SocialActionType;
  startedAt: number;
  until: number;
  partnerId: string;
  isInitiator: boolean;
};
export const socialActionStates = new Map<string, SocialActionState>();

export function triggerSocialAction(fromId: string, targetId: string, action: SocialActionType) {
  const duration = action === "kiss" ? 4200 : action === "hug" ? 3800 : 2800;
  const now = performance.now();
  const until = now + duration;
  socialActionStates.set(fromId, { action, startedAt: now, until, partnerId: targetId, isInitiator: true });
  socialActionStates.set(targetId, { action, startedAt: now, until, partnerId: fromId, isInitiator: false });

  if (action === "kiss") {
    pushFx(fromId, "💋");
    pushFx(targetId, "💖");
  } else if (action === "hug") {
    pushFx(fromId, "🫂");
    pushFx(targetId, "✨");
  } else if (action === "handshake") {
    pushFx(fromId, "🤝");
    pushFx(targetId, "⭐");
  }
}

export function cancelSocialAction(playerId: string) {
  const current = socialActionStates.get(playerId);
  if (!current) return;
  const partnerId = current.partnerId;
  socialActionStates.delete(playerId);
  if (partnerId) {
    socialActionStates.delete(partnerId);
  }
}

export type ChatBubble = {
  key: number;
  playerId: string;
  text: string;
  t: number;
};

export type SoccerScore = {
  pink: number;
  purple: number;
};

type UIState = {
  nearNote: number | null;
  openNote: number | null;
  readNotes: number[];
  muted: boolean;
  volume: number;
  nearAlbum: boolean;
  albumOpen: boolean;
  albumIndex: number;
  dancing: boolean;
  flying: boolean;
  players: { id: string; name: string; gender: Gender; model?: string; ip?: string; joinedAt?: number }[];
  fx: Fx[];
  chatBubbles: ChatBubble[];
  soccerScore: SoccerScore;
  goalBanner: { text: string; t: number } | null;
  parkourNotice: { text: string; t: number } | null;
  actionPrompt: ActionPrompt | null;
  activeAction: ActionState;
  playersModalOpen: boolean;
  chatOpen: boolean;
  voiceConnected: boolean;
  voiceMicOn: boolean;
  voiceDeafened: boolean;
  voiceNotice: string | null;
  kickedReason: string | null;
  adminModalOpen: boolean;
  cinemaSoundEnabled: boolean;
  cinemaFocusOpen: boolean;
};

let ui: UIState = {
  nearNote: null,
  openNote: null,
  readNotes: [],
  muted: true,
  volume: 0.35,
  nearAlbum: false,
  albumOpen: false,
  albumIndex: 0,
  dancing: false,
  flying: false,
  players: [],
  fx: [],
  chatBubbles: [],
  soccerScore: { pink: 0, purple: 0 },
  goalBanner: null,
  parkourNotice: null,
  actionPrompt: null,
  activeAction: "none",
  playersModalOpen: false,
  chatOpen: false,
  voiceConnected: false,
  voiceMicOn: false,
  voiceDeafened: false,
  voiceNotice: null,
  kickedReason: null,
  adminModalOpen: false,
  cinemaSoundEnabled: true,
  cinemaFocusOpen: false,
};
const subs = new Set<() => void>();

export const uiStore = {
  get: () => ui,
  set: (patch: Partial<UIState>) => {
    ui = { ...ui, ...patch };
    subs.forEach((s) => s());
  },
  subscribe: (fn: () => void) => {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

let fxKey = 0;
export function pushFx(playerId: string, emoji: string) {
  const now = performance.now();
  const fx = uiStore.get().fx.filter((f) => now - f.t < 3500);
  fx.push({ key: ++fxKey, playerId, emoji, t: now });
  uiStore.set({ fx });
}

let chatKey = 0;
export function pushChatBubble(playerId: string, text: string) {
  const now = performance.now();
  const chatBubbles = uiStore.get().chatBubbles.filter((c) => now - c.t < 4800);
  chatBubbles.push({ key: ++chatKey, playerId, text, t: now });
  uiStore.set({ chatBubbles });
}

export function triggerGoal(team: "pink" | "purple") {
  const current = uiStore.get().soccerScore;
  const next = {
    pink: team === "pink" ? current.pink + 1 : current.pink,
    purple: team === "purple" ? current.purple + 1 : current.purple,
  };
  const text = team === "pink" ? "🌸 PEMBE TAKIM GOOOOL ATTI! ⚽💥" : "💜 MOR TAKIM GOOOOL ATTI! ⚽💥";
  uiStore.set({
    soccerScore: next,
    goalBanner: { text, t: performance.now() },
  });
}

export function showParkourNotice(text: string) {
  uiStore.set({ parkourNotice: { text, t: performance.now() } });
}
