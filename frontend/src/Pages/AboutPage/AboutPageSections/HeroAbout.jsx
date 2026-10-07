import React, { useEffect, useRef, useState } from 'react'
import '../css/heroAbout.css'

const STATEMENT = 'However, personality alone does not determine career suitability.'
const WORDS = STATEMENT.split(' ')

const FACTORS = [
  { t: 'Personality', d: 'How you may approach tasks, decisions, communication, and problem-solving.', c: '#4b3578' },
  { t: 'Academic Background', d: 'Your degree program and educational preparation.', c: '#23704a' },
  { t: 'Skills', d: 'The abilities and competencies you currently have.', c: '#245f8a' },
  { t: 'Preferences', d: 'The types of work, activities, and environments you may prefer.', c: '#8a6508' },
]

/* adds "in" once the element scrolls into view */
const useInView = (threshold = 0.25) => {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold }
    )
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen]
}

const HeroAbout = () => {
  const [cardsRef, cardsSeen] = useInView(0.2)
  const [purposeRef, purposeSeen] = useInView(0.3)

  /* spotlight: words light up as the statement scrolls up the screen */
  const spotRef = useRef(null)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      const el = spotRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const p = (window.innerHeight * 0.75 - r.top) / r.height
      setProgress(Math.min(1, Math.max(0, p)))
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const lit = Math.round(progress * WORDS.length)

  return (
    <div className="ha">
      {/* ---------- Intro (plays on load) ---------- */}
      <section className="ha-wrap ha-intro">
        <h1 className="ha-fade" style={{ '--i': 1 }}>
          Connecting Personality to Career Exploration
        </h1>

        <p className="ha-body ha-fade" style={{ '--i': 2 }}>
          Career Match is a web-based Personality-Based Career Guidance System
          developed as an undergraduate thesis. The system explores how
          personality, academic background, skills, and user preferences can be
          considered together when providing career guidance.
        </p>

        <p className="ha-body ha-fade" style={{ '--i': 3 }}>
          Choosing a career can be challenging, especially when students are
          still exploring their interests, abilities, and possible career paths.
          Career Match was developed to provide students with an additional tool
          for exploring careers by connecting information about how they approach
          work, what they have learned, what they can do, and what they prefer
          with potential career paths.
        </p>
      </section>

      {/* ---------- Role of personality + spotlight ---------- */}
      <section className="ha-wrap ha-spot">
        <h2 className="ha-lead">THE ROLE OF PERSONALITY</h2>
        <p className="ha-body">
          Personality can provide insight into a person&apos;s preferred ways of
          approaching tasks, solving problems, communicating, and working with
          others. Career Match uses the Myers-Briggs Type Indicator (MBTI) as one
          of the factors in understanding these characteristics.
        </p>
        <h2 ref={spotRef} className="ha-statement" aria-label={STATEMENT}>
          {WORDS.map((w, i) => (
            <span key={i} aria-hidden="true" className={i < lit ? 'lit' : ''}>
              {w}{' '}
            </span>
          ))}
        </h2>
      </section>

      {/* ---------- Four factors ---------- */}
      <section ref={cardsRef} className={`ha-wrap ha-cards${cardsSeen ? ' in' : ''}`}>
        <p className="ha-eyebrow">THE SYSTEM ALSO CONSIDERS</p>
        <div className="ha-grid">
          {FACTORS.map((f, i) => (
            <div className="ha-card" style={{ '--i': i, '--dk': f.c }} key={f.t}>
              <span className="ha-num">0{i + 1}</span>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Purpose ---------- */}
      <section className="ha-wrap ha-purpose-wrap">
        <div ref={purposeRef} className={`ha-purpose${purposeSeen ? ' in' : ''}`}>
          <p className="ha-eyebrow">OUR PURPOSE</p>
          <p className="ha-purpose-main">
            Career Match aims to provide personalized career guidance that
            supports career exploration and decision-making. Rather than
            presenting personality as a direct answer to career choice, the
            system combines multiple aspects of a user&apos;s profile to identify
            career paths that may be relevant to them.
          </p>
          <p className="ha-purpose-note">
            Career Match is a guidance and decision-support tool. It does not
            replace professional career counseling or guarantee career success
            or employment.
          </p>
        </div>
      </section>
    </div>
  )
}

export default HeroAbout