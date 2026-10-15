import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

/* Must match the key your login code and Navbar.jsx use */
const TOKEN_KEY = 'token'

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
  recommendations: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </Icon>
  ),
  roadmap: (
    <Icon>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.8" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  ),
  help: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
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
}

const NAV = [
  { to: '/dashboard/recommendations', label: 'Recommendations', icon: 'recommendations' },
  { to: '/dashboard/roadmap', label: 'Career roadmap', icon: 'roadmap' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
]

const itemCls = 'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition'

/* onNavigate: called after any link is clicked (UserLayout uses it to close the mobile drawer) */
const UserSideBar = ({ onNavigate }) => {
  const navigate = useNavigate()

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
    sessionStorage.clear()

    onNavigate?.()
    // replace: true so the Back button can't return to the dashboard
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <Link to="/" className="px-2 text-lg font-black tracking-tight text-black">
        CAREER MATCH
      </Link>

      <nav className="mt-10 space-y-1.5">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${itemCls} ${
                isActive
                  ? 'bg-[#0b0b2b] text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-[#0b0b2b]/5 hover:text-black'
              }`
            }
          >
            {ICONS[icon]}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-[#e6d8c3] bg-white/70 p-4 text-center">
        <p className="text-sm font-extrabold text-black">New prediction</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
          Changed your type or skills? Run the assessment again.
        </p>
        <Link
          to="/assessment-test"
          onClick={onNavigate}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0b0b2b] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          {ICONS.plus}
          Start
        </Link>
      </div>

      <div className="mt-6 space-y-1">
        <a href="mailto:support@careermatch.app" className={`${itemCls} text-neutral-500 hover:text-black`}>
          {ICONS.help}
          Help &amp; information
        </a>
        <button type="button" onClick={logout} className={`${itemCls} text-neutral-500 hover:text-black`}>
          {ICONS.logout}
          Log out
        </button>
      </div>
    </div>
  )
}

export default UserSideBar