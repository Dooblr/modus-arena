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
const ENEMY_REPULSION_DISTANCE = ENEMY_SIZE * 8 // Increased from 4 to 8
const ENEMY_REPULSION_FORCE = 0.05 // Increased from 0.03 to 0.05

// Color constants
const FULL_HEALTH_COLOR = new THREE.Color('#00ff00') // Green
const NO_HEALTH_COLOR = new THREE.Color('#ff0000') // Red

// Terrain constants
const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }
const ENEMY_RADIUS = ENEMY_SIZE / 2

export const EnemyManager: FC = () => {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const nextId = useRef(0)
  const lastSpawnTime = useRef(0)
  const lastDamageTime = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  const takeDamage = useGameState(state => state.takeDamage)
  const isPaused = useGameState(state => state.isPaused)
  const { playEnemyHitSound, playEnemyDeathSound } = useGameAudio()

  // Function to check if a position collides with terrain
  const checkTerrainCollision = (position: THREE.Vector3) => {
    // Calculate closest point on terrain box to sphere center
    const closestX = Math.max(
      TERRAIN_POSITION.x - TERRAIN_SIZE.x / 2,
      Math.min(position.x, TERRAIN_POSITION.x + TERRAIN_SIZE.x / 2)
    )
    const closestY = Math.max(
      TERRAIN_POSITION.y - TERRAIN_SIZE.y / 2,
      Math.min(position.y, TERRAIN_POSITION.y + TERRAIN_SIZE.y / 2)
    )
    const closestZ = Math.max(
      TERRAIN_POSITION.z - TERRAIN_SIZE.z / 2,
      Math.min(position.z, TERRAIN_POSITION.z + TERRAIN_SIZE.z / 2)
    )

    // Calculate distance from closest point to sphere center
    const distance = Math.sqrt(
      Math.pow(position.x - closestX, 2) +
      Math.pow(position.y - closestY, 2) +
      Math.pow(position.z - closestZ, 2)
    )

    // Collision occurs if distance is less than sphere radius
    return distance < ENEMY_RADIUS
  }

  // Function to calculate path around terrain
  const calculatePathAroundTerrain = (currentPos: THREE.Vector3, targetPos: THREE.Vector3) => {
    const direction = new THREE.Vector3()
      .subVectors(targetPos, currentPos)
      .normalize()

    // Test position after potential move
    const testPosition = currentPos.clone().add(
      direction.clone().multiplyScalar(ENEMY_SPEED)
    )

    // If we're about to hit terrain, try to move around it
    if (checkTerrainCollision(testPosition)) {
      // Determine which side of the terrain we're on
      const sideOffset = currentPos.x < TERRAIN_POSITION.x ? -1 : 1
      
      // Try to move more vertically if we're close to terrain height
      if (Math.abs(currentPos.y - TERRAIN_POSITION.y) < TERRAIN_SIZE.y) {
        direction.y += 0.5
      }
      
      // Add horizontal offset to move around
      direction.x += sideOffset * 0.5
      direction.normalize()

      // If still colliding, try moving more drastically
      const secondTestPosition = currentPos.clone().add(
        direction.clone().multiplyScalar(ENEMY_SPEED)
      )
      if (checkTerrainCollision(secondTestPosition)) {
        direction.x += sideOffset * 1.0
        direction.y += 1.0
        direction.normalize()
      }
    }

    return direction
  }

  // Function to get a random spawn position on the perimeter
  const getRandomSpawnPosition = () => {
    const angle = Math.random() * Math.PI * 2
    const position = new THREE.Vector3(
      Math.cos(angle) * SPAWN_RADIUS,
      ENEMY_SIZE / 2,
      Math.sin(angle) * SPAWN_RADIUS
    )

    // Ensure spawn position doesn't collide with terrain
    if (checkTerrainCollision(position)) {
      position.y = TERRAIN_POSITION.y + TERRAIN_SIZE.y + ENEMY_SIZE
    }

    return position
  }

  // Function to get enemy color based on health
  const getEnemyColor = (health: number) => {
    const healthPercent = health / INITIAL_HEALTH
    const color = new THREE.Color()
    // Start with full health (green) and interpolate to no health (red)
    color.lerpColors(NO_HEALTH_COLOR, FULL_HEALTH_COLOR, healthPercent)
    return color
  }

  // Function to calculate repulsion between enemies
  const calculateEnemyRepulsion = (enemy: Enemy, otherEnemies: Enemy[]) => {
    const repulsion = new THREE.Vector3(0, 0, 0)
    
    for (const other of otherEnemies) {
      if (other.id === enemy.id) continue

      const distance = enemy.position.distanceTo(other.position)
      if (distance < ENEMY_REPULSION_DISTANCE) {
        // Calculate repulsion direction (away from other enemy)
        const direction = new THREE.Vector3()
          .subVectors(enemy.position, other.position)
          .normalize()
        
        // Stronger repulsion force when very close
        const force = Math.pow(1 - distance / ENEMY_REPULSION_DISTANCE, 2) * ENEMY_REPULSION_FORCE
        repulsion.add(direction.multiplyScalar(force))
      }
    }

    return repulsion
  }

  useFrame(({ scene, clock }, delta) => {
    if (isPaused) return

    const currentTime = performance.now() / 1000

    // Find player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

    // Clean up expired explosions
    setExplosions(prev => 
      prev.filter(explosion => currentTime - explosion.startTime < PARTICLE_LIFETIME)
    )

    // Only spawn and update enemies when not paused
    if (!isPaused) {
      // Spawn new enemy
      if (currentTime - lastSpawnTime.current >= SPAWN_INTERVAL) {
        setEnemies(prev => [...prev, {
          id: nextId.current++,
          position: getRandomSpawnPosition(),
          spawnTime: currentTime,
          health: INITIAL_HEALTH
        }])
        lastSpawnTime.current = currentTime
      }

      // Update enemy positions and check collisions
      setEnemies(prev => 
        prev
          .map(enemy => {
            // Calculate base movement direction towards player
            const direction = calculatePathAroundTerrain(enemy.position, playerPosition.current)
            
            // Calculate repulsion from other enemies
            const repulsion = calculateEnemyRepulsion(enemy, prev)
            
            // Combine movement direction with repulsion
            const finalDirection = direction.add(repulsion).normalize()
            
            // Calculate new position
            const newPosition = enemy.position.clone().add(
              finalDirection.multiplyScalar(ENEMY_SPEED)
            )

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
            // Remove enemy if health depleted
            if (enemy.health <= 0) {
              console.log(`Enemy ${enemy.id} destroyed!`)
              playEnemyDeathSound()
              // Add explosion effect
              setExplosions(prev => [...prev, {
                id: nextId.current++,
                position: enemy.position.clone(),
                startTime: currentTime
              }])
              // Spawn XP powerup at enemy position
              if (typeof window !== 'undefined' && (window as any).spawnPowerup) {
                (window as any).spawnPowerup('xp', enemy.position)
              }
              return false
            }

            // Check for collision with player
            const distanceToPlayer = enemy.position.distanceTo(playerPosition.current)
            if (distanceToPlayer < COLLISION_DISTANCE && 
                currentTime - lastDamageTime.current >= DAMAGE_COOLDOWN) {
              takeDamage(PLAYER_DAMAGE)
              lastDamageTime.current = currentTime
              return false
            }
            return true
          })
      )
    }
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

        // Get color based on health
        const enemyColor = getEnemyColor(enemy.health)

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