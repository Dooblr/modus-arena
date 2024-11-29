import { FC, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { FireworkEffect } from './FireworkEffect'
import { useGameAudio } from '../hooks/useGameAudio'

interface Enemy {
  id: number
  position: THREE.Vector3
  spawnTime: number
  health: number
  type: 'enemy1' | 'enemy2'
}

interface Explosion {
  id: number
  position: THREE.Vector3
  startTime: number
}

const SPAWN_INTERVAL = 5 // Spawn every 5 seconds
const ENEMY_SPEED = 0.05
const SPAWN_RADIUS = 20 // Distance from center to spawn enemies
const ENEMY_SIZE = 0.8
const PLAYER_DAMAGE = 10
const DAMAGE_COOLDOWN = 0.5
const COLLISION_DISTANCE = 1.2
const PROJECTILE_COLLISION_DISTANCE = 1.2
const WOBBLE_SPEED = 10
const WOBBLE_AMOUNT = 0.4
const INITIAL_HEALTH = 3
const PARTICLE_LIFETIME = 1 // seconds
const ENEMY_REPULSION_DISTANCE = ENEMY_SIZE * 8
const ENEMY_REPULSION_FORCE = 0.05
const SPAWN_HEIGHT = ENEMY_SIZE / 2 // Spawn height from ground

// Color constants
const ENEMY1_COLOR = new THREE.Color('#00ff00') // Green for enemy1
const ENEMY2_COLOR = new THREE.Color('#ff00ff') // Purple for enemy2
const NO_HEALTH_COLOR = new THREE.Color('#ff0000') // Red when damaged

export const EnemyManager: FC = () => {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const nextEnemyId = useRef(0)
  const nextExplosionId = useRef(0)
  const lastSpawnTime = useRef(0)
  const lastDamageTime = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  const isPaused = useGameState(state => state.isPaused)
  const takeDamage = useGameState(state => state.takeDamage)
  const { playEnemyHitSound, playEnemyDeathSound: playExplosionSound } = useGameAudio()

  // Helper function to get enemy color based on health and type
  const getEnemyColor = (enemy: Enemy) => {
    const t = enemy.health / INITIAL_HEALTH
    const baseColor = enemy.type === 'enemy1' ? ENEMY1_COLOR : ENEMY2_COLOR
    return new THREE.Color().lerpColors(NO_HEALTH_COLOR, baseColor, t)
  }

  // Helper function to handle enemy destruction
  const destroyEnemy = (enemy: Enemy, currentTime: number) => {
    // Create explosion effect
    setExplosions(prev => [...prev, {
      id: nextExplosionId.current++,
      position: enemy.position.clone(),
      startTime: currentTime
    }])

    // Play death sound
    playExplosionSound()

    // Spawn XP powerup at enemy position
    if (typeof window !== 'undefined' && (window as any).spawnPowerup) {
      (window as any).spawnPowerup('xp', enemy.position)
    }
  }

  useFrame(({ scene }, delta) => {
    if (isPaused) return

    // Update player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

    const currentTime = performance.now() / 1000

    // Spawn new enemies
    if (currentTime - lastSpawnTime.current >= SPAWN_INTERVAL) {
      const angle = Math.random() * Math.PI * 2
      const spawnPosition = new THREE.Vector3(
        Math.cos(angle) * SPAWN_RADIUS,
        SPAWN_HEIGHT,
        Math.sin(angle) * SPAWN_RADIUS
      )

      // Determine enemy type based on existing enemies
      const hasEnemy1 = enemies.some(e => e.type === 'enemy1')
      const enemyType = hasEnemy1 ? 'enemy2' : 'enemy1'

      setEnemies(prev => [...prev, {
        id: nextEnemyId.current++,
        position: spawnPosition,
        spawnTime: currentTime,
        health: INITIAL_HEALTH,
        type: enemyType
      }])

      lastSpawnTime.current = currentTime
    }

    // Update enemy positions and check collisions
    setEnemies(prev => {
      return prev
        .map(enemy => {
          // Calculate direction to player
          const directionToPlayer = new THREE.Vector3()
            .subVectors(playerPosition.current, enemy.position)
            .normalize()

          // Calculate repulsion from other enemies
          const repulsionForce = new THREE.Vector3()
          prev.forEach(otherEnemy => {
            if (otherEnemy.id !== enemy.id) {
              const distance = enemy.position.distanceTo(otherEnemy.position)
              if (distance < ENEMY_REPULSION_DISTANCE) {
                const force = ENEMY_REPULSION_FORCE * (1 - distance / ENEMY_REPULSION_DISTANCE)
                const direction = new THREE.Vector3()
                  .subVectors(enemy.position, otherEnemy.position)
                  .normalize()
                repulsionForce.add(direction.multiplyScalar(force))
              }
            }
          })

          // Move enemy towards player
          const movement = directionToPlayer.multiplyScalar(ENEMY_SPEED)
          const repulsion = repulsionForce.multiplyScalar(ENEMY_REPULSION_FORCE)
          
          // Create new position
          const newPosition = enemy.position.clone()
            .add(movement)
            .add(repulsion)

          // Check for projectile collisions
          let newHealth = enemy.health
          const projectiles = scene.children.filter(child => 
            child.name === 'player-projectile'
          )

          projectiles.forEach(projectile => {
            if (projectile.position.distanceTo(enemy.position) < PROJECTILE_COLLISION_DISTANCE) {
              newHealth--
              console.log(`Enemy ${enemy.id} hit! Health: ${newHealth}`)
              projectile.removeFromParent()
              playEnemyHitSound()
            }
          })

          // Return updated enemy
          return {
            ...enemy,
            position: newPosition,
            health: newHealth
          }
        })
        .filter(enemy => {
          // Remove enemy if health depleted
          if (enemy.health <= 0) {
            console.log(`Enemy ${enemy.id} destroyed!`)
            destroyEnemy(enemy, currentTime)
            return false
          }
          return true
        })
    })

    // Check for collisions with player
    if (currentTime - lastDamageTime.current >= DAMAGE_COOLDOWN) {
      enemies.forEach(enemy => {
        const distanceToPlayer = enemy.position.distanceTo(playerPosition.current)
        if (distanceToPlayer < COLLISION_DISTANCE) {
          takeDamage(PLAYER_DAMAGE)
          lastDamageTime.current = currentTime
          destroyEnemy(enemy, currentTime)
          setEnemies(prev => prev.filter(e => e.id !== enemy.id))
        }
      })
    }

    // Remove old explosions
    setExplosions(prev => prev.filter(explosion => 
      currentTime - explosion.startTime < PARTICLE_LIFETIME
    ))
  })

  return (
    <>
      {enemies.map(enemy => {
        // Calculate direction to player for perpendicular wobble
        const directionToPlayer = new THREE.Vector3()
          .subVectors(playerPosition.current, enemy.position)
          .normalize()
        
        // Create perpendicular vectors for wobble
        const perpUp = new THREE.Vector3(0, 1, 0)
        const perpSide = new THREE.Vector3()
          .crossVectors(directionToPlayer, perpUp)
          .normalize()

        // Calculate wobble offsets
        const time = enemy.spawnTime
        const verticalOffset = Math.sin(time * WOBBLE_SPEED) * WOBBLE_AMOUNT
        const horizontalOffset = Math.cos(time * WOBBLE_SPEED) * WOBBLE_AMOUNT

        // Apply offsets perpendicular to movement direction
        const wobbleOffset = new THREE.Vector3()
          .addScaledVector(perpUp, verticalOffset)
          .addScaledVector(perpSide, horizontalOffset)

        // Get color based on health and type
        const enemyColor = getEnemyColor(enemy)

        return (
          <group 
            key={enemy.id}
            position={enemy.position}
          >
            <mesh
              position={wobbleOffset}
              castShadow
            >
              <sphereGeometry args={[ENEMY_SIZE / 2, 16, 16]} />
              <meshStandardMaterial
                color={enemyColor}
                emissive={enemyColor}
                emissiveIntensity={0.2}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        )
      })}

      {explosions.map(explosion => (
        <FireworkEffect
          key={explosion.id}
          position={explosion.position}
          color="#ff0000"
        />
      ))}
    </>
  )
} 