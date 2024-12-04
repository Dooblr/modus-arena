import { FC, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ENEMY_CONFIGS } from './index'
import { useCollisionStore } from '../../store/collisionStore'
import type { Collider } from '../../systems/CollisionSystem'

const FULL_HEALTH_COLOR = '#00ff00' // Green
const LOW_HEALTH_COLOR = '#ff0000'  // Red

interface Enemy1Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

export const Enemy1: FC<Enemy1Props> = ({ position, wobbleOffset = new THREE.Vector3(), health, maxHealth }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { addCollider, removeCollider } = useCollisionStore()
  
  useEffect(() => {
    if (!meshRef.current || !position || !wobbleOffset) return

    const collider: Collider = {
      type: 'sphere',
      position: position.clone().add(wobbleOffset),
      size: new THREE.Vector3(ENEMY_CONFIGS.enemy1.size, ENEMY_CONFIGS.enemy1.size, ENEMY_CONFIGS.enemy1.size),
      layer: 'enemy',
      entity: meshRef.current
    }

    addCollider(collider)
    return () => removeCollider(collider)
  }, [position, wobbleOffset, addCollider, removeCollider])

  const healthPercent = health / maxHealth
  const color = new THREE.Color(LOW_HEALTH_COLOR).lerp(new THREE.Color(FULL_HEALTH_COLOR), healthPercent)

  return (
    <group position={position}>
      <mesh ref={meshRef} position={wobbleOffset} castShadow>
        <sphereGeometry args={[ENEMY_CONFIGS.enemy1.size, 32, 32]} />
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