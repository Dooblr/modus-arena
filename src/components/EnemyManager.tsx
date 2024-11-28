import { FC, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'

interface Enemy {
  id: number
  position: THREE.Vector3
  spawnTime: number
  health: number
}

const SPAWN_INTERVAL = 5 // Spawn every 5 seconds
const ENEMY_SPEED = 0.05
const SPAWN_RADIUS = 20 // Distance from center to spawn enemies
const ENEMY_SIZE = 0.8
const PLAYER_DAMAGE = 10
const DAMAGE_COOLDOWN = 0.5
const COLLISION_DISTANCE = 1.2
const WOBBLE_SPEED = 10
const WOBBLE_AMOUNT = 0.4
const INITIAL_HEALTH = 3
const PROJECTILE_COLLISION_DISTANCE = 0.8

// Terrain constants
const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }
const ENEMY_RADIUS = ENEMY_SIZE / 2

export const EnemyManager: FC = () => {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const nextId = useRef(0)
  const lastSpawnTime = useRef(0)
  const lastDamageTime = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  const takeDamage = useGameState(state => state.takeDamage)
  const isPaused = useGameState(state => state.isPaused)

  // Function to get a random spawn position on the perimeter
  const getRandomSpawnPosition = () => {
    const angle = Math.random() * Math.PI * 2
    return new THREE.Vector3(
      Math.cos(angle) * SPAWN_RADIUS,
      ENEMY_SIZE / 2,
      Math.sin(angle) * SPAWN_RADIUS
    )
  }

  // Check if a sphere collides with terrain box
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

  // Calculate path around terrain to reach player
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

  useFrame(({ scene, clock }, delta) => {
    if (isPaused) return

    const currentTime = clock.getElapsedTime()

    // Find player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

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
            const direction = calculatePathAroundTerrain(enemy.position, playerPosition.current)
            const newPosition = enemy.position.clone().add(
              direction.multiplyScalar(ENEMY_SPEED)
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
              }
            })

            // Only update position if it doesn't result in terrain collision
            return {
              ...enemy,
              position: checkTerrainCollision(newPosition) ? enemy.position : newPosition,
              health: newHealth
            }
          })
          .filter(enemy => {
            // Remove enemy if health depleted
            if (enemy.health <= 0) {
              console.log(`Enemy ${enemy.id} destroyed!`)
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
                color="#00ff00"
                emissive="#00ff00"
                emissiveIntensity={0.2}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
} 