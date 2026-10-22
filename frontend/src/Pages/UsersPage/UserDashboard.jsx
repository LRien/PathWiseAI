
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const value = Number(
    career?.matchPercent ?? career?.percent ?? career?.score ?? 0
  )
  return Math.max(0, Math.min(100, Math.round(value)))
}

const fmtDate = (date) => {
  if (!date) return 'Date unavailable'

  const parsed = new Date(date)

  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}

const Check = () => (
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
      style={{
        width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`,
        background: color,
      }}
    />
  </div>
)

const Label = ({ children, className = 'text-neutral-500' }) => (
  <div className={`text-[11px] font-bold uppercase tracking-wide ${className}`}>
    {children}
  </div>
)

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
        if (!cancelled) {
          setError(err?.message || 'Unable to load your predictions.')
        }
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

  const isSelected = Boolean(
    currentCareer && selectedTitle === currentCareer.title
  )

  const storeKey =
    pred?.id && hasRoad
      ? `roadmapProgress:${pred.id}:${road.career.title}`
      : null

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
          JSON.stringify({
            predictionId: pred.id,
            career: career.title,
          })
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

  const inputs = pred?.inputs ?? pred?.input ?? pred?.profile ?? {}

  const preferredCareer =
    inputs?.preferredCareer ??
    inputs?.preferred_career ??
    inputs?.careerPreference ??
    inputs?.career_preference ??
    pred?.preferredCareer ??
    pred?.preferred_career ??
    ''

  const inputSkills = list(
    inputs?.skills ??
      inputs?.Skills ??
      pred?.skills ??
      pred?.userSkills ??
      pred?.user_skills
  )

  const inputDescription =
    inputs?.description ??
    inputs?.selfDescription ??
    inputs?.self_description ??
    inputs?.about ??
    pred?.description ??
    pred?.selfDescription ??
    pred?.self_description ??
    ''

  const profileSkills = [
    ...new Set([
      ...inputSkills.map(text).filter(Boolean),
      ...list(inputs?.certifications).map(text).filter(Boolean),
    ]),
  ]

  const reasons = list(currentCareer?.reasons ?? currentCareer?.whyFit)
    .map(text)
    .filter(Boolean)

  const fallbackReason =
    str(currentCareer?.why) ||
    str(currentCareer?.reason) ||
    str(currentCareer?.description)

  const have = list(currentCareer?.skillsHave)
  const need = list(currentCareer?.skillsToBuild)

  const steps = hasRoad ? list(road?.roadmap?.timeline?.steps) : []
  const completedCount = done.length

  const progress = steps.length
    ? Math.min(100, Math.round((completedCount / steps.length) * 100))
    : 0

  const nextIndex = steps.findIndex(
    (_, index) => !done.includes(String(index))
  )

  const nextStep =
    nextIndex >= 0
      ? text(steps[nextIndex])
      : 'All steps completed. Nice work!'

  const avoid = list(
    pred?.avoid ?? pred?.careersToAvoid ?? pred?.avoidCareers
  )

  const predictionNumber =
    pred?.predictionNumber ??
    pred?.prediction_number ??
    pred?.number ??
    ''

  const predictionDate = fmtDate(
    pred?.createdAt ??
      pred?.created_at ??
      pred?.predictionDate ??
      pred?.prediction_date
  )

  return (
    <main className="min-h-screen bg-[#f3e6d3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1120px] space-y-5">
        {/* Page heading */}
        <header>
          <Link
            to="/dashboard/history"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0b0b2b] transition hover:opacity-60"
          >
            <span aria-hidden="true">←</span>
            Back to history
          </Link>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Your top 3 careers
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            {predictionNumber
              ? `Prediction #${predictionNumber}`
              : 'Your latest prediction'}
            {predictionDate !== 'Date unavailable'
              ? ` made on ${predictionDate}`
              : ''}
            . Select one to see the roadmap for it.
          </p>
        </header>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {!data && !error && (
          <div className="py-12 text-center text-sm text-neutral-500">
            Loading your prediction...
          </div>
        )}

        {data && !pred && data?.predictions?.length > 0 && (
          <div className="py-8 text-sm text-neutral-500">
            Loading your career recommendations...
          </div>
        )}

        {/* Empty state */}
        {data && !data?.predictions?.length && (
          <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-8 text-center">
            <h2 className="text-xl font-extrabold text-black">
              No predictions yet
            </h2>

            <p className="mt-2 text-sm text-neutral-600">
              Complete your assessment to see your top career matches.
            </p>

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
            {/* Personality and input panel */}
            <section
              className="flex min-w-0 flex-col items-center gap-5 rounded-3xl p-6 shadow-sm sm:p-8 md:flex-row md:gap-8"
              style={{ background: theme?.tint ?? '#cde6f6' }}
            >
              {theme && (
                <div className="w-36 shrink-0 sm:w-40">
                  <MbtiCharacter
                    code={mbti}
                    className="mx-auto w-full max-w-[160px]"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <Label className="text-[#245f8a]">
                  Inputs used for this prediction
                </Label>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2
                    className="text-4xl font-black leading-none tracking-tight sm:text-5xl"
                    style={{ color: theme?.dark ?? '#245f8a' }}
                  >
                    {mbti ? String(mbti).toUpperCase() : 'N/A'}
                  </h2>

                  {theme?.name && (
                    <span className="text-base font-extrabold text-black">
                      {theme.name}
                    </span>
                  )}
                </div>

                {theme?.blurb && (
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-800">
                    {theme.blurb}
                  </p>
                )}

                {preferredCareer && (
                  <p className="mt-2 break-words text-sm leading-relaxed text-neutral-800">
                    <span className="font-semibold">Preferred career:</span>{' '}
                    {text(preferredCareer)}
                  </p>
                )}

                {inputDescription && (
                  <p className="mt-2 break-words text-sm leading-relaxed text-neutral-800">
                    {text(inputDescription)}
                  </p>
                )}

                {profileSkills.length > 0 && (
                  <Chips
                    items={profileSkills}
                    className="border-white/80"
                  />
                )}
              </div>
            </section>

            {/* Split layout: left column and right career details */}
            {top.length > 0 && currentCareer && (
              <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[268px_minmax(0,1fr)]">
                {/* Left column */}
                <div className="flex min-w-0 flex-col gap-3">
                  {top.map((career, index) => {
                    const active = focus === index

                    return (
                      <button
                        key={`${career.title}-${index}`}
                        type="button"
                        onClick={() => setFocus(index)}
                        aria-pressed={active}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          active
                            ? 'border-[#0b0b2b] bg-white shadow-sm'
                            : 'border-[#e6d8c3] bg-[#fbf6ee] hover:border-[#aaa0bc]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RankBadge index={index} />

                          <span className="min-w-0 flex-1 break-words text-xs font-extrabold leading-tight text-black">
                            {career.title}
                          </span>

                          <span className="shrink-0 text-sm font-black text-black">
                            {pct(career)}%
                          </span>
                        </div>

                        <div className="mt-3">
                          <MatchBar
                            value={pct(career)}
                            color={RANK_COLORS[index]}
                          />
                        </div>

                        {selectedTitle === career.title && (
                          <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#2f9e62]">
                            Selected ✓
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {/* Roadmap card */}
                  <section className="flex min-w-0 flex-1 flex-col rounded-3xl bg-[#0b0b2b] p-5 text-white shadow-sm">
                    <Label className="text-[#8fb8ff]">
                      Your choice
                    </Label>

                    <h3 className="mt-1 break-words text-lg font-extrabold leading-snug">
                      {hasRoad
                        ? road.career.title
                        : selectedTitle || currentCareer.title}
                    </h3>

                    {hasRoad ? (
                      <>
                        <p className="mt-2 text-sm leading-relaxed text-white/65">
                          Ready to keep moving toward your goal?
                        </p>

                        <div className="mt-4 flex items-center gap-3">
                          <div
                            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: `conic-gradient(#5aa9ff ${progress * 3.6}deg, rgba(255,255,255,.16) 0deg)`,
                            }}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b0b2b] text-[10px] font-extrabold">
                              {progress}%
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold leading-relaxed">
                              {completedCount} of {steps.length} steps done
                            </div>

                            <div className="mt-1 break-words text-[10px] leading-relaxed text-white/60">
                              Estimated time:{' '}
                              {text(
                                road?.roadmap?.timeline?.estimatedTotal
                              ) || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white/10 p-3">
                          <Label className="text-white/50">
                            Next up
                          </Label>

                          <p className="mt-1 break-words text-sm leading-relaxed text-white">
                            {nextStep}
                          </p>
                        </div>

                        <Link
                          to="/dashboard/roadmap"
                          state={{ predictionId: pred.id }}
                          className="mt-auto flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide text-[#0b0b2b] transition hover:bg-[#e8e8ff] sm:mt-4"
                        >
                          View roadmap →
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-sm leading-relaxed text-white/65">
                          Select this career to see the steps needed to get there.
                        </p>

                        <button
                          type="button"
                          onClick={() => chooseCareer(currentCareer)}
                          disabled={busy}
                          className="mt-auto w-full rounded-full bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-wide text-[#0b0b2b] transition hover:bg-[#e8e8ff] disabled:opacity-60 sm:mt-5"
                        >
                          {busy ? 'Saving...' : 'View roadmap →'}
                        </button>
                      </>
                    )}
                  </section>
                </div>

                {/* Right column: selected career details */}
                <section className="flex h-full min-w-0 flex-col rounded-3xl border border-[#e6d8c3] bg-white p-5 shadow-sm sm:p-6">
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
                    <MatchBar
                      value={pct(currentCareer)}
                      color={RANK_COLORS[focus]}
                    />
                  </div>

                  {/* Why this fits */}
                  <div className="mt-5">
                    <Label className="text-[#2f80e0]">
                      Why this fits
                    </Label>

                    {reasons.length > 0 ? (
                      <ul className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        {reasons.map((reason, index) => (
                          <li
                            key={`${reason}-${index}`}
                            className="flex min-w-0 gap-2 text-[13px] leading-relaxed text-neutral-700"
                          >
                            <Check />
                            <span className="min-w-0 break-words">
                              {reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : fallbackReason ? (
                      <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                        {fallbackReason}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                        This recommendation is based on your assessment profile and career-match score.
                      </p>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div className="min-w-0">
                      <Label className="text-[#2f9e62]">
                        You already have
                      </Label>

                      {have.length > 0 ? (
                        <Chips
                          items={have}
                          className="border-[#bfe3cd]"
                        />
                      ) : (
                        <p className="mt-2 text-sm text-neutral-500">
                          No matching skills recorded yet.
                        </p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Label className="text-[#e0404a]">
                        Still to build
                      </Label>

                      {need.length > 0 ? (
                        <Chips
                          items={need}
                          className="border-[#f0c4c7]"
                        />
                      ) : (
                        <p className="mt-2 text-sm text-neutral-500">
                          You cover all listed key skills.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selection button */}
                  <div className="mt-auto pt-6">
                    <button
                      type="button"
                      onClick={() => chooseCareer(currentCareer)}
                      disabled={busy || isSelected}
                      className={`rounded-full px-5 py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-white transition ${
                        isSelected
                          ? 'cursor-default bg-[#6d6d80]'
                          : 'bg-[#0b0b2b] hover:bg-[#1a1a4a]'
                      } disabled:opacity-70`}
                    >
                      {isSelected
                        ? 'Selected ✓'
                        : busy
                          ? 'Saving...'
                          : 'Select this career'}
                    </button>
                  </div>
                </section>
              </section>
            )}

            {/* No recommendations */}
            {top.length === 0 && (
              <section className="rounded-3xl border border-[#e6d8c3] bg-white p-6">
                <h2 className="text-lg font-extrabold text-black">
                  No career recommendations available
                </h2>

                <p className="mt-2 text-sm text-neutral-600">
                  Your prediction was loaded, but it does not contain a list of recommended careers.
                </p>
              </section>
            )}

            {/* Careers to avoid: OUTSIDE the split grid */}
            <section className="mt-5 rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-extrabold text-black">
                Careers to avoid
              </h2>

              <p className="text-sm text-neutral-500">
                Fields that may be a weaker fit for this profile
              </p>

              {avoid.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">
                  No careers to avoid were flagged for this prediction.
                </p>
              ) : (
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {avoid.slice(0, 3).map((career, index) => {
                    const title = text(career)

                    const reason =
                      typeof career === 'object'
                        ? career.reason ??
                          career.description ??
                          career.why ??
                          ''
                        : ''

                    return (
                      <li
                        key={`${title}-${index}`}
                        className="min-w-0 rounded-2xl border border-[#f0c4c7] bg-white p-4"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e0404a]" />

                          <h3 className="break-words text-sm font-extrabold leading-snug text-black">
                            {title}
                          </h3>
                        </div>

                        <p className="mt-2 line-clamp-4 break-words text-xs leading-relaxed text-neutral-600">
                          {reason ||
                            'This career was identified as a potentially weaker match for your current profile.'}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Single footer */}
            <footer className="pb-4 text-[11px] leading-relaxed text-neutral-500">
              Suggestions are based on your personality type, skills, and
              education. Use them as a guide, not a rule.
            </footer>
          </>
        )}
      </div>
    </main>
  )
}

export default UserDashboard
