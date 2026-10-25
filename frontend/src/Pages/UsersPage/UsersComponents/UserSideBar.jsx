import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CiMenuKebab } from 'react-icons/ci'
/* This file lives in Pages/UsersPage/UsersComponents, so the api folder is three levels up.
   If your api folder is somewhere else, change this path. */
import { listPredictions, deletePrediction } from '../../../api/predictions'

/* Must match the key your login code and Navbar.jsx use */
const TOKEN_KEY = 'token'

/* Remembers which predictions the user has already opened (so "New" disappears after viewing) */
const SEEN_KEY = 'seen-predictions'
const DAY = 24 * 60 * 60 * 1000

/* The latest prediction is what the dashboard shows, so its card opens the dashboard.
   Older predictions still open their own page. */
const DASHBOARD = '/dashboard'
const OLDER = (id) => `/dashboard/recommendations/${id}`

const readSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
const writeSeen = (set) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set]))
  } catch {
    // storage unavailable, "New" just won't be remembered
  }
}

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

/* ---------- tiny inline icons (no icon library needed) ---------- */
const Icon = ({ children, className = 'h-[18px] w-[18px]' }) => (
  <svg
    viewBox="0 0 24 24"
    className={`${className} shrink-0`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const ICONS = {
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  ),
  logout: (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  ),
  plus: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  hide: (
    <Icon>
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </Icon>
  ),
  trash: (
    <Icon className="h-4 w-4">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4h6v3" />
    </Icon>
  ),
  flag: (
    <Icon className="h-5 w-5">
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </Icon>
  ),
  empty: (
    <Icon className="h-6 w-6">
      <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
      <path d="M3 7l9 4 9-4M12 11v10" />
    </Icon>
  ),
}

const itemCls =
  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b0b2b]/40'

/* ---------- circular match meter ---------- */
const MatchRing = ({ percent, active }) => {
  const R = 18
  const C = 2 * Math.PI * R
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={R} fill="none" strokeWidth="4" stroke={active ? 'rgba(255,255,255,.2)' : '#e8dcc8'} />
        <circle
          cx="22"
          cy="22"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke={active ? '#5aa9ff' : '#2f80e0'}
          strokeDasharray={C}
          strokeDashoffset={C - (percent / 100) * C}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <span className="relative text-[11px] font-black">{percent}%</span>
    </span>
  )
}

