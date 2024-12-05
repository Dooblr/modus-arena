import { useRef, useCallback, useEffect } from 'react'
import { useGameState } from '../store/gameState'
import music1 from '../assets/music_loop.wav'
import music2 from '../assets/music_loop2.wav'
import music3 from '../assets/music_loop3.wav'
import bulletSound from '../assets/bullet4.wav'
import enemyHitSound from '../assets/enemy_hit.wav'
import enemyDeathSound from '../assets/enemy_death.wav'
import levelUpSound from '../assets/levelup.wav'
import powerupSound from '../assets/powerup.wav'
import enemyBulletSound from '../assets/enemy_bullet1.wav'
import enemySpawnSound from '../assets/enemy_spawn.wav'

type AudioSources = {
  music1: string
  music2: string
  music3: string
  enemyHit: string
  enemyDeath: string
  bullet: string
  levelUp: string
  powerup: string
  enemyBullet: string
  enemySpawn: string
}

const audioSources: AudioSources = {
  music1,
  music2,
  music3,
  enemyHit: enemyHitSound,
  enemyDeath: enemyDeathSound,
  bullet: bulletSound,
  levelUp: levelUpSound,
  powerup: powerupSound,
  enemyBullet: enemyBulletSound,
  enemySpawn: enemySpawnSound
}

const FADE_DURATION = 2 // seconds
const GAP_DURATION = 5 // seconds
const FADE_INTERVAL = 50 // milliseconds

