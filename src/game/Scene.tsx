import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GltfCharacter } from "./GltfCharacter";
import { World, COLLIDERS, WORLD_RADIUS, ALBUM } from "./World";
import { AlbumWall, WALL_PHOTOS } from "./Album";
import { input, local, uiStore, socialActionStates, type Gender, type ActionPrompt, type ActionState, type SocialActionType } from "./store";
import { remotes } from "./useMultiplayer";
import { Swings, SWING_ITEMS, swingStates, sitOnSwing, pushSwing, leaveSwing } from "./Swings";
import { Houses, HOUSES, ALL_BEDS, lieOnBed, leaveBed, getRoofHeight } from "./Houses";
import { Ball, kickBall, ballState } from "./Ball";
import { Campfire, CAMPFIRE_LOGS, sitOnCampfire, leaveCampfire } from "./Campfire";
import { Parkour, checkParkourCollisions } from "./Parkour";
import { Cinema } from "./Cinema";
import { updateCinema3DTransform } from "./Cinema3DOverlay";
import { CINEMA_SEATS } from "./CinemaSeats";
import { sendCinemaSeatState, sendSocialCancel } from "./useMultiplayer";
import { pushFx } from "./store";

function sitOnCinemaSeat(id: string) {
  const seat = CINEMA_SEATS.find((s) => s.id === id);
  if (!seat) return;
  local.actionState = "sitting";
  local.targetId = id;
  // Koltuk minderi üst yüzeyi seat.y + 0.53, sırtlık önü seat.z - 0.21'dir.
  // SitDown animasyonu kalçayı 0.36m'ye indirip Z ekseninde -0.26m geriye yaslar.
  // Kalçanın tam mindere oturması ve sırtın arkalığa nazikçe yaslanması için:
  local.pos = { x: seat.x, y: seat.y + 0.16, z: seat.z + 0.04 };
  local.rotY = seat.rot;
  input.camYaw = 0;
  input.camPitch = 0.06;
  sendCinemaSeatState(id, "sit");
  uiStore.set({ activeAction: "sitting", actionPrompt: null });
  pushFx(local.id, "🍿");
}

function leaveCinemaSeat(id: string) {
  local.actionState = "none";
  local.targetId = "";
  sendCinemaSeatState(id, "leave");
  uiStore.set({ activeAction: "none" });
}

const SPEED = 5.5;
const GRAVITY = 22;
const JUMP_V = 8.5;

