import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ActionState } from "./store";
import { local, input, socialActionStates } from "./store";
import { remotes } from "./useMultiplayer";
import { swingStates } from "./Swings";
import { getCharacterOption, type CharacterOption } from "./characterCatalog";

export type SocialAction = "none" | "kiss" | "hug" | "handshake";

function nameTexture(name: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(120,30,110,0.85)";
  g.beginPath();
  g.roundRect(4, 8, 248, 48, 24);
  g.fill();
  g.fillStyle = "#fff";
  g.font = "bold 30px Fredoka, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(name.slice(0, 14), 128, 33);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface ProceduralCharacterProps {
  modelName?: string;
  name: string;
  movingRef?: MutableRefObject<boolean>;
  airRef?: MutableRefObject<boolean>;
  danceRef?: MutableRefObject<boolean>;
  actionRef?: MutableRefObject<ActionState>;
  flyingRef?: MutableRefObject<boolean>;
  socialActionRef?: MutableRefObject<SocialAction>;
  isLocal?: boolean;
  playerId?: string;
  isPreview?: boolean;
}

export function ProceduralCharacter({
  modelName,
  name,
  movingRef,
  airRef,
  danceRef,
  actionRef,
  flyingRef,
  socialActionRef,
  isLocal = false,
  playerId,
  isPreview = false,
}: ProceduralCharacterProps) {
  const char: CharacterOption = useMemo(() => getCharacterOption(modelName), [modelName]);

  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);
  const lLegRef = useRef<THREE.Group>(null);
  const rLegRef = useRef<THREE.Group>(null);
  const lKneeRef = useRef<THREE.Group>(null);
  const rKneeRef = useRef<THREE.Group>(null);
  const lArmRef = useRef<THREE.Group>(null);
  const rArmRef = useRef<THREE.Group>(null);
  const lForearmRef = useRef<THREE.Group>(null);
  const rForearmRef = useRef<THREE.Group>(null);
  const nameTagRef = useRef<THREE.Sprite>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  const phaseRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const nameTex = useMemo(() => nameTexture(name || char.name), [name, char.name]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const moving = isPreview ? false : (movingRef?.current ?? false);
    const air = isPreview ? false : (airRef?.current ?? false);
    const dance = isPreview ? false : ((danceRef?.current ?? false) && !moving && !air);
    const action = isPreview ? "none" : (actionRef?.current ?? "none");
    const isFlying = isPreview ? false : (flyingRef?.current ?? (isLocal ? local.flying : false));
    const rawSocial = isPreview ? "none" : (socialActionRef?.current ?? "none");
    // Karakter uyurken, otururken veya uçarken sosyal eylem gösterilmez
    const socialAction = (air || isFlying || action !== "none") ? "none" : rawSocial;

    const myId = playerId || (isLocal ? local.id : null);
    const socialInfo = myId ? socialActionStates.get(myId) : null;
    const isInitiator = socialInfo ? socialInfo.isInitiator : true;
    const isRomanceLead = char.gender === "female" || (isInitiator && char.gender !== "male");

    phaseRef.current += dt * (moving ? 10.5 : 2.2);
    const p = phaseRef.current;
    // Yürürken animasyon pozunun derhal normale dönmesi için dinamik lerp katsayısı
    const k = moving ? (1 - Math.exp(-28 * dt)) : (1 - Math.exp(-15 * dt));

    // 1. Göz Kırpma (Blinking) Animasyonu
    blinkTimerRef.current += dt;
    if (eyesRef.current) {
      if (socialAction === "kiss" || socialAction === "hug" || action === "sleeping") {
        // Öpüşürken, sarılırken ve uyurken gözler tatlı şekilde kapalı kalır
        eyesRef.current.scale.y = 0.08;
      } else {
        // Her 3.6 saniyede bir doğal göz kırpma (150ms)
        const cycle = blinkTimerRef.current % 3.6;
        if (cycle > 3.45) {
          eyesRef.current.scale.y = 0.1;
        } else {
          eyesRef.current.scale.y = 1.0;
        }
      }
    }

    // Hedef Pozisyon ve Rotasyonlar (Her animasyon durumu bu hedefleri belirler, frame sonunda pürüzsüzce lerp edilir)
    let rootPosY = 0;
    let rootRotX = 0;
    let rootRotY = 0;
    let rootRotZ = 0;

    let bodyPosX = 0;
    let bodyPosY = 0;
    let bodyPosZ = 0;
    let bodyRotX = 0;
    let bodyRotY = 0;
    let bodyRotZ = 0;

    let headRotX = 0;
    let headRotY = 0;
    let headRotZ = 0;

    let lLegRotX = 0;
    let lLegRotY = 0;
    let lLegRotZ = 0;
    let lKneeRotX = 0.04;

    let rLegRotX = 0;
    let rLegRotY = 0;
    let rLegRotZ = 0;
    let rKneeRotX = 0.04;

    let lArmRotX = 0;
    let lArmRotY = 0;
    let lArmRotZ = 0.12;
    let lForearmRotX = -0.16;
    let lForearmRotY = 0;
    let lForearmRotZ = 0;

    let rArmRotX = 0;
    let rArmRotY = 0;
    let rArmRotZ = -0.12;
    let rForearmRotX = -0.16;
    let rForearmRotY = 0;
    let rForearmRotZ = 0;

    // A. Yatakta Uyku (Sleeping)
    if (action === "sleeping") {
      const breath = Math.sin(p * 1.5) * 0.02;
      rootPosY = 0.22 + breath;
      rootRotX = -Math.PI / 2;
      bodyPosY = breath;
      lArmRotZ = 0.25;
      rArmRotZ = -0.25;
      lKneeRotX = 0.1;
      rKneeRotX = 0.1;
    }
    // B. Salıncakta veya Sinema Koltuğunda Oturma (Sitting)
    else if (action === "sitting") {
      const sw = isLocal && local.targetId ? swingStates.get(local.targetId) : null;
      const kick = sw ? Math.sin(p * 1.6) * 0.12 : 0;
      if (sw) rootRotZ = -sw.angle;

      bodyPosY = -0.22;
      // Uyluklar öne doğru 90° (koltuğa oturma)
      lLegRotX = -Math.PI / 2.05 + kick;
      rLegRotX = -Math.PI / 2.05 + kick;
      lLegRotY = 0.04;
      rLegRotY = -0.04;
      // DİZLER KOLTUK KENARINDAN AŞAĞI 90° BÜKÜLÜR (Alt bacaklar doğal sarkar)
      lKneeRotX = Math.PI / 2.1;
      rKneeRotX = Math.PI / 2.1;
      // Kollar kucağa dinlenir
      lArmRotX = -0.55;
      rArmRotX = -0.55;
      lForearmRotX = -0.65;
      rForearmRotX = -0.65;
    }
    // C. Uçma (Flying / Superhero)
    else if (isFlying) {
      const bank = isLocal ? -input.moveX * 0.35 : 0;
      rootPosY = 0.45;
      rootRotX = Math.PI / 2.3;
      rootRotZ = bank;
      lLegRotX = 0.15;
      rLegRotX = 0.15;
      lKneeRotX = 0.12;
      rKneeRotX = 0.12;
      lArmRotX = -2.8;
      rArmRotX = -2.8;
      lForearmRotX = 0;
      rForearmRotX = 0;
      headRotX = -0.3;
    }
    // D. Gerçek Romantik Öpüşme Animasyonu (💋 Real Passionate Kiss)
    else if (socialAction === "kiss") {
      const kissSway = Math.sin(p * 2.5) * 0.008;
      bodyPosZ = 0.02 + kissSway; // Dudaklar tam öpüşme temasında, kafalar asla birbirinin içine girmez
      bodyRotX = 0.08;

      // Dudak dudağa uyumlu romantik kilitlenme (Biri sağa, diğeri sola 20° eğilir; burunlar çarpışmaz, dudaklar kenetlenir)
      const headSide = isRomanceLead ? 0.32 : -0.32;
      headRotX = 0.12;
      headRotY = headSide * 0.75;
      headRotZ = headSide;

      if (isRomanceLead) {
        // Romantik Başrol (Kız veya İnisiyatif alan):
        // Sağ el partnerin yanağını ve çenesini şefkatle okşar
        rArmRotX = -1.45;
        rArmRotY = -0.22;
        rArmRotZ = -0.18;
        rForearmRotX = -0.80;
        rForearmRotY = 0.42;
        rForearmRotZ = 0.18;

        // Sol el partnerin göğsünde / yakasında dinlenir
        lArmRotX = -1.10;
        lArmRotY = 0.18;
        lArmRotZ = 0.14;
        lForearmRotX = -0.68;
        lForearmRotY = -0.32;
        lForearmRotZ = 0.10;

        // Romantik anime ayak kıvrımı (DİZ GERİYE 85° BÜKÜLÜR, ayak havaya kalkar!)
        rLegRotX = 0.16;
        rKneeRotX = 1.48;
        lLegRotX = -0.04;
        lKneeRotX = 0.04;
      } else {
        // Partner Rolü (Erkek veya Karşı taraf): İki eliyle partnerin belini sıkıca ve nazikçe kavrar!
        // Sol kol partnerin belini tutar
        lArmRotX = -0.55;
        lArmRotY = 0.35;
        lArmRotZ = 0.28;
        lForearmRotX = -0.42;
        lForearmRotY = -0.65;
        lForearmRotZ = 0.12;

        // Sağ kol partnerin belini tutar
        rArmRotX = -0.55;
        rArmRotY = -0.35;
        rArmRotZ = -0.28;
        rForearmRotX = -0.42;
        rForearmRotY = 0.65;
        rForearmRotZ = -0.12;

        lLegRotX = -0.04;
        rLegRotX = -0.04;
        lKneeRotX = 0.04;
        rKneeRotX = 0.04;
      }
    }
    // E. Gerçek Sımsıkı Sarılma Animasyonu (🫂 Real Tight Embrace)
    else if (socialAction === "hug") {
      const hugPulse = Math.sin(p * 2.2) * 0.012;
      bodyPosZ = 0.04 + hugPulse;
      bodyRotX = 0.06;
      bodyRotZ = Math.sin(p * 2.0) * 0.04; // Huzurlu sağa sola hafif süzülme

      // BAŞLAR ASLA DUDAK DUDAĞA DEĞİL! Başlar 60° zıt yönlere çevrilip partnerin omzuna gömülür (omuzdan arkaya bakar)
      const shoulderSide = isRomanceLead ? 1.05 : -1.05;
      headRotX = 0.18;
      headRotY = shoulderSide;
      headRotZ = shoulderSide * 0.35;

      // KOLLAR SIRTA VE KÜREK KEMİKLERİNE KENETLENİR: İki kol da omuz ve sırttan arkaya sımsıkı dolanır
      rArmRotX = -1.38;
      rArmRotY = -0.45;
      rArmRotZ = -0.32;
      rForearmRotX = 0.15;
      rForearmRotY = 1.55;
      rForearmRotZ = -0.25;

      lArmRotX = -1.38;
      lArmRotY = 0.45;
      lArmRotZ = 0.32;
      lForearmRotX = -0.15;
      lForearmRotY = -1.55;
      lForearmRotZ = 0.25;

      // İki ayak da sağlam yerde
      lLegRotX = -0.04;
      lLegRotY = 0.03;
      lKneeRotX = 0.06;
      rLegRotX = -0.04;
      rLegRotY = -0.03;
      rKneeRotX = 0.06;
    }
    // F. Tokalaşma (🤝 Handshake)
    else if (socialAction === "handshake") {
      const pump = Math.sin(p * 5.0) * 0.22;
      rArmRotX = -1.25;
      rArmRotY = -0.15;
      rForearmRotX = -0.55 + pump;
      bodyPosZ = 0.04;
    }
    // G. Zafer / Dans Animasyonu (💃 Dance)
    else if (dance) {
      const beat = Math.sin(p * 3.5);
      lArmRotZ = -2.3 + beat * 0.35;
      rArmRotZ = 2.3 - beat * 0.35;
      lForearmRotX = -0.35 + beat * 0.25;
      rForearmRotX = -0.35 - beat * 0.25;
      lLegRotX = Math.max(0, beat) * 0.55;
      rLegRotX = Math.max(0, -beat) * 0.55;
      lKneeRotX = Math.max(0, beat) * 0.75;
      rKneeRotX = Math.max(0, -beat) * 0.75;
      bodyPosY = Math.abs(beat) * 0.12;
      bodyRotZ = Math.sin(p * 2) * 0.15;
      headRotZ = Math.sin(p * 3.5) * 0.1;
      rootRotY = dt * 2.8;
    }
    // H. Normal Yürüme / Koşma / Sakin Duruş (Idle / Walk with Knee Bending!)
    else {
      // Gövde nefes alış veya adım adım zıplama
      bodyPosY = moving && !air ? Math.abs(Math.sin(p)) * 0.055 : Math.sin(p) * 0.015;

      const swing = moving ? Math.sin(p) * 0.65 : 0;

      // Kalçalar (Uyluklar) ileri-geri sallanır
      lLegRotX = air ? 0.35 : swing;
      rLegRotX = air ? -0.15 : -swing;

      // DİZLER: Bacak arkaya savrulurken (swing < 0) diz geriye bükülür ve ayağı pürüzsüzce kaldırır!
      // Bacak öne basarken diz düzelir ve yere basar!
      lKneeRotX = air ? 0.5 : moving ? Math.max(0, -swing * 1.35) : 0.04;
      rKneeRotX = air ? 0.35 : moving ? Math.max(0, swing * 1.35) : 0.04;

      // Kollar bacaklarla zıt ritimde sallanır
      lArmRotX = air ? -2.6 : -swing * 0.8;
      rArmRotX = air ? -2.6 : swing * 0.8;

      // Dirsekler doğal hafif bükülü kalır
      const elbowBend = moving ? -0.42 - Math.max(0, -swing) * 0.3 : -0.16;
      lForearmRotX = air ? -0.2 : elbowBend;
      rForearmRotX = air ? -0.2 : elbowBend;
    }

    if (shadowRef.current) {
      shadowRef.current.visible = !isFlying;
    }

    // FRAME SONU: TÜM EKLEMLER VE UZUVLAR HEDEFLERİNE PÜRÜZSÜZCE LERP EDİLİR
    if (rootRef.current) {
      if (dance) {
        rootRef.current.rotation.y += rootRotY;
      } else {
        rootRef.current.rotation.y *= Math.exp(-10 * dt);
      }
      rootRef.current.position.y += (rootPosY - rootRef.current.position.y) * k;
      rootRef.current.rotation.x += (rootRotX - rootRef.current.rotation.x) * k;
      rootRef.current.rotation.z += (rootRotZ - rootRef.current.rotation.z) * k;
    }

    if (bodyRef.current) {
      bodyRef.current.position.x += (bodyPosX - bodyRef.current.position.x) * k;
      bodyRef.current.position.y += (bodyPosY - bodyRef.current.position.y) * k;
      bodyRef.current.position.z += (bodyPosZ - bodyRef.current.position.z) * k;
      bodyRef.current.rotation.x += (bodyRotX - bodyRef.current.rotation.x) * k;
      bodyRef.current.rotation.y += (bodyRotY - bodyRef.current.rotation.y) * k;
      bodyRef.current.rotation.z += (bodyRotZ - bodyRef.current.rotation.z) * k;
    }

    if (headRef.current) {
      headRef.current.rotation.x += (headRotX - headRef.current.rotation.x) * k;
      headRef.current.rotation.y += (headRotY - headRef.current.rotation.y) * k;
      headRef.current.rotation.z += (headRotZ - headRef.current.rotation.z) * k;
    }

    if (lLegRef.current) {
      lLegRef.current.rotation.x += (lLegRotX - lLegRef.current.rotation.x) * k;
      lLegRef.current.rotation.y += (lLegRotY - lLegRef.current.rotation.y) * k;
      lLegRef.current.rotation.z += (lLegRotZ - lLegRef.current.rotation.z) * k;
    }
    if (lKneeRef.current) {
      lKneeRef.current.rotation.x += (lKneeRotX - lKneeRef.current.rotation.x) * k;
      lKneeRef.current.rotation.y += (0 - lKneeRef.current.rotation.y) * k;
      lKneeRef.current.rotation.z += (0 - lKneeRef.current.rotation.z) * k;
    }

    if (rLegRef.current) {
      rLegRef.current.rotation.x += (rLegRotX - rLegRef.current.rotation.x) * k;
      rLegRef.current.rotation.y += (rLegRotY - rLegRef.current.rotation.y) * k;
      rLegRef.current.rotation.z += (rLegRotZ - rLegRef.current.rotation.z) * k;
    }
    if (rKneeRef.current) {
      rKneeRef.current.rotation.x += (rKneeRotX - rKneeRef.current.rotation.x) * k;
      rKneeRef.current.rotation.y += (0 - rKneeRef.current.rotation.y) * k;
      rKneeRef.current.rotation.z += (0 - rKneeRef.current.rotation.z) * k;
    }

    if (lArmRef.current) {
      lArmRef.current.rotation.x += (lArmRotX - lArmRef.current.rotation.x) * k;
      lArmRef.current.rotation.y += (lArmRotY - lArmRef.current.rotation.y) * k;
      lArmRef.current.rotation.z += (lArmRotZ - lArmRef.current.rotation.z) * k;
    }
    if (lForearmRef.current) {
      lForearmRef.current.rotation.x += (lForearmRotX - lForearmRef.current.rotation.x) * k;
      lForearmRef.current.rotation.y += (lForearmRotY - lForearmRef.current.rotation.y) * k;
      lForearmRef.current.rotation.z += (lForearmRotZ - lForearmRef.current.rotation.z) * k;
    }

    if (rArmRef.current) {
      rArmRef.current.rotation.x += (rArmRotX - rArmRef.current.rotation.x) * k;
      rArmRef.current.rotation.y += (rArmRotY - rArmRef.current.rotation.y) * k;
      rArmRef.current.rotation.z += (rArmRotZ - rArmRef.current.rotation.z) * k;
    }
    if (rForearmRef.current) {
      rForearmRef.current.rotation.x += (rForearmRotX - rForearmRef.current.rotation.x) * k;
      rForearmRef.current.rotation.y += (rForearmRotY - rForearmRef.current.rotation.y) * k;
      rForearmRef.current.rotation.z += (rForearmRotZ - rForearmRef.current.rotation.z) * k;
    }

    // Sinema Koltuğunda İsim Gizleme Kontrolü
    if (nameTagRef.current) {
      const isLocalCinemaSitting = local.actionState === "sitting" && local.targetId.startsWith("cinema-seat-");
      const isThisPlayerCinemaSitting = isLocal
        ? isLocalCinemaSitting
        : (action === "sitting" && (playerId ? remotes.get(playerId)?.targetId?.startsWith("cinema-seat-") : false));

      nameTagRef.current.visible = !isPreview && !(isLocalCinemaSitting || isThisPlayerCinemaSitting);
    }
  });

  return (
    <group>
      {/* 1. Zemin Yumuşak Masalsı Gölge */}
      <mesh ref={shadowRef} rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#4a154b" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      {/* 2. Karakter Ana İskelet Grubu */}
      <group ref={rootRef}>
        {/* Sol Bacak (Kalça Mafsalı) */}
        <group ref={lLegRef} position={[-0.12, 0.46, 0]}>
          {/* Üst Bacak (Uyluk) */}
          <mesh position-y={-0.10}>
            <capsuleGeometry args={[0.055, 0.12, 4, 8]} />
            <meshToonMaterial color={char.secondaryColor} />
          </mesh>
          {/* Diz Mafsalı (Alt Bacak / Baldır) */}
          <group ref={lKneeRef} position={[0, -0.20, 0]}>
            <mesh position-y={-0.09}>
              <capsuleGeometry args={[0.050, 0.11, 4, 8]} />
              <meshToonMaterial color={char.secondaryColor} />
            </mesh>
            {/* Ayakkabı */}
            <group position={[0, -0.19, 0.04]}>
              <mesh position-y={0.02}>
                <boxGeometry args={[0.09, 0.065, 0.17]} />
                <meshToonMaterial color={char.shoeColor} />
              </mesh>
              <mesh position-y={-0.022}>
                <boxGeometry args={[0.095, 0.025, 0.18]} />
                <meshToonMaterial color="#ffffff" />
              </mesh>
            </group>
          </group>
        </group>

        {/* Sağ Bacak (Kalça Mafsalı) */}
        <group ref={rLegRef} position={[0.12, 0.46, 0]}>
          {/* Üst Bacak (Uyluk) */}
          <mesh position-y={-0.10}>
            <capsuleGeometry args={[0.055, 0.12, 4, 8]} />
            <meshToonMaterial color={char.secondaryColor} />
          </mesh>
          {/* Diz Mafsalı (Alt Bacak / Baldır) */}
          <group ref={rKneeRef} position={[0, -0.20, 0]}>
            <mesh position-y={-0.09}>
              <capsuleGeometry args={[0.050, 0.11, 4, 8]} />
              <meshToonMaterial color={char.secondaryColor} />
            </mesh>
            {/* Ayakkabı */}
            <group position={[0, -0.19, 0.04]}>
              <mesh position-y={0.02}>
                <boxGeometry args={[0.09, 0.065, 0.17]} />
                <meshToonMaterial color={char.shoeColor} />
              </mesh>
              <mesh position-y={-0.022}>
                <boxGeometry args={[0.095, 0.025, 0.18]} />
                <meshToonMaterial color="#ffffff" />
              </mesh>
            </group>
          </group>
        </group>

        {/* Gövde ve Üst Beden */}
        <group ref={bodyRef}>
          {/* Kıyafet Modeli (Elbise, Ceket, Yelek, Kazak veya Tişört) */}
          {char.outfitStyle === "princess_dress" ? (
            <group position-y={0.72}>
              {/* Üst Korse */}
              <mesh position-y={0.06}>
                <capsuleGeometry args={[0.22, 0.25, 4, 10]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              {/* Fırfırlı Pembe Masal Prensesi Eteği */}
              <mesh position-y={-0.12} rotation-x={Math.PI}>
                <coneGeometry args={[0.42, 0.46, 16]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              {/* Alt Beyaz Dantel Kenarı */}
              <mesh position-y={-0.34} rotation-x={Math.PI}>
                <torusGeometry args={[0.38, 0.03, 6, 16]} />
                <meshToonMaterial color={char.secondaryColor} />
              </mesh>
            </group>
          ) : char.outfitStyle === "neko_sweater" ? (
            <group position-y={0.74}>
              {/* Pelüş Leylak Kazak */}
              <mesh position-y={0.06}>
                <capsuleGeometry args={[0.24, 0.3, 4, 10]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              {/* Pileli Mini Etek */}
              <mesh position-y={-0.12} rotation-x={Math.PI}>
                <coneGeometry args={[0.34, 0.32, 16]} />
                <meshToonMaterial color={char.secondaryColor} />
              </mesh>
              {/* Sevimli Kedi Kuyruğu (Arka) */}
              <mesh position={[0, -0.15, -0.25]} rotation-x={0.6}>
                <cylinderGeometry args={[0.035, 0.04, 0.32, 8]} />
                <meshToonMaterial color={char.accentColor} />
              </mesh>
            </group>
          ) : char.outfitStyle === "street_jacket" ? (
            <group position-y={0.74}>
              {/* Kolej Ceketi */}
              <mesh position-y={0.06}>
                <capsuleGeometry args={[0.25, 0.3, 4, 10]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              {/* Beyaz Tenis Eteği */}
              <mesh position-y={-0.12} rotation-x={Math.PI}>
                <coneGeometry args={[0.34, 0.3, 16]} />
                <meshToonMaterial color={char.secondaryColor} />
              </mesh>
            </group>
          ) : char.outfitStyle === "witch_robe" ? (
            <group position-y={0.72}>
              {/* Büyücü Cübbesi */}
              <mesh position-y={0.06}>
                <capsuleGeometry args={[0.23, 0.28, 4, 10]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              <mesh position-y={-0.12} rotation-x={Math.PI}>
                <coneGeometry args={[0.4, 0.48, 16]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              {/* Pembe Uçuşan Peri Pelerini (Arka) */}
              <mesh position={[0, -0.05, -0.22]} rotation-x={-0.15}>
                <boxGeometry args={[0.38, 0.52, 0.03]} />
                <meshToonMaterial color={char.secondaryColor} />
              </mesh>
            </group>
          ) : char.outfitStyle === "royal_vest" ? (
            <group position-y={0.75}>
              {/* Beyaz Prens Gömleği & Asil Yelek */}
              <mesh position-y={0}>
                <capsuleGeometry args={[0.24, 0.3, 4, 10]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              {/* Altın Sarısı Düğmeler */}
              <mesh position={[0, 0.08, 0.22]}>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshToonMaterial color={char.accentColor} />
              </mesh>
              <mesh position={[0, -0.04, 0.22]}>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshToonMaterial color={char.accentColor} />
              </mesh>
            </group>
          ) : (
            /* Standart Şık Tişört / Hoodie / Spor Ceket / Cyber */
            <mesh position-y={0.75}>
              <capsuleGeometry args={[0.24, 0.3, 4, 10]} />
              <meshToonMaterial color={char.primaryColor} />
            </mesh>
          )}

          {/* Sol Kol (Omuz Mafsalı) */}
          <group ref={lArmRef} position={[-0.28, 0.88, 0]}>
            {/* Üst Kol */}
            <mesh position-y={-0.09}>
              <capsuleGeometry args={[0.062, 0.14, 4, 8]} />
              <meshToonMaterial color={char.primaryColor} />
            </mesh>
            {/* Ön Kol (Dirsek Mafsalı) & El */}
            <group ref={lForearmRef} position={[0, -0.18, 0]}>
              <mesh position-y={-0.08}>
                <capsuleGeometry args={[0.055, 0.12, 4, 8]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              <mesh position-y={-0.17}>
                <sphereGeometry args={[0.058, 8, 8]} />
                <meshToonMaterial color={char.skinColor} />
              </mesh>
            </group>
          </group>

          {/* Sağ Kol (Omuz Mafsalı) */}
          <group ref={rArmRef} position={[0.28, 0.88, 0]}>
            {/* Üst Kol */}
            <mesh position-y={-0.09}>
              <capsuleGeometry args={[0.062, 0.14, 4, 8]} />
              <meshToonMaterial color={char.primaryColor} />
            </mesh>
            {/* Ön Kol (Dirsek Mafsalı) & El */}
            <group ref={rForearmRef} position={[0, -0.18, 0]}>
              <mesh position-y={-0.08}>
                <capsuleGeometry args={[0.055, 0.12, 4, 8]} />
                <meshToonMaterial color={char.primaryColor} />
              </mesh>
              <mesh position-y={-0.17}>
                <sphereGeometry args={[0.058, 8, 8]} />
                <meshToonMaterial color={char.skinColor} />
              </mesh>
            </group>
          </group>

          {/* Kafa Grubu */}
          <group ref={headRef} position={[0, 1.34, 0]}>
            {/* Kafa Küresi (Yumuşak tatlı chibi anime oranı) */}
            <mesh scale={[1.05, 0.98, 1.02]}>
              <sphereGeometry args={[0.34, 20, 16]} />
              <meshToonMaterial color={char.skinColor} />
            </mesh>

            {/* Saç Tabanı (Kafayı saran ana saç kütlesi) */}
            <mesh position={[0, 0.08, -0.04]} scale={[1.08, 0.95, 1.08]}>
              <sphereGeometry args={[0.35, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.85]} />
              <meshToonMaterial color={char.hairColor} />
            </mesh>

            {/* Gözler ve İfadeler Grubu (Blink ölçeklemesi buraya uygulanır) */}
            <group ref={eyesRef}>
              {/* Sol Anime Gözü */}
              <mesh position={[-0.12, 0.01, 0.31]}>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshBasicMaterial color={char.eyeColor} />
              </mesh>
              {/* Sol Göz Parıltısı (Anime Sparkle) */}
              <mesh position={[-0.105, 0.025, 0.34]}>
                <sphereGeometry args={[0.014, 6, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>

              {/* Sağ Anime Gözü */}
              <mesh position={[0.12, 0.01, 0.31]}>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshBasicMaterial color={char.eyeColor} />
              </mesh>
              {/* Sağ Göz Parıltısı (Anime Sparkle) */}
              <mesh position={[0.135, 0.025, 0.34]}>
                <sphereGeometry args={[0.014, 6, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>

            {/* Tatlı Gülümseyen Dudak */}
            <mesh position={[0, -0.08, 0.33]} rotation-z={Math.PI}>
              <torusGeometry args={[0.03, 0.009, 4, 8, Math.PI]} />
              <meshBasicMaterial color="#be185d" />
            </mesh>

            {/* Sevimli Yanak Allıkları (Kız karakterlerde pembe ışıltı) */}
            {char.gender === "female" && (
              <>
                <mesh position={[-0.19, -0.07, 0.27]}>
                  <sphereGeometry args={[0.048, 8, 6]} />
                  <meshBasicMaterial color={char.blushColor} transparent opacity={0.65} />
                </mesh>
                <mesh position={[0.19, -0.07, 0.27]}>
                  <sphereGeometry args={[0.048, 8, 6]} />
                  <meshBasicMaterial color={char.blushColor} transparent opacity={0.65} />
                </mesh>
              </>
            )}

            {/* --- ÖZEL KARAKTER SAÇ & AKSESUAR PARÇALARI --- */}

            {/* 1. Aden Masal Prensesi: Büyük tatlı kurdele ve arkada lüleler */}
            {char.hairStyle === "princess_bow" && (
              <>
                {/* Arka Uzun Saç Kütlesi */}
                <mesh position={[0, -0.18, -0.22]} scale={[1.0, 1.4, 0.65]}>
                  <sphereGeometry args={[0.28, 12, 10]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
                {/* Baş Üstündeki Büyük Tatlı Fiyonk Kurdele */}
                <group position={[0.18, 0.32, -0.02]} rotation-z={0.35}>
                  <mesh position={[-0.08, 0, 0]} rotation-y={-0.3}>
                    <coneGeometry args={[0.09, 0.16, 8]} />
                    <meshToonMaterial color={char.accentColor} />
                  </mesh>
                  <mesh position={[0.08, 0, 0]} rotation-y={0.3}>
                    <coneGeometry args={[0.09, 0.16, 8]} />
                    <meshToonMaterial color={char.accentColor} />
                  </mesh>
                  <mesh position={[0, 0, 0.02]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshToonMaterial color="#f472b6" />
                  </mesh>
                </group>
              </>
            )}

            {/* 2. Kedi Kız: 3D Sevimli Kedi Kulakları */}
            {char.hairStyle === "cat_ears" && (
              <group position-y={0.32}>
                {/* Sol Kedi Kulağı */}
                <mesh position={[-0.2, 0, 0.05]} rotation-z={0.35}>
                  <coneGeometry args={[0.09, 0.2, 6]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
                <mesh position={[-0.2, 0, 0.08]} rotation-z={0.35} scale={[0.7, 0.7, 0.5]}>
                  <coneGeometry args={[0.08, 0.18, 6]} />
                  <meshToonMaterial color={char.accentColor} />
                </mesh>
                {/* Sağ Kedi Kulağı */}
                <mesh position={[0.2, 0, 0.05]} rotation-z={-0.35}>
                  <coneGeometry args={[0.09, 0.2, 6]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
                <mesh position={[0.2, 0, 0.08]} rotation-z={-0.35} scale={[0.7, 0.7, 0.5]}>
                  <coneGeometry args={[0.08, 0.18, 6]} />
                  <meshToonMaterial color={char.accentColor} />
                </mesh>
              </group>
            )}

            {/* 3. Pastel Gezgin: Çift Örgü Saçlar ve Papatya Tokalar */}
            {char.hairStyle === "pastel_braids" && (
              <>
                <mesh position={[-0.28, -0.22, -0.05]}>
                  <cylinderGeometry args={[0.05, 0.035, 0.42, 8]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
                <mesh position={[-0.26, -0.05, 0.05]}>
                  <sphereGeometry args={[0.04, 6, 6]} />
                  <meshToonMaterial color="#fde047" />
                </mesh>
                <mesh position={[0.28, -0.22, -0.05]}>
                  <cylinderGeometry args={[0.05, 0.035, 0.42, 8]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
                <mesh position={[0.26, -0.05, 0.05]}>
                  <sphereGeometry args={[0.04, 6, 6]} />
                  <meshToonMaterial color="#fde047" />
                </mesh>
              </>
            )}

            {/* 4. Sokak Modası: Saç Bandı ve DJ Kulaklıkları */}
            {char.hairStyle === "street_headband" && (
              <>
                {/* Alındaki Pembe Saç Bandı */}
                <mesh position={[0, 0.15, 0.04]} rotation-x={-0.2}>
                  <torusGeometry args={[0.34, 0.03, 6, 16]} />
                  <meshToonMaterial color={char.primaryColor} />
                </mesh>
                {/* Boyundaki Mor DJ Kulaklığı */}
                <group position={[0, -0.32, 0]}>
                  <mesh rotation-z={Math.PI / 2}>
                    <torusGeometry args={[0.28, 0.025, 6, 16]} />
                    <meshToonMaterial color="#1e1b4b" />
                  </mesh>
                  <mesh position={[-0.26, 0.02, 0]}>
                    <cylinderGeometry args={[0.065, 0.065, 0.08, 8]} />
                    <meshToonMaterial color={char.accentColor} />
                  </mesh>
                  <mesh position={[0.26, 0.02, 0]}>
                    <cylinderGeometry args={[0.065, 0.065, 0.08, 8]} />
                    <meshToonMaterial color={char.accentColor} />
                  </mesh>
                </group>
              </>
            )}

            {/* 5. Akademi Büyücüsü: Yıldızlı Sivri Sihirbaz Şapkası */}
            {char.hairStyle === "witch_hat" && (
              <group position={[0, 0.32, -0.05]} rotation-x={-0.15}>
                {/* Şapka Kenarı (Geniş Çember) */}
                <mesh rotation-x={Math.PI / 2}>
                  <cylinderGeometry args={[0.55, 0.55, 0.03, 16]} />
                  <meshToonMaterial color={char.primaryColor} />
                </mesh>
                {/* Şapka Sivri Tepesi */}
                <mesh position={[0, 0.28, 0]}>
                  <coneGeometry args={[0.28, 0.55, 12]} />
                  <meshToonMaterial color={char.primaryColor} />
                </mesh>
                {/* Parlayan Altın Yıldız Broşu */}
                <mesh position={[0, 0.15, 0.28]}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshToonMaterial color={char.accentColor} />
                </mesh>
              </group>
            )}

            {/* 6. Never Klasik: Havalı Katmanlı Anime Saç Tutamları */}
            {char.hairStyle === "anime_messy" && (
              <group position-y={0.25}>
                <mesh position={[-0.14, 0.08, 0.15]} rotation-z={-0.4}>
                  <coneGeometry args={[0.07, 0.22, 6]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
                <mesh position={[0.14, 0.08, 0.15]} rotation-z={0.4}>
                  <coneGeometry args={[0.07, 0.22, 6]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
                <mesh position={[0, 0.12, 0.1]} rotation-x={-0.2}>
                  <coneGeometry args={[0.08, 0.25, 6]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
              </group>
            )}

            {/* 7. Sokak Dansçısı: Ters Cap Şapka */}
            {char.hairStyle === "hoodie_cap" && (
              <group position={[0, 0.22, -0.04]}>
                <mesh scale={[1.08, 0.65, 1.08]}>
                  <sphereGeometry args={[0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshToonMaterial color={char.accentColor} />
                </mesh>
                {/* Arkaya Bakan Düz Siperlik */}
                <mesh position={[0, -0.02, -0.32]} rotation-x={0.1}>
                  <boxGeometry args={[0.26, 0.025, 0.18]} />
                  <meshToonMaterial color={char.accentColor} />
                </mesh>
              </group>
            )}

            {/* 8. Zarif Prens: Asil Taranmış Saç ve Fular */}
            {char.hairStyle === "slick_prince" && (
              <group position={[0, 0.28, 0.05]}>
                <mesh position={[0.08, 0, 0.05]} rotation-z={-0.2} scale={[1.2, 0.6, 1.0]}>
                  <sphereGeometry args={[0.22, 10, 8]} />
                  <meshToonMaterial color={char.hairColor} />
                </mesh>
              </group>
            )}

            {/* 9. Sportif Atlet: Alında Spor Kafa Bandı */}
            {char.hairStyle === "sport_band" && (
              <mesh position={[0, 0.12, 0.06]} rotation-x={-0.15}>
                <torusGeometry args={[0.34, 0.035, 6, 16]} />
                <meshToonMaterial color={char.accentColor} />
              </mesh>
            )}

            {/* 10. Cyber Gamer: Fütüristik Neon Vizör / Güneş Gözlüğü */}
            {char.hairStyle === "cyber_spiky" && (
              <group>
                {/* Platin Sivri Saçlar */}
                <group position-y={0.28}>
                  <mesh position={[-0.15, 0.05, 0.1]} rotation-z={-0.35}>
                    <coneGeometry args={[0.07, 0.24, 6]} />
                    <meshToonMaterial color={char.hairColor} />
                  </mesh>
                  <mesh position={[0.15, 0.05, 0.1]} rotation-z={0.35}>
                    <coneGeometry args={[0.07, 0.24, 6]} />
                    <meshToonMaterial color={char.hairColor} />
                  </mesh>
                  <mesh position={[0, 0.12, 0.05]}>
                    <coneGeometry args={[0.08, 0.28, 6]} />
                    <meshToonMaterial color={char.hairColor} />
                  </mesh>
                </group>
                {/* Parlayan Neon Vizör Gözlük */}
                <mesh position={[0, 0.02, 0.32]}>
                  <boxGeometry args={[0.36, 0.08, 0.04]} />
                  <meshBasicMaterial color={char.accentColor} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>

      {/* 3. Oyuncu İsim Plakası (2.38m yükseklikte, her zaman kameraya bakar, sinemada gizlenir) */}
      {!isPreview && (
        <sprite ref={nameTagRef} position-y={2.38} scale={[1.45, 0.36, 1]}>
          <spriteMaterial map={nameTex} transparent depthTest={false} />
        </sprite>
      )}
    </group>
  );
}
