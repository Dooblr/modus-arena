import { FC, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PsychedelicShader } from '../shaders/PsychedelicShader'

// Main terrain platform
const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }

// Upper platform
const UPPER_PLATFORM_SIZE = { x: 15, y: 1, z: 15 }
const UPPER_PLATFORM_POSITION = { x: -5, y: 8, z: -5 }

interface TerrainPlatform {
  size: { x: number; y: number; z: number }
  position: { x: number; y: number; z: number }
}

const TerrainMesh: FC<TerrainPlatform> = ({ size, position }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh 
      position={[position.x, position.y, position.z]}
      castShadow 
      receiveShadow
    >
      <boxGeometry args={[size.x, size.y, size.z]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={PsychedelicShader.vertexShader}
        fragmentShader={PsychedelicShader.fragmentShader}
        uniforms={{
          uTime: { value: 0 },
        }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export const Terrain: FC = () => {
  return (
    <>
      {/* Main terrain platform */}
      <TerrainMesh size={TERRAIN_SIZE} position={TERRAIN_POSITION} />
      
      {/* Upper platform */}
      <TerrainMesh size={UPPER_PLATFORM_SIZE} position={UPPER_PLATFORM_POSITION} />
    </>
  )
}

// Export constants for collision detection
export { TERRAIN_SIZE, TERRAIN_POSITION, UPPER_PLATFORM_SIZE, UPPER_PLATFORM_POSITION } 