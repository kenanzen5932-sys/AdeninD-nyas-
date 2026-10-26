import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Gender } from "./store";
import { local } from "./store";

const SKIN = "#ffd9c4";

function nameTexture(name: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(120,30,110,0.75)";
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

/** Low-poly chibi character with procedural walk/jump animation. */
export function Character({
  gender,
  name,
  movingRef,
  airRef,
  danceRef,
  actionRef,
}: {
  gender: Gender;
  name: string;
  movingRef: MutableRefObject<boolean>;
  airRef: MutableRefObject<boolean>;
  danceRef: MutableRefObject<boolean>;
  actionRef?: MutableRefObject<"none" | "sitting" | "sleeping">;
}) {
  const root = useRef<THREE.Group>(null);
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const nameTagRef = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => nameTexture(name), [name]);
  const phase = useRef(0);
  const girl = gender === "female";
  const shirt = girl ? "#ff6fae" : "#7b5cff";
  const hair = girl ? "#7a3b2e" : "#3a2418";
  const pants = girl ? "#ffd1e8" : "#3b3f7a";

  useFrame((_, d) => {
    const dt = Math.min(d, 0.05);
    const moving = movingRef.current;
    phase.current += dt * (moving ? 11 : 2);
    const swing = moving ? Math.sin(phase.current) * 0.7 : 0;
    const k = 1 - Math.exp(-15 * dt);
    const air = airRef.current;
    const dance = danceRef.current && !moving && !air;
    const action = actionRef?.current ?? "none";

    if (action === "sitting") {
      const kick = Math.sin(phase.current * 1.6) * 0.08;
      if (root.current) { root.current.position.set(0, 0, 0); root.current.rotation.set(0, 0, 0); }
      // -Math.PI / 2.2 açısı bacakları öne doğru uzatır (yüzün baktığı +Z yönü)
      if (lLeg.current) lLeg.current.rotation.set(-Math.PI / 2.2 + kick, 0.08, 0);
      if (rLeg.current) rLeg.current.rotation.set(-Math.PI / 2.2 + kick, -0.08, 0);
      if (lArm.current) lArm.current.rotation.set(-0.7, 0, 0.25);
      if (rArm.current) rArm.current.rotation.set(-0.7, 0, -0.25);
      if (body.current) { body.current.position.y = -0.26; body.current.rotation.set(0, 0, 0); }
      return;
    }

    if (action === "sleeping") {
      const breath = Math.sin(phase.current * 1.5) * 0.02;
      if (lLeg.current) lLeg.current.rotation.set(0, 0, 0);
      if (rLeg.current) rLeg.current.rotation.set(0, 0, 0);
      if (lArm.current) lArm.current.rotation.set(0, 0, 0.25);
      if (rArm.current) rArm.current.rotation.set(0, 0, -0.25);
      if (body.current) { body.current.position.y = breath; body.current.rotation.set(0, 0, 0); }
      if (root.current) {
        root.current.rotation.set(-Math.PI / 2, 0, 0);
        root.current.position.set(0, 0.25 + breath, -0.4);
      }
      return;
    }

    // Normal ayakta duruş pozisyonuna yumuşak dönüş
    if (root.current) {
      root.current.position.set(0, 0, 0);
      root.current.rotation.x = 0;
      root.current.rotation.z = 0;
    }

    if (dance) {
      phase.current += dt * 6;
      const t = phase.current;
      const beat = Math.sin(t * 2);
      if (lArm.current) lArm.current.rotation.set(0, 0, -2.4 + Math.sin(t * 2) * 0.5);
      if (rArm.current) rArm.current.rotation.set(0, 0, 2.4 + Math.sin(t * 2 + Math.PI) * 0.5);
      if (lLeg.current) lLeg.current.rotation.x = Math.max(0, beat) * 0.6;
      if (rLeg.current) rLeg.current.rotation.x = Math.max(0, -beat) * 0.6;
      if (body.current) { body.current.position.y = Math.abs(beat) * 0.12; body.current.rotation.z = Math.sin(t) * 0.15; }
      if (root.current) root.current.rotation.y += dt * 2.5;
      return;
    }
    if (root.current) root.current.rotation.y *= Math.exp(-10 * dt);
    if (body.current) body.current.rotation.z = 0;
    if (lArm.current) lArm.current.rotation.z = 0;
    if (rArm.current) rArm.current.rotation.z = 0;
    const legT = air ? 0.5 : swing;
    if (lLeg.current) lLeg.current.rotation.x += (legT - lLeg.current.rotation.x) * k;
    if (rLeg.current) rLeg.current.rotation.x += ((air ? -0.3 : -swing) - rLeg.current.rotation.x) * k;
    if (lArm.current) lArm.current.rotation.x += ((air ? -2.6 : -swing) - lArm.current.rotation.x) * k;
    if (rArm.current) rArm.current.rotation.x += ((air ? -2.6 : swing) - rArm.current.rotation.x) * k;
    if (body.current)
      body.current.position.y = moving && !air ? Math.abs(Math.sin(phase.current)) * 0.06 : Math.sin(phase.current) * 0.015;

    if (nameTagRef.current) {
      const isCinemaSitting = local.actionState === "sitting" && local.targetId.startsWith("cinema-seat-");
      nameTagRef.current.visible = !isCinemaSitting;
    }
  });

  return (
    <group>
      {/* blob shadow */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[0.45, 16]} />
        <meshBasicMaterial color="#5a1d5c" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <group ref={root}>
      <group ref={body}>
        {/* legs */}
        <group ref={lLeg} position={[-0.13, 0.5, 0]}>
          <mesh position-y={-0.22}>
            <capsuleGeometry args={[0.09, 0.28, 3, 8]} />
            <meshToonMaterial color={pants} />
          </mesh>
        </group>
        <group ref={rLeg} position={[0.13, 0.5, 0]}>
          <mesh position-y={-0.22}>
            <capsuleGeometry args={[0.09, 0.28, 3, 8]} />
            <meshToonMaterial color={pants} />
          </mesh>
        </group>
        {/* torso / dress */}
        {girl ? (
          <mesh position-y={0.72}>
            <coneGeometry args={[0.38, 0.6, 12]} />
            <meshToonMaterial color={shirt} />
          </mesh>
        ) : (
          <mesh position-y={0.75}>
            <capsuleGeometry args={[0.24, 0.3, 3, 10]} />
            <meshToonMaterial color={shirt} />
          </mesh>
        )}
        {/* arms */}
        <group ref={lArm} position={[-0.3, 0.92, 0]}>
          <mesh position-y={-0.18}>
            <capsuleGeometry args={[0.07, 0.25, 3, 8]} />
            <meshToonMaterial color={SKIN} />
          </mesh>
        </group>
        <group ref={rArm} position={[0.3, 0.92, 0]}>
          <mesh position-y={-0.18}>
            <capsuleGeometry args={[0.07, 0.25, 3, 8]} />
            <meshToonMaterial color={SKIN} />
          </mesh>
        </group>
        {/* head */}
        <mesh position-y={1.32}>
          <sphereGeometry args={[0.36, 16, 12]} />
          <meshToonMaterial color={SKIN} />
        </mesh>
        {/* hair cap */}
        <mesh position={[0, 1.42, -0.03]} scale={[1.05, 0.85, 1.05]}>
          <sphereGeometry args={[0.37, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
          <meshToonMaterial color={hair} />
        </mesh>
        {girl && (
          <>
            <mesh position={[0, 1.1, -0.22]} scale={[1, 1.4, 0.6]}>
              <sphereGeometry args={[0.3, 12, 10]} />
              <meshToonMaterial color={hair} />
            </mesh>
            {/* bow */}
            <mesh position={[0.22, 1.62, 0]} rotation-z={0.4}>
              <torusGeometry args={[0.08, 0.04, 6, 12]} />
              <meshToonMaterial color="#ff3d8b" />
            </mesh>
          </>
        )}
        {/* eyes + blush (face points +z) */}
        <mesh position={[-0.12, 1.33, 0.32]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshBasicMaterial color="#2a1030" />
        </mesh>
        <mesh position={[0.12, 1.33, 0.32]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshBasicMaterial color="#2a1030" />
        </mesh>
        <mesh position={[-0.2, 1.24, 0.29]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color="#ff8fb8" />
        </mesh>
        <mesh position={[0.2, 1.24, 0.29]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color="#ff8fb8" />
        </mesh>
      </group>
      </group>
      <sprite ref={nameTagRef} position-y={2.35} scale={[1.4, 0.35, 1]}>
        <spriteMaterial map={tex} depthTest={false} transparent />
      </sprite>
    </group>
  );
}
