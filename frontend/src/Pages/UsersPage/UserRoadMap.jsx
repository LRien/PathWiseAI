import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getLatestPrediction, getPrediction, getRoadmap, listPredictions } from '../../api/predictions'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'

const BACK = '/dashboard'

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem('selectedCareer') || 'null')
  } catch {
    return null
  }
}

const list = (v) => (Array.isArray(v) ? v : [])
// Roadmap arrays may hold plain strings or objects, so read both safely
const text = (x) =>
  typeof x === 'string' ? x : x?.title ?? x?.name ?? x?.step ?? x?.label ?? x?.description ?? ''
const sub = (x) =>
  x && typeof x === 'object' ? x.duration ?? x.time ?? x.period ?? x.timeframe ?? '' : ''
const detail = (x) => {
  if (!x || typeof x !== 'object') return ''
  const d = x.details ?? x.description ?? ''
  return typeof d === 'string' && d !== text(x) ? d : ''
}

/* NOTE: text uses <div>/<span> with explicit sizes, because the global p { font-size: var(--text-body) } rule overrides Tailwind sizes */

/* Online course search links. They open each platform's search page, so they never go stale.
   Check the URL formats now and then in case a platform changes them. */
const COURSE_SOURCES = [
  { name: 'Udemy', url: (q) => `https://www.udemy.com/courses/search/?q=${encodeURIComponent(q)}` },
  { name: 'Coursera', url: (q) => `https://www.coursera.org/search?query=${encodeURIComponent(q)}` },
  { name: 'edX', url: (q) => `https://www.edx.org/search?q=${encodeURIComponent(q)}` },
  { name: 'YouTube', url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} course`)}` },
]

const CourseLinks = ({ topic }) => (
  <div className="flex flex-wrap gap-2">
    {COURSE_SOURCES.map((s) => (
      <a
        key={s.name}
        href={s.url(topic)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Search ${s.name} for ${topic} courses (opens in a new tab)`}
        className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-[13px] font-semibold text-[#0b0b2b] transition hover:border-[#0b0b2b] hover:bg-[#f7efe2]"
      >
        {s.name} ↗
      </a>
    ))}
  </div>
)

const Chips = ({ items, cls = 'border-[#e0d1ba]' }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((s, i) => (
      <li key={`${text(s)}-${i}`} className={`rounded-full border bg-white px-3 py-1 text-[13px] text-neutral-700 ${cls}`}>
        {text(s)}
      </li>
    ))}
  </ul>
)

const Box = ({ children, className = '' }) => (
  <section className={`rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-6 shadow-sm ${className}`}>{children}</section>
)

const Label = ({ children, cls = 'text-neutral-500' }) => (
  <div className={`text-xs font-bold uppercase tracking-wide ${cls}`}>{children}</div>
)

const Chevron = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-neutral-500 transition group-open:rotate-180 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const Tick = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

const Acc = ({ title, hint, children }) => (
  <details className="group border-b border-[#e6d8c3] py-4 last:border-b-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <div>
        <div className="text-base font-extrabold text-black">{title}</div>
        <div className="text-[13px] text-neutral-500">{hint}</div>
      </div>
      <Chevron />
    </summary>
    <div className="mt-4 space-y-4">{children}</div>
  </details>
)

/* one skill row with course links tucked behind a toggle */
const SkillRow = ({ skill }) => (
  <details className="group border-b border-[#f0c4c7] py-3 first:pt-0 last:border-b-0 last:pb-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <span className="text-sm font-extrabold text-black">{skill}</span>
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-xs font-bold text-[#0b0b2b]">
        Find courses
        <Chevron className="!h-4 !w-4 !text-[#0b0b2b]" />
      </span>
    </summary>
    <div className="mt-3">
      <CourseLinks topic={skill} />
    </div>
  </details>
)

const MAX_COURSE_SKILLS = 6

const UserRoadMap = () => {
  const { state } = useLocation()

  const [status, setStatus] = useState('loading') // loading | ready | blocked
  const [message, setMessage] = useState('')
  const [pred, setPred] = useState(null)
  const [road, setRoad] = useState(null)
  const [done, setDone] = useState([])
  const [focusIdx, setFocusIdx] = useState(null) // null = follow the next unfinished step

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const id = state?.predictionId ?? readSaved()?.predictionId
        const p = id ? await getPrediction(id) : await getLatestPrediction()
        if (cancelled) return

        /* the single-prediction response may not carry the MBTI type, so look it up from the list */
        let mbti = p.mbti
        if (!mbti) {
          try {
            const d = await listPredictions()
            mbti = d.predictions?.find((x) => String(x.id) === String(p.id))?.mbti ?? d.predictions?.[0]?.mbti
          } catch {
            /* character just won't show */
          }
        }
        if (cancelled) return
        setPred({ ...p, mbti })

        // Uses the career the user selected (saved in the database)
        const rm = await getRoadmap(p.id)
        if (cancelled) return
        setRoad(rm)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setMessage(e.message)
        setStatus('blocked')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [state?.predictionId])

  /* checklist progress, remembered per prediction + career */
  const storeKey = pred && road ? `roadmapProgress:${pred.id}:${road.career.title}` : null

  useEffect(() => {
    if (!storeKey) return
    try {
      setDone(JSON.parse(localStorage.getItem(storeKey) || '[]'))
    } catch {
      setDone([])
    }
  }, [storeKey])

  const toggle = (key) =>
    setDone((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      try {
        localStorage.setItem(storeKey, JSON.stringify(next))
      } catch {
        /* storage unavailable: progress just won't persist */
      }
      return next
    })

  if (status === 'loading') return <div className="text-base text-neutral-500">Loading roadmap...</div>

  if (status === 'blocked') {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black tracking-tight text-black">Career roadmap</h1>
        <div className="text-base text-neutral-600">
          {message === 'No predictions yet'
            ? 'You have no predictions yet. Take the assessment first.'
            : message.startsWith('Select a career')
              ? 'You haven’t selected a career yet. Pick one from your top 3 on the dashboard to see its roadmap.'
              : message}
        </div>
        <Link
          to={BACK}
          className="inline-block rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          Go to dashboard
        </Link>
      </div>
    )
  }

  const { career, roadmap } = road
  const steps = list(roadmap.timeline.steps)
  const progress = steps.length ? Math.round((done.length / steps.length) * 100) : 0
  const nextIdx = steps.findIndex((_, i) => !done.includes(String(i)))

  /* the step in focus: the one the user clicked, otherwise the next unfinished step */
  const active = steps.length
    ? Math.min(focusIdx ?? (nextIdx >= 0 ? nextIdx : steps.length - 1), steps.length - 1)
    : 0
  const activeStep = steps[active]
  const activeKey = String(active)
  const activeDone = done.includes(activeKey)
  const allDone = steps.length > 0 && nextIdx === -1

  const match = list(pred.recommended).find((c) => c.title === career.title)
  const have = list(match?.skillsHave)
  const need = [...new Set(list(match?.skillsToBuild).map(text).filter(Boolean))]

  const technical = list(roadmap.skills?.technical)
  const soft = list(roadmap.skills?.soft)
  const other = list(roadmap.skills?.other)
  const theme = mbtiTheme(pred.mbti)

  /* when nothing is left to build, offer courses for the career's technical skills instead */
  const courseSkills = [...new Set(technical.map(text).filter(Boolean))].slice(0, MAX_COURSE_SKILLS)

  const programs = list(roadmap.education?.relatedPrograms)
  const reported = list(roadmap.education?.reportedByWorkers)
  const certificates = list(roadmap.certificates)
  const hasEdu = roadmap.education?.typical || programs.length > 0 || certificates.length > 0

  const goTo = (i) => setFocusIdx(Math.max(0, Math.min(steps.length - 1, i)))

  const finishActive = () => {
    const wasDone = activeDone
    toggle(activeKey)
    if (!wasDone) setFocusIdx(null) // jump on to the next unfinished step
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <nav className="text-sm text-neutral-500" aria-label="Breadcrumb">
          <Link to={BACK} className="font-bold text-[#0b0b2b] hover:underline">
            Dashboard
          </Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span>Roadmap</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Roadmap: {career.title}</h1>
            <div className="mt-1 text-sm text-neutral-600">
              {steps.length} steps{text(roadmap.timeline.estimatedTotal)
                ? ` · about ${text(roadmap.timeline.estimatedTotal).replace(/^about\s+/i, '')}`
                : ''}
            </div>
          </div>
          <span className="rounded-full bg-[#0b0b2b] px-4 py-2 text-sm font-extrabold text-white">
            {career.matchPercent}% match
          </span>
        </div>
      </header>

      {/* Progress + stepper + focus step */}
      {steps.length > 0 && (
        <Box>
          {/* progress row with the character icon on the left */}
          <div className="flex items-center gap-5 sm:gap-6">
            {theme && (
              <div
                className="w-28 shrink-0 rounded-3xl p-2 shadow-sm sm:w-40 sm:p-3"
                style={{ background: theme.tint ?? '#cde6f6' }}
              >
                <MbtiCharacter code={pred.mbti} className="w-full" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {theme && (
                <div className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: theme.dark }}>
                  {String(pred.mbti).toUpperCase()} · {theme.name}
                </div>
              )}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <div className="text-2xl font-black leading-tight text-black sm:text-3xl">{progress}% of the way there</div>
                <div className="text-sm text-neutral-600">
                  {done.length} of {steps.length} steps done
                </div>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e8dcc8]"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Roadmap progress"
              >
                <div className="h-full rounded-full bg-[#0b0b2b] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* horizontal stepper */}
          <ol className="mt-6 flex items-center overflow-x-auto pb-2" aria-label="Roadmap steps">
            {steps.map((step, i) => {
              const key = String(i)
              const checked = done.includes(key)
              const current = i === active
              return (
                <li key={key} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setFocusIdx(i)}
                    aria-current={current ? 'step' : undefined}
                    aria-label={`Step ${i + 1}: ${text(step)}${checked ? ' (done)' : ''}`}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold transition ${
                      checked
                        ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white'
                        : current
                          ? 'border-[#2f80e0] bg-white text-[#2f80e0] ring-4 ring-[#2f80e0]/20'
                          : 'border-[#d9c8ae] bg-white text-neutral-500 hover:border-[#0b0b2b]'
                    }`}
                  >
                    {checked ? <Tick /> : i + 1}
                  </button>
                  {i < steps.length - 1 && (
                    <span className={`mx-1 h-0.5 min-w-[16px] flex-1 ${checked ? 'bg-[#0b0b2b]' : 'bg-[#d9c8ae]'}`} aria-hidden="true" />
                  )}
                </li>
              )
            })}
          </ol>

          {/* focus card */}
          <div className="mt-4 rounded-2xl border-2 border-[#2f80e0]/40 bg-white p-5 shadow-sm" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-neutral-500">
                Step {active + 1} of {steps.length}
              </span>
              {activeDone ? (
                <span className="rounded-full bg-[#eaf6ef] px-3 py-1 text-xs font-extrabold text-[#2f9e62]">Done</span>
              ) : active === nextIdx ? (
                <span className="rounded-full bg-[#2f80e0] px-3 py-1 text-xs font-extrabold text-white">Next up</span>
              ) : null}
              {sub(activeStep) && (
                <span className="rounded-full bg-[#f3e6d3] px-3 py-1 text-xs font-bold text-neutral-700">{sub(activeStep)}</span>
              )}
            </div>

            <div className={`mt-2 text-xl font-extrabold leading-snug ${activeDone ? 'text-neutral-400 line-through' : 'text-black'}`}>
              {text(activeStep)}
            </div>

            {detail(activeStep) && (
              <div className="mt-2 text-sm leading-relaxed text-neutral-600">{detail(activeStep)}</div>
            )}

            {allDone && (
              <div className="mt-3 text-sm font-bold text-[#2f9e62]">Every step is done. Nice work!</div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={finishActive}
                className={`rounded-full px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide transition ${
                  activeDone
                    ? 'border border-[#d9c8ae] bg-white text-neutral-700 hover:border-[#0b0b2b]'
                    : 'bg-[#0b0b2b] text-white hover:bg-[#1a1a4a]'
                }`}
              >
                {activeDone ? 'Mark as not done' : 'Mark as done'}
              </button>

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => goTo(active - 1)}
                  disabled={active === 0}
                  className="rounded-full border border-[#d9c8ae] bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => goTo(active + 1)}
                  disabled={active === steps.length - 1}
                  className="rounded-full border border-[#d9c8ae] bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* full list, collapsed */}
          <details className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#0b0b2b] [&::-webkit-details-marker]:hidden">
              See all steps
              <Chevron className="!h-4 !w-4" />
            </summary>
            <ol className="mt-3 divide-y divide-[#e6d8c3] rounded-2xl bg-white px-4">
              {steps.map((step, i) => {
                const checked = done.includes(String(i))
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setFocusIdx(i)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                          checked ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white' : 'border-[#d9c8ae] text-neutral-500'
                        }`}
                      >
                        {checked ? <Tick className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className={`min-w-0 flex-1 text-sm font-semibold ${checked ? 'text-neutral-400 line-through' : 'text-black'}`}>
                        {text(step)}
                      </span>
                      {sub(step) && <span className="shrink-0 text-xs text-neutral-500">{sub(step)}</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          </details>
        </Box>
      )}

      {/* Skills check: two cards, course links tucked away */}
      {(have.length > 0 || need.length > 0) && (
        <section>
          <h2 className="text-xl font-extrabold text-black">Skills check</h2>
          <div className="text-sm text-neutral-500">Based on the skills you entered in this prediction</div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="rounded-3xl bg-[#eaf6ef] p-5">
              <Label cls="text-[#2f9e62]">You already have</Label>
              {have.length ? (
                <Chips items={have} cls="border-[#bfe3cd]" />
              ) : (
                <div className="mt-2 text-sm text-neutral-600">None of the key skills yet.</div>
              )}
            </div>

            <div className="rounded-3xl bg-[#fcecec] p-5">
              <Label cls="text-[#e0404a]">Still to build</Label>
              {need.length ? (
                <div className="mt-3">
                  {need.map((skill) => (
                    <SkillRow key={skill} skill={skill} />
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-neutral-600">You already cover every key skill.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Merged learning resources + education */}
      <Box className="py-2">
        <Acc title="Learning resources" hint={`Courses for ${career.title} and the skills it uses`}>
          <div className="text-sm text-neutral-500">These links open search results on each platform, so you can compare and pick.</div>
          <CourseLinks topic={career.title} />

          {!need.length && courseSkills.length > 0 && (
            <div className="space-y-3 border-t border-[#e6d8c3] pt-4">
              <Label>Skills this career uses</Label>
              {courseSkills.map((skill) => (
                <div key={skill} className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <span className="text-sm font-extrabold text-black">{skill}</span>
                  <CourseLinks topic={skill} />
                </div>
              ))}
            </div>
          )}

          {(technical.length > 0 || soft.length > 0 || other.length > 0) && (
            <div className="space-y-3 border-t border-[#e6d8c3] pt-4">
              {technical.length > 0 && (
                <div>
                  <Label>Technical</Label>
                  <Chips items={technical} />
                </div>
              )}
              {soft.length > 0 && (
                <div>
                  <Label>Soft skills</Label>
                  <Chips items={soft} />
                </div>
              )}
              {other.length > 0 && (
                <div>
                  <Label>Other</Label>
                  <Chips items={other} />
                </div>
              )}
            </div>
          )}
        </Acc>

        {hasEdu && (
          <Acc title="Education and certificates" hint="Typical education, related programs and certificates">
            {roadmap.education?.typical && (
              <div>
                <Label>Typical education</Label>
                <div className="mt-1 text-base font-semibold text-neutral-800">{text(roadmap.education.typical)}</div>
              </div>
            )}
            {programs.length > 0 && (
              <div>
                <Label>Related programs</Label>
                <Chips items={programs} />
              </div>
            )}
            {reported.length > 0 && (
              <div>
                <Label>Reported by people in this job</Label>
                <Chips items={reported} />
              </div>
            )}
            {certificates.length > 0 && (
              <div>
                <Label>Certificates</Label>
                <Chips items={certificates} />
              </div>
            )}
          </Acc>
        )}
      </Box>

      {roadmap.note && <div className="text-sm leading-relaxed text-neutral-500">{text(roadmap.note)}</div>}

      <div className="flex flex-wrap gap-3 pb-4">
        <Link
          to={BACK}
          className="rounded-full border border-[#d9c8ae] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b]"
        >
          Choose a different career
        </Link>
        <Link
          to="/assessment"
          className="rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          + New prediction
        </Link>
      </div>
    </div>
  )
}

export default UserRoadMap