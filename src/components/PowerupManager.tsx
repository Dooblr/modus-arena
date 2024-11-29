import { FC, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { HealthPowerup } from './powerups/HealthPowerup'
import { XPPowerup } from './powerups/XPPowerup'
import { create } from 'zustand'

interface Powerup {
  id: number
  type: 'health' | 'xp'
  position: THREE.Vector3
  spawnTime: number
}

interface PowerupStore {
  spawnPowerup: (type: 'health' | 'xp', position: THREE.Vector3) => void
}

export const usePowerupStore = create<PowerupStore>(() => ({
  spawnPowerup: () => null, // Will be set by PowerupManager
}))

const SPAWN_INTERVAL = 10 // Spawn every 10 seconds
const SPAWN_RADIUS = 15 // Distance from center to spawn powerups
const POWERUP_SIZE = 0.5
const COLLECTION_DISTANCE = 1.5
const POWERUP_LIFETIME = 15 // Powerups disappear after 15 seconds
const POWERUP_HOVER_SPEED = 2
const POWERUP_HOVER_HEIGHT = 0.3
const POWERUP_ROTATION_SPEED = 1

export const PowerupManager: FC = () => {
  const [powerups, setPowerups] = useState<Powerup[]>([])
  const nextId = useRef(0)
  const lastSpawnTime = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  const { addHealth, addXP } = useGameState()
  const isPaused = useGameState(state => state.isPaused)

  // Function to get a random spawn position
  const getRandomSpawnPosition = () => {
    const angle = Math.random() * Math.PI * 2
    return new THREE.Vector3(
      Math.cos(angle) * SPAWN_RADIUS,
      POWERUP_SIZE,
      Math.sin(angle) * SPAWN_RADIUS
    )
  }

  // Randomly choose powerup type
  const getRandomPowerupType = (): 'health' | 'xp' => {
    return Math.random() < 0.7 ? 'health' : 'xp' // 70% chance for health, 30% for xp
  }

  // Register spawn function with the store
  usePowerupStore.setState({
    spawnPowerup: (type: 'health' | 'xp', position: THREE.Vector3) => {
      if (isPaused) return
      setPowerups(prev => [...prev, {
        id: nextId.current++,
        type,
        position: position.clone(),
        spawnTime: Date.now() / 1000
      }])
    }
  })

  useFrame(({ scene, clock }) => {
    if (isPaused) return

    const currentTime = clock.getElapsedTime()

    // Find player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

    // Spawn new random powerup
    if (currentTime - lastSpawnTime.current >= SPAWN_INTERVAL) {
      setPowerups(prev => [...prev, {
        id: nextId.current++,
        type: getRandomPowerupType(),
        position: getRandomSpawnPosition(),
        spawnTime: currentTime
      }])
      lastSpawnTime.current = currentTime
    }

    // Update powerups
    setPowerups(prev => 
      prev.filter(powerup => {
        // Remove expired powerups
        if (currentTime - powerup.spawnTime > POWERUP_LIFETIME) {
          console.log(`Powerup ${powerup.id} expired`)
          return false
        }

        // Check for collection
        const distanceToPlayer = powerup.position.distanceTo(playerPosition.current)
        if (distanceToPlayer < COLLECTION_DISTANCE) {
          if (powerup.type === 'health') {
            addHealth(10)
            console.log('Health powerup collected! Health increased by 10')
          } else {
            addXP(20)
            console.log('XP powerup collected! XP increased by 20')
          }
          return false
        }

        return true
      })
    )
  })

  return (
    <>
      {powerups.map(powerup => {
        const hoverOffset = Math.sin(powerup.spawnTime * POWERUP_HOVER_SPEED) * POWERUP_HOVER_HEIGHT
        const rotationAngle = powerup.spawnTime * POWERUP_ROTATION_SPEED

        return powerup.type === 'health' ? (
          <HealthPowerup
            key={powerup.id}
            position={powerup.position.clone().add(new THREE.Vector3(0, hoverOffset, 0))}
            rotation={[0, rotationAngle, 0]}
          />
        ) : (
          <XPPowerup
            key={powerup.id}
            position={powerup.position.clone().add(new THREE.Vector3(0, hoverOffset, 0))}
            rotation={[0, rotationAngle, 0]}
          />
        )
      })}
    </>
  )
} 