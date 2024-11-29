import { FC, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { useProjectiles } from '../hooks/useProjectiles'
import { useGameAudio } from '../hooks/useGameAudio'
import { useGameState } from '../store/gameState'
import { TERRAIN_SIZE, TERRAIN_POSITION, UPPER_PLATFORM_SIZE, UPPER_PLATFORM_POSITION } from './Terrain'

const MOVEMENT_SPEED = 8
const TURN_SPEED = 2
const JUMP_FORCE = 15
const CAMERA_HEIGHT = 4
const CAMERA_DISTANCE = 10
const PLAYER_HEIGHT = 1
const STRAFE_SPEED = 6
const GRAVITY = -30
const PLAYER_RADIUS = 0.5
const MAX_JUMPS = 2
const SHOOT_INTERVAL = 2.0 // Shoot every 2 seconds

// Terrain constants from Terrain.tsx
const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }

const FLOOR_SIZE = 50 // Size of the floor plane from Scene.tsx
const FLOOR_BOUNDARY = FLOOR_SIZE / 2 - PLAYER_RADIUS // Account for player size

// Platform constants from Platforms.tsx
const PLATFORM_SIZE = { x: 3, y: 0.5, z: 3 }
const PLATFORM_GAP = 4
const PLATFORM_HEIGHT_STEP = 3
const PLATFORM_COUNT = 5
const PLATFORM_START = { x: -8, y: PLATFORM_SIZE.y / 2, z: -8 }

interface Platform {
  size: { x: number; y: number; z: number }
  position: { x: number; y: number; z: number }
}

