import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPrediction, selectCareer } from '../../api/predictions'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'

const DEFAULT_LAYOUT = 'tabs' // 'tabs' | 'cards' | 'split'

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

const list = (v) => (Array.isArray(v) ? v : [])
const str = (v) => (typeof v === 'string' ? v : '')
const text = (x) =>
  typeof x === 'string' ? x : x?.title ?? x?.name ?? x?.text ?? x?.reason ?? x?.label ?? ''
const reasonsOf = (c) => list(c?.reasons).map(text).filter(Boolean)
const whyText = (c) => str(c?.why) || str(c?.description)

/* NOTE: text uses <div>/<span> with explicit sizes, because the global p { font-size: var(--text-body) } rule overrides Tailwind sizes */

const Check = () => (
  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[#2f9e62]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
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

const Label = ({ children, cls = 'text-neutral-500' }) => (
  <div className={`text-xs font-bold uppercase tracking-wide ${cls}`}>{children}</div>
)

const Box = ({ children, className = '' }) => (
  <section className={`rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-6 shadow-sm ${className}`}>{children}</section>
)

/* ---------- shared career pieces ---------- */
const WhyFits = ({ c }) => {
  const reasons = reasonsOf(c)
  const fallback = whyText(c)
  if (!reasons.length && !fallback) return null
  return (
    <div>
      <Label cls="text-[#2f80e0]">Why this fits</Label>
      {reasons.length > 0 ? (
        <ul className="mt-2 grid gap-x-8 gap-y-2 md:grid-cols-2">
          {reasons.map((r) => (
            <li key={r} className="flex gap-2 text-sm leading-snug text-neutral-700">
              <Check />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-sm leading-relaxed text-neutral-700">{fallback}</div>
      )}
    </div>
  )
}

const SkillsSplit = ({ c }) => {
  const have = list(c?.skillsHave)
  const need = list(c?.skillsToBuild)
  if (!have.length && !need.length) return null
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label cls="text-[#2f9e62]">You already have</Label>
        {have.length ? <Chips items={have} cls="border-[#bfe3cd]" /> : <div className="mt-2 text-sm text-neutral-500">None of the key skills yet.</div>}
      </div>
      <div>
        <Label cls="text-[#e0404a]">Still to build</Label>
        {need.length ? <Chips items={need} cls="border-[#f0c4c7]" /> : <div className="mt-2 text-sm text-neutral-500">You cover every key skill.</div>}
      </div>
    </div>
  )
}

const MatchBar = ({ value, color = '#2f80e0' }) => (
  <div className="h-2.5 overflow-hidden rounded-full bg-[#e8dcc8]">
    <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
  </div>
)

const RankBadge = ({ i }) => (
  <span
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
    style={{ background: RANK_COLORS[i] || RANK_COLORS[0], color: i === 1 ? '#0b0b2b' : '#fff' }}
  >
    {i + 1}
  </span>
)

const SelectButton = ({ isSel, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isSel}
    className="rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-default disabled:opacity-60"
  >
    {isSel ? 'Selected ✓' : 'Select this career'}
  </button>
)

/* ---------- hero (character follows the personality type) ---------- */
const Hero = ({ assessment, insights }) => {
  const theme = mbtiTheme(assessment.mbti)
  const intro = str(insights.personality) || theme?.blurb
  return (
    <section
      className="flex flex-col items-center gap-6 rounded-3xl p-6 shadow-sm md:flex-row md:gap-10 md:px-10 md:py-7"
      style={{ background: theme?.tint ?? '#cde6f6' }}
    >
      {theme && <MbtiCharacter code={assessment.mbti} className="w-40 shrink-0 md:w-44" />}
      <div className="w-full min-w-0 text-center md:text-left">
        <Label cls="">
          <span style={{ color: theme?.dark ?? '#245f8a' }}>Inputs used for this prediction</span>
        </Label>
        <h2 className="mt-1 flex flex-wrap items-baseline justify-center gap-3 md:justify-start">
          <span className="text-4xl font-black leading-none tracking-tight sm:text-5xl" style={{ color: theme?.dark ?? '#245f8a' }}>
            {assessment.mbti ? assessment.mbti.toUpperCase() : 'N/A'}
          </span>
          {theme && <span className="text-lg font-extrabold text-black">{theme.name}</span>}
        </h2>
        {intro && <div className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-800 md:mx-0">{intro}</div>}
        {str(insights.preferenceNote) && (
          <div className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-neutral-700 md:mx-0">{insights.preferenceNote}</div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
          {assessment.degreeProgram && (
            <span className="rounded-full bg-[#0b0b2b] px-3 py-1 text-[13px] font-bold text-white">{assessment.degreeProgram}</span>
          )}
          {list(assessment.skills).map((s) => (
            <span key={s} className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[13px] text-neutral-700">{s}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- dark "your choice" card ---------- */
const ChoiceCard = ({ selected, saving, onGo, wide = false }) => (
  <section className={`rounded-3xl bg-[#0b0b2b] p-6 text-white shadow-sm ${wide ? 'flex flex-wrap items-center justify-between gap-4' : 'flex flex-col'}`}>
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-[#8fb8ff]">Your choice</div>
      <div className="mt-1 text-xl font-extrabold leading-tight">{selected || 'Nothing selected yet'}</div>
      <div className="mt-2 max-w-md text-sm leading-snug text-white/60">
        {selected ? 'Ready to see what it takes to get there?' : 'Select one of your top 3 careers to unlock its roadmap.'}
      </div>
    </div>
    <button
      type="button"
      onClick={onGo}
      disabled={!selected || saving}
      className={`whitespace-nowrap rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-wide text-[#0b0b2b] transition hover:bg-[#e8e8ff] disabled:cursor-not-allowed disabled:opacity-40 ${wide ? '' : 'mt-6'}`}
    >
      {saving ? 'Saving...' : 'View roadmap →'}
    </button>
  </section>
)

/* ---------- detail panel used by tabs + split ---------- */
const DetailPanel = ({ c, i, isSel, onSelect }) => (
  <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <RankBadge i={i} />
        <h3 className="text-2xl font-extrabold leading-tight text-black">{c.title}</h3>
      </div>
      <span className="text-3xl font-black text-black">{c.matchPercent}%</span>
    </div>
    <MatchBar value={c.matchPercent} color={RANK_COLORS[i]} />
    <WhyFits c={c} />
    <SkillsSplit c={c} />
    <SelectButton isSel={isSel} onClick={onSelect} />
  </div>
)

/* ---------- layout A: tabs + sticky choice card ---------- */
const LayoutTabs = ({ recs, focus, setFocus, selected, setSelected, saving, onGo }) => {
  const c = recs[focus] ?? recs[0]
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Box className="min-w-0">
        <div className="flex gap-2" role="tablist">
          {recs.map((r, i) => (
            <button
              key={r.title}
              role="tab"
              aria-selected={focus === i}
              onClick={() => setFocus(i)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-t-2xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                focus === i ? 'border-[#d9c8ae] border-b-white bg-white text-black' : 'border-transparent bg-[#efe3cf] text-neutral-600 hover:bg-[#e9dcc5]'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0b0b2b] text-[10px] text-white">{i + 1}</span>
              <span className="truncate">{r.title}</span>
              {selected === r.title && <span className="ml-auto text-[#2f9e62]">✓</span>}
            </button>
          ))}
        </div>
        <div className="-mt-px rounded-b-2xl rounded-tr-2xl border border-[#d9c8ae] bg-white p-6">
          <DetailPanel c={c} i={focus} isSel={selected === c.title} onSelect={() => setSelected(c.title)} />
        </div>
      </Box>
      <aside className="self-start lg:sticky lg:top-6">
        <ChoiceCard selected={selected} saving={saving} onGo={onGo} />
      </aside>
    </div>
  )
}

/* ---------- layout B: three ranked cards + wide choice bar ---------- */
const LayoutCards = ({ recs, selected, setSelected, saving, onGo }) => (
  <div className="space-y-6">
    <div className="grid gap-4 lg:grid-cols-3" role="radiogroup" aria-label="Choose a career">
      {recs.map((c, i) => {
        const isSel = selected === c.title
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
                <RankBadge i={i} />
                <h3 className="text-lg font-extrabold leading-tight text-black">{c.title}</h3>
              </div>
              <span className="shrink-0 text-2xl font-black text-black">{c.matchPercent}%</span>
            </div>
            <div className="mt-4"><MatchBar value={c.matchPercent} color={RANK_COLORS[i]} /></div>
            <div className="mt-5 space-y-5">
              <WhyFits c={c} />
              <SkillsSplit c={c} />
            </div>
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
    <ChoiceCard wide selected={selected} saving={saving} onGo={onGo} />
  </div>
)

/* ---------- layout C: ranked list left, detail right ---------- */
const LayoutSplit = ({ recs, focus, setFocus, selected, setSelected, saving, onGo }) => {
  const c = recs[focus] ?? recs[0]
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3 self-start lg:sticky lg:top-6">
        {recs.map((r, i) => {
          const active = focus === i
          return (
            <button
              key={r.title}
              type="button"
              onClick={() => setFocus(i)}
              aria-pressed={active}
              className={`block w-full rounded-2xl border-2 p-4 text-left transition ${
                active ? 'border-[#0b0b2b] bg-white shadow-md' : 'border-[#e6d8c3] bg-[#fbf6ee] hover:border-[#0b0b2b]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <div className="min-w-0 flex-1 text-sm font-extrabold leading-tight text-black">{r.title}</div>
                <span className="text-lg font-black text-black">{r.matchPercent}%</span>
              </div>
              <div className="mt-3"><MatchBar value={r.matchPercent} color={RANK_COLORS[i]} /></div>
              {selected === r.title && <div className="mt-2 text-xs font-bold uppercase tracking-wide text-[#2f9e62]">Selected ✓</div>}
            </button>
          )
        })}
        <ChoiceCard selected={selected} saving={saving} onGo={onGo} />
      </div>
      <Box className="min-w-0 bg-white">
        <DetailPanel c={c} i={focus} isSel={selected === c.title} onSelect={() => setSelected(c.title)} />
      </Box>
    </div>
  )
}

const LayoutToggle = ({ value, onChange }) => (
  <div className="flex flex-wrap items-center gap-2 text-xs">
    <span className="font-bold uppercase tracking-wide text-neutral-500">Preview layout</span>
    {['tabs', 'cards', 'split'].map((k) => (
      <button
        key={k}
        type="button"
        onClick={() => onChange(k)}
        className={`rounded-full border px-3 py-1 font-bold capitalize transition ${
          value === k ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white' : 'border-[#d9c8ae] bg-white text-neutral-700 hover:border-[#0b0b2b]'
        }`}
      >
        {k}
      </button>
    ))}
  </div>
)

const PredictionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [pred, setPred] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(0)
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
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
        <div className="text-base text-neutral-600">{error === 'Prediction not found' ? 'That prediction could not be found.' : error}</div>
        <Link to="/dashboard/recommendations" className="text-sm font-bold text-[#0b0b2b] hover:underline">
          ← Back to history
        </Link>
      </div>
    )
  }

  if (!pred) return <div className="text-base text-neutral-500">Loading prediction...</div>

  const { assessment, insights } = pred
  const recs = list(pred.recommended).slice(0, 3)
  const avoid = list(pred.avoid)

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

  const shared = { recs, selected, setSelected, saving, onGo: goToRoadmap, focus, setFocus }

  return (
    <div className="space-y-6">
      <header>
        <Link to="/dashboard/recommendations" className="text-sm font-bold text-[#0b0b2b] hover:underline">
          ← Back to history
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Your top 3 careers</h1>
            <div className="mt-1.5 text-base text-neutral-600">
              Prediction #{pred.number} made on {fmtDate(pred.createdAt)}. Select one to see the roadmap for it.
            </div>
          </div>
          <LayoutToggle value={layout} onChange={setLayout} />
        </div>
      </header>

      <Hero assessment={assessment} insights={insights} />

      {layout === 'tabs' && <LayoutTabs {...shared} />}
      {layout === 'cards' && <LayoutCards {...shared} />}
      {layout === 'split' && <LayoutSplit {...shared} />}

      {actionError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* careers to avoid */}
      {avoid.length > 0 && (
        <Box>
          <h2 className="text-xl font-extrabold text-black">Careers to avoid</h2>
          <div className="text-sm text-neutral-500">Fields that are a weaker fit for this profile</div>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {avoid.map((a) => (
              <li key={a.title} className="rounded-2xl border border-[#f0c4c7] bg-white p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e0404a]" />
                  <div className="text-sm font-extrabold leading-tight text-black">{a.title}</div>
                </div>
                {(str(a.why) || str(a.description)) && (
                  <div className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-neutral-600">{str(a.why) || str(a.description)}</div>
                )}
              </li>
            ))}
          </ul>
        </Box>
      )}

      {str(insights.disclaimer) && <div className="text-xs leading-relaxed text-neutral-500">{insights.disclaimer}</div>}
    </div>
  )
}

export default PredictionDetail