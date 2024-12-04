import { FC } from 'react'
import { useGameState } from '../../store/gameState'
import './UpgradeDisplay.scss'

export const UpgradeDisplay: FC = () => {
  const attackSpeedMultiplier = useGameState(state => state.attackSpeedMultiplier)
  const healthRegenRate = useGameState(state => state.healthRegenRate)
  const moveSpeedMultiplier = useGameState(state => state.moveSpeedMultiplier)

  // Calculate levels based on multipliers with Math.max to prevent negative values
  const attackSpeedLevel = Math.max(0, Math.round((1 - attackSpeedMultiplier) / 0.15))
  const healthRegenLevel = Math.max(0, Math.round(healthRegenRate / 0.5))
  const moveSpeedLevel = Math.max(0, Math.round((moveSpeedMultiplier - 1) / 0.1))

  // Only create upgrade objects for non-zero levels
  const upgrades = [
    ...(attackSpeedLevel > 0 ? [{ icon: '⚡', level: attackSpeedLevel }] : []),
    ...(healthRegenLevel > 0 ? [{ icon: '❤️', level: healthRegenLevel }] : []),
    ...(moveSpeedLevel > 0 ? [{ icon: '👟', level: moveSpeedLevel }] : [])
  ]

  if (upgrades.length === 0) return null

  return (
    <div className="upgrade-display">
      <div className="upgrade-display__items">
        {upgrades.map((upgrade, index) => (
          <div key={index} className="upgrade-display__item">
            <span className="upgrade-display__icon">{upgrade.icon}</span>
            <span className="upgrade-display__count">{upgrade.level}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 