import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetRoadmapProgress } from '../../Data/settingsStore'
import { getStoredUser } from '../../api/session'
import { changePassword, deleteAccount } from '../../api/auth'
import { listPredictions } from '../../api/predictions'
import PasswordChecklist, { isStrongPassword, PASSWORD_RULES_MESSAGE } from '../AuthPages/PasswordChecklist'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'

const inputCls =
  'w-full rounded-xl border border-[#e0d1ba] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0b0b2b] focus:ring-2 focus:ring-[#0b0b2b]/15 disabled:cursor-not-allowed disabled:bg-[#f3ece0] disabled:text-neutral-500'

const Section = ({ title, desc, children }) => (
  <section className="rounded-3xl bg-[#fbf6ee] p-5 shadow-sm sm:p-7">
    <h2 className="text-lg font-extrabold text-black">{title}</h2>
    {desc && <p className="mt-1 text-xs text-neutral-500">{desc}</p>}
    <div className="mt-5">{children}</div>
  </section>
)

const Row = ({ title, desc, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 py-3">
    <div className="max-w-md">
      <p className="text-sm font-bold text-black">{title}</p>
      <p className="text-xs text-neutral-500">{desc}</p>
    </div>
    {children}
  </div>
)

const outlineBtn =
  'rounded-full border border-[#d9c8ae] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b] disabled:cursor-not-allowed disabled:opacity-50'
const dangerBtn =
  'rounded-full border border-[#e0404a]/50 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-[#b0252e] transition hover:bg-[#e0404a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
const primaryBtn =
  'rounded-full bg-[#0b0b2b] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:opacity-50'

/* true on desktop widths, so only one character is mounted at a time
   (two copies would share the same SVG gradient ids and could break each other's glows) */
const useIsDesktop = () => {
  const q = '(min-width: 1024px)'
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const h = (e) => setM(e.matches)
    setM(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return m
}

/* desktop: sticky card in the right column */
const CharacterCard = ({ code, theme }) => (
  <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: theme.tint }}>
    <div className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.dark }}>
      {String(code).toUpperCase()} · {theme.name}
    </div>
    <MbtiCharacter code={code} className="mx-auto mt-3 w-[200px]" />
    <div className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-[13px] leading-snug text-neutral-800">{theme.blurb}</div>
  </div>
)

