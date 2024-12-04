import { FC } from 'react'
import * as THREE from 'three'

interface HealthPowerupProps {
  position: THREE.Vector3
  rotation: [number, number, number]
}

export const HealthPowerup: FC<HealthPowerupProps> = ({ position, rotation }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Heart shape using multiple meshes */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Plus symbol on top */}
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[0.25, 0.05, 0.05]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.25]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
} 