import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import FooterIllustration from '../assets/cdbe331b-739f-4819-9074-1b225515e4af_1-removebg-preview.png'

/* Edit the routes / section ids here if yours are different */
const SECTION_LINKS = [
  { label: 'HOW IT WORKS', id: 'how' },
  { label: 'ABOUT', id: 'about' },
  { label: 'CONTACT US', id: 'contact' },
]
const PAGE_LINKS = [
  { label: 'REGISTER', to: '/register' },
  { label: 'LOGIN', to: '/login' },
]

const Footer = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  /* Scrolls to a section on the home page, even when the visitor is on another page */
  const goToSection = (e, id) => {
    e.preventDefault()
    const scroll = () => {
      const el = document.getElementById(id)
      if (!el) return
      if (window.lenis) window.lenis.scrollTo(el, { offset: -80 })
      else el.scrollIntoView({ behavior: 'smooth' })
    }
    if (pathname === '/') scroll()
    else {
      navigate('/')
      setTimeout(scroll, 250) // wait for the home page to render
    }
  }

  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="ft-about">
          <h3 className="ft-brand">CAREER MATCH</h3>
          <p>
            An undergraduate thesis project exploring machine learning for
            personality-based career guidance for students.
          </p>
        </div>

        <nav className="ft-links" aria-label="Footer">
          <div className="ft-group">
            {SECTION_LINKS.map((l) => (
              <a key={l.id} href={`/#${l.id}`} onClick={(e) => goToSection(e, l.id)}>
                {l.label}
              </a>
            ))}
          </div>

          <img
            className="ft-art"
            src={FooterIllustration}
            alt="Illustration of a person wearing a puzzle-piece cape"
          />

          <div className="ft-group">
            {PAGE_LINKS.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="ft-bottom">
          <span>©2026 CAREER MATCH. ALL RIGHTS RESERVED</span>
          <span>DEVELOPED AND CREATED BY GROUP 3</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer