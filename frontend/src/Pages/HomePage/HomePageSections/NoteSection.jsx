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
    minHeight: '100vh',
    backgroundColor: '#F8F0E5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '760px',
    backgroundColor: '#020530',
    borderRadius: '10px',
    padding: '40px 32px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    boxSizing: 'border-box',
    transition:
      'opacity 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s, transform 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
  },
  text: {
    margin: 0,
    color: '#FFFFFF',
    fontFamily: "'Inter', sans-serif",
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: 1.4,
    textAlign: 'center',
  },
}

export default NoteSection