import React, { useEffect, useRef, useState } from 'react'
import '../css/howItWorks.css'

const STEPS = [
  {
    n: 'Personality',
    t: 'Understand Your Personality',
    s: 'Myers-Briggs Type Indicator (MBTI) Personality Type',
    b: 'Your personality type provides insight into how you may approach tasks, make decisions, communicate, and solve problems. Career Match uses your MBTI personality type as one factor in understanding your preferred ways of working and the types of career activities that may relate to your characteristics.',
    k: 'chips',
    v: [
      ['INTJ', 'Strategic planner'],
      ['ENFP', 'Creative communicator'],
      ['ISTJ', 'Detail-oriented'],
      ['ENTP', 'Innovative problem-solver'],
    ],
    e: 'An INTJ may be connected with career activities involving strategic thinking, analysis, research, and complex problem-solving.',
    d: '#4b3578',
  },
  {
    n: 'Education',
    t: 'Understand Your Educational Background',
    s: 'Your Degree Program',
    b: 'Your education provides context about your field of study and preparation. Career Match considers this information together with your other profile factors when identifying relevant career paths.',
    k: 'rows',
    v: ['Degree Program', 'Field of Study', 'Educational Level'],
    e: 'A student taking Bachelor of Science in Computer Science may have an academic background related to areas such as programming, computing, information systems, and data analysis. These areas can provide context when the system identifies potential career paths.',
    d: '#23704a',
  },
  {
    n: 'Skills',
    t: 'Share Your Skills',
    s: 'Tell Us What You Can Do',
    b: 'Your skills provide information about the abilities and competencies you currently have. Career Match considers your technical, interpersonal, and other skills to better understand the types of tasks and activities that may relate to different career paths.',
    k: 'skills',
    v: ['Programming', 'Problem-solving', 'Communication', 'Teamwork'],
    e: 'A student who identifies programming, problem-solving, communication, and teamwork as their skills provides the system with information about their abilities that may be relevant to different career paths.',
    d: '#245f8a',
  },
  {
    n: 'Preferences',
    t: 'Share Your Career Preferences',
    s: 'Tell Us What You Prefer',
    b: 'Your career preferences describe the types of work, activities, environments, and career interests that appeal to you. Your self-description also gives Career Match additional context about the work you enjoy, your interests, and your career goals.',
    k: 'toggles',
    v: ['Analytical tasks', 'Collaborative projects', 'Problem-solving'],
    e: 'A student who describes enjoying analytical tasks, collaborative projects, and problem-solving provides the system with additional information about their preferred work style and career interests.',
    d: '#8a6508',
  },
  {
    n: 'Results',
    t: 'Explore Your Career Recommendations',
    s: 'See Career Paths Based on Your Overall Profile',
    b: 'After collecting your information, Career Match analyzes your profile using patterns learned from the career dataset. The system then generates career recommendations based on the combined information from your personality, academic background, skills, and preferences.',
    k: 'fan',
    v: [
      ['Top 3 Career Recommendations', 'Career paths identified as having stronger matches with your profile.'],
      ['Career Roadmap', 'Suggested areas for further development based on the career path you are exploring.'],
      ['Careers To Avoid', "Career paths that may show a lower alignment with your overall profile based on the system's analysis."],
    ],
    d: '#a2442b',
  },
]

/* ---------- Path: right-angle turns through five nodes ---------- */
const NP = [[35, 45], [80, 150], [35, 255], [80, 360], [35, 455]]

const buildPath = () => {
  let d = `M${NP[0][0]} ${NP[0][1]}`
  let tot = 0
  const cum = [0]
  for (let k = 1; k < NP.length; k++) {
    const [x0, y0] = NP[k - 1]
    const [x1, y1] = NP[k]
    d += ` V${(y0 + y1) / 2} H${x1} V${y1}`
    tot += Math.abs(y1 - y0) + Math.abs(x1 - x0)
    cum.push(tot)
  }
  return { d, F: cum.map((c) => c / tot) }
}

const { d: PATH_D, F } = buildPath()

const Visual = ({ step }) => {
  const cls = step.k === 'rows' || step.k === 'fan' ? step.k : ''
  return (
    <div className={`hiw-vis ${cls}`}>
      {step.k === 'chips' &&
        step.v.map((x, i) => (
          <div className="hiw-tc" style={{ '--i': i }} key={x[0]}>
            <b>{x[0]}</b>
            {x[1]}
          </div>
        ))}
      {step.k === 'rows' &&
        step.v.map((x, i) => (
          <div className="hiw-rw" style={{ '--i': i }} key={x}>
            {x}
          </div>
        ))}
      {step.k === 'skills' &&
        step.v.map((x, i) => (
          <span className="hiw-sk" style={{ '--i': i }} key={x}>
            {x}
          </span>
        ))}
      {step.k === 'toggles' &&
        step.v.map((x, i) => (
          <div className="hiw-tg" style={{ '--i': i }} key={x}>
            <span className="hiw-sw" />
            {x}
          </div>
        ))}
      {step.k === 'fan' &&
        step.v.map((x, i) => (
          <div style={{ '--i': i }} key={x[0]}>
            <b>{x[0]}</b>
            {x[1]}
          </div>
        ))}
    </div>
  )
}

