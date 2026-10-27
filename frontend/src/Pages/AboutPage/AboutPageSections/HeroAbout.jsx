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

/* paragraph text size, stretched to the full width so there is no dead space on the right */
const headingStyle = { maxWidth: 'none', width: '100%' }
/* statement card: light cream card, bold dark text (words still light up on scroll) */
const statementStyle = {
  background: '#faf6ee',
  color: '#0a0a0a',
  borderRadius: '20px',
  padding: 'clamp(1rem, 2.5vw, 1.25rem) clamp(1.25rem, 3vw, 1.75rem)',
  boxShadow: 'none',
  border: 'none',
  textAlign: 'left',
  fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
  fontWeight: 700,
  lineHeight: 1.4,
  letterSpacing: 'normal',
  textTransform: 'none',
  maxWidth: 'none',
  width: '100%',
}
const wordStyle = (on) => ({
  color: on ? '#0a0a0a' : 'rgba(10, 10, 10, 0.28)',
  opacity: 1,
  transition: 'color 0.3s ease',
})

/* Our Purpose card: text and divider stretch across the whole card, no dead space on the right */
const purposeStyles = {
  main: {
    fontSize: 'clamp(1.15rem, 1.8vw, 1.6rem)',
    lineHeight: 1.35,
    maxWidth: 'none',
    width: '100%',
    margin: '0 0 1.25rem',
  },
  note: {
    fontSize: 'clamp(0.95rem, 1.2vw, 1.05rem)',
    lineHeight: 1.6,
    maxWidth: 'none',
    width: '100%',
    paddingTop: '1.1rem',
    margin: 0,
  },
}

const bodyStyle = { fontSize: 'clamp(1rem, 1.5vw, 1.2rem)', maxWidth: 'none', width: '100%' }

/* smaller card / purpose text + mobile layout */
const RESPONSIVE_CSS = `
/* four factor cards: compact boxes, 4 across on desktop, 2 on tablet, 1 on phone */
.ha .ha-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 1.25rem !important; }
.ha .ha-card { padding: 1.25rem 1.25rem 1.5rem !important; min-height: 0 !important; height: auto !important; border-radius: 20px !important; }
.ha .ha-card .ha-num { font-size: clamp(1.5rem, 2.2vw, 2rem) !important; line-height: 1 !important; margin: 0 0 0.75rem !important; }
.ha .ha-card h3 { font-size: clamp(1.05rem, 1.5vw, 1.25rem) !important; line-height: 1.2 !important; margin: 0 0 0.5rem !important; }
.ha .ha-card p { font-size: clamp(0.88rem, 1.1vw, 0.98rem) !important; line-height: 1.5 !important; margin: 0 !important; }
.ha .ha-eyebrow { font-size: clamp(0.7rem, 1vw, 0.8rem) !important; }

/* our purpose box: smaller padding */
.ha .ha-purpose { padding: clamp(1.5rem, 3vw, 2.5rem) !important; border-radius: 24px !important; }

@media (max-width: 1100px) {
  .ha .ha-grid { grid-template-columns: repeat(2, 1fr) !important; }
}

@media (max-width: 640px) {
  .ha .ha-grid { grid-template-columns: 1fr !important; gap: 1rem !important; }
  .ha .ha-intro h1 { font-size: clamp(2rem, 10vw, 3rem) !important; line-height: 1.05 !important; }
  .ha .ha-lead { font-size: clamp(1.6rem, 8vw, 2.25rem) !important; line-height: 1.1 !important; }
  .ha .ha-purpose { padding: 1.5rem 1.25rem !important; border-radius: 20px !important; }
}
`


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
      <style>{RESPONSIVE_CSS}</style>

      {/* ---------- Intro (plays on load) ---------- */}
      <section className="ha-wrap ha-intro">
        <h1 className="ha-fade" style={{ '--i': 1, ...headingStyle }}>
          Connecting Personality to Career Exploration
        </h1>

        <p className="ha-body ha-fade" style={{ '--i': 2, ...bodyStyle }}>
          Career Match is a web-based Personality-Based Career Guidance System
          developed as an undergraduate thesis. The system explores how
          personality, academic background, skills, and user preferences can be
          considered together when providing career guidance.
        </p>

        <p className="ha-body ha-fade" style={{ '--i': 3, ...bodyStyle }}>
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
        <h2 className="ha-lead" style={{ textTransform: 'none' }}>The Role of Personality</h2>
        <p className="ha-body" style={bodyStyle}>
          Personality can provide insight into a person&apos;s preferred ways of
          approaching tasks, solving problems, communicating, and working with
          others. Career Match uses the Myers-Briggs Type Indicator (MBTI) as one
          of the factors in understanding these characteristics.
        </p>
        <h2 ref={spotRef} className="ha-statement" aria-label={STATEMENT} style={statementStyle}>
          {WORDS.map((w, i) => (
            <span key={i} aria-hidden="true" className={i < lit ? 'lit' : ''} style={wordStyle(i < lit)}>
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
          <p className="ha-purpose-main" style={purposeStyles.main}>
            Career Match aims to provide personalized career guidance that
            supports career exploration and decision-making. Rather than
            presenting personality as a direct answer to career choice, the
            system combines multiple aspects of a user&apos;s profile to identify
            career paths that may be relevant to them.
          </p>
          <p className="ha-purpose-note" style={purposeStyles.note}>
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