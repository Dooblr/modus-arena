import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { HUD } from './components/HUD'
import { UpgradeSelection } from './components/UpgradeSelection'
import './App.scss'
import './components/HUD.scss'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <h1 style={{position: 'absolute', top: 0, left: 0, color: 'white'}}>Hello</h1>
      <HUD />
      <UpgradeSelection />
      <Canvas shadows>
        <Scene />
      </Canvas>
    </div>
  )
}

export default App
