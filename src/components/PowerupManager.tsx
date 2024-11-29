import { FC, useState, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { useGameAudio } from '../hooks/useGameAudio'

interface Powerup {
  id: number
  position: THREE.Vector3
  type: 'xp' | 'health'
  spawnTime: number
}

const POWERUP_SIZE = 0.3
const MAGNETIZE_DISTANCE = 5
const MAGNETIZE_SPEED = 0.2
const COLLECTION_DISTANCE = 0.8
const XP_AMOUNT = 20
const HEALTH_AMOUNT = 20
const POWERUP_LIFETIME = 10 // seconds
const SPAWN_INTERVAL = 10 // seconds
const MIN_SPAWN_DISTANCE = 5 // Minimum distance from player
const MAX_SPAWN_DISTANCE = 15 // Maximum distance from player
const XP_COLOR = '#00ffff'
const HEALTH_COLOR = '#ff0088'

// Floor boundaries
const FLOOR_SIZE = 50
const FLOOR_BOUNDARY = FLOOR_SIZE / 2 - 1 // Keep powerups 1 unit from edge

export const PowerupManager: FC = () => {
  const [powerups, setPowerups] = useState<Powerup[]>([])
  const nextId = useRef(0)
  const lastSpawnTime = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  
  const isPaused = useGameState(state => state.isPaused)
  const addXP = useGameState(state => state.addXP)
  const addHealth = useGameState(state => state.addHealth)
  const { playPowerupSound } = useGameAudio()

  // Function to clamp a position within floor boundaries
  const clampToFloorBounds = (position: THREE.Vector3) => {
    position.x = Math.max(-FLOOR_BOUNDARY, Math.min(FLOOR_BOUNDARY, position.x))
    position.z = Math.max(-FLOOR_BOUNDARY, Math.min(FLOOR_BOUNDARY, position.z))
    return position
  }

  // Get a random spawn position relative to player
  const getRandomSpawnPosition = useCallback((playerPos: THREE.Vector3) => {
    const angle = Math.random() * Math.PI * 2
    const distance = MIN_SPAWN_DISTANCE + Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE)
    
    // Calculate initial position
    const position = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      playerPos.y,
      playerPos.z + Math.sin(angle) * distance
    )

    // Clamp to floor boundaries
    return clampToFloorBounds(position)
  }, [])

  // Memoize spawn function to prevent recreation on each render
  const spawnPowerup = useCallback((type: 'xp' | 'health', position: THREE.Vector3) => {
    // Ensure position is within bounds
    const clampedPosition = clampToFloorBounds(position.clone())
    
    setPowerups(prev => [...prev, {
      id: nextId.current++,
      position: clampedPosition,
      type,
      spawnTime: Date.now() / 1000
    }])
  }, [])

  // Make spawnPowerup available globally for enemy drops
  if (typeof window !== 'undefined') {
    (window as any).spawnPowerup = (type: 'xp' | 'health', position: THREE.Vector3) => {
      // For enemy drops, use the enemy's position but match player's height and clamp to bounds
      const spawnPos = position.clone()
      spawnPos.y = playerPosition.current.y
      spawnPowerup(type, clampToFloorBounds(spawnPos))
    }
  }

  useFrame(({ scene }, delta) => {
    if (isPaused) return

    const currentTime = Date.now() / 1000

    // Update player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

    // Randomly spawn health powerups
    if (currentTime - lastSpawnTime.current >= SPAWN_INTERVAL) {
      spawnPowerup('health', getRandomSpawnPosition(playerPosition.current))
      lastSpawnTime.current = currentTime
    }

    // Update powerups in a single batch
    setPowerups(prev => {
      let needsUpdate = false
      const updatedPowerups = prev.filter(powerup => {
        // Remove expired powerups
        if (currentTime - powerup.spawnTime > POWERUP_LIFETIME) {
          needsUpdate = true
          return false
        }

        const distanceToPlayer = powerup.position.distanceTo(playerPosition.current)

        // Collect powerup if close enough
        if (distanceToPlayer < COLLECTION_DISTANCE) {
          if (powerup.type === 'xp') {
            addXP(XP_AMOUNT)
          } else if (powerup.type === 'health') {
            addHealth(HEALTH_AMOUNT)
          }
          playPowerupSound()
          needsUpdate = true
          return false
        }

        // Magnetize towards player if within range
        if (distanceToPlayer < MAGNETIZE_DISTANCE) {
          const direction = new THREE.Vector3()
            .subVectors(playerPosition.current, powerup.position)
            .normalize()
            .multiplyScalar(MAGNETIZE_SPEED * (1 - distanceToPlayer / MAGNETIZE_DISTANCE))

          // Update position and clamp to bounds
          powerup.position.add(direction)
          clampToFloorBounds(powerup.position)
          needsUpdate = true
        }

        return true
      })

      return needsUpdate ? updatedPowerups : prev
    })
  })

  return (
    <>
      {powerups.map(powerup => (
        <mesh
          key={powerup.id}
          position={powerup.position}
        >
          <octahedronGeometry args={[POWERUP_SIZE]} />
          <meshStandardMaterial
            color={powerup.type === 'xp' ? XP_COLOR : HEALTH_COLOR}
            emissive={powerup.type === 'xp' ? XP_COLOR : HEALTH_COLOR}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </>
  )
} 