import { FC } from 'react'
import * as THREE from 'three'

interface LevelPowerupProps {
  position: THREE.Vector3
  rotation: [number, number, number]
}

export const LevelPowerup: FC<LevelPowerupProps> = ({ position, rotation }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Star shape using octahedron */}
      <mesh castShadow>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Arrow up symbol */}
      <mesh position={[0, 0.21, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.15, 0.3, 4]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
} 