function LocalPlayer() {
  const group = useRef<THREE.Group>(null);
  const movingRef = useRef(false);
  const airRef = useRef(false);
  const danceRef = useRef(false);
  const flyingRef = useRef(false);
  const actionRef = useRef<ActionState>("none");
  const socialActionRef = useRef<SocialActionType>("none");
  const lastKissFx = useRef(0);
  const vy = useRef(0);
  const { camera } = useThree();
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const curCamDist = useRef(7);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const p = local.pos;
    actionRef.current = local.actionState;
    flyingRef.current = local.flying;

    // camera-relative movement
    const yaw = input.camYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = rx * input.moveX + fx * input.moveY;
    let mz = rz * input.moveX + fz * input.moveY;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    const social = socialActionStates.get(local.id);
    const isSocialActive = !!(social && performance.now() < social.until);
    const elapsedSinceStart = social ? (performance.now() - (social.startedAt ?? 0)) : 0;

    // Öpüşürken/sarılırken eylem başladıktan sonra (300ms geçince) geri gidilirse veya joystick oynatılırsa durdur!
    const userWantsToMove = (len > 0.18 || input.jump) && (!isSocialActive || elapsedSinceStart > 300);

    if (isSocialActive && elapsedSinceStart > 300 && (len > 0.18 || input.jump)) {
      sendSocialCancel();
      socialActionRef.current = "none";
    }

    const currentSocialActive = isSocialActive && !userWantsToMove;
    socialActionRef.current = currentSocialActive ? social.action : "none";

    // 1. Uçma Modu Kontrolü
    const isFlying = local.flying && local.actionState === "none";
    const moveSpeed = isFlying ? SPEED * 1.55 : SPEED;

    // Otururken veya yatarken joystick oynatılırsa veya zıplanırsa otomatik kalk/ayrıl
    if ((local.actionState === "sitting" || local.actionState === "sleeping") && (len > 0.25 || input.jump)) {
      if (local.actionState === "sitting") {
        if (local.targetId.startsWith("campfire-")) leaveCampfire(local.targetId);
        else if (local.targetId.startsWith("cinema-seat-")) leaveCinemaSeat(local.targetId);
        else leaveSwing(local.targetId);
      }
      if (local.actionState === "sleeping") leaveBed(local.targetId);
    }

    const moving = len > 0.08 && local.actionState === "none";
    if (moving) {
      p.x += mx * moveSpeed * dt;
      p.z += mz * moveSpeed * dt;
      const target = Math.atan2(mx, mz);
      let diff = target - local.rotY;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      local.rotY += diff * (1 - Math.exp(-14 * dt));
    }

    // Uçma / Zıplama / Yerçekimi / Çatıda Yürüme
    if (local.actionState === "none") {
      const roofY = getRoofHeight(p.x, p.z, p.y);
      const floorY = roofY ?? 0;

      if (isFlying) {
        // Uçarken yerçekimi iptal! Süpermen gibi 3D uçuş (Yukarı, Aşağı, İleri, Geri, Sola, Sağa)
        vy.current = 0;

        // Dikey hareket (Yukarı ve Aşağı)
        let vertDir = 0;
        if (input.flyUp || input.jump) vertDir += 1;
        if (input.flyDown) vertDir -= 1;

        // Kamera açısına göre: İleri itildiğinde kameranın baktığı göğe veya yere doğru uçar
        const camVert = input.moveY * Math.sin(input.camPitch - 0.25) * -1.3;

        const vertSpeed = 9.0; // m/s
        p.y += (vertDir * vertSpeed + camVert * 8.0) * dt;

        // Sınırlar: Min (çatı varsa çatı üstü, yoksa zemin 0.35m), Maksimum 24m (tatlı masalsı uçuş tavanı)
        const minFlyY = Math.max(0.35, floorY + 0.25);
        p.y = THREE.MathUtils.clamp(p.y, minFlyY, 24.0);

        // Sabit dururken hafif havada süzülme
        if (vertDir === 0 && Math.abs(camVert) < 0.05) {
          p.y += Math.sin(raw * 2.8) * 0.06 * dt * 2.0;
        }
      } else {
        // Çarpışma kontrolleri sadece zemin seviyesindeyken geçerlidir (çatıdayken zemin duvar engelleri yok sayılır)
        if (p.y < 3.8) {
          for (const c of COLLIDERS) {
            const dx = p.x - c.x, dz = p.z - c.z;
            const d = Math.hypot(dx, dz);
            const min = c.r + 0.35;
            if (d < min && d > 0.0001) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
          }
        }

        // Zıplama (Çatıda veya yerde zıplayabilir)
        if (input.jump && p.y <= floorY + 0.08) vy.current = JUMP_V;
        input.jump = false;
        vy.current -= GRAVITY * dt;
        p.y += vy.current * dt;

        // Zıp-Zıp Mantar Trambolin ve Parkur Kontrolü
        checkParkourCollisions(p, vy);

        // Çatıda yürüme ve zemine oturma
        if (floorY > 3.8 && p.y < floorY + 0.6 && vy.current <= 0 && !input.jump) {
          // Çatı eğiminde yürürken pürüzsüzce çatı yüzeyine otur
          p.y = floorY;
          vy.current = 0;
        } else if (p.y < floorY) {
          p.y = floorY;
          vy.current = 0;
        }
      }

      const dc = Math.hypot(p.x, p.z);
      if (dc > WORLD_RADIUS) { p.x *= WORLD_RADIUS / dc; p.z *= WORLD_RADIUS / dc; }
    } else {
      vy.current = 0;
      input.jump = false;
    }

    const currentFloor = (getRoofHeight(p.x, p.z, p.y) ?? 0);
    airRef.current = (p.y > currentFloor + 0.12 || isFlying) && local.actionState === "none";
    if (moving || p.y > currentFloor + 0.12) local.dancing = false;
    if (local.dancing !== uiStore.get().dancing) uiStore.set({ dancing: local.dancing });
    danceRef.current = local.dancing;
    movingRef.current = moving;
    local.moving = moving;

    // Sosyal Etkileşim (Öpüşme 💋 / Sarılma 🫂) Sırasında Partnere Yüzünü Dönme ve Yakınlaşma
    if (currentSocialActive && social && social.partnerId) {
      const partner = remotes.get(social.partnerId);
      if (partner) {
        const dx = partner.target.x - p.x;
        const dz = partner.target.z - p.z;
        const dist = Math.hypot(dx, dz);

        // Eğer partner aşırı uzaklaşmışsa (2.6 metreden fazla) veya eylem ilerledikten sonra partner kaçmışsa eylemi bitir
        if (dist > 2.6 || (elapsedSinceStart > 500 && partner.moving && dist > 1.25)) {
          sendSocialCancel();
          socialActionRef.current = "none";
        } else {
          const targetRot = Math.atan2(dx, dz);
          let diff = targetRot - local.rotY;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          local.rotY += diff * (1 - Math.exp(-15 * dt));

          // Yakınlaşma: Öpüşmede (0.64m), Sarılmada (0.52m), Tokalaşmada (0.95m)
          const targetDist = social.action === "handshake" ? 0.95 : social.action === "kiss" ? 0.64 : 0.52;
          if (dist > targetDist && local.actionState === "none") {
            const step = Math.min((dist - targetDist) * 0.8, 3.2 * dt);
            p.x += (dx / dist) * step;
            p.z += (dz / dist) * step;
          }

          // Öpüşürken arada tatlı kalpler fışkırsın 💕
          if (social.action === "kiss") {
            const now = performance.now();
            if (now - lastKissFx.current > 1200) {
              lastKissFx.current = now;
              pushFx(local.id, "💕");
            }
          }
        }
      } else {
        sendSocialCancel();
        socialActionRef.current = "none";
      }
    }

    if (group.current) {
      group.current.position.set(p.x, p.y, p.z);
      group.current.rotation.y = local.rotY;
    }

    // Evin içinde mi kontrolü (Sadece zemin katındayken p.y < 3.8, çatıdayken veya uçarken DEĞİL)
    const currentHouse = HOUSES.find(
      (h) => Math.abs(p.x - h.x) < 7.1 && Math.abs(p.z - h.z) < 4.9 && p.y < 3.8
    );
    const isInsideHouse = !!currentHouse;
    const isSleeping = local.actionState === "sleeping";

    // Yatakta yatarken yan yatağın ve tüm yatak odasının rahatça görünmesi, çatının ASLA görünmemesi için
    const targetCamDist = isSleeping ? 3.5 : isInsideHouse ? 4.0 : 6.0;
    curCamDist.current = THREE.MathUtils.lerp(curCamDist.current, targetCamDist, 1 - Math.exp(-8 * dt));

    const pitch = isSleeping ? 0.20 : isInsideHouse ? Math.min(input.camPitch, 0.22) : input.camPitch;
    const camY = isSleeping ? 1.0 : isInsideHouse ? 0.9 : 1.35;

    const isCinemaSitting = local.actionState === "sitting" && local.targetId.startsWith("cinema-seat-");

    if (isCinemaSitting) {
      // Sinema koltuğunda otururken: Kamera koltuğun arkasında yüksek ve ferah bir açıyla yerleşir.
      // Karakterin başı ekranın altında kalır ve dev sinema ekranını ASLA engellemez!
      // Parmağı veya fareyi sola-sağa, yukarı-aşağı kaydırınca kamerayla sinema salonuna ve ekrana serbestçe bakabilir!
      camTarget.set(p.x, p.y + 2.25, p.z - 4.2);
      camera.position.lerp(camTarget, 1 - Math.exp(-8 * dt));

      const lookDist = 20.0;
      const cinemaLookX = camTarget.x + Math.sin(yaw) * Math.cos(pitch) * lookDist;
      const cinemaLookY = camTarget.y + Math.sin(pitch) * lookDist;
      const cinemaLookZ = camTarget.z + Math.cos(yaw) * Math.cos(pitch) * lookDist;
      camera.lookAt(cinemaLookX, cinemaLookY, cinemaLookZ);
    } else {
      // Yatakta yatarken veya salıncaktayken kameranın titreşmemesi için sabit referans noktası
      let lookX = p.x;
      let lookZ = p.z;
      if (isSleeping && currentHouse) {
        lookX = (p.x + currentHouse.x) * 0.5;
        lookZ = currentHouse.z - 2.8;
      } else if (local.actionState === "sitting" && local.targetId.startsWith("swing-")) {
        const sw = SWING_ITEMS.find((s) => s.id === local.targetId);
        if (sw) {
          lookX = sw.x;
          lookZ = sw.z;
        }
      }

      camTarget.set(
        lookX + Math.sin(yaw) * Math.cos(pitch) * curCamDist.current,
        p.y + camY + Math.sin(pitch) * curCamDist.current,
        lookZ + Math.cos(yaw) * Math.cos(pitch) * curCamDist.current,
      );

      // Evin içindeyken (zemin kattayken) kameranın duvarların dışına veya tavan/çatıya çıkmaması için sınırlandırma
      if (isInsideHouse && currentHouse) {
        camTarget.x = THREE.MathUtils.clamp(camTarget.x, currentHouse.x - 6.2, currentHouse.x + 6.2);
        camTarget.z = THREE.MathUtils.clamp(camTarget.z, currentHouse.z - 4.0, currentHouse.z + 4.0);
        camTarget.y = THREE.MathUtils.clamp(camTarget.y, 0.6, 2.3); // Tavan 4.2m, kamera max 2.3m'de kalır ve çatı asla gözükmez!
      }

      camera.position.lerp(camTarget, 1 - Math.exp(-10 * dt));
      camera.lookAt(lookX, p.y + (isSleeping ? 0.45 : camY), lookZ);
    }

    // Dinamik Etkileşim Algılama (Top, Kamp Ateşi, Salıncak ve 2 Ayrı Yatak)
    // Kalk / İn butonları kaldırıldı! Joystick hareket ettirilince veya zıplayınca otomatik kalkar!
    let nextPrompt: ActionPrompt | null = null;
    if (local.actionState === "none") {
      // 1. Top Kontrolü (Histeresis ile sabit, titremeden algılama)
      const prevIsBall = uiStore.get().actionPrompt?.type === "kick_ball";
      const ballThreshold = prevIsBall ? 3.4 : 2.8;
      const dBall = Math.hypot(p.x - ballState.pos.x, p.z - ballState.pos.z);
      if (dBall < ballThreshold && p.y < 2.2) {
        nextPrompt = { type: "kick_ball", label: "Topa Vur! ⚽", targetId: "ball" };
      }

      // 2. Sahil Kamp Ateşi Kütükleri Kontrolü
      if (!nextPrompt) {
        for (const log of CAMPFIRE_LOGS) {
          const dLog = Math.hypot(p.x - log.x, p.z - log.z);
          if (dLog < 1.7) {
            nextPrompt = { type: "sit_campfire", label: `${log.name}'na Otur 🪵`, targetId: log.id };
            break;
          }
        }
      }

      // 3. Salıncak Kontrolü
      if (!nextPrompt) {
        for (const s of SWING_ITEMS) {
          // Ön oturma bölgesi (+X tarafı, merkeze bakan taraf)
          const dFront = Math.hypot(p.x - (s.x + 1.4), p.z - s.z);
          if (dFront < 1.7) {
            const st = swingStates.get(s.id);
            if (!st?.sitterId) {
              nextPrompt = { type: "sit_swing", label: "Salıncağa Otur 🛋️", targetId: s.id };
              break;
            }
          }
          // Arka sallama bölgesi (-X tarafı, arkadan itme alanı)
          const dBack = Math.hypot(p.x - (s.x - 1.4), p.z - s.z);
          if (dBack < 1.7) {
            const st = swingStates.get(s.id);
            if (st?.sitterId) {
              nextPrompt = { type: "push_swing", label: "Salıncağı Salla! 🫸", targetId: s.id };
              break;
            }
          }
        }
      }

      // 4. Ayrı Yatak Kontrolü (Her evde 2 yatak)
      if (!nextPrompt) {
        for (const bed of ALL_BEDS) {
          const dBed = Math.hypot(p.x - bed.x, p.z - bed.z);
          if (dBed < 1.9) {
            nextPrompt = { type: "lie_bed", label: `${bed.name}'na Uzan 💤`, targetId: bed.id };
            break;
          }
        }
      }

      // 5. Ev Giriş Duvarlarındaki Tablo Fotoğrafları Kontrolü
      if (!nextPrompt) {
        for (const wp of WALL_PHOTOS) {
          const dPhoto = Math.hypot(p.x - wp.position[0], p.z - wp.position[2]);
          if (dPhoto < 3.2 && p.y < 3.0) {
            nextPrompt = { type: "look_photo", label: "Fotoğrafa Bak 📸", targetId: String(wp.photoIndex) };
            break;
          }
        }
      }

      // 6. Açık Hava Sineması Koltukları Kontrolü (10 Adet Koltuk)
      if (!nextPrompt) {
        for (const seat of CINEMA_SEATS) {
          const dSeat = Math.hypot(p.x - seat.x, p.z - seat.z);
          if (dSeat < 1.6 && Math.abs(p.y - seat.y) < 1.0) {
            nextPrompt = { type: "sit_cinema", label: `${seat.name}'a Otur 🍿`, targetId: seat.id };
            break;
          }
        }
      }
    }

    const prevPrompt = uiStore.get().actionPrompt;
    if (prevPrompt?.type !== nextPrompt?.type || prevPrompt?.targetId !== nextPrompt?.targetId) {
      uiStore.set({ actionPrompt: nextPrompt });
    }

    if (input.triggerAction) {
      input.triggerAction = false;
      if (nextPrompt) {
        if (nextPrompt.type === "kick_ball") kickBall();
        else if (nextPrompt.type === "sit_campfire") sitOnCampfire(nextPrompt.targetId);
        else if (nextPrompt.type === "sit_swing") sitOnSwing(nextPrompt.targetId);
        else if (nextPrompt.type === "push_swing") pushSwing(nextPrompt.targetId);
        else if (nextPrompt.type === "sit_cinema") sitOnCinemaSeat(nextPrompt.targetId);
        else if (nextPrompt.type === "lie_bed") lieOnBed(nextPrompt.targetId);
        else if (nextPrompt.type === "look_photo") {
          uiStore.set({ albumOpen: true, albumIndex: Number(nextPrompt.targetId) });
        }
        else if (nextPrompt.type === "leave") {
          if (local.actionState === "sitting") {
            if (local.targetId.startsWith("campfire-")) leaveCampfire(local.targetId);
            else if (local.targetId.startsWith("cinema-seat-")) leaveCinemaSeat(local.targetId);
            else leaveSwing(nextPrompt.targetId);
          }
          if (local.actionState === "sleeping") leaveBed(nextPrompt.targetId);
        }
      }
    }
  });

  return (
    <group ref={group}>
      <GltfCharacter
        modelName={local.characterModel}
        name={local.name || "Aden"}
        movingRef={movingRef}
        airRef={airRef}
        danceRef={danceRef}
        actionRef={actionRef}
        flyingRef={flyingRef}
        isLocal={true}
        playerId={local.id}
        socialActionRef={socialActionRef}
      />
    </group>
  );
}

