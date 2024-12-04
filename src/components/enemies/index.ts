import * as THREE from 'three'

export * from './Enemy1'
export * from './Enemy2'
export * from './Enemy3'

// Enemy types
export const ENEMY_TYPES = ['enemy1', 'enemy2', 'enemy3'] as const
export type EnemyType = typeof ENEMY_TYPES[number]

// Base constants
export const ENEMY_REPULSION_DISTANCE = 2
export const ENEMY_REPULSION_FORCE = 0.5
export const SPAWN_RADIUS = 20
export const PROJECTILE_COLLISION_DISTANCE = 1
export const PLAYER_COLLISION_DISTANCE = 1.5
export const DAMAGE_COOLDOWN = 1
export const PLAYER_DAMAGE = 10
export const WOBBLE_SPEED = 2
export const WOBBLE_AMOUNT = 0.1

// Enemy-specific configurations
interface EnemyConfig {
  health: number
  speed: number
  size: number
  spawnHeight: number
  spawnInterval: number
  healthDropChance: number
  collider: {
    type: 'sphere' | 'box'
    size: THREE.Vector3
  }
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  enemy1: {
    health: 1,
    speed: 0.1,
    size: 0.5,
    spawnHeight: 1,
    spawnInterval: 2,
    healthDropChance: 0.1,
    collider: {
      type: 'sphere',
      size: new THREE.Vector3(0.5, 0.5, 0.5)
    }
  },
  enemy2: {
    health: 2,
    speed: 0.08,
    size: 1.0,
    spawnHeight: 1,
    spawnInterval: 4,
    healthDropChance: 0.2,
    collider: {
      type: 'sphere',
      size: new THREE.Vector3(1.0, 1.0, 1.0)
    }
  },
  enemy3: {
    health: 3,
    speed: 0.06,
    size: 1.5,
    spawnHeight: 1,
    spawnInterval: 6,
    healthDropChance: 0.3,
    collider: {
      type: 'sphere',
      size: new THREE.Vector3(1.5, 1.5, 1.5)
    }
  }
}