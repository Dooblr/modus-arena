import { FC } from 'react'
import { useGameState } from '../store/gameState'

export const HealthDisplay: FC = () => {
  const health = useGameState(state => state.health)

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      padding: '10px',
      background: 'rgba(0,0,0,0.5)',
      color: '#fff',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{
        width: '200px',
        height: '20px',
        background: '#333',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${health}%`,
          height: '100%',
          background: health > 20 ? '#2ecc71' : '#e74c3c',
          transition: 'all 0.3s ease'
        }} />
      </div>
      <span style={{ minWidth: '50px' }}>
        {Math.max(0, health)}%
      </span>
    </div>
  )
} 