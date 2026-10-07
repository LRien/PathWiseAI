import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import App from './App.jsx'

/* Smooth scrolling for the whole site (skipped if the user prefers reduced motion) */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.lenis = new Lenis({
    autoRaf: true,   // Lenis runs its own animation loop
    lerp: 0.1,       // lower = floatier (0.05), higher = snappier (0.2)
    wheelMultiplier: 1,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)