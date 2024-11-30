import { FC, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { FireworkEffect } from './FireworkEffect'
import { useGameAudio } from '../hooks/useGameAudio'

// Platform definitions for collision detection
const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }

const PLATFORM_SIZE = { x: 5, y: 1, z: 5 }
const PLATFORMS = [
  { 
    size: PLATFORM_SIZE,
    position: { x: 0, y: 4, z: 0 }
  },
  {
    size: PLATFORM_SIZE,
    position: { x: 0, y: 8, z: 0 }
  },
  {
    size: PLATFORM_SIZE,
    position: { x: 0, y: 12, z: 0 }
  }
]

const FLOOR_SIZE = 50
const FLOOR_BOUNDARY = FLOOR_SIZE / 2 - 1

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

const ENEMY_SIZE = 1
const ENEMY_SPEED = 0.1
const ENEMY_REPULSION_DISTANCE = 3
const ENEMY_REPULSION_FORCE = 0.05
const SPAWN_INTERVAL = 5
const SPAWN_HEIGHT = ENEMY_SIZE / 2
const SPAWN_RADIUS = 15
const INITIAL_HEALTH = 3
const PROJECTILE_COLLISION_DISTANCE = 0.5
const PLAYER_COLLISION_DISTANCE = 1.5
const DAMAGE_COOLDOWN = 1
const PLAYER_DAMAGE = 10
const PARTICLE_LIFETIME = 1
const WOBBLE_SPEED = 2
const WOBBLE_AMOUNT = 0.2
const FIRST_PLATFORM_HEIGHT = 4
const SECOND_PLATFORM_HEIGHT = 8
const TERRAIN_AVOIDANCE_DISTANCE = 2
const TERRAIN_AVOIDANCE_FORCE = 0.15

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

  const checkTerrainCollision = (position: THREE.Vector3) => {
    // Check main terrain
    const inTerrainXBounds = position.x > TERRAIN_POSITION.x - TERRAIN_SIZE.x / 2 - ENEMY_SIZE &&
                            position.x < TERRAIN_POSITION.x + TERRAIN_SIZE.x / 2 + ENEMY_SIZE
    const inTerrainZBounds = position.z > TERRAIN_POSITION.z - TERRAIN_SIZE.z / 2 - ENEMY_SIZE &&
                            position.z < TERRAIN_POSITION.z + TERRAIN_SIZE.z / 2 + ENEMY_SIZE

    if (inTerrainXBounds && inTerrainZBounds) {
      return true
    }

    // Check platforms
    for (const platform of PLATFORMS) {
      const inPlatformXBounds = position.x > platform.position.x - platform.size.x / 2 - ENEMY_SIZE &&
                               position.x < platform.position.x + platform.size.x / 2 + ENEMY_SIZE
      const inPlatformZBounds = position.z > platform.position.z - platform.size.z / 2 - ENEMY_SIZE &&
                               position.z < platform.position.z + platform.size.z / 2 + ENEMY_SIZE

      if (inPlatformXBounds && inPlatformZBounds) {
        return true
      }
    }

    return false
  }

  const calculateAvoidanceForce = (position: THREE.Vector3) => {
    const avoidanceForce = new THREE.Vector3()

    // Check main terrain
    const terrainDist = new THREE.Vector3()
      .subVectors(position, new THREE.Vector3(TERRAIN_POSITION.x, position.y, TERRAIN_POSITION.z))
    const terrainDistLength = terrainDist.length()
    
    if (terrainDistLength < TERRAIN_AVOIDANCE_DISTANCE + TERRAIN_SIZE.x/2) {
      avoidanceForce.add(terrainDist.normalize().multiplyScalar(
        TERRAIN_AVOIDANCE_FORCE * (1 - terrainDistLength/(TERRAIN_AVOIDANCE_DISTANCE + TERRAIN_SIZE.x/2))
      ))
    }

    // Check platforms
    PLATFORMS.forEach(platform => {
      const platformDist = new THREE.Vector3()
        .subVectors(position, new THREE.Vector3(platform.position.x, position.y, platform.position.z))
      const platformDistLength = platformDist.length()
      
      if (platformDistLength < TERRAIN_AVOIDANCE_DISTANCE + platform.size.x/2) {
        avoidanceForce.add(platformDist.normalize().multiplyScalar(
          TERRAIN_AVOIDANCE_FORCE * (1 - platformDistLength/(TERRAIN_AVOIDANCE_DISTANCE + platform.size.x/2))
        ))
      }
    })

    return avoidanceForce
  }

  const spawnXPPickup = (position: THREE.Vector3) => {
    const powerupManager = (window as any).powerupManager
    if (powerupManager && typeof powerupManager.spawnXPBoost === 'function') {
      powerupManager.spawnXPBoost(position.clone())
    }
  }

  const destroyEnemy = (enemy: Enemy, currentTime: number) => {
    playExplosionSound()
    spawnXPPickup(enemy.position)
    setExplosions(prev => [...prev, {
      id: nextExplosionId.current++,
      position: enemy.position.clone(),
      startTime: currentTime
    }])
  }

  useFrame(({ scene }, delta) => {
    if (isPaused) return

    const currentTime = performance.now() / 1000
    const player = scene.getObjectByName('player')
    
    if (player) {
      playerPosition.current.copy(player.position)
      const isAboveSecondPlatform = playerPosition.current.y > SECOND_PLATFORM_HEIGHT

      // Spawn new enemies
      if (currentTime - lastSpawnTime.current >= SPAWN_INTERVAL) {
        const angle = Math.random() * Math.PI * 2
        let spawnPosition = new THREE.Vector3(
          Math.cos(angle) * SPAWN_RADIUS,
          SPAWN_HEIGHT,
          Math.sin(angle) * SPAWN_RADIUS
        )

        // Ensure spawn position doesn't collide with terrain
        while (checkTerrainCollision(spawnPosition)) {
          const newAngle = Math.random() * Math.PI * 2
          spawnPosition = new THREE.Vector3(
            Math.cos(newAngle) * SPAWN_RADIUS,
            SPAWN_HEIGHT,
            Math.sin(newAngle) * SPAWN_RADIUS
          )
        }

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

      // Update enemy positions
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

            // Calculate terrain avoidance force
            const avoidanceForce = calculateAvoidanceForce(enemy.position)

            // Create new position
            const newPosition = enemy.position.clone()

            // If player is above second platform, make enemies retreat
            if (isAboveSecondPlatform) {
              if (enemy.position.y > FIRST_PLATFORM_HEIGHT) {
                newPosition.y = Math.max(
                  FIRST_PLATFORM_HEIGHT,
                  enemy.position.y - ENEMY_SPEED * 2
                )
              }
              const horizontalDirection = new THREE.Vector3(
                enemy.position.x - playerPosition.current.x,
                0,
                enemy.position.z - playerPosition.current.z
              ).normalize()
              newPosition.add(horizontalDirection.multiplyScalar(ENEMY_SPEED))
            } else {
              // Normal movement towards player
              const movement = directionToPlayer.multiplyScalar(ENEMY_SPEED)
              newPosition.add(movement)
            }

            // Apply forces
            newPosition.add(repulsionForce.multiplyScalar(ENEMY_REPULSION_FORCE))
            newPosition.add(avoidanceForce)

            // Ensure new position doesn't collide with terrain
            if (checkTerrainCollision(newPosition)) {
              return {
                ...enemy,
                health: enemy.health
              }
            }

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

            return {
              ...enemy,
              position: newPosition,
              health: newHealth
            }
          })
          .filter(enemy => {
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
          if (distanceToPlayer < PLAYER_COLLISION_DISTANCE) {
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
    }
  })

  return (
    <>
      {enemies.map(enemy => {
        // Calculate wobble offsets
        const time = enemy.spawnTime
        const verticalOffset = Math.sin(time * WOBBLE_SPEED) * WOBBLE_AMOUNT
        const horizontalOffset = Math.cos(time * WOBBLE_SPEED) * WOBBLE_AMOUNT

        // Apply offsets perpendicular to movement direction
        const wobbleOffset = new THREE.Vector3()
        if (playerPosition.current) {
          const directionToPlayer = new THREE.Vector3()
            .subVectors(playerPosition.current, enemy.position)
            .normalize()
          const perpendicular = new THREE.Vector3(-directionToPlayer.z, 0, directionToPlayer.x)
          wobbleOffset.copy(perpendicular.multiplyScalar(horizontalOffset))
          wobbleOffset.y = verticalOffset
        }

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
                color={enemy.type === 'enemy1' ? '#ff0000' : '#00ff00'}
                emissive={enemy.type === 'enemy1' ? '#ff0000' : '#00ff00'}
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