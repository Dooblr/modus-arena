import { FC, useRef, useEffect, useState } from 'react'
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
const STUCK_THRESHOLD = 0.01  // Minimum movement to be considered "stuck"
const DIRECTION_CHANGE_TIME = 1.0  // How long to try each new direction
const ALTERNATIVE_DIRECTIONS = [
  new THREE.Vector3(1, 0, 0),   // right
  new THREE.Vector3(-1, 0, 0),  // left
  new THREE.Vector3(0, 0, 1),   // forward
  new THREE.Vector3(0, 0, -1),  // backward
  new THREE.Vector3(1, 0, 1),   // diagonal
  new THREE.Vector3(-1, 0, 1),  // diagonal
  new THREE.Vector3(1, 0, -1),  // diagonal
  new THREE.Vector3(-1, 0, -1)  // diagonal
].map(v => v.normalize())

interface Enemy3Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

export const Enemy3: FC<Enemy3Props> = ({ position, wobbleOffset = new THREE.Vector3(), health, maxHealth }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const legsRef = useRef<THREE.Group>(null)
  const lastPosition = useRef(position.clone())
  const stuckTime = useRef(0)
  const currentDirectionIndex = useRef(0)
  const [isStuck, setIsStuck] = useState(false)
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

  // Movement and stuck detection
  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return

    // Check if enemy is stuck by measuring movement
    const currentPosition = meshRef.current.position
    const movement = currentPosition.distanceTo(lastPosition.current)

    if (movement < STUCK_THRESHOLD * delta) {
      stuckTime.current += delta
      if (stuckTime.current >= DIRECTION_CHANGE_TIME) {
        // Time to try a new direction
        currentDirectionIndex.current = (currentDirectionIndex.current + 1) % ALTERNATIVE_DIRECTIONS.length
        stuckTime.current = 0
        setIsStuck(true)
      }
    } else {
      stuckTime.current = 0
      setIsStuck(false)
    }

    // Animate legs with speed variation based on movement
    if (legsRef.current) {
      const time = clock.getElapsedTime()
      const animationSpeed = isStuck ? ANIMATION_SPEED * 2 : ANIMATION_SPEED
      legsRef.current.children.forEach((leg, index) => {
        const offset = (index / LEG_COUNT) * Math.PI * 2
        const legY = Math.sin(time * animationSpeed + offset) * 0.2
        leg.position.y = legY
      })
    }

    // Store current position for next frame's comparison
    lastPosition.current.copy(currentPosition)
  })

  const healthPercent = health / maxHealth
  const color = new THREE.Color(LOW_HEALTH_COLOR).lerp(new THREE.Color(FULL_HEALTH_COLOR), healthPercent)

  // Visual feedback for stuck state
  const bodyColor = isStuck ? "#442222" : "#222222"

  return (
    <group position={position}>
      {/* Spider body */}
      <mesh ref={meshRef} position={wobbleOffset} castShadow>
        <sphereGeometry args={[BODY_RADIUS, 32, 32]} />
        <meshStandardMaterial 
          color={bodyColor}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Spider legs with increased movement when stuck */}
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
              <meshStandardMaterial color={bodyColor} />
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

      {/* Optional: Visual indicator when stuck */}
      {isStuck && (
        <pointLight
          color="#ff0000"
          intensity={0.3}
          distance={1}
          position={[0, BODY_RADIUS * 2, 0]}
        />
      )}
    </group>
  )
} 