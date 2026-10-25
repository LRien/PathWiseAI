import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaCheckCircle } from 'react-icons/fa'
import { getPrediction, selectCareer } from '../../api/predictions'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']

const list = (v) => (Array.isArray(v) ? v : [])
const str = (v) => (typeof v === 'string' ? v : '')
const text = (x) =>
  typeof x === 'string' ? x : x?.title ?? x?.name ?? x?.text ?? x?.reason ?? x?.label ?? ''
const reasonsOf = (c) => list(c?.reasons).map(text).filter(Boolean)
const whyText = (c) => str(c?.why) || str(c?.description)

const pct = (c) => {
  const v = Number(c?.matchPercent ?? c?.percent ?? c?.score ?? 0)
  return Math.max(0, Math.min(100, Math.round(v)))
}

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* NOTE: text uses <div>/<span> with explicit sizes, because the global p { font-size: var(--text-body) } rule overrides Tailwind sizes */

/* ---------- small shared pieces ---------- */
const Check = () => (
  <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#2f9e62]" aria-hidden="true" />
)

const Label = ({ children, className = 'text-neutral-500' }) => (
  <div className={`text-xs font-bold uppercase tracking-wide ${className}`}>{children}</div>
)

const Chips = ({ items, className = '' }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((s, i) => (
      <li
        key={`${text(s)}-${i}`}
        className={`max-w-full break-words rounded-full border bg-white px-3 py-1 text-xs leading-4 text-neutral-700 ${className}`}
      >
        {text(s)}
      </li>
    ))}
  </ul>
)

const RankBadge = ({ index }) => (
  <span
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
    style={{
      background: RANK_COLORS[index] ?? RANK_COLORS[0],
      color: index === 1 ? '#0b0b2b' : '#fff',
    }}
  >
    {index + 1}
  </span>
)

const MatchBar = ({ value, color = '#2f80e0' }) => (
  <div className="h-2 overflow-hidden rounded-full bg-[#e8dcc8]">
    <div
      className="h-full rounded-full transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`, background: color }}
    />
  </div>
)

