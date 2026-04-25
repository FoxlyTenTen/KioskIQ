'use client';

import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, ContactShadows, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { KioskData } from './types';
import { calculateAlertStatus, getWorstStatus, getStatusHexColor } from './inventoryUtils';
import { ItemShape3D } from './ItemShape3D';

// ─── Constants ────────────────────────────────────────────────────────────────
const SPEED = 0.07;
const BOUNDS = 10.5;
const PROX_IN = 2.9;
const PROX_OUT = 4.0;
const ISO = 1 / Math.sqrt(2);

const MOVE_DIRS: Record<string, [number, number]> = {
  w:          [-ISO, -ISO],
  arrowup:    [-ISO, -ISO],
  s:          [ ISO,  ISO],
  arrowdown:  [ ISO,  ISO],
  a:          [-ISO,  ISO],
  arrowleft:  [-ISO,  ISO],
  d:          [ ISO, -ISO],
  arrowright: [ ISO, -ISO],
};


const STATUS_DOT: Record<string, string> = {
  normal: '#22c55e',
  low: '#eab308',
  expiring_soon: '#f97316',
  expired: '#ef4444',
};

// ─── Floor ────────────────────────────────────────────────────────────────────
function StoreTile() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f3f1ee';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#eae8e5';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);
    ctx.strokeStyle = '#d6d4d0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 63, 63);
    ctx.strokeRect(64.5, 0.5, 63, 63);
    ctx.strokeRect(0.5, 64.5, 63, 63);
    ctx.strokeRect(64.5, 64.5, 63, 63);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 14);
    return t;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[28, 28]} />
      <meshLambertMaterial map={texture} />
    </mesh>
  );
}

// ─── Store environment ────────────────────────────────────────────────────────
function StoreEnvironment() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 1.8, -13.5]} receiveShadow>
        <boxGeometry args={[28, 4.5, 0.22]} />
        <meshLambertMaterial color="#f0ede8" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-13.5, 1.8, 0]} receiveShadow>
        <boxGeometry args={[0.22, 4.5, 28]} />
        <meshLambertMaterial color="#ece9e4" />
      </mesh>
      {/* Skirting boards */}
      <mesh position={[0, 0.11, -13.4]}>
        <boxGeometry args={[27, 0.22, 0.18]} />
        <meshLambertMaterial color="#d2cec8" />
      </mesh>
      <mesh position={[-13.4, 0.11, 0]}>
        <boxGeometry args={[0.18, 0.22, 27]} />
        <meshLambertMaterial color="#d2cec8" />
      </mesh>
      {/* Ceiling strip lights */}
      {([-5, 0, 5] as number[]).map(x =>
        ([-4, 0, 4] as number[]).map(z => (
          <group key={`${x}-${z}`} position={[x, 3.4, z]}>
            <mesh>
              <boxGeometry args={[2.8, 0.07, 0.28]} />
              <meshStandardMaterial color="#fffef0" emissive="#fffef0" emissiveIntensity={0.9} />
            </mesh>
            <pointLight intensity={0.8} color="#fff8e6" distance={8} decay={2} />
          </group>
        ))
      )}
    </group>
  );
}


