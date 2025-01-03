import { useCallback } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'

interface ProjectileState {
  spawnProjectile: (position: THREE.Vector3, direction: THREE.Vector3, type: 'player' | 'enemy') => void
}

export const useProjectileStore = create<ProjectileState>((set, get) => ({
  spawnProjectile: () => null, // Will be set by ProjectileManager
}))

export const useProjectiles = () => {
  return {
    spawnPlayerProjectile: useCallback((position: THREE.Vector3, direction: THREE.Vector3) => {
      useProjectileStore.getState().spawnProjectile(position, direction, 'player')
    }, []),
    
    spawnEnemyProjectile: useCallback((position: THREE.Vector3, direction: THREE.Vector3) => {
      useProjectileStore.getState().spawnProjectile(position, direction, 'enemy')
    }, []),
  }
} 