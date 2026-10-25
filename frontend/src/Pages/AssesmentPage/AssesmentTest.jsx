import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import { submitAssessment } from '../../api/assessment'
import { getPrediction, selectCareer } from '../../api/predictions'
import { getProfile } from '../../Data/settingsStore'
import PredictionModal from './PredictionModal' // adjust the path to where you keep the modal

/* ---------- Theme (matches the homepage) ----------
   cream page  #f3e7d6   · lighter cream cards #fbf6ee · border #e6d8c3
   deep navy   #0b0b2b   (buttons, selected states)
   puzzle accents: blue #2f80e0 · yellow #f2c230 · red #e0404a · orange #e8832a · slate #6b7a99 */

const TYPES = [
  ['INTJ', 'Architect'], ['INTP', 'Logician'], ['ENTJ', 'Commander'], ['ENTP', 'Debater'],
  ['INFJ', 'Advocate'], ['INFP', 'Mediator'], ['ENFJ', 'Protagonist'], ['ENFP', 'Campaigner'],
  ['ISTJ', 'Logistician'], ['ISFJ', 'Defender'], ['ESTJ', 'Executive'], ['ESFJ', 'Consul'],
  ['ISTP', 'Virtuoso'], ['ISFP', 'Adventurer'], ['ESTP', 'Entrepreneur'], ['ESFP', 'Entertainer'],
]

