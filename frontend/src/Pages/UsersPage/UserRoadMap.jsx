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

const Acc = ({ title, hint, children }) => (
  <details className="group border-b border-[#e6d8c3] py-4 last:border-b-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <div>
        <div className="text-base font-extrabold text-black">{title}</div>
        <div className="text-[13px] text-neutral-500">{hint}</div>
      </div>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-neutral-500 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </summary>
    <div className="mt-4 space-y-4">{children}</div>
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

  const match = pred.recommended.find((c) => c.title === career.title)
  const have = list(match?.skillsHave)
  const need = list(match?.skillsToBuild)

  const { technical, soft, other } = roadmap.skills
  const theme = mbtiTheme(pred.mbti)

  /* skills to find courses for: what the user still needs, otherwise the career's technical skills */
  const courseSkills = [...new Set((need.length ? need : list(technical)).map(text).filter(Boolean))].slice(
    0,
    MAX_COURSE_SKILLS
  )

  const hasEdu =
    roadmap.education.typical || roadmap.education.relatedPrograms.length > 0 || roadmap.certificates.length > 0

  return (
    <div className="space-y-6">
      <header>
        <Link to={BACK} className="text-sm font-bold text-[#0b0b2b] hover:underline">
          ← Back to dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Roadmap: {career.title}</h1>
          <span className="rounded-full bg-[#0b0b2b] px-4 py-2 text-sm font-extrabold text-white">
            {career.matchPercent}% match
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* sticky character card (needs no ancestor with overflow:hidden/auto) */}
        <aside
          className="self-start rounded-3xl p-6 text-center shadow-sm lg:sticky lg:top-6"
          style={{ background: theme?.tint ?? '#cde6f6' }}
        >
          {theme && <MbtiCharacter code={pred.mbti} className="mx-auto w-52" />}
          {theme && (
            <div className="mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: theme.dark }}>
              {pred.mbti.toUpperCase()} · {theme.name}
            </div>
          )}
          <div className="mt-1 text-2xl font-black leading-tight text-black">{progress}% of the way there</div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/70"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-[#0b0b2b] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-sm text-neutral-700">
            {done.length} of {steps.length} steps done
          </div>

          <div className="mt-5 space-y-3 text-left">
            <div className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="text-xs font-semibold text-neutral-600">Estimated time</div>
              <div className="mt-0.5 text-base font-extrabold leading-snug text-black">
                {text(roadmap.timeline.estimatedTotal) || 'N/A'}
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="text-xs font-semibold text-neutral-600">Steps</div>
              <div className="mt-0.5 text-base font-extrabold text-black">{steps.length}</div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {/* step-by-step plan */}
          {steps.length > 0 && (
            <Box>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-xl font-extrabold text-black">Step-by-step plan</h2>
                <div className="text-[13px] text-neutral-500">Tick a step when you finish it</div>
              </div>
              <ol className="mt-5">
                {steps.map((step, i) => {
                  const key = String(i)
                  const checked = done.includes(key)
                  const isNext = i === nextIdx
                  return (
                    <li key={key} className="relative pb-5 pl-11 last:pb-0">
                      {i < steps.length - 1 && (
                        <span className={`absolute left-[13px] top-7 h-full w-0.5 ${checked ? 'bg-[#0b0b2b]' : 'bg-[#d9c8ae]'}`} aria-hidden="true" />
                      )}
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-pressed={checked}
                        aria-label={`Mark step ${i + 1} ${checked ? 'not done' : 'done'}`}
                        className={`absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                          checked ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white' : isNext ? 'border-[#2f80e0] bg-white' : 'border-[#d9c8ae] bg-white'
                        }`}
                      >
                        {checked && (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        )}
                      </button>
                      <div
                        className={
                          isNext
                            ? 'flex items-center justify-between gap-3 rounded-2xl border border-[#2f80e0]/40 bg-white px-4 py-3 shadow-sm'
                            : 'py-0.5'
                        }
                      >
                        <div>
                          <div className={`text-base font-bold leading-snug ${checked ? 'text-neutral-400 line-through' : 'text-black'}`}>{text(step)}</div>
                          {sub(step) && <div className="mt-0.5 text-sm text-neutral-500">{sub(step)}</div>}
                        </div>
                        {isNext && (
                          <span className="shrink-0 rounded-full bg-[#2f80e0] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">Next up</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Box>
          )}

          {/* skills check with a course finder per missing skill */}
          {(have.length > 0 || need.length > 0) && (
            <Box>
              <h2 className="text-xl font-extrabold text-black">Skills check</h2>
              <div className="text-sm text-neutral-500">Based on the skills you entered in this prediction</div>
              <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div>
                  <Label cls="text-[#2f9e62]">You already have</Label>
                  {have.length ? <Chips items={have} cls="border-[#bfe3cd]" /> : <div className="mt-2 text-sm text-neutral-500">None of the key skills yet.</div>}
                </div>
                <div>
                  <Label cls="text-[#e0404a]">Still to build · find a course</Label>
                  {need.length ? (
                    <ul className="mt-2 divide-y divide-[#e6d8c3]">
                      {[...new Set(need.map(text).filter(Boolean))].map((skill) => (
                        <li key={skill} className="flex flex-col gap-2 py-3 first:pt-0 xl:flex-row xl:items-center xl:justify-between">
                          <span className="text-sm font-extrabold text-black">{skill}</span>
                          <CourseLinks topic={skill} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-sm text-neutral-500">You already cover every key skill.</div>
                  )}
                </div>
              </div>
            </Box>
          )}

          {/* collapsible details */}
          <Box className="py-2">
            {(technical.length > 0 || soft.length > 0 || other.length > 0) && (
              <Acc title="Skills this career uses" hint="Technical, soft and other skills from the roadmap">
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
              </Acc>
            )}

            {hasEdu && (
              <Acc title="Education & certificates" hint="Typical education, related programs and certificates from the roadmap">
                {roadmap.education.typical && (
                  <div>
                    <Label>Typical education</Label>
                    <div className="mt-1 text-base font-semibold text-neutral-800">{text(roadmap.education.typical)}</div>
                  </div>
                )}
                {roadmap.education.relatedPrograms.length > 0 && (
                  <div>
                    <Label>Related programs</Label>
                    <Chips items={roadmap.education.relatedPrograms} />
                  </div>
                )}
                {roadmap.education.reportedByWorkers.length > 0 && (
                  <div>
                    <Label>Reported by people in this job</Label>
                    <Chips items={roadmap.education.reportedByWorkers} />
                  </div>
                )}
                {roadmap.certificates.length > 0 && (
                  <div>
                    <Label>Certificates</Label>
                    <Chips items={roadmap.certificates} />
                  </div>
                )}
              </Acc>
            )}

            <Acc title="Courses for the career itself" hint={`Udemy, Coursera, edX and YouTube links for ${career.title}`}>
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
            </Acc>
          </Box>

          {roadmap.note && <div className="text-sm leading-relaxed text-neutral-500">{text(roadmap.note)}</div>}

          <div className="flex flex-wrap gap-3">
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
      </div>
    </div>
  )
}

export default UserRoadMap