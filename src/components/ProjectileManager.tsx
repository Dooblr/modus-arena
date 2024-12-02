import { FC, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { useProjectileStore } from '../hooks/useProjectiles'

interface Projectile {
  id: number
  position: THREE.Vector3
  direction: THREE.Vector3
  type: 'player' | 'enemy'
}

const PROJECTILE_SPEED = 0.5
const MAX_DISTANCE = 50
const HOMING_RANGE = 10
const HOMING_STRENGTH = 0.1
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
            let closestDistance = HOMING_RANGE

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
              
              newDirection.lerp(toEnemy, HOMING_STRENGTH).normalize()
            }
          }

          return {
            ...projectile,
            direction: newDirection,
            position: projectile.position.clone().add(
              newDirection.clone().multiplyScalar(PROJECTILE_SPEED)
            )
          }
        })
        // Remove projectiles that have traveled too far or hit the player
        .filter(projectile => {
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