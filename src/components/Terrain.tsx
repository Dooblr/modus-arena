import { FC, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PsychedelicShader } from '../shaders/PsychedelicShader'

const TERRAIN_SIZE = { x: 10, y: 5, z: 10 }
const TERRAIN_POSITION = { x: 10, y: TERRAIN_SIZE.y / 2, z: 0 }

export const Terrain: FC = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh 
      ref={meshRef}
      position={[TERRAIN_POSITION.x, TERRAIN_POSITION.y, TERRAIN_POSITION.z]}
      castShadow 
      receiveShadow
    >
      <boxGeometry args={[TERRAIN_SIZE.x, TERRAIN_SIZE.y, TERRAIN_SIZE.z]} />
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