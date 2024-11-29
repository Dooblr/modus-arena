import { FC, useState, useCallback } from 'react'
import { useGameState } from '../store/gameState'
import { useGameAudio } from '../hooks/useGameAudio'
import { PauseButton } from './PauseButton'
import { UpgradeDisplay } from './UpgradeDisplay'
import './HUD.scss'

export const HUD: FC = () => {
  const [isMusicStarted, setIsMusicStarted] = useState(false)
  const health = useGameState(state => state.health)
  const level = useGameState(state => state.level)
  const xp = useGameState(state => state.xp)
  const xpToNextLevel = useGameState(state => state.xpToNextLevel)
  const masterVolume = useGameState(state => state.masterVolume)
  const isMuted = useGameState(state => state.isMuted)
  const setMasterVolume = useGameState(state => state.setMasterVolume)
  const toggleMute = useGameState(state => state.toggleMute)
  const { playBackgroundMusic } = useGameAudio()

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setMasterVolume(newVolume)
  }

  const handleStartMusic = useCallback(() => {
    playBackgroundMusic()
    setIsMusicStarted(true)
  }, [playBackgroundMusic])

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

      {/* XP Bar */}
      <div className="xp-bar">
        <span className="xp-bar__text">
          Level {level}
        </span>
        <div className="xp-bar__container">
          <div 
            className="xp-bar__fill"
            style={{ 
              width: `${(xp / xpToNextLevel) * 100}%`
            }} 
          />
        </div>
        <span className="xp-bar__text">
          {xp}/{xpToNextLevel} XP
        </span>
      </div>

      {/* Upgrade Display */}
      <UpgradeDisplay />

      {/* Audio Controls */}
      <div className="audio-controls">
        {!isMusicStarted && (
          <button 
            onClick={handleStartMusic}
            className="audio-controls__start-button"
          >
            🎵 Start Music
          </button>
        )}
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