import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getPredictions } from '../../Data/predictionStore'
import { ROADMAPS, DEFAULT_ROADMAP } from '../../Data/roadmap'

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem('selectedCareer') || 'null')
  } catch {
    return null
  }
}

const UserRoadMap = () => {
  const { state } = useLocation()
  const saved = useMemo(readSaved, [])

  const career = state?.career ?? saved?.career
  const predictionId = state?.predictionId ?? saved?.predictionId

  const pred = getPredictions().find((p) => p.id === predictionId)
  const match = pred?.topCareers.find((c) => c.title === career)
  const roadmap = ROADMAPS[career] || DEFAULT_ROADMAP

  /* checklist progress, remembered per career */
  const storeKey = `roadmapProgress:${career}`
  const [done, setDone] = useState([])

  useEffect(() => {
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

  if (!career) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black tracking-tight text-black">Career roadmap</h1>
        <p className="text-sm text-neutral-600">
          You haven&apos;t selected a career yet. Pick one from your prediction history to see its roadmap.
        </p>
        <Link
          to="/dashboard/recommendations"
          className="inline-block rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          Go to predictions
        </Link>
      </div>
    )
  }

  const totalSteps = roadmap.phases.reduce((n, p) => n + p.steps.length, 0)
  const progress = totalSteps ? Math.round((done.length / totalSteps) * 100) : 0

  /* compare the user's skills with what this career needs */
  const userSkills = (pred?.input.skills || []).map((s) => s.toLowerCase())
  const have = roadmap.keySkills.filter((s) => userSkills.includes(s.toLowerCase()))
  const need = roadmap.keySkills.filter((s) => !userSkills.includes(s.toLowerCase()))

  const backTo = predictionId ? `/dashboard/recommendations/${predictionId}` : '/dashboard/recommendations'

  return (
    <div className="space-y-8">
      {/* header */}
      <header>
        <Link to={backTo} className="text-xs font-bold text-[#0b0b2b] hover:underline">
          ← Back to top 3 careers
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Roadmap: {career}</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-neutral-600">{roadmap.summary}</p>
          </div>
          {match && (
            <span className="rounded-full bg-[#0b0b2b] px-4 py-2 text-xs font-extrabold text-white">
              {match.score}% match
            </span>
          )}
        </div>
      </header>

      {/* overview */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Estimated time</p>
          <p className="mt-1 text-2xl font-black text-black">{roadmap.timeframe}</p>
        </div>
        <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Phases</p>
          <p className="mt-1 text-2xl font-black text-black">{roadmap.phases.length}</p>
        </div>
        <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Your progress</p>
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

      {/* skills gap */}
      {roadmap.keySkills.length > 0 && (
        <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-black">Skills check</h2>
          <p className="text-xs text-neutral-500">Based on the skills you entered in this prediction</p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#2f9e62]">You already have</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {have.length ? (
                  have.map((s) => (
                    <li key={s} className="rounded-full border border-[#bfe3cd] bg-white px-3 py-1 text-xs text-neutral-700">{s}</li>
                  ))
                ) : (
                  <li className="text-xs text-neutral-500">None of the key skills yet. That&apos;s okay, this roadmap starts from the basics.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#e0404a]">Still to learn</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {need.length ? (
                  need.map((s) => (
                    <li key={s} className="rounded-full border border-[#f0c4c7] bg-white px-3 py-1 text-xs text-neutral-700">{s}</li>
                  ))
                ) : (
                  <li className="text-xs text-neutral-500">You already cover every key skill.</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* phases */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-black">Step-by-step plan</h2>

        <ol className="space-y-4">
          {roadmap.phases.map((phase, pi) => {
            const phaseDone = phase.steps.filter((_, si) => done.includes(`${pi}-${si}`)).length
            const complete = phaseDone === phase.steps.length

            return (
              <li key={phase.title} className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                        complete ? 'bg-[#2f9e62] text-white' : 'bg-[#0b0b2b] text-white'
                      }`}
                    >
                      {complete ? '✓' : pi + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-extrabold leading-tight text-black">{phase.title}</h3>
                      <p className="text-xs font-semibold text-neutral-500">{phase.duration}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
                    {phaseDone}/{phase.steps.length} done
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {phase.steps.map((step, si) => {
                    const key = `${pi}-${si}`
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
                          <span className={checked ? 'text-neutral-400 line-through' : 'text-neutral-800'}>{step}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>

                {phase.resources?.length > 0 && (
                  <div className="mt-4 border-t border-[#e6d8c3] pt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Resources</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {phase.resources.map((r) => (
                        <li key={r} className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-xs text-neutral-700">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>

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