import { FC } from 'react'
import * as THREE from 'three'
import { ENEMY_CONFIGS } from './index'

const FULL_HEALTH_COLOR = '#000000' // Black
const LOW_HEALTH_COLOR = '#800080'  // Purple

interface Enemy3Props {
  position: THREE.Vector3
  health: number
  maxHealth: number
}

export const Enemy3: FC<Enemy3Props> = ({ position, health, maxHealth }) => {
  const healthPercent = health / maxHealth
  const color = new THREE.Color().lerpColors(
    new THREE.Color(FULL_HEALTH_COLOR),
    new THREE.Color(LOW_HEALTH_COLOR),
    1 - healthPercent
  )

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[ENEMY_CONFIGS.enemy3.size, 32, 32]} />
        <meshStandardMaterial color={color.getHexString()} />
      </mesh>
    </group>
  )
} 