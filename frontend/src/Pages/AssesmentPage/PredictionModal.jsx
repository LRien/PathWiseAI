import React, { useEffect, useState } from 'react'
import MbtiCharacter, { mbtiTheme } from '../UsersPage//UsersComponents/MbtiCharacter' // adjust the path to where the character lives

/* the character pops in, then floats gently; both are switched off for people who prefer reduced motion */
const CHARACTER_CSS = `
@keyframes pw-pop { 0% { opacity: 0; transform: scale(.55) translateY(16px); } 60% { transform: scale(1.08) translateY(0); } 100% { opacity: 1; transform: none; } }
@keyframes pw-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes pw-glow { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: .7; transform: scale(1.12); } }
@keyframes pw-rise { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  .pw-pop { animation: pw-pop .8s cubic-bezier(.2,.8,.2,1) both; }
  .pw-float { animation: pw-float 3.6s ease-in-out .8s infinite; }
  .pw-glow { animation: pw-glow 3.6s ease-in-out infinite; }
  .pw-rise { animation: pw-rise .3s ease-out both; }
}
`

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']

const list = (v) => (Array.isArray(v) ? v : [])
const text = (x) =>
  typeof x === 'string' ? x : x?.title ?? x?.name ?? x?.text ?? x?.reason ?? x?.label ?? x?.description ?? ''

const pct = (c) => {
  const value = Number(c?.matchPercent ?? c?.percent ?? c?.score ?? 0)
  return Math.max(0, Math.min(100, Math.round(value)))
}

const fmtDate = (date) => {
  const d = date ? new Date(date) : new Date()
  return (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/* some reasons arrive as "Skills you already have: A, B, C." — turn those into proper skill lists */
const HAVE = /^skills you already have:\s*/i
const TODO = /^skills to work on:\s*/i
const parseSkills = (s) =>
  s
    .replace(HAVE, '')
    .replace(TODO, '')
    .replace(/\.\s*$/, '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

const careerParts = (c) => {
  const reasons = list(c?.reasons ?? c?.whyFit).map(text).filter(Boolean)

  const haveText = reasons.find((r) => HAVE.test(r))
  const todoText = reasons.find((r) => TODO.test(r))

  const have = list(c?.skillsHave).map(text).filter(Boolean)
  const need = list(c?.skillsToBuild).map(text).filter(Boolean)

  return {
    why: reasons.filter((r) => !HAVE.test(r) && !TODO.test(r)),
    have: have.length ? have : haveText ? parseSkills(haveText) : [],
    need: need.length ? need : todoText ? parseSkills(todoText) : [],
  }
}

const SkillBlock = ({ label, items, tone }) => {
  const shown = items.slice(0, 6)
  const rest = items.length - shown.length
  const styles =
    tone === 'good'
      ? { bg: '#eaf6ef', label: '#2f9e62', chip: 'border-[#bfe3cd]' }
      : { bg: '#fcecec', label: '#e0404a', chip: 'border-[#f0c4c7]' }

  return (
    <div className="min-w-0 rounded-2xl p-4" style={{ background: styles.bg }}>
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: styles.label }}>
        {label}
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <li
            key={s}
            className={`max-w-full break-words rounded-full border bg-white px-2.5 py-1 text-xs leading-4 text-neutral-700 ${styles.chip}`}
          >
            {s}
          </li>
        ))}
        {rest > 0 && <li className="px-1 py-1 text-xs text-neutral-500">+{rest} more</li>}
      </ul>
    </div>
  )
}

