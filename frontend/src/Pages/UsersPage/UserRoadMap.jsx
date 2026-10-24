import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import { FaCheckCircle, FaFlagCheckered, FaPlay } from 'react-icons/fa'
import { getLatestPrediction, getPrediction, getRoadmap, listPredictions } from '../../api/predictions'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'

const BACK = '/dashboard'

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem('selectedCareer') || 'null')
  } catch {
    return null
  }
}

const list = (v) => (Array.isArray(v) ? v : [])
// Roadmap arrays may hold plain strings or objects, so read both safely
const text = (x) =>
  typeof x === 'string' ? x : x?.title ?? x?.name ?? x?.step ?? x?.label ?? x?.description ?? ''
const sub = (x) =>
  x && typeof x === 'object' ? x.duration ?? x.time ?? x.period ?? x.timeframe ?? '' : ''
const detail = (x) => {
  if (!x || typeof x !== 'object') return ''
  const d = x.details ?? x.description ?? ''
  return typeof d === 'string' && d !== text(x) ? d : ''
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* nearest scrollable ancestor (the dashboard layout may scroll inside a div instead of the window) */
const scrollParent = (node) => {
  let p = node?.parentElement
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p
    p = p.parentElement
  }
  return document.scrollingElement || document.documentElement
}

/* NOTE: text uses <div>/<span> with explicit sizes, because the global p { font-size: var(--text-body) } rule overrides Tailwind sizes */

/* ------------------------------------------------------------------ */
/* Map geometry                                                        */
/* The route is a winding S-curve. Everything (path, nodes, character)  */
/* is positioned from the same numbers, so they always line up.         */
/* ------------------------------------------------------------------ */
const MAP_W = 400
const ROW = 150 // vertical distance between stops
const TOP = 118 // start point (leaves room for the character above it)
const FIRST = 214 // first stop
const LEFT_X = 92
const RIGHT_X = 308

const buildMap = (count) => {
  const nodes = Array.from({ length: count }, (_, i) => ({
    x: i % 2 === 0 ? LEFT_X : RIGHT_X,
    y: FIRST + i * ROW,
  }))
  const start = { x: MAP_W / 2, y: TOP }
  const end = { x: MAP_W / 2, y: nodes[count - 1].y + 125 }
  const H = end.y + 115
  const pts = [start, ...nodes, end]

  let d = `M ${start.x} ${start.y}`
  const samples = [{ x: start.x, y: start.y, len: 0 }]
  const nodeLen = []
  let total = 0

  for (let j = 0; j < pts.length - 1; j++) {
    const a = pts[j]
    const b = pts[j + 1]
    const dy = b.y - a.y
    const c1 = { x: a.x, y: a.y + dy * 0.5 }
    const c2 = { x: b.x, y: b.y - dy * 0.5 }
    d += ` C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`

    let prev = a
    const STEPS = 24
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS
      const m = 1 - t
      const x = m * m * m * a.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * b.x
      const y = m * m * m * a.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * b.y
      total += Math.hypot(x - prev.x, y - prev.y)
      samples.push({ x, y, len: total })
      prev = { x, y }
    }
    if (j < count) nodeLen[j] = total // segment j ends at stop j
  }

  return {
    W: MAP_W,
    H,
    d,
    start,
    end,
    nodes,
    samples,
    total,
    nodeFrac: nodeLen.map((l) => l / total),
  }
}

/* point on the route at fraction f (0 to 1) */
const posAt = (geo, f) => {
  const target = Math.max(0, Math.min(1, f)) * geo.total
  const s = geo.samples
  let i = 1
  while (i < s.length - 1 && s[i].len < target) i++
  const a = s[i - 1]
  const b = s[i]
  const span = b.len - a.len || 1
  const t = Math.max(0, Math.min(1, (target - a.len) / span))
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

const pctX = (geo, x) => `${(x / geo.W) * 100}%`
const pctY = (geo, y) => `${(y / geo.H) * 100}%`

const HIDDEN = { opacity: 0 } // animated in by anime.js

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

/* online course search links, they open each platform's search page so they never go stale.
   Check the URL formats now and then in case a platform changes them. */
const COURSE_SOURCES = [
  { name: 'Udemy', url: (q) => `https://www.udemy.com/courses/search/?q=${encodeURIComponent(q)}` },
  { name: 'Coursera', url: (q) => `https://www.coursera.org/search?query=${encodeURIComponent(q)}` },
  { name: 'edX', url: (q) => `https://www.edx.org/search?q=${encodeURIComponent(q)}` },
  { name: 'YouTube', url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} course`)}` },
]

