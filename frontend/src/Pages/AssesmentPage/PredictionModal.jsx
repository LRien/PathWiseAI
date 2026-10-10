import React, { useEffect, useState } from 'react'
import { fmtDate } from '../../Data/predictions' // adjust path

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']

const PredictionModal = ({ pred, onClose, onViewRoadmap, onViewHistory }) => {
  const [selected, setSelected] = useState(null)

  /* close on Escape + lock page scroll while open */
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="prediction-title">
      <div className="absolute inset-0 bg-[#0b0b2b]/60 backdrop-blur-sm" onClick={onClose} />

      <div
        data-lenis-prevent
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-[#f3e7d6] p-5 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#d9c8ae] bg-white text-lg text-neutral-600 transition hover:border-[#0b0b2b] hover:text-black"
        >
          ×
        </button>

        <p className="text-xs font-bold uppercase tracking-wide text-[#2f80e0]">Prediction complete · {fmtDate(pred.createdAt)}</p>
        <h2 id="prediction-title" className="mt-1 pr-10 text-3xl font-black tracking-tight text-black sm:text-4xl">
          Your top 3 career matches
        </h2>
        <p className="mt-1.5 text-sm text-neutral-600">Select one to see the roadmap for reaching it.</p>

        {/* what was used */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#e6d8c3] bg-white/60 px-4 py-3 text-xs">
          <span className="rounded-full bg-[#0b0b2b] px-3 py-1 font-extrabold text-white">{pred.input.mbti}</span>
          <span className="font-semibold text-neutral-700">{pred.input.degree}</span>
          <span className="flex flex-wrap gap-1.5">
            {pred.input.skills.slice(0, 5).map((s) => (
              <span key={s} className="rounded-full border border-[#e0d1ba] bg-white px-2.5 py-0.5 text-neutral-600">{s}</span>
            ))}
            {pred.input.skills.length > 5 && <span className="py-0.5 text-neutral-500">+{pred.input.skills.length - 5} more</span>}
          </span>
        </div>

        {/* top 3 */}
        <div className="mt-5 grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Choose a career">
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
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                    style={{ background: color, color: i === 1 ? '#0b0b2b' : '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-2xl font-black text-black">{c.score}%</span>
                </div>

                <h3 className="mt-3 text-lg font-extrabold leading-tight text-black">{c.title}</h3>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8dcc8]">
                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: color }} />
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-neutral-500">Why this fits</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {c.reasons.map((r) => (
                    <li key={r} className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-xs text-neutral-700">{r}</li>
                  ))}
                </ul>

                <span className={`mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${isSel ? 'text-[#0b0b2b]' : 'text-neutral-400'}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${isSel ? 'border-[#0b0b2b] bg-[#0b0b2b]' : 'border-neutral-300'}`}>
                    {isSel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  {isSel ? 'Selected' : 'Select this career'}
                </span>
              </button>
            )
          })}
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onViewHistory}
            className="rounded-full border border-[#d9c8ae] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b]"
          >
            View all predictions
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => onViewRoadmap(selected)}
            className="rounded-full bg-[#0b0b2b] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selected ? `View roadmap for ${selected} →` : 'Select a career to continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PredictionModal