function RemotePlayer({ id, name, gender, model }: { id: string; name: string; gender: Gender; model: string }) {
  const group = useRef<THREE.Group>(null);
  const movingRef = useRef(false);
  const airRef = useRef(false);
  const danceRef = useRef(false);
  const flyingRef = useRef(false);
  const actionRef = useRef<ActionState>("none");
  const socialActionRef = useRef<SocialActionType>("none");

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = group.current;
    const r = remotes.get(id);
    if (!g || !r) return;
    actionRef.current = r.actionState ?? "none";
    const social = socialActionStates.get(id);
    const remoteElapsed = social ? (performance.now() - (social.startedAt ?? 0)) : 0;
    const isRemoteMovingAway = r.moving && remoteElapsed > 500;
    if (isRemoteMovingAway && socialActionStates.has(id)) {
      cancelSocialAction(id);
    }
    const isRemoteSocial = !!(social && performance.now() < social.until && !isRemoteMovingAway);
    socialActionRef.current = isRemoteSocial ? social.action : "none";
    const k = 1 - Math.exp(-12 * dt);
    g.position.x += (r.target.x - g.position.x) * k;
    g.position.y += (r.target.y - g.position.y) * k;
    g.position.z += (r.target.z - g.position.z) * k;
    // Sosyal Etkileşim Sırasında Remote Oyuncu da Partnerine Döner ve Yaklaşır
    if (isRemoteSocial && social && social.partnerId) {
      let px = 0;
      let pz = 0;
      if (social.partnerId === local.id) {
        px = local.pos.x;
        pz = local.pos.z;
      } else {
        const other = remotes.get(social.partnerId);
        if (other) {
          px = other.target.x;
          pz = other.target.z;
        }
      }
      if (px !== 0 || pz !== 0) {
        const dx = px - g.position.x;
        const dz = pz - g.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2.6) {
          cancelSocialAction(id);
          socialActionRef.current = "none";
        } else {
          const targetRot = Math.atan2(dx, dz);
          let sdiff = targetRot - g.rotation.y;
          sdiff = Math.atan2(Math.sin(sdiff), Math.cos(sdiff));
          g.rotation.y += sdiff * (1 - Math.exp(-15 * dt));

          // Ağ gecikmesine karşı remote oyuncu da temas mesafesine yaklaşır
          const targetDist = social.action === "handshake" ? 0.95 : social.action === "kiss" ? 0.64 : 0.52;
          if (dist > targetDist) {
            const step = Math.min((dist - targetDist) * 0.8, 3.2 * dt);
            g.position.x += (dx / dist) * step;
            g.position.z += (dz / dist) * step;
          }
        }
      }
    } else {
      let diff = r.target.r - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * k;
    }
    movingRef.current = r.moving;
    danceRef.current = r.dancing;
    flyingRef.current = !!r.flying;
    const floorY = getRoofHeight(r.target.x, r.target.z, r.target.y) ?? 0;
    airRef.current = r.target.y > floorY + 0.15 && actionRef.current === "none" && !r.flying;
  });
  return (
    <group ref={group}>
      <GltfCharacter
        modelName={model}
        name={name}
        movingRef={movingRef}
        airRef={airRef}
        danceRef={danceRef}
        actionRef={actionRef}
        flyingRef={flyingRef}
        isLocal={false}
        playerId={id}
        socialActionRef={socialActionRef}
      />
    </group>
  );
}

