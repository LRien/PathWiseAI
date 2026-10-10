import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPrediction, savePrediction } from '../../Data/predictionStore'
import PredictionModal from './PredictionModal'
import { getProfile } from '../../Data/settingsStore'

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
  ],
  tech: [
    'Python', 'JavaScript', 'SQL', 'HTML & CSS', 'Web Development', 'Mobile Development', 'Data Analysis',
    'Machine Learning', 'Database Design', 'Cybersecurity', 'Networking', 'Cloud Computing', 'Debugging',
    'Excel / Spreadsheets', 'Microsoft Office', 'IT Support', 'Software Testing', 'Version Control (Git)',
  ],
  business: [
    'Accounting', 'Bookkeeping', 'Financial Analysis', 'Budgeting', 'Marketing', 'Sales', 'Market Research',
    'Project Management', 'Business Writing', 'Human Resources', 'Inventory Management', 'Supply Chain',
    'Legal Research', 'Contract Drafting', 'Event Planning', 'Entrepreneurship', 'Auditing', 'Taxation',
  ],
  health: [
    'Patient Care', 'First Aid / CPR', 'Laboratory Techniques', 'Clinical Documentation', 'Medical Terminology',
    'Nutrition Planning', 'Scientific Research', 'Data Collection', 'Pharmacology Basics', 'Field Research',
    'Public Health Education', 'Psychological Assessment', 'Counseling Basics', 'Environmental Monitoring',
    'Statistics', 'Lab Safety', 'Animal Care', 'Therapy Techniques',
  ],
  eng: [
    'Technical Drawing', 'CAD / AutoCAD', 'Circuit Design', 'Electrical Wiring', 'Surveying', 'Structural Analysis',
    'Quality Control', 'Equipment Maintenance', 'Welding', 'Arduino / IoT', 'Safety Compliance',
    'Blueprint Reading', 'Machine Operation', 'Mechanical Repair', 'Plumbing', 'Construction Planning',
    '3D Modeling', 'Troubleshooting',
  ],
  creative: [
    'Lesson Planning', 'Classroom Management', 'Tutoring', 'Curriculum Design', 'Graphic Design', 'Photography',
    'Video Editing', 'Content Writing', 'Copywriting', 'Social Media Management', 'Illustration', 'Storytelling',
    'Foreign Languages', 'Translation', 'Culinary Arts', 'Guest Service', 'Music / Performance', 'Journalism',
    'UI/UX Design', 'Fashion Design',
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
    label: 'Business & Law',
    dot: 'bg-[#f2c230]',
    off: 'border-[#f2c230]/80 text-[#7a5a08] hover:border-[#f2c230] hover:bg-[#f2c230]/20',
    on: 'border-[#f2c230] bg-[#f2c230] text-[#0b0b2b]',
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
const HARD = Object.keys(SKILLS).filter((k) => k !== 'soft').flatMap((k) => SKILLS[k])

const DEGREE_HINTS = [
  'BS in Computer Science', 'BS in Nursing', 'BS in Accountancy', 'BS in Civil Engineering',
  'BS in Psychology', 'BS in Education', 'BS in Business Administration', 'BA in Communication',
  'BS in Biology', 'BS in Hospitality Management', 'BS in Architecture', 'BS in Information Technology',
]

const PREF_POOL = [
  'I enjoy solving problems and finding practical solutions.',
  'I prefer collaborating with a team over working alone.',
  'I want a career where I can keep learning new things.',
  'I like creative work where I can come up with my own ideas.',
  'I prefer a calm, structured work environment with clear goals.',
  'I would like a job that lets me help people directly.',
  'I am interested in remote or flexible work arrangements.',
  'I want to grow into a leadership or management role.',
  'I enjoy analyzing information and finding patterns.',
  'I like fast-paced work with new challenges every day.',
  'I want work-life balance and a stable career path.',
  'I am interested in starting my own business someday.',
  'I enjoy hands-on work more than desk work.',
  'I prefer work that has a meaningful impact on society.',
  'I like working outdoors or in different places.',
  'I enjoy teaching, explaining or guiding other people.',
]

const VISIBLE = 12
const VISIBLE_PREFS = 5

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* All = a random mix of soft skills and skills from every field; a tab = only that group */
const pickSkills = (filter, selected) => {
  const free = (list) => shuffle(list.filter((s) => !selected.includes(s)))
  if (filter !== 'all') return free(SKILLS[filter]).slice(0, VISIBLE)
  return shuffle([...free(SKILLS.soft).slice(0, 4), ...free(HARD).slice(0, VISIBLE - 4)])
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

const AssesmentTest = ({ onSubmit }) => {
  const navigate = useNavigate()
  const [result, setResult] = useState(null) // the finished prediction shown in the modal

  /* pre-filled from Settings > Assessment defaults */
  const [mbti, setMbti] = useState(() => getProfile().mbti)
  const [degree, setDegree] = useState(() => getProfile().degree)
  const [skills, setSkills] = useState([])
  const [otherSkills, setOtherSkills] = useState('')
  const [pref, setPref] = useState('')
  const [filter, setFilter] = useState('all')
  const [skillSeed, setSkillSeed] = useState(0)
  const [prefSeed, setPrefSeed] = useState(0)
  const [hint, setHint] = useState(DEGREE_HINTS[0])

  useEffect(() => {
    setHint(DEGREE_HINTS[Math.floor(Math.random() * DEGREE_HINTS.length)])
  }, [])

  /* random chips: change on every shuffle / tab change; selected chips always stay on screen */
  const randomSkills = useMemo(
    () => pickSkills(filter, skills),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skillSeed, filter]
  )
  const shownSkills = useMemo(() => {
    const sel = skills.filter((s) => filter === 'all' || KIND[s] === filter)
    return [...randomSkills.filter((s) => !sel.includes(s)), ...sel]
  }, [randomSkills, skills, filter])

  const suggestions = useMemo(
    () => shuffle(PREF_POOL).slice(0, VISIBLE_PREFS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefSeed]
  )

  const toggleSkill = (s) => setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  const addSuggestion = (t) => setPref((cur) => (cur.includes(t) ? cur : cur ? `${cur.trim()} ${t}` : t))

  const extra = otherSkills.split(',').map((s) => s.trim()).filter(Boolean)
  const done = [!!mbti, degree.trim().length > 1, skills.length + extra.length > 0, true]
  const first = done.findIndex((d) => !d)
  const active = first === -1 ? 3 : first
  const valid = done[0] && done[1] && done[2]
  const missing = [!done[0] && 'personality', !done[1] && 'degree', !done[2] && 'skills'].filter(Boolean)

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    const payload = {
      mbti,
      degree: degree.trim(),
      skills: [...new Set([...skills, ...extra])],
      softSkills: skills.filter((s) => KIND[s] === 'soft'),
      fieldSkills: skills.filter((s) => KIND[s] !== 'soft'),
      preference: pref.trim(),
    }
    if (onSubmit) onSubmit(payload)
    else console.log('Assessment payload:', payload)

    /* TODO: swap createPrediction for your real model / API call */
    const pred = savePrediction(createPrediction(payload))
    setResult(pred)
  }

  const steps = ['Personality', 'Background', 'Skills', 'Preferences']
  const tabs = [['all', 'All'], ...Object.entries(CAT).map(([k, v]) => [k, v.label])]

  return (
    <main className="min-h-screen bg-[#f3e7d6] px-4 pb-16 pt-10 text-neutral-900 sm:pt-14">
      <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
        <header>
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

            <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
              {tabs.map(([k, label]) => {
                const on = filter === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
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

        <div className="mt-4 flex flex-col gap-4 rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-black">Ready to find your career match?</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {valid
                ? 'All required fields are complete.'
                : `Complete all required fields before submitting (missing: ${missing.join(', ')})`}
            </p>
          </div>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-full bg-[#0b0b2b] px-8 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:bg-[#0b0b2b]/30"
          >
            Start Assessment
          </button>
        </div>
      </form>

      {/* results modal: opens right after a prediction is made */}
      {result && (
        <PredictionModal
          pred={result}
          onClose={() => setResult(null)}
          onViewHistory={() => navigate('/dashboard/recommendations')}
          onViewRoadmap={(career) => {
            localStorage.setItem('selectedCareer', JSON.stringify({ predictionId: result.id, career }))
            navigate('/dashboard/roadmap', { state: { predictionId: result.id, career } })
          }}
        />
      )}
    </main>
  )
}

export default AssesmentTest