export const Player: FC = () => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const playerRotation = useRef(0)
  const jumpCount = useRef(0)
  const wasJumpPressed = useRef(false)
  const velocity = useRef(new THREE.Vector3())
  const lastShootTime = useRef(0)
  const isPaused = useGameState(state => state.isPaused)
  const healthRegenRate = useGameState(state => state.healthRegenRate)
  const moveSpeedMultiplier = useGameState(state => state.moveSpeedMultiplier)
  const attackSpeedMultiplier = useGameState(state => state.attackSpeedMultiplier)
  const addHealth = useGameState(state => state.addHealth)
  const lastRegenTime = useRef(0)

  const { forward, backward, left, right, strafeLeft, strafeRight, jump } = useKeyboard()
  const { spawnPlayerProjectile } = useProjectiles()
  const { playBulletSound } = useGameAudio()

  // Function to check collision with a platform
  const handlePlatformCollision = (
    platform: Platform,
    position: THREE.Vector3,
    nextPosition: THREE.Vector3
  ) => {
    const platformMinX = platform.position.x - platform.size.x / 2
    const platformMaxX = platform.position.x + platform.size.x / 2
    const platformMinZ = platform.position.z - platform.size.z / 2
    const platformMaxZ = platform.position.z + platform.size.z / 2
    const platformTop = platform.position.y + platform.size.y / 2
    const platformBottom = platform.position.y - platform.size.y / 2

    // Check if player is within platform XZ bounds
    const inPlatformXBounds = nextPosition.x + PLAYER_RADIUS > platformMinX && 
                            nextPosition.x - PLAYER_RADIUS < platformMaxX
    const inPlatformZBounds = nextPosition.z + PLAYER_RADIUS > platformMinZ && 
                            nextPosition.z - PLAYER_RADIUS < platformMaxZ

    if (inPlatformXBounds && inPlatformZBounds) {
      // Landing on top of platform
      if (position.y > platformTop && nextPosition.y <= platformTop + PLAYER_HEIGHT / 2) {
        nextPosition.y = platformTop + PLAYER_HEIGHT / 2
        velocity.current.y = 0
        jumpCount.current = 0
        return true
      }
      // Hitting bottom of platform
      else if (position.y < platformBottom && nextPosition.y >= platformBottom - PLAYER_HEIGHT / 2) {
        nextPosition.y = platformBottom - PLAYER_HEIGHT / 2
        velocity.current.y = 0
        return true
      }
      // Side collision when at platform height
      else if (nextPosition.y < platformTop && nextPosition.y > platformBottom) {
        if (position.x < platformMinX) {
          nextPosition.x = platformMinX - PLAYER_RADIUS
          velocity.current.x = Math.min(0, velocity.current.x)
        }
        else if (position.x > platformMaxX) {
          nextPosition.x = platformMaxX + PLAYER_RADIUS
          velocity.current.x = Math.max(0, velocity.current.x)
        }
        if (position.z < platformMinZ) {
          nextPosition.z = platformMinZ - PLAYER_RADIUS
          velocity.current.z = Math.min(0, velocity.current.z)
        }
        else if (position.z > platformMaxZ) {
          nextPosition.z = platformMaxZ + PLAYER_RADIUS
          velocity.current.z = Math.max(0, velocity.current.z)
        }
        return true
      }
    }
    return false
  }

  useFrame((_, delta) => {
    if (!meshRef.current || !cameraRef.current || isPaused) return
    
    const position = meshRef.current.position

    // Apply health regeneration
    if (healthRegenRate > 0) {
      const currentTime = performance.now() / 1000
      if (currentTime - lastRegenTime.current >= 1) { // Check every second
        addHealth(healthRegenRate)
        lastRegenTime.current = currentTime
      }
    }

    // Rotate player with A/D
    if (left) playerRotation.current += TURN_SPEED * 0.02
    if (right) playerRotation.current -= TURN_SPEED * 0.02
    meshRef.current.rotation.y = playerRotation.current

    // Calculate movement directions
    const forward_x = Math.sin(playerRotation.current)
    const forward_z = Math.cos(playerRotation.current)
    const right_x = Math.cos(playerRotation.current)
    const right_z = -Math.sin(playerRotation.current)

    // Calculate movement with speed multiplier
    let moveX = 0
    let moveZ = 0

    if (forward) {
      moveX += forward_x * MOVEMENT_SPEED * moveSpeedMultiplier
      moveZ += forward_z * MOVEMENT_SPEED * moveSpeedMultiplier
    }
    if (backward) {
      moveX -= forward_x * MOVEMENT_SPEED * moveSpeedMultiplier
      moveZ -= forward_z * MOVEMENT_SPEED * moveSpeedMultiplier
    }
    if (strafeLeft) {
      moveX += right_x * STRAFE_SPEED * moveSpeedMultiplier
      moveZ += right_z * STRAFE_SPEED * moveSpeedMultiplier
    }
    if (strafeRight) {
      moveX -= right_x * STRAFE_SPEED * moveSpeedMultiplier
      moveZ -= right_z * STRAFE_SPEED * moveSpeedMultiplier
    }

    // Apply horizontal movement
    velocity.current.x = moveX
    velocity.current.z = moveZ

    // Handle jumping
    if (jump && !wasJumpPressed.current && jumpCount.current < MAX_JUMPS) {
      velocity.current.y = JUMP_FORCE
      jumpCount.current++
    }
    wasJumpPressed.current = jump

    // Apply gravity
    velocity.current.y += GRAVITY * delta

    // Calculate next position
    const nextPosition = new THREE.Vector3(
      position.x + velocity.current.x * delta,
      position.y + velocity.current.y * delta,
      position.z + velocity.current.z * delta
    )

    // Ground collision
    const groundY = PLAYER_HEIGHT / 2
    if (nextPosition.y <= groundY) {
      nextPosition.y = groundY
      velocity.current.y = 0
      jumpCount.current = 0
    }

    // Check collisions with both platforms
    const mainPlatform = { size: TERRAIN_SIZE, position: TERRAIN_POSITION }
    const upperPlatform = { size: UPPER_PLATFORM_SIZE, position: UPPER_PLATFORM_POSITION }

    handlePlatformCollision(mainPlatform, position, nextPosition)
    handlePlatformCollision(upperPlatform, position, nextPosition)

    // Update position
    meshRef.current.position.copy(nextPosition)

    // Update camera
    const cameraX = position.x - Math.sin(playerRotation.current) * CAMERA_DISTANCE
    const cameraY = position.y + CAMERA_HEIGHT
    const cameraZ = position.z - Math.cos(playerRotation.current) * CAMERA_DISTANCE

    cameraRef.current.position.set(cameraX, cameraY, cameraZ)
    cameraRef.current.lookAt(position)

    // Continuous shooting with sound and attack speed multiplier
    const currentTime = performance.now() / 1000
    if (currentTime - lastShootTime.current >= SHOOT_INTERVAL * attackSpeedMultiplier) {
      const shootDirection = new THREE.Vector3(
        Math.sin(playerRotation.current),
        0,
        Math.cos(playerRotation.current)
      ).normalize()
      
      const shootPosition = position.clone().add(
        new THREE.Vector3(
          shootDirection.x * 1.5,
          PLAYER_HEIGHT / 2,
          shootDirection.z * 1.5
        )
      )
      
      spawnPlayerProjectile(shootPosition, shootDirection)
      playBulletSound()
      lastShootTime.current = currentTime
    }
  })

  return (
    <>
      <PerspectiveCamera 
        ref={cameraRef} 
        makeDefault 
        position={[0, CAMERA_HEIGHT, CAMERA_DISTANCE]}
        fov={75}
      />
      
      <mesh 
        ref={meshRef}
        position={[0, PLAYER_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
        name="player"
      >
        <boxGeometry args={[1, PLAYER_HEIGHT, 1]} />
        <meshStandardMaterial 
          color="#000000"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <ambientLight intensity={0.5} />
    </>
  )
} 