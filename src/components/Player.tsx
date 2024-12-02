import { FC, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { useProjectiles } from '../hooks/useProjectiles'
import { useGameAudio } from '../hooks/useGameAudio'
import { useGameState } from '../store/gameState'
import { ALL_PLATFORMS } from './Terrain'

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
const SHOOT_INTERVAL = 1.0
const SECOND_PLATFORM_HEIGHT = 8

// Floor boundaries
const FLOOR_SIZE = 50
const FLOOR_BOUNDARY = (FLOOR_SIZE / 2) - PLAYER_RADIUS

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
  const lastDamageTime = useRef(0)
  const damageFlashRef = useRef<THREE.Material | null>(null)
  const health = useGameState(state => state.health)
  const isPaused = useGameState(state => state.isPaused)
  const healthRegenRate = useGameState(state => state.healthRegenRate)
  const moveSpeedMultiplier = useGameState(state => state.moveSpeedMultiplier)
  const attackSpeedMultiplier = useGameState(state => state.attackSpeedMultiplier)
  const addHealth = useGameState(state => state.addHealth)
  const lastRegenTime = useRef(0)
  const wasAboveSecondPlatform = useRef(false)
  const setBreachedSecondPlatform = useGameState(state => state.setBreachedSecondPlatform)

  const { forward, backward, left, right, strafeLeft, strafeRight, jump } = useKeyboard()
  const { spawnPlayerProjectile } = useProjectiles()
  const { playBulletSound } = useGameAudio()

  // Track previous health to detect damage
  const prevHealth = useRef(health)

  useEffect(() => {
    if (health < prevHealth.current) {
      // Player took damage
      lastDamageTime.current = performance.now() / 1000
      if (meshRef.current && meshRef.current.material) {
        damageFlashRef.current = meshRef.current.material
      }
    }
    prevHealth.current = health
  }, [health])

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
      if (currentTime - lastRegenTime.current >= 1) {
        addHealth(healthRegenRate)
        lastRegenTime.current = currentTime
      }
    }

    // Handle movement and rotation
    if (left) playerRotation.current += TURN_SPEED * delta
    if (right) playerRotation.current -= TURN_SPEED * delta
    meshRef.current.rotation.y = playerRotation.current

    // Calculate movement directions
    const forward_x = Math.sin(playerRotation.current)
    const forward_z = Math.cos(playerRotation.current)
    const right_x = Math.cos(playerRotation.current)
    const right_z = -Math.sin(playerRotation.current)

    // Calculate movement
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

    // Check collisions with all platforms
    let hasCollision = false
    for (const platform of ALL_PLATFORMS) {
      if (handlePlatformCollision(platform, position, nextPosition)) {
        hasCollision = true
        break
      }
    }

    // Enforce floor boundaries
    if (!hasCollision) {
      nextPosition.x = Math.max(-FLOOR_BOUNDARY, Math.min(FLOOR_BOUNDARY, nextPosition.x))
      nextPosition.z = Math.max(-FLOOR_BOUNDARY, Math.min(FLOOR_BOUNDARY, nextPosition.z))
    }

    // Update position
    meshRef.current.position.copy(nextPosition)

    // Update camera position
    if (cameraRef.current) {
      const cameraPosition = new THREE.Vector3(
        nextPosition.x - Math.sin(playerRotation.current) * CAMERA_DISTANCE,
        nextPosition.y + CAMERA_HEIGHT,
        nextPosition.z - Math.cos(playerRotation.current) * CAMERA_DISTANCE
      )
      cameraRef.current.position.copy(cameraPosition)
      cameraRef.current.lookAt(nextPosition)
    }

    // Handle shooting
    const currentTime = performance.now() / 1000
    if (currentTime - lastShootTime.current >= SHOOT_INTERVAL * attackSpeedMultiplier) {
      const shootDirection = new THREE.Vector3(
        Math.sin(playerRotation.current),
        0,
        Math.cos(playerRotation.current)
      )
      spawnPlayerProjectile(nextPosition.clone(), shootDirection)
      playBulletSound()
      lastShootTime.current = currentTime
    }

    // Handle damage flash effect
    const timeSinceDamage = currentTime - lastDamageTime.current
    if (damageFlashRef.current && timeSinceDamage < 0.2) {
      // Flash red for 0.2 seconds
      const flashIntensity = Math.max(0, 1 - timeSinceDamage * 5)
      damageFlashRef.current.emissive = new THREE.Color(0xff0000).multiplyScalar(flashIntensity)
    } else if (damageFlashRef.current) {
      damageFlashRef.current.emissive = new THREE.Color(0x000000)
    }

    // Check if player has crossed the second platform height threshold
    const isAboveSecondPlatform = meshRef.current.position.y > SECOND_PLATFORM_HEIGHT
    if (isAboveSecondPlatform !== wasAboveSecondPlatform.current) {
      console.log(`Player is ${isAboveSecondPlatform ? 'now above' : 'now below'} the second platform`)
      wasAboveSecondPlatform.current = isAboveSecondPlatform
      setBreachedSecondPlatform(isAboveSecondPlatform)
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
          emissive="#000000"
          emissiveIntensity={1}
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