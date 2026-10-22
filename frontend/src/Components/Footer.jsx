import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import FooterIllustration from '../assets/cdbe331b-739f-4819-9074-1b225515e4af_1-removebg-preview.png'

/* Keep these routes the same as the ones in Navbar.jsx */
const NAV_LINKS = [
  { label: 'HOW IT WORKS', to: '/how-it-works' },
  { label: 'ABOUT', to: '/about' },
  { label: 'CONTACT US', to: '/contact' },
]

/* Same key the Navbar uses to check if someone is logged in */
const TOKEN_KEY = 'token'

const readLoggedIn = () => {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY))
  } catch {
    return false
  }
}

/* Jump back to the top so the new page doesn't open halfway down */
const toTop = () => {
  if (window.lenis) window.lenis.scrollTo(0, { immediate: true })
  else window.scrollTo(0, 0)
}

const Footer = ({
  registerTo = '/register',
  loginTo = '/login',
  dashboardTo = '/dashboard',
  isLoggedIn, // optional: pass true/false from your auth context to override the token check
}) => {
  const { pathname } = useLocation()
  const [tokenFound, setTokenFound] = useState(readLoggedIn)
  const loggedIn = typeof isLoggedIn === 'boolean' ? isLoggedIn : tokenFound

  // Re-check login on every page change, same as the Navbar
  useEffect(() => {
    setTokenFound(readLoggedIn())
  }, [pathname])

  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="ft-main">
          <div className="ft-about">
            <h3 className="ft-brand">CAREER MATCH</h3>
            <p>
              Career Match is an undergraduate thesis project developed to
              explore the use of machine learning in providing personality-based
              career guidance for students.
            </p>
          </div>

          <nav className="ft-col" aria-label="Footer navigation">
            <h4 className="ft-head">NAVIGATION</h4>
            <ul className="ft-list">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} onClick={toTop}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="ft-col" aria-label="Footer account">
            <h4 className="ft-head">ACCOUNT</h4>
            <ul className="ft-list">
              {loggedIn ? (
                <li>
                  <Link to={dashboardTo} onClick={toTop}>
                    DASHBOARD
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link to={registerTo} onClick={toTop}>
                      REGISTER
                    </Link>
                  </li>
                  <li>
                    <Link to={loginTo} onClick={toTop}>
                      LOGIN
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>

          <img
            className="ft-art"
            src={FooterIllustration}
            alt="Illustration of a person wearing a puzzle-piece cape"
          />
        </div>

        <div className="ft-bottom">
          <span>©2026 CAREER MATCH. ALL RIGHTS RESERVED</span>
          <span>DEVELOPED AND CREATED BY GROUP 3</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer