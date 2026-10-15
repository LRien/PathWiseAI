import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const LINKS = [
  { label: 'HOW IT WORKS', to: '/how-it-works' },
  { label: 'ABOUT', to: '/about' },
  { label: 'CONTACT US', to: '/contact' },
]

// Change this to whatever key your login code saves the JWT under
const TOKEN_KEY = 'token'

const readLoggedIn = () => {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY))
  } catch {
    return false
  }
}

const Navbar = ({
  links = LINKS,
  registerTo = '/register',
  loginTo = '/login',
  dashboardTo = '/dashboard',
  isLoggedIn, // optional: pass true/false from your auth context to override the token check
}) => {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState(true)
  const [tokenFound, setTokenFound] = useState(readLoggedIn)
  const location = useLocation()
  const close = () => setOpen(false)

  const loggedIn = typeof isLoggedIn === 'boolean' ? isLoggedIn : tokenFound

  // Re-check login on every page change (covers login / logout redirects)
  useEffect(() => {
    setTokenFound(readLoggedIn())
    setVisible(true)
    close()
  }, [location.pathname])

  // Also re-check if login state changes in another tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY || e.key === null) setTokenFound(readLoggedIn())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Scroll down = hide the bar, scroll up = show it. Shadow once the page has scrolled.
  useEffect(() => {
    // keep the bar visible while the mobile menu is open
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

        setScrolled(y > 8)

        if (y < 80) {
          setVisible(true) // always show near the top
        } else if (Math.abs(diff) > 6) {
          setVisible(diff < 0) // up = show, down = hide
        }

        lastY = y
        ticking = false
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

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

  const cls = ['navbar', scrolled || open ? 'navbar--scrolled' : '', visible ? '' : 'navbar--hidden']
    .filter(Boolean)
    .join(' ')

  return (
    <header className={cls}>
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
          {loggedIn ? (
            <Link className="navbar__btn" to={dashboardTo}>DASHBOARD</Link>
          ) : (
            <>
              <Link className="navbar__btn" to={registerTo}>REGISTER</Link>
              <Link className="navbar__btn navbar__btn--alt" to={loginTo}>LOGIN</Link>
            </>
          )}
        </div>

        <div className="navbar__mobile">
          {loggedIn ? (
            <Link className="navbar__btn" to={dashboardTo} onClick={close}>DASHBOARD</Link>
          ) : (
            <Link className="navbar__btn" to={registerTo} onClick={close}>REGISTER</Link>
          )}
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
        {!loggedIn && (
          <Link className="navbar__btn navbar__btn--alt navbar__btn--block" to={loginTo} onClick={close}>
            LOGIN
          </Link>
        )}
      </div>
    </header>
  )
}

export default Navbar