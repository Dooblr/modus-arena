import { create } from 'zustand'

interface GameState {
  isPaused: boolean
  isSelectingUpgrade: boolean
  masterVolume: number
  isMuted: boolean
  health: number
  level: number
  xp: number
  xpToNextLevel: number
  attackSpeedMultiplier: number
  healthRegenRate: number
  moveSpeedMultiplier: number
  hasHomingWeapon: boolean
  hasBreachedSecondPlatform: boolean
  setPaused: (paused: boolean) => void
  togglePause: () => void
  setMasterVolume: (volume: number) => void
  toggleMute: () => void
  previousVolume: number
  takeDamage: (amount: number) => void
  addHealth: (amount: number) => void
  addXP: (amount: number) => void
  selectUpgrade: (upgradeId: string) => void
  setBreachedSecondPlatform: (breached: boolean) => void
}

const calculateXPForLevel = (level: number) => {
  return Math.floor(100 * Math.pow(1.2, level - 1))
}

export const useGameState = create<GameState>((set, get) => ({
  isPaused: false,
  isSelectingUpgrade: false,
  masterVolume: 0.5,
  isMuted: false,
  previousVolume: 0.5,
  health: 100,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  attackSpeedMultiplier: 0.85,
  healthRegenRate: 0,
  moveSpeedMultiplier: 1,
  hasHomingWeapon: false,
  hasBreachedSecondPlatform: false,

  setPaused: (paused) => set({ isPaused: paused }),
  
  togglePause: () => set((state) => ({ 
    isPaused: !state.isPaused 
  })),
  
  setMasterVolume: (volume) => set((state) => ({ 
    masterVolume: Math.max(0, Math.min(1, volume)),
    isMuted: volume === 0,
    previousVolume: volume > 0 ? volume : state.previousVolume
  })),
  
  toggleMute: () => set((state) => ({ 
    isMuted: !state.isMuted,
    masterVolume: state.isMuted ? state.previousVolume : 0
  })),

  takeDamage: (amount) => set((state) => {
    const newHealth = Math.max(0, state.health - amount)
    return { health: newHealth }
  }),

  addHealth: (amount) => set((state) => {
    const newHealth = Math.min(100, state.health + amount)
    return { health: newHealth }
  }),

  addXP: (amount) => set((state) => {
    let newXP = state.xp + amount
    let newLevel = state.level
    let newXPToNextLevel = state.xpToNextLevel
    let shouldShowUpgrade = false

    // Level up if we have enough XP
    while (newXP >= newXPToNextLevel) {
      newXP -= newXPToNextLevel
      newLevel++
      newXPToNextLevel = calculateXPForLevel(newLevel)
      shouldShowUpgrade = true
      console.log(`Level Up! Now level ${newLevel}`)
    }

    return {
      xp: newXP,
      level: newLevel,
      xpToNextLevel: newXPToNextLevel,
      isPaused: shouldShowUpgrade,
      isSelectingUpgrade: shouldShowUpgrade
    }
  }),

  selectUpgrade: (upgradeId: string) => set((state) => {
    console.log(`Selected upgrade: ${upgradeId}`)
    
    let updates: Partial<GameState> = {
      isSelectingUpgrade: false,
      isPaused: false
    }

    switch (upgradeId) {
      case 'attack_speed':
        updates.attackSpeedMultiplier = state.attackSpeedMultiplier * 0.85 // 15% faster
        console.log('Attack speed increased! New multiplier:', updates.attackSpeedMultiplier)
        break
      case 'health_regen':
        updates.healthRegenRate = state.healthRegenRate + 0.5 // +0.5 health per second
        console.log('Health regen increased! New rate:', updates.healthRegenRate)
        break
      case 'move_speed':
        updates.moveSpeedMultiplier = state.moveSpeedMultiplier * 1.1 // 10% faster
        console.log('Move speed increased! New multiplier:', updates.moveSpeedMultiplier)
        break
      case 'homing_weapon':
        updates.hasHomingWeapon = true
        console.log('Homing weapon unlocked!')
        break
    }

    return updates
  }),

  setBreachedSecondPlatform: (breached) => set({ hasBreachedSecondPlatform: breached })
})) 