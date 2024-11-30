import { FC } from 'react'
import { useUpgradeManager } from './UpgradeManager'
import './UpgradeDisplay.scss'

export const UpgradeDisplay: FC = () => {
  const { getPurchasedUpgrades } = useUpgradeManager()
  const purchasedUpgrades = getPurchasedUpgrades()

  if (purchasedUpgrades.length === 0) return null

  return (
    <div className="upgrade-display">
      <div className="upgrade-display__items">
        {purchasedUpgrades.map((upgrade, index) => (
          <div 
            key={index} 
            className="upgrade-display__item"
            title={`${upgrade.name} - Level ${upgrade.currentLevel}\n${upgrade.description}`}
          >
            <span className="upgrade-display__icon">{upgrade.icon}</span>
            <span className="upgrade-display__count">{upgrade.currentLevel}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 