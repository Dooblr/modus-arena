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
const PLAYER_DAMAGE = 10 // Damage dealt to player
const DAMAGE_COOLDOWN = 0.5 // Reduced cooldown for more consistent damage
const COLLISION_DISTANCE = 1.2 // Distance for collision detection
const WOBBLE_SPEED = 10
const WOBBLE_AMOUNT = 0.4
const INITIAL_HEALTH = 3
const PROJECTILE_COLLISION_DISTANCE = 0.8

export const EnemyManager: FC = () => {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const nextId = useRef(0)
  const lastSpawnTime = useRef(0)
  const lastDamageTime = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  const takeDamage = useGameState(state => state.takeDamage)

  // Function to get a random spawn position on the perimeter
  const getRandomSpawnPosition = () => {
    const angle = Math.random() * Math.PI * 2
    return new THREE.Vector3(
      Math.cos(angle) * SPAWN_RADIUS,
      ENEMY_SIZE / 2,
      Math.sin(angle) * SPAWN_RADIUS
    )
  }

  useFrame(({ scene, clock }, delta) => {
    const currentTime = clock.getElapsedTime()

    // Find player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

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

    // Check for projectile collisions
    const projectiles = scene.children.filter(child => 
      child.name === 'player-projectile'
    )

    // Update enemy positions and check collisions
    setEnemies(prev => 
      prev
        .map(enemy => {
          const direction = new THREE.Vector3()
            .subVectors(playerPosition.current, enemy.position)
            .normalize()
          
          const newPosition = enemy.position.clone().add(
            direction.multiplyScalar(ENEMY_SPEED)
          )

          // Check for projectile collisions
          let newHealth = enemy.health
          projectiles.forEach(projectile => {
            if (projectile.position.distanceTo(enemy.position) < PROJECTILE_COLLISION_DISTANCE) {
              newHealth--
              console.log(`Enemy ${enemy.id} hit! Health: ${newHealth}`)
              projectile.removeFromParent()
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
            return false
          }

          // Check for collision with player
          const distanceToPlayer = enemy.position.distanceTo(playerPosition.current)
          if (distanceToPlayer < COLLISION_DISTANCE && 
              currentTime - lastDamageTime.current >= DAMAGE_COOLDOWN) {
            takeDamage(PLAYER_DAMAGE)
            lastDamageTime.current = currentTime
            return false // Remove enemy on collision
          }
          return true
        })
    )
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
                emissiveIntensity={0.2 + (1 - enemy.health / INITIAL_HEALTH) * 0.3} // Glow more as health decreases
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