const CourseLinks = ({ topic }) => (
  <div className="flex flex-wrap gap-2">
    {COURSE_SOURCES.map((s) => (
      <a
        key={s.name}
        href={s.url(topic)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Search ${s.name} for ${topic} courses (opens in a new tab)`}
        className="rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-[13px] font-semibold text-[#0b0b2b] transition hover:border-[#0b0b2b] hover:bg-[#f7efe2]"
      >
        {s.name} ↗
      </a>
    ))}
  </div>
)

const Chips = ({ items, cls = 'border-[#e0d1ba]' }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((s, i) => (
      <li key={`${text(s)}-${i}`} className={`rounded-full border bg-white px-3 py-1 text-[13px] text-neutral-700 ${cls}`}>
        {text(s)}
      </li>
    ))}
  </ul>
)

const Box = ({ children, className = '' }) => (
  <section className={`rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-6 shadow-sm ${className}`}>{children}</section>
)

const Label = ({ children, cls = 'text-neutral-500' }) => (
  <div className={`text-xs font-bold uppercase tracking-wide ${cls}`}>{children}</div>
)

const Chevron = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-neutral-500 transition group-open:rotate-180 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const Acc = ({ title, hint, children }) => (
  <details className="group border-b border-[#e6d8c3] py-4 last:border-b-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <div className="text-base font-extrabold text-black">{title}</div>
        <div className="text-[13px] text-neutral-500">{hint}</div>
      </div>
      <Chevron />
    </summary>
    <div className="mt-4 space-y-4">{children}</div>
  </details>
)

/* one skill row with course links tucked behind a toggle */
const SkillRow = ({ skill }) => (
  <details className="group border-b border-[#f0c4c7] py-3 first:pt-0 last:border-b-0 last:pb-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 text-sm font-extrabold text-black">{skill}</span>
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#e0d1ba] bg-white px-3 py-1 text-xs font-bold text-[#0b0b2b]">
        Find courses
        <Chevron className="!h-4 !w-4 !text-[#0b0b2b]" />
      </span>
    </summary>
    <div className="mt-3">
      <CourseLinks topic={skill} />
    </div>
  </details>
)

/* ------------------------------------------------------------------ */
/* Cheer: your character greets you, then keeps cheering you on        */
/* ------------------------------------------------------------------ */
const START_LINES = [
  'You’ve got this! Step one is the hardest, and you’re already here.',
  'Every big journey starts small. Let’s go!',
  'I believe in you. Pick a step and make a move!',
]
const EARLY_LINES = [
  'Nice start! Keep that momentum going.',
  'Look at you go! I’m proud of you.',
  'One step at a time. You are doing great!',
]
const MID_LINES = [
  'Keep pushing, you are making real progress!',
  'You are on a roll. Don’t stop now!',
  'Stay steady, the goal is getting closer!',
]
const LATE_LINES = [
  'So close! The finish line is in sight.',
  'Almost there. One last push!',
  'You are crushing this roadmap!',
]
const DONE_LINES = [
  'You did it! Every single step is done!',
  'Champion! I knew you could do it!',
  'What an achievement. Time to celebrate!',
]
const STEP_LINES = [
  'Step complete! Great work!',
  'Boom! Another one down!',
  'Yes! That is real progress!',
  'Look at that. You are unstoppable!',
]

const cheerPool = (progress, allDone, nextTitle) => {
  const base = allDone
    ? DONE_LINES
    : progress === 0
      ? START_LINES
      : progress < 35
        ? EARLY_LINES
        : progress < 70
          ? MID_LINES
          : LATE_LINES
  return nextTitle && !allDone ? [...base, `Next up: ${nextTitle}. You can do this!`] : base
}

/* a new line every 7 seconds; finishing a step shows a celebration line right away and restarts the timer */
const CHEER_EVERY = 7000

const useCheerLine = ({ theme, progress, allDone, nextTitle, celebrate }) => {
  const greeting = `Hi there! I’m your ${theme.name}. Let’s tackle this roadmap together!`
  const [msg, setMsg] = useState(greeting)
  const turn = useRef(0)
  const latest = useRef({})
  latest.current = { progress, allDone, nextTitle }
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
    } else {
      const pool = latest.current.allDone ? DONE_LINES : STEP_LINES
      setMsg(pool[turn.current++ % pool.length])
    }
    const id = setInterval(() => {
      const { progress: p, allDone: a, nextTitle: n } = latest.current
      const pool = cheerPool(p, a, n)
      setMsg(pool[turn.current++ % pool.length])
    }, CHEER_EVERY)
    return () => clearInterval(id)
  }, [celebrate])

  return msg
}

/* desktop: big card in the right column */
const CheerCard = ({ code, theme, progress, allDone, celebrate, nextTitle }) => {
  const msg = useCheerLine({ theme, progress, allDone, nextTitle, celebrate })

  return (
    <div className="rounded-2xl border-2 border-[#0b0b2b] p-4 shadow-lg" style={{ backgroundColor: theme.tint }}>
      <style>{`
        @keyframes cheerBubbleIn { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .cheer-bubble { animation: none !important; } }
      `}</style>

      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.dark }}>
        {String(code).toUpperCase()} · {theme.name} is cheering for you
      </div>

      {/* speech bubble */}
      <div
        key={msg}
        className="cheer-bubble relative mt-3 flex min-h-[64px] items-center rounded-2xl border-2 border-[#0b0b2b] bg-white px-4 py-3 text-sm font-bold leading-snug text-black"
        style={{ animation: 'cheerBubbleIn .35s ease-out' }}
      >
        {msg}
        <span
          aria-hidden="true"
          className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#0b0b2b] bg-white"
        />
      </div>

      <MbtiCharacter code={code} cheer celebrate={celebrate} className="mx-auto mt-4 w-[200px]" />
    </div>
  )
}

/* mobile: a small character that rides above the focus card, so it follows you as you scroll.
   The bubble appears with each new line and hides again after 5 seconds. */
const MiniCheer = ({ code, theme, progress, allDone, celebrate, nextTitle }) => {
  const msg = useCheerLine({ theme, progress, allDone, nextTitle, celebrate })
  const [show, setShow] = useState(true)

  useEffect(() => {
    setShow(true)
    const t = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(t)
  }, [msg])

  return (
    <div className="pointer-events-none absolute bottom-full right-1 z-30 mb-2 flex items-end gap-1">
      <style>{`
        @keyframes miniBubbleIn { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mini-bubble { animation: none !important; } }
      `}</style>

      {show && (
        <div
          key={msg}
          className="mini-bubble relative mb-6 max-w-[190px] rounded-2xl border-2 border-[#0b0b2b] bg-white px-3 py-2 text-xs font-bold leading-snug text-black shadow-md"
          style={{ animation: 'miniBubbleIn .3s ease-out' }}
          role="status"
        >
          {msg}
          <span
            aria-hidden="true"
            className="absolute -right-[7px] bottom-3 h-3 w-3 rotate-45 border-r-2 border-t-2 border-[#0b0b2b] bg-white"
          />
        </div>
      )}

      <div className="rounded-full shadow-lg" style={{ backgroundColor: theme.tint }}>
        <MbtiCharacter code={code} cheer celebrate={celebrate} className="w-[84px]" />
      </div>
    </div>
  )
}

/* true on desktop widths, so only one cheering character is mounted at a time */
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

/* ------------------------------------------------------------------ */
/* Map decorations (static scenery drawn between the stops)            */
/* ------------------------------------------------------------------ */
const Deco = ({ type, x, y }) => (
  <g className="pop-deco" style={HIDDEN} transform={`translate(${x} ${y})`}>
    {type === 'mountain' && (
      <>
        <polygon points="-34,24 -4,-26 26,24" fill="#c9b78f" />
        <polygon points="-14,-6 -4,-26 6,-6 0,-10 -6,-4" fill="#fff" />
        <polygon points="8,24 28,-6 48,24" fill="#b9a67a" />
      </>
    )}
    {type === 'tree' && (
      <>
        <rect x="-3" y="6" width="6" height="18" rx="2" fill="#8a6a45" />
        <circle cx="0" cy="-4" r="17" fill="#7fb487" />
        <circle cx="-3" cy="-16" r="11" fill="#6aa571" />
      </>
    )}
    {type === 'bush' && (
      <>
        <ellipse cx="0" cy="14" rx="26" ry="10" fill="#7fb487" />
        <ellipse cx="-12" cy="8" rx="13" ry="10" fill="#6aa571" />
        <ellipse cx="12" cy="9" rx="12" ry="9" fill="#8cc193" />
      </>
    )}
  </g>
)

const DECO_TYPES = ['tree', 'mountain', 'bush']

const CONFETTI = ['#2f80e0', '#f2c230', '#e0404a', '#2f9e62', '#0b0b2b']

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const UserRoadMap = () => {
  const { state } = useLocation()
  const isDesktop = useIsDesktop()

  const [status, setStatus] = useState('loading') // loading | ready | blocked
  const [message, setMessage] = useState('')
  const [pred, setPred] = useState(null)
  const [road, setRoad] = useState(null)
  const [done, setDone] = useState([])
  const [focusIdx, setFocusIdx] = useState(null) // null = follow the next unfinished step
  const [celebrate, setCelebrate] = useState(0) // goes up each time a step is finished, the cheering character reacts
  /* the intro preview: the character walks the whole route once, then returns to your step */
  const [previewing, setPreviewing] = useState(() => !reducedMotion())
  const [previewRun, setPreviewRun] = useState(0)

  /* animation refs */
  const mapRef = useRef(null)
  const charRef = useRef(null)
  const bobRef = useRef(null)
  const trailRef = useRef(null)
  const previewRef = useRef(null)
  const charF = useRef({ f: 0 })
  const trailF = useRef({ f: 0 })
  const walkAnim = useRef(null)
  const trailAnim = useRef(null)
  const introDone = useRef({ walk: false, trail: false })
  const prevAllDone = useRef(null)
  const followRef = useRef(false) // page scrolls along with the character while true
  const scrollerRef = useRef(null)
  const skipRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const id = state?.predictionId ?? readSaved()?.predictionId
        const p = id ? await getPrediction(id) : await getLatestPrediction()
        if (cancelled) return

        /* the single-prediction response may not carry the MBTI type, so look it up from the list */
        let mbti = p.mbti
        if (!mbti) {
          try {
            const d = await listPredictions()
            mbti = d.predictions?.find((x) => String(x.id) === String(p.id))?.mbti ?? d.predictions?.[0]?.mbti
          } catch {
            /* character just won't show */
          }
        }
        if (cancelled) return
        setPred({ ...p, mbti })

        // Uses the career the user selected (saved in the database)
        const rm = await getRoadmap(p.id)
        if (cancelled) return
        setRoad(rm)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setMessage(e?.message || 'Something went wrong loading your roadmap.')
        setStatus('blocked')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [state?.predictionId])

  /* checklist progress, remembered per prediction + career */
  const storeKey = pred && road ? `roadmapProgress:${pred.id}:${road.career?.title}` : null

  useEffect(() => {
    if (!storeKey) return
    try {
      setDone(JSON.parse(localStorage.getItem(storeKey) || '[]'))
    } catch {
      setDone([])
    }
  }, [storeKey])

  const toggle = (key) =>
    setDone((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      try {
        localStorage.setItem(storeKey, JSON.stringify(next))
      } catch {
        /* storage unavailable: progress just won't persist */
      }
      return next
    })

  /* if the person scrolls or presses a key themselves, stop the page from following the character */
  useEffect(() => {
    const stop = () => {
      followRef.current = false
    }
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    return () => {
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [])

  /* ---- derived values (kept above the early returns so hooks stay in order) ---- */
  const steps = list(road?.roadmap?.timeline?.steps)
  const progress = steps.length ? Math.round((done.length / steps.length) * 100) : 0
  const nextIdx = steps.findIndex((_, i) => !done.includes(String(i)))
  const allDone = steps.length > 0 && nextIdx === -1

  /* the step in focus: the one the user clicked, otherwise the next unfinished step */
  const active = steps.length
    ? Math.min(focusIdx ?? (nextIdx >= 0 ? nextIdx : steps.length - 1), steps.length - 1)
    : 0

  const lastDone = done.reduce((m, k) => {
    const n = Number(k)
    return Number.isInteger(n) && n < steps.length ? Math.max(m, n) : m
  }, -1)

  const geo = useMemo(() => (steps.length ? buildMap(steps.length) : null), [steps.length])
  const trailTarget = geo ? (allDone ? 1 : lastDone >= 0 ? geo.nodeFrac[lastDone] : 0) : 0

  const placeChar = (g, f) => {
    const el = charRef.current
    if (!el) return
    const p = posAt(g, f)
    el.style.left = pctX(g, p.x)
    el.style.top = pctY(g, p.y)
  }

  const drawTrail = (f) => {
    const el = trailRef.current
    if (!el) return
    el.setAttribute('stroke-dashoffset', String(1000 - f * 1000))
    el.setAttribute('opacity', f <= 0.001 ? '0' : '1')
  }

  const drawPreview = (f) => {
    previewRef.current?.setAttribute('stroke-dashoffset', String(1000 - f * 1000))
  }

  /* gently scroll so the walking character stays around the middle of the screen */
  const follow = () => {
    if (!followRef.current || !charRef.current || !scrollerRef.current) return
    const sc = scrollerRef.current
    const isDoc = sc === document.scrollingElement || sc === document.documentElement || sc === document.body
    const box = isDoc ? { top: 0, height: window.innerHeight } : sc.getBoundingClientRect()
    const r = charRef.current.getBoundingClientRect()
    const delta = r.top - (box.top + box.height * 0.45)
    if (Math.abs(delta) > 6) sc.scrollTop += delta * 0.14
  }

  const replayPreview = () => {
    if (!geo) return
    followRef.current = true
    setPreviewing(true)
    setPreviewRun((n) => n + 1)
  }

  const skipPreview = () => skipRef.current?.()

  /* 1. entrance: the map fades in, stops pop up one after another */
  useEffect(() => {
    if (status !== 'ready' || !geo || !mapRef.current) return
    const root = mapRef.current
    const q = (sel) => Array.from(root.querySelectorAll(sel))
    const nodes = q('.pop-node')
    const labels = q('.pop-label')
    const decos = q('.pop-deco')
    const base = q('.base-trail')

    const showAll = () =>
      [...nodes, ...labels, ...decos, ...base].forEach((el) => {
        el.style.opacity = '1'
      })

    if (reducedMotion()) {
      showAll()
      return
    }

    const runs = []
    if (base.length) runs.push(animate(base, { opacity: [0, 1], duration: 900, ease: 'outQuad' }))
    if (decos.length)
      runs.push(animate(decos, { opacity: [0, 1], duration: 700, delay: stagger(90, { start: 200 }), ease: 'outQuad' }))
    if (nodes.length)
      runs.push(
        animate(nodes, {
          opacity: [0, 1],
          scale: [0.2, 1],
          duration: 700,
          delay: stagger(110, { start: 250 }),
          ease: 'outBack',
        })
      )
    if (labels.length)
      runs.push(
        animate(labels, {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 600,
          delay: stagger(110, { start: 350 }),
          ease: 'outQuad',
        })
      )

    // if an animation is interrupted or fails, don't leave the map invisible
    const fallback = setTimeout(showAll, 3500)
    return () => {
      clearTimeout(fallback)
      runs.forEach((a) => a.pause())
    }
  }, [status, geo])

  /* 1b. the preview: the character flies down the whole route (a yellow trail draws behind it,
         each stop bumps as it passes), then the normal "walk to your step" effect takes over */
  useEffect(() => {
    if (status !== 'ready') return
    if (!geo || reducedMotion()) {
      setPreviewing(false)
      return
    }
    const root = mapRef.current
    const prevPath = previewRef.current
    if (!root || !prevPath) return

    const stepNodes = Array.from(root.querySelectorAll('.step-node'))
    const flag = root.querySelector('.finish-node')
    const st = charF.current
    const bumped = new Set()
    let startT = 0
    let endT = 0
    let anim = null
    let fade = null
    let ended = false

    st.f = 0
    placeChar(geo, 0)
    drawPreview(0)
    prevPath.style.opacity = '0'
    scrollerRef.current = scrollParent(charRef.current)
    followRef.current = true

    const bump = (el) => {
      if (el) animate(el, { scale: [1, 1.28, 1], duration: 420, ease: 'outQuad' })
    }

    const end = () => {
      if (ended) return
      ended = true
      fade = animate(prevPath, { opacity: [1, 0], duration: 600, ease: 'outQuad' })
      introDone.current.walk = true
      introDone.current.trail = true
      setPreviewing(false) // lets the walk-back and the progress trail effects run
    }

    skipRef.current = () => {
      clearTimeout(startT)
      clearTimeout(endT)
      anim?.pause()
      end()
    }

    startT = setTimeout(
      () => {
        prevPath.style.opacity = '1'
        anim = animate(st, {
          f: 1,
          duration: Math.min(6000, 1800 + geo.nodes.length * 500),
          ease: 'inOutSine',
          onUpdate: () => {
            placeChar(geo, st.f)
            drawPreview(st.f)
            geo.nodeFrac.forEach((nf, i) => {
              if (!bumped.has(i) && st.f >= nf - 0.004) {
                bumped.add(i)
                bump(stepNodes[i])
              }
            })
            follow()
          },
          onComplete: () => {
            placeChar(geo, 1)
            drawPreview(1)
            bump(flag)
            endT = setTimeout(end, 500)
          },
        })
      },
      previewRun === 0 ? 1500 : 250
    )

    return () => {
      clearTimeout(startT)
      clearTimeout(endT)
      anim?.pause()
      fade?.pause()
      skipRef.current = null
    }
  }, [status, geo, previewRun])

  /* 2. the traveled route draws itself up to the last finished step */
  useEffect(() => {
    if (status !== 'ready' || !geo) return
    const st = trailF.current
    trailAnim.current?.pause()
    if (previewing) return // wait until the preview is over

    if (reducedMotion()) {
      st.f = trailTarget
      drawTrail(st.f)
      return
    }

    trailAnim.current = animate(st, {
      f: trailTarget,
      duration: 500 + Math.abs(trailTarget - st.f) * 2600,
      delay: introDone.current.trail ? 0 : 900,
      ease: 'inOutSine',
      onUpdate: () => drawTrail(st.f),
      onComplete: () => {
        drawTrail(st.f)
        introDone.current.trail = true
      },
    })
  }, [status, geo, trailTarget, previewing])

  /* 3. the character walks along the route to the step in focus
        (right after the preview, this is the walk back from the finish line) */
  useEffect(() => {
    if (status !== 'ready' || !geo) return
    const target = geo.nodeFrac[active]
    const st = charF.current
    walkAnim.current?.pause()
    if (previewing) return // the preview is moving the character

    if (reducedMotion()) {
      st.f = target
      placeChar(geo, st.f)
      return
    }

    walkAnim.current = animate(st, {
      f: target,
      duration: Math.min(3200, 600 + Math.abs(target - st.f) * 3400),
      delay: introDone.current.walk ? 0 : 900,
      ease: 'inOutSine',
      onUpdate: () => {
        placeChar(geo, st.f)
        follow()
      },
      onComplete: () => {
        placeChar(geo, st.f)
        introDone.current.walk = true
        followRef.current = false
      },
    })
  }, [status, geo, active, previewing])

  /* 4. idle bob for the character */
  useEffect(() => {
    if (status !== 'ready' || !bobRef.current || reducedMotion()) return
    const a = animate(bobRef.current, {
      translateY: [-4, 3],
      duration: 800,
      alternate: true,
      loop: true,
      ease: 'inOutSine',
    })
    return () => a.pause()
  }, [status, geo])

  /* 5. pulse ring on the stop in focus */
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || reducedMotion()) return
    const rings = Array.from(mapRef.current.querySelectorAll('.pulse-ring'))
    if (!rings.length) return
    const a = animate(rings, {
      scale: [1, 1.9],
      opacity: [0.7, 0],
      duration: 1500,
      loop: true,
      ease: 'outQuad',
    })
    return () => a.pause()
  }, [status, geo, active])

  /* 6. confetti when the last step is finished */
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return
    const justFinished = prevAllDone.current === false && allDone
    prevAllDone.current = allDone
    if (!justFinished || reducedMotion()) return

    const pieces = Array.from(mapRef.current.querySelectorAll('.confetti'))
    if (!pieces.length) return
    const rand = (min, max) => min + Math.random() * (max - min)
    pieces.forEach((el) => {
      el.style.transform = 'none'
    })
    const a = animate(pieces, {
      translateX: () => rand(-120, 120),
      translateY: () => rand(-150, -20),
      rotate: () => rand(-240, 240),
      opacity: [1, 0],
      duration: 1500,
      delay: stagger(18),
      ease: 'outQuad',
    })
    return () => a.pause()
  }, [status, allDone])

  /* ---- early returns ---- */
  if (status === 'loading') return <div className="text-base text-neutral-500">Loading roadmap...</div>

  if (status === 'blocked') {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black tracking-tight text-black">Career roadmap</h1>
        <div className="text-base text-neutral-600">
          {message === 'No predictions yet'
            ? 'You have no predictions yet. Take the assessment first.'
            : message.startsWith('Select a career')
              ? 'You haven’t selected a career yet. Pick one from your top 3 on the dashboard to see its roadmap.'
              : message}
        </div>
        <Link
          to={BACK}
          className="inline-block rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          Go to dashboard
        </Link>
      </div>
    )
  }

  const career = road?.career ?? {}
  const roadmap = road?.roadmap ?? {}
  const activeStep = steps[active]
  const activeKey = String(active)
  const activeDone = done.includes(activeKey)

  const match = list(pred.recommended).find((c) => c.title === career.title)
  const have = list(match?.skillsHave)
  const need = [...new Set(list(match?.skillsToBuild).map(text).filter(Boolean))]

  const technical = list(roadmap.skills?.technical)
  const soft = list(roadmap.skills?.soft)
  const other = list(roadmap.skills?.other)
  const theme = mbtiTheme(pred.mbti)

  /* when nothing is left to build, offer courses for the career's technical skills instead */
  const courseSkills = [...new Set(technical.map(text).filter(Boolean))].slice(0, 6)

  const programs = list(roadmap.education?.relatedPrograms)
  const reported = list(roadmap.education?.reportedByWorkers)
  const certificates = list(roadmap.certificates)
  const hasEdu = roadmap.education?.typical || programs.length > 0 || certificates.length > 0

  const goTo = (i) => setFocusIdx(Math.max(0, Math.min(steps.length - 1, i)))

  const finishActive = () => {
    const wasDone = activeDone
    toggle(activeKey)
    if (!wasDone) {
      setFocusIdx(null) // jump on to the next unfinished step
      setCelebrate((n) => n + 1) // the cheering character celebrates
    }
  }

  const estimatedTotal = text(roadmap.timeline?.estimatedTotal)
  const canPreview = !reducedMotion()

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <nav className="text-sm text-neutral-500" aria-label="Breadcrumb">
          <Link to={BACK} className="font-bold text-[#0b0b2b] hover:underline">
            Dashboard
          </Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span>Roadmap</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="break-words text-3xl font-black tracking-tight text-black sm:text-4xl">Roadmap: {career.title}</h1>
            <div className="mt-1 text-sm text-neutral-600">
              {steps.length} steps
              {estimatedTotal ? ` · about ${estimatedTotal.replace(/^about\s+/i, '')}` : ''}
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#0b0b2b] px-4 py-2 text-sm font-extrabold text-white">
            {career.matchPercent}% match
          </span>
        </div>
      </header>

      {steps.length > 0 && geo && (
        <>
          {/* Progress summary */}
          <Box className="!p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="text-2xl font-black leading-tight text-black sm:text-3xl">{progress}% of the way there</div>
              <div className="text-sm text-neutral-600">
                {done.length} of {steps.length} steps done
              </div>
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e8dcc8]"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Roadmap progress"
            >
              <div className="h-full rounded-full bg-[#2f80e0] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="min-w-0 text-sm text-neutral-600">
                {allDone ? (
                  <span className="font-bold text-[#2f9e62]">Every step is done. Nice work!</span>
                ) : (
                  <>
                    Next up: <span className="font-bold text-black">{text(steps[nextIdx])}</span>
                  </>
                )}
              </div>

              {canPreview &&
                (previewing ? (
                  <button
                    type="button"
                    onClick={skipPreview}
                    className="shrink-0 rounded-full border border-[#d9c8ae] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b]"
                  >
                    Skip preview
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={replayPreview}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-[#d9c8ae] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b]"
                  >
                    <FaPlay className="h-2.5 w-2.5" aria-hidden="true" />
                    Replay preview
                  </button>
                ))}
            </div>
          </Box>

          {/* Map + focus card.
              Mobile: block layout, the focus card floats at the bottom of the screen while the map scrolls,
              with a small cheering character riding above it.
              Desktop: two columns, the focus card and the cheer card stick to the top of the right column. */}
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
            {/* THE MAP (container-type lets the stop labels size themselves from the map's own width) */}
            <div
              ref={mapRef}
              className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-3xl border-2 border-[#0b0b2b] shadow-sm"
              style={{ containerType: 'inline-size' }}
            >
              <svg
                viewBox={`0 0 ${geo.W} ${geo.H}`}
                className="block h-auto w-full"
                role="img"
                aria-label={`Map of your ${steps.length} steps toward becoming ${career.title}`}
              >
                <defs>
                  <radialGradient id="roadmap-paper" cx="50%" cy="35%" r="80%">
                    <stop offset="0" stopColor="#fff9ea" />
                    <stop offset="1" stopColor="#efddbb" />
                  </radialGradient>
                </defs>

                <rect width={geo.W} height={geo.H} fill="url(#roadmap-paper)" />
                <rect
                  x="10"
                  y="10"
                  width={geo.W - 20}
                  height={geo.H - 20}
                  rx="18"
                  fill="none"
                  stroke="#d9c8ae"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />

                {/* compass */}
                <g transform="translate(342 62)" opacity="0.8">
                  <circle r="24" fill="none" stroke="#b89d73" strokeWidth="2" />
                  <polygon points="-20,0 0,-5 20,0 0,5" fill="#e0cfa8" />
                  <polygon points="0,-20 5,0 0,20 -5,0" fill="#c9a56b" />
                  <text y="-30" textAnchor="middle" fontSize="11" fontWeight="800" fill="#8a6a45">
                    N
                  </text>
                </g>

                {/* scenery between the stops */}
                {geo.nodes.slice(0, -1).map((_, i) => {
                  const y = FIRST + i * ROW + ROW / 2
                  return (
                    <React.Fragment key={`deco-${i}`}>
                      <Deco type={DECO_TYPES[i % 3]} x={50} y={y} />
                      <Deco type={DECO_TYPES[(i + 1) % 3]} x={350} y={y} />
                    </React.Fragment>
                  )
                })}
                <Deco type="tree" x={60} y={geo.end.y - 10} />
                <Deco type="mountain" x={338} y={geo.end.y - 10} />

                {/* the whole route as a dotted trail */}
                <path
                  className="base-trail"
                  d={geo.d}
                  fill="none"
                  stroke="#b89d73"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="1 13"
                  style={HIDDEN}
                />

                {/* preview trail: drawn once while the character flies down the route, then fades out */}
                <path
                  ref={previewRef}
                  d={geo.d}
                  pathLength="1000"
                  fill="none"
                  stroke="#f2c230"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="1000 2000"
                  strokeDashoffset="1000"
                  style={HIDDEN}
                />

                {/* the part already walked: drawn by anime.js */}
                <path
                  ref={trailRef}
                  d={geo.d}
                  pathLength="1000"
                  fill="none"
                  stroke="#2f80e0"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="1000 2000"
                  strokeDashoffset="1000"
                  opacity="0"
                />
              </svg>

              {/* small badge while the preview is playing */}
              {previewing && (
                <div
                  className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-2 rounded-full bg-[#0b0b2b]/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-md"
                  role="status"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#f2c230]" aria-hidden="true" />
                  Previewing your route
                </div>
              )}

              {/* stops, start and finish (HTML on top of the SVG so they are real buttons) */}
              <ol className="absolute inset-0 m-0 list-none p-0">
                {/* start */}
                <li className="absolute h-0 w-0" style={{ left: pctX(geo, geo.start.x), top: pctY(geo, geo.start.y) }}>
                  <div className="absolute left-0 top-0 flex h-0 w-0 items-center justify-center">
                    <div
                      className="pop-node shrink-0 rounded-full border-2 border-white bg-[#0b0b2b] px-3 py-1 text-xs font-extrabold text-white shadow-md"
                      style={HIDDEN}
                    >
                      Start
                    </div>
                  </div>
                </li>

                {/* the steps */}
                {steps.map((step, i) => {
                  const node = geo.nodes[i]
                  const checked = done.includes(String(i))
                  const isActive = i === active
                  const onLeft = i % 2 === 0
                  return (
                    <li
                      key={i}
                      className="absolute h-0 w-0"
                      style={{ left: pctX(geo, node.x), top: pctY(geo, node.y) }}
                    >
                      <div className="absolute left-0 top-0 flex h-0 w-0 items-center justify-center">
                        <div className="pop-node step-node h-11 w-11 shrink-0" style={HIDDEN}>
                          <button
                            type="button"
                            onClick={() => setFocusIdx(i)}
                            aria-current={isActive ? 'step' : undefined}
                            aria-label={`Step ${i + 1}: ${text(step)}${checked ? ' (done)' : ''}`}
                            className={`relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold shadow-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f80e0]/40 ${
                              checked
                                ? 'bg-white'
                                : isActive
                                  ? 'border-[3px] border-[#2f80e0] bg-white text-[#2f80e0]'
                                  : 'border-[3px] border-[#d9c8ae] bg-white text-neutral-500 hover:border-[#0b0b2b]'
                            }`}
                          >
                            {checked ? <FaCheckCircle className="h-11 w-11 text-[#2f9e62]" aria-hidden="true" /> : i + 1}
                            {isActive && (
                              <span
                                aria-hidden="true"
                                className="pulse-ring pointer-events-none absolute inset-0 rounded-full border-2 border-[#2f80e0]"
                              />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* label beside the stop: width follows the map width so it never runs into the other side */}
                      <div
                        className="absolute top-0 flex h-0 items-center"
                        style={onLeft ? { left: 32 } : { right: 32 }}
                      >
                        <div
                          aria-hidden="true"
                          onClick={() => setFocusIdx(i)}
                          className={`pop-label w-[min(190px,38cqw)] shrink-0 cursor-pointer rounded-xl bg-[#fff9ea]/90 px-2 py-1 ${
                            onLeft ? 'text-left' : 'text-right'
                          }`}
                          style={HIDDEN}
                        >
                          <div
                            className={`line-clamp-2 text-[13px] font-extrabold leading-tight ${
                              checked ? 'text-neutral-400 line-through' : 'text-black'
                            }`}
                          >
                            {text(step)}
                          </div>
                          {(sub(step) || i === nextIdx) && (
                            <div className="mt-0.5 text-[11px] font-bold text-neutral-500">
                              {i === nextIdx && <span className="text-[#2f80e0]">Next up</span>}
                              {i === nextIdx && sub(step) ? ' · ' : ''}
                              {sub(step)}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}

                {/* finish */}
                <li className="absolute h-0 w-0" style={{ left: pctX(geo, geo.end.x), top: pctY(geo, geo.end.y) }}>
                  <div className="absolute left-0 top-0 flex h-0 w-0 items-center justify-center">
                    <div className="pop-node finish-node h-14 w-14 shrink-0" style={HIDDEN}>
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full border-[3px] border-white text-xl shadow-md transition-colors duration-500 ${
                          allDone ? 'bg-[#2f9e62] text-white' : 'bg-[#0b0b2b] text-white'
                        }`}
                      >
                        <FaFlagCheckered aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-0 top-9 flex h-0 w-0 justify-center">
                    <div className="pop-label w-[200px] shrink-0 text-center" style={HIDDEN}>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Goal</div>
                      <div className="text-sm font-extrabold leading-tight text-black">{career.title}</div>
                    </div>
                  </div>

                  {/* confetti, hidden until the last step is finished */}
                  <div className="pointer-events-none absolute left-0 top-0 h-0 w-0" aria-hidden="true">
                    {Array.from({ length: 16 }).map((_, k) => (
                      <span
                        key={k}
                        className="confetti absolute left-0 top-0 h-2 w-2 rounded-sm"
                        style={{ background: CONFETTI[k % CONFETTI.length], opacity: 0 }}
                      />
                    ))}
                  </div>
                </li>
              </ol>

              {/* the traveler: your MBTI character, walks along the route */}
              <div
                ref={charRef}
                className="pointer-events-none absolute z-20 h-0 w-0"
                style={{ left: pctX(geo, geo.start.x), top: pctY(geo, geo.start.y) }}
                aria-hidden="true"
              >
                <div className="absolute bottom-[26px] left-0 w-0">
                  <div ref={bobRef} className="-ml-[38px] w-[76px] sm:-ml-[44px] sm:w-[88px]">
                    {theme ? (
                      <MbtiCharacter code={pred.mbti} className="w-full drop-shadow-lg" />
                    ) : (
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#2f80e0] text-xs font-extrabold text-white shadow-lg">
                        You
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FOCUS CARD + CHEER CHARACTER */}
            <aside className="sticky bottom-3 z-30 min-w-0 lg:bottom-auto lg:top-6">
              {/* mobile: small character floating above the focus card, follows you as you scroll */}
              {theme && !isDesktop && (
                <MiniCheer
                  code={pred.mbti}
                  theme={theme}
                  progress={progress}
                  allDone={allDone}
                  celebrate={celebrate}
                  nextTitle={nextIdx >= 0 ? text(steps[nextIdx]) : ''}
                />
              )}

              <div className="space-y-4">
                <div
                  className="max-h-[50vh] overflow-y-auto rounded-2xl border-2 border-[#0b0b2b] bg-white p-4 shadow-lg sm:p-5 lg:max-h-none"
                  aria-live="polite"
                >
                  {theme && (
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: theme.dark }}>
                      {String(pred.mbti).toUpperCase()} · {theme.name}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-neutral-500">
                      Step {active + 1} of {steps.length}
                    </span>
                    {activeDone ? (
                      <span className="rounded-full bg-[#eaf6ef] px-3 py-1 text-xs font-extrabold text-[#2f9e62]">Done</span>
                    ) : active === nextIdx ? (
                      <span className="rounded-full bg-[#2f80e0] px-3 py-1 text-xs font-extrabold text-white">Next up</span>
                    ) : null}
                    {sub(activeStep) && (
                      <span className="rounded-full bg-[#f3e6d3] px-3 py-1 text-xs font-bold text-neutral-700">{sub(activeStep)}</span>
                    )}
                  </div>

                  <div
                    className={`mt-2 break-words text-lg font-extrabold leading-snug sm:text-xl ${
                      activeDone ? 'text-neutral-400 line-through' : 'text-black'
                    }`}
                  >
                    {text(activeStep)}
                  </div>

                  {detail(activeStep) && (
                    <div className="mt-2 text-sm leading-relaxed text-neutral-600">{detail(activeStep)}</div>
                  )}

                  <details className="group mt-3">
                    <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-bold text-[#0b0b2b] [&::-webkit-details-marker]:hidden">
                      Find courses for this step
                      <Chevron className="!h-4 !w-4" />
                    </summary>
                    <div className="mt-2">
                      <CourseLinks topic={text(activeStep)} />
                    </div>
                  </details>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={finishActive}
                      className={`h-10 rounded-full px-5 text-xs font-extrabold uppercase tracking-wide transition ${
                        activeDone
                          ? 'border border-[#d9c8ae] bg-white text-neutral-700 hover:border-[#0b0b2b]'
                          : 'bg-[#0b0b2b] text-white hover:bg-[#1a1a4a]'
                      }`}
                    >
                      {activeDone ? 'Mark as not done' : 'Mark as done'}
                    </button>

                    <div className="ml-auto flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => goTo(active - 1)}
                        disabled={active === 0}
                        aria-label="Previous step"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9c8ae] bg-white text-sm font-bold text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => goTo(active + 1)}
                        disabled={active === steps.length - 1}
                        aria-label="Next step"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9c8ae] bg-white text-sm font-bold text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>

                {/* desktop: your character greets you, then cheers you on in the empty side space */}
                {theme && isDesktop && (
                  <CheerCard
                    code={pred.mbti}
                    theme={theme}
                    progress={progress}
                    allDone={allDone}
                    celebrate={celebrate}
                    nextTitle={nextIdx >= 0 ? text(steps[nextIdx]) : ''}
                  />
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Skills check: two cards, course links tucked away */}
      {(have.length > 0 || need.length > 0) && (
        <section>
          <h2 className="text-xl font-extrabold text-black">Skills check</h2>
          <div className="text-sm text-neutral-500">Based on the skills you entered in this prediction</div>

          <div className="mt-4 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="rounded-3xl bg-[#eaf6ef] p-5">
              <Label cls="text-[#2f9e62]">You already have</Label>
              {have.length ? (
                <Chips items={have} cls="border-[#bfe3cd]" />
              ) : (
                <div className="mt-2 text-sm text-neutral-600">None of the key skills yet.</div>
              )}
            </div>

            <div className="rounded-3xl bg-[#fcecec] p-5">
              <Label cls="text-[#e0404a]">Still to build</Label>
              {need.length ? (
                <div className="mt-3">
                  {need.map((skill) => (
                    <SkillRow key={skill} skill={skill} />
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-neutral-600">You already cover every key skill.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Merged learning resources + education */}
      <Box className="py-2">
        <Acc title="Learning resources" hint={`Courses for ${career.title} and the skills it uses`}>
          <div className="text-sm text-neutral-500">These links open search results on each platform, so you can compare and pick.</div>
          <CourseLinks topic={career.title ?? ''} />

          {!need.length && courseSkills.length > 0 && (
            <div className="space-y-3 border-t border-[#e6d8c3] pt-4">
              <Label>Skills this career uses</Label>
              {courseSkills.map((skill) => (
                <div key={skill} className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <span className="text-sm font-extrabold text-black">{skill}</span>
                  <CourseLinks topic={skill} />
                </div>
              ))}
            </div>
          )}

          {(technical.length > 0 || soft.length > 0 || other.length > 0) && (
            <div className="space-y-3 border-t border-[#e6d8c3] pt-4">
              {technical.length > 0 && (
                <div>
                  <Label>Technical</Label>
                  <Chips items={technical} />
                </div>
              )}
              {soft.length > 0 && (
                <div>
                  <Label>Soft skills</Label>
                  <Chips items={soft} />
                </div>
              )}
              {other.length > 0 && (
                <div>
                  <Label>Other</Label>
                  <Chips items={other} />
                </div>
              )}
            </div>
          )}
        </Acc>

        {hasEdu && (
          <Acc title="Education and certificates" hint="Typical education, related programs and certificates">
            {roadmap.education?.typical && (
              <div>
                <Label>Typical education</Label>
                <div className="mt-1 text-base font-semibold text-neutral-800">{text(roadmap.education.typical)}</div>
              </div>
            )}
            {programs.length > 0 && (
              <div>
                <Label>Related programs</Label>
                <Chips items={programs} />
              </div>
            )}
            {reported.length > 0 && (
              <div>
                <Label>Reported by people in this job</Label>
                <Chips items={reported} />
              </div>
            )}
            {certificates.length > 0 && (
              <div>
                <Label>Certificates</Label>
                <Chips items={certificates} />
              </div>
            )}
          </Acc>
        )}
      </Box>

      {roadmap.note && <div className="text-sm leading-relaxed text-neutral-500">{text(roadmap.note)}</div>}

      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Link
          to={BACK}
          className="rounded-full border border-[#d9c8ae] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b]"
        >
          Choose a different career
        </Link>
        <Link
          to="/assessment"
          className="rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          + New prediction
        </Link>
      </div>
    </div>
  )
}

export default UserRoadMap