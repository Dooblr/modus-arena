import { FC, useEffect, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGameAudio } from "../../hooks/useGameAudio"

interface SpawnAnimationProps {
  position: THREE.Vector3
  onComplete: () => void
}

const ANIMATION_DURATION = 3 // seconds
const CIRCLE_RADIUS = 1.0
const CIRCLE_COLOR = "#ff0000" // Red color

export const SpawnAnimation: FC<SpawnAnimationProps> = ({
  position,
  onComplete,
}) => {
  const startTime = useRef(performance.now() / 1000)
  const circleRef = useRef<THREE.Mesh>(null)
  const movingRingRef = useRef<THREE.Mesh>(null)
  const { playEnemySpawnSound } = useGameAudio() // Get the playSound function

  useEffect(() => {
    // Play the spawn sound when the component mounts
    playEnemySpawnSound()
  }, [playEnemySpawnSound])

  useFrame(() => {
    const currentTime = performance.now() / 1000
    const elapsed = currentTime - startTime.current
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

    if (circleRef.current) {
      // Create a pulsing effect for the stationary ring
      const scale = CIRCLE_RADIUS + Math.sin(progress * Math.PI * 2) * 0.3 // Pulsing scale
      circleRef.current.scale.set(scale, scale, 1)

      const material = circleRef.current.material as THREE.MeshStandardMaterial
      if (material) {
        material.opacity =
          Math.abs(Math.cos(progress * Math.PI * 2)) * 0.5 + 0.5 // Fading effect
      }
    }

    if (movingRingRef.current) {
      // Create an up-and-down motion for the second ring
      const heightOffset = Math.sin(progress * Math.PI * 2) * 0.5 // Vertical motion
      movingRingRef.current.position.y = heightOffset

      const material = movingRingRef.current
        .material as THREE.MeshStandardMaterial
      if (material) {
        material.opacity =
          Math.abs(Math.sin(progress * Math.PI * 2)) * 0.5 + 0.5 // Fading effect
      }
    }

    if (progress >= 1) {
      onComplete()
    }
  })

  return (
    <group position={position}>
      {/* Stationary pulsing ring */}
      <mesh ref={circleRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CIRCLE_RADIUS - 0.1, CIRCLE_RADIUS, 32]} />
        <meshStandardMaterial color={CIRCLE_COLOR} transparent opacity={0.5} />
      </mesh>

      {/* Moving up-and-down ring */}
      <mesh ref={movingRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CIRCLE_RADIUS - 0.2, CIRCLE_RADIUS - 0.1, 32]} />
        <meshStandardMaterial color={CIRCLE_COLOR} transparent opacity={0.5} />
      </mesh>

      {/* Add a point light for glowing effect */}
      <pointLight color={CIRCLE_COLOR} intensity={1} distance={2} />
    </group>
  )
}
