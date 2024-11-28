import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { HUD } from './components/HUD'
import './App.scss'
import './components/HUD.scss'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HUD />
      <Canvas shadows>
        <Scene />
      </Canvas>
    </div>
  )
}

export default App
