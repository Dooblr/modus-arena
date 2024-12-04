import { FC, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { ENEMY_CONFIGS } from './index'
import { useCollisionStore } from '../../store/collisionStore'
import type { Collider } from '../../systems/CollisionSystem'

const FULL_HEALTH_COLOR = '#00ff00'
const LOW_HEALTH_COLOR = '#ff0000'
const LEG_COUNT = 8
const LEG_RADIUS = 0.1
const LEG_LENGTH = 0.8
const BODY_RADIUS = 0.75
const ANIMATION_SPEED = 2

interface Enemy3Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

export const Enemy3: FC<Enemy3Props> = ({ position, wobbleOffset = new THREE.Vector3(), health, maxHealth }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const legsRef = useRef<THREE.Group>(null)
  const { addCollider, removeCollider } = useCollisionStore()
  
  useEffect(() => {
    if (!meshRef.current || !position || !wobbleOffset) return

    const collider: Collider = {
      type: 'sphere',
      position: position.clone().add(wobbleOffset),
      size: new THREE.Vector3(ENEMY_CONFIGS.enemy3.size, ENEMY_CONFIGS.enemy3.size, ENEMY_CONFIGS.enemy3.size),
      layer: 'enemy',
      entity: meshRef.current
    }

    addCollider(collider)
    return () => removeCollider(collider)
  }, [position, wobbleOffset, addCollider, removeCollider])

  // Animate legs
  useFrame(({ clock }) => {
    if (legsRef.current) {
      const time = clock.getElapsedTime()
      legsRef.current.children.forEach((leg, index) => {
        const offset = (index / LEG_COUNT) * Math.PI * 2
        const legY = Math.sin(time * ANIMATION_SPEED + offset) * 0.2
        leg.position.y = legY
      })
    }
  })

  const healthPercent = health / maxHealth
  const color = new THREE.Color(LOW_HEALTH_COLOR).lerp(new THREE.Color(FULL_HEALTH_COLOR), healthPercent)

  return (
    <group position={position}>
      {/* Spider body */}
      <mesh ref={meshRef} position={wobbleOffset} castShadow>
        <sphereGeometry args={[BODY_RADIUS, 32, 32]} />
        <meshStandardMaterial 
          color="#222222"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Spider legs */}
      <group ref={legsRef}>
        {Array.from({ length: LEG_COUNT }).map((_, index) => {
          const angle = (index / LEG_COUNT) * Math.PI * 2
          const x = Math.cos(angle) * BODY_RADIUS
          const z = Math.sin(angle) * BODY_RADIUS
          
          return (
            <mesh 
              key={index} 
              position={[x, 0, z]}
              rotation={[0, -angle, Math.PI / 4]}
            >
              <cylinderGeometry args={[LEG_RADIUS, LEG_RADIUS, LEG_LENGTH]} />
              <meshStandardMaterial color="#222222" />
            </mesh>
          )
        })}
      </group>

      {/* Health indicator light */}
      <pointLight
        color={color}
        intensity={0.5}
        distance={2}
      />
    </group>
  )
} 