/*
  Props
  - pred:  the saved prediction from the API ({ id, recommended: [...], createdAt })
  - input: what the user submitted ({ mbti, degree, skills })
  - busy / error: state while saving the chosen career
  - onClose, onViewRoadmap(title), onViewDashboard
*/
const PredictionModal = ({ pred, input, busy = false, error = '', onClose, onViewRoadmap, onViewDashboard }) => {
  const careers = list(pred?.recommended).slice(0, 3)
  const skills = list(input?.skills)
  const theme = input?.mbti ? mbtiTheme(input.mbti) : null

  /* the best match is picked to start with; tap a row to switch */
  const [selected, setSelected] = useState(() => careers[0]?.title ?? null)
  const index = Math.max(0, careers.findIndex((c) => c.title === selected))
  const current = careers[index] ?? null
  const parts = current ? careerParts(current) : { why: [], have: [], need: [] }

  /* close on Escape + lock page scroll while open */
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, busy])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prediction-title"
    >
      <style>{CHARACTER_CSS}</style>
      <div className="absolute inset-0 bg-[#0b0b2b]/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />

      <div
        data-lenis-prevent
        className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#f3e7d6] shadow-2xl md:grid md:grid-cols-[300px_minmax(0,1fr)] md:overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#d9c8ae] bg-white text-lg text-neutral-600 transition hover:border-[#0b0b2b] hover:text-black disabled:opacity-50"
        >
          ×
        </button>

        {/* LEFT: character panel */}
        <aside
          className="flex flex-col items-center justify-center gap-4 p-6 text-center md:gap-5 md:p-8"
          style={{ background: theme?.tint ?? '#cde6f6' }}
        >
          {theme && (
            <div className="pw-pop relative w-44 shrink-0 min-[420px]:w-52 md:w-48">
              <span
                className="pw-glow absolute inset-0 rounded-full blur-2xl"
                style={{ background: theme.dark ?? '#2f80e0' }}
                aria-hidden="true"
              />
              <div className="pw-float relative">
                <MbtiCharacter code={input.mbti} className="w-full" />
              </div>
            </div>
          )}

          <div className="min-w-0">
            <div
              className="text-4xl font-black leading-none tracking-tight md:text-5xl"
              style={{ color: theme?.dark ?? '#245f8a' }}
            >
              {input?.mbti ? String(input.mbti).toUpperCase() : 'N/A'}
            </div>
            {theme?.name && <div className="mt-1 text-base font-extrabold text-black">{theme.name}</div>}

            <dl className="mt-4 hidden space-y-2 text-left text-sm md:block">
              {input?.degree && (
                <div className="rounded-2xl bg-white/60 px-4 py-2.5">
                  <dt className="text-xs font-bold uppercase tracking-wide text-neutral-500">Degree</dt>
                  <dd className="mt-0.5 break-words font-semibold text-neutral-800">{input.degree}</dd>
                </div>
              )}
              {skills.length > 0 && (
                <div className="rounded-2xl bg-white/60 px-4 py-2.5">
                  <dt className="text-xs font-bold uppercase tracking-wide text-neutral-500">Skills used</dt>
                  <dd className="mt-0.5 font-semibold text-neutral-800">{skills.length} skills</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>

        {/* RIGHT: results */}
        <section className="min-w-0 p-5 sm:p-8 md:max-h-[92vh] md:overflow-y-auto">
          <p className="pr-10 text-xs font-bold uppercase tracking-wide text-[#2f80e0]">
            Prediction complete · {fmtDate(pred?.createdAt)}
          </p>
          <h2 id="prediction-title" className="mt-1 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Your top 3 career matches
          </h2>
          <p className="mt-1 text-sm text-neutral-600">Tap a career to see why it fits, then open its roadmap.</p>

          {careers.length > 0 ? (
            <>
              {/* career rows */}
              <div className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label="Choose a career">
                {careers.map((c, i) => {
                  const on = i === index
                  const color = RANK_COLORS[i]
                  return (
                    <button
                      key={`${c.title}-${i}`}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={busy}
                      onClick={() => setSelected(c.title)}
                      className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#0b0b2b]/30 ${
                        on ? 'border-[#0b0b2b] bg-white shadow-sm' : 'border-[#e6d8c3] bg-[#fbf6ee] hover:border-[#0b0b2b]/40'
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                        style={{ background: color, color: i === 1 ? '#0b0b2b' : '#fff' }}
                      >
                        {i + 1}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-extrabold leading-snug text-black sm:text-base">
                          {c.title}
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#e8dcc8]">
                          <span className="block h-full rounded-full" style={{ width: `${pct(c)}%`, background: color }} />
                        </span>
                      </span>

                      <span className="w-14 shrink-0 text-right text-xl font-black text-black">{pct(c)}%</span>
                    </button>
                  )
                })}
              </div>

              {/* detail for the chosen career */}
              {current && (
                <div key={current.title} className="pw-rise mt-4 rounded-3xl border border-[#e6d8c3] bg-white p-5">
                  {parts.why.length > 0 && (
                    <>
                      <div className="text-xs font-bold uppercase tracking-wide text-[#2f80e0]">Why this fits</div>
                      <ul className="mt-2 space-y-2">
                        {parts.why.slice(0, 3).map((r, ri) => (
                          <li key={`${r}-${ri}`} className="flex gap-2 text-sm leading-relaxed text-neutral-700">
                            <svg
                              viewBox="0 0 24 24"
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#2f9e62]"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                            <span className="min-w-0 break-words">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {(parts.have.length > 0 || parts.need.length > 0) && (
                    <div className={`grid gap-3 sm:grid-cols-2 ${parts.why.length > 0 ? 'mt-4' : ''}`}>
                      {parts.have.length > 0 && <SkillBlock label="You already have" items={parts.have} tone="good" />}
                      {parts.need.length > 0 && <SkillBlock label="Skills to work on" items={parts.need} tone="todo" />}
                    </div>
                  )}

                  {parts.why.length === 0 && parts.have.length === 0 && parts.need.length === 0 && (
                    <p className="text-sm text-neutral-600">
                      This recommendation is based on your assessment profile and career-match score.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#e6d8c3] bg-white p-5 text-sm text-neutral-600">
              Your prediction was saved, but it has no recommended careers to show yet. Open your dashboard to see it.
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onViewDashboard}
              disabled={busy}
              className="rounded-full border border-[#d9c8ae] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-50"
            >
              Go to dashboard
            </button>
            <button
              type="button"
              disabled={!current || busy}
              onClick={() => onViewRoadmap(current.title)}
              className="max-w-full rounded-full bg-[#0b0b2b] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Saving...' : current ? 'View roadmap →' : 'No career to select'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PredictionModal