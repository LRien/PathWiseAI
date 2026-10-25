import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCheckCircle } from 'react-icons/fa'
import * as predApi from '../../api/predictions'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'

const { listPredictions, getLatestPrediction, getRoadmap } = predApi

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']

const list = (value) => (Array.isArray(value) ? value : [])
const str = (value) => (typeof value === 'string' ? value : '')

const text = (value) =>
  typeof value === 'string'
    ? value
    : value?.title ??
      value?.name ??
      value?.step ??
      value?.text ??
      value?.reason ??
      value?.label ??
      value?.description ??
      ''

const pct = (career) => {
  const value = Number(career?.matchPercent ?? career?.percent ?? career?.score ?? 0)
  return Math.max(0, Math.min(100, Math.round(value)))
}

const fmtDate = (date) => {
  if (!date) return ''
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

const Check = () => (
  <FaCheckCircle
    className="mt-0.5 h-4 w-4 shrink-0 text-[#2f9e62]"
    aria-hidden="true"
  />
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

const Label = ({ children, className = 'text-neutral-500' }) => (
  <div className={`text-xs font-bold uppercase tracking-wide ${className}`}>{children}</div>
)

const SKILL_TABS = [
  ['technical', 'Technical'],
  ['other', 'Other'],
  ['soft', 'Soft'],
]

const Chips = ({ items, className = '' }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((item, index) => (
      <li
        key={`${text(item)}-${index}`}
        className={`max-w-full break-words rounded-full border bg-white px-3 py-1 text-xs leading-4 text-neutral-700 ${className}`}
      >
        {text(item)}
      </li>
    ))}
  </ul>
)

const UserDashboard = () => {
  const [data, setData] = useState(null)
  const [pred, setPred] = useState(null)
  const [road, setRoad] = useState(null)
  const [done, setDone] = useState([])
  const [focus, setFocus] = useState(0)
  const [skillTab, setSkillTab] = useState('technical')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      try {
        const result = await listPredictions()
        if (cancelled) return
        setData(result)
        if (!result?.predictions?.length) return

        const latest = await getLatestPrediction()
        if (cancelled) return
        setPred(latest)

        try {
          const roadmap = await getRoadmap(latest.id)
          if (cancelled) return
          setRoad(roadmap)

          const selectedIndex = list(latest.recommended).findIndex(
            (career) => career.title === roadmap?.career?.title
          )
          if (selectedIndex >= 0) setFocus(selectedIndex)
        } catch {
          if (!cancelled) setRoad('none')
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Unable to load your predictions.')
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [])

  const hasRoad = Boolean(road && road !== 'none' && road.career)
  const top = list(pred?.recommended).slice(0, 3)
  const currentCareer = top[focus] ?? top[0] ?? null
  const selectedTitle = hasRoad ? road.career.title : null
  const isSelected = Boolean(currentCareer && selectedTitle === currentCareer.title)

  const storeKey = pred?.id && hasRoad ? `roadmapProgress:${pred.id}:${road.career.title}` : null

  useEffect(() => {
    if (!storeKey) {
      setDone([])
      return
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || '[]')
      setDone(Array.isArray(saved) ? saved : [])
    } catch {
      setDone([])
    }
  }, [storeKey])

  const chooseCareer = async (career) => {
    if (!pred?.id || !career || busy) return

    setBusy(true)
    setError('')

    try {
      await predApi.selectCareer(pred.id, career.title)

      try {
        localStorage.setItem(
          'selectedCareer',
          JSON.stringify({ predictionId: pred.id, career: career.title })
        )
      } catch {
        // The database remains the source of the selected career.
      }

      const roadmap = await getRoadmap(pred.id)
      setRoad(roadmap)
    } catch (err) {
      setError(err?.message || 'Unable to select this career.')
    } finally {
      setBusy(false)
    }
  }

  const mbti = pred?.mbti ?? data?.predictions?.[0]?.mbti
  const theme = mbtiTheme(mbti)

  const reasons = list(currentCareer?.reasons ?? currentCareer?.whyFit).map(text).filter(Boolean)

  const fallbackReason =
    str(currentCareer?.why) || str(currentCareer?.reason) || str(currentCareer?.description)

  const groups = currentCareer?.skills
  const tabs = groups
    ? SKILL_TABS.filter(([key]) => list(groups[key]?.have).length + list(groups[key]?.need).length > 0)
    : []
  const activeSkillTab = tabs.find(([key]) => key === skillTab)?.[0] ?? tabs[0]?.[0]
  const have = tabs.length ? list(groups[activeSkillTab]?.have) : list(currentCareer?.skillsHave)
  const need = tabs.length ? list(groups[activeSkillTab]?.need) : list(currentCareer?.skillsToBuild)

  const steps = hasRoad ? list(road?.roadmap?.timeline?.steps) : []
  const completedCount = done.length
  const progress = steps.length
    ? Math.min(100, Math.round((completedCount / steps.length) * 100))
    : 0

  const nextIndex = steps.findIndex((_, index) => !done.includes(String(index)))
  const nextStep = nextIndex >= 0 ? text(steps[nextIndex]) : 'All steps completed. Nice work!'

  const avoid = list(pred?.avoid ?? pred?.careersToAvoid ?? pred?.avoidCareers).slice(0, 3)

  const predictionNumber =
    pred?.predictionNumber ?? pred?.prediction_number ?? pred?.number ?? ''

  const predictionDate = fmtDate(
    pred?.createdAt ?? pred?.created_at ?? pred?.predictionDate ?? pred?.prediction_date
  )

  return (
    <main className="min-h-screen bg-[#f3e6d3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1120px] space-y-6">
        {/* Page heading */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">
              Your top 3 careers
            </h1>

            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              {predictionNumber ? `Prediction #${predictionNumber}` : 'Your latest prediction'}
              {predictionDate ? ` made on ${predictionDate}` : ''}. Pick one to see its roadmap.
            </p>
          </div>

          <Link
            to="/assessment-test"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0b0b2b] px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1a1a4a] focus:outline-none focus:ring-2 focus:ring-[#0b0b2b]/30"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            New prediction
          </Link>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="py-12 text-center text-sm text-neutral-500">Loading your prediction...</div>
        )}

        {data && !pred && data?.predictions?.length > 0 && (
          <div className="py-8 text-sm text-neutral-500">Loading your career recommendations...</div>
        )}

        {data && !data?.predictions?.length && (
          <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-8 text-center">
            <h2 className="text-xl font-extrabold text-black">No predictions yet</h2>
            <div className="mt-2 text-sm text-neutral-600">
              Complete your assessment to see your top career matches.
            </div>
            <Link
              to="/assessment-test"
              className="mt-5 inline-flex rounded-full bg-[#0b0b2b] px-6 py-3 text-xs font-bold uppercase text-white transition hover:bg-[#1a1a4a]"
            >
              Start assessment
            </Link>
          </section>
        )}

        {pred && (
          <>
            {/* Both columns stretch to the same height, so there is no dead space */}
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              {/* LEFT: profile + roadmap progress */}
              <aside className="flex min-w-0 flex-col gap-4">
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
                      {theme?.name && (
                        <div className="mt-1 text-base font-extrabold text-black">{theme.name}</div>
                      )}
                    </div>
                  </div>

                  {theme?.blurb && (
                    <div className="mt-4 text-sm leading-relaxed text-neutral-800">{theme.blurb}</div>
                  )}
                </section>

                {/* Roadmap progress card */}
                <section className="rounded-3xl bg-[#0b0b2b] p-5 text-white shadow-sm">
                  <Label className="text-[#8fb8ff]">Your roadmap</Label>

                  {hasRoad ? (
                    <>
                      <h3 className="mt-1 break-words text-lg font-extrabold leading-snug">
                        {road.career.title}
                      </h3>

                      <div className="mt-4 flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: `conic-gradient(#5aa9ff ${progress * 3.6}deg, rgba(255,255,255,.16) 0deg)`,
                          }}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b0b2b] text-xs font-extrabold">
                            {progress}%
                          </div>
                        </div>

                        <div className="min-w-0 text-sm font-bold leading-snug">
                          {completedCount} of {steps.length} steps done
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white/10 p-3">
                        <Label className="text-white/60">Next up</Label>
                        <div className="mt-1 break-words text-sm leading-relaxed">{nextStep}</div>
                      </div>

                      <Link
                        to="/dashboard/roadmap"
                        state={{ predictionId: pred.id }}
                        className="mt-4 flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-[#0b0b2b] transition hover:bg-[#e8e8ff]"
                      >
                        View roadmap →
                      </Link>
                    </>
                  ) : (
                    <div className="mt-2 text-sm leading-relaxed text-white/70">
                      Select a career on the right to unlock your step-by-step roadmap.
                    </div>
                  )}
                </section>
              </aside>

              {/* RIGHT: careers */}
              <div className="flex min-w-0 flex-col">
                {top.length > 0 && currentCareer ? (
                  <div className="flex min-w-0 flex-1 flex-col">
                    {/* Folder tabs */}
                    <div
                      role="tablist"
                      aria-label="Top 3 careers"
                      className="grid grid-cols-3 gap-1.5 sm:gap-2"
                    >
                      {top.map((career, index) => {
                        const active = focus === index
                        return (
                          <button
                            key={`${career.title}-${index}`}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setFocus(index)}
                            className={`relative flex min-w-0 flex-col gap-1 rounded-t-2xl border-2 border-b-0 border-[#0b0b2b] px-3 pb-2 pt-3 text-left transition sm:px-4 ${
                              active
                                ? 'z-10 -mb-[2px] bg-white'
                                : 'mt-2 bg-[#fff4b8] hover:bg-[#ffee94]'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-10 rounded-full"
                              style={{ background: RANK_COLORS[index] }}
                            />

                            <span className="line-clamp-2 break-words text-xs font-extrabold leading-tight text-black sm:text-sm">
                              {career.title}
                            </span>

                            <span className="flex items-center gap-2">
                              <span className="text-sm font-black text-black">{pct(career)}%</span>
                              {selectedTitle === career.title && (
                                <span className="text-[10px] font-bold text-[#2f9e62] sm:text-xs">
                                  Selected ✓
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Folder body */}
                    <section
                      role="tabpanel"
                      className={`relative flex min-w-0 flex-1 flex-col rounded-bl-3xl rounded-br-3xl border-2 border-[#0b0b2b] bg-white p-5 shadow-sm sm:p-6 ${
                        focus === 0 ? 'rounded-tl-none' : 'rounded-tl-3xl'
                      } ${focus === top.length - 1 ? 'rounded-tr-none' : 'rounded-tr-3xl'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <RankBadge index={focus} />
                          <h3 className="break-words text-xl font-extrabold leading-tight text-black sm:text-2xl">
                            {currentCareer.title}
                          </h3>
                        </div>
                        <span className="shrink-0 text-2xl font-black leading-none text-black sm:text-3xl">
                          {pct(currentCareer)}%
                        </span>
                      </div>

                      <div className="mt-4">
                        <MatchBar value={pct(currentCareer)} color={RANK_COLORS[focus]} />
                      </div>

                      <div className="mt-5">
                        <Label className="text-[#2f80e0]">Why this fits</Label>

                        {reasons.length > 0 ? (
                          <ul className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                            {reasons.map((reason, index) => (
                              <li
                                key={`${reason}-${index}`}
                                className="flex min-w-0 gap-2 text-sm leading-relaxed text-neutral-700"
                              >
                                <Check />
                                <span className="min-w-0 break-words">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : fallbackReason ? (
                          <div className="mt-2 text-sm leading-relaxed text-neutral-700">
                            {fallbackReason}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm leading-relaxed text-neutral-500">
                            This recommendation is based on your assessment profile and
                            career-match score.
                          </div>
                        )}
                      </div>

                      {/* Skills as tinted blocks */}
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
                            <div className="mt-2 text-sm text-neutral-600">
                              No matching skills recorded yet.
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 rounded-2xl bg-[#fcecec] p-4">
                          <Label className="text-[#e0404a]">Still to build</Label>
                          {need.length > 0 ? (
                            <Chips items={need} className="border-[#f0c4c7]" />
                          ) : (
                            <div className="mt-2 text-sm text-neutral-600">
                              You cover all listed key skills.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
                        <div className="min-w-0 text-sm text-neutral-500">Selecting saves this career and unlocks its roadmap.</div>
                        <button
                          type="button"
                          onClick={() => chooseCareer(currentCareer)}
                          disabled={busy || isSelected}
                          className={`rounded-full px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white transition ${
                            isSelected
                              ? 'cursor-default bg-[#6d6d80]'
                              : 'bg-[#0b0b2b] hover:bg-[#1a1a4a]'
                          } disabled:opacity-70`}
                        >
                          {isSelected ? 'Selected ✓' : busy ? 'Saving...' : 'Select this career'}
                        </button>
                      </div>
                    </section>
                  </div>
                ) : (
                  <section className="rounded-3xl border border-[#e6d8c3] bg-white p-6">
                    <h2 className="text-lg font-extrabold text-black">
                      No career recommendations available
                    </h2>
                    <div className="mt-2 text-sm text-neutral-600">
                      Your prediction was loaded, but it does not contain a list of recommended
                      careers.
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* Careers to avoid: always visible, titles only, full width */}
            {avoid.length > 0 && (
              <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:p-6">
                <h2 className="text-base font-extrabold text-black">Careers to avoid</h2>
                <div className="text-sm text-neutral-500">
                  Fields that may be a weaker fit for this profile
                </div>

                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {avoid.map((career, index) => (
                    <li
                      key={`${text(career)}-${index}`}
                      className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#f0c4c7] bg-white px-4 py-3"
                    >
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e0404a]" />
                      <div className="min-w-0 break-words text-sm font-extrabold leading-snug text-black">
                        {text(career)}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <footer className="pb-4 text-xs leading-relaxed text-neutral-500">
              Suggestions are based on your personality type, skills, and education. Use them as a
              guide, not a rule.
            </footer>
          </>
        )}
      </div>
    </main>
  )
}

export default UserDashboard