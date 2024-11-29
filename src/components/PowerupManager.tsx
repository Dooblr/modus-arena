import { FC, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameState } from '../store/gameState'
import { useGameAudio } from '../hooks/useGameAudio'

interface Powerup {
  id: number
  position: THREE.Vector3
  type: 'xp'
  spawnTime: number
}

const POWERUP_SIZE = 0.3
const MAGNETIZE_DISTANCE = 5
const MAGNETIZE_SPEED = 0.2
const COLLECTION_DISTANCE = 0.8
const XP_AMOUNT = 20
const POWERUP_LIFETIME = 10 // seconds
const XP_COLOR = '#00ffff'

export const PowerupManager: FC = () => {
  const [powerups, setPowerups] = useState<Powerup[]>([])
  const nextId = useRef(0)
  const playerPosition = useRef(new THREE.Vector3())
  const addXP = useGameState(state => state.addXP)
  const isPaused = useGameState(state => state.isPaused)
  const { playPowerupSound } = useGameAudio()

  // Function to spawn a new powerup
  const spawnPowerup = (type: 'xp', position: THREE.Vector3) => {
    setPowerups(prev => [...prev, {
      id: nextId.current++,
      position: position.clone(),
      type,
      spawnTime: Date.now() / 1000
    }])
  }

  // Make spawnPowerup available globally
  if (typeof window !== 'undefined') {
    (window as any).spawnPowerup = spawnPowerup
  }

  useFrame(({ scene }, delta) => {
    if (isPaused) return

    const currentTime = Date.now() / 1000

    // Update player position
    const player = scene.getObjectByName('player')
    if (player) {
      playerPosition.current.copy(player.position)
    }

    // Update powerups
    setPowerups(prev => 
      prev
        .filter(powerup => {
          // Remove expired powerups
          if (currentTime - powerup.spawnTime > POWERUP_LIFETIME) {
            return false
          }

          const distanceToPlayer = powerup.position.distanceTo(playerPosition.current)

          // Collect powerup if close enough
          if (distanceToPlayer < COLLECTION_DISTANCE) {
            if (powerup.type === 'xp') {
              addXP(XP_AMOUNT)
              playPowerupSound()
            }
            return false
          }

          return true
        })
        .map(powerup => {
          const distanceToPlayer = powerup.position.distanceTo(playerPosition.current)

          // Magnetize towards player if within range
          if (distanceToPlayer < MAGNETIZE_DISTANCE) {
            const direction = new THREE.Vector3()
              .subVectors(playerPosition.current, powerup.position)
              .normalize()
              .multiplyScalar(MAGNETIZE_SPEED * (1 - distanceToPlayer / MAGNETIZE_DISTANCE))

            powerup.position.add(direction)
          }

          return powerup
        })
    )
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
            color={XP_COLOR}
            emissive={XP_COLOR}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </>
  )
} 