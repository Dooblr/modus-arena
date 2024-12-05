import { FC, useRef, useEffect, useState } from "react"
import * as THREE from "three"
import { useFrame, useLoader } from "@react-three/fiber"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { ENEMY_CONFIGS } from "./index"
import { useCollisionStore } from "../../store/collisionStore"
import type { Collider } from "../../systems/CollisionSystem"

const FULL_HEALTH_COLOR = "#00ff00"
const LOW_HEALTH_COLOR = "#ff0000"
const LEG_COUNT = 4
const LEG_SEGMENTS = 3
const LEG_RADIUS = 0.05
const LEG_LENGTH = 0.4
const BODY_RADIUS = 0.75
const ANIMATION_SPEED = 2

// Spider leg configuration
interface LegConfig {
  baseAngle: number
  restingLength: number
  phase: number
  segments: {
    length: number
    angle: number
  }[]
}

const createLegConfigs = (): LegConfig[] => {
  return Array.from({ length: LEG_COUNT }).map((_, index) => ({
    baseAngle: (index / LEG_COUNT) * Math.PI * 2,
    restingLength: LEG_LENGTH * 2,
    phase: index % 2 === 0 ? 0 : Math.PI,
    segments: [
      { length: LEG_LENGTH * 0.4, angle: Math.PI / 4 },  // First segment goes up by 45 degrees
      { length: LEG_LENGTH * 0.4, angle: -Math.PI / 4 }, // Second segment goes down by 45 degrees
      { length: LEG_LENGTH * 0.4, angle: -Math.PI / 2 }, // Third segment goes down by 90 degrees
    ],
  }))
}

interface Enemy3Props {
  position: THREE.Vector3
  wobbleOffset: THREE.Vector3
  health: number
  maxHealth: number
}

export const Enemy3: FC<Enemy3Props> = ({
  position,
  wobbleOffset = new THREE.Vector3(),
  health,
  maxHealth,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const legsRef = useRef<THREE.Group>(null)
  const legConfigs = useRef(createLegConfigs())
  const { addCollider, removeCollider } = useCollisionStore()
  const [velocity] = useState(new THREE.Vector3())

  // Load the spider model
  const gltf = useLoader(GLTFLoader, 'src/assets/models/spider.glb')

  useEffect(() => {
    // Collider setup
    if (meshRef.current) {
      const collider: Collider = {
        type: 'sphere',
        position: position.clone().add(wobbleOffset),
        size: new THREE.Vector3(ENEMY_CONFIGS.enemy3.size, ENEMY_CONFIGS.enemy3.size, ENEMY_CONFIGS.enemy3.size),
        layer: 'enemy',
        entity: meshRef.current
      }

      addCollider(collider)
      return () => removeCollider(collider)
    }
  }, [position, addCollider, removeCollider])

  useFrame(() => {
    // Spin animation for the entire group
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01; // Adjust the speed of the spin here
    }
  })

  const healthPercent = health / maxHealth
  const color = new THREE.Color(LOW_HEALTH_COLOR).lerp(
    new THREE.Color(FULL_HEALTH_COLOR),
    healthPercent
  )

  return (
    <group position={position}>
      {/* Spider model */}
      <primitive object={gltf.scene} ref={meshRef} castShadow />

      {/* Optionally, you can add additional logic for legs or other components here */}
    </group>
  )
}

declare module 'three/examples/jsm/loaders/GLTFLoader' {
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
  export default GLTFLoader;
}
