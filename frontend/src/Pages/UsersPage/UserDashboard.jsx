import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPredictions } from '../../api/predictions'
import { getStoredUser } from '../../api/session'

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const Stat = ({ icon, label, value, note, noteCls = 'text-neutral-500' }) => (
  <div className="flex flex-1 items-center gap-4 px-2 py-4 sm:px-6">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0b0b2b] shadow-sm">{icon}</span>
    <div>
      <p className="text-sm font-semibold text-neutral-600">{label}</p>
      <p className="text-2xl font-extrabold text-black">
        {value}
        {note && <span className={`ml-2 text-xs font-semibold ${noteCls}`}>{note}</span>}
      </p>
    </div>
  </div>
)

const HistoryCard = ({ pred, isLatest }) => {
  const diff = pred.change
  return (
    <Link
      to={`/dashboard/recommendations/${pred.id}`}
      className="group flex flex-col rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b0b2b]/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0b0b2b]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Prediction #{pred.number}</p>
          <h3 className="mt-1 text-lg font-extrabold text-black">{fmtDate(pred.createdAt)}</h3>
        </div>
        {isLatest && (
          <span className="rounded-full bg-[#0b0b2b] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Latest</span>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <p className="text-xs font-semibold text-neutral-500">Top match</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="font-extrabold leading-tight text-black">{pred.topMatch.title}</p>
          <p className="text-2xl font-black text-black">
            {pred.topMatch.percent}%
            {diff !== null && diff !== undefined && (
              <span className={`ml-1 text-xs font-semibold ${diff >= 0 ? 'text-[#2f9e62]' : 'text-[#e0404a]'}`}>
                {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}%
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {pred.mbti && <span className="rounded-full bg-[#0b0b2b] px-3 py-1 font-extrabold text-white">{pred.mbti}</span>}
        <span className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-neutral-600">
          {pred.skillCount} skills
        </span>
      </div>

      <span className="mt-5 text-xs font-bold uppercase tracking-wide text-[#0b0b2b] group-hover:underline">
        View top 3 careers →
      </span>
    </Link>
  )
}

const UserDashboard = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listPredictions()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = getStoredUser()?.name?.trim().split(' ')[0] || 'there'
  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  const stats = data?.stats
  const predictions = data?.predictions ?? []
  const change = stats?.latestChange

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Hello, {firstName}</h1>
          <p className="mt-1.5 text-sm text-neutral-600">Pick a past prediction to see your best-fit careers.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-semibold text-neutral-600 sm:block">{today}</span>
          <Link
            to="/assessment-test"
            className="rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
          >
            + New prediction
          </Link>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!data && !error && <p className="text-sm text-neutral-500">Loading your predictions...</p>}

      {data && predictions.length === 0 && (
        <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-8 text-center shadow-sm">
          <h2 className="text-xl font-extrabold text-black">No predictions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            Take the assessment once and your best-fit careers will show up here.
          </p>
          <Link
            to="/assessment"
            className="mt-5 inline-block rounded-full bg-[#0b0b2b] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
          >
            Start the assessment
          </Link>
        </div>
      )}

      {data && predictions.length > 0 && (
        <>
          <section className="flex flex-col divide-y divide-[#e0d1ba] border-y border-[#e0d1ba] sm:flex-row sm:divide-x sm:divide-y-0">
            <Stat
              label="Predictions"
              value={stats.total}
              icon={<Svg><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></Svg>}
            />
            <Stat
              label="Latest top match"
              value={`${stats.latestTopMatch}%`}
              note={change === null || change === undefined ? '' : `${change >= 0 ? '▲ +' : '▼ '}${change}%`}
              noteCls={change === null || change === undefined ? '' : change >= 0 ? 'text-[#2f9e62]' : 'text-[#e0404a]'}
              icon={<Svg><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /></Svg>}
            />
            <Stat
              label="Last prediction"
              value={fmtDate(stats.lastPredictionAt)}
              icon={<Svg><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></Svg>}
            />
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-extrabold text-black">Prediction history</h2>
              <p className="text-xs text-neutral-500">Each card is one time you ran the assessment</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {predictions.map((p, i) => (
                <HistoryCard key={p.id} pred={p} isLatest={i === 0} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default UserDashboard