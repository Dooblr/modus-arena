import { FC, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'

interface Enemy {
  id: number
  position: THREE.Vector3
}

const SPAWN_INTERVAL = 5 // Spawn every 5 seconds
const ENEMY_SPEED = 0.05
const SPAWN_RADIUS = 20 // Distance from center to spawn enemies
const ENEMY_SIZE = 0.8
const DAMAGE_AMOUNT = 10
const DAMAGE_COOLDOWN = 1 // Seconds between damage
const COLLISION_DISTANCE = 1.2 // Distance for collision detection

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
      ENEMY_SIZE / 2, // Spawn at ground level
      Math.sin(angle) * SPAWN_RADIUS
    )
  }

  useFrame(({ scene }, delta) => {
    // Find player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

    // Spawn new enemy
    const currentTime = performance.now() / 1000
    if (currentTime - lastSpawnTime.current >= SPAWN_INTERVAL) {
      setEnemies(prev => [...prev, {
        id: nextId.current++,
        position: getRandomSpawnPosition()
      }])
      lastSpawnTime.current = currentTime
    }

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

          return {
            ...enemy,
            position: newPosition
          }
        })
        .filter(enemy => {
          // Check for collision with player
          const distanceToPlayer = enemy.position.distanceTo(playerPosition.current)
          if (distanceToPlayer < COLLISION_DISTANCE && 
              currentTime - lastDamageTime.current >= DAMAGE_COOLDOWN) {
            takeDamage(DAMAGE_AMOUNT)
            lastDamageTime.current = currentTime
            console.log(`Enemy ${enemy.id} collided with player and despawned`)
            return false // Remove this enemy
          }
          return true // Keep this enemy
        })
    )
  })

  return (
    <>
      {enemies.map(enemy => (
        <mesh
          key={enemy.id}
          position={enemy.position}
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
      ))}
    </>
  )
} 