function RemotePlayers() {
  const players = useSyncExternalStore(uiStore.subscribe, () => uiStore.get().players, () => []);
  return (
    <>
      {players.filter((p) => p.id !== local.id).map((p) => (
        <RemotePlayer
          key={p.id}
          id={p.id}
          name={p.name}
          gender={p.gender}
          model={p.model || (p.gender === "male" ? "never_classic" : "aden_princess")}
        />
      ))}
    </>
  );
}

function Fx() {
  const fx = useSyncExternalStore(uiStore.subscribe, () => uiStore.get().fx, () => []);
  return (
    <>
      {fx.map((f) => (
        <FxSprite key={f.key} playerId={f.playerId} emoji={f.emoji} t0={f.t} />
      ))}
    </>
  );
}

const emojiTexCache = new Map<string, THREE.Texture>();
function emojiTex(e: string) {
  let t = emojiTexCache.get(e);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const g = c.getContext("2d")!;
    g.font = "72px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(e, 48, 54);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    emojiTexCache.set(e, t);
  }
  return t;
}

function FxSprite({ playerId, emoji, t0 }: { playerId: string; emoji: string; t0: number }) {
  const ref = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.SpriteMaterial>(null);
  useFrame(() => {
    const age = (performance.now() - t0) / 3000;
    const s = ref.current;
    if (!s) return;
    const r = playerId === local.id ? local.pos : remotes.get(playerId)?.target;
    if (!r || age > 1) { s.visible = false; return; }
    s.position.set(r.x, r.y + 3.3 + age * 0.8, r.z);
    s.scale.setScalar(0.7 + age * 0.2);
    if (mat.current) mat.current.opacity = age < 0.7 ? 1 : (1 - age) / 0.3;
  });
  return (
    <sprite ref={ref}>
      <spriteMaterial ref={mat} map={emojiTex(emoji)} transparent depthTest={false} />
    </sprite>
  );
}

