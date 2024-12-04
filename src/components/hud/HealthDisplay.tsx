import { FC, useRef, useEffect, useState } from 'react'
import { useGameState } from '../../store/gameState'

export const HealthDisplay: FC = () => {
  const health = useGameState(state => state.health)
  const prevHealth = useRef(health)
  const [isShaking, setIsShaking] = useState(false)

  useEffect(() => {
    if (health < prevHealth.current) {
      // Start shake animation
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500) // Stop shaking after 500ms
    }
    prevHealth.current = health
  }, [health])

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
      gap: '10px',
      transform: isShaking ? 'translate(0, 0)' : 'none',
      animation: isShaking ? 'shake 0.1s ease-in-out infinite' : 'none'
    }}>
      <style>
        {`
          @keyframes shake {
            0% { transform: translate(-1px, 0); }
            25% { transform: translate(2px, 0); }
            50% { transform: translate(-2px, 0); }
            75% { transform: translate(1px, 0); }
            100% { transform: translate(0, 0); }
          }
        `}
      </style>
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