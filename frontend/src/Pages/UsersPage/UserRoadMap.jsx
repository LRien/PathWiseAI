import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getLatestPrediction, getPrediction, getRoadmap } from '../../api/predictions'

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
        className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-xs font-semibold text-[#0b0b2b] transition hover:border-[#0b0b2b] hover:bg-[#f7efe2]"
      >
        {s.name} ↗
      </a>
    ))}
  </div>
)

const Chips = ({ items, cls = 'border-[#e0d1ba]' }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((s, i) => (
      <li key={`${text(s)}-${i}`} className={`rounded-full border bg-white px-3 py-1 text-xs text-neutral-700 ${cls}`}>
        {text(s)}
      </li>
    ))}
  </ul>
)

const Box = ({ children }) => (
  <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">{children}</section>
)

const Label = ({ children, cls = 'text-neutral-500' }) => (
  <p className={`text-xs font-bold uppercase tracking-wide ${cls}`}>{children}</p>
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
        setPred(p)
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

  if (status === 'loading') return <p className="text-sm text-neutral-500">Loading roadmap...</p>

  if (status === 'blocked') {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black tracking-tight text-black">Career roadmap</h1>
        <p className="text-sm text-neutral-600">
          {message === 'No predictions yet'
            ? 'You have no predictions yet. Take the assessment first.'
            : message.startsWith('Select a career')
              ? 'You haven’t selected a career yet. Pick one from your prediction to see its roadmap.'
              : message}
        </p>
        <Link
          to={pred ? `/dashboard/recommendations/${pred.id}` : '/dashboard/recommendations'}
          className="inline-block rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          {pred ? 'Choose a career' : 'Go to predictions'}
        </Link>
      </div>
    )
  }

  const { career, roadmap } = road
  const steps = list(roadmap.timeline.steps)
  const progress = steps.length ? Math.round((done.length / steps.length) * 100) : 0

  const match = pred.recommended.find((c) => c.title === career.title)
  const have = list(match?.skillsHave)
  const need = list(match?.skillsToBuild)

  const { technical, soft, other } = roadmap.skills
  const backTo = `/dashboard/recommendations/${pred.id}`

  /* skills to find courses for: what the user still needs, otherwise the career's technical skills */
  const courseSkills = [...new Set((need.length ? need : list(technical)).map(text).filter(Boolean))].slice(
    0,
    MAX_COURSE_SKILLS
  )

  return (
    <div className="space-y-8">
      <header>
        <Link to={backTo} className="text-xs font-bold text-[#0b0b2b] hover:underline">
          ← Back to top 3 careers
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Roadmap: {career.title}</h1>
          <span className="rounded-full bg-[#0b0b2b] px-4 py-2 text-xs font-extrabold text-white">
            {career.matchPercent}% match
          </span>
        </div>
      </header>

      {/* overview */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
          <Label>Estimated time</Label>
          <p className="mt-1 text-2xl font-black text-black">{text(roadmap.timeline.estimatedTotal) || 'N/A'}</p>
        </div>
        <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
          <Label>Steps</Label>
          <p className="mt-1 text-2xl font-black text-black">{steps.length}</p>
        </div>
        <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
          <Label>Your progress</Label>
          <p className="mt-1 text-2xl font-black text-black">{progress}%</p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8dcc8]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-[#2f80e0] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      {/* skills check, from your assessment */}
      {(have.length > 0 || need.length > 0) && (
        <Box>
          <h2 className="text-lg font-extrabold text-black">Skills check</h2>
          <p className="text-xs text-neutral-500">Based on the skills you entered in this prediction</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <Label cls="text-[#2f9e62]">You already have</Label>
              {have.length ? <Chips items={have} cls="border-[#bfe3cd]" /> : <p className="mt-2 text-xs text-neutral-500">None of the key skills yet.</p>}
            </div>
            <div>
              <Label cls="text-[#e0404a]">Still to learn</Label>
              {need.length ? <Chips items={need} cls="border-[#f0c4c7]" /> : <p className="mt-2 text-xs text-neutral-500">You already cover every key skill.</p>}
            </div>
          </div>
        </Box>
      )}

      {/* skills needed on the job */}
      {(technical.length > 0 || soft.length > 0 || other.length > 0) && (
        <Box>
          <h2 className="text-lg font-extrabold text-black">Skills this career uses</h2>
          <div className="mt-4 space-y-4">
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
        </Box>
      )}

      {/* education + certificates */}
      {(roadmap.education.typical || roadmap.education.relatedPrograms.length > 0 || roadmap.certificates.length > 0) && (
        <Box>
          <h2 className="text-lg font-extrabold text-black">Education &amp; certificates</h2>
          <div className="mt-4 space-y-4">
            {roadmap.education.typical && (
              <div>
                <Label>Typical education</Label>
                <p className="mt-1 text-sm font-semibold text-neutral-800">{text(roadmap.education.typical)}</p>
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
          </div>
        </Box>
      )}

      {/* online courses */}
      <Box>
        <h2 className="text-lg font-extrabold text-black">Online courses</h2>
        <p className="text-xs text-neutral-500">
          These links open search results on each platform, so you can compare courses and pick one that fits.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <Label>Start with the career</Label>
            <p className="mb-2 mt-1 text-sm font-semibold text-neutral-800">{career.title}</p>
            <CourseLinks topic={career.title} />
          </div>

          {courseSkills.length > 0 && (
            <div className="space-y-4 border-t border-[#e6d8c3] pt-4">
              <Label>{need.length ? 'Skills you still need' : 'Skills this career uses'}</Label>
              {courseSkills.map((skill) => (
                <div key={skill} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-neutral-800">{skill}</span>
                  <CourseLinks topic={skill} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Box>

      {/* timeline */}
      {steps.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold text-black">Step-by-step plan</h2>
          <Box>
            <ul className="space-y-2">
              {steps.map((step, i) => {
                const key = String(i)
                const checked = done.includes(key)
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-white/70">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(key)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b0b2b]"
                      />
                      <span className={checked ? 'text-neutral-400 line-through' : 'text-neutral-800'}>
                        {text(step)}
                        {sub(step) && <span className="ml-2 text-xs font-semibold text-neutral-500">{sub(step)}</span>}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </Box>
        </section>
      )}

      {roadmap.note && <p className="text-xs leading-relaxed text-neutral-500">{text(roadmap.note)}</p>}

      {/* footer actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to={backTo}
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