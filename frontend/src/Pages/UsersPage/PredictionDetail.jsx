import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fmtDate } from '../../Data/predictions'
import { getPredictions } from '../../Data/predictionStore'

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']

const PredictionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [showAvoid, setShowAvoid] = useState(false)

  const pred = getPredictions().find((p) => String(p.id) === id)

  if (!pred) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">That prediction could not be found.</p>
        <Link to="/dashboard/recommendations" className="text-sm font-bold text-[#0b0b2b] hover:underline">
          ← Back to history
        </Link>
      </div>
    )
  }

  const goToRoadmap = () => {
    if (!selected) return
    localStorage.setItem('selectedCareer', JSON.stringify({ predictionId: pred.id, career: selected }))
    navigate('/dashboard/roadmap', { state: { predictionId: pred.id, career: selected } })
  }

  return (
    <div className="space-y-8">
      <header>
        <Link to="/dashboard/recommendations" className="text-xs font-bold text-[#0b0b2b] hover:underline">
          ← Back to history
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl">Your top 3 careers</h1>
        <p className="mt-1.5 text-sm text-neutral-600">
          Prediction made on {fmtDate(pred.createdAt)}. Select one to see the roadmap for it.
        </p>
      </header>

      {/* inputs used */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#e6d8c3] bg-white/60 px-4 py-3 text-xs">
        <span className="rounded-full bg-[#0b0b2b] px-3 py-1 font-extrabold text-white">{pred.input.mbti}</span>
        <span className="font-semibold text-neutral-700">{pred.input.degree}</span>
        <span className="flex flex-wrap gap-1.5">
          {pred.input.skills.map((s) => (
            <span key={s} className="rounded-full border border-[#e0d1ba] bg-white px-2.5 py-0.5 text-neutral-600">{s}</span>
          ))}
        </span>
      </div>

      {/* top 3 */}
      <div className="grid gap-4 lg:grid-cols-3" role="radiogroup" aria-label="Choose a career">
        {pred.topCareers.map((c, i) => {
          const isSel = selected === c.title
          const color = RANK_COLORS[i]
          return (
            <button
              key={c.title}
              type="button"
              role="radio"
              aria-checked={isSel}
              onClick={() => setSelected(c.title)}
              className={`flex flex-col rounded-3xl border-2 bg-[#fbf6ee] p-5 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#0b0b2b]/40 ${
                isSel ? 'border-[#0b0b2b] shadow-md' : 'border-[#e6d8c3] hover:border-[#0b0b2b]/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                    style={{ background: color, color: i === 1 ? '#0b0b2b' : '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-extrabold leading-tight text-black">{c.title}</h3>
                </div>
                <span className="shrink-0 text-2xl font-black text-black">{c.score}%</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8dcc8]">
                <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: color }} />
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-neutral-500">Why this fits</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {c.reasons.map((r) => (
                  <li key={r} className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-xs text-neutral-700">{r}</li>
                ))}
              </ul>

              <span
                className={`mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${
                  isSel ? 'text-[#0b0b2b]' : 'text-neutral-400'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    isSel ? 'border-[#0b0b2b] bg-[#0b0b2b]' : 'border-neutral-300'
                  }`}
                >
                  {isSel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {isSel ? 'Selected' : 'Select this career'}
              </span>
            </button>
          )
        })}
      </div>

      {/* roadmap CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
        <p className="text-sm text-neutral-600">
          {selected ? (
            <>Ready to see what it takes to become a <span className="font-bold text-black">{selected}</span>?</>
          ) : (
            'Select a career above to continue.'
          )}
        </p>
        <button
          type="button"
          onClick={goToRoadmap}
          disabled={!selected}
          className="rounded-full bg-[#0b0b2b] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          View roadmap →
        </button>
      </div>

      {/* avoid */}
      <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setShowAvoid((v) => !v)}
          aria-expanded={showAvoid}
          className="flex w-full items-center justify-between text-left"
        >
          <span>
            <span className="block text-lg font-extrabold text-black">Careers to avoid</span>
            <span className="block text-xs text-neutral-500">Fields that are a weaker fit for this profile</span>
          </span>
          <span className="text-xl font-bold text-neutral-500">{showAvoid ? '−' : '+'}</span>
        </button>
        {showAvoid && (
          <ul className="mt-4 divide-y divide-[#e6d8c3]">
            {pred.avoid.map((a) => (
              <li key={a.title} className="flex items-start gap-3 py-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e0404a]" />
                <div>
                  <p className="text-sm font-bold text-black">{a.title}</p>
                  <p className="text-xs text-neutral-600">{a.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default PredictionDetail