/* skills across many fields, not only computing */
const SKILLS = {
  soft: [
    'Hardworking', 'Flexible', 'Communication', 'Teamwork', 'Adaptability', 'Time Management',
    'Problem Solving', 'Leadership', 'Creativity', 'Attention to Detail', 'Critical Thinking',
    'Public Speaking', 'Empathy', 'Negotiation', 'Curiosity', 'Self-Motivation', 'Decision Making',
    'Collaboration', 'Organization', 'Resilience', 'Presentation', 'Mentoring', 'Strategic Thinking',
    'Customer Service', 'Fast Learner', 'Initiative', 'Active Listening', 'Patience', 'Multitasking',
    'Conflict Resolution', 'Emotional Intelligence', 'Persuasion', 'Professional Networking', 'Stress Management',
    'Accountability', 'Reliability', 'Cultural Awareness', 'Open-mindedness', 'Delegation', 'Coaching',
    'Analytical Thinking', 'Research Skills', 'Goal Setting', 'Professionalism', 'Integrity',
    'Perseverance', 'Adaptive Learning', 'Self-Discipline', 'Positive Attitude', 'Handling Feedback',
    'Team Leadership', 'Diplomacy', 'Working Under Pressure', 'Customer Focus', 'Innovation',
    'Self-Awareness', 'Dependability', 'Ownership',
  ],
  tech: [
    'Python', 'JavaScript', 'SQL', 'HTML & CSS', 'Web Development', 'Mobile Development', 'Data Analysis',
    'Machine Learning', 'Database Design', 'Cybersecurity', 'Networking', 'Cloud Computing', 'Debugging',
    'Excel / Spreadsheets', 'Microsoft Office', 'IT Support', 'Software Testing', 'Version Control (Git)',
    'Java', 'C / C++', 'C#', 'PHP', 'React', 'Node.js', 'API Development', 'Data Visualization',
    'Power BI / Tableau', 'DevOps', 'Linux', 'Game Development', 'Technical Documentation',
    'System Administration', 'Automation / Scripting', 'Computer Hardware Repair', 'Data Entry',
    'Artificial Intelligence', 'Mobile App Testing', 'TypeScript', 'Data Engineering', 'Big Data',
    'Natural Language Processing', 'Computer Vision', 'Help Desk Support', 'WordPress',
    'Penetration Testing Basics', 'Embedded Systems', 'Network Security', 'Virtualization',
  ],
  business: [
    'Project Management', 'Business Writing', 'Human Resources', 'Inventory Management', 'Supply Chain',
    'Entrepreneurship', 'Business Analysis', 'Retail Management', 'Procurement', 'Logistics', 'Recruitment',
    'Operations Management', 'Agile / Scrum', 'Business Planning', 'Process Improvement', 'Team Management',
    'Office Administration', 'Administrative Support', 'Executive Assistance', 'Strategic Planning',
    'Warehouse Management', 'Quality Assurance', 'Vendor Management', 'Performance Management',
    'Training & Development', 'Employee Relations', 'Change Management', 'Business Development',
    'Store Management', 'Franchise Management', 'Calendar & Scheduling',
  ],
  finance: [
    'Accounting', 'Bookkeeping', 'Financial Analysis', 'Budgeting', 'Auditing', 'Taxation', 'Payroll',
    'Banking Operations', 'Insurance Basics', 'Risk Management', 'Investment Analysis', 'Financial Reporting',
    'Accounts Payable', 'Accounts Receivable', 'Credit Analysis', 'Cost Accounting', 'Financial Forecasting',
    'Financial Modeling', 'QuickBooks', 'Loan Processing', 'Treasury Management', 'Economics',
    'Actuarial Basics', 'Billing & Collections', 'Stock Market Basics', 'Financial Advising',
    'Fraud Detection', 'Account Reconciliation',
  ],
  marketing: [
    'Marketing', 'Sales', 'Market Research', 'Digital Marketing', 'SEO', 'E-commerce', 'Public Relations',
    'Brand Strategy', 'Email Marketing', 'Content Strategy', 'Lead Generation',
    'Customer Relationship Management', 'Account Management', 'Retail Sales', 'Product Marketing',
    'Pricing Strategy', 'Social Media Advertising', 'Telemarketing', 'Influencer Marketing',
    'Google Analytics', 'Campaign Management', 'Merchandising', 'Direct Selling', 'Consumer Behavior',
    'Customer Retention', 'Sales Forecasting', 'Product Demonstration', 'Advertising', 'Media Planning',
    'Affiliate Marketing',
  ],
  law: [
    'Legal Research', 'Contract Drafting', 'Regulatory Compliance', 'Legal Writing', 'Paralegal Support',
    'Case Management', 'Policy Analysis', 'Public Administration', 'Document Review', 'Mediation',
    'Intellectual Property Basics', 'Labor Law Basics', 'Corporate Law Basics', 'Immigration Procedures',
    'Records Management', 'Community Development', 'Government Procedures', 'Law Enforcement Basics',
    'Investigation', 'Ethics & Governance', 'Grant Writing', 'Fundraising', 'Nonprofit Management',
    'Notarial Work', 'Court Procedures', 'Legal Documentation', 'Data Privacy Compliance',
    'Political Research', 'Social Work Basics', 'Disaster Response Planning',
  ],
  hospitality: [
    'Guest Service', 'Culinary Arts', 'Event Planning', 'Tour Guiding', 'Hotel Front Desk', 'Baking & Pastry',
    'Event Hosting', 'Food & Beverage Service', 'Housekeeping Management', 'Bartending', 'Travel Planning',
    'Reservations Management', 'Restaurant Management', 'Catering', 'Barista Skills', 'Menu Planning',
    'Airline Customer Service', 'Resort Operations', 'Wedding Planning', 'Food Presentation',
    'Kitchen Management', 'Concierge Services', 'Tourism Promotion',
  ],
  health: [
    'Patient Care', 'First Aid / CPR', 'Laboratory Techniques', 'Clinical Documentation', 'Medical Terminology',
    'Nutrition Planning', 'Scientific Research', 'Data Collection', 'Pharmacology Basics', 'Field Research',
    'Public Health Education', 'Psychological Assessment', 'Counseling Basics', 'Environmental Monitoring',
    'Statistics', 'Lab Safety', 'Animal Care', 'Therapy Techniques',
    'Vital Signs Monitoring', 'Medication Administration', 'Emergency Response', 'Physical Therapy Basics',
    'Dental Assistance', 'Community Health Outreach', 'Mental Health Support', 'Sports Training',
    'Veterinary Care', 'Food Safety', 'Microbiology', 'Chemistry Lab Work', 'Biotechnology Basics',
    'Elderly Care', 'Child Development', 'Occupational Therapy Basics', 'Medical Billing & Coding',
    'Pharmacy Assistance', 'Health Records Management', 'Infection Control', 'Wound Care',
    'Phlebotomy Basics', 'Epidemiology Basics', 'Wellness Coaching', 'Fitness Instruction',
    'Ecology Fieldwork', 'Rehabilitation Support', 'Agricultural Science', 'Crop Management',
    'Forestry Basics', 'Marine Biology Basics',
  ],
  eng: [
    'Technical Drawing', 'CAD / AutoCAD', 'Circuit Design', 'Electrical Wiring', 'Surveying', 'Structural Analysis',
    'Quality Control', 'Equipment Maintenance', 'Welding', 'Arduino / IoT', 'Safety Compliance',
    'Blueprint Reading', 'Machine Operation', 'Mechanical Repair', 'Plumbing', 'Construction Planning',
    '3D Modeling', 'Troubleshooting',
    'Carpentry', 'Auto Mechanics', 'HVAC Basics', 'Electronics Repair', 'Power Systems', 'CNC Operation',
    'Cost Estimation', 'Site Inspection', 'Hydraulics', 'Robotics', 'PLC Programming', 'Fabrication',
    'Painting & Finishing', 'Heavy Equipment Operation', 'Renewable Energy Basics', 'Mechanical Design',
    'Network Cabling', 'Masonry', 'Tile Setting', 'Roofing', 'Sheet Metal Work', 'Drone Operation',
    'GIS Mapping', 'Geotechnical Basics', 'Instrumentation', 'Industrial Safety',
    'Aircraft Maintenance Basics', 'Telecommunications Installation', 'Solar Panel Installation',
    'Vehicle Diagnostics', 'Pipefitting', 'Building Maintenance', 'Lean Manufacturing',
  ],
  creative: [
    'Lesson Planning', 'Classroom Management', 'Tutoring', 'Curriculum Design', 'Graphic Design', 'Photography',
    'Video Editing', 'Content Writing', 'Copywriting', 'Social Media Management', 'Illustration', 'Storytelling',
    'Foreign Languages', 'Translation', 'Music / Performance', 'Journalism', 'UI/UX Design', 'Fashion Design',
    'Special Education', 'Early Childhood Education', 'Podcasting', 'Animation', 'Interior Design',
    'Songwriting', 'Creative Writing', 'Editing & Proofreading', 'Voice Acting', 'Painting & Drawing',
    'Brand Design', 'Film Production', 'Community Organizing', 'Sign Language', 'Sports Coaching',
    'Teaching Methods', 'Educational Technology', 'Academic Research', 'Student Assessment',
    'Library Services', 'Digital Art', 'Motion Graphics', 'Sound Engineering', 'Music Production',
    'Dance / Choreography', 'Acting / Theater', 'Visual Merchandising', 'Jewelry Making',
    'Handmade Crafts', 'Pattern Making', 'Sewing & Tailoring', 'Makeup Artistry', 'Hair Styling',
    'Technical Writing', 'Blogging',
  ],
}

