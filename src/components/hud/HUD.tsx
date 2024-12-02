import { FC, useState, useCallback } from 'react'
import { useGameState } from '../../store/gameState'
import { useGameAudio } from '../../hooks/useGameAudio'
import { PauseButton } from '../PauseButton'
import '../hud/HUD.scss'

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
  const attackSpeedMultiplier = useGameState(state => state.attackSpeedMultiplier)
  const healthRegenRate = useGameState(state => state.healthRegenRate)
  const moveSpeedMultiplier = useGameState(state => state.moveSpeedMultiplier)
  const { playBackgroundMusic } = useGameAudio()

  // Calculate levels based on multipliers
  const attackSpeedLevel = Math.round((1 - attackSpeedMultiplier) / 0.15) // Each upgrade reduces by 15%
  const healthRegenLevel = Math.round(healthRegenRate / 0.5) // Each upgrade adds 0.5
  const moveSpeedLevel = Math.round((moveSpeedMultiplier - 1) / 0.1) // Each upgrade adds 10%

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

      {/* Upgrade Container */}
      <div className="upgrade-container">
        {attackSpeedLevel > 0 && (
          <div className="upgrade-item">
            <span className="upgrade-icon">⚡</span>
            <span className="upgrade-count">{attackSpeedLevel}</span>
          </div>
        )}
        {healthRegenLevel > 0 && (
          <div className="upgrade-item">
            <span className="upgrade-icon">❤️</span>
            <span className="upgrade-count">{healthRegenLevel}</span>
          </div>
        )}
        {moveSpeedLevel > 0 && (
          <div className="upgrade-item">
            <span className="upgrade-icon">👟</span>
            <span className="upgrade-count">{moveSpeedLevel}</span>
          </div>
        )}
      </div>

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