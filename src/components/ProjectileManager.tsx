import { FC, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useProjectileStore } from '../hooks/useProjectiles'
import { useGameState } from '../store/gameState'

interface Projectile {
  id: number
  position: THREE.Vector3
  direction: THREE.Vector3
  type: 'player' | 'enemy'
}

const PROJECTILE_SPEED = 0.5
const MAX_DISTANCE = 100

// Terrain constants from Terrain.tsx
const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }

export const ProjectileManager: FC = () => {
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const nextId = useRef(0)
  const isPaused = useGameState(state => state.isPaused)

  // Register the spawn function with the store
  useProjectileStore.setState({
    spawnProjectile: (position: THREE.Vector3, direction: THREE.Vector3, type: 'player' | 'enemy') => {
      if (isPaused) return // Don't spawn new projectiles when paused
      setProjectiles(prev => [...prev, {
        id: nextId.current++,
        position: position.clone(),
        direction: direction.normalize(),
        type
      }])
    }
  })

  // Check if a projectile collides with terrain
  const checkTerrainCollision = (position: THREE.Vector3) => {
    // Check if projectile is within terrain bounds
    const inTerrainXBounds = position.x > TERRAIN_POSITION.x - TERRAIN_SIZE.x / 2 &&
                            position.x < TERRAIN_POSITION.x + TERRAIN_SIZE.x / 2
    const inTerrainYBounds = position.y > TERRAIN_POSITION.y - TERRAIN_SIZE.y / 2 &&
                            position.y < TERRAIN_POSITION.y + TERRAIN_SIZE.y / 2
    const inTerrainZBounds = position.z > TERRAIN_POSITION.z - TERRAIN_SIZE.z / 2 &&
                            position.z < TERRAIN_POSITION.z + TERRAIN_SIZE.z / 2

    return inTerrainXBounds && inTerrainYBounds && inTerrainZBounds
  }

  useFrame(() => {
    if (isPaused) return // Skip updates when paused

    setProjectiles(prev => 
      prev
        .map(projectile => ({
          ...projectile,
          position: projectile.position.clone().add(
            projectile.direction.clone().multiplyScalar(PROJECTILE_SPEED)
          )
        }))
        // Remove projectiles that have traveled too far or hit terrain
        .filter(projectile => {
          // Check distance from origin
          if (projectile.position.length() > MAX_DISTANCE) {
            return false
          }

          // Check terrain collision
          if (checkTerrainCollision(projectile.position)) {
            console.log(`Projectile ${projectile.id} hit terrain and despawned`)
            return false
          }

          return true
        })
    )
  })

  return (
    <>
      {projectiles.map(projectile => (
        <mesh
          key={projectile.id}
          position={projectile.position}
          castShadow
          name={`${projectile.type}-projectile`}
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