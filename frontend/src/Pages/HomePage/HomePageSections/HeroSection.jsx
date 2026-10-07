import React from 'react'
import { Link } from 'react-router-dom'
import PuzzleBrain from './PuzzleBrain'

const HeroSection = () => {
  return (
    <section className="hero" id="top">
      <div className="hero__copy">
        <h1 className="hero__title" aria-label="Discover the Career Path That Fits You">
          <span className="hero__line"><span>Discover the Career</span></span>
          <span className="hero__line"><span>Path That Fits You</span></span>
        </h1>

        <p className="hero__text">
          Your personality is one part of what makes your career preferences unique. Career Match
          is a web-based Personality-Based Career Guidance System that uses machine learning to
          analyze your personality type, academic background, skills, and preferences to provide
          career recommendations based on your overall profile.
        </p>

        <Link to="/assesment" className="hero__btn">
          GET STARTED
        </Link>
      </div>

      <div className="hero__media">
        <PuzzleBrain />
      </div>
    </section>
  )
}

export default HeroSection