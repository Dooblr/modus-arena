import { FC, useCallback } from 'react'
import { useGameState } from '../store/gameState'

export const PauseButton: FC = () => {
  const isPaused = useGameState(state => state.isPaused)
  const togglePause = useGameState(state => state.togglePause)

  const handleClick = useCallback(() => {
    togglePause()
  }, [togglePause])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent spacebar from triggering the button
    if (e.code === 'Space') {
      e.preventDefault()
    }
  }, [])

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        padding: '12px 24px',
        background: isPaused ? '#2ecc71' : '#34495e',
        color: '#ffffff',
        border: '2px solid #ffffff',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isPaused 
          ? '#27ae60'
          : '#2c3e50'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isPaused 
          ? '#2ecc71'
          : '#34495e'
      }}
    >
      {isPaused ? '▶ Resume' : '⏸ Pause'}
    </button>
  )
} 