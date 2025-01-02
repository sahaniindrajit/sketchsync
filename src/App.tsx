import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import { WhiteBoard } from './pages/whiteBoard'
import LiveColab from './pages/liveCollab'
import NotFound from './components/404'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/board' element={<WhiteBoard />} />
        <Route path='/live' element={<LiveColab />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
