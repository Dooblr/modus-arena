import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { AudioManager } from './components/AudioManager'
import { HealthDisplay } from './components/HealthDisplay'
import './App.scss'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <AudioManager />
      <HealthDisplay />
      <Canvas shadows>
        <Scene />
      </Canvas>
    </div>
  )
}

export default App
