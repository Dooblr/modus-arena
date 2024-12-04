import { FC, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useProjectileStore } from '../../hooks/useProjectiles'
import { useGameState } from '../../store/gameState'
import { useGameAudio } from '../../hooks/useGameAudio'
import { ENEMY_CONFIGS } from './index'

interface Enemy2Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

const FULL_HEALTH_COLOR = '#808080' // Gray
const LOW_HEALTH_COLOR = '#ff0000'  // Red
const BASE_LASER_COOLDOWN = 2 // base cooldown in seconds
const COOLDOWN_VARIANCE = 0.5 // random variance in seconds (+/-)
const LASER_SPEED = 1.2
const LASER_COLOR = '#ff0000'

export const Enemy2: FC<Enemy2Props> = ({ position, wobbleOffset, health, maxHealth }) => {
  const lastFireTime = useRef(0)
  const cannonRef = useRef<THREE.Group>(null)
  const spawnProjectile = useProjectileStore(state => state.spawnProjectile)
  const isPaused = useGameState(state => state.isPaused)
  const { playEnemyBulletSound } = useGameAudio()

  // Calculate color transition from red to gray based on health
  const healthPercent = health / maxHealth
  const color = new THREE.Color(LOW_HEALTH_COLOR).lerp(new THREE.Color(FULL_HEALTH_COLOR), 1 - healthPercent)

  // Initialize audio
  useEffect(() => {
    // Create a silent audio context on component mount
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    oscillator.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop()
    return () => audioContext.close()
  }, [])

  useFrame(({ scene }) => {
    if (isPaused) return

    // Aim cannon at player
    if (cannonRef.current) {
      const player = scene.getObjectByName('player')
      if (player) {
        const directionToPlayer = new THREE.Vector3()
          .subVectors(player.position, position)
          .normalize()

        // Calculate rotation to face player
        const angle = Math.atan2(directionToPlayer.x, directionToPlayer.z)
        cannonRef.current.rotation.y = angle

        // Fire laser if cooldown has elapsed
        const currentTime = performance.now() / 1000
        if (currentTime - lastFireTime.current >= BASE_LASER_COOLDOWN + COOLDOWN_VARIANCE) {
          // Calculate spawn position at the end of the cannon
          const spawnPos = position.clone()
          spawnPos.add(new THREE.Vector3(
            Math.sin(angle) * 1.2, // Increased offset for larger enemy
            0.2,
            Math.cos(angle) * 1.2
          ))

          // Spawn laser projectile with increased speed
          const direction = directionToPlayer.clone().multiplyScalar(LASER_SPEED)
          spawnProjectile(spawnPos, direction, 'enemy')
          lastFireTime.current = currentTime

          // Play laser sound
          try {
            playEnemyBulletSound()
          } catch (error) {
            console.warn('Failed to play enemy bullet sound:', error)
          }

          // Add muzzle flash effect
          const flash = new THREE.PointLight(LASER_COLOR, 2, 3)
          flash.position.copy(spawnPos)
          scene.add(flash)
          setTimeout(() => scene.remove(flash), 100)
        }
      }
    }
  })

  return (
    <group position={position}>
      {/* Main body - increased size */}
      <mesh position={wobbleOffset} castShadow>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Laser cannon - adjusted for larger size */}
      <group ref={cannonRef} position={[0, 0.4, 0]}>
        {/* Cannon base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.3, 8]} />
          <meshStandardMaterial
            color="#444444"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Cannon barrel */}
        <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 1.2, 8]} />
          <meshStandardMaterial
            color="#666666"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Energy core */}
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial
            color={LASER_COLOR}
            emissive={LASER_COLOR}
            emissiveIntensity={1}
            metalness={0.2}
            roughness={0.3}
          />
          <pointLight
            color={LASER_COLOR}
            intensity={1}
            distance={3}
          />
        </mesh>
      </group>

      {/* Enemy light */}
      <pointLight
        color={color}
        intensity={0.8}
        distance={4}
      />
    </group>
  )
} 