const chatTexCache = new Map<string, THREE.Texture>();
function createChatBubbleTex(text: string) {
  let t = chatTexCache.get(text);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 160;
    const g = c.getContext("2d")!;

    // Balon Şekli (Yuvarlatılmış köşe + altta küçük sivri kuyruk)
    g.fillStyle = "rgba(255, 255, 255, 0.95)";
    g.strokeStyle = "#ff70a6";
    g.lineWidth = 8;

    // Rounded rect
    const r = 26;
    const x = 14, y = 14, w = 484, h = 106;
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    // Tail
    g.lineTo(x + w / 2 + 20, y + h);
    g.lineTo(x + w / 2, y + h + 30);
    g.lineTo(x + w / 2 - 20, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
    g.fill();
    g.stroke();

    // Metin (Kalın, ortalı)
    g.fillStyle = "#0f172a";
    g.font = "bold 36px 'Segoe UI', Roboto, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";

    const display = text.length > 22 ? text.slice(0, 20) + "..." : text;
    g.fillText(display, 256, 67);

    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    chatTexCache.set(text, t);
  }
  return t;
}

function ChatBubbleSprite({ playerId, text, t0 }: { playerId: string; text: string; t0: number }) {
  const ref = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.SpriteMaterial>(null);

  useFrame(() => {
    const age = (performance.now() - t0) / 4800;
    const s = ref.current;
    if (!s) return;
    const r = playerId === local.id ? local.pos : remotes.get(playerId)?.target;
    if (!r || age > 1) {
      s.visible = false;
      return;
    }
    s.position.set(r.x, r.y + 3.8 + age * 0.4, r.z);
    const pop = Math.min(1, age * 7);
    s.scale.set(3.2 * pop, 1.0 * pop, 1);
    if (mat.current) mat.current.opacity = age < 0.75 ? 1 : (1 - age) / 0.25;
  });

  return (
    <sprite ref={ref}>
      <spriteMaterial ref={mat} map={createChatBubbleTex(text)} transparent depthTest={false} />
    </sprite>
  );
}