/* ---------- left column: personality profile ---------- */
const ProfileCard = ({ assessment, insights }) => {
  const mbti = assessment?.mbti
  const theme = mbtiTheme(mbti)
  const intro = str(insights?.personality) || theme?.blurb

  return (
    <section
      className="flex flex-1 flex-col justify-center rounded-3xl p-5 shadow-sm"
      style={{ background: theme?.tint ?? '#cde6f6' }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {theme && (
          <div className="w-56 shrink-0 sm:w-64 lg:w-40">
            <MbtiCharacter code={mbti} className="mx-auto w-full drop-shadow-md" />
          </div>
        )}
        <div className="min-w-0">
          <h2
            className="text-4xl font-black leading-none tracking-tight"
            style={{ color: theme?.dark ?? '#245f8a' }}
          >
            {mbti ? String(mbti).toUpperCase() : 'N/A'}
          </h2>
          {theme?.name && <div className="mt-1 text-base font-extrabold text-black">{theme.name}</div>}
        </div>
      </div>

      {intro && <div className="mt-4 text-sm leading-relaxed text-neutral-800">{intro}</div>}
    </section>
  )
}

/* ---------- left column: selection card ---------- */
const ChoiceCard = ({ selected, saving, onGo }) => (
  <section className="rounded-3xl bg-[#0b0b2b] p-5 text-white shadow-sm">
    <Label className="text-[#8fb8ff]">Your choice</Label>
    <h3 className="mt-1 break-words text-lg font-extrabold leading-snug">
      {selected || 'Nothing selected yet'}
    </h3>
    <div className="mt-2 text-sm leading-relaxed text-white/70">
      {selected
        ? 'Ready to see what it takes to get there?'
        : 'Select one of your top 3 careers to unlock its roadmap.'}
    </div>
    <button
      type="button"
      onClick={onGo}
      disabled={!selected || saving}
      className="mt-4 flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-[#0b0b2b] transition hover:bg-[#e8e8ff] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {saving ? 'Saving...' : 'View roadmap →'}
    </button>
  </section>
)

/* ---------- right column: folder tabs + career details ---------- */
const CareerFolder = ({ recs, focus, setFocus, selected, setSelected }) => {
  const c = recs[focus] ?? recs[0]
  const reasons = reasonsOf(c)
  const fallback = whyText(c)
  const have = list(c?.skillsHave)
  const need = list(c?.skillsToBuild)
  const isSel = selected === c.title

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div role="tablist" aria-label="Top 3 careers" className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {recs.map((r, i) => {
          const active = focus === i
          return (
            <button
              key={`${r.title}-${i}`}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFocus(i)}
              className={`relative flex min-w-0 flex-col gap-1 rounded-t-2xl border-2 border-b-0 border-[#0b0b2b] px-3 pb-2 pt-3 text-left transition sm:px-4 ${
                active ? 'z-10 -mb-[2px] bg-white' : 'mt-2 bg-[#fff4b8] hover:bg-[#ffee94]'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-10 rounded-full"
                style={{ background: RANK_COLORS[i] }}
              />
              <span className="line-clamp-2 break-words text-xs font-extrabold leading-tight text-black sm:text-sm">
                {r.title}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-black text-black">{pct(r)}%</span>
                {selected === r.title && (
                  <span className="text-[10px] font-bold text-[#2f9e62] sm:text-xs">Selected ✓</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <section
        role="tabpanel"
        className={`relative flex min-w-0 flex-1 flex-col rounded-bl-3xl rounded-br-3xl border-2 border-[#0b0b2b] bg-white p-5 shadow-sm sm:p-6 ${
          focus === 0 ? 'rounded-tl-none' : 'rounded-tl-3xl'
        } ${focus === recs.length - 1 ? 'rounded-tr-none' : 'rounded-tr-3xl'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <RankBadge index={focus} />
            <h3 className="break-words text-xl font-extrabold leading-tight text-black sm:text-2xl">
              {c.title}
            </h3>
          </div>
          <span className="shrink-0 text-2xl font-black leading-none text-black sm:text-3xl">
            {pct(c)}%
          </span>
        </div>

        <div className="mt-4">
          <MatchBar value={pct(c)} color={RANK_COLORS[focus]} />
        </div>

        <div className="mt-5">
          <Label className="text-[#2f80e0]">Why this fits</Label>
          {reasons.length > 0 ? (
            <ul className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {reasons.map((r, i) => (
                <li key={`${r}-${i}`} className="flex min-w-0 gap-2 text-sm leading-relaxed text-neutral-700">
                  <Check />
                  <span className="min-w-0 break-words">{r}</span>
                </li>
              ))}
            </ul>
          ) : fallback ? (
            <div className="mt-2 text-sm leading-relaxed text-neutral-700">{fallback}</div>
          ) : (
            <div className="mt-2 text-sm leading-relaxed text-neutral-500">
              This recommendation is based on your assessment profile and career-match score.
            </div>
          )}
        </div>

        {have.length + need.length > 0 && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <Label>Skill coverage</Label>
              <div className="text-sm font-bold text-black">
                {have.length} of {have.length + need.length} key skills
              </div>
            </div>
            <div className="mt-2">
              <MatchBar value={Math.round((have.length / (have.length + need.length)) * 100)} color="#2f9e62" />
            </div>
          </div>
        )}

        <div className="mt-6 grid flex-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-[#eaf6ef] p-4">
            <Label className="text-[#2f9e62]">You already have</Label>
            {have.length > 0 ? (
              <Chips items={have} className="border-[#bfe3cd]" />
            ) : (
              <div className="mt-2 text-sm text-neutral-600">No matching skills recorded yet.</div>
            )}
          </div>
          <div className="min-w-0 rounded-2xl bg-[#fcecec] p-4">
            <Label className="text-[#e0404a]">Still to build</Label>
            {need.length > 0 ? (
              <Chips items={need} className="border-[#f0c4c7]" />
            ) : (
              <div className="mt-2 text-sm text-neutral-600">You cover all listed key skills.</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
          <div className="min-w-0 text-sm text-neutral-500">Selecting saves this career and unlocks its roadmap.</div>
          <button
            type="button"
            onClick={() => setSelected(c.title)}
            disabled={isSel}
            className={`rounded-full px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white transition ${
              isSel ? 'cursor-default bg-[#6d6d80]' : 'bg-[#0b0b2b] hover:bg-[#1a1a4a]'
            } disabled:opacity-70`}
          >
            {isSel ? 'Selected ✓' : 'Select this career'}
          </button>
        </div>
      </section>
    </div>
  )
}

/* ---------- careers to avoid: always visible, titles only ---------- */
const AvoidSection = ({ avoid }) => (
  <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:p-6">
    <h2 className="text-base font-extrabold text-black">Careers to avoid</h2>
    <div className="text-sm text-neutral-500">Fields that may be a weaker fit for this profile</div>
    <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {avoid.map((a, i) => (
        <li
          key={`${text(a)}-${i}`}
          className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#f0c4c7] bg-white px-4 py-3"
        >
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e0404a]" />
          <div className="min-w-0 break-words text-sm font-extrabold leading-snug text-black">
            {text(a)}
          </div>
        </li>
      ))}
    </ul>
  </section>
)

/* ---------- page ---------- */
const PredictionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [pred, setPred] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(0)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    setPred(null)
    setError('')
    getPrediction(id)
      .then((p) => {
        if (cancelled) return
        setPred(p)
        setSelected(p.selectedCareer || null) // remembers an earlier choice
        const at = list(p.recommended).findIndex((c) => c.title === p.selectedCareer)
        setFocus(at >= 0 ? at : 0)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-base text-neutral-600">
          {error === 'Prediction not found' ? 'That prediction could not be found.' : error}
        </div>
        <Link to="/dashboard/recommendations" className="text-sm font-bold text-[#0b0b2b] hover:underline">
          ← Back to history
        </Link>
      </div>
    )
  }

  if (!pred) return <div className="text-base text-neutral-500">Loading prediction...</div>

  const { assessment, insights } = pred
  const recs = list(pred.recommended).slice(0, 3)
  const avoid = list(pred.avoid).slice(0, 3)
  const date = fmtDate(pred.createdAt)

  const goToRoadmap = async () => {
    if (!selected) return
    setSaving(true)
    setActionError('')
    try {
      await selectCareer(pred.id, selected)
      localStorage.setItem('selectedCareer', JSON.stringify({ predictionId: pred.id, career: selected }))
      navigate('/dashboard/roadmap', { state: { predictionId: pred.id } })
    } catch (e) {
      setActionError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <Link to="/dashboard/recommendations" className="text-sm font-bold text-[#0b0b2b] hover:underline">
          ← Back to history
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl">
          Your top 3 careers
        </h1>
        <div className="mt-1 text-sm leading-relaxed text-neutral-600">
          Prediction #{pred.number}
          {date ? ` made on ${date}` : ''}. Pick one to see its roadmap.
        </div>
      </header>

      {actionError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* LEFT: profile + choice, same height as the career panel */}
        <aside className="flex min-w-0 flex-col gap-4">
          <ProfileCard assessment={assessment} insights={insights ?? {}} />
          <ChoiceCard selected={selected} saving={saving} onGo={goToRoadmap} />
        </aside>

        {/* RIGHT: careers */}
        <div className="flex min-w-0 flex-col">
          {recs.length > 0 ? (
            <CareerFolder
              recs={recs}
              focus={focus}
              setFocus={setFocus}
              selected={selected}
              setSelected={setSelected}
            />
          ) : (
            <section className="rounded-3xl border border-[#e6d8c3] bg-white p-6">
              <h2 className="text-lg font-extrabold text-black">No career recommendations available</h2>
              <div className="mt-2 text-sm text-neutral-600">
                This prediction does not contain a list of recommended careers.
              </div>
            </section>
          )}
        </div>
      </div>

      {/* full width, so nothing sits beside it as empty space */}
      {avoid.length > 0 && <AvoidSection avoid={avoid} />}

      {str(insights?.disclaimer) && (
        <div className="text-xs leading-relaxed text-neutral-500">{insights.disclaimer}</div>
      )}
    </div>
  )
}

export default PredictionDetail