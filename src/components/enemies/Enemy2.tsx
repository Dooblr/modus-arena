import { FC, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useProjectileStore } from '../../hooks/useProjectiles'
import { useGameState } from '../../store/gameState'
import { useGameAudio } from '../../hooks/useGameAudio'

interface Enemy2Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

const LASER_COOLDOWN = 2 // seconds
const LASER_SPEED = 1.2 // Increased speed
const LASER_COLOR = '#ff0000'

export const Enemy2: FC<Enemy2Props> = ({ position, wobbleOffset, health, maxHealth }) => {
  const lastFireTime = useRef(0)
  const cannonRef = useRef<THREE.Group>(null)
  const spawnProjectile = useProjectileStore(state => state.spawnProjectile)
  const isPaused = useGameState(state => state.isPaused)
  const { playEnemyBulletSound } = useGameAudio()

  // Calculate color transition from red to gray based on health
  const healthPercent = health / maxHealth
  const color = new THREE.Color(0xff0000).lerp(new THREE.Color(0x808080), 1 - healthPercent)

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
        if (currentTime - lastFireTime.current >= LASER_COOLDOWN) {
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
          playEnemyBulletSound()

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