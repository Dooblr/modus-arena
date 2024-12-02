import { FC, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useProjectileStore } from '../../hooks/useProjectiles'

interface Enemy2Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

const LASER_COOLDOWN = 2 // seconds
const LASER_SPEED = 0.8
const LASER_COLOR = '#ff0000'

export const Enemy2: FC<Enemy2Props> = ({ position, wobbleOffset, health, maxHealth }) => {
  const lastFireTime = useRef(0)
  const cannonRef = useRef<THREE.Group>(null)
  const spawnProjectile = useProjectileStore(state => state.spawnProjectile)

  // Calculate color transition from red to gray based on health
  const healthPercent = health / maxHealth
  const color = new THREE.Color(0xff0000).lerp(new THREE.Color(0x808080), 1 - healthPercent)

  useFrame(({ scene }) => {
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
            Math.sin(angle) * 0.8,
            0.2,
            Math.cos(angle) * 0.8
          ))

          // Spawn laser projectile
          spawnProjectile(spawnPos, directionToPlayer, 'enemy')
          lastFireTime.current = currentTime
        }
      }
    }
  })

  return (
    <group position={position}>
      {/* Main body */}
      <mesh position={wobbleOffset} castShadow>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Laser cannon */}
      <group ref={cannonRef} position={[0, 0.2, 0]}>
        {/* Cannon base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
          <meshStandardMaterial
            color="#444444"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Cannon barrel */}
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 0.8, 8]} />
          <meshStandardMaterial
            color="#666666"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Energy core */}
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color={LASER_COLOR}
            emissive={LASER_COLOR}
            emissiveIntensity={1}
            metalness={0.2}
            roughness={0.3}
          />
          <pointLight
            color={LASER_COLOR}
            intensity={0.5}
            distance={2}
          />
        </mesh>
      </group>

      {/* Enemy light */}
      <pointLight
        color={color}
        intensity={0.5}
        distance={3}
      />
    </group>
  )
} 