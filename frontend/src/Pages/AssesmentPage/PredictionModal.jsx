import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import MbtiCharacter, { mbtiTheme, TYPES } from '../UsersPage//UsersComponents/MbtiCharacter' // adjust the path to where the character lives

/* the character pops in, then floats gently; both are switched off for people who prefer reduced motion */
const CHARACTER_CSS = `
@keyframes pw-pop { 0% { opacity: 0; transform: scale(.55) translateY(16px); } 60% { transform: scale(1.08) translateY(0); } 100% { opacity: 1; transform: none; } }
@keyframes pw-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes pw-glow { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: .7; transform: scale(1.12); } }
@keyframes pw-rise { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  .pw-pop { animation: pw-pop .8s cubic-bezier(.2,.8,.2,1) .5s both; }
  .pw-float { animation: pw-float 3.6s ease-in-out 1.3s infinite; }
  .pw-glow { animation: pw-glow 3.6s ease-in-out infinite; }
  .pw-rise { animation: pw-rise .3s ease-out both; }
}
`

const RANK_COLORS = ['#2f80e0', '#f2c230', '#e0404a']
const RANK_TEXT = ['#fff', '#0b0b2b', '#fff']
const RANK_LABEL = ['Best match', 'Second match', 'Third match']
/* podium (3 careers): #1 in the middle, #2 on the left, #3 on the right (DOM stays in rank order for keyboard users).
   With 1 or 2 careers the columns simply stay in rank order. */
const RANK_ORDER = ['order-2', 'order-1', 'order-3']
/* bar heights in px, tallest for the best match, like the loading animation's staircase */
const BAR_H = [150, 120, 96]

const CONFETTI_COLORS = ['#2f80e0', '#f2c230', '#e0404a', '#e8832a', '#6b7a99']
const CONFETTI_COUNT = 30
const LETTER_POOL = 'ISTJENFP'
const DEFAULT_MAX_REDOS = 5

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const list = (v) => (Array.isArray(v) ? v : [])
const text = (x) =>
  typeof x === 'string' ? x : x?.title ?? x?.name ?? x?.text ?? x?.reason ?? x?.label ?? x?.description ?? ''

const pct = (c) => {
  const value = Number(c?.matchPercent ?? c?.percent ?? c?.score ?? 0)
  return Math.max(0, Math.min(100, Math.round(value)))
}

const fmtDate = (date) => {
  const d = date ? new Date(date) : new Date()
  return (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/* some reasons arrive as "Skills you already have: A, B, C." — turn those into proper skill lists */
const HAVE = /^skills you already have:\s*/i
const TODO = /^skills to work on:\s*/i
const parseSkills = (s) =>
  s
    .replace(HAVE, '')
    .replace(TODO, '')
    .replace(/\.\s*$/, '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

const careerParts = (c) => {
  const reasons = list(c?.reasons ?? c?.whyFit).map(text).filter(Boolean)

  const haveText = reasons.find((r) => HAVE.test(r))
  const todoText = reasons.find((r) => TODO.test(r))

  const have = list(c?.skillsHave).map(text).filter(Boolean)
  const need = list(c?.skillsToBuild).map(text).filter(Boolean)

  return {
    why: reasons.filter((r) => !HAVE.test(r) && !TODO.test(r)),
    have: have.length ? have : haveText ? parseSkills(haveText) : [],
    need: need.length ? need : todoText ? parseSkills(todoText) : [],
  }
}

const SkillBlock = ({ label, items, tone }) => {
  const shown = items.slice(0, 6)
  const rest = items.length - shown.length
  const styles =
    tone === 'good'
      ? { bg: '#eaf6ef', label: '#2f9e62' }
      : { bg: '#fcecec', label: '#e0404a' }

  return (
    <div className="min-w-0 rounded-2xl p-4" style={{ background: styles.bg }}>
      <div className="text-sm font-extrabold" style={{ color: styles.label }}>
        {label}
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <li
            key={s}
            className="pw-chip max-w-full break-words rounded-full bg-white px-2.5 py-1 text-xs leading-4 text-neutral-700 shadow-sm"
          >
            {s}
          </li>
        ))}
        {rest > 0 && <li className="px-1 py-1 text-xs text-neutral-500">+{rest} more</li>}
      </ul>
    </div>
  )
}