const CAT = {
  soft: {
    label: 'Soft skills',
    dot: 'bg-[#0b0b2b]',
    off: 'border-[#0b0b2b]/25 text-[#0b0b2b] hover:border-[#0b0b2b] hover:bg-[#0b0b2b]/5',
    on: 'border-[#0b0b2b] bg-[#0b0b2b] text-white',
  },
  tech: {
    label: 'Technology',
    dot: 'bg-[#2f80e0]',
    off: 'border-[#2f80e0]/40 text-[#1d5fb0] hover:border-[#2f80e0] hover:bg-[#2f80e0]/10',
    on: 'border-[#2f80e0] bg-[#2f80e0] text-white',
  },
  business: {
    label: 'Business & Management',
    dot: 'bg-[#f2c230]',
    off: 'border-[#f2c230]/80 text-[#7a5a08] hover:border-[#f2c230] hover:bg-[#f2c230]/20',
    on: 'border-[#f2c230] bg-[#f2c230] text-[#0b0b2b]',
  },
  finance: {
    label: 'Finance & Accounting',
    dot: 'bg-[#2f9e62]',
    off: 'border-[#2f9e62]/45 text-[#1d7a49] hover:border-[#2f9e62] hover:bg-[#2f9e62]/10',
    on: 'border-[#2f9e62] bg-[#2f9e62] text-white',
  },
  marketing: {
    label: 'Marketing & Sales',
    dot: 'bg-[#d6558b]',
    off: 'border-[#d6558b]/45 text-[#a3305f] hover:border-[#d6558b] hover:bg-[#d6558b]/10',
    on: 'border-[#d6558b] bg-[#d6558b] text-white',
  },
  law: {
    label: 'Law & Public Service',
    dot: 'bg-[#7c5cbf]',
    off: 'border-[#7c5cbf]/45 text-[#5a3f99] hover:border-[#7c5cbf] hover:bg-[#7c5cbf]/10',
    on: 'border-[#7c5cbf] bg-[#7c5cbf] text-white',
  },
  hospitality: {
    label: 'Hospitality & Tourism',
    dot: 'bg-[#1f9d9a]',
    off: 'border-[#1f9d9a]/45 text-[#146e6c] hover:border-[#1f9d9a] hover:bg-[#1f9d9a]/10',
    on: 'border-[#1f9d9a] bg-[#1f9d9a] text-white',
  },
  health: {
    label: 'Health & Science',
    dot: 'bg-[#e0404a]',
    off: 'border-[#e0404a]/40 text-[#b0252e] hover:border-[#e0404a] hover:bg-[#e0404a]/10',
    on: 'border-[#e0404a] bg-[#e0404a] text-white',
  },
  eng: {
    label: 'Engineering & Trades',
    dot: 'bg-[#e8832a]',
    off: 'border-[#e8832a]/50 text-[#a85a10] hover:border-[#e8832a] hover:bg-[#e8832a]/10',
    on: 'border-[#e8832a] bg-[#e8832a] text-white',
  },
  creative: {
    label: 'Education & Creative',
    dot: 'bg-[#6b7a99]',
    off: 'border-[#6b7a99]/45 text-[#475371] hover:border-[#6b7a99] hover:bg-[#6b7a99]/10',
    on: 'border-[#6b7a99] bg-[#6b7a99] text-white',
  },
}

