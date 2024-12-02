import { FC, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SpawnAnimationProps {
  position: THREE.Vector3
  onComplete: () => void
}

const ANIMATION_DURATION = 3 // seconds
const CYLINDER_HEIGHT = 3
const CYLINDER_RADIUS = 0.8
const CYLINDER_COLOR = '#00ffff'

export const SpawnAnimation: FC<SpawnAnimationProps> = ({ position, onComplete }) => {
  const startTime = useRef(performance.now() / 1000)
  const topPartRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    const currentTime = performance.now() / 1000
    const elapsed = currentTime - startTime.current
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

    if (topPartRef.current) {
      // Move top part up and down with a sine wave
      const heightOffset = Math.sin(progress * Math.PI * 4) * 0.5 * (1 - progress)
      topPartRef.current.position.y = CYLINDER_HEIGHT + heightOffset
    }

    if (progress === 1) {
      onComplete()
    }
  })

  return (
    <group position={position}>
      {/* Bottom circle */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CYLINDER_RADIUS - 0.1, CYLINDER_RADIUS, 32]} />
        <meshBasicMaterial color={CYLINDER_COLOR} transparent opacity={0.5} />
      </mesh>

      {/* Top circle */}
      <mesh ref={topPartRef} position={[0, CYLINDER_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CYLINDER_RADIUS - 0.1, CYLINDER_RADIUS, 32]} />
        <meshBasicMaterial color={CYLINDER_COLOR} transparent opacity={0.5} />
      </mesh>

      {/* Connecting lines */}
      {[0, Math.PI/2, Math.PI, Math.PI*3/2].map((angle, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                Math.cos(angle) * CYLINDER_RADIUS, 0, Math.sin(angle) * CYLINDER_RADIUS,
                Math.cos(angle) * CYLINDER_RADIUS, CYLINDER_HEIGHT, Math.sin(angle) * CYLINDER_RADIUS
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={CYLINDER_COLOR} transparent opacity={0.3} />
        </line>
      ))}

      {/* Center beam */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, CYLINDER_HEIGHT, 8]} />
        <meshBasicMaterial color={CYLINDER_COLOR} transparent opacity={0.2} />
      </mesh>

      {/* Light effect */}
      <pointLight color={CYLINDER_COLOR} intensity={2} distance={3} />
    </group>
  )
} 