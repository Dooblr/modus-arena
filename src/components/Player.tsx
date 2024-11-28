import { FC, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { useProjectiles } from '../hooks/useProjectiles'
import { useGameAudio } from '../hooks/useGameAudio'

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

export const Player: FC = () => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const playerRotation = useRef(0)
  const jumpCount = useRef(0)
  const wasJumpPressed = useRef(false)
  const velocity = useRef(new THREE.Vector3())
  const lastShootTime = useRef(0)

  const { forward, backward, left, right, strafeLeft, strafeRight, jump } = useKeyboard()
  const { spawnPlayerProjectile } = useProjectiles()
  const { playBulletSound } = useGameAudio()

  useFrame((_, delta) => {
    if (!meshRef.current || !cameraRef.current) return

    const position = meshRef.current.position

    // Rotate player with A/D
    if (left) playerRotation.current += TURN_SPEED * 0.02
    if (right) playerRotation.current -= TURN_SPEED * 0.02
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
      moveX += forward_x * MOVEMENT_SPEED
      moveZ += forward_z * MOVEMENT_SPEED
    }
    if (backward) {
      moveX -= forward_x * MOVEMENT_SPEED
      moveZ -= forward_z * MOVEMENT_SPEED
    }
    if (strafeLeft) {
      moveX += right_x * STRAFE_SPEED
      moveZ += right_z * STRAFE_SPEED
    }
    if (strafeRight) {
      moveX -= right_x * STRAFE_SPEED
      moveZ -= right_z * STRAFE_SPEED
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

    // Terrain boundaries
    const terrainMinX = TERRAIN_POSITION.x - TERRAIN_SIZE.x / 2
    const terrainMaxX = TERRAIN_POSITION.x + TERRAIN_SIZE.x / 2
    const terrainMinZ = TERRAIN_POSITION.z - TERRAIN_SIZE.z / 2
    const terrainMaxZ = TERRAIN_POSITION.z + TERRAIN_SIZE.z / 2
    const terrainTop = TERRAIN_POSITION.y + TERRAIN_SIZE.y / 2

    // Check if player is within terrain XZ bounds (with buffer for player size)
    const inTerrainXBounds = nextPosition.x + PLAYER_RADIUS > terrainMinX && 
                           nextPosition.x - PLAYER_RADIUS < terrainMaxX
    const inTerrainZBounds = nextPosition.z + PLAYER_RADIUS > terrainMinZ && 
                           nextPosition.z - PLAYER_RADIUS < terrainMaxZ

    // Ground collision
    const groundY = PLAYER_HEIGHT / 2
    if (nextPosition.y <= groundY) {
      nextPosition.y = groundY
      velocity.current.y = 0
      jumpCount.current = 0
    }

    // Terrain collision handling
    if (inTerrainXBounds && inTerrainZBounds) {
      // Check if we're above the terrain and falling onto it
      if (position.y > terrainTop && nextPosition.y <= terrainTop + PLAYER_HEIGHT / 2) {
        nextPosition.y = terrainTop + PLAYER_HEIGHT / 2
        velocity.current.y = 0
        jumpCount.current = 0
      }
      // Block side movement if we're at terrain height
      else if (nextPosition.y < terrainTop) {
        // Determine which side we're coming from and block accordingly
        if (position.x < terrainMinX) {
          nextPosition.x = terrainMinX - PLAYER_RADIUS
          velocity.current.x = Math.min(0, velocity.current.x)
        }
        else if (position.x > terrainMaxX) {
          nextPosition.x = terrainMaxX + PLAYER_RADIUS
          velocity.current.x = Math.max(0, velocity.current.x)
        }
        if (position.z < terrainMinZ) {
          nextPosition.z = terrainMinZ - PLAYER_RADIUS
          velocity.current.z = Math.min(0, velocity.current.z)
        }
        else if (position.z > terrainMaxZ) {
          nextPosition.z = terrainMaxZ + PLAYER_RADIUS
          velocity.current.z = Math.max(0, velocity.current.z)
        }
      }
    }

    // Apply final position
    position.copy(nextPosition)

    // Update camera
    const cameraX = position.x - Math.sin(playerRotation.current) * CAMERA_DISTANCE
    const cameraY = position.y + CAMERA_HEIGHT
    const cameraZ = position.z - Math.cos(playerRotation.current) * CAMERA_DISTANCE

    cameraRef.current.position.set(cameraX, cameraY, cameraZ)
    cameraRef.current.lookAt(position)

    // Continuous shooting with sound
    const currentTime = performance.now() / 1000
    if (currentTime - lastShootTime.current >= SHOOT_INTERVAL) {
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
      >
        <boxGeometry args={[1, PLAYER_HEIGHT, 1]} />
        <meshStandardMaterial color="#1e88e5" emissive="#1e88e5" emissiveIntensity={0.2} />
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