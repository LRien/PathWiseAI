import React from 'react'
import FooterIllustration from '../assets/cdbe331b-739f-4819-9074-1b225515e4af_1-removebg-preview.png'

const Footer = () => {
  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="ft-top">
          <div className="ft-about">
            <h3 className="ft-brand">CAREER MATCH</h3>
            <p>
              Career Match is an undergraduate thesis project developed to
              explore the use of machine learning in providing personality-based
              career guidance for students.
            </p>
          </div>

          <nav className="ft-col" aria-label="Navigation">
            <h4>NAVIGATION</h4>
            <a href="#how">HOW IT WORKS</a>
            <a href="#about">ABOUT</a>
            <a href="#contact">CONTACT US</a>
          </nav>

          <nav className="ft-col" aria-label="Account">
            <h4>ACCOUNT</h4>
            <a href="#register">REGISTER</a>
            <a href="#login">LOGIN</a>
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