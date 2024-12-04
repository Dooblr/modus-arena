import { FC, useState, useRef, useCallback } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGameState } from "../store/gameState"
import { useGameAudio } from "../hooks/useGameAudio"

interface Powerup {
  id: number
  position: THREE.Vector3
  type: "xp" | "health"
  spawnTime: number
  amount: number
}

const POWERUP_SIZE = 0.3
const MAGNETIZE_DISTANCE = 5
const MAGNETIZE_SPEED = 0.2
const COLLECTION_DISTANCE = 0.8
const XP_AMOUNT = 5
const HEALTH_AMOUNT = 20
const POWERUP_LIFETIME = 10 // seconds
const SPAWN_INTERVAL = 15 // seconds
const HEALTH_SPAWN_CHANCE = 0.4 // 40% chance for health pickup vs XP
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
  const isPaused = useGameState((state) => state.isPaused)
  const addXP = useGameState((state) => state.addXP)
  const addHealth = useGameState((state) => state.addHealth)
  const { playPowerupSound } = useGameAudio()

  const spawnPowerup = useCallback(
    (type: "xp" | "health", position?: THREE.Vector3) => {
      if (isPaused) return

      let spawnPos: THREE.Vector3
      if (position) {
        // Use provided position but ensure it's within bounds
        spawnPos = position.clone()
        spawnPos.x = Math.max(
          -FLOOR_BOUNDARY,
          Math.min(FLOOR_BOUNDARY, spawnPos.x)
        )
        spawnPos.z = Math.max(
          -FLOOR_BOUNDARY,
          Math.min(FLOOR_BOUNDARY, spawnPos.z)
        )
      } else {
        // Generate random position
        const angle = Math.random() * Math.PI * 2
        const distance =
          MIN_SPAWN_DISTANCE +
          Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE)
        spawnPos = new THREE.Vector3(
          Math.cos(angle) * distance,
          POWERUP_SIZE,
          Math.sin(angle) * distance
        )
      }

      setPowerups((prev) => [
        ...prev,
        {
          id: nextId.current++,
          position: spawnPos,
          type,
          spawnTime: performance.now() / 1000,
          amount: type === "xp" ? XP_AMOUNT : HEALTH_AMOUNT,
        },
      ])
    },
    [isPaused]
  )

  // Expose spawn functions to other components
  ;(window as any).powerupManager = {
    spawnXPBoost: (position: THREE.Vector3) =>
      spawnPowerup("xp", position),
    spawnHealthBoost: (position: THREE.Vector3) =>
      spawnPowerup("health", position),
  }

  useFrame(({ scene }, delta) => {
    if (isPaused) return

    const currentTime = performance.now() / 1000
    const player = scene.getObjectByName('player')
    
    if (player) {
      playerPosition.current.copy(player.position)

      // Spawn random powerups periodically
      if (currentTime - lastSpawnTime.current >= SPAWN_INTERVAL) {
        const type = Math.random() < HEALTH_SPAWN_CHANCE ? 'health' : 'xp'
        
        // Generate random position at player's height
        const angle = Math.random() * Math.PI * 2
        const distance = MIN_SPAWN_DISTANCE + Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE)
        const spawnPos = new THREE.Vector3(
          Math.cos(angle) * distance,
          playerPosition.current.y,  // Spawn at player's height
          Math.sin(angle) * distance
        )
        
        spawnPowerup(type, spawnPos)
        lastSpawnTime.current = currentTime
      }

      // Update and filter powerups
      setPowerups((prev) =>
        prev
          .map((powerup) => {
            const newPosition = powerup.position.clone()

            // Check if powerup is in magnetize range
            const distanceToPlayer = newPosition.distanceTo(
              playerPosition.current
            )
            if (distanceToPlayer < MAGNETIZE_DISTANCE) {
              // Calculate direction to player
              const direction = new THREE.Vector3()
                .subVectors(playerPosition.current, newPosition)
                .normalize()

              // Move powerup towards player with increasing speed as it gets closer
              const magnetStrength = 1 - distanceToPlayer / MAGNETIZE_DISTANCE
              newPosition.add(
                direction.multiplyScalar(
                  MAGNETIZE_SPEED * magnetStrength * 60 * delta
                )
              )
            }

            return {
              ...powerup,
              position: newPosition,
            }
          })
          .filter((powerup) => {
            // Check collection
            const distanceToPlayer = powerup.position.distanceTo(
              playerPosition.current
            )
            if (distanceToPlayer < COLLECTION_DISTANCE) {
              if (powerup.type === "xp") {
                addXP(powerup.amount)
              } else {
                addHealth(HEALTH_AMOUNT)
              }
              playPowerupSound()
              return false
            }

            // Remove old powerups
            if (currentTime - powerup.spawnTime > POWERUP_LIFETIME) {
              return false
            }

            return true
          })
      )
    }
  })

  return (
    <>
      {powerups.map((powerup) => {
        const color = powerup.type === "xp" ? XP_COLOR : HEALTH_COLOR
        const time = performance.now() / 1000 - powerup.spawnTime
        const scale = 1 + Math.sin(time * 4) * 0.1 // Pulsing effect

        return (
          <group key={powerup.id} position={powerup.position} scale={scale}>
            <mesh castShadow>
              <boxGeometry args={[POWERUP_SIZE, POWERUP_SIZE, POWERUP_SIZE]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            <pointLight color={color} intensity={0.5} distance={2} />
          </group>
        )
      })}
    </>
  )
}
