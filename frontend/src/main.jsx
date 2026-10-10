import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import App from './App.jsx'

/* Smooth scrolling for mouse / trackpad devices only.
   Phones keep native touch scrolling, so the pinned MBTI section isn't fighting Lenis. */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const hasFinePointer = matchMedia('(hover: hover) and (pointer: fine)').matches

if (!reduceMotion && hasFinePointer) {
  window.lenis = new Lenis({
    autoRaf: true,
    lerp: 0.1,
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