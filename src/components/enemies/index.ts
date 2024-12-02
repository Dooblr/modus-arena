export * from './Enemy1'
export * from './Enemy2'
export * from './Enemy3'

// Enemy types
export type EnemyType = 'enemy1' | 'enemy2' | 'enemy3'
export const ENEMY_TYPES: EnemyType[] = ['enemy1', 'enemy2', 'enemy3']

// Base constants
export const ENEMY_REPULSION_DISTANCE = 3
export const ENEMY_REPULSION_FORCE = 0.05
export const SPAWN_RADIUS = 15
export const PROJECTILE_COLLISION_DISTANCE = 0.5
export const PLAYER_COLLISION_DISTANCE = 1.5
export const DAMAGE_COOLDOWN = 1
export const PLAYER_DAMAGE = 10
export const WOBBLE_SPEED = 2
export const WOBBLE_AMOUNT = 0.2

// Enemy-specific configurations
interface EnemyConfig {
  size: number
  speed: number
  spawnInterval: number
  spawnHeight: number
  health: number
  xpDrop: number
  healthDropChance: number
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  enemy1: {
    size: 0.5,
    speed: 0.1,
    spawnInterval: 5,
    spawnHeight: 0.5,
    health: 3,
    xpDrop: 1,
    healthDropChance: 0.1
  },
  enemy2: {
    size: 1.0,
    speed: 0.05,
    spawnInterval: 10,
    spawnHeight: 0.8,
    health: 5,
    xpDrop: 2,
    healthDropChance: 0.2
  },
  enemy3: {
    size: 0.8,
    speed: 0.12,
    spawnInterval: 20,
    spawnHeight: 0.8,
    health: 8,
    xpDrop: 3,
    healthDropChance: 0.3
  }
} 