import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useCollisionStore } from '../store/collisionStore'
import type { Collider, CollisionLayer } from '../systems/CollisionSystem'

interface UseCollisionProps {
  type: 'box' | 'sphere'
  size: THREE.Vector3
  position: THREE.Vector3
  layer: CollisionLayer
  rotation?: THREE.Euler
  onCollision?: (result: any) => void
}

export const useCollision = ({
  type,
  size,
  position,
  layer,
  rotation,
  onCollision
}: UseCollisionProps) => {
  const { addCollider, removeCollider, checkCollision } = useCollisionStore()
  const colliderRef = useRef<Collider | null>(null)

  useEffect(() => {
    const collider: Collider = {
      type,
      position: position.clone(),
      size: size.clone(),
      rotation,
      layer,
      entity: null
    }

    colliderRef.current = collider
    addCollider(collider)

    return () => {
      if (colliderRef.current) {
        removeCollider(colliderRef.current)
        colliderRef.current = null
      }
    }
  }, [type, layer, addCollider, removeCollider])

  // Update collider position
  useEffect(() => {
    if (colliderRef.current) {
      colliderRef.current.position.copy(position)
      if (rotation) {
        colliderRef.current.rotation = rotation
      }
    }
  }, [position, rotation])

  // Check for collisions
  useEffect(() => {
    if (colliderRef.current && onCollision) {
      const results = checkCollision(colliderRef.current)
      if (results.length > 0) {
        onCollision(results)
      }
    }
  }, [checkCollision, onCollision])

  return colliderRef
} 