const KIND = {}
Object.entries(SKILLS).forEach(([k, list]) => list.forEach((s) => { if (!KIND[s]) KIND[s] = k }))

const DEGREE_HINTS = [
  'BS in Computer Science', 'BS in Nursing', 'BS in Accountancy', 'BS in Civil Engineering',
  'BS in Psychology', 'BS in Education', 'BS in Business Administration', 'BA in Communication',
  'BS in Biology', 'BS in Hospitality Management', 'BS in Architecture', 'BS in Information Technology',
]

/* Career preference ideas, grouped by theme so every batch mixes different kinds of preferences */
const PREF_GROUPS = {
  interests: [
    'I enjoy solving problems and finding practical solutions.',
    'I enjoy analyzing information and finding patterns.',
    'I like creative work where I can come up with my own ideas.',
    'I enjoy building or fixing things with my hands.',
    'I like researching topics and discovering new things.',
    'I enjoy designing things that look good and work well.',
    'I like writing, storytelling or communicating ideas.',
    'I enjoy working with numbers, data or financial information.',
    'I am passionate about technology and how things work.',
    'I enjoy planning and organizing events or projects.',
    'I like working with animals, plants or nature.',
    'I enjoy cooking, food or hospitality.',
  ],
  people: [
    'I would like a job that lets me help people directly.',
    'I prefer collaborating with a team over working alone.',
    'I enjoy teaching, explaining or guiding other people.',
    'I prefer working independently with minimal supervision.',
    'I enjoy meeting new people and talking to customers.',
    'I like leading a group and motivating others.',
    'I am comfortable speaking in front of an audience.',
    'I prefer quiet, focused work over constant interaction.',
    'I like supporting people through difficult times.',
    'I enjoy negotiating, persuading and closing deals.',
  ],
  environment: [
    'I prefer a calm, structured work environment with clear goals.',
    'I like fast-paced work with new challenges every day.',
    'I am interested in remote or flexible work arrangements.',
    'I like working outdoors or in different places.',
    'I prefer working in an office with a regular schedule.',
    'I would enjoy a job that involves travel.',
    'I like working in a lab, clinic or workshop.',
    'I enjoy working in a start-up where I can wear many hats.',
    'I prefer working in a large, established organization.',
    'I am open to working abroad or for international companies.',
  ],
  growth: [
    'I want a career where I can keep learning new things.',
    'I want to grow into a leadership or management role.',
    'I am interested in starting my own business someday.',
    'I want to become an expert in one specialized field.',
    'I plan to take a master’s degree or further studies.',
    'I want to earn professional certifications to advance.',
    'I want a career with clear promotions and growth steps.',
    'I would like to try different roles before settling on one.',
    'I want to build a portfolio of projects that shows my skills.',
    'I would like to become a mentor or trainer one day.',
  ],
  values: [
    'I prefer work that has a meaningful impact on society.',
    'I want work-life balance and a stable career path.',
    'I want a high-earning career, even if it is demanding.',
    'I value job security, such as government or established roles.',
    'I care about sustainability and the environment.',
    'I want to contribute to my community or my country.',
    'I value creativity and freedom over a fixed routine.',
    'I want a career that supports my family and future plans.',
    'I value honesty, fairness and ethical work.',
    'I want to work on products that many people will use.',
  ],
  industries: [
    'I am interested in healthcare or medical fields.',
    'I am interested in education and training.',
    'I am interested in banking, finance or investing.',
    'I am interested in law, government or public service.',
    'I am interested in engineering and construction.',
    'I am interested in software, AI or data.',
    'I am interested in media, arts or entertainment.',
    'I am interested in tourism, hotels or restaurants.',
    'I am interested in agriculture or food production.',
    'I am interested in marketing, advertising or sales.',
    'I am interested in science and research.',
    'I am interested in logistics, shipping or manufacturing.',
  ],
}

const VISIBLE = 15
const VISIBLE_PREFS = 6

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* Pool of skills not yet chosen. Skills from the previous batch are skipped (when enough others remain)
   so "Show different skills" really shows something new. */
const freshPool = (list, selected, previous) => {
  const open = list.filter((s) => !selected.includes(s))
  const unseen = open.filter((s) => !previous.includes(s))
  return shuffle(unseen.length >= 3 ? unseen : open)
}

/* All = an even mix taken in turns from every field (so every field shows up);
   a tab = only that group. */
const pickSkills = (filter, selected, previous) => {
  if (filter !== 'all') return freshPool(SKILLS[filter], selected, previous).slice(0, VISIBLE)

  const pools = shuffle(Object.keys(SKILLS)).map((k) => freshPool(SKILLS[k], selected, previous))
  const out = []
  for (let round = 0; out.length < VISIBLE && round < VISIBLE; round++) {
    for (const pool of pools) {
      if (pool[round] && out.length < VISIBLE) out.push(pool[round])
    }
  }
  return shuffle(out)
}