/* ---------- one prediction card: link + tag + match ring + delete (with an inline "are you sure?") ---------- */
const PredictionCard = ({ pred, isLatest, isNew, onNavigate, onDeleted }) => {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const tag = isNew ? 'New' : isLatest ? 'Latest' : null
  const percent = clampPct(pred.topMatch?.percent)

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await deletePrediction(pred.id)
      onDeleted(pred.id) // the card disappears, so no need to reset busy
    } catch (e) {
      console.error('Delete failed:', e?.response?.status, e?.response?.data || e)
      setError(
        e?.response?.data?.message ||
          (e?.response ? 'Could not delete. Please try again.' : 'Could not reach the server (check CORS / backend is running).')
      )
      setBusy(false)
    }
  }

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-label={`Delete prediction ${pred.number}`}
        className="rounded-2xl border border-[#f0c4c7] bg-[#fcecec] p-4"
      >
        <p className="text-sm font-extrabold text-black">Delete Prediction #{pred.number}?</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          This removes it and its careers for good. You can&apos;t undo this.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirming(false)
              setError('')
            }}
            disabled={busy}
            className="flex-1 rounded-full border border-[#e0d1ba] bg-white px-3 py-2 text-xs font-bold text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex-1 rounded-full bg-[#e0404a] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#c9343d] disabled:opacity-60"
          >
            {busy ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs font-semibold text-[#e0404a]">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="group relative">
      <NavLink
        to={isLatest ? DASHBOARD : OLDER(pred.id)}
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-2xl border p-3 pr-11 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b0b2b]/40 ${
            isActive
              ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white shadow-md'
              : 'border-[#e6d8c3] bg-white/70 text-black hover:border-[#0b0b2b]/40 hover:bg-white hover:shadow-sm'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {pred.topMatch ? (
              <MatchRing percent={percent} active={isActive} />
            ) : (
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  isActive ? 'bg-white/15' : 'bg-[#f3e7d6]'
                }`}
                aria-hidden="true"
              >
                #{pred.number}
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-extrabold leading-tight">Prediction #{pred.number}</span>
                {tag && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none text-white ${
                      isActive ? 'bg-white/20' : isNew ? 'bg-[#2f9e62]' : 'bg-[#0b0b2b]'
                    }`}
                  >
                    {tag}
                  </span>
                )}
              </span>
              {pred.topMatch && (
                <span className={`mt-0.5 block truncate text-xs font-semibold ${isActive ? 'text-white/85' : 'text-neutral-700'}`}>
                  {pred.topMatch.title}
                </span>
              )}
              <span className={`mt-0.5 block text-[11px] font-semibold ${isActive ? 'text-white/60' : 'text-neutral-500'}`}>
                {fmtDate(pred.createdAt)}
              </span>
            </span>
          </>
        )}
      </NavLink>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete prediction ${pred.number}`}
        title="Delete"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-[#e0404a]/15 hover:text-[#e0404a] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0404a]/50 lg:opacity-0 lg:group-hover:opacity-100"
      >
        {ICONS.trash}
      </button>
    </div>
  )
}

/* placeholder cards while the list loads */
const SkeletonCard = () => (
  <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-[#e6d8c3] bg-white/50 p-3 motion-reduce:animate-none">
    <span className="h-12 w-12 shrink-0 rounded-full bg-[#e8dcc8]" />
    <span className="min-w-0 flex-1 space-y-2">
      <span className="block h-3 w-3/5 rounded-full bg-[#e8dcc8]" />
      <span className="block h-2.5 w-4/5 rounded-full bg-[#efe4d2]" />
    </span>
  </div>
)

/* ---------- the list of past predictions ---------- */
const PredictionList = ({ onNavigate }) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [seen, setSeen] = useState(readSeen)

  const onDashboard = pathname === DASHBOARD || pathname === `${DASHBOARD}/`
  const pathId = pathname.split('/').pop()
  /* the prediction currently on screen: the latest one on the dashboard, otherwise the one in the URL */
  const viewedId = onDashboard ? items?.[0]?.id : pathId

  /* reload on every page change, and whenever something announces "predictions-changed" */
  useEffect(() => {
    let cancelled = false
    listPredictions()
      .then((d) => {
        if (cancelled) return
        setItems(d?.predictions ?? [])
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [pathname, reloadKey])

  useEffect(() => {
    const onChanged = () => setReloadKey((k) => k + 1)
    window.addEventListener('predictions-changed', onChanged)
    return () => window.removeEventListener('predictions-changed', onChanged)
  }, [])

  /* opening a prediction marks it as seen, so its "New" tag goes away */
  useEffect(() => {
    if (!viewedId || !items?.some((p) => p.id === viewedId)) return
    setSeen((s) => {
      if (s.has(viewedId)) return s
      const next = new Set(s)
      next.add(viewedId)
      writeSeen(next)
      return next
    })
  }, [viewedId, items])

  const handleDeleted = (id) => {
    setItems((list) => (list ? list.filter((p) => p.id !== id) : list))
    window.dispatchEvent(new Event('predictions-changed')) // refreshes numbers here and on the dashboard
    if (id === viewedId && !onDashboard) navigate(DASHBOARD) // you were viewing it, so go back
  }

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-extrabold text-black">Your predictions</h2>
        {items?.length > 0 && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-neutral-600 ring-1 ring-[#e6d8c3]">
            {items.length}
          </span>
        )}
      </div>

      <nav
        aria-label="Your predictions"
        data-lenis-prevent
        className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-0.5 py-1 pr-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d9c8ae transparent',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 8px, #000 calc(100% - 16px), transparent)',
          maskImage: 'linear-gradient(to bottom, transparent, #000 8px, #000 calc(100% - 16px), transparent)',
        }}
      >
        {items === null && !failed && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {items === null && failed && (
          <div className="rounded-2xl border border-dashed border-[#d9c8ae] px-4 py-5 text-center">
            <p className="text-sm font-bold text-black">Couldn&apos;t load predictions</p>
            <button
              type="button"
              onClick={() => {
                setFailed(false)
                setReloadKey((k) => k + 1)
              }}
              className="mt-2 rounded-full border border-[#d9c8ae] bg-white px-4 py-1.5 text-xs font-bold text-neutral-700 transition hover:border-[#0b0b2b]"
            >
              Try again
            </button>
          </div>
        )}

        {items?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#d9c8ae] px-4 py-6 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-500 ring-1 ring-[#e6d8c3]">
              {ICONS.empty}
            </span>
            <p className="mt-3 text-sm font-bold text-black">No predictions yet</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Start a new prediction to see your career matches here.
            </p>
          </div>
        )}

        {items?.map((p, i) => (
          <PredictionCard
            key={p.id}
            pred={p}
            isLatest={i === 0}
            isNew={!seen.has(p.id) && Date.now() - new Date(p.createdAt).getTime() < DAY}
            onNavigate={onNavigate}
            onDeleted={handleDeleted}
          />
        ))}
      </nav>
    </div>
  )
}

/*
  The whole sidebar is self-contained:
  - closed by default
  - the triple-dot button (top-left) opens it as an overlay on top of the page
  - while it is open, the page behind it cannot scroll
  - click the dark backdrop, press Esc, press the hide button, or navigate = it closes
  Just render <UserSideBar /> once in UserLayout, no props needed.
*/
const UserSideBar = ({ onNavigate }) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false) // closed by default

  const close = () => setOpen(false)

  /* close whenever you navigate somewhere */
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  /* while open: lock the page scroll behind it, and Esc closes */
  useEffect(() => {
    if (!open) return
    const body = document.body
    const html = document.documentElement
    const prev = { b: body.style.overflow, h: html.style.overflow, p: body.style.paddingRight }
    const scrollbar = window.innerWidth - html.clientWidth

    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px` // stops the page from jumping sideways

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      body.style.overflow = prev.b
      html.style.overflow = prev.h
      body.style.paddingRight = prev.p
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleNavigate = () => {
    onNavigate?.()
    close()
  }

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY)

    // Best effort: tell the backend to revoke the token.
    // Adjust the URL to your real logout route, or delete this block if you have none.
    try {
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } catch {
      // ignore network errors, we still log out locally
    }

    // Clear everything auth-related on the client
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('user') // remove if you don't store this
    localStorage.removeItem('selectedCareer')
    sessionStorage.clear()

    close()
    // replace: true so the Back button can't return to the dashboard
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* the triple-dot button: visible while the sidebar is closed */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open sidebar"
        aria-expanded={open}
        title="Open sidebar"
        tabIndex={open ? -1 : 0}
        className={`fixed left-5 top-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0b0b2b] text-white shadow-lg ring-4 ring-white/70 transition duration-300 hover:scale-110 hover:bg-[#1a1a4a] focus-visible:outline-none focus-visible:ring-[#2f80e0] motion-reduce:transition-none ${
          open ? 'pointer-events-none scale-50 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <CiMenuKebab className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* overlay: sits on top of the page, so nothing behind it can scroll */}
      <div
        data-lenis-prevent
        aria-hidden={!open}
        className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      >
        {/* dark backdrop, click to close */}
        <div
          onClick={close}
          className={`absolute inset-0 bg-[#0b0b2b]/50 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar"
          className={`absolute inset-y-0 left-0 flex w-[21rem] max-w-[90vw] flex-col rounded-r-[2rem] bg-gradient-to-b from-[#f8eedf] to-[#f3e7d6] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl transition-[transform,visibility] duration-300 ease-in-out motion-reduce:transition-none ${
            open ? 'translate-x-0' : 'invisible -translate-x-full'
          }`}
        >
          {/* brand + close */}
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              onClick={handleNavigate}
              className="flex min-w-0 items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b0b2b]/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b0b2b] text-white shadow-sm">
                {ICONS.flag}
              </span>
              <span className="truncate text-lg font-black tracking-tight text-black">Career Match</span>
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Close sidebar"
              title="Close sidebar"
              className="rounded-full border border-[#d9c8ae] bg-white p-2 text-neutral-600 transition hover:border-[#0b0b2b] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b0b2b]/40"
            >
              {ICONS.hide}
            </button>
          </div>

          <Link
            to="/assessment-test"
            onClick={handleNavigate}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b0b2b] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-[#1a1a4a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f80e0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3e7d6]"
          >
            {ICONS.plus}
            New prediction
          </Link>

          {/* prediction cards: this part scrolls if there are many */}
          <PredictionList onNavigate={handleNavigate} />

          {/* settings + log out stay at the bottom */}
          <div className="mt-3 space-y-1 border-t border-[#e6d8c3] pt-3">
            <NavLink
              to="/dashboard/settings"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `${itemCls} ${
                  isActive
                    ? 'bg-[#0b0b2b] text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-white/80 hover:text-black'
                }`
              }
            >
              {ICONS.settings}
              Settings
            </NavLink>
            <button
              type="button"
              onClick={logout}
              className={`${itemCls} text-neutral-600 hover:bg-[#fcecec] hover:text-[#e0404a]`}
            >
              {ICONS.logout}
              Log out
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}

export default UserSideBar