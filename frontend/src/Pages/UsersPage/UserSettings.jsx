import React, { useState } from 'react'
import {
  getProfile,
  saveProfile,
  clearPredictions,
  resetRoadmapProgress,
  exportData,
} from '../../Data/settingsStore'

const MBTI = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

const inputCls =
  'w-full rounded-xl border border-[#e0d1ba] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0b0b2b] focus:ring-2 focus:ring-[#0b0b2b]/15'

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
  'rounded-full border border-[#d9c8ae] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b]'
const dangerBtn =
  'rounded-full border border-[#e0404a]/50 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-[#b0252e] transition hover:bg-[#e0404a] hover:text-white'

const UserSettings = () => {
  const [form, setForm] = useState(getProfile)
  const [notice, setNotice] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const flash = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2500)
  }

  const save = (e) => {
    e.preventDefault()
    saveProfile({ ...form, name: form.name.trim() || 'Student' })
    flash('Settings saved.')
  }

  const confirmThen = (message, action, done) => () => {
    if (window.confirm(message)) {
      action()
      flash(done)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Settings</h1>
        <p className="mt-1.5 text-sm text-neutral-600">Manage your profile, assessment defaults and data.</p>
      </header>

      {notice && (
        <div role="status" className="rounded-2xl border border-[#bfe3cd] bg-white px-4 py-3 text-sm font-semibold text-[#2f9e62]">
          ✓ {notice}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <Section title="Profile" desc="Your name is shown in the dashboard greeting.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-black">Name</label>
              <input id="name" value={form.name} onChange={set('name')} placeholder="Your name" className={`${inputCls} mt-2`} />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-black">Email</label>
              <input id="email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className={`${inputCls} mt-2`} />
            </div>
          </div>
        </Section>

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

        <div>
          <button
            type="submit"
            className="rounded-full bg-[#0b0b2b] px-8 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
          >
            Save changes
          </button>
        </div>
      </form>

      <Section title="Your data" desc="Everything is stored in this browser.">
        <div className="divide-y divide-[#e6d8c3]">
          <Row title="Export my data" desc="Download your profile, predictions and roadmap progress as a JSON file.">
            <button type="button" onClick={exportData} className={outlineBtn}>Export</button>
          </Row>
          <Row title="Reset roadmap progress" desc="Uncheck every completed step in all of your roadmaps.">
            <button
              type="button"
              onClick={confirmThen('Reset all roadmap progress?', resetRoadmapProgress, 'Roadmap progress reset.')}
              className={outlineBtn}
            >
              Reset
            </button>
          </Row>
          <Row title="Clear prediction history" desc="Deletes predictions you made. The sample predictions stay.">
            <button
              type="button"
              onClick={confirmThen('Delete all your saved predictions? This cannot be undone.', clearPredictions, 'Prediction history cleared.')}
              className={dangerBtn}
            >
              Clear
            </button>
          </Row>
        </div>
      </Section>

      <Section title="Account" desc="These need a backend, so they are placeholders for now.">
        <div className="divide-y divide-[#e6d8c3]">
          <Row title="Change password" desc="Connect this to your auth API once it exists.">
            <button type="button" disabled className={`${outlineBtn} cursor-not-allowed opacity-40`}>Change</button>
          </Row>
          <Row title="Delete account" desc="Permanently removes your account and all of your data.">
            <button type="button" disabled className={`${dangerBtn} cursor-not-allowed opacity-40`}>Delete</button>
          </Row>
        </div>
      </Section>
    </div>
  )
}

export default UserSettings