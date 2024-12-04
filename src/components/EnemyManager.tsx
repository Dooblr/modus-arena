import { FC, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { FireworkEffect } from './FireworkEffect'
import { useGameAudio } from '../hooks/useGameAudio'
import { Enemy1, Enemy2, Enemy3 } from './enemies'
import { ALL_PLATFORMS } from './Terrain'
import {
  ENEMY_TYPES,
  type EnemyType,
  ENEMY_CONFIGS,
  ENEMY_REPULSION_DISTANCE,
  ENEMY_REPULSION_FORCE,
  SPAWN_RADIUS,
  PROJECTILE_COLLISION_DISTANCE,
  PLAYER_COLLISION_DISTANCE,
  DAMAGE_COOLDOWN,
  PLAYER_DAMAGE,
  WOBBLE_SPEED,
  WOBBLE_AMOUNT
} from './enemies'
import { SpawnAnimation } from './enemies/SpawnAnimation'

const FLOOR_SIZE = 50
const FLOOR_BOUNDARY = FLOOR_SIZE / 2 - 1
const FIRST_PLATFORM_HEIGHT = 4
const SECOND_PLATFORM_HEIGHT = 8
const TERRAIN_AVOIDANCE_DISTANCE = 2
const TERRAIN_AVOIDANCE_FORCE = 0.1
const PARTICLE_LIFETIME = 1

interface Enemy {
  id: number
  type: EnemyType
  position: THREE.Vector3
  health: number
  lastDamageTime: number
  isSpawning: boolean
  spawnTime: number
  maxHealth: number
}

interface Explosion {
  id: number
  position: THREE.Vector3
  startTime: number
}

export const EnemyManager: FC = () => {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const nextEnemyId = useRef(0)
  const nextExplosionId = useRef(0)
  const lastSpawnTimes = useRef<Record<EnemyType, number>>(
    Object.fromEntries(ENEMY_TYPES.map(type => [type, 0])) as Record<EnemyType, number>
  )
  const lastDamageTime = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  const isPaused = useGameState(state => state.isPaused)
  const takeDamage = useGameState(state => state.takeDamage)
  const { playEnemyHitSound, playEnemyDeathSound: playExplosionSound } = useGameAudio()

  const checkTerrainCollision = (position: THREE.Vector3, enemyType: EnemyType) => {
    const enemySize = ENEMY_CONFIGS[enemyType].size

    // Check floor boundaries
    if (Math.abs(position.x) > FLOOR_BOUNDARY || Math.abs(position.z) > FLOOR_BOUNDARY) {
      return true
    }

    // Check platforms
    for (const platform of ALL_PLATFORMS) {
      const halfSize = {
        x: platform.size.x / 2,
        y: platform.size.y / 2,
        z: platform.size.z / 2
      }

      if (
        position.x >= platform.position.x - halfSize.x - enemySize/2 &&
        position.x <= platform.position.x + halfSize.x + enemySize/2 &&
        position.z >= platform.position.z - halfSize.z - enemySize/2 &&
        position.z <= platform.position.z + halfSize.z + enemySize/2 &&
        position.y >= platform.position.y - halfSize.y &&
        position.y <= platform.position.y + halfSize.y
      ) {
        return true
      }
    }

    return false
  }

  const spawnXPPickup = (position: THREE.Vector3, enemyType: EnemyType) => {
    const powerupManager = (window as any).powerupManager
    if (powerupManager && typeof powerupManager.spawnXPBoost === 'function') {
      // Spawn a single XP pickup with a small random offset
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      )
      powerupManager.spawnXPBoost(position.clone().add(offset))
    }
  }

  const spawnHealthPickup = (position: THREE.Vector3) => {
    const powerupManager = (window as any).powerupManager
    if (powerupManager && typeof powerupManager.spawnHealthBoost === 'function') {
      // Spawn health pickup with a small random offset
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      )
      powerupManager.spawnHealthBoost(position.clone().add(offset))
    }
  }

  const destroyEnemy = (enemy: Enemy, currentTime: number) => {
    playExplosionSound()
    
    // Always spawn XP
    spawnXPPickup(enemy.position, enemy.type)

    // Chance to spawn health based on enemy type
    if (Math.random() < ENEMY_CONFIGS[enemy.type].healthDropChance) {
      spawnHealthPickup(enemy.position)
    }

    setExplosions(prev => [...prev, {
      id: nextExplosionId.current++,
      position: enemy.position.clone(),
      startTime: currentTime
    }])
  }

  const spawnEnemy = (type: EnemyType) => {
    const config = ENEMY_CONFIGS[type]
    const angle = Math.random() * Math.PI * 2
    const radius = SPAWN_RADIUS
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    const newEnemy: Enemy = {
      id: nextEnemyId.current++,
      type,
      position: new THREE.Vector3(x, config.spawnHeight, z),
      health: config.health,
      lastDamageTime: 0,
      isSpawning: true,
      spawnTime: performance.now() / 1000,
      maxHealth: config.health
    }

    setEnemies(prev => [...prev, newEnemy])
  }

  const updateEnemyPositions = (deltaTime: number) => {
    setEnemies(prev => prev.map(enemy => {
      if (enemy.isSpawning) return enemy // Don't move if spawning

      const config = ENEMY_CONFIGS[enemy.type]

      // Calculate direction to player
      const dirToPlayer = new THREE.Vector3()
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

      // Create new position
      const newPosition = enemy.position.clone()

      if (enemy.position.y > SECOND_PLATFORM_HEIGHT) {
        // Retreat movement
        newPosition.y = Math.max(FIRST_PLATFORM_HEIGHT, enemy.position.y - config.speed * 2)
        const retreatDirection = new THREE.Vector3(
          enemy.position.x - playerPosition.current.x,
          0,
          enemy.position.z - playerPosition.current.z
        ).normalize()
        newPosition.add(retreatDirection.multiplyScalar(config.speed))
      } else {
        // Normal movement towards player
        newPosition.add(dirToPlayer.multiplyScalar(config.speed))
      }

      // Apply repulsion
      newPosition.add(repulsionForce)

      // Keep at proper height
      newPosition.y = config.spawnHeight

      // Keep within floor boundaries
      newPosition.x = THREE.MathUtils.clamp(newPosition.x, -FLOOR_BOUNDARY, FLOOR_BOUNDARY)
      newPosition.z = THREE.MathUtils.clamp(newPosition.z, -FLOOR_BOUNDARY, FLOOR_BOUNDARY)

      // After applying all movement, do one final terrain check
      if (checkTerrainCollision(newPosition, enemy.type)) {
        return {
          ...enemy,
          health: enemy.health
        }
      }

      return {
        ...enemy,
        position: newPosition
      }
    }))
  }

  useFrame(({ scene }, delta) => {
    if (isPaused) return

    const currentTime = performance.now() / 1000
    const player = scene.getObjectByName('player')
    
    if (player) {
      playerPosition.current.copy(player.position)
      const isAboveSecondPlatform = playerPosition.current.y > SECOND_PLATFORM_HEIGHT

      // Spawn enemies
      ENEMY_TYPES.forEach(enemyType => {
        const config = ENEMY_CONFIGS[enemyType]
        if (currentTime - lastSpawnTimes.current[enemyType] >= config.spawnInterval) {
          spawnEnemy(enemyType)
          lastSpawnTimes.current[enemyType] = currentTime
        }
      })

      updateEnemyPositions(delta)

      // Check for projectile collisions
      setEnemies(prev => prev.filter(enemy => {
        const projectiles = scene.children.filter(child => 
          child.name === 'player-projectile'
        )

        let shouldDestroy = false
        projectiles.forEach(projectile => {
          if (projectile.position.distanceTo(enemy.position) < PROJECTILE_COLLISION_DISTANCE) {
            enemy.health--
            projectile.removeFromParent()
            playEnemyHitSound()
            if (enemy.health <= 0) {
              shouldDestroy = true
            }
          }
        })

        if (shouldDestroy) {
          destroyEnemy(enemy, currentTime)
          return false
        }
        return true
      }))

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
      {enemies.map(enemy => (
        <group key={enemy.id}>
          {enemy.isSpawning ? (
            <SpawnAnimation
              position={enemy.position}
              onComplete={() => {
                setEnemies(prev => 
                  prev.map(e => 
                    e.id === enemy.id ? { ...e, isSpawning: false } : e
                  )
                )
              }}
            />
          ) : (
            // Existing enemy component rendering
            enemy.type === 'enemy1' ? (
              <Enemy1
                position={enemy.position}
                health={enemy.health}
                maxHealth={enemy.maxHealth}
              />
            ) : enemy.type === 'enemy2' ? (
              <Enemy2
                position={enemy.position}
                health={enemy.health}
                maxHealth={enemy.maxHealth}
              />
            ) : (
              <Enemy3
                position={enemy.position}
                health={enemy.health}
                maxHealth={enemy.maxHealth}
              />
            )
          )}
        </group>
      ))}

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