/*
  Props
  - pred:  the saved prediction from the API ({ id, recommended: [...], createdAt, redoCount, maxRedos })
  - input: what the user submitted ({ mbti, degree, skills })
  - busy / error: state while saving the chosen career (error also shows redo errors)
  - onRedo / redoing: "No, show me different careers". The parent swaps `pred` and changes this
    component's `key`, so the opening animation replays with the new careers.
  - onClose, onViewRoadmap(title), onViewDashboard

  Layout: the top 3 matches stand on a podium (#1 in the middle, tallest), the chosen career's
  details sit on a card underneath, then the "Are you satisfied?" row.

  Opening sequence (anime.js), roughly in this order:
  modal scales in -> left panel wipes open -> ring draws, type letters roll -> podium bars grow from #3 to #1
  -> confetti bursts above #1 -> the detail card builds itself (checks draw, chips pop in).
  Tapping another career replays the detail build and regrows that bar.
*/
const PredictionModal = ({
  pred,
  input,
  busy = false,
  error = '',
  onRedo,
  redoing = false,
  onClose,
  onViewRoadmap,
  onViewDashboard,
}) => {
  const careers = list(pred?.recommended).slice(0, 3)
  const skills = list(input?.skills)
  const theme = input?.mbti ? mbtiTheme(input.mbti) : null
  const code = input?.mbti ? String(input.mbti).toUpperCase() : ''

  /* the best match is picked to start with; tap a column to switch */
  const [selected, setSelected] = useState(() => careers[0]?.title ?? null)
  const index = Math.max(0, careers.findIndex((c) => c.title === selected))
  const current = careers[index] ?? null
  const parts = current ? careerParts(current) : { why: [], have: [], need: [] }

  /* "Are you satisfied?": yes collapses the row into a confirmation; no asks the parent for different careers */
  const [happy, setHappy] = useState(false)
  const locked = busy || redoing
  const maxRedos = Number(pred?.maxRedos) || DEFAULT_MAX_REDOS
  const redosLeft = Math.max(0, maxRedos - (Number(pred?.redoCount) || 0))
  const canRedo = typeof onRedo === 'function' && redosLeft > 0

  /* podium shape: 3 careers use the podium order, 1 or 2 stay in rank order and centered */
  const n3 = careers.length === 3
  const gridCls = n3
    ? 'grid-cols-3'
    : careers.length === 2
    ? 'mx-auto max-w-md grid-cols-2'
    : 'mx-auto max-w-[180px] grid-cols-1'

  /* motion is decided once, so elements that animate in start hidden instead of flashing */
  const [motion] = useState(() => !reducedMotion())
  const [shown, setShown] = useState(() => reducedMotion()) // the detail card is revealed after the countdown
  const hid = motion ? { opacity: 0 } : undefined

  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const charRef = useRef(null)
  const detailRef = useRef(null)
  const firstDetail = useRef(true)

  /* close on Escape + lock page scroll while open */
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !locked && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, locked])

  /* ---- the opening sequence ---- */
  useLayoutEffect(() => {
    if (!motion || !rootRef.current) return undefined
    const root = rootRef.current
    const q = (sel) => Array.from(root.querySelectorAll(sel))
    const anims = []
    const timers = []
    const add = (a) => {
      anims.push(a)
      return a
    }
    const later = (fn, ms) => timers.push(setTimeout(fn, ms))
    const rand = (min, max) => min + Math.random() * (max - min)

    /* backdrop and modal */
    add(animate(q('.pw-backdrop'), { opacity: [0, 1], duration: 400, ease: 'outQuad' }))
    add(
      animate(panelRef.current, {
        opacity: [0, 1],
        scale: [0.92, 1],
        translateY: [24, 0],
        duration: 550,
        ease: 'outQuart',
      })
    )

    /* left panel wipes open */
    const aside = q('.pw-aside')
    if (aside.length) {
      add(
        animate(aside, {
          clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
          opacity: [0, 1],
          duration: 800,
          delay: 100,
          ease: 'outQuart',
        })
      )
    }

    /* heading lines rise */
    add(animate(q('.pw-head'), { opacity: [0, 1], translateY: [16, 0], duration: 500, delay: stagger(90, { start: 450 }), ease: 'outQuad' }))

    /* the ring draws itself, the type's own segment lands last */
    const ringSvg = charRef.current?.querySelector('svg')
    const ring = ringSvg ? Array.from(ringSvg.querySelectorAll('path')) : []
    if (ring.length) {
      const own = TYPES.findIndex(([c]) => c === code)
      ring.forEach((p) => {
        p.setAttribute('pathLength', '1')
        p.style.strokeDasharray = '1'
        p.style.strokeDashoffset = '1'
      })
      add(
        animate(ring, {
          strokeDashoffset: [1, 0],
          duration: 450,
          ease: 'outQuad',
          delay: (el, k) => {
            const rank = k === own ? ring.length - 1 : k < own ? k : k - 1
            return 700 + rank * 70 + (k === own ? 250 : 0)
          },
        })
      )
    }

    /* the type letters spin like a slot machine and settle one by one */
    const letters = q('.pw-letter')
    if (letters.length) {
      const finals = letters.map((l) => l.dataset.ch)
      const st = { p: 0 }
      let lastFrame = -1
      letters.forEach((l) => {
        l.textContent = LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]
      })
      add(
        animate(st, {
          p: 1,
          duration: 1300,
          delay: 600,
          ease: 'linear',
          onUpdate: () => {
            const frame = Math.floor(st.p * 26)
            letters.forEach((l, i) => {
              if (st.p >= 0.4 + i * 0.16) {
                if (l.textContent !== finals[i]) l.textContent = finals[i]
              } else if (frame !== lastFrame) {
                l.textContent = LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]
              }
            })
            lastFrame = frame
          },
          onComplete: () => letters.forEach((l, i) => (l.textContent = finals[i])),
        })
      )
    }

    /* podium columns rise from the last place up to #1: bars grow, percentages count up */
    const cols = q('.pw-row')
    const n = cols.length
    const BASE = 1000
    const STEP = 420
    const delayOf = (i) => BASE + (n - 1 - i) * STEP

    cols.forEach((col, i) => {
      const d = delayOf(i)
      const target = Number(col.dataset.pct || 0)
      const pctEl = col.querySelector('.pw-pct')
      const bar = col.querySelector('.pw-bar-fill')

      add(
        animate(col, {
          opacity: [0, 1],
          translateY: [30, 0],
          duration: 500,
          delay: d,
          ease: 'outQuad',
        })
      )
      if (bar) add(animate(bar, { height: ['0px', `${BAR_H[i]}px`], duration: 900, delay: d, ease: 'outQuart' }))
      if (pctEl) {
        const st = { v: 0 }
        add(
          animate(st, {
            v: target,
            duration: 900,
            delay: d,
            ease: 'outQuad',
            onUpdate: () => {
              pctEl.textContent = `${Math.round(st.v)}%`
            },
            onComplete: () => {
              pctEl.textContent = `${target}%`
            },
          })
        )
      }
    })

    /* the #1 column finishes last: badge spin, light sweep, confetti */
    if (n > 0) {
      const top = delayOf(0)
      const badge = cols[0].querySelector('.pw-badge')
      const shimmer = cols[0].querySelector('.pw-shimmer')
      const pieces = q('.pw-conf')

      if (badge) add(animate(badge, { rotate: [0, 360], scale: [1, 1.35, 1], duration: 750, delay: top + 500, ease: 'outBack' }))
      if (shimmer) {
        add(animate(shimmer, { translateX: ['-120%', '420%'], opacity: [0, 1, 0], duration: 900, delay: top + 900, ease: 'inOutSine' }))
      }
      if (pieces.length) {
        pieces.forEach((el) => {
          el.style.transform = 'none'
        })
        add(
          animate(pieces, {
            translateX: () => rand(-150, 150),
            translateY: () => rand(-170, 70),
            rotate: () => rand(-300, 300),
            opacity: [1, 0],
            duration: 1700,
            delay: stagger(14, { start: top + 700 }),
            ease: 'outQuad',
          })
        )
      }

      /* then reveal the detail card */
      later(() => setShown(true), top + 1100)
    } else {
      setShown(true)
    }

    return () => {
      timers.forEach(clearTimeout)
      anims.forEach((a) => a.pause?.())
    }
    // the sequence plays once, when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- the detail card builds itself, on reveal and every time another career is chosen ---- */
  useLayoutEffect(() => {
    if (!motion || !shown || !detailRef.current) return undefined
    const card = detailRef.current
    const qs = (sel) => Array.from(card.querySelectorAll(sel))
    const anims = []

    const checks = qs('.pw-check path')
    checks.forEach((p) => {
      p.setAttribute('pathLength', '1')
      p.style.strokeDasharray = '1'
      p.style.strokeDashoffset = '1'
    })
    if (checks.length) {
      anims.push(animate(checks, { strokeDashoffset: [1, 0], duration: 450, delay: stagger(160, { start: 150 }), ease: 'outQuad' }))
    }

    const whys = qs('.pw-why')
    if (whys.length) {
      anims.push(animate(whys, { opacity: [0, 1], translateX: [-14, 0], duration: 420, delay: stagger(160), ease: 'outQuad' }))
    }

    const chips = qs('.pw-chip')
    if (chips.length) {
      anims.push(animate(chips, { opacity: [0, 1], scale: [0.3, 1], duration: 420, delay: stagger(40, { start: 250 }), ease: 'outBack' }))
    }

    /* the chosen bar regrows (skipped the first time, the countdown already did it) */
    if (!firstDetail.current && rootRef.current) {
      const bar = rootRef.current.querySelectorAll('.pw-bar-fill')[index]
      if (bar) anims.push(animate(bar, { height: ['0px', `${BAR_H[index]}px`], duration: 700, ease: 'outQuart' }))
    }
    firstDetail.current = false

    return () => anims.forEach((a) => a.pause?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.title, shown])

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prediction-title"
    >
      <style>{CHARACTER_CSS}</style>
      <div className="pw-backdrop absolute inset-0 bg-[#0b0b2b]/60 backdrop-blur-sm" style={hid} onClick={locked ? undefined : onClose} />

      <div
        ref={panelRef}
        data-lenis-prevent
        style={hid}
        className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#f3e7d6] shadow-2xl md:grid md:grid-cols-[300px_minmax(0,1fr)] md:overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-neutral-600 shadow-md transition hover:text-black disabled:opacity-50"
        >
          ×
        </button>

        {/* LEFT: character panel */}
        <aside
          className="pw-aside flex flex-col items-center justify-center gap-4 p-6 text-center md:gap-5 md:p-8"
          style={{ background: theme?.tint ?? '#cde6f6', ...(motion ? { opacity: 0 } : {}) }}
        >
          {theme && (
            <div className="pw-pop relative w-44 shrink-0 min-[420px]:w-52 md:w-48" style={hid}>
              <span
                className="pw-glow absolute inset-0 rounded-full blur-2xl"
                style={{ background: theme.dark ?? '#2f80e0' }}
                aria-hidden="true"
              />
              <div ref={charRef} className="pw-float relative">
                <MbtiCharacter code={input.mbti} className="w-full" />
              </div>
            </div>
          )}

          <div className="min-w-0">
            <div
              className="text-5xl font-black leading-none tracking-tight md:text-6xl"
              style={{ color: theme?.dark ?? '#245f8a' }}
              aria-label={code || 'N/A'}
            >
              {code
                ? code.split('').map((ch, i) => (
                    <span key={i} className="pw-letter inline-block" data-ch={ch} aria-hidden="true">
                      {ch}
                    </span>
                  ))
                : 'N/A'}
            </div>
            {theme?.name && <div className="mt-1.5 text-lg font-extrabold text-black">{theme.name}</div>}

            <dl className="mt-4 hidden space-y-2 text-left text-sm md:block">
              {input?.degree && (
                <div className="rounded-2xl bg-white/70 px-4 py-2.5">
                  <dt className="text-xs font-semibold text-neutral-500">Degree</dt>
                  <dd className="mt-0.5 break-words font-bold text-neutral-800">{input.degree}</dd>
                </div>
              )}
              {skills.length > 0 && (
                <div className="rounded-2xl bg-white/70 px-4 py-2.5">
                  <dt className="text-xs font-semibold text-neutral-500">Skills used</dt>
                  <dd className="mt-0.5 font-bold text-neutral-800">{skills.length} skills</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>

        {/* RIGHT: results */}
        <section className="min-w-0 p-5 sm:p-8 md:max-h-[92vh] md:overflow-y-auto">
          <p className="pw-head flex items-center gap-2 pr-10 text-sm text-neutral-500" style={hid}>
            <span className="h-2 w-2 rounded-full bg-[#2f9e62]" aria-hidden="true" />
            Prediction complete · {fmtDate(pred?.createdAt)}
          </p>
          <h2
            id="prediction-title"
            className="pw-head mt-1.5 text-3xl font-black tracking-tight text-black sm:text-4xl"
            style={hid}
          >
            {careers.length === 3
              ? 'Your top 3 career matches'
              : careers.length === 1
              ? 'Your career match'
              : `Your top ${careers.length || ''} career matches`}
          </h2>
          <p className="pw-head mt-1 text-sm text-neutral-600" style={hid}>
            Tap a career to see why it fits, then open its roadmap.
          </p>

          {careers.length > 0 ? (
            <>
              {/* the podium */}
              <div
                className={`relative mt-8 grid items-end gap-2.5 sm:gap-4 ${gridCls}`}
                role="radiogroup"
                aria-label="Choose a career"
              >
                {careers.map((c, i) => {
                  const on = i === index
                  const color = RANK_COLORS[i]
                  return (
                    <button
                      key={`${c.title}-${i}`}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${i + 1}. ${c.title}, ${pct(c)} percent match`}
                      disabled={locked}
                      data-pct={pct(c)}
                      style={hid}
                      onClick={() => setSelected(c.title)}
                      className={`pw-row group relative flex min-w-0 flex-col text-center focus:outline-none ${n3 ? RANK_ORDER[i] : ''}`}
                    >
                      <span
                        className={`pw-pct text-2xl font-black leading-none sm:text-4xl ${on ? 'text-[#0b0b2b]' : 'text-neutral-500'}`}
                      >
                        {motion ? '0%' : `${pct(c)}%`}
                      </span>

                      {/* the bar */}
                      <span
                        className={`pw-bar-fill relative mt-2.5 flex items-start justify-center overflow-hidden rounded-t-2xl pt-2.5 shadow-md transition-[filter] duration-300 group-focus-visible:ring-4 group-focus-visible:ring-[#0b0b2b]/30 ${
                          on ? '' : 'grayscale-[.45] group-hover:grayscale-0'
                        }`}
                        style={{ height: motion ? '0px' : `${BAR_H[i]}px`, background: color }}
                      >
                        <span
                          className="pw-badge flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm font-black sm:h-9 sm:w-9 sm:text-base"
                          style={{ color: i === 1 ? '#0b0b2b' : color }}
                        >
                          {i + 1}
                        </span>

                        {/* light strip on top, like the loading bars */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-2 top-1.5 h-1.5 rounded-full bg-white/35"
                        />

                        {/* light sweep, only on the best match */}
                        {i === 0 && (
                          <span
                            aria-hidden="true"
                            className="pw-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2"
                            style={{
                              opacity: 0,
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)',
                            }}
                          />
                        )}
                      </span>

                      {/* ground under the bar; turns navy for the chosen one */}
                      <span
                        aria-hidden="true"
                        className={`block h-1.5 rounded-full transition-colors duration-300 ${on ? 'bg-[#0b0b2b]' : 'bg-[#d9c8ae]'}`}
                      />

                      <span
                        className={`mt-2 line-clamp-3 break-words text-[12px] leading-tight sm:text-sm ${
                          on ? 'font-extrabold text-black' : 'font-semibold text-neutral-600'
                        }`}
                      >
                        {c.title}
                      </span>

                      {/* confetti: bursts above the #1 bar, hidden until then */}
                      {i === 0 && motion && (
                        <span
                          className="pointer-events-none absolute left-1/2 top-12 z-20 block h-0 w-0"
                          aria-hidden="true"
                        >
                          {Array.from({ length: CONFETTI_COUNT }).map((_, k) => (
                            <span
                              key={k}
                              className={`pw-conf absolute left-0 top-0 block h-2 w-2 ${k % 3 === 0 ? 'rounded-full' : 'rounded-sm'}`}
                              style={{ background: CONFETTI_COLORS[k % CONFETTI_COLORS.length], opacity: 0 }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* detail for the chosen career */}
              {current && (
                <div className={`mt-6 transition-opacity duration-500 ${shown ? 'opacity-100' : 'opacity-0'}`}>
                  <div ref={detailRef} key={current.title} className="pw-rise rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-extrabold"
                        style={{ background: RANK_COLORS[index], color: RANK_TEXT[index] }}
                      >
                        {RANK_LABEL[index]}
                      </span>
                      <span className="text-sm font-bold text-neutral-500">{pct(current)}% match</span>
                    </div>
                    <h3 className="mt-2 break-words text-xl font-black leading-snug tracking-tight text-black sm:text-2xl">
                      {current.title}
                    </h3>

                    {parts.why.length > 0 && (
                      <>
                        <div className="mt-4 text-sm font-extrabold text-[#2f80e0]">Why this fits</div>
                        <ul className="mt-2 space-y-2">
                          {parts.why.slice(0, 3).map((r, ri) => (
                            <li key={`${r}-${ri}`} className="pw-why flex gap-2 text-sm leading-relaxed text-neutral-700">
                              <svg
                                viewBox="0 0 24 24"
                                className="pw-check mt-0.5 h-4 w-4 shrink-0 text-[#2f9e62]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M5 12.5l4.5 4.5L19 7.5" />
                              </svg>
                              <span className="min-w-0 break-words">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {(parts.have.length > 0 || parts.need.length > 0) && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {parts.have.length > 0 && <SkillBlock label="You already have" items={parts.have} tone="good" />}
                        {parts.need.length > 0 && <SkillBlock label="Skills to work on" items={parts.need} tone="todo" />}
                      </div>
                    )}

                    {parts.why.length === 0 && parts.have.length === 0 && parts.need.length === 0 && (
                      <p className="mt-3 text-sm text-neutral-600">
                        This recommendation is based on your assessment profile and career-match score.
                      </p>
                    )}
                  </div>

                  {/* Are you satisfied with these results? */}
                  {(canRedo || happy || redoing) && (
                    <div
                      className="pw-rise mt-4 rounded-3xl border border-[#e0d1ba] bg-white/70 p-4 sm:p-5"
                      role="status"
                      aria-live="polite"
                    >
                      {redoing ? (
                        <div className="flex items-center gap-3 text-sm font-bold text-[#0b0b2b]">
                          <span
                            className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#0b0b2b]/20 border-t-[#0b0b2b]"
                            aria-hidden="true"
                          />
                          <span>
                            Finding different careers...
                            <span className="block text-xs font-normal text-neutral-500">
                              This can take up to a minute. Please keep this page open.
                            </span>
                          </span>
                        </div>
                      ) : happy ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-bold text-[#1d7a49]">✓ Glad it fits! Open a career&apos;s roadmap when you&apos;re ready.</span>
                          {canRedo && (
                            <button
                              type="button"
                              onClick={() => setHappy(false)}
                              disabled={locked}
                              className="text-xs font-semibold text-neutral-500 hover:text-black hover:underline disabled:opacity-50"
                            >
                              Actually, show me others
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-extrabold text-black">Are you satisfied with these results?</p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              Not quite right? We&apos;ll look for different careers ({redosLeft} {redosLeft === 1 ? 'try' : 'tries'} left).
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setHappy(true)}
                              disabled={locked}
                              className="rounded-full bg-[#0b0b2b] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:opacity-50"
                            >
                              Yes, I&apos;m satisfied
                            </button>
                            <button
                              type="button"
                              onClick={onRedo}
                              disabled={locked}
                              className="rounded-full border border-[#0b0b2b]/30 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0b0b2b] transition hover:border-[#0b0b2b] disabled:opacity-50"
                            >
                              No, show me different careers
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 rounded-2xl bg-white p-5 text-sm text-neutral-600 shadow-sm">
              Your prediction was saved, but it has no recommended careers to show yet. Open your dashboard to see it.
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onViewDashboard}
              disabled={locked}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 shadow-sm transition hover:text-black hover:shadow-md disabled:opacity-50"
            >
              Go to dashboard
            </button>
            <button
              type="button"
              disabled={!current || locked}
              onClick={() => onViewRoadmap(current.title)}
              className="max-w-full rounded-full bg-[#0b0b2b] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Saving...' : current ? 'View roadmap →' : 'No career to select'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PredictionModal