/* A batch of preference ideas: one from each theme in turns, so the list is always varied.
   Ideas already in the text box, and ones from the previous batch, are skipped when possible. */
const pickPrefs = (current, previous) => {
  const pools = Object.values(PREF_GROUPS).map((list) => {
    const open = list.filter((t) => !current.includes(t))
    const unseen = open.filter((t) => !previous.includes(t))
    return shuffle(unseen.length ? unseen : open)
  })
  const out = []
  for (let round = 0; out.length < VISIBLE_PREFS && round < 3; round++) {
    for (const pool of shuffle(pools)) {
      if (pool[round] && out.length < VISIBLE_PREFS) out.push(pool[round])
    }
  }
  return shuffle(out)
}

const Card = ({ n, title, optional, children }) => (
  <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:p-7">
    <div className="mb-1 flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b0b2b] text-xs font-semibold text-white">
        {n}
      </span>
      <h2 className="text-lg font-extrabold text-black">
        {title}
        {optional && <span className="ml-1.5 text-sm font-normal text-neutral-500">(Optional)</span>}
      </h2>
    </div>
    <div className="sm:pl-10">{children}</div>
  </section>
)

const inputCls =
  'w-full rounded-xl border border-[#e0d1ba] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0b0b2b] focus:ring-2 focus:ring-[#0b0b2b]/15'

/* ------------------------------------------------------------------ */
/* Loading animation: your career gets built, step by step             */
/* Bars drop in one after another while the AI works. When the result  */
/* is ready they lock in, a flag goes up, and then the modal opens.    */
/* ------------------------------------------------------------------ */
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const BUILD_LINES = [
  'Reading your personality type...',
  'Looking at your academic background...',
  'Matching your skills to careers...',
  'Comparing hundreds of career paths...',
  'Ranking your top matches...',
]
const MIN_SHOW = 2800 // ms the animation stays up, even if the result arrives fast
const FINISH_HOLD = 1200 // ms to enjoy the finished build before the modal opens

const BAR_COLORS = ['#2f80e0', '#f2c230', '#e0404a', '#e8832a', '#6b7a99']
const BAR_W = 34
const BAR_GAP = 8
const BAR_X0 = (240 - (BAR_COLORS.length * BAR_W + (BAR_COLORS.length - 1) * BAR_GAP)) / 2
const BAR_BASE = 160
const BAR_H = BAR_COLORS.map((_, i) => 30 + i * 24)

const BuildingOverlay = ({ ready, onFinished }) => {
  const rootRef = useRef(null)
  const loopRef = useRef(null)
  const startedAt = useRef(Date.now())
  const finishedCb = useRef(onFinished)
  finishedCb.current = onFinished

  const [line, setLine] = useState(0)
  const [finished, setFinished] = useState(false)

  /* the looping build: bars drop in one by one, then lift away and start again */
  useEffect(() => {
    if (reducedMotion() || !rootRef.current) return undefined
    const bars = rootRef.current.querySelectorAll('.bar')
    loopRef.current = animate(bars, {
      translateY: [-150, 0],
      opacity: [0, 1],
      duration: 650,
      delay: stagger(240),
      ease: 'outBounce',
      loop: true,
      alternate: true,
      loopDelay: 500,
    })
    return () => loopRef.current?.pause()
  }, [])

  /* rotating status text, stops once the result is ready */
  useEffect(() => {
    if (ready) return undefined
    const id = setInterval(() => setLine((n) => (n + 1) % BUILD_LINES.length), 2200)
    return () => clearInterval(id)
  }, [ready])

  /* the result is in: wait out the minimum time, lock the build in, raise the flag, then hand over */
  useEffect(() => {
    if (!ready) return undefined
    const wait = Math.max(0, MIN_SHOW - (Date.now() - startedAt.current))
    let t2 = 0

    const t1 = setTimeout(() => {
      setFinished(true)
      loopRef.current?.pause()

      if (rootRef.current && !reducedMotion()) {
        const bars = rootRef.current.querySelectorAll('.bar')
        const flag = rootRef.current.querySelector('.flag')
        animate(bars, { translateY: 0, opacity: 1, duration: 300, ease: 'outQuad' })
        animate(bars, { scale: [1, 1.1, 1], duration: 450, delay: stagger(70, { start: 250 }), ease: 'outQuad' })
        if (flag) animate(flag, { scale: [0, 1], opacity: [0, 1], duration: 600, delay: 650, ease: 'outBack' })
      } else if (rootRef.current) {
        const flag = rootRef.current.querySelector('.flag')
        if (flag) flag.style.opacity = '1'
      }

      t2 = setTimeout(() => finishedCb.current?.(), FINISH_HOLD + 650)
    }, wait)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ready])

  const last = BAR_COLORS.length - 1
  const flagX = BAR_X0 + last * (BAR_W + BAR_GAP) + BAR_W / 2
  const flagY = BAR_BASE - BAR_H[last]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3e7d6]/95 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm text-center">
        <svg
          ref={rootRef}
          viewBox="0 0 240 190"
          className="mx-auto block h-auto w-full max-w-[300px]"
          aria-hidden="true"
        >
          {/* ground */}
          <rect x="8" y={BAR_BASE} width="224" height="6" rx="3" fill="#d9c8ae" />

          {/* the bars that get built */}
          {BAR_COLORS.map((color, i) => (
            <g
              key={color}
              className="bar"
              style={{ opacity: reducedMotion() ? 1 : 0, transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            >
              <rect
                x={BAR_X0 + i * (BAR_W + BAR_GAP)}
                y={BAR_BASE - BAR_H[i]}
                width={BAR_W}
                height={BAR_H[i]}
                rx="6"
                fill={color}
              />
              <rect
                x={BAR_X0 + i * (BAR_W + BAR_GAP) + 5}
                y={BAR_BASE - BAR_H[i] + 5}
                width={BAR_W - 10}
                height="6"
                rx="3"
                fill="#fff"
                opacity="0.35"
              />
            </g>
          ))}

          {/* flag on the tallest bar, raised when the result is ready */}
          <g
            className="flag"
            style={{ opacity: 0, transformBox: 'fill-box', transformOrigin: '0% 100%' }}
            transform={`translate(${flagX} ${flagY})`}
          >
            <rect x="-1.5" y="-30" width="3" height="30" rx="1.5" fill="#0b0b2b" />
            <polygon points="1.5,-30 24,-23 1.5,-16" fill="#2f9e62" />
          </g>
        </svg>

        <div className="mt-6 text-xl font-black tracking-tight text-black">
          {finished ? 'Your matches are ready!' : 'Building your career matches'}
        </div>
        <div className="mt-2 min-h-[20px] text-sm text-neutral-600">
          {finished ? 'Opening your results...' : BUILD_LINES[line]}
        </div>
        {!finished && (
          <div className="mt-1 text-xs text-neutral-500">
            This can take up to a minute the first time. Please keep this page open.
          </div>
        )}
      </div>
    </div>
  )
}

