import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { local, uiStore, pushFx, pushChatBubble, triggerGoal, triggerSocialAction, cancelSocialAction, socialActionStates, type Gender, type ActionState, type SocialActionType } from "./store";
import { swingStates } from "./Swings";

export type Remote = {
  id: string;
  name: string;
  gender: Gender;
  model: string;
  target: { x: number; y: number; z: number; r: number };
  moving: boolean;
  dancing: boolean;
  flying?: boolean;
  actionState: ActionState;
  targetId: string;
  last: number;
};

// Read every frame by the scene; never triggers React renders.
export const remotes = new Map<string, Remote>();
let channelRef: ReturnType<typeof supabase.channel> | null = null;

export function sendFx(emoji: string) {
  pushFx(local.id, emoji);
  channelRef?.send({ type: "broadcast", event: "fx", payload: { id: local.id, emoji } });
}

export function sendChatMessage(text: string) {
  pushChatBubble(local.id, text);
  channelRef?.send({ type: "broadcast", event: "chat", payload: { id: local.id, text } });
}

export function sendSoccerGoal(team: "pink" | "purple") {
  triggerGoal(team);
  channelRef?.send({ type: "broadcast", event: "goal", payload: { id: local.id, team } });
}

export function sendSwingPush(id: string, amp: number) {
  channelRef?.send({ type: "broadcast", event: "swing_push", payload: { id, amp, pusherId: local.id } });
}

export function sendSwingState(id: string, action: "sit" | "leave") {
  channelRef?.send({ type: "broadcast", event: "swing_state", payload: { id, action, playerId: local.id } });
}

export function sendBedState(houseId: string, action: "sleep" | "leave") {
  channelRef?.send({ type: "broadcast", event: "bed_state", payload: { houseId, action, playerId: local.id } });
}

export function sendBallKick(payload: { x: number; y: number; z: number; vx: number; vy: number; vz: number }) {
  channelRef?.send({ type: "broadcast", event: "ball_kick", payload });
}

export function sendCinemaSeatState(seatId: string, action: "sit" | "leave") {
  channelRef?.send({
    type: "broadcast",
    event: "cinema_seat_state",
    payload: { seatId, action, playerId: local.id },
  });
}

export function sendSocialAction(targetId: string, action: SocialActionType) {
  channelRef?.send({
    type: "broadcast",
    event: "social_action",
    payload: { fromId: local.id, targetId, action },
  });
  triggerSocialAction(local.id, targetId, action);
}

export function sendSocialCancel() {
  const current = socialActionStates.get(local.id);
  if (!current) return;
  const partnerId = current.partnerId;
  const payload = { playerId: local.id, partnerId };
  channelRef?.send({
    type: "broadcast",
    event: "social_cancel",
    payload,
  });
  setTimeout(() => {
    channelRef?.send({
      type: "broadcast",
      event: "social_cancel",
      payload,
    });
  }, 50);
  cancelSocialAction(local.id);
}

export function kickPlayer(targetId: string, reason?: string) {
  channelRef?.send({
    type: "broadcast",
    event: "kick_player",
    payload: { targetId, reason: reason || "Yönetici tarafından lobiye gönderildiniz. 🛑" },
  });
}

