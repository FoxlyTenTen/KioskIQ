'use client';

import * as THREE from 'three';

const SLOTS: [number, number][] = [
  [-0.65, 0], [-0.35, 0], [-0.05, 0], [0.25, 0], [0.55, 0],
  [-0.5, -0.2], [0.05, -0.2], [0.55, -0.2],
];

function getShapeProps(name: string): { color: string; geometry: 'sphere' | 'box' | 'cylinder'; args: number[]; scale?: [number, number, number] } {
  const n = name.toLowerCase();
  if (n.includes('egg'))
    return { color: '#fdf3d0', geometry: 'sphere', args: [0.085, 10, 8], scale: [1, 1.3, 1] };
  if (n.includes('tomato'))
    return { color: '#ef4444', geometry: 'sphere', args: [0.11, 10, 8] };
  if (n.includes('milk'))
    return { color: '#f8f8f8', geometry: 'box', args: [0.12, 0.2, 0.1] };
  if (n.includes('cheese') || n.includes('mozzarella'))
    return { color: '#f5d76e', geometry: 'box', args: [0.14, 0.1, 0.13] };
  if (n.includes('lettuce') || n.includes('basil') || n.includes('herb') || n.includes('spinach'))
    return { color: '#16a34a', geometry: 'sphere', args: [0.1, 10, 8], scale: [1.3, 0.7, 1.3] };
  if (n.includes('chicken') || n.includes('beef') || n.includes('shrimp') || n.includes('meat') || n.includes('pork'))
    return { color: '#f97316', geometry: 'box', args: [0.15, 0.1, 0.13] };
  if (n.includes('rice') || n.includes('flour') || n.includes('noodle') || n.includes('pasta'))
    return { color: '#fef9c3', geometry: 'cylinder', args: [0.08, 0.08, 0.16, 8] };
  if (n.includes('latte') || n.includes('coffee'))
    return { color: '#78350f', geometry: 'cylinder', args: [0.07, 0.07, 0.18, 8] };
  if (n.includes('sauce') || n.includes('oil') || n.includes('ketchup') || n.includes('soy') || n.includes('sambal'))
    return { color: '#dc2626', geometry: 'cylinder', args: [0.055, 0.055, 0.22, 8] };
  if (n.includes('ice cream'))
    return { color: '#bfdbfe', geometry: 'box', args: [0.12, 0.1, 0.12] };
  if (n.includes('fries') || n.includes('frozen'))
    return { color: '#fde68a', geometry: 'box', args: [0.16, 0.09, 0.12] };
  if (n.includes('bread') || n.includes('bun'))
    return { color: '#d97706', geometry: 'sphere', args: [0.1, 10, 8], scale: [1.4, 0.7, 1.2] };
  if (n.includes('drink') || n.includes('cola') || n.includes('juice') || n.includes('beverage') || n.includes('tea') || n.includes('water'))
    return { color: '#3b82f6', geometry: 'cylinder', args: [0.07, 0.07, 0.2, 8] };
  return { color: '#9ca3af', geometry: 'box', args: [0.13, 0.15, 0.12] };
}

interface ItemShape3DProps {
  itemName: string;
  index: number;
}

export function ItemShape3D({ itemName, index }: ItemShape3DProps) {
  const slot = SLOTS[index % SLOTS.length];
  const { color, geometry, args, scale } = getShapeProps(itemName);
  const height = geometry === 'sphere' ? args[0] : geometry === 'cylinder' ? args[2] / 2 : args[1] / 2;
  const scaleVec: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <mesh
      position={[slot[0], height, slot[1]]}
      scale={scaleVec}
      castShadow
    >
      {geometry === 'sphere' && <sphereGeometry args={args as [number, number, number]} />}
      {geometry === 'box' && <boxGeometry args={args as [number, number, number]} />}
      {geometry === 'cylinder' && <cylinderGeometry args={args as [number, number, number, number]} />}
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
    </mesh>
  );
}