const AssesmentTest = () => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  /* the saved prediction + the inputs that produced it; when set, the result modal opens */
  const [result, setResult] = useState(null)
  /* the prediction is loaded but the build animation is still finishing; the modal opens after it */
  const [pending, setPending] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [selectError, setSelectError] = useState('')

  /* pre-filled from the saved profile, if there is one */
  const [mbti, setMbti] = useState(() => getProfile().mbti)
  const [degree, setDegree] = useState(() => getProfile().degree)
  const [skills, setSkills] = useState([])
  const [otherSkills, setOtherSkills] = useState('')
  const [pref, setPref] = useState('')
  const [filter, setFilter] = useState('all')
  const [skillSeed, setSkillSeed] = useState(0)
  const [prefSeed, setPrefSeed] = useState(0)
  const [hint, setHint] = useState(DEGREE_HINTS[0])
  const lastBatch = useRef([])
  const lastPrefs = useRef([])

  useEffect(() => {
    setHint(DEGREE_HINTS[Math.floor(Math.random() * DEGREE_HINTS.length)])
  }, [])

  /* random chips: change on every shuffle / tab change; selected chips always stay on screen */
  const randomSkills = useMemo(
    () => pickSkills(filter, skills, lastBatch.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skillSeed, filter]
  )
  useEffect(() => {
    lastBatch.current = randomSkills
  }, [randomSkills])

  const shownSkills = useMemo(() => {
    const sel = skills.filter((s) => filter === 'all' || KIND[s] === filter)
    return [...randomSkills.filter((s) => !sel.includes(s)), ...sel]
  }, [randomSkills, skills, filter])

  const suggestions = useMemo(
    () => pickPrefs(pref, lastPrefs.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefSeed]
  )
  useEffect(() => {
    lastPrefs.current = suggestions
  }, [suggestions])

  const toggleSkill = (s) => setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  const addSuggestion = (t) => setPref((cur) => (cur.includes(t) ? cur : cur ? `${cur.trim()} ${t}` : t))

  const extra = otherSkills.split(',').map((s) => s.trim()).filter(Boolean)
  const done = [!!mbti, degree.trim().length > 1, skills.length + extra.length > 0, true]
  const first = done.findIndex((d) => !d)
  const active = first === -1 ? 3 : first
  const valid = done[0] && done[1] && done[2]
  const missing = [!done[0] && 'personality', !done[1] && 'degree', !done[2] && 'skills'].filter(Boolean)

  /* Enter inside a text input should not submit the form; only the Start Assessment button does.
     The textarea still allows new lines, and buttons keep working with Enter/Space. */
  const blockEnterSubmit = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault()
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitError('')
    setSubmitting(true)

    const allSkills = [...new Set([...skills, ...extra])]

    try {
      const id = await submitAssessment({
        mbti,
        degree: degree.trim(),
        skills: allSkills,
        softSkills: skills.filter((s) => KIND[s] === 'soft'),
        fieldSkills: skills.filter((s) => KIND[s] !== 'soft'),
        preference: pref.trim(),
      })

      /* load the saved prediction; the build animation finishes first, then the modal opens */
      try {
        const pred = await getPrediction(id)
        setSelectError('')
        setPending({
          pred: { ...pred, id: pred?.id ?? id },
          input: { mbti, degree: degree.trim(), skills: allSkills },
        })
      } catch {
        // the prediction is saved, so the dashboard can still show it
        navigate('/dashboard')
      }
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  /* called by the animation once the finished build has been shown: now open the result modal */
  const showResult = () => {
    setResult(pending)
    setPending(null)
    setSubmitting(false)
  }

  /* choose a career in the modal: save it, then open its roadmap */
  const openRoadmap = async (title) => {
    const id = result?.pred?.id
    if (!id || !title || selecting) return

    setSelecting(true)
    setSelectError('')

    try {
      await selectCareer(id, title)

      try {
        localStorage.setItem('selectedCareer', JSON.stringify({ predictionId: id, career: title }))
      } catch {
        // the database remains the source of the selected career
      }

      navigate('/dashboard/roadmap', { state: { predictionId: id } })
    } catch (err) {
      setSelectError(err?.message || 'Unable to select this career. Please try again.')
      setSelecting(false)
    }
  }

  /* closing the modal leaves the saved prediction on the dashboard */
  const closeResult = () => navigate('/dashboard')

  /* go to the previous page; if the page was opened directly (no history), fall back to the dashboard */
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/dashboard')
  }

  const steps = ['Personality', 'Background', 'Skills', 'Preferences']
  const tabs = [['all', 'All'], ...Object.entries(CAT).map(([k, v]) => [k, v.label])]

  /* the assessment is saved to the user's account, so they must be logged in */
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />

  return (
    <main className="min-h-screen bg-[#f3e7d6] px-4 pb-16 pt-10 text-neutral-900 sm:pt-14">
      <form onSubmit={submit} onKeyDown={blockEnterSubmit} className="mx-auto w-full max-w-3xl">
        <header>
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#d9c8ae] bg-white px-4 py-2 text-xs font-bold text-[#0b0b2b] transition hover:border-[#0b0b2b] focus:outline-none focus:ring-2 focus:ring-[#0b0b2b]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">←</span> Back
          </button>
          <h1 className="text-4xl font-black tracking-tight text-black sm:text-5xl">Tell us about yourself</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-700">
            Fill in your personality type, academic background, skills, and a short description. Our AI
            will analyze your profile and return your top career matches.
          </p>
        </header>

        {/* stepper */}
        <ol className="mt-8 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          {steps.map((label, i) => {
            const isActive = i === active
            const isDone = i < 3 && done[i] && !isActive
            return (
              <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    isActive
                      ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white'
                      : isDone
                      ? 'border-[#0b0b2b] bg-transparent text-[#0b0b2b]'
                      : 'border-[#cdbb9f] bg-transparent text-[#8a7a60]'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span className={`whitespace-nowrap ${isActive || isDone ? 'text-[#0b0b2b]' : 'text-[#8a7a60]'}`}>
                  {label}
                </span>
                {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-[#d9c8ae] sm:block" />}
              </li>
            )
          })}
        </ol>

        <div className="mt-8 space-y-4">
          {/* 1 — MBTI */}
          <Card n="1" title="MBTI Personality Type">
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Select your MBTI personality type. If you don&apos;t know your type yet, you can take the free
              personality assessment at{' '}
              <a
                href="https://www.16personalities.com/free-personality-test"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#2f80e0] hover:underline"
              >
                16Personalities
              </a>{' '}
              before continuing.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TYPES.map(([code, name]) => {
                const on = mbti === code
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMbti(code)}
                    className={`rounded-xl border px-2 py-3.5 text-center transition ${
                      on
                        ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white shadow-md'
                        : 'border-[#e0d1ba] bg-white hover:border-[#0b0b2b]/60 hover:bg-[#f7efe2]'
                    }`}
                  >
                    <span className={`block text-sm font-extrabold ${on ? 'text-white' : 'text-black'}`}>{code}</span>
                    <span className={`block text-xs ${on ? 'text-white/70' : 'text-neutral-500'}`}>{name}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* 2 — Background */}
          <Card n="2" title="Academic Background">
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Select or enter your current degree program. This helps the system identify career paths
              related to your educational background.
            </p>
            <label htmlFor="degree" className="mt-5 block text-xs font-bold text-black">Degree Program</label>
            <input
              id="degree"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder={`e.g ${hint}`}
              className={`${inputCls} mt-2 max-w-sm`}
            />
          </Card>

          {/* 3 — Skills */}
          <Card n="3" title="Skills">
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Select all skills that apply to you, whatever your field. Providing accurate information helps
              the system generate more personalized career recommendations.
            </p>

            {/* tabs wrap onto a second line instead of being cut off at the edge */}
            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Skill categories">
              {tabs.map(([k, label]) => {
                const on = filter === k
                return (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(k)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      on
                        ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white'
                        : 'border-[#e0d1ba] bg-white text-neutral-700 hover:border-[#0b0b2b]/50'
                    }`}
                  >
                    {k !== 'all' && <span className={`h-2 w-2 rounded-full ${CAT[k].dot} ${on && k === 'soft' ? 'ring-1 ring-white' : ''}`} />}
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {shownSkills.map((s) => {
                const on = skills.includes(s)
                const c = CAT[KIND[s]]
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSkill(s)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${on ? c.on : `bg-white ${c.off}`}`}
                  >
                    {on && <span className="mr-1">✓</span>}
                    {s}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => setSkillSeed((n) => n + 1)}
                className="font-bold text-[#0b0b2b] hover:underline"
              >
                ↻ Show different skills
              </button>
              {skills.length > 0 && (
                <>
                  <span className="text-neutral-500">{skills.length} selected</span>
                  <button type="button" onClick={() => setSkills([])} className="text-neutral-500 hover:text-black hover:underline">
                    Clear
                  </button>
                </>
              )}
            </div>

            <label htmlFor="other" className="mt-6 block text-xs font-bold text-black">
              Add Other Skills <span className="font-normal text-neutral-500">(type any that are not listed)</span>
            </label>
            <input
              id="other"
              value={otherSkills}
              onChange={(e) => setOtherSkills(e.target.value)}
              placeholder="e.g Figma, Sign Language, Bookkeeping — Separate with commas"
              className={`${inputCls} mt-2`}
            />
          </Card>

          {/* 4 — Preferences */}
          <Card n="4" title="User Preferences" optional>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Describe the type of work you enjoy, your preferred work environment, or your career goals.
              This information helps the system better understand your preferences when generating
              recommendations.
            </p>
            <label htmlFor="pref" className="mt-5 block text-xs font-bold text-black">Career Preference</label>
            <textarea
              id="pref"
              rows={4}
              value={pref}
              onChange={(e) => setPref(e.target.value)}
              placeholder="e.g., I enjoy solving problems, helping people, and collaborating with others."
              className={`${inputCls} mt-2 resize-y leading-relaxed`}
            />

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-600">Need ideas? Tap to add</span>
                <button
                  type="button"
                  onClick={() => setPrefSeed((n) => n + 1)}
                  className="text-xs font-bold text-[#0b0b2b] hover:underline"
                >
                  ↻ More ideas
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((t) => {
                  const used = pref.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={used}
                      onClick={() => addSuggestion(t)}
                      className={`rounded-xl border px-3 py-1.5 text-left text-xs transition ${
                        used
                          ? 'cursor-default border-[#f2c230] bg-[#f2c230]/30 text-[#7a5a08]'
                          : 'border-[#e0d1ba] bg-white text-neutral-700 hover:border-[#0b0b2b]/60 hover:bg-[#f7efe2]'
                      }`}
                    >
                      {used ? '✓ ' : '+ '}
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-neutral-600">
          Your responses will be used to generate personalized career recommendations and will be handled
          in accordance with the study&apos;s Privacy Notice.
        </p>

        {submitError && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-black">Ready to find your career match?</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {submitting
                ? 'This can take up to a minute the first time. Please keep this page open.'
                : valid
                ? 'All required fields are complete.'
                : `Complete all required fields before submitting (missing: ${missing.join(', ')})`}
            </p>
          </div>
          <button
            type="submit"
            disabled={!valid || submitting}
            className="rounded-full bg-[#0b0b2b] px-8 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:bg-[#0b0b2b]/30"
          >
            {submitting ? 'Analyzing your profile...' : 'Start Assessment'}
          </button>
        </div>
      </form>

      {/* build animation: shows while the AI works, finishes when the prediction is ready, then the modal opens */}
      {(submitting || pending) && <BuildingOverlay ready={!!pending} onFinished={showResult} />}

      {/* result modal: opens once the build animation has finished */}
      {result && (
        <PredictionModal
          pred={result.pred}
          input={result.input}
          busy={selecting}
          error={selectError}
          onClose={closeResult}
          onViewRoadmap={openRoadmap}
          onViewDashboard={closeResult}
        />
      )}
    </main>
  )
}

export default AssesmentTest