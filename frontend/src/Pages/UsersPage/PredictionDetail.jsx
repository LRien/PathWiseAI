import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaCheckCircle } from 'react-icons/fa'
import { getPrediction, selectCareer } from '../../api/predictions'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'
import PageLoader, { cacheMbti, getCachedMbti } from './UsersComponents/PageLoader'

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']

const DETAIL_LINES = [
  'Opening your prediction...',
  'Loading your top 3 careers...',
  'Checking your skills match...',
  'Putting the details together...',
]

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

/* NOTE: text uses <div>/<span> with explicit sizes, because the global p { font-size: var(--text-body) } rule overrides Tailwind sizes */

/* entrance: a block stays invisible until `play` is true (loader gone), then rises in.
   n is the order (0 = first). */
const riseStyle = (play, n = 0) =>
  play ? { animation: `detailRise .6s cubic-bezier(.2,.7,.3,1) ${n * 110}ms both` } : { opacity: 0 }

/* ---------- small shared pieces ---------- */
const Check = () => (
  <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#2f9e62]" aria-hidden="true" />
)

const Label = ({ children, className = 'text-neutral-500' }) => (
  <div className={`text-xs font-bold uppercase tracking-wide ${className}`}>{children}</div>
)

const SKILL_TABS = [
  ['soft', 'Soft'],
  ['technical', 'Technical'],
  ['other', 'Other'],
]

/* flat, smooth rectangles so the skills don't look clickable */
const Chips = ({ items, className = '' }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((s, i) => (
      <li
        key={`${text(s)}-${i}`}
        className={`max-w-full cursor-default select-text break-words rounded-md bg-white px-3 py-1.5 text-xs font-semibold leading-4 text-neutral-800 ${className}`}
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

/* the bar sits at 0 until `play` is true, then fills up (so it fills after the loader, not behind it) */
const MatchBar = ({ value, color = '#2f80e0', play = true }) => {
  const target = Math.max(0, Math.min(100, Number(value) || 0))
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!play) {
      setW(0)
      return undefined
    }
    const id = requestAnimationFrame(() => setW(target))
    return () => cancelAnimationFrame(id)
  }, [play, target])

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#e8dcc8]">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${w}%`, background: color }}
      />
    </div>
  )
}

