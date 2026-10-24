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
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

/* ---------- tiny inline icons (no icon library needed) ---------- */
const Icon = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-[18px] w-[18px] shrink-0"
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
    <Icon>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4h6v3" />
    </Icon>
  ),
}

const itemCls = 'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition'

/* ---------- one prediction card: link + tag + match bar + delete (with an inline "are you sure?") ---------- */
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
        className="rounded-2xl border border-[#f0c4c7] bg-[#fcecec] px-4 py-3.5"
      >
        <p className="text-sm font-extrabold text-black">Delete Prediction #{pred.number}?</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">
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
            className="flex-1 rounded-full border border-[#e0d1ba] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex-1 rounded-full bg-[#e0404a] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#c9343d] disabled:opacity-60"
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
          `block rounded-2xl border px-4 py-3.5 pr-11 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b0b2b]/40 ${
            isActive
              ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white'
              : 'border-[#e6d8c3] bg-[#fbf6ee] text-black hover:-translate-y-0.5 hover:border-[#0b0b2b]/40 hover:shadow-md'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-base font-extrabold leading-tight tracking-tight">Prediction #{pred.number}</span>
              {tag && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                    isActive ? 'bg-white/20' : isNew ? 'bg-[#2f9e62]' : 'bg-[#0b0b2b]'
                  }`}
                >
                  {tag}
                </span>
              )}
            </span>

            <span className={`mt-0.5 block text-sm font-semibold ${isActive ? 'text-white/70' : 'text-neutral-500'}`}>
              {fmtDate(pred.createdAt)}
            </span>

            {pred.topMatch && (
              <>
                <span className="mt-3 flex items-center justify-between gap-2">
                  <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${isActive ? 'text-white/85' : 'text-neutral-700'}`}>
                    {pred.topMatch.title}
                  </span>
                  <span className="shrink-0 text-sm font-black">{percent}%</span>
                </span>
                <span className={`mt-1.5 block h-1.5 overflow-hidden rounded-full ${isActive ? 'bg-white/20' : 'bg-[#e8dcc8]'}`}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${percent}%`, background: isActive ? '#5aa9ff' : '#2f80e0' }}
                  />
                </span>
              </>
            )}
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
      <div className="px-1 text-xs font-bold uppercase tracking-wide text-neutral-500">Your predictions</div>

      <nav
        aria-label="Your predictions"
        data-lenis-prevent
        className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
      >
        {items === null && !failed && <p className="px-1 text-sm text-neutral-500">Loading predictions...</p>}
        {items === null && failed && <p className="px-1 text-sm text-neutral-500">Couldn&apos;t load predictions.</p>}
        {items?.length === 0 && (
          <p className="px-1 text-sm leading-relaxed text-neutral-500">
            Nothing here yet. Start a new prediction to see your career matches.
          </p>
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
          className={`absolute inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col rounded-r-3xl bg-[#f3e7d6] px-5 py-6 shadow-2xl transition-[transform,visibility] duration-300 ease-in-out motion-reduce:transition-none ${
            open ? 'translate-x-0' : 'invisible -translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <Link to="/" onClick={handleNavigate} className="px-1 text-lg font-black tracking-tight text-black">
              CAREER MATCH
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Close sidebar"
              title="Close sidebar"
              className="rounded-full border border-[#d9c8ae] bg-white p-2 text-neutral-600 transition hover:border-[#0b0b2b] hover:text-black"
            >
              {ICONS.hide}
            </button>
          </div>

          <Link
            to="/assessment-test"
            onClick={handleNavigate}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b2b] px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1a1a4a]"
          >
            {ICONS.plus}
            New prediction
          </Link>

          {/* prediction cards: this part scrolls if there are many */}
          <PredictionList onNavigate={handleNavigate} />

          {/* settings + log out stay at the bottom */}
          <div className="mt-4 space-y-1 border-t border-[#e6d8c3] pt-3">
            <NavLink
              to="/dashboard/settings"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `${itemCls} ${
                  isActive
                    ? 'bg-[#0b0b2b] text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-white/70 hover:text-black'
                }`
              }
            >
              {ICONS.settings}
              Settings
            </NavLink>
            <button type="button" onClick={logout} className={`${itemCls} text-neutral-500 hover:bg-white/70 hover:text-black`}>
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