import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
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

/* Runs on every route change:
   - the dashboard (sidebar, panels, modals) uses normal native scrolling, so Lenis is paused there
   - every page starts at the top */
const RouteScrollManager = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    const lenis = window.lenis
    const inDashboard = pathname.startsWith('/dashboard')

    if (lenis) {
      if (inDashboard) lenis.stop()
      else lenis.start()
      lenis.scrollTo(0, { immediate: true, force: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RouteScrollManager />
      <App />
    </BrowserRouter>
  </StrictMode>
)