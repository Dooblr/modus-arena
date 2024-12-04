import { FC } from 'react'
import { useGameState } from '../../store/gameState'

interface Upgrade {
  id: string
  title: string
  description: string
  icon: string
  effect: () => void
  maxLevel?: number
  isAvailable?: (state: ReturnType<typeof useGameState>) => boolean
}

const UPGRADES: Upgrade[] = [
  {
    id: 'attack_speed',
    title: 'Attack Speed',
    description: 'Decrease shooting cooldown by 15%',
    icon: '⚡',
    effect: () => {
      // Effect will be handled by game state
    }
  },
  {
    id: 'health_regen',
    title: 'Health Regeneration',
    description: 'Regenerate 1 health every 2 seconds',
    icon: '❤️',
    effect: () => {
      // Effect will be handled by game state
    }
  },
  {
    id: 'move_speed',
    title: 'Move Speed',
    description: 'Increase movement speed by 10%',
    icon: '👟',
    effect: () => {
      // Effect will be handled by game state
    }
  },
  {
    id: 'homing_weapon',
    title: 'Homing Projectiles',
    description: 'Your projectiles will track nearby enemies',
    icon: '🎯',
    maxLevel: 1,
    isAvailable: (state) => !state.hasHomingWeapon,
    effect: () => {
      // Effect will be handled by game state
    }
  }
]

export const UpgradeSelection: FC = () => {
  const isSelectingUpgrade = useGameState(state => state.isSelectingUpgrade)
  const selectUpgrade = useGameState(state => state.selectUpgrade)
  const gameState = useGameState()

  if (!isSelectingUpgrade) return null

  const handleUpgradeSelect = (upgrade: Upgrade) => {
    selectUpgrade(upgrade.id)
  }

  // Filter available upgrades
  const availableUpgrades = UPGRADES.filter(upgrade => 
    !upgrade.isAvailable || upgrade.isAvailable(gameState)
  )

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 2000,
      gap: '20px',
      padding: '20px'
    }}>
      <h2 style={{
        color: '#fff',
        fontSize: '32px',
        marginBottom: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        Level Up! Choose an Upgrade
      </h2>
      <div style={{
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {availableUpgrades.map(upgrade => (
          <button
            key={upgrade.id}
            onClick={() => handleUpgradeSelect(upgrade)}
            style={{
              width: '200px',
              padding: '20px',
              background: 'rgba(74, 158, 255, 0.2)',
              border: '2px solid #4a9eff',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
              fontSize: '16px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(74, 158, 255, 0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(74, 158, 255, 0.2)'
            }}
          >
            <span style={{ fontSize: '32px' }}>{upgrade.icon}</span>
            <h3 style={{ margin: 0, color: '#4a9eff' }}>{upgrade.title}</h3>
            <p style={{ margin: 0, opacity: 0.8, textAlign: 'center' }}>
              {upgrade.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
} 