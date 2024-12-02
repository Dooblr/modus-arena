import { FC, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface Enemy3Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

export const Enemy3: FC<Enemy3Props> = ({ position, wobbleOffset, health, maxHealth }) => {
  const legRefs = useRef<THREE.Group[]>([])
  const bodyRef = useRef<THREE.Group>(null)

  // Calculate color transition from purple to black based on health
  const healthPercent = health / maxHealth
  const color = new THREE.Color(0x800080).lerp(new THREE.Color(0x000000), 1 - healthPercent)

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()
    
    // Animate legs
    legRefs.current.forEach((leg, index) => {
      if (leg) {
        // Alternate legs move in opposite phases
        const phase = index % 2 === 0 ? 0 : Math.PI
        const angle = Math.sin(time * 5 + phase) * 0.3
        leg.rotation.x = angle
      }
    })

    // Subtle body movement
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(time * 2) * 0.1
    }
  })

  return (
    <group position={position}>
      {/* Body */}
      <group ref={bodyRef} position={wobbleOffset}>
        {/* Main body */}
        <mesh castShadow>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Head */}
        <mesh position={[0.4, 0.1, 0]} castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Eyes */}
        <mesh position={[0.5, 0.2, 0.15]} castShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.5, 0.2, -0.15]} castShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
        </mesh>

        {/* Legs */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * Math.PI) / 4
          const radius = 0.5
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          
          return (
            <group
              key={i}
              position={[0, 0, 0]}
              rotation={[0, angle, 0]}
              ref={el => { if (el) legRefs.current[i] = el }}
            >
              <mesh castShadow>
                <cylinderGeometry args={[0.05, 0.02, 0.8]} />
                <meshStandardMaterial color={color} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* Light */}
      <pointLight
        color={color}
        intensity={0.5}
        distance={3}
      />
    </group>
  )
} 