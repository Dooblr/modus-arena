import { FC } from 'react'
import { useGameState } from '../store/gameState'
import './UpgradeDisplay.scss'

interface UpgradeItem {
  icon: string
  count: number
}

export const UpgradeDisplay: FC = () => {
  const attackSpeedMultiplier = useGameState(state => state.attackSpeedMultiplier)
  const healthRegenRate = useGameState(state => state.healthRegenRate)
  const moveSpeedMultiplier = useGameState(state => state.moveSpeedMultiplier)

  // Calculate number of upgrades based on multipliers
  const attackSpeedUpgrades = Math.round(Math.log(1/attackSpeedMultiplier) / Math.log(0.85))
  const healthRegenUpgrades = Math.round(healthRegenRate / 0.5)
  const moveSpeedUpgrades = Math.round(Math.log(moveSpeedMultiplier) / Math.log(1.1))

  // Create array of purchased upgrades
  const purchasedUpgrades: UpgradeItem[] = [
    { icon: '⚡', count: attackSpeedUpgrades },
    { icon: '❤️', count: healthRegenUpgrades },
    { icon: '👟', count: moveSpeedUpgrades }
  ].filter(upgrade => upgrade.count > 0)

  if (purchasedUpgrades.length === 0) return null

  return (
    <div className="upgrade-display">
      <div className="upgrade-display__items">
        {purchasedUpgrades.map((upgrade, index) => (
          <div key={index} className="upgrade-display__item">
            <span className="upgrade-display__icon">{upgrade.icon}</span>
            <span className="upgrade-display__count">{upgrade.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 