export const useGameAudio = () => {
  const audioElements = useRef<{ [K in keyof AudioSources]?: HTMLAudioElement }>({})
  const currentTrackRef = useRef<1 | 2 | 3>(1)
  const fadeIntervalRef = useRef<number>()
  const nextTrackTimeoutRef = useRef<number>()
  const isPlayingRef = useRef(false)
  const volume = useGameState(state => state.masterVolume)
  const isMuted = useGameState(state => state.isMuted)

  const createAudio = useCallback((src: string, defaultVolume: number = 1) => {
    const audio = new Audio(src)
    audio.volume = isMuted ? 0 : volume * defaultVolume
    return audio
  }, [volume, isMuted])

  // Update volume for all audio elements when volume changes
  useEffect(() => {
    Object.values(audioElements.current).forEach(audio => {
      if (audio && !audio.dataset.fading) {
        audio.volume = isMuted ? 0 : volume
      }
    })
  }, [volume, isMuted])

  const fadeOut = useCallback((audio: HTMLAudioElement, onComplete: () => void) => {
    let startVolume = audio.volume
    let steps = FADE_DURATION * 1000 / FADE_INTERVAL
    let volumeStep = startVolume / steps
    let currentStep = 0

    audio.dataset.fading = 'true'

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++
      let newVolume = Math.max(0, startVolume - (volumeStep * currentStep))
      audio.volume = newVolume

      if (currentStep >= steps) {
        window.clearInterval(fadeIntervalRef.current)
        audio.pause()
        audio.currentTime = 0
        delete audio.dataset.fading
        onComplete()
      }
    }, FADE_INTERVAL)
  }, [])

  const playNextTrack = useCallback(() => {
    const currentTrack = currentTrackRef.current
    const nextTrack = currentTrack === 3 ? 1 : (currentTrack + 1) as 1 | 2 | 3
    currentTrackRef.current = nextTrack

    // Create and play next track
    const audio = audioElements.current[`music${nextTrack}`] || 
                 createAudio(audioSources[`music${nextTrack}`], 0)
    audioElements.current[`music${nextTrack}`] = audio
    
    // Start with volume 0 and fade in
    audio.volume = 0
    audio.play()

    let steps = FADE_DURATION * 1000 / FADE_INTERVAL
    let targetVolume = isMuted ? 0 : volume * 0.5
    let volumeStep = targetVolume / steps
    let currentStep = 0

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++
      audio.volume = Math.min(targetVolume, volumeStep * currentStep)

      if (currentStep >= steps) {
        window.clearInterval(fadeIntervalRef.current)
      }
    }, FADE_INTERVAL)

    // Schedule next track change
    audio.addEventListener('ended', () => {
      fadeOut(audio, () => {
        if (isPlayingRef.current) {
          nextTrackTimeoutRef.current = window.setTimeout(playNextTrack, GAP_DURATION * 1000)
        }
      })
    })
  }, [createAudio, fadeOut, volume, isMuted])

  const playBackgroundMusic = useCallback(() => {
    if (isPlayingRef.current) return
    isPlayingRef.current = true
    playNextTrack()
  }, [playNextTrack])

  const stopBackgroundMusic = useCallback(() => {
    isPlayingRef.current = false
    
    // Clear all timeouts and intervals
    if (nextTrackTimeoutRef.current) {
      window.clearTimeout(nextTrackTimeoutRef.current)
    }
    if (fadeIntervalRef.current) {
      window.clearInterval(fadeIntervalRef.current)
    }

    // Stop all music tracks
    ['music1', 'music2', 'music3'].forEach(key => {
      const audio = audioElements.current[key as keyof AudioSources]
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
  }, [])

  const playBulletSound = useCallback(() => {
    if (!audioElements.current.bullet) {
      audioElements.current.bullet = createAudio(audioSources.bullet, 0.3)
    }
    audioElements.current.bullet.currentTime = 0
    audioElements.current.bullet?.play()
  }, [createAudio])

  const playEnemyHitSound = useCallback(() => {
    if (!audioElements.current.enemyHit) {
      audioElements.current.enemyHit = createAudio(audioSources.enemyHit, 0.3)
    }
    audioElements.current.enemyHit.currentTime = 0
    audioElements.current.enemyHit?.play()
  }, [createAudio])

  const playEnemyDeathSound = useCallback(() => {
    if (!audioElements.current.enemyDeath) {
      audioElements.current.enemyDeath = createAudio(audioSources.enemyDeath, 0.4)
    }
    audioElements.current.enemyDeath.currentTime = 0
    audioElements.current.enemyDeath?.play()
  }, [createAudio])

  const playLevelUpSound = useCallback(() => {
    if (!audioElements.current.levelUp) {
      audioElements.current.levelUp = createAudio(audioSources.levelUp, 0.4)
    }
    audioElements.current.levelUp.currentTime = 0
    audioElements.current.levelUp?.play()
  }, [createAudio])

  const playPowerupSound = useCallback(() => {
    if (!audioElements.current.powerup) {
      audioElements.current.powerup = createAudio(audioSources.powerup, 0.4)
    }
    audioElements.current.powerup.currentTime = 0
    audioElements.current.powerup?.play()
  }, [createAudio])

  const playEnemyBulletSound = useCallback(() => {
    if (!audioElements.current.enemyBullet) {
      audioElements.current.enemyBullet = createAudio(audioSources.enemyBullet, 0.3)
    }
    audioElements.current.enemyBullet.currentTime = 0
    audioElements.current.enemyBullet?.play().catch(error => {
      console.warn('Failed to play enemy bullet sound:', error)
    })
  }, [createAudio])

  const playEnemySpawnSound = useCallback(() => {
    if (!audioElements.current.enemySpawn) {
      audioElements.current.enemySpawn = createAudio(audioSources.enemySpawn, 0.3)
    }
    audioElements.current.enemySpawn.currentTime = 0
    audioElements.current.enemySpawn?.play()
  }, [createAudio])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundMusic()
    }
  }, [stopBackgroundMusic])

  return {
    playBackgroundMusic,
    stopBackgroundMusic,
    playBulletSound,
    playEnemyHitSound,
    playEnemyDeathSound,
    playLevelUpSound,
    playPowerupSound,
    playEnemyBulletSound,
    playEnemySpawnSound
  }
} 