import { FC, useState, useRef, useEffect } from 'react'
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
const SECOND_PLATFORM_HEIGHT = 8 // Height of second platform
const GROUND_LEVEL = 1 // Ground level height
const RETREAT_SPEED = 0.1 // Speed at which enemies retreat

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
  const hasBreachedSecondPlatform = useGameState(state => state.hasBreachedSecondPlatform)
  const { playEnemyHitSound, playEnemyDeathSound: playExplosionSound } = useGameAudio()

  useEffect(() => {
    // When player breaches second platform, make enemies 1 and 2 return to bottom
    if (hasBreachedSecondPlatform) {
      setEnemies(prevEnemies => 
        prevEnemies.map((enemy, index) => {
          if (index === 0 || index === 1) {
            return {
              ...enemy,
              position: new THREE.Vector3(
                enemy.position.x,
                1, // Return to ground level
                enemy.position.z
              ),
              velocity: new THREE.Vector3(0, 0, 0)
            }
          }
          return enemy
        })
      )
    }
  }, [hasBreachedSecondPlatform])

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

    const currentTime = performance.now() / 1000
    const player = scene.getObjectByName('player')
    
    if (player) {
      playerPosition.current.copy(player.position)
    }

    // Update enemy positions and check collisions
    setEnemies(prevEnemies => {
      return prevEnemies
        .map(enemy => {
          const newPosition = enemy.position.clone()
          let newHealth = enemy.health

          // If player is above second platform, make enemies retreat to ground level
          if (playerPosition.current.y > SECOND_PLATFORM_HEIGHT) {
            if (enemy.position.y > GROUND_LEVEL) {
              // Move down towards ground level
              newPosition.y = Math.max(GROUND_LEVEL, enemy.position.y - RETREAT_SPEED)
            }
            // Move away from player horizontally
            const directionToPlayer = new THREE.Vector3()
              .subVectors(enemy.position, playerPosition.current)
              .setY(0)
              .normalize()
            
            newPosition.add(directionToPlayer.multiplyScalar(ENEMY_SPEED))
          } else {
            // Normal enemy behavior when player is not above second platform
            const directionToPlayer = new THREE.Vector3()
              .subVectors(playerPosition.current, enemy.position)
              .normalize()

            newPosition.add(directionToPlayer.multiplyScalar(ENEMY_SPEED))
          }

          // Apply enemy repulsion
          prevEnemies.forEach(otherEnemy => {
            if (otherEnemy.id !== enemy.id) {
              const direction = new THREE.Vector3()
                .subVectors(enemy.position, otherEnemy.position)
              const distance = direction.length()
              
              if (distance < ENEMY_REPULSION_DISTANCE) {
                direction.normalize()
                const force = (1 - distance / ENEMY_REPULSION_DISTANCE) * ENEMY_REPULSION_FORCE
                newPosition.add(direction.multiplyScalar(force))
              }
            }
          })

          // Check for projectile collisions
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