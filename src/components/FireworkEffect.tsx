import { FC, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface FireworkProps {
  position: THREE.Vector3
  color?: string
}

const PARTICLE_COUNT = 50
const EXPLOSION_FORCE = 5
const PARTICLE_SIZE = 0.1
const PARTICLE_LIFETIME = 1 // seconds
const GRAVITY = -5

export const FireworkEffect: FC<FireworkProps> = ({ position, color = '#00ff00' }) => {
  const particlesRef = useRef<THREE.Points>(null)
  const startTime = useRef(Date.now())
  
  // Create particles with initial velocities
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Array(PARTICLE_COUNT).fill(0).map(() => {
      // Random direction
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).multiplyScalar(EXPLOSION_FORCE * (0.5 + Math.random() * 0.5))
    })

    // Set initial positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z
    }

    return { positions, velocities }
  }, [position])

  useFrame(() => {
    if (!particlesRef.current) return

    const geometry = particlesRef.current.geometry
    const positions = geometry.attributes.position.array as Float32Array
    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / PARTICLE_LIFETIME, 1)

    // Update particle positions based on velocities and gravity
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const velocity = velocities[i]
      const idx = i * 3

      positions[idx] = position.x + velocity.x * elapsed
      positions[idx + 1] = position.y + velocity.y * elapsed + 0.5 * GRAVITY * elapsed * elapsed
      positions[idx + 2] = position.z + velocity.z * elapsed
    }

    geometry.attributes.position.needsUpdate = true
    
    // Fade out particles over time
    const material = particlesRef.current.material as THREE.PointsMaterial
    material.opacity = 1 - progress
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={PARTICLE_SIZE}
        color={color}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
} 