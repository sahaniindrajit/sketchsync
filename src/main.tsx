import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RecoilRoot } from 'recoil'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <RecoilRoot>
    <StrictMode>
      <App />
    </StrictMode>,
  </RecoilRoot>
)
