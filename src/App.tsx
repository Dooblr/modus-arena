import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { HUD } from './components/HUD'
import { UpgradeSelection } from './components/UpgradeSelection'
import './App.scss'
import './components/HUD.scss'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HUD />
      <UpgradeSelection />
      <Canvas shadows>
        <Scene />
      </Canvas>
    </div>
  )
}

export default App
