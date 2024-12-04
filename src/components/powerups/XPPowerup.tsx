import { FC } from 'react'
import * as THREE from 'three'

interface XPPowerupProps {
  position: THREE.Vector3
  rotation: [number, number, number]
}

export const XPPowerup: FC<XPPowerupProps> = ({ position, rotation }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Star shape using octahedron */}
      <mesh castShadow>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial
          color="#4a9eff"  // Changed to blue for XP
          emissive="#4a9eff"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* XP symbol */}
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.05]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
} 