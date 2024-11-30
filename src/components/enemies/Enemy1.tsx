import { FC } from 'react'
import * as THREE from 'three'

interface Enemy1Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

export const Enemy1: FC<Enemy1Props> = ({ position, wobbleOffset, health, maxHealth }) => {
  // Calculate color transition from green to red based on health
  const healthPercent = health / maxHealth
  const color = new THREE.Color(0x00ff00).lerp(new THREE.Color(0xff0000), 1 - healthPercent)

  return (
    <group position={position}>
      <mesh position={wobbleOffset} castShadow>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <pointLight
        color={color}
        intensity={0.5}
        distance={2}
      />
    </group>
  )
} 