// ─── Rack label (HTML overlay via drei Html) ──────────────────────────────────
function RackLabel({ rack, items, isNearby }: { rack: any; items: any[]; isNearby: boolean }) {
  const statuses = items.map(calculateAlertStatus);
  const worst = getWorstStatus(statuses);
  const dot = STATUS_DOT[worst] ?? '#22c55e';

  if (!isNearby) {
    return (
      <div style={{
        background: 'rgba(8,8,20,0.88)',
        border: `1.5px solid ${dot}`,
        borderRadius: 8,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: '#f0f0f0',
        fontFamily: 'system-ui,sans-serif',
        boxShadow: `0 0 10px ${dot}55`,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        {rack.rack_name}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(8,8,20,0.96)',
      border: `2px solid ${dot}`,
      borderRadius: 14,
      padding: '9px 13px',
      minWidth: 170,
      pointerEvents: 'none',
      fontFamily: 'system-ui,sans-serif',
      boxShadow: `0 0 24px ${dot}80, 0 8px 32px rgba(0,0,0,0.6)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{rack.rack_name}</span>
      </div>
      {items.slice(0, 5).map((item: any) => {
        const st = calculateAlertStatus(item);
        const sc = STATUS_DOT[st] ?? '#22c55e';
        return (
          <div key={item.item_id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span style={{ color: '#d0d0e0', fontSize: 11, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {item.item_name}
            </span>
            <span style={{ color: sc, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {item.current_stock} {item.unit}
            </span>
          </div>
        );
      })}
      {items.length > 5 && (
        <div style={{ color: '#666', fontSize: 10, textAlign: 'center', marginTop: 3 }}>
          +{items.length - 5} more items
        </div>
      )}
      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: 10, textAlign: 'center' }}>
        Walk up to inspect rack
      </div>
    </div>
  );
}

// ─── Fridge unit ─────────────────────────────────────────────────────────────
function FridgeUnit({ rack, items, isNearby }: { rack: any; items: any[]; isNearby: boolean }) {
  const worst = getWorstStatus(items.map(calculateAlertStatus));
  const glowHex = getStatusHexColor(worst);

  return (
    <group position={[rack.location_3d.x, 0, rack.location_3d.z]}>
      {/* Outer body */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 2.2, 0.96]} />
        <meshStandardMaterial color="#d8e8f0" metalness={0.4} roughness={0.35} />
      </mesh>
      {/* Center divider */}
      <mesh position={[0, 1.0, 0.49]}>
        <boxGeometry args={[0.04, 2.0, 0.04]} />
        <meshStandardMaterial color="#a8b8c8" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Glass door panels */}
      {([-0.42, 0.42] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 1.0, 0.495]} castShadow>
          <boxGeometry args={[0.78, 1.94, 0.05]} />
          <meshStandardMaterial
            color="#c5e0f5"
            transparent
            opacity={0.45}
            metalness={0.15}
            roughness={0.08}
          />
        </mesh>
      ))}
      {/* Door handles */}
      {([-0.42, 0.42] as number[]).map((x, i) => (
        <mesh key={i} position={[x + (i === 0 ? 0.27 : -0.27), 1.05, 0.535]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
          <meshStandardMaterial color="#90a4b4" metalness={0.85} roughness={0.15} />
        </mesh>
      ))}
      {/* Products visible through glass */}
      <group position={[0, 0.7, 0.15]}>
        {items.slice(0, 5).map((item, i) => (
          <ItemShape3D key={`f0-${item.item_id ?? i}`} itemName={item.item_name} index={i} />
        ))}
      </group>
      <group position={[0, 1.4, 0.15]}>
        {items.slice(5).map((item, i) => (
          <ItemShape3D key={`f1-${item.item_id ?? i}`} itemName={item.item_name} index={i} />
        ))}
      </group>
      {/* Status LED strip */}
      <mesh position={[0, 0.04, 0.49]}>
        <boxGeometry args={[1.62, 0.07, 0.04]} />
        <meshStandardMaterial
          color={glowHex}
          emissive={glowHex}
          emissiveIntensity={isNearby ? 1.4 : 0.7}
        />
      </mesh>
      {/* Interior cold glow */}
      <pointLight position={[0, 1.0, 0.1]} intensity={0.35} color="#b8e0ff" distance={1.8} />
      {/* Top brand bar */}
      <mesh position={[0, 2.19, 0]}>
        <boxGeometry args={[1.63, 0.05, 0.94]} />
        <meshStandardMaterial color="#a8bece" metalness={0.5} roughness={0.3} />
      </mesh>
      <Html position={[0, 2.8, 0]} center>
        <RackLabel rack={rack} items={items} isNearby={isNearby} />
      </Html>
    </group>
  );
}

// ─── Shelf unit ───────────────────────────────────────────────────────────────
function ShelfUnit({ rack, items, isNearby }: { rack: any; items: any[]; isNearby: boolean }) {
  const worst = getWorstStatus(items.map(calculateAlertStatus));
  const glowHex = getStatusHexColor(worst);
  const shelfBoards = [0.52, 1.08, 1.64];

  return (
    <group position={[rack.location_3d.x, 0, rack.location_3d.z]}>
      {/* Back panel */}
      <mesh position={[0, 1.05, -0.44]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 2.1, 0.09]} />
        <meshStandardMaterial color="#2e2218" roughness={0.9} />
      </mesh>
      {/* Side uprights */}
      {([-1.04, 1.04] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 1.05, 0]} castShadow>
          <boxGeometry args={[0.07, 2.1, 0.88]} />
          <meshStandardMaterial color="#2e2218" roughness={0.9} />
        </mesh>
      ))}
      {/* Shelf boards + products */}
      {shelfBoards.map((y, si) => (
        <group key={si}>
          <mesh position={[0, y, 0]} receiveShadow>
            <boxGeometry args={[2.06, 0.075, 0.88]} />
            <meshStandardMaterial color="#c4996a" roughness={0.75} metalness={0.02} />
          </mesh>
          <group position={[0, y + 0.04, 0]}>
            {items.slice(si * 3, si * 3 + 3).map((item, i) => (
              <ItemShape3D key={`s${si}-${item.item_id ?? i}`} itemName={item.item_name} index={i} />
            ))}
          </group>
          {/* Shelf edge price rail */}
          <mesh position={[0, y + 0.04, 0.46]}>
            <boxGeometry args={[2.06, 0.09, 0.03]} />
            <meshStandardMaterial color="#e8e4dc" />
          </mesh>
        </group>
      ))}
      {/* Status LED at base front */}
      <mesh position={[0, 0.04, 0.45]}>
        <boxGeometry args={[2.06, 0.05, 0.04]} />
        <meshStandardMaterial color={glowHex} emissive={glowHex} emissiveIntensity={isNearby ? 1.1 : 0.5} />
      </mesh>
      {/* Top header */}
      <mesh position={[0, 2.12, 0]} castShadow>
        <boxGeometry args={[2.1, 0.16, 0.88]} />
        <meshStandardMaterial color="#221a10" roughness={0.9} />
      </mesh>
      <Html position={[0, 2.65, 0]} center>
        <RackLabel rack={rack} items={items} isNearby={isNearby} />
      </Html>
    </group>
  );
}

// ─── Freezer unit ─────────────────────────────────────────────────────────────
function FreezerUnit({ rack, items, isNearby }: { rack: any; items: any[]; isNearby: boolean }) {
  const worst = getWorstStatus(items.map(calculateAlertStatus));
  const glowHex = getStatusHexColor(worst);

  return (
    <group position={[rack.location_3d.x, 0, rack.location_3d.z]}>
      {/* Chest body */}
      <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.12, 1.05]} />
        <meshStandardMaterial color="#deedf5" metalness={0.45} roughness={0.32} />
      </mesh>
      {/* Top rim */}
      <mesh position={[0, 1.13, 0]}>
        <boxGeometry args={[2.24, 0.07, 1.09]} />
        <meshStandardMaterial color="#b8cedd" metalness={0.5} roughness={0.28} />
      </mesh>
      {/* Glass lid (tilted open slightly) */}
      <mesh position={[0, 1.16, -0.18]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[2.22, 0.06, 0.72]} />
        <meshStandardMaterial color="#c2e0f2" transparent opacity={0.55} metalness={0.2} roughness={0.08} />
      </mesh>
      {/* Frost interior */}
      <mesh position={[0, 0.56, 0]}>
        <boxGeometry args={[2.06, 0.98, 0.91]} />
        <meshStandardMaterial color="#a8d8f0" emissive="#90c8e8" emissiveIntensity={0.12} transparent opacity={0.28} />
      </mesh>
      {/* Products inside */}
      <group position={[0, 0.8, 0]}>
        {items.map((item, i) => (
          <ItemShape3D key={`fz-${item.item_id ?? i}`} itemName={item.item_name} index={i} />
        ))}
      </group>
      {/* Side handles */}
      {([-1.13, 1.13] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.72, 0]}>
          <boxGeometry args={[0.07, 0.12, 0.34]} />
          <meshStandardMaterial color="#7a9aae" metalness={0.75} roughness={0.2} />
        </mesh>
      ))}
      {/* Status LED */}
      <mesh position={[0, 0.04, 0.53]}>
        <boxGeometry args={[2.2, 0.055, 0.04]} />
        <meshStandardMaterial color={glowHex} emissive={glowHex} emissiveIntensity={isNearby ? 1.4 : 0.6} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} intensity={0.5} color="#88ccff" distance={2.2} />
      <Html position={[0, 1.65, 0]} center>
        <RackLabel rack={rack} items={items} isNearby={isNearby} />
      </Html>
    </group>
  );
}

// ─── Rack router ─────────────────────────────────────────────────────────────
function RackUnit({ rack, kioskData, nearbyRackId }: { rack: any; kioskData: KioskData; nearbyRackId: string | null }) {
  const items = kioskData.items.filter(i => rack.items.includes(i.item_id));
  const isNearby = nearbyRackId === rack.rack_id;
  if (rack.type === 'fridge') return <FridgeUnit rack={rack} items={items} isNearby={isNearby} />;
  if (rack.type === 'freezer') return <FreezerUnit rack={rack} items={items} isNearby={isNearby} />;
  return <ShelfUnit rack={rack} items={items} isNearby={isNearby} />;
}

// ─── Player character ─────────────────────────────────────────────────────────
interface CharacterProps {
  groupRef: React.RefObject<THREE.Group | null>;
  keysRef: React.RefObject<Set<string>>;
  kioskData: KioskData;
  onRackSelectRef: React.RefObject<(id: string | null) => void>;
  setNearbyRack: (id: string | null) => void;
}

function Character({ groupRef, keysRef, kioskData, onRackSelectRef, setNearbyRack }: CharacterProps) {
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const walkRef = useRef(0);
  const proximityRef = useRef<string | null>(null);
  const moveVec = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const keys = keysRef.current;
    moveVec.current.set(0, 0, 0);

    for (const [key, [dx, dz]] of Object.entries(MOVE_DIRS)) {
      if (keys.has(key)) {
        moveVec.current.x += dx;
        moveVec.current.z += dz;
      }
    }

    const isMoving = moveVec.current.length() > 0.001;

    if (isMoving) {
      moveVec.current.normalize().multiplyScalar(SPEED);
      groupRef.current.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, groupRef.current.position.x + moveVec.current.x));
      groupRef.current.position.z = Math.max(-BOUNDS, Math.min(BOUNDS, groupRef.current.position.z + moveVec.current.z));
      // Smooth rotate to face direction
      const targetAngle = Math.atan2(moveVec.current.x, moveVec.current.z);
      groupRef.current.rotation.y += (targetAngle - groupRef.current.rotation.y) * 0.25;
      walkRef.current += delta * 9;
    }

    // Walk animation
    const swing = Math.sin(walkRef.current) * (isMoving ? 0.48 : 0.0);
    if (leftLegRef.current) leftLegRef.current.rotation.x += (swing - leftLegRef.current.rotation.x) * 0.3;
    if (rightLegRef.current) rightLegRef.current.rotation.x += (-swing - rightLegRef.current.rotation.x) * 0.3;
    if (leftArmRef.current) leftArmRef.current.rotation.x += (-swing * 0.6 - leftArmRef.current.rotation.x) * 0.3;
    if (rightArmRef.current) rightArmRef.current.rotation.x += (swing * 0.6 - rightArmRef.current.rotation.x) * 0.3;
    // Body bob
    if (bodyRef.current) {
      const bob = isMoving ? Math.abs(Math.sin(walkRef.current * 2)) * 0.03 : 0;
      bodyRef.current.position.y += (bob - bodyRef.current.position.y) * 0.2;
    }

    // Proximity detection
    const pos = groupRef.current.position;
    let nearest: string | null = null;
    let nearestDist = Infinity;
    for (const rack of kioskData.racks) {
      const d = tmp.current.set(rack.location_3d.x, 0, rack.location_3d.z).distanceTo(pos);
      if (d < nearestDist) { nearestDist = d; nearest = rack.rack_id; }
    }
    if (nearestDist < PROX_IN) {
      if (proximityRef.current !== nearest) {
        proximityRef.current = nearest;
        setNearbyRack(nearest);
        onRackSelectRef.current?.(nearest);
      }
    } else if (nearestDist > PROX_OUT && proximityRef.current !== null) {
      proximityRef.current = null;
      setNearbyRack(null);
      onRackSelectRef.current?.(null);
    }
  });

  // Material colors
  const skin = '#f5c5a3';
  const hair = '#3d2b1f';
  const shirt = '#1d4ed8';
  const pants = '#2d3748';
  const apron = '#f4f4ee';
  const shoe = '#1c1c2c';
  const silver = '#a0aab8';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Shoes */}
      {([-0.145, 0.145] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.055, 0.04]} castShadow>
          <boxGeometry args={[0.155, 0.11, 0.26]} />
          <meshStandardMaterial color={shoe} roughness={0.7} />
        </mesh>
      ))}

      {/* Left leg pivot at hip */}
      <group ref={leftLegRef} position={[-0.14, 0.82, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.125, 0.68, 10]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
        {/* Knee crease */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.05, 10]} />
          <meshStandardMaterial color="#1f2a38" roughness={0.9} />
        </mesh>
      </group>

      {/* Right leg pivot */}
      <group ref={rightLegRef} position={[0.14, 0.82, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.125, 0.68, 10]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.05, 10]} />
          <meshStandardMaterial color="#1f2a38" roughness={0.9} />
        </mesh>
      </group>

      {/* Hip block */}
      <mesh position={[0, 0.86, 0]} castShadow>
        <boxGeometry args={[0.4, 0.16, 0.3]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>

      {/* Body group for bob animation */}
      <group ref={bodyRef}>
        {/* Torso / shirt */}
        <mesh position={[0, 1.17, 0]} castShadow>
          <boxGeometry args={[0.48, 0.6, 0.3]} />
          <meshStandardMaterial color={shirt} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Apron overlay front */}
        <mesh position={[0, 1.12, 0.16]} castShadow>
          <boxGeometry args={[0.32, 0.5, 0.025]} />
          <meshStandardMaterial color={apron} roughness={0.8} />
        </mesh>
        {/* Apron pocket */}
        <mesh position={[0, 1.0, 0.178]}>
          <boxGeometry args={[0.18, 0.1, 0.01]} />
          <meshStandardMaterial color="#e0e0d8" roughness={0.9} />
        </mesh>
        {/* Collar */}
        <mesh position={[0, 1.44, 0.05]}>
          <boxGeometry args={[0.36, 0.06, 0.22]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
        {/* Name tag */}
        <mesh position={[0.12, 1.28, 0.163]}>
          <boxGeometry args={[0.09, 0.05, 0.008]} />
          <meshStandardMaterial color="#ffd700" roughness={0.4} metalness={0.3} />
        </mesh>

        {/* Left arm pivot at shoulder */}
        <group ref={leftArmRef} position={[-0.315, 1.4, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 0.44, 9]} />
            <meshStandardMaterial color={shirt} roughness={0.7} />
          </mesh>
          {/* Forearm / hand */}
          <mesh position={[0, -0.5, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.09, 0.3, 9]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
        </group>

        {/* Right arm pivot at shoulder */}
        <group ref={rightArmRef} position={[0.315, 1.4, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 0.44, 9]} />
            <meshStandardMaterial color={shirt} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.09, 0.3, 9]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
        </group>

        {/* Neck */}
        <mesh position={[0, 1.52, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.12, 10]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.72, 0]} castShadow>
          <sphereGeometry args={[0.23, 14, 10]} />
          <meshStandardMaterial color={skin} roughness={0.75} />
        </mesh>

        {/* Hair */}
        <mesh position={[0, 1.86, 0]} scale={[1.05, 0.68, 1.05]}>
          <sphereGeometry args={[0.24, 12, 8]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* Hair back */}
        <mesh position={[0, 1.78, -0.12]} scale={[0.9, 0.7, 0.6]}>
          <sphereGeometry args={[0.24, 10, 8]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>

        {/* Eyes */}
        {([-0.09, 0.09] as number[]).map((x, i) => (
          <mesh key={i} position={[x, 1.72, 0.21]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color="#1a1a2a" roughness={1} />
          </mesh>
        ))}
        {/* Smile */}
        <mesh position={[0, 1.64, 0.215]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.1, 0.02, 0.02]} />
          <meshStandardMaterial color="#c44" roughness={1} />
        </mesh>
      </group>

      {/* Character glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.32, 0.46, 32]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Camera rig ───────────────────────────────────────────────────────────────
function CameraRig({
  targetRef,
  zoomRef,
}: {
  targetRef: React.RefObject<THREE.Group | null>;
  zoomRef: React.RefObject<number>;
}) {
  const camera = useThree(s => s.camera);
  const camTarget = useRef(new THREE.Vector3(0, 0, 0));
  const ISO_OFFSET = new THREE.Vector3(9, 9, 9);

  useFrame(() => {
    if (!targetRef.current) return;
    camTarget.current.lerp(targetRef.current.position, 0.09);
    camera.position.copy(camTarget.current).add(ISO_OFFSET);
    camera.lookAt(camTarget.current);
    // Smooth zoom
    const ortho = camera as THREE.OrthographicCamera;
    if (ortho.isOrthographicCamera) {
      ortho.zoom += (zoomRef.current - ortho.zoom) * 0.1;
      ortho.updateProjectionMatrix();
    }
  });
  return null;
}

// ─── Scene (manages keyboard, all objects) ────────────────────────────────────
interface SceneProps {
  kioskData: KioskData;
  onRackSelectRef: React.RefObject<(id: string | null) => void>;
  nearbyRack: string | null;
  setNearbyRack: (id: string | null) => void;
  zoomRef: React.RefObject<number>;
}

function Scene({ kioskData, onRackSelectRef, nearbyRack, setNearbyRack, zoomRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Reset character position when kiosk switches
  useEffect(() => {
    if (groupRef.current) groupRef.current.position.set(0, 0, 0);
  }, [kioskData.kiosk_id]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={[0xfff4e0, 0xa0d8a0, 0.4]} />
      <directionalLight
        position={[8, 12, 8]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <pointLight position={[-6, 5, 6]} intensity={0.4} color="#ffe0c0" distance={14} />
      <pointLight position={[6, 5, -6]} intensity={0.3} color="#c0d8ff" distance={12} />

      <Suspense fallback={null}>
        <Environment preset="warehouse" background={false} />
      </Suspense>

      <StoreTile />
      <StoreEnvironment />

      {kioskData.racks.map(rack => (
        <RackUnit key={rack.rack_id} rack={rack} kioskData={kioskData} nearbyRackId={nearbyRack} />
      ))}

      <Character
        groupRef={groupRef}
        keysRef={keysRef}
        kioskData={kioskData}
        onRackSelectRef={onRackSelectRef}
        setNearbyRack={setNearbyRack}
      />

      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.45}
        scale={28}
        blur={2.8}
        far={5}
        resolution={512}
      />

      <CameraRig targetRef={groupRef} zoomRef={zoomRef} />
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface ThreeDStoreViewProps {
  kioskData: KioskData;
  onRackSelect: (rackId: string | null) => void;
  selectedRackId: string | null;
  flashRackId?: string | null;
}

export default function ThreeDStoreView({ kioskData, onRackSelect, selectedRackId }: ThreeDStoreViewProps) {
  const [nearbyRack, setNearbyRack] = useState<string | null>(null);
  const onRackSelectRef = useRef(onRackSelect);
  const zoomRef = useRef(62);
  useEffect(() => { onRackSelectRef.current = onRackSelect; }, [onRackSelect]);

  return (
    <div className="relative w-full h-full" style={{ background: '#12121e' }}>
      <Canvas
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        onCreated={({ gl }) => { gl.setClearColor('#12121e'); }}
      >
        <OrthographicCamera makeDefault position={[9, 9, 9]} zoom={62} near={0.1} far={200} />
        <Scene
          kioskData={kioskData}
          onRackSelectRef={onRackSelectRef}
          nearbyRack={nearbyRack}
          setNearbyRack={setNearbyRack}
          zoomRef={zoomRef}
        />
      </Canvas>

      {/* HUD - movement hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs text-white/70 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
        <kbd className="px-1.5 py-0.5 rounded text-white/90 font-mono text-xs mr-1" style={{ background: 'rgba(255,255,255,0.12)' }}>W A S D</kbd>
        or
        <kbd className="px-1.5 py-0.5 rounded text-white/90 font-mono text-xs mx-1" style={{ background: 'rgba(255,255,255,0.12)' }}>↑ ↓ ← →</kbd>
        to move &nbsp;•&nbsp; Walk near a rack to inspect
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 p-3 rounded-xl text-xs pointer-events-none space-y-1.5"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[['#22c55e', 'Normal'], ['#eab308', 'Low Stock'], ['#f97316', 'Expiring Soon'], ['#ef4444', 'Expired']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 pointer-events-auto">
        {([
          { label: '+', title: 'Zoom in',    action: () => { zoomRef.current = Math.min(130, zoomRef.current + 10); } },
          { label: '−', title: 'Zoom out',   action: () => { zoomRef.current = Math.max(28,  zoomRef.current - 10); } },
          { label: '⌂', title: 'Reset view', action: () => { zoomRef.current = 62; } },
        ] as const).map(btn => (
          <button
            key={btn.title}
            onClick={btn.action}
            title={btn.title}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg font-bold transition-colors hover:bg-white/15"
            style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
