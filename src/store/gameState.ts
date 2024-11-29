import { create } from 'zustand'

interface GameState {
  isPaused: boolean
  masterVolume: number
  isMuted: boolean
  health: number
  level: number
  xp: number
  xpToNextLevel: number
  setPaused: (paused: boolean) => void
  togglePause: () => void
  setMasterVolume: (volume: number) => void
  toggleMute: () => void
  previousVolume: number
  takeDamage: (amount: number) => void
  addHealth: (amount: number) => void
  addXP: (amount: number) => void
}

const calculateXPForLevel = (level: number) => {
  return Math.floor(100 * Math.pow(1.2, level - 1))
}

export const useGameState = create<GameState>((set) => ({
  isPaused: false,
  masterVolume: 0.5,
  isMuted: false,
  previousVolume: 0.5,
  health: 100,
  level: 1,
  xp: 0,
  xpToNextLevel: calculateXPForLevel(1),

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
    console.log(`Player took ${amount} damage! Health: ${newHealth}`)
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

    // Level up if we have enough XP
    while (newXP >= newXPToNextLevel) {
      newXP -= newXPToNextLevel
      newLevel++
      newXPToNextLevel = calculateXPForLevel(newLevel)
      console.log(`Level Up! Now level ${newLevel}`)
    }

    return {
      xp: newXP,
      level: newLevel,
      xpToNextLevel: newXPToNextLevel
    }
  }),
})) 