import { FC } from 'react'
import { useGameState } from '../../store/gameState'

export interface Upgrade {
  id: string
  name: string
  description: string
  icon: string
  maxLevel: number
  currentLevel: number
  effect: (level: number) => number
}

export const UPGRADES = {
  ATTACK_SPEED: {
    id: 'attack_speed',
    name: 'Attack Speed',
    description: 'Decrease shooting cooldown by 15%',
    icon: '⚡',
    maxLevel: 5,
    effect: (level: number) => Math.pow(0.85, level) // Each level reduces cooldown by 15%
  },
  HEALTH_REGEN: {
    id: 'health_regen',
    name: 'Health Regeneration',
    description: 'Regenerate 0.5 HP/sec',
    icon: '❤️',
    maxLevel: 5,
    effect: (level: number) => level * 0.5 // Each level adds 0.5 HP/sec
  },
  MOVE_SPEED: {
    id: 'move_speed',
    name: 'Move Speed',
    description: 'Increase movement speed by 10%',
    icon: '👟',
    maxLevel: 5,
    effect: (level: number) => Math.pow(1.1, level) // Each level increases speed by 10%
  }
}

export const useUpgradeManager = () => {
  const attackSpeedMultiplier = useGameState(state => state.attackSpeedMultiplier)
  const healthRegenRate = useGameState(state => state.healthRegenRate)
  const moveSpeedMultiplier = useGameState(state => state.moveSpeedMultiplier)
  const selectUpgrade = useGameState(state => state.selectUpgrade)

  // Calculate current levels
  const attackSpeedLevel = Math.round(Math.log(1/attackSpeedMultiplier) / Math.log(0.85))
  const healthRegenLevel = Math.round(healthRegenRate / 0.5)
  const moveSpeedLevel = Math.round(Math.log(moveSpeedMultiplier) / Math.log(1.1))

  // Get all available upgrades with current levels
  const getAvailableUpgrades = (): Upgrade[] => {
    return [
      {
        ...UPGRADES.ATTACK_SPEED,
        currentLevel: attackSpeedLevel,
      },
      {
        ...UPGRADES.HEALTH_REGEN,
        currentLevel: healthRegenLevel,
      },
      {
        ...UPGRADES.MOVE_SPEED,
        currentLevel: moveSpeedLevel,
      }
    ].filter(upgrade => upgrade.currentLevel < upgrade.maxLevel)
  }

  // Get all purchased upgrades
  const getPurchasedUpgrades = (): Upgrade[] => {
    return [
      {
        ...UPGRADES.ATTACK_SPEED,
        currentLevel: attackSpeedLevel,
      },
      {
        ...UPGRADES.HEALTH_REGEN,
        currentLevel: healthRegenLevel,
      },
      {
        ...UPGRADES.MOVE_SPEED,
        currentLevel: moveSpeedLevel,
      }
    ].filter(upgrade => upgrade.currentLevel > 0)
  }

  // Get random upgrades for selection
  const getRandomUpgrades = (count: number = 3): Upgrade[] => {
    const available = getAvailableUpgrades()
    const selected: Upgrade[] = []
    
    while (selected.length < count && available.length > 0) {
      const index = Math.floor(Math.random() * available.length)
      selected.push(available[index])
      available.splice(index, 1)
    }

    return selected
  }

  // Apply an upgrade
  const applyUpgrade = (upgradeId: string) => {
    console.log('Applying upgrade:', upgradeId)
    selectUpgrade(upgradeId)
  }

  return {
    getAvailableUpgrades,
    getPurchasedUpgrades,
    getRandomUpgrades,
    applyUpgrade,
    UPGRADES
  }
}

// Optional: Export a component if you need to render anything
export const UpgradeManager: FC = () => {
  return null // This component doesn't render anything
} 