/* ---------- left column: personality profile ---------- */
const ProfileCard = ({ assessment, insights, play }) => {
  const mbti = assessment?.mbti
  const theme = mbtiTheme(mbti)
  const intro = str(insights?.personality) || theme?.blurb

  return (
    <section
      className="detail-rise flex flex-1 flex-col justify-center rounded-3xl p-5 shadow-sm"
      style={{ background: theme?.tint ?? '#cde6f6', ...riseStyle(play, 1) }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {theme && (
          <div className="w-56 shrink-0 sm:w-64 lg:w-40">
            {/* mounted only after the loader, so the character's own intro animation plays when you can see it */}
            {play && <MbtiCharacter code={mbti} className="mx-auto w-full drop-shadow-md" />}
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
const ChoiceCard = ({ selected, saving, onGo, play }) => (
  <section
    className="detail-rise rounded-3xl bg-[#0b0b2b] p-5 text-white shadow-sm"
    style={riseStyle(play, 2)}
  >
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
const CareerFolder = ({ recs, focus, setFocus, selected, setSelected, play }) => {
  const [skillTab, setSkillTab] = useState('soft')
  const c = recs[focus] ?? recs[0]
  const reasons = reasonsOf(c)
  const fallback = whyText(c)
  const groups = c?.skills
  const tabs = groups
    ? SKILL_TABS.filter(([key]) => list(groups[key]?.have).length + list(groups[key]?.need).length > 0)
    : []
  const activeSkillTab = tabs.find(([key]) => key === skillTab)?.[0] ?? tabs[0]?.[0]
  const have = tabs.length ? list(groups[activeSkillTab]?.have) : list(c?.skillsHave)
  const need = tabs.length ? list(groups[activeSkillTab]?.need) : list(c?.skillsToBuild)
  const isSel = selected === c.title

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div role="tablist" aria-label="Top 3 careers" className="grid grid-cols-3 gap-1 sm:gap-2">
        {recs.map((r, i) => {
          const active = focus === i
          return (
            <button
              key={`${r.title}-${i}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={r.title}
              title={r.title}
              onClick={() => setFocus(i)}
              className={`relative flex min-w-0 flex-col gap-1 rounded-t-xl border-2 border-b-0 border-[#0b0b2b] px-2 pb-2 pt-2.5 text-left transition sm:rounded-t-2xl sm:px-4 sm:pt-3 ${
                active ? 'z-10 -mb-[2px] bg-white' : 'mt-2 bg-[#fff4b8] hover:bg-[#ffee94]'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-1 w-8 rounded-full sm:h-1.5 sm:w-10"
                style={{ background: RANK_COLORS[i] }}
              />
              <span className="line-clamp-3 break-words text-[11px] font-extrabold leading-tight text-black sm:line-clamp-2 sm:text-sm">
                {r.title}
              </span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs font-black text-black sm:text-sm">{pct(r)}%</span>
                {selected === r.title && (
                  <span className="text-[11px] font-bold text-[#2f9e62] sm:text-xs">
                    <span className="hidden sm:inline">Selected </span>✓
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <section
        role="tabpanel"
        className={`relative flex min-w-0 flex-1 flex-col rounded-bl-3xl rounded-br-3xl border-2 border-[#0b0b2b] bg-white p-4 shadow-sm sm:p-6 ${
          focus === 0 ? 'rounded-tl-none' : 'rounded-tl-3xl'
        } ${focus === recs.length - 1 ? 'rounded-tr-none' : 'rounded-tr-3xl'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
            <div className="shrink-0">
              <RankBadge index={focus} />
            </div>
            <div
              role="heading"
              aria-level={3}
              className="min-w-0 flex-1 break-words text-base font-extrabold leading-snug text-black [overflow-wrap:anywhere] sm:text-xl sm:leading-tight lg:text-2xl"
            >
              {c.title}
            </div>
          </div>
          <div className="shrink-0 text-lg font-black leading-none text-black sm:text-2xl lg:text-3xl">
            {pct(c)}%
          </div>
        </div>

        <div className="mt-4">
          <MatchBar value={pct(c)} color={RANK_COLORS[focus]} play={play} />
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

        {tabs.length > 1 && (
          <div className="mt-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Skill type">
            {tabs.map(([key, label]) => {
              const g = groups[key]
              const total = list(g.have).length + list(g.need).length
              const on = key === activeSkillTab
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setSkillTab(key)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                    on
                      ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white'
                      : 'border-[#d9c8ae] bg-white text-neutral-700 hover:border-[#0b0b2b]'
                  }`}
                >
                  {label} <span className="opacity-70">{list(g.have).length}/{total}</span>
                </button>
              )
            })}
          </div>
        )}

        {have.length + need.length > 0 && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <Label>Skill coverage</Label>
              <div className="text-sm font-bold text-black">
                {have.length} of {have.length + need.length} key skills
              </div>
            </div>
            <div className="mt-2">
              <MatchBar
                value={Math.round((have.length / (have.length + need.length)) * 100)}
                color="#2f9e62"
                play={play}
              />
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
          <div className="min-w-0 text-sm text-neutral-500">Selecting Saves This Career And Unlocks Its Roadmap</div>
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
const AvoidSection = ({ avoid, play }) => (
  <section
    className="detail-rise rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:p-6"
    style={riseStyle(play, 3)}
  >
    <h2 className="text-base font-extrabold text-black">Careers To Avoid</h2>
    <div className="text-sm text-neutral-500">Fields That May Be A Weaker Fit For This Profile</div>
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

  /* loader: stays up until the prediction is in (or failed) AND its finish animation has played */
  const [showLoader, setShowLoader] = useState(true)
  const [cachedMbti] = useState(getCachedMbti)

  /* every animation on this page waits for this: true only once the loader is completely gone */
  const play = Boolean(pred) && !showLoader

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

  /* the loader shows this prediction's own type once known, otherwise the one remembered from last visit */
  const loaderMbti = pred?.assessment?.mbti || cachedMbti
  useEffect(() => {
    cacheMbti(pred?.assessment?.mbti)
  }, [pred])

  const loader = showLoader ? (
    <PageLoader
      mbti={loaderMbti}
      ready={Boolean(pred) || Boolean(error)}
      onFinished={() => setShowLoader(false)}
      minShow={1800}
      lines={DETAIL_LINES}
      title={(t, code) => (t ? `Opening your ${code} prediction` : 'Opening your prediction')}
      doneTitle={(t, code) => (t ? `${code} · ${t.name}, here it is!` : 'Here it is!')}
    />
  ) : null

  if (error) {
    return (
      <>
        <div className="space-y-4">
          <div className="text-base text-neutral-600">
            {error === 'Prediction not found' ? 'That prediction could not be found.' : error}
          </div>
          <Link to="/dashboard/recommendations" className="text-sm font-bold text-[#0b0b2b] hover:underline">
            ← Back to history
          </Link>
        </div>
        {loader}
      </>
    )
  }

  if (!pred) {
    return (
      <>
        <div className="min-h-[60vh]" />
        {loader}
      </>
    )
  }

  const { assessment, insights } = pred
  const recs = list(pred.recommended).slice(0, 3)
  const avoid = list(pred.avoid).slice(0, 3)

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
      <style>{`
        @keyframes detailRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .detail-rise { animation: none !important; opacity: 1 !important; transform: none !important; } }
      `}</style>

      {/* Page heading: same layout as the dashboard (title on the left, New prediction on the right) */}
      <header
        className="detail-rise flex flex-wrap items-center justify-between gap-4"
        style={riseStyle(play, 0)}
      >
        <div className="min-w-0">
          <Link to="/dashboard/recommendations" className="text-sm font-bold text-[#0b0b2b] hover:underline">
            ← Back to history
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Your Top 3 Careers
          </h1>
        </div>

        <Link
          to="/assessment-test"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0b0b2b] px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1a1a4a] focus:outline-none focus:ring-2 focus:ring-[#0b0b2b]/30"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
          New prediction
        </Link>
      </header>

      {actionError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* LEFT: profile + choice, same height as the career panel */}
        <aside className="flex min-w-0 flex-col gap-4">
          <ProfileCard assessment={assessment} insights={insights ?? {}} play={play} />
          <ChoiceCard selected={selected} saving={saving} onGo={goToRoadmap} play={play} />
        </aside>

        {/* RIGHT: careers */}
        <div className="detail-rise flex min-w-0 flex-col" style={riseStyle(play, 1)}>
          {recs.length > 0 ? (
            <CareerFolder
              recs={recs}
              focus={focus}
              setFocus={setFocus}
              selected={selected}
              setSelected={setSelected}
              play={play}
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
      {avoid.length > 0 && <AvoidSection avoid={avoid} play={play} />}

      {str(insights?.disclaimer) && (
        <div className="detail-rise text-xs leading-relaxed text-neutral-500 lowercase" style={riseStyle(play, 4)}>
          {insights.disclaimer}
        </div>
      )}

      {/* the loader finishing its animation on top of the ready page */}
      {loader}
    </div>
  )
}

export default PredictionDetail