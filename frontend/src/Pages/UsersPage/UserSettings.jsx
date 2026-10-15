import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, saveProfile, resetRoadmapProgress } from '../../Data/settingsStore'
import { getStoredUser } from '../../api/session'
import { changePassword, deleteAccount } from '../../api/auth'
import PasswordChecklist, { isStrongPassword, PASSWORD_RULES_MESSAGE } from '../AuthPages/PasswordChecklist'

const MBTI = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

const inputCls =
  'w-full rounded-xl border border-[#e0d1ba] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0b0b2b] focus:ring-2 focus:ring-[#0b0b2b]/15 disabled:cursor-not-allowed disabled:bg-[#f3ece0] disabled:text-neutral-500'

const Section = ({ title, desc, children }) => (
  <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:p-7">
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

const UserSettings = () => {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [form, setForm] = useState(() => {
    const p = getProfile()
    return { mbti: p.mbti || '', degree: p.degree || '' }
  })
  const [notice, setNotice] = useState('')

  const [panel, setPanel] = useState(null) // null | 'password' | 'delete'
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [deletePw, setDeletePw] = useState('')
  const [panelError, setPanelError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

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

  const save = (e) => {
    e.preventDefault()
    saveProfile({ ...getProfile(), mbti: form.mbti, degree: form.degree.trim() })
    flash('Settings saved.')
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Settings</h1>
        <p className="mt-1.5 text-sm text-neutral-600">Manage your profile, assessment defaults and account.</p>
      </header>

      {notice && (
        <div role="status" className="rounded-2xl border border-[#bfe3cd] bg-white px-4 py-3 text-sm font-semibold text-[#2f9e62]">
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

      <form onSubmit={save} className="space-y-6">
        <Section title="Assessment defaults" desc="Pre-fills the assessment form so you can skip the first steps next time.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mbti" className="block text-xs font-bold text-black">MBTI personality type</label>
              <select id="mbti" value={form.mbti} onChange={set('mbti')} className={`${inputCls} mt-2`}>
                <option value="">Not set</option>
                {MBTI.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="degree" className="block text-xs font-bold text-black">Degree program</label>
              <input id="degree" value={form.degree} onChange={set('degree')} placeholder="e.g BS in Computer Science" className={`${inputCls} mt-2`} />
            </div>
          </div>
        </Section>

        <button type="submit" className={primaryBtn}>Save changes</button>
      </form>

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
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{panelError}</div>
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
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{panelError}</div>
              )}
              <button type="submit" disabled={busy} className={dangerBtn}>{busy ? 'Deleting...' : 'Delete my account'}</button>
            </form>
          )}
        </div>
      </Section>
    </div>
  )
}

export default UserSettings