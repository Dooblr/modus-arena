import { FC, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useProjectileStore } from '../hooks/useProjectiles'

interface Projectile {
  id: number
  position: THREE.Vector3
  direction: THREE.Vector3
  type: 'player' | 'enemy'
}

const PROJECTILE_SPEED = 0.5
const MAX_DISTANCE = 100

export const ProjectileManager: FC = () => {
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const nextId = useRef(0)

  // Register the spawn function with the store
  useProjectileStore.setState({
    spawnProjectile: (position: THREE.Vector3, direction: THREE.Vector3, type: 'player' | 'enemy') => {
      setProjectiles(prev => [...prev, {
        id: nextId.current++,
        position: position.clone(),
        direction: direction.normalize(),
        type
      }])
    }
  })

  useFrame(() => {
    setProjectiles(prev => 
      prev
        .map(projectile => ({
          ...projectile,
          position: projectile.position.clone().add(
            projectile.direction.clone().multiplyScalar(PROJECTILE_SPEED)
          )
        }))
        // Remove projectiles that have traveled too far
        .filter(projectile => 
          projectile.position.length() < MAX_DISTANCE
        )
    )
  })

  return (
    <>
      {projectiles.map(projectile => (
        <mesh
          key={projectile.id}
          position={projectile.position}
          castShadow
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </>
  )
} 