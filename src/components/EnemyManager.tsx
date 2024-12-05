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
const LOG_INTERVAL = 5000 // 5 seconds in milliseconds
const lastPathfindingLog = { current: 0 }
const stuckEnemies = new Map<number, {
  position: number[],
  attemptedPosition: number[],
  directionToPlayer: number[],
  distanceToPlayer: number
}>()

// Add these constants at the top
const ALTERNATIVE_DIRECTIONS = [
  { x: 1, z: 0 },   // right
  { x: -1, z: 0 },  // left
  { x: 0, z: 1 },   // forward
  { x: 0, z: -1 },  // back
  { x: 1, z: 1 },   // diagonal
  { x: -1, z: 1 },  // diagonal
  { x: 1, z: -1 },  // diagonal
  { x: -1, z: -1 }  // diagonal
]

const STUCK_THRESHOLD = 0.01 // Minimum movement required to not be considered stuck
const DIRECTION_CHANGE_INTERVAL = 0.5 // How often to try new directions (seconds)

interface Enemy {
  id: number
  type: EnemyType
  position: THREE.Vector3
  health: number
  lastDamageTime: number
  isSpawning: boolean
  spawnTime: number
  maxHealth: number
  stuckTime?: number
  currentDirectionIndex?: number
  lastPosition?: THREE.Vector3
  lastDirectionChange?: number
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

    // Check collision with each platform
    for (const platform of ALL_PLATFORMS) {
      const halfSize = {
        x: platform.size.x / 2,
        y: platform.size.y / 2,
        z: platform.size.z / 2
      }

      if (
        position.x >= platform.position.x - halfSize.x - enemySize &&
        position.x <= platform.position.x + halfSize.x + enemySize &&
        position.z >= platform.position.z - halfSize.z - enemySize &&
        position.z <= platform.position.z + halfSize.z + enemySize &&
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

  const findBetterPosition = (
    currentPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    enemyType: EnemyType,
    speed: number
  ): THREE.Vector3 | null => {
    // Try 8 different directions
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const direction = new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
      ).normalize()

      const testPosition = currentPos.clone().add(direction.multiplyScalar(speed))
      testPosition.y = ENEMY_CONFIGS[enemyType].spawnHeight

      if (!checkTerrainCollision(testPosition, enemyType)) {
        const currentDistance = currentPos.distanceTo(targetPos)
        const newDistance = testPosition.distanceTo(targetPos)

        if (newDistance < currentDistance) {
          return testPosition
        }
      }
    }
    return null
  }

  const updateEnemyPositions = (deltaTime: number) => {
    setEnemies(prev => prev.map(enemy => {
      if (enemy.isSpawning) return enemy

      const config = ENEMY_CONFIGS[enemy.type]
      const lastPos = enemy.lastPosition || enemy.position.clone()
      const movement = enemy.position.distanceTo(lastPos)

      // Check if enemy is stuck
      if (movement < STUCK_THRESHOLD && 
          (enemy.lastDirectionChange === undefined || 
           performance.now() / 1000 - enemy.lastDirectionChange > DIRECTION_CHANGE_INTERVAL)) {
        
        // Try to find a better position
        const betterPosition = findBetterPosition(
          enemy.position,
          playerPosition.current,
          enemy.type,
          config.speed
        )

        if (betterPosition) {
          return {
            ...enemy,
            position: betterPosition,
            lastPosition: enemy.position.clone(),
            lastDirectionChange: performance.now() / 1000
          }
        }
      }

      // Normal movement toward player
      const dirToPlayer = new THREE.Vector3()
        .subVectors(playerPosition.current, enemy.position)
        .normalize()

      const newPosition = enemy.position.clone()
      newPosition.add(dirToPlayer.multiplyScalar(config.speed))
      newPosition.y = config.spawnHeight

      if (checkTerrainCollision(newPosition, enemy.type)) {
        // If direct path is blocked, try to find better position
        const betterPosition = findBetterPosition(
          enemy.position,
          playerPosition.current,
          enemy.type,
          config.speed
        )

        if (betterPosition) {
          return {
            ...enemy,
            position: betterPosition,
            lastPosition: enemy.position.clone(),
            lastDirectionChange: performance.now() / 1000
          }
        }
        return enemy // Stay in place if no better position found
      }

      // Keep within floor boundaries
      newPosition.x = THREE.MathUtils.clamp(newPosition.x, -FLOOR_BOUNDARY, FLOOR_BOUNDARY)
      newPosition.z = THREE.MathUtils.clamp(newPosition.z, -FLOOR_BOUNDARY, FLOOR_BOUNDARY)

      return {
        ...enemy,
        position: newPosition,
        lastPosition: enemy.position.clone()
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