const HowItWorks = () => {
  const stepRefs = useRef([])
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(0)
  const [seen, setSeen] = useState([])
  const [mobile, setMobile] = useState(false)

  /* steps animate in once as they reach the screen */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number(e.target.dataset.idx)
            setSeen((s) => (s.includes(idx) ? s : [...s, idx]))
          }
        }),
      { threshold: 0.3 }
    )
    stepRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  /* scroll: line draws down to each step, nodes light up */
  useEffect(() => {
    const mq = window.matchMedia('(max-width:760px)')

    const update = () => {
      const T = stepRefs.current.map(
        (el) => el.getBoundingClientRect().top + window.scrollY
      )
      const ref = window.scrollY + window.innerHeight * 0.5
      let prog = 0
      if (ref >= T[4]) prog = 1
      else if (ref > T[0]) {
        let k = 0
        while (ref >= T[k + 1]) k++
        prog = F[k] + ((F[k + 1] - F[k]) * (ref - T[k])) / (T[k + 1] - T[k])
      }
      setProgress(prog)
      let a = 0
      T.forEach((t, k) => {
        if (ref >= t) a = k
      })
      setActive(a)
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        update()
      })
    }
    const onResize = () => {
      setMobile(mq.matches)
      update()
    }

    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const goTo = (k) => {
    const top = stepRefs.current[k].getBoundingClientRect().top + window.scrollY + 2
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="hiw">
      <section className="hiw-wrap hiw-intro">
        <p className="hiw-eyebrow">HOW IT WORKS</p>
        <h1>How Career Match Connects Your Profile to Career Paths</h1>
        <p>
          Career Match considers different aspects of your profile to identify
          career paths that may align with your personality, academic
          background, skills, and preferences. Each factor provides different
          information that contributes to your overall career profile.
        </p>
      </section>

      <section id="how" aria-label="How Career Match works, five steps">
        <div className="hiw-journey">
          <aside className="hiw-rail">
            <div className="hiw-path">
              <svg viewBox={mobile ? '15 0 80 500' : '0 0 140 500'} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <mask id="hiw-mask" maskUnits="userSpaceOnUse" x="-20" y="0" width="200" height="500">
                    <path
                      d={PATH_D}
                      fill="none"
                      stroke="#fff"
                      strokeWidth="12"
                      strokeLinejoin="miter"
                      pathLength="100"
                      strokeDasharray="100"
                      strokeDashoffset={100 - progress * 100}
                    />
                  </mask>
                </defs>
                <path d={PATH_D} fill="none" stroke="#0a0a0a" strokeWidth="3" strokeDasharray="7 6" strokeLinejoin="miter" opacity=".25" />
                <path d={PATH_D} fill="none" stroke="#0a0a0a" strokeWidth="3" strokeDasharray="7 6" strokeLinejoin="miter" mask="url(#hiw-mask)" />
                <g>
                  {NP.map((p, k) => {
                    const cls = `hiw-node${progress >= F[k] - 0.001 && k <= active ? ' done' : ''}${k === active ? ' act' : ''}`
                    return (
                      <g
                        key={k}
                        className={cls}
                        tabIndex={0}
                        role="button"
                        aria-label={`Go to step ${k + 1}: ${STEPS[k].n}`}
                        onClick={() => goTo(k)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            goTo(k)
                          }
                        }}
                      >
                        <circle cx={p[0]} cy={p[1]} r="13" />
                        <text className="n" x={p[0]} y={p[1]}>{k + 1}</text>
                        <text className="lb" x={p[0] + 19} y={p[1]}>{STEPS[k].n}</text>
                      </g>
                    )
                  })}
                </g>
              </svg>
            </div>
          </aside>

          <div className="hiw-steps">
            {STEPS.map((s, i) => (
              <article
                key={s.n}
                data-idx={i}
                ref={(el) => (stepRefs.current[i] = el)}
                className={`hiw-step${seen.includes(i) ? ' on' : ''}`}
                style={{ '--dk': s.d }}
                aria-label={`Step ${i + 1}: ${s.t}`}
              >
                <div className="hiw-pn">
                  <div>
                    <p className="hiw-num">0{i + 1}</p>
                    <h2>{s.t}</h2>
                    <h3>{s.s}</h3>
                    <p>{s.b}</p>
                  </div>
                  <div>
                    <Visual step={s} />
                    {s.e && (
                      <p className="hiw-ex">
                        <b>Example:</b> {s.e}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HowItWorks