function ChatBubbles() {
  const bubbles = useSyncExternalStore(uiStore.subscribe, () => uiStore.get().chatBubbles, () => []);
  return (
    <>
      {bubbles.map((b) => (
        <ChatBubbleSprite key={b.key} playerId={b.playerId} text={b.text} t0={b.t} />
      ))}
    </>
  );
}

// Güneş ve Gökyüzünde Süzülen Beyaz Masalsı Bulutlar
function SkySun() {
  return (
    <group position={[45, 55, -35]}>
      <mesh>
        <sphereGeometry args={[5.5, 16, 16]} />
        <meshBasicMaterial color="#fff4cc" />
      </mesh>
      {/* Güneşin Halesi */}
      <mesh>
        <sphereGeometry args={[7.2, 16, 16]} />
        <meshBasicMaterial color="#ffe58f" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function CinemaTransformSync() {
  useFrame(({ camera, size }) => {
    updateCinema3DTransform(camera, size);
  });
  return null;
}

export function Scene() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor("#6ec1f7");
  }, [gl]);
  return (
    <>
      {/* Güneşli Gündüz Gökyüzü ve Genişletilmiş Berrak Sis (Yüksekten bakınca ada kararmaz) */}
      <color attach="background" args={["#6ec1f7"]} />
      <fog attach="fog" args={["#6ec1f7", 130, 420]} />

      {/* Sıcak ve Canlı Güneş Işıklandırması */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#ffffff", "#62c976", 1.3]} />
      <directionalLight position={[35, 55, 25]} intensity={1.6} color="#fff9e6" />

      <SkySun />
      <World />
      <Swings />
      <Houses />
      <Ball />
      <Campfire />
      <Parkour />
      <AlbumWall />
      <Cinema />
      <CinemaTransformSync />
      <LocalPlayer />
      <RemotePlayers />
      <Fx />
      <ChatBubbles />
    </>
  );
}
