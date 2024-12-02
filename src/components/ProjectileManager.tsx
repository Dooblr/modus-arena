import { FC, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { useProjectileStore } from '../hooks/useProjectiles'
import { ALL_PLATFORMS } from './Terrain'

interface Projectile {
  id: number
  position: THREE.Vector3
  direction: THREE.Vector3
  type: 'player' | 'enemy'
}

const PROJECTILE_SPEED = 0.5
const MAX_DISTANCE = 50
const PROJECTILE_SIZE = 0.2
const ENEMY_PROJECTILE_DAMAGE = 10
const PLAYER_COLLISION_DISTANCE = 0.8

export const ProjectileManager: FC = () => {
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const nextId = useRef(0)
  const lastDamageTime = useRef(0)
  const isPaused = useGameState(state => state.isPaused)
  const hasHomingWeapon = useGameState(state => state.hasHomingWeapon)
  const takeDamage = useGameState(state => state.takeDamage)

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

  const checkTerrainCollision = (position: THREE.Vector3) => {
    // Create collision box for projectile
    const projectileBox = new THREE.Box3().setFromCenterAndSize(
      position,
      new THREE.Vector3(PROJECTILE_SIZE, PROJECTILE_SIZE, PROJECTILE_SIZE)
    )

    // Check collision with each platform
    for (const platform of ALL_PLATFORMS) {
      const platformBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(platform.position.x, platform.position.y, platform.position.z),
        new THREE.Vector3(platform.size.x, platform.size.y, platform.size.z)
      )

      if (projectileBox.intersectsBox(platformBox)) {
        return true
      }
    }

    return false
  }

  useFrame(({ scene }) => {
    if (isPaused) return // Skip updates when paused

    const currentTime = performance.now() / 1000
    const player = scene.getObjectByName('player')

    setProjectiles(prev => 
      prev
        .map(projectile => {
          let newDirection = projectile.direction.clone()

          // Apply homing behavior for player projectiles
          if (hasHomingWeapon && projectile.type === 'player') {
            // Find closest enemy
            let closestEnemy: THREE.Object3D | null = null
            let closestDistance = 10 // homing range

            scene.children.forEach(child => {
              if (child.name === 'enemy') {
                const distance = projectile.position.distanceTo(child.position)
                if (distance < closestDistance) {
                  closestDistance = distance
                  closestEnemy = child
                }
              }
            })

            // Adjust direction towards closest enemy
            if (closestEnemy) {
              const toEnemy = new THREE.Vector3()
                .subVectors(closestEnemy.position, projectile.position)
                .normalize()
              
              newDirection.lerp(toEnemy, 0.1).normalize()
            }
          }

          // Calculate new position
          const newPosition = projectile.position.clone().add(
            newDirection.clone().multiplyScalar(PROJECTILE_SPEED)
          )

          // Check terrain collision before updating position
          if (checkTerrainCollision(newPosition)) {
            return null // Remove projectile if it hits terrain
          }

          return {
            ...projectile,
            position: newPosition,
            direction: newDirection
          }
        })
        .filter((projectile): projectile is Projectile => {
          if (!projectile) return false // Remove null projectiles (hit terrain)

          // Check distance from origin
          if (projectile.position.length() > MAX_DISTANCE) {
            return false
          }

          // Check for enemy projectile collision with player
          if (projectile.type === 'enemy' && player) {
            const distanceToPlayer = projectile.position.distanceTo(player.position)
            if (distanceToPlayer < PLAYER_COLLISION_DISTANCE) {
              takeDamage(ENEMY_PROJECTILE_DAMAGE)
              return false
            }
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
            color={projectile.type === 'player' ? (hasHomingWeapon ? '#00ffff' : '#ff0000') : '#ff0000'}
            emissive={projectile.type === 'player' ? (hasHomingWeapon ? '#00ffff' : '#ff0000') : '#ff0000'}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </>
  )
} 