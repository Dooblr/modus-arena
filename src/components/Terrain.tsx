import { FC, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PsychedelicShader } from '../shaders/PsychedelicShader'
import { IcyPsychedelicShader } from '../shaders/IcyPsychedelicShader'

// Floor and platform constants
const FLOOR_SIZE = 50 // Size of the main floor plane
const PLATFORM_HEIGHT = 15 // Height of the upper platform

// Main terrain platform
const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }

// Stepping platforms - positioned to lead to center of upper opening
const PLATFORM_SIZE = { x: 5, y: 1, z: 5 }
const PLATFORMS = [
  { 
    size: PLATFORM_SIZE,
    position: { x: 0, y: 4, z: 0 } // First platform closer to center
  },
  {
    size: PLATFORM_SIZE,
    position: { x: 0, y: 8, z: 0 } // Second platform directly above
  },
  {
    size: PLATFORM_SIZE,
    position: { x: 0, y: 12, z: 0 } // Final platform just below the opening
  }
]

// Upper platform sections to create a hole
const UPPER_PLATFORM_SECTIONS = [
  // Back section
  {
    size: { x: FLOOR_SIZE, y: 1, z: FLOOR_SIZE / 2 - 4 },
    position: { x: 0, y: PLATFORM_HEIGHT, z: -FLOOR_SIZE / 4 - 2 }
  },
  // Front section
  {
    size: { x: FLOOR_SIZE, y: 1, z: FLOOR_SIZE / 2 - 4 },
    position: { x: 0, y: PLATFORM_HEIGHT, z: FLOOR_SIZE / 4 + 2 }
  },
  // Left section
  {
    size: { x: FLOOR_SIZE / 2 - 4, y: 1, z: 8 },
    position: { x: -FLOOR_SIZE / 4 - 2, y: PLATFORM_HEIGHT, z: 0 }
  },
  // Right section
  {
    size: { x: FLOOR_SIZE / 2 - 4, y: 1, z: 8 },
    position: { x: FLOOR_SIZE / 4 + 2, y: PLATFORM_HEIGHT, z: 0 }
  }
]

interface TerrainPlatform {
  size: { x: number; y: number; z: number }
  position: { x: number; y: number; z: number }
  isUpperPlatform?: boolean
}

const TerrainMesh: FC<TerrainPlatform> = ({ size, position, isUpperPlatform }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  const shader = isUpperPlatform ? IcyPsychedelicShader : PsychedelicShader

  return (
    <mesh 
      position={[position.x, position.y, position.z]}
      castShadow 
      receiveShadow
    >
      <boxGeometry args={[size.x, size.y, size.z]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={shader.vertexShader}
        fragmentShader={shader.fragmentShader}
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
      
      {/* Stepping platforms */}
      {PLATFORMS.map((platform, index) => (
        <TerrainMesh 
          key={`platform-${index}`}
          size={platform.size} 
          position={platform.position} 
        />
      ))}

      {/* Upper platform sections */}
      {UPPER_PLATFORM_SECTIONS.map((section, index) => (
        <TerrainMesh 
          key={`upper-section-${index}`}
          size={section.size} 
          position={section.position} 
          isUpperPlatform={true}
        />
      ))}
    </>
  )
}

export const ALL_PLATFORMS = [
  { size: TERRAIN_SIZE, position: TERRAIN_POSITION },
  ...PLATFORMS,
  ...UPPER_PLATFORM_SECTIONS
] 