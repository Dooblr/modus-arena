import { FC } from 'react'
import { useGameState } from '../store/gameState'
import { PauseButton } from './PauseButton'
import './HUD.scss'

export const HUD: FC = () => {
  const health = useGameState(state => state.health)
  const masterVolume = useGameState(state => state.masterVolume)
  const isMuted = useGameState(state => state.isMuted)
  const setMasterVolume = useGameState(state => state.setMasterVolume)
  const toggleMute = useGameState(state => state.toggleMute)

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setMasterVolume(newVolume)
  }

  return (
    <div className="hud">
      {/* Health Bar */}
      <div className="health-bar">
        <div className="health-bar__container">
          <div 
            className="health-bar__fill"
            style={{ 
              width: `${Math.max(0, health)}%`,
              background: health > 20 ? '#2ecc71' : '#e74c3c'
            }} 
          />
        </div>
        <span className="health-bar__text">
          {Math.max(0, health)}%
        </span>
      </div>

      {/* Audio Controls */}
      <div className="audio-controls">
        <button 
          onClick={toggleMute}
          className="audio-controls__mute-button"
        >
          {isMuted ? '🔇' : masterVolume > 0.5 ? '🔊' : masterVolume > 0 ? '🔉' : '🔈'}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : masterVolume}
          onChange={handleVolumeChange}
          className="audio-controls__slider"
        />
        <span className="audio-controls__volume-text">
          {Math.round((isMuted ? 0 : masterVolume) * 100)}%
        </span>
      </div>

      {/* Pause Button */}
      <PauseButton />
    </div>
  )
} 