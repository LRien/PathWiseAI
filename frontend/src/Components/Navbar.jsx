import React, { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const LINKS = [
  { label: 'HOW IT WORKS', to: '/how-it-works' },
  { label: 'ABOUT', to: '/about' },
  { label: 'CONTACT US', to: '/contact' },
]

const Navbar = ({ links = LINKS, registerTo = '/register', loginTo = '/login' }) => {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const close = () => setOpen(false)

  // Esc closes the mobile menu; widening the screen resets it
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    const mq = window.matchMedia('(min-width: 768px)')
    const onMq = (e) => e.matches && close()
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [])

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    if (open) {
      setVisible(true)
      return
    }

    let lastY = window.scrollY
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const diff = y - lastY

        if (y < 80) {
          setVisible(true)            // always show near the top
        } else if (Math.abs(diff) > 6) {
          setVisible(diff < 0)        // up = show, down = hide
        }

        lastY = y
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

  return (
    <header className={`navbar ${visible ? '' : 'navbar--hidden'}`}>
      <nav className="navbar__bar" aria-label="Main">
        <Link className="navbar__brand" to="/" onClick={close}>
          CAREER MATCH
        </Link>

        <ul className="navbar__links">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to}>{l.label}</NavLink>
            </li>
          ))}
        </ul>

        <div className="navbar__auth">
          <Link className="navbar__btn" to={registerTo}>REGISTER</Link>
          <Link className="navbar__btn navbar__btn--alt" to={loginTo}>LOGIN</Link>
        </div>

        <div className="navbar__mobile">
          <Link className="navbar__btn" to={registerTo} onClick={close}>REGISTER</Link>
          <button
            type="button"
            className="navbar__toggle"
            aria-expanded={open}
            aria-controls="navbar-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="navbar__burger" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </nav>

      <div id="navbar-menu" className="navbar__menu" hidden={!open}>
        <ul className="navbar__menu-links">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} onClick={close}>{l.label}</NavLink>
            </li>
          ))}
        </ul>
        <Link className="navbar__btn navbar__btn--alt navbar__btn--block" to={loginTo} onClick={close}>
          LOGIN
        </Link>
      </div>
    </header>
  )
}

export default Navbar