/* mobile: small character in the top right of the header, with a greeting bubble that fades away */
const HeaderCharacter = ({ code, theme }) => {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="pointer-events-none absolute right-0 top-0 z-10 flex flex-col items-end">
      <div className="rounded-full shadow-md" style={{ backgroundColor: theme.tint }}>
        <MbtiCharacter code={code} className="w-[72px]" />
      </div>
      <div
        role="status"
        aria-hidden={!show}
        className={`relative mt-2 max-w-[190px] rounded-2xl bg-white px-3 py-2 text-xs font-bold leading-snug text-black shadow-md transition-opacity duration-500 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Hi, I’m your {theme.name}!
        <span aria-hidden="true" className="absolute -top-[5px] right-8 h-3 w-3 rotate-45 bg-white" />
      </div>
    </div>
  )
}

const UserSettings = () => {
  const navigate = useNavigate()
  const user = getStoredUser()
  const isDesktop = useIsDesktop()

  const [notice, setNotice] = useState('')

  const [panel, setPanel] = useState(null) // null | 'password' | 'delete'
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [deletePw, setDeletePw] = useState('')
  const [panelError, setPanelError] = useState('')
  const [busy, setBusy] = useState(false)

  /* the character comes from the latest prediction; no prediction means no character */
  const [mbtiType, setMbtiType] = useState(null)

  useEffect(() => {
    let cancelled = false
    listPredictions()
      .then((d) => {
        if (!cancelled) setMbtiType(d.predictions?.[0]?.mbti ?? null)
      })
      .catch(() => {
        /* no prediction or the request failed: just no character */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const theme = mbtiTheme(mbtiType) // null when there is no prediction or the type is unknown

  const flash = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2500)
  }

  const openPanel = (name) => {
    setPanel((cur) => (cur === name ? null : name))
    setPanelError('')
    setPw({ current: '', next: '', confirm: '' })
    setDeletePw('')
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setPanelError('')
    if (pw.next === pw.current) return setPanelError('New password must be different from the current one.')
    if (!isStrongPassword(pw.next)) return setPanelError(PASSWORD_RULES_MESSAGE)
    if (pw.next !== pw.confirm) return setPanelError('Passwords do not match.')

    setBusy(true)
    try {
      await changePassword(pw.current, pw.next) // saves the fresh token for you
      setPanel(null)
      setPw({ current: '', next: '', confirm: '' })
      flash('Password updated.')
    } catch (err) {
      setPanelError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitDelete = async (e) => {
    e.preventDefault()
    setPanelError('')
    if (!window.confirm('Permanently delete your account and all of your predictions? This cannot be undone.')) return

    setBusy(true)
    try {
      await deleteAccount(deletePw)
      navigate('/', { replace: true })
    } catch (err) {
      setPanelError(err.message)
      setBusy(false)
    }
  }

  const resetProgress = () => {
    if (window.confirm('Reset all roadmap progress?')) {
      resetRoadmapProgress()
      flash('Roadmap progress reset.')
    }
  }

  const showMobileChar = theme && !isDesktop
  const showDesktopChar = theme && isDesktop

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-8">
      <div className="min-w-0 space-y-8">
        <header className="relative">
          <div className={showMobileChar ? 'pr-24' : ''}>
            <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Settings</h1>
            <p className="mt-1.5 text-sm text-neutral-600">Manage your profile and account.</p>
          </div>

          {/* mobile: small character top right with a greeting bubble */}
          {showMobileChar && <HeaderCharacter code={mbtiType} theme={theme} />}
        </header>

        {notice && (
          <div role="status" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#2f9e62] shadow-sm">
            ✓ {notice}
          </div>
        )}

        <Section title="Profile" desc="The account you signed up with.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-black">Name</label>
              <input id="name" value={user?.name || ''} disabled className={`${inputCls} mt-2`} />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-black">Email</label>
              <input id="email" value={user?.email || ''} disabled className={`${inputCls} mt-2`} />
            </div>
          </div>
        </Section>

        <Section title="Your data" desc="Roadmap checklists are stored in this browser.">
          <div className="divide-y divide-[#e6d8c3]">
            <Row title="Reset roadmap progress" desc="Uncheck every completed step in all of your roadmaps.">
              <button type="button" onClick={resetProgress} className={outlineBtn}>Reset</button>
            </Row>
          </div>
        </Section>

        <Section title="Account" desc="Security and account removal.">
          <div className="divide-y divide-[#e6d8c3]">
            <Row title="Change password" desc="You will stay signed in on this device.">
              <button type="button" onClick={() => openPanel('password')} className={outlineBtn}>
                {panel === 'password' ? 'Cancel' : 'Change'}
              </button>
            </Row>

            {panel === 'password' && (
              <form onSubmit={submitPassword} className="space-y-4 py-4">
                <div>
                  <label htmlFor="cur" className="block text-xs font-bold text-black">Current password</label>
                  <input id="cur" type="password" autoComplete="current-password" required value={pw.current}
                    onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className={`${inputCls} mt-2`} />
                </div>
                <div>
                  <label htmlFor="new" className="block text-xs font-bold text-black">New password</label>
                  <input id="new" type="password" autoComplete="new-password" required value={pw.next}
                    onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className={`${inputCls} mt-2`} />
                  <div className="mt-2">
                    <PasswordChecklist password={pw.next} />
                  </div>
                </div>
                <div>
                  <label htmlFor="conf" className="block text-xs font-bold text-black">Confirm new password</label>
                  <input id="conf" type="password" autoComplete="new-password" required value={pw.confirm}
                    onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} className={`${inputCls} mt-2`} />
                </div>
                {panelError && (
                  <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{panelError}</div>
                )}
                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Updating...' : 'Update password'}</button>
              </form>
            )}

            <Row title="Delete account" desc="Permanently removes your account and all of your predictions.">
              <button type="button" onClick={() => openPanel('delete')} className={dangerBtn}>
                {panel === 'delete' ? 'Cancel' : 'Delete'}
              </button>
            </Row>

            {panel === 'delete' && (
              <form onSubmit={submitDelete} className="space-y-4 py-4">
                <div>
                  <label htmlFor="delpw" className="block text-xs font-bold text-black">Enter your password to confirm</label>
                  <input id="delpw" type="password" autoComplete="current-password" required value={deletePw}
                    onChange={(e) => setDeletePw(e.target.value)} className={`${inputCls} mt-2`} />
                </div>
                {panelError && (
                  <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{panelError}</div>
                )}
                <button type="submit" disabled={busy} className={dangerBtn}>{busy ? 'Deleting...' : 'Delete my account'}</button>
              </form>
            )}
          </div>
        </Section>
      </div>

      {/* desktop: sticky character card in the right column */}
      {showDesktopChar && (
        <aside className="sticky top-6 min-w-0">
          <CharacterCard code={mbtiType} theme={theme} />
        </aside>
      )}
    </div>
  )
}

export default UserSettings