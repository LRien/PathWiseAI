import React, { useEffect, useRef, useState } from 'react'

const NoteSection = () => {
  const sectionRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} style={styles.section}>
      <div
        style={{
          ...styles.card,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
        }}
      >
        <p style={styles.text}>
          Career Connection Note: The career connections presented for each
          personality type are general associations based on commonly described
          personality characteristics. Personality type alone does not determine
          career suitability. Career Match considers personality, academic
          background, skills, and user preferences when providing career
          recommendations.
        </p>
      </div>
    </section>
  )
}

const styles = {
  section: {
    width: '100%',
    minHeight: '60vh',          // shorter section so the note isn't lost in empty space
    backgroundColor: 'transparent', // background removed
    display: 'flex',
    alignItems: 'flex-end',     // pushes the note down to the bottom of the section
    justifyContent: 'center',
    padding: '40px 24px 48px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '760px',
    backgroundColor: 'transparent', // navy card background removed
    padding: 0,
    boxSizing: 'border-box',
    transition:
      'opacity 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s, transform 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
  },
  text: {
    margin: 0,
    color: '#2b2a27',           // dark text, since the navy background is gone
    fontFamily: "'Inter', sans-serif",
    fontSize: '12px',           // was 16px
    fontWeight: 500,
    lineHeight: 1.5,
    textAlign: 'center',
  },
}

export default NoteSection