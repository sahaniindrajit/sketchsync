import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import WhiteBoard from './pages/whiteBoard'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/board' element={<WhiteBoard />} />
        <Route path='*' element={<div>404 Page not found</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