export function useMultiplayer(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const ch = supabase.channel("aden-world", {
      config: { presence: { key: local.id }, broadcast: { self: false } },
    });
    channelRef = ch;

    const syncPlayers = () => {
      const state = ch.presenceState<{ name: string; gender: Gender; model?: string; ip?: string; joinedAt?: number }>();
      const players = Object.entries(state).map(([id, metas]) => ({
        id,
        name: metas[0]?.name ?? "?",
        gender: metas[0]?.gender ?? "female",
        model: metas[0]?.model ?? (metas[0]?.gender === "male" ? "never_classic" : "aden_princess"),
        ip: metas[0]?.ip || "Bilinmiyor",
        joinedAt: metas[0]?.joinedAt || Date.now(),
      }));
      for (const p of players) {
        if (p.id === local.id) continue;
        const r = remotes.get(p.id);
        if (r) {
          r.name = p.name;
          r.gender = p.gender;
          r.model = p.model;
        } else {
          remotes.set(p.id, {
            ...p,
            target: { x: 0, y: 0, z: 8, r: 0 },
            moving: false,
            dancing: false,
            actionState: "none",
            targetId: "",
            last: performance.now(),
          });
        }
      }
      for (const id of [...remotes.keys()]) {
        if (!players.find((p) => p.id === id)) remotes.delete(id);
      }
      uiStore.set({ players });
    };

    let ready = false;
    ch.on("presence", { event: "sync" }, syncPlayers)
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const r = remotes.get(payload.id);
        if (!r) return;
        r.target = { x: payload.x, y: payload.y, z: payload.z, r: payload.r };
        r.moving = payload.m;
        r.dancing = !!payload.d;
        r.flying = !!payload.fly;
        r.actionState = payload.act ?? "none";
        r.targetId = payload.tid ?? "";
        const s = socialActionStates.get(payload.id);
        if (payload.m && s && performance.now() - (s.startedAt ?? 0) > 600) {
          cancelSocialAction(payload.id);
        }
      })
      .on("broadcast", { event: "fx" }, ({ payload }) => pushFx(payload.id, payload.emoji))
      .on("broadcast", { event: "swing_push" }, ({ payload }) => {
        const st = swingStates.get(payload.id);
        if (st) st.amplitude = Math.min(0.85, (payload.amp ?? 0.7));
      })
      .on("broadcast", { event: "swing_state" }, ({ payload }) => {
        const st = swingStates.get(payload.id);
        if (st) st.sitterId = payload.action === "sit" ? payload.playerId : null;
      })
      .on("broadcast", { event: "bed_state" }, ({ payload }) => {
        if (payload.action === "sleep" && payload.playerId) {
          pushFx(payload.playerId, "💤");
        }
      })
      .on("broadcast", { event: "ball_kick" }, ({ payload }) => {
        import("./Ball").then((m) => m.onRemoteBallKick(payload));
      })
      .on("broadcast", { event: "cinema_seat_state" }, ({ payload }) => {
        import("./CinemaSeats").then((m) => m.onRemoteCinemaSeat(payload.seatId, payload.action, payload.playerId));
      })
      .on("broadcast", { event: "cinema_sync" }, ({ payload }) => {
        if (payload) {
          import("./cinemaSync").then((m) => m.setCinemaStateDirectly(payload));
        }
      })
      .on("broadcast", { event: "kick_player" }, ({ payload }) => {
        if (payload.targetId === local.id || payload.targetId === "all") {
          uiStore.set({ kickedReason: payload.reason || "Yönetici tarafından lobiye gönderildiniz. 🛑" });
        }
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        pushChatBubble(payload.id, payload.text);
      })
      .on("broadcast", { event: "goal" }, ({ payload }) => {
        triggerGoal(payload.team);
        pushFx(payload.id, "⚽");
      })
      .on("broadcast", { event: "social_action" }, ({ payload }) => {
        if (payload?.fromId && payload?.targetId && payload?.action) {
          triggerSocialAction(payload.fromId, payload.targetId, payload.action);
        }
      })
      .on("broadcast", { event: "social_cancel" }, ({ payload }) => {
        if (payload?.playerId) cancelSocialAction(payload.playerId);
        if (payload?.partnerId) cancelSocialAction(payload.partnerId);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ready = true;
          // Oyuncuyu sıfır gecikmeyle anında presence'a kaydet
          void ch.track({
            name: local.name || "Aden",
            gender: local.gender,
            model: local.characterModel,
            ip: local.ip || "Alınıyor...",
            joinedAt: local.joinedAt || Date.now(),
          });

          // Gerçek IP adresini arka planda asenkron alıp presence'ı güncelle
          import("./store").then(({ fetchClientIp }) => {
            fetchClientIp().then((ip) => {
              if (ready && ip) {
                void ch.track({
                  name: local.name || "Aden",
                  gender: local.gender,
                  model: local.characterModel,
                  ip,
                  joinedAt: local.joinedAt || Date.now(),
                });
              }
            }).catch(() => {});
          });
        }
      });

    // ~10Hz position updates, only when something changed
    let lastSent = "";
    let idle = 0;
    const iv = window.setInterval(() => {
      if (!ready) return;
      const p = local.pos;
      const msg = {
        id: local.id,
        x: +p.x.toFixed(2),
        y: +p.y.toFixed(2),
        z: +p.z.toFixed(2),
        r: +local.rotY.toFixed(2),
        m: local.moving,
        d: local.dancing,
        fly: local.flying,
        act: local.actionState,
        tid: local.targetId,
      };
      const key = JSON.stringify(msg);
      idle++;
      if (key !== lastSent || idle > 20) {
        lastSent = key;
        idle = 0;
        ch.send({ type: "broadcast", event: "pos", payload: msg });
      }
    }, 100);

    return () => {
      clearInterval(iv);
      remotes.clear();
      channelRef = null;
      void supabase.removeChannel(ch);
    };
  }, [active]);
}
