import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import { FaCheck, FaCheckCircle, FaFlagCheckered, FaPlay, FaStar, FaYoutube } from 'react-icons/fa'
import { SiCoursera, SiUdemy } from 'react-icons/si'
import { getLatestPrediction, getPrediction, getRoadmap, listPredictions } from '../../api/predictions'
import MbtiCharacter, { mbtiTheme } from './UsersComponents/MbtiCharacter'
import PageLoader, { cacheMbti, getCachedMbti } from './UsersComponents/PageLoader'

/* ------------------------------------------------------------------ */
/* UserRoadMap                                                         */
/*                                                                     */
/* The map is a bright, parchment-style flat (2D) "island" with a      */
/* road winding across it, a river with a bridge, buildings, trees,    */
/* clouds, a compass and a plane.                                      */
/*                                                                     */
/*   - mobile / tablet (under 1024px): the road winds DOWN the island   */
/*   - desktop (1024px and up): the road runs ACROSS the island, which  */
/*     scrolls sideways when it is long                                 */
/*                                                                     */
/* Required steps sit on the MAIN road. Optional steps (see isOptional)*/
/* never block the goal: each one hangs on a purple dashed SIDE PATH   */
/* that branches off the last main step before it.                     */
/*                                                                     */
/* Your MBTI character walks the map (and detours onto side paths).    */
/* The cheering character + speech bubble floats above the focus card  */
/* on every screen size, desktop included.                             */
/*                                                                     */
/* While the roadmap loads, PageLoader shows the "bars get built"      */
/* effect with your own MBTI character on top.                         */
/*                                                                     */
/* All map animations (entrance, preview walk, trail, walk, pulse,     */
/* celebration) and the cheering character wait until the loader has   */
/* finished and is gone (see animReady).                               */
/*                                                                     */
/* v2 roadmaps: the focus card shows each step's tasks as a CHECKLIST. */
/* Tick each task as you do it. Ticking the last task finishes the     */
/* step (with the celebration), unticking one reopens it. Ticks are    */
/* saved per prediction + career.                                      */
/* Every task shows: title, timing, hours, why, and numbered actions.  */
/* (No "proof" and no "free resources" lines.) Two plan-wide notes     */
/* ("Skills you can already claim" and "How to run this plan with      */
/* your style") are hidden, see HIDDEN_TASKS below.                    */
/* If a step has no tasks, its own actions / tasks / items / checklist */
/* list is used instead. The header shows hours per week + total hours.*/
/* ------------------------------------------------------------------ */

const BACK = '/dashboard'
const SIDE = '#8b5cf6' // side path (optional steps)
const HIDDEN = { opacity: 0 } // animated in by anime.js
const CONFETTI = ['#2f80e0', '#f2c230', '#e0404a', '#2f9e62', '#0b0b2b', '#8b5cf6']

const ROAD_LINES = [
  'Finding your selected career...',
  'Drawing your road...',
  'Placing every step on the map...',
  'Getting your character ready...',
]

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

/* Tasks that are NOT shown in the checklist (plan-wide notes, not things you tick off).
   Add another pattern here to hide more. */
const HIDDEN_TASKS = [/^\s*skills you can already claim/i, /^\s*how to run this plan/i]

/* "Why: ..." lines inside the actions are shown as a short note, not as a numbered action */
const WHY_RE = /^\s*why\s*:\s*/i

/* the tasks inside a step (the checklist), each with the hours it takes */
const mapSub = (sb) => {
  if (typeof sb === 'string') return { title: sb.trim(), timeframe: '', hours: 0, why: '', actions: [], tag: '' }
  const raw = list(sb?.actions).map(text).filter(Boolean)
  const whyAction = raw.find((a) => WHY_RE.test(a))
  return {
    title: String(text(sb) || '').trim(),
    timeframe: String(sb?.timeframe ?? ''),
    hours: Number(sb?.hours) || 0,
    why: String(sb?.why ?? '').trim() || (whyAction ? whyAction.replace(WHY_RE, '').trim() : ''),
    actions: raw.filter((a) => !WHY_RE.test(a)),
    tag: String(sb?.tag ?? ''),
  }
}

/* If the step has no `substeps`, its own actions / tasks / items / checklist list is used instead. */
const substepsOf = (x) => {
  const keep = (sb) => sb.title && !HIDDEN_TASKS.some((re) => re.test(sb.title))
  const own = list(x?.substeps).map(mapSub).filter(keep)
  if (own.length) return own
  const loose = x?.actions ?? x?.tasks ?? x?.items ?? x?.checklist
  return list(loose).map(mapSub).filter(keep)
}

/* Title Case: capitalise the first letter of every word ("build core skills" -> "Build Core Skills") */
const tc = (s) => String(s ?? '').replace(/(^|[\s(/\-–])([a-z])/g, (_, a, b) => a + b.toUpperCase())

/* A step is optional when the API says so (optional / isOptional / required:false / type:'optional')
   or when its title is tagged, e.g. "Optional: Learn Docker" or "Learn Docker (optional)". */
const OPT_TAG = /^\s*optional\b\s*[:\-–]?\s*|\s*[([]\s*optional\s*[)\]]/i
const isOptional = (x) => {
  if (x && typeof x === 'object') {
    if (x.optional === true || x.isOptional === true || x.required === false) return true
    const k = String(x.type ?? x.kind ?? x.category ?? '').toLowerCase()
    if (k === 'optional') return true
  }
  return OPT_TAG.test(text(x))
}
// title without the "(optional)" tag (the side path already says it), in Title Case
const title = (x) => {
  const t = text(x)
  const c = t.replace(OPT_TAG, ' ').trim() || t
  return tc(c)
}

/* ------------------------------------------------------------------ */
/* Logical order                                                       */
/* The API doesn't always return steps in the order you would really   */
/* do them (e.g. "degree, skills, internship, job search" even though  */
/* the skills are built DURING school). So we read each step's timing  */
/* text ("years 1-4", "last 6-12 months of school", "0-6 months after  */
/* graduating"...) plus a few keywords, and sort into a real timeline: */
/*   school + the skills built alongside it -> internship ->           */
/*   graduation -> job search.                                         */
/* Steps that run at the same time get an "alongside step N" note.     */
/* If a roadmap has no readable timing, its order is left untouched.   */
/*                                                                     */
/* Only the FIRST degree step is "graduation" (primary). Any later     */
/* degree step (e.g. a graduate / professional degree) comes AFTER it. */
/* Steps with unreadable timing stay right after the step before them. */
/* ------------------------------------------------------------------ */
const NUM = '(\\d+(?:\\.\\d+)?)'
const RNG = `${NUM}(?:\\s*(?:-|–|to)\\s*${NUM})?`
const unitMonths = (u) => (/^y/i.test(u) ? 12 : /^w/i.test(u) ? 0.25 : 1)

const readTiming = (raw) => {
  const t = String(raw || '')
    .toLowerCase()
    .replace(/[~≈]|\b(about|around|roughly|approximately)\b/g, ' ')
  let m = t.match(new RegExp(`${RNG}\\s*(months?|years?|weeks?)\\s*(?:after|post-?|following)`))
  if (m) {
    const u = unitMonths(m[3])
    return { kind: 'after', a: Number(m[1]) * u, b: Number(m[2] ?? m[1]) * u }
  }
  m = t.match(new RegExp(`last\\s+${RNG}\\s*(months?|years?|weeks?)`))
  if (m) return { kind: 'last', len: Math.max(Number(m[1]), Number(m[2] ?? m[1])) * unitMonths(m[3]) }
  m = t.match(/\b(?:years?|yrs?)\s*(\d+)(?:\s*(?:-|–|to)\s*(\d+))?/)
  if (m) return { kind: 'span', start: (Number(m[1]) - 1) * 12, end: Number(m[2] ?? m[1]) * 12 }
  m = t.match(new RegExp(`${RNG}\\s*(months?|years?|weeks?)`))
  if (m) return { kind: 'dur', months: Math.max(Number(m[1]), Number(m[2] ?? m[1])) * unitMonths(m[3]) }
  return null
}

const isEdu = (t) =>
  /\b(degree|bachelor['’]?s?|master['’]?s|associate['’]?s?|diploma|undergraduate|postgraduate|college|university)\b/i.test(t) &&
  !/\b(skills?|projects?|intern\w*|certif\w*)\b/i.test(t)
const isIntern = (t) => /\b(intern(ship)?s?|apprentice(ship)?|co-?op|practicum|placement|residency|externship|fieldwork)\b/i.test(t)
const isJob = (t) =>
  !isIntern(t) && /\b(jobs?|apply(ing)?|applications?|interviews?|resume|hiring|employment|first role|entry-level)\b/i.test(t)

const arrangeSteps = (raw) => {
  const items = raw.map((s, idx) => {
    const t = title(s)
    return { s, key: String(idx), t, tm: readTiming(sub(s)), edu: isEdu(t), primary: false, intern: isIntern(t), job: isJob(t), win: null }
  })
  if (!items.length) return []

  // how long school lasts (months), only when the roadmap includes a degree step.
  // The FIRST degree step is the main one (graduation); later degree steps come after it.
  const eduItem = items.find((x) => x.edu)
  let gradEnd = null
  if (eduItem) {
    eduItem.primary = true
    const tm = eduItem.tm
    gradEnd = tm?.kind === 'dur' ? tm.months : tm?.kind === 'span' ? tm.end : 48
  }

  // give every step a time window (months from the start of the journey)
  let prev = null
  let prevKey = 0
  items.forEach((x) => {
    const tm = x.tm
    let win = null
    if (tm?.kind === 'span') win = { start: tm.start, end: tm.end }
    else if (tm?.kind === 'last' && gradEnd != null) win = { start: Math.max(0, gradEnd - tm.len), end: gradEnd }
    else if (tm?.kind === 'after' && gradEnd != null) win = { start: gradEnd + tm.a, end: gradEnd + tm.b }
    else if (x.primary && gradEnd != null) win = { start: 0, end: gradEnd }
    else if (x.edu && gradEnd != null) {
      // a later degree (graduate / professional) starts once the first degree is done
      const len = tm?.kind === 'dur' ? tm.months : 24
      win = { start: gradEnd, end: gradEnd + len }
    } else if (x.intern && gradEnd != null) win = { start: Math.max(0, gradEnd - 12), end: gradEnd }
    else if (x.job && gradEnd != null) win = { start: gradEnd, end: gradEnd + 6 }
    if (win) x.win = win
    else {
      x.win = prev ? { start: prev.start, end: prev.end } : { start: 0, end: 0 } // unknown: stay right after the previous step
      x.guess = true
    }
    // "Complete the degree" means graduating, so it sorts at the END of school (after the skills and internship done during it).
    // A step with unknown timing sorts just AFTER the step before it, so it never jumps ahead of a degree.
    x.sortKey = x.primary && gradEnd != null ? gradEnd - 0.01 : x.guess ? prevKey + 0.001 : x.win.start
    prev = x.win
    prevKey = x.sortKey
  })

  const rank = (x) => (x.primary ? 1 : 0)
  const phaseOf = (x) =>
    gradEnd == null || x.guess
      ? ''
      : x.primary
        ? 'Graduation'
        : x.win.start >= gradEnd
          ? 'After graduating'
          : x.win.start >= gradEnd - 12 && x.win.end <= gradEnd
            ? 'Final year'
            : 'During school'

  return items
    .map((x, idx) => ({ x, idx }))
    .sort((a, b) => a.x.sortKey - b.x.sortKey || rank(a.x) - rank(b.x) || a.x.win.end - b.x.win.end || a.idx - b.idx)
    .map(({ x }) => ({ ...x, phase: phaseOf(x) }))
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

/* ------------------------------------------------------------------ */
/* Celebration effects: confetti, stars, rings and a floating word      */
/* They are plain DOM pieces added to the map's overlay, animated with  */
/* the Web Animations API, and removed again when they finish.          */
/* ------------------------------------------------------------------ */
const FX_WORDS = ['Nice!', 'Awesome!', 'Great job!', 'On a roll!']
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const fxAdd = (root, left, top, css) => {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = `position:absolute;left:${left};top:${top};pointer-events:none;${css}`
  root.appendChild(el)
  return el
}

const fxRun = (el, frames, opts) => {
  const a = el.animate(frames, { fill: 'both', ...opts })
  a.onfinish = () => el.remove()
  return a
}

/* confetti, stars, two rings and a floating word, all flying out of one point */
const popAt = (root, left, top, { count = 46, spread = 150, ring = '#2f80e0', word = '', colors = CONFETTI } = {}) => {
  for (let k = 0; k < count; k++) {
    const w = rnd(5, 10)
    const h = Math.random() < 0.4 ? w : rnd(9, 17)
    const el = fxAdd(
      root,
      left,
      top,
      `z-index:41;width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;background:${pick(colors)};border-radius:${Math.random() < 0.3 ? '50%' : '2px'};`
    )
    const a = rnd(-Math.PI * 0.98, -Math.PI * 0.02) // fans out upwards
    const dist = rnd(spread * 0.35, spread)
    const dx = Math.cos(a) * dist
    const dy = Math.sin(a) * dist
    const rot = rnd(-540, 540)
    fxRun(
      el,
      [
        { transform: 'translate(0px,0px) rotate(0deg) scale(.3)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${rot * 0.5}deg) scale(1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx * 1.12}px,${dy + rnd(50, 120)}px) rotate(${rot}deg) scale(.8)`, opacity: 0 },
      ],
      { duration: rnd(1100, 1800), delay: rnd(0, 140), easing: 'cubic-bezier(.2,.7,.3,1)' }
    )
  }

  for (let k = 0; k < 8; k++) {
    const fs = rnd(14, 24)
    const el = fxAdd(
      root,
      left,
      top,
      `z-index:42;font-size:${fs}px;line-height:1;color:${pick(['#f5c518', '#f2c230', '#fff'])};margin:${-fs / 2}px 0 0 ${-fs / 2}px;text-shadow:0 1px 2px rgba(0,0,0,.3);`
    )
    el.textContent = '★'
    const a = (k / 8) * Math.PI * 2 + rnd(-0.2, 0.2)
    const dist = rnd(spread * 0.3, spread * 0.7)
    fxRun(
      el,
      [
        { transform: 'translate(0px,0px) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist}px) scale(1.2) rotate(120deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${Math.cos(a) * dist * 1.2}px,${Math.sin(a) * dist * 1.2}px) scale(.3) rotate(260deg)`, opacity: 0 },
      ],
      { duration: rnd(800, 1200), delay: rnd(0, 120), easing: 'ease-out' }
    )
  }

  ;[0, 200].forEach((d) => {
    const r = fxAdd(root, left, top, `z-index:40;width:24px;height:24px;margin:-12px 0 0 -12px;border:3px solid ${ring};border-radius:50%;`)
    fxRun(r, [{ transform: 'scale(.3)', opacity: 0.9 }, { transform: 'scale(4.5)', opacity: 0 }], { duration: 900, delay: d, easing: 'ease-out' })
  })

  if (word) {
    const p = fxAdd(
      root,
      left,
      top,
      `z-index:43;padding:3px 10px;border-radius:999px;background:${ring};color:#fff;font:800 12px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);margin-top:-34px;`
    )
    p.textContent = word
    fxRun(
      p,
      [
        { transform: 'translate(-50%,6px) scale(.5)', opacity: 0 },
        { transform: 'translate(-50%,-22px) scale(1.1)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%,-54px) scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%,-76px) scale(1)', opacity: 0 },
      ],
      { duration: 1500, easing: 'ease-out' }
    )
  }
}

/* confetti falling over the whole map (used when the goal is reached) */
const rainDown = (root, count = 100) => {
  const H = root.clientHeight || 400
  for (let k = 0; k < count; k++) {
    const w = rnd(5, 9)
    const h = rnd(8, 15)
    const el = fxAdd(
      root,
      `${rnd(1, 99)}%`,
      '0px',
      `z-index:41;width:${w}px;height:${h}px;margin:${-h - 10}px 0 0 ${-w / 2}px;background:${pick(CONFETTI)};border-radius:2px;`
    )
    const sway = rnd(-70, 70)
    fxRun(
      el,
      [
        { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
        { transform: `translate(${sway * 0.5}px,${H * 0.5}px) rotate(${rnd(200, 400)}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${sway}px,${H + 30}px) rotate(${rnd(500, 900)}deg)`, opacity: 0.9 },
      ],
      { duration: rnd(1800, 3000), delay: rnd(0, 1200), easing: 'ease-in' }
    )
  }
}

/* NOTE: text uses <div>/<span> with explicit sizes, because the global p { font-size: var(--text-body) } rule overrides Tailwind sizes */

/* ------------------------------------------------------------------ */
/* Map geometry                                                        */
/* The route is laid out on a flat "logical" plane (x, y). Every point */
/* is run through proj(), which now maps the plane 1:1 onto the screen */
/* (flat 2D map: no tilt, no visible island sides).                    */
/* Paths, stops, the character and the scenery all use the same        */
/* projection, so they always line up.                                 */
/*   k  = lean (0 = none)                                               */
/*   c  = depth scale (1 = no squashing)                                */
/*   ex, ey = island thickness (0 = flat)                               */
/*   OX, OY = room for the sky (clouds, sun, plane) above the island    */
/* ------------------------------------------------------------------ */
const P = { W: 400, ROW: 150, TOP: 118, FIRST: 214, LEFT: 92, RIGHT: 308, SIDE0: 105, SIDE: 110, GAP: 170 }

const ISO = {
  port: { k: 0, c: 1, OX: 22, OY: 100, ex: 0, ey: 0, padR: 26, padB: 40 },
  land: { k: 0, c: 1, OX: 34, OY: 96, ex: 0, ey: 0, padR: 30, padB: 40 }, // try c: 0.8 for a shorter desktop map
}

const rd = (n) => Math.round(n * 10) / 10

const vertical = (a, b) => {
  const dy = b.y - a.y
  return [
    { x: a.x, y: a.y + dy * 0.5 },
    { x: b.x, y: b.y - dy * 0.5 },
  ]
}
const horizontal = (a, b) => {
  const dx = b.x - a.x
  return [
    { x: a.x + dx * 0.5, y: a.y },
    { x: b.x - dx * 0.5, y: b.y },
  ]
}

/* smooth cubic route through pts (logical), drawn in projected space,
   with length samples so we can walk along it. Each sample keeps both its
   screen position (x, y) and its logical position (lx, ly). */
const trace = (pts, ctrl, proj) => {
  const p0 = proj(pts[0])
  let d = `M ${rd(p0.x)} ${rd(p0.y)}`
  const samples = [{ x: p0.x, y: p0.y, lx: pts[0].x, ly: pts[0].y, len: 0 }]
  const cum = [0]
  let total = 0
  let prev = p0
  for (let j = 0; j < pts.length - 1; j++) {
    const a = pts[j]
    const b = pts[j + 1]
    const [c1, c2] = ctrl(a, b, j)
    const q1 = proj(c1)
    const q2 = proj(c2)
    const qb = proj(b)
    d += ` C ${rd(q1.x)} ${rd(q1.y)} ${rd(q2.x)} ${rd(q2.y)} ${rd(qb.x)} ${rd(qb.y)}`
    const STEPS = 24
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS
      const m = 1 - t
      const lx = m * m * m * a.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * b.x
      const ly = m * m * m * a.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * b.y
      const q = proj({ x: lx, y: ly })
      total += Math.hypot(q.x - prev.x, q.y - prev.y)
      samples.push({ x: q.x, y: q.y, lx, ly, len: total })
      prev = q
    }
    cum.push(total)
  }
  return { d, samples, total, fracs: cum.map((l) => l / (total || 1)) }
}

/* counts[m] = how many optional steps hang off main step m */
const buildMap = (counts, mode) => {
  const n = counts.length
  const maxK = Math.max(0, ...counts)
  const cfg = ISO[mode]
  let start, end, nodes, LW, LH, sideAt, ROAD_Y

  if (mode === 'port') {
    let y = P.FIRST
    nodes = counts.map((k, i) => {
      const nd = { x: i % 2 === 0 ? P.LEFT : P.RIGHT, y }
      y += k ? P.SIDE0 + (k - 1) * P.SIDE + P.GAP : P.ROW // leave room for the side path AND its label before the next stop
      return nd
    })
    const lastK = counts[n - 1]
    start = { x: P.W / 2, y: P.TOP }
    end = { x: P.W / 2, y: nodes[n - 1].y + (lastK ? P.SIDE0 + (lastK - 1) * P.SIDE + P.GAP + 5 : 125) }
    LW = P.W
    LH = end.y + 115
    sideAt = (nd, j, m) => ({ x: m % 2 === 0 ? 70 : 330, y: nd.y + P.SIDE0 + j * P.SIDE })
  } else {
    const gap = Math.max(210, Math.floor(620 / n))
    ROAD_Y = maxK ? 290 + (maxK - 1) * 100 : 240 // headroom for side paths and the character
    const ZIG = 90 // how far the road swings up and down: every other stop is high, then low
    nodes = counts.map((_, i) => ({
      x: 190 + i * gap,
      y: ROAD_Y + (i % 2 === 0 ? -ZIG : ZIG),
    }))
    start = { x: 70, y: ROAD_Y }
    end = { x: nodes[n - 1].x + 150, y: ROAD_Y }
    LW = end.x + 110
    LH = ROAD_Y + 230
    sideAt = (nd, j) => ({ x: nd.x + (j % 2 === 0 ? 20 : -6), y: nd.y - 105 - j * 100 })
  }

  const proj = (p) => ({ x: cfg.OX + p.x + (LH - p.y) * cfg.k, y: cfg.OY + p.y * cfg.c })
  const W = Math.ceil(cfg.OX + LW + LH * cfg.k + cfg.ex + cfg.padR)
  const H = Math.ceil(cfg.OY + LH * cfg.c + cfg.ey + cfg.padB)

  const chain = [start, ...nodes, end]
  const main = trace(chain, mode === 'port' ? vertical : horizontal, proj)

  const branches = {}
  counts.forEach((k, m) => {
    if (!k) return
    const pts = [nodes[m], ...Array.from({ length: k }, (_, j) => sideAt(nodes[m], j, m))]
    const out = mode === 'port' ? (m % 2 === 0 ? -1 : 1) : 0
    const t = trace(
      pts,
      (a, b, j) =>
        j === 0 && out
          ? [
              { x: a.x + out * 50, y: a.y + 25 },
              { x: b.x, y: b.y - 45 },
            ]
          : vertical(a, b),
      proj
    )
    branches[m] = { ...t, nodes: pts.slice(1).map(proj), lnodes: pts.slice(1) }
  })

  /* the river: runs between two stops and crosses the road under a bridge */
  const rm = Math.floor((chain.length - 2) / 2)
  let rpts
  if (mode === 'land') {
    const rx = (chain[rm].x + chain[rm + 1].x) / 2
    rpts = [
      { x: rx - 24, y: -18 },
      { x: rx + 22, y: LH * 0.3 },
      { x: rx - 16, y: LH * 0.62 },
      { x: rx + 14, y: LH + 14 },
    ]
  } else {
    const ry = chain[rm + 1].y - 40
    rpts = [
      { x: -18, y: ry - 30 },
      { x: LW * 0.36, y: ry + 16 },
      { x: LW * 0.68, y: ry - 14 },
      { x: LW + 14, y: ry + 24 },
    ]
  }
  const river = trace(rpts, mode === 'land' ? vertical : horizontal, proj)

  /* where the main road meets the river: that stretch becomes a bridge */
  let best = 1
  let bestD = Infinity
  main.samples.forEach((s, idx) => {
    let m = Infinity
    river.samples.forEach((r) => {
      const dd = Math.hypot(s.lx - r.lx, s.ly - r.ly)
      if (dd < m) m = dd
    })
    if (m < bestD) {
      bestD = m
      best = idx
    }
  })
  const b0 = Math.max(0, best - 5)
  const b1 = Math.min(main.samples.length - 1, best + 5)
  const bridge = main.samples
    .slice(b0, b1 + 1)
    .map((s, i) => `${i ? 'L' : 'M'} ${rd(s.x)} ${rd(s.y)}`)
    .join(' ')

  return {
    mode,
    W,
    H,
    LW,
    LH,
    ROAD_Y,
    proj,
    d: main.d,
    samples: main.samples,
    total: main.total,
    start: proj(start),
    end: proj(end),
    lstart: start,
    lend: end,
    nodes: nodes.map(proj),
    lnodes: nodes,
    nodeFrac: main.fracs.slice(1, -1),
    branches,
    river,
    bridge,
    slab: {
      tl: proj({ x: 0, y: 0 }),
      tr: proj({ x: LW, y: 0 }),
      br: proj({ x: LW, y: LH }),
      bl: proj({ x: 0, y: LH }),
    },
  }
}

/* point on a route (main or branch) at fraction f (0 to 1) */
const posAt = (route, f) => {
  const target = Math.max(0, Math.min(1, f)) * route.total
  const s = route.samples
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

/* ------------------------------------------------------------------ */
/* Scenery (flat, front-view)                                          */
/* Every piece has an outer <g> that places it and an inner <g> with    */
/* class "pop-deco" that anime.js fades / drops in.                     */
/* ------------------------------------------------------------------ */
const TONES = [
  { l: '#eef2fa', r: '#cfd8ea', t: '#fbfcff', w: '#8ec3ee', w2: '#a9d2f3' },
  { l: '#f8ecda', r: '#e2cfb0', t: '#fffaf0', w: '#9fcbea', w2: '#b6daf1' },
  { l: '#dcecf9', r: '#b8d1e8', t: '#f0f7fd', w: '#7db6e8', w2: '#9bc9ef' },
]

/* a flat office block: one face, rows of windows and an antenna on tall ones */
const Building = ({ h, tone }) => {
  const c = TONES[Math.abs(tone) % 3]
  const rows = Math.max(1, Math.floor((h - 16) / 13))
  return (
    <>
      <ellipse cx="0" cy="-2" rx="22" ry="5" fill="#1b3a14" opacity=".12" />
      <rect x="-16" y={-h} width="32" height={h} rx="3" fill={c.l} stroke={c.r} strokeWidth="2" />
      {Array.from({ length: rows }).flatMap((_, r) =>
        [0, 1].map((k) => (
          <rect key={`${r}-${k}`} x={-10 + k * 12} y={-h + 8 + r * 13} width="8" height="7" rx="1.5" fill={c.w} />
        ))
      )}
      {h > 80 && <line x1="0" y1={-h} x2="0" y2={-h - 12} stroke="#8b95a5" strokeWidth="1.6" strokeLinecap="round" />}
    </>
  )
}

const IsoHouse = () => (
  <>
    <ellipse cx="0" cy="-2" rx="20" ry="5" fill="#1b3a14" opacity=".12" />
    <rect x="-14" y="-22" width="28" height="22" fill="#fbefdc" stroke="#e6d3b6" strokeWidth="2" />
    <polygon points="-18,-22 0,-38 18,-22" fill="#ee6b5e" />
    <rect x="-4" y="-13" width="8" height="13" rx="1" fill="#9c7a52" />
    <rect x="6" y="-18" width="6" height="6" fill="#b3dcf4" />
  </>
)

const LIFT = { tree: 22, pine: 22, bush: 22, flowers: 22 } // these are drawn around their centre, so lift them onto the ground

const Deco = ({ type, x, y, h = 64, tone = 0 }) => (
  <g transform={`translate(${rd(x)} ${rd(y - (LIFT[type] ?? 0))})`}>
    <g className="pop-deco" style={HIDDEN}>
      {type === 'building' && <Building h={h} tone={tone} />}
      {type === 'house' && <IsoHouse />}
      {type === 'tree' && (
        <>
          <ellipse cx="0" cy="24" rx="19" ry="6" fill="#1b3a14" opacity=".14" />
          <rect x="-3" y="6" width="6" height="18" rx="2" fill="#9c7a52" />
          <circle cx="0" cy="-4" r="17" fill="#5fb06a" />
          <circle cx="-3" cy="-16" r="11" fill="#74c37b" />
          <circle cx="6" cy="-10" r="5" fill="#92d998" opacity=".7" />
        </>
      )}
      {type === 'pine' && (
        <>
          <ellipse cx="0" cy="24" rx="17" ry="5.5" fill="#1b3a14" opacity=".14" />
          <rect x="-2.5" y="12" width="5" height="12" rx="2" fill="#9c7a52" />
          <polygon points="0,-30 -16,0 16,0" fill="#4fa064" />
          <polygon points="0,-18 -20,12 20,12" fill="#63b878" />
        </>
      )}
      {type === 'bush' && (
        <>
          <ellipse cx="0" cy="22" rx="26" ry="6" fill="#1b3a14" opacity=".12" />
          <ellipse cx="0" cy="14" rx="26" ry="10" fill="#70bf7b" />
          <ellipse cx="-12" cy="8" rx="13" ry="10" fill="#5fb06a" />
          <ellipse cx="12" cy="9" rx="12" ry="9" fill="#86d28f" />
        </>
      )}
      {type === 'flowers' && (
        <>
          <ellipse cx="0" cy="18" rx="24" ry="7" fill="#86d28f" />
          {[-14, -3, 9, 17].map((fx, k) => (
            <g key={fx} transform={`translate(${fx} ${10 - (k % 2) * 6})`}>
              <line x1="0" y1="0" x2="0" y2="10" stroke="#4fa064" strokeWidth="2" />
              <circle r="4.5" fill={['#e0404a', '#f2c230', '#8b5cf6', '#2f80e0'][k]} />
              <circle r="1.7" fill="#fff9ea" />
            </g>
          ))}
        </>
      )}
      {type === 'lake' && (
        <>
          <ellipse cx="0" cy="0" rx="54" ry="19" fill="#a3d6f0" stroke="#82c2e6" strokeWidth="2.5" />
          <ellipse cx="-8" cy="-3" rx="38" ry="11" fill="#cdeafa" opacity=".85" />
          <path d="M -30 -2 q 8 -5 16 0 M 0 5 q 8 -5 16 0 M 14 -6 q 8 -5 16 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <animate attributeName="opacity" values=".4;1;.4" dur="3s" repeatCount="indefinite" />
          </path>
        </>
      )}
    </g>
  </g>
)

const Cloud = ({ x, y, s = 1, dur = 18, drift = 26, rm }) => (
  <g transform={`translate(${rd(x)} ${rd(y)}) scale(${s})`}>
    <g className="pop-deco" style={HIDDEN}>
      <g>
        {!rm && (
          <animateTransform attributeName="transform" type="translate" values={`0 0;${drift} 0;0 0`} dur={`${dur}s`} repeatCount="indefinite" />
        )}
        <ellipse cx="0" cy="0" rx="28" ry="11" fill="#fff" fillOpacity=".97" />
        <ellipse cx="-15" cy="-6" rx="14" ry="10" fill="#fff" fillOpacity=".97" />
        <ellipse cx="10" cy="-9" rx="17" ry="12" fill="#fff" fillOpacity=".97" />
      </g>
    </g>
  </g>
)

const Birds = ({ x, y, dist, rm }) => (
  <g transform={`translate(${rd(x)} ${rd(y)})`}>
    <g className="pop-deco" style={HIDDEN}>
      <g>
        {!rm && (
          <animateTransform attributeName="transform" type="translate" values={`0 0;${dist} -10;0 0`} dur="40s" repeatCount="indefinite" />
        )}
        {[0, 22, 42].map((bx, k) => (
          <path
            key={bx}
            d="M 0 0 q 5 -7 10 0 q 5 -7 10 0"
            transform={`translate(${bx} ${k % 2 ? 8 : 0})`}
            fill="none"
            stroke="#a8864f"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
      </g>
    </g>
  </g>
)

const Sun = ({ x, y, rm }) => (
  <g transform={`translate(${rd(x)} ${rd(y)})`}>
    <g className="pop-deco" style={HIDDEN}>
      <g>
        {!rm && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="60s" repeatCount="indefinite" />}
        {Array.from({ length: 12 }).map((_, k) => (
          <line key={k} x1="0" y1="-26" x2="0" y2="-35" stroke="#f7c948" strokeWidth="3" strokeLinecap="round" transform={`rotate(${k * 30})`} />
        ))}
      </g>
      <circle r="19" fill="#fbe08a" />
      <circle r="19" fill="none" stroke="#f7c948" strokeWidth="2" />
    </g>
  </g>
)

/* a compass rose in the corner, like an old treasure map */
const Compass = ({ x, y }) => (
  <g transform={`translate(${rd(x)} ${rd(y)})`}>
    <g className="pop-deco" style={HIDDEN}>
      <circle r="24" fill="#fff6e3" stroke="#c9ab75" strokeWidth="2.5" />
      <circle r="19" fill="none" stroke="#e3d0a8" strokeWidth="1.2" strokeDasharray="2 3" />
      <polygon points="0,-18 5,0 0,18 -5,0" fill="#d9b97c" />
      <polygon points="-18,0 0,-5 18,0 0,5" fill="#ecd9ae" />
      <circle r="2.4" fill="#fff6e3" stroke="#c9ab75" strokeWidth="1" />
      <text y="-30" textAnchor="middle" fontSize="11" fontWeight="800" fill="#a8864f" fontFamily="system-ui,sans-serif">
        N
      </text>
    </g>
  </g>
)

/* a little plane that crosses the sky now and then */
const Plane = ({ y, W, rm }) => (
  <g transform={`translate(0 ${y})`}>
    <g className="pop-deco" style={HIDDEN}>
      <g transform="translate(-80 0)">
        {!rm && (
          <animateTransform attributeName="transform" type="translate" values={`-80 0;${W + 80} -16`} dur="32s" repeatCount="indefinite" />
        )}
        <ellipse rx="20" ry="4.5" fill="#f4f6fa" stroke="#c9d1e0" strokeWidth="1" />
        <polygon points="-4,0 -12,-13 -6,-13 8,0" fill="#dfe4ee" />
        <polygon points="-18,-1 -24,-10 -19,-10 -11,-1" fill="#e0404a" />
        <ellipse cx="11" cy="-1" rx="4.5" ry="2" fill="#7fb6e8" />
      </g>
    </g>
  </g>
)

const DECO_CYCLE = ['tree', 'building', 'pine', 'bush', 'house', 'flowers']

/* scatters trees, buildings and so on over the island, keeping them off the road, the side paths and the river.
   back: drawn behind the road. front: drawn in front of it (land mode, below the road). */
const makeDecor = (geo, counts) => {
  const { proj, LW, LH, mode, ROAD_Y, lnodes, lend } = geo
  const near = (x, y, samples, r, stride = 1) => {
    for (let i = 0; i < samples.length; i += stride) {
      if (Math.hypot(samples[i].lx - x, samples[i].ly - y) < r) return true
    }
    return false
  }
  const clear = (x, y) =>
    !near(x, y, geo.river.samples, 46) &&
    !near(x, y, geo.samples, 40, 2) &&
    Object.values(geo.branches).every((b) => !near(x, y, b.samples, 34, 2))

  /* how far down the road is at a given x (the road zig-zags, so "in front of the road" depends on x) */
  const roadYAt = (x) => {
    let best = geo.samples[0]
    for (const s of geo.samples) if (Math.abs(s.lx - x) < Math.abs(best.lx - x)) best = s
    return best.ly
  }

  const back = []
  const front = []
  const add = (type, x, y, o = {}) => {
    if (!clear(x, y)) return
    const p = proj({ x, y })
    const item = { type, ...o, x: p.x, y: p.y }
    ;(mode === 'land' && y > roadYAt(x) ? front : back).push(item)
  }

  if (mode === 'land') {
    const backTypes = ['tree', 'building', 'pine', 'tree', 'house', 'bush', 'building', 'pine']
    for (let x = 90, k = 0; x < LW - 50; x += 92, k++) {
      add(backTypes[k % 8], x, 36 + (k % 2) * 30, { h: 54 + ((k * 23) % 44), tone: k })
    }
    lnodes.slice(0, -1).forEach((nd, i) => {
      const nx = lnodes[i + 1]
      add(DECO_CYCLE[(i * 2 + 1) % 6], (nd.x + nx.x) / 2, Math.min(nd.y, nx.y) - 78, { h: 60, tone: i })
    })
    for (let x = 150, k = 0; x < LW - 40; x += 105, k++) {
      add(['tree', 'pine', 'bush', 'flowers', 'house'][k % 5], x, Math.min(LH - 30, ROAD_Y + 140 + (k % 2) * 36), { tone: k })
    }
    add('lake', 96, LH - 60)
    add('building', lend.x + 60, ROAD_Y - 80, { h: 104, tone: 2 }) // the goal tower
  } else {
    ;[
      [70, 50, 'tree'],
      [128, 74, 'building'],
      [272, 66, 'pine'],
      [336, 44, 'building'],
    ].forEach(([x, y, t], k) => add(t, x, y, { h: 70 + k * 8, tone: k }))
    lnodes.slice(0, -1).forEach((nd, i) => {
      // gaps that hold a side path (and its label) stay free of scenery so nothing overlaps the text
      if (counts[i]) return
      const nx = lnodes[i + 1]
      const y = (nd.y + nx.y) / 2
      const left = i % 2 === 0
      add(DECO_CYCLE[(i * 2) % 6], left ? 350 : 50, y, { h: 62, tone: i })
      add(DECO_CYCLE[(i * 2 + 1) % 6], left ? 50 : 350, y, { h: 58, tone: i + 1 })
    })
    add('building', 318, lend.y - 14, { h: 108, tone: 2 }) // the goal tower
    add('lake', 92, lend.y + 56)
    add('tree', 308, lend.y + 56)
  }

  back.sort((a, b) => a.y - b.y)
  front.sort((a, b) => a.y - b.y)
  return { back, front }
}

/* sky, the flat island, the river and the scenery behind the road */
const Backdrop = ({ geo, decor, rm }) => {
  const { W, H, LW, LH, proj, slab: s, river, mode } = geo
  const pt = (p) => `${rd(p.x)},${rd(p.y)}`
  const top = [s.tl, s.tr, s.br, s.bl].map(pt).join(' ')
  const lip = `M ${pt(s.bl).replace(',', ' ')} L ${pt(s.br).replace(',', ' ')} L ${pt(s.tr).replace(',', ' ')}`
  const f1 = proj({ x: 14, y: 12 })
  const f2 = proj({ x: LW - 14, y: 12 })
  const fence = `M ${rd(f1.x)} ${rd(f1.y)} L ${rd(f2.x)} ${rd(f2.y)}`
  const patches = [
    [0.16, 0.34, 90],
    [0.42, 0.72, 110],
    [0.7, 0.28, 80],
    [0.86, 0.74, 100],
    [0.56, 0.46, 70],
  ]

  return (
    <>
      <defs>
        <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9e9fb" />
          <stop offset=".6" stopColor="#eef8fd" />
          <stop offset="1" stopColor="#fff6e3" />
        </linearGradient>
        <linearGradient id="rm-top" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#d3f2ae" />
          <stop offset="1" stopColor="#a9de83" />
        </linearGradient>
        <clipPath id="rm-top-clip">
          <polygon points={top} />
        </clipPath>
      </defs>

      <rect width={W} height={H} fill="url(#rm-sky)" />

      {/* parchment frame */}
      <rect x="8" y="8" width={W - 16} height={H - 16} rx="26" fill="none" stroke="#d6bf94" strokeWidth="2.5" strokeDasharray="8 7" opacity=".9" />

      {/* sky */}
      <Sun x={mode === 'land' ? 96 : 62} y={46} rm={rm} />
      <Compass x={W - 56} y={58} />
      {mode === 'land' ? (
        <>
          <Cloud x={W * 0.22} y={44} s={1.1} dur={20} rm={rm} />
          <Cloud x={W * 0.5} y={66} s={0.9} dur={24} drift={-30} rm={rm} />
          <Cloud x={W * 0.74} y={38} s={1.2} dur={18} rm={rm} />
          <Birds x={W * 0.3} y={80} dist={220} rm={rm} />
        </>
      ) : (
        <>
          <Cloud x={W * 0.62} y={44} s={1} dur={20} drift={20} rm={rm} />
          <Cloud x={W * 0.38} y={78} s={0.85} dur={24} drift={-24} rm={rm} />
          <Birds x={W * 0.45} y={84} dist={120} rm={rm} />
        </>
      )}
      <Plane y={58} W={W} rm={rm} />

      {/* the island (flat) */}
      <g className="slab" style={HIDDEN}>
        <polygon points={top} fill="url(#rm-top)" />

        {/* lighter patches of grass */}
        <g clipPath="url(#rm-top-clip)">
          {patches.map(([fx, fy, r], k) => {
            const q = proj({ x: LW * fx, y: LH * fy })
            return <ellipse key={k} cx={q.x} cy={q.y} rx={r} ry={r * 0.4} fill="#e6fbc9" opacity=".5" />
          })}

          {/* the river */}
          <path d={river.d} fill="none" stroke="#82c2e6" strokeWidth="30" strokeLinejoin="round" />
          <path d={river.d} fill="none" stroke="#a3d6f0" strokeWidth="25" strokeLinejoin="round" />
          <path d={river.d} fill="none" stroke="#cdeafa" strokeWidth="14" strokeLinejoin="round" />
          <path d={river.d} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2.4" strokeDasharray="6 18" strokeLinecap="round">
            {!rm && <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.4s" repeatCount="indefinite" />}
          </path>
        </g>

        {/* grass lip and the white fence along the back */}
        <path d={lip} fill="none" stroke="#8fcf66" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
        <path d={fence} fill="none" stroke="#fff" strokeWidth="9" strokeDasharray="2.5 11" />
        <path d={fence} fill="none" stroke="#fff" strokeWidth="2" transform="translate(0 -2)" />
      </g>

      {/* scenery behind the road */}
      {decor.back.map((it, k) => (
        <Deco key={`b${k}`} {...it} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

/* online course search links, they open each platform's search page so they never go stale.
   Each one has a brand icon (react-icons) in the platform's own colour.
   Check the URL formats now and then in case a platform changes them. */
const COURSE_SOURCES = [
  {
    name: 'Udemy',
    Icon: SiUdemy,
    color: '#A435F0',
    url: (q) => `https://www.udemy.com/courses/search/?q=${encodeURIComponent(q)}`,
  },
  {
    name: 'Coursera',
    Icon: SiCoursera,
    color: '#0056D2',
    url: (q) => `https://www.coursera.org/search?query=${encodeURIComponent(q)}`,
  },
  {
    name: 'YouTube',
    Icon: FaYoutube,
    color: '#FF0000',
    url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} course`)}`,
  },
]

/* quiet text links (not buttons): small grey text with a dotted underline, plus a small brand icon in front */
const CourseLinks = ({ topic }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500">
    <span>Courses:</span>
    {COURSE_SOURCES.map(({ name, Icon, color, url }) => (
      <a
        key={name}
        href={url(topic)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Search ${name} for ${topic} courses (opens in a new tab)`}
        className="group/course inline-flex items-center gap-1.5 transition hover:text-[#0b0b2b]"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />
        <span className="underline decoration-dotted underline-offset-2">{name}</span>
      </a>
    ))}
  </div>
)

/* text for a chip: strings as-is, objects read by common keys, then any string field (+ a percent if there is one) */
const chipText = (x) => {
  const t = text(x)
  if (t) return t
  if (!x || typeof x !== 'object') return ''
  const str = Object.values(x).find((v) => typeof v === 'string' && v.trim())
  const pct = Object.entries(x).find(([k, v]) => /percent|pct|share/i.test(k) && typeof v === 'number')
  return str ? `${str}${pct ? ` · ${Math.round(pct[1])}%` : ''}` : ''
}

/* drop empty and repeated entries (used when two skill lists are shown as one) */
const uniq = (arr) => {
  const seen = new Set()
  return arr.filter((x) => {
    const t = chipText(x).trim().toLowerCase()
    if (!t || seen.has(t)) return false
    seen.add(t)
    return true
  })
}

/* rows > 0: chips wrap normally on phones, and flow into that many rows from the sm breakpoint up */
const Chips = ({ items, stack = false, rows = 0 }) => {
  const shown = items.map(chipText).filter(Boolean)
  if (!shown.length) return null
  return (
    <ul
      className={
        rows
          ? 'mt-2 flex max-w-full flex-wrap gap-2 sm:grid sm:grid-flow-col sm:auto-cols-max sm:justify-start sm:gap-x-4 sm:gap-y-2 sm:overflow-x-auto'
          : `mt-2 flex gap-2 ${stack ? 'flex-col items-start' : 'flex-wrap'}`
      }
      style={rows ? { gridTemplateRows: `repeat(${rows}, auto)` } : undefined}
    >
      {shown.map((t, i) => (
        <li key={`${t}-${i}`} className="max-w-full break-words rounded-xl bg-white px-4 py-1.5 text-[13px] font-bold text-black">
          {t}
        </li>
      ))}
    </ul>
  )
}

const Box = ({ children, className = '' }) => (
  <section className={`rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-6 shadow-sm ${className}`}>{children}</section>
)

const Label = ({ children, cls = 'text-neutral-500' }) => (
  <div className={`text-xs font-bold uppercase tracking-wide ${cls}`}>{children}</div>
)

/* one skill tile: the name, with quiet course links right below it */
const SkillRow = ({ skill }) => (
  <div className="min-w-0 rounded-2xl bg-white/70 p-3">
    <div className="mb-1.5 break-words text-sm font-extrabold leading-tight text-black">{skill}</div>
    <CourseLinks topic={skill} />
  </div>
)

/* tiles share the row evenly: as many columns as fit, and they stretch to fill the width */
const fit = (min) => ({ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` })

/* the square tick box used by the task checklist in the focus card */
const TickBox = ({ checked, side }) => (
  <span
    aria-hidden="true"
    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 ${
      checked
        ? side
          ? 'scale-100 border-[#8b5cf6] bg-[#8b5cf6] text-white'
          : 'scale-100 border-[#2f9e62] bg-[#2f9e62] text-white'
        : 'border-[#d9c8ae] bg-white text-transparent group-hover/task:border-[#0b0b2b]'
    }`}
  >
    <FaCheck className="h-3 w-3" />
  </span>
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
const SIDE_LINES = [
  'A side quest! Extra credit, no pressure.',
  'Optional, but you are making yourself stand out!',
]

const cheerPool = (progress, allDone, nextTitle, hasSide) => {
  const base = allDone
    ? DONE_LINES
    : progress === 0
      ? START_LINES
      : progress < 35
        ? EARLY_LINES
        : progress < 70
          ? MID_LINES
          : LATE_LINES
  const extra = []
  if (nextTitle && !allDone) extra.push(`Next up: ${nextTitle}. You can do this!`)
  if (hasSide) extra.push(SIDE_LINES[0])
  return [...base, ...extra]
}

/* a new line every 7 seconds; finishing a step shows a celebration line right away and restarts the timer */
const CHEER_EVERY = 7000

const useCheerLine = ({ theme, progress, allDone, nextTitle, celebrate, hasSide }) => {
  const greeting = `Hi there! I’m your ${theme.name}. Let’s tackle this roadmap together!`
  const [msg, setMsg] = useState(greeting)
  const turn = useRef(0)
  const latest = useRef({})
  latest.current = { progress, allDone, nextTitle, hasSide }
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
    } else {
      const pool = latest.current.allDone ? DONE_LINES : STEP_LINES
      setMsg(pool[turn.current++ % pool.length])
    }
    const id = setInterval(() => {
      const { progress: p, allDone: a, nextTitle: n, hasSide: s } = latest.current
      const pool = cheerPool(p, a, n, s)
      setMsg(pool[turn.current++ % pool.length])
    }, CHEER_EVERY)
    return () => clearInterval(id)
  }, [celebrate])

  return msg
}

/* the cheering character rides above the focus card on every screen size (desktop too).
   On phones it is smaller and sits in its own reserved gap (see the aside padding), so it never covers the map.
   The bubble appears with each new line and hides after 5 seconds. */
const MiniCheer = ({ code, theme, progress, allDone, celebrate, nextTitle, hasSide, big }) => {
  const msg = useCheerLine({ theme, progress, allDone, nextTitle, celebrate, hasSide })
  const [show, setShow] = useState(true)

  useEffect(() => {
    setShow(true)
    const t = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(t)
  }, [msg])

  return (
    <div className="pointer-events-none absolute bottom-full right-1 z-30 mb-1 flex items-end gap-1 lg:right-4 lg:mb-2">
      <style>{`
        @keyframes miniBubbleIn { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mini-bubble { animation: none !important; } }
      `}</style>

      {show && (
        <div
          key={msg}
          className={`mini-bubble relative rounded-2xl border-2 border-[#0b0b2b] bg-white px-3 py-2 font-bold leading-snug text-black shadow-md ${
            big ? 'mb-9 max-w-[280px] text-sm' : 'mb-4 max-w-[min(190px,52vw)] text-[11px]'
          }`}
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
        <MbtiCharacter code={code} cheer celebrate={celebrate} className={big ? 'w-[112px]' : 'w-[68px]'} />
      </div>
    </div>
  )
}

/* true on desktop widths: landscape map there, portrait map everywhere else */
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
/* Page                                                                */
/* ------------------------------------------------------------------ */
const UserRoadMap = () => {
  const { state } = useLocation()
  const isDesktop = useIsDesktop()

  const [status, setStatus] = useState('loading') // loading | ready | blocked
  const [message, setMessage] = useState('')
  const [pred, setPred] = useState(null)
  const [road, setRoad] = useState(null)
  const [done, setDone] = useState([]) // finished steps (keys = step index in the original list)
  const [subDone, setSubDone] = useState([]) // ticked checklist tasks (keys = "stepKey:taskIndex")
  const [focusIdx, setFocusIdx] = useState(null) // null = follow the next unfinished main step
  const [celebrate, setCelebrate] = useState(0) // goes up each time a step is finished, the cheering character reacts
  /* the intro preview: the character walks the whole main route once, then returns to your step */
  const [previewing, setPreviewing] = useState(() => !reducedMotion())
  const [previewRun, setPreviewRun] = useState(0)

  /* loader: stays up until the roadmap is in (or failed) AND its finish animation has played */
  const [showLoader, setShowLoader] = useState(true)
  const [cachedMbti] = useState(getCachedMbti)

  /* the map's animations (and the cheering character) wait until the loader has finished and is gone */
  const animReady = status === 'ready' && !showLoader

  /* animation refs */
  const mapRef = useRef(null)
  const stripRef = useRef(null) // the sideways scroller on desktop
  const charRef = useRef(null)
  const bobRef = useRef(null)
  const trailRef = useRef(null)
  const previewRef = useRef(null)
  const charS = useRef({ f: 0, b: 0, br: null }) // f: along main route, b: along side path number br (0 = on main route)
  const charPos = useRef(null)
  const trailF = useRef({ f: 0 })
  const trailAnim = useRef(null)
  const introDone = useRef({ walk: false, trail: false })
  const ranPreview = useRef(-1)
  const prevAllDone = useRef(null)
  const followRef = useRef(false) // page scrolls along with the character while true
  const scrollerRef = useRef(null)
  const skipRef = useRef(null)
  const geoRef = useRef(null)
  const fxRef = useRef(null) // overlay where the celebration confetti is added

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

        // Uses the career the user selected (saved in the database).
        // If none is selected yet (e.g. right after "show me different careers"), the backend returns the best match.
        const rm = await getRoadmap(p.id)
        if (cancelled) return
        setRoad(rm)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setMessage(e?.response?.data?.message || e?.message || 'Something went wrong loading your roadmap.')
        setStatus('blocked')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [state?.predictionId])

  /* remember the type so the loader's character can show immediately next visit */
  useEffect(() => {
    cacheMbti(pred?.mbti)
  }, [pred?.mbti])

  /* checklist progress, remembered per prediction + career.
     Keys are the step's index in the original list, so saved progress keeps working. */
  const storeKey = pred && road ? `roadmapProgress:${pred.id}:${road.career?.title}` : null
  /* the ticked tasks inside the steps are remembered separately, under their own key */
  const subKey = pred && road ? `roadmapTasks:${pred.id}:${road.career?.title}` : null

  useEffect(() => {
    if (!storeKey) return
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || '[]')
      setDone(Array.isArray(saved) ? saved : [])
    } catch {
      setDone([])
    }
  }, [storeKey])

  useEffect(() => {
    if (!subKey) return
    try {
      const saved = JSON.parse(localStorage.getItem(subKey) || '[]')
      setSubDone(Array.isArray(saved) ? saved : [])
    } catch {
      setSubDone([])
    }
  }, [subKey])

  const saveDone = (next) => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(next))
    } catch {
      /* storage unavailable: progress just won't persist */
    }
  }

  const saveSubs = (next) => {
    setSubDone(next)
    try {
      localStorage.setItem(subKey, JSON.stringify(next))
    } catch {
      /* storage unavailable: ticks just won't persist */
    }
  }

  const toggle = (key) =>
    setDone((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      saveDone(next)
      return next
    })

  /* set a step to done / not done (does nothing if it already is) */
  const setStepDone = (key, value) =>
    setDone((prev) => {
      if (prev.includes(key) === value) return prev
      const next = value ? [...prev, key] : prev.filter((k) => k !== key)
      saveDone(next)
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

  /* split the steps: main path vs optional side paths */
  const plan = useMemo(() => {
    const arranged = arrangeSteps(list(road?.roadmap?.timeline?.steps))
    const steps = arranged.map((a) => a.s)
    const keys = arranged.map((a) => a.key) // saved-progress keys (original index, so old progress still matches)
    const all = arranged.map((a, i) => ({ i, s: a.s, k: a.key, opt: isOptional(a.s), phase: a.phase, guess: a.guess, edu: a.edu, primary: a.primary, win: a.win }))
    let main = all.filter((x) => !x.opt)
    if (!main.length) main = all // everything optional? then treat all as main so the map still works
    const mainSet = new Set(main.map((x) => x.i))
    const side = main.map(() => [])
    const where = {}
    main.forEach((x, m) => {
      where[x.i] = { kind: 'main', m }
    })
    all
      .filter((x) => !mainSet.has(x.i))
      .forEach((x) => {
        let m = 0 // hangs off the last main step before it (or the first one)
        main.forEach((y, pos) => {
          if (y.i < x.i) m = pos
        })
        side[m].push(x)
        where[x.i] = { kind: 'side', m, j: side[m].length - 1 }
      })
    /* main steps done while studying (e.g. skills built during school) point at the degree step */
    const alongside = {}
    const eduPos = main.findIndex((x) => x.primary && !x.guess)
    if (eduPos >= 0) {
      const y = main[eduPos]
      main.forEach((x) => {
        if (x.edu || x.guess) return
        const lenA = y.win.end - y.win.start
        const lenB = x.win.end - x.win.start
        const overlap = Math.min(x.win.end, y.win.end) - Math.max(x.win.start, y.win.start)
        if (lenB > 0 && overlap / lenB >= 0.8 && lenB >= lenA * 0.6) alongside[x.i] = eduPos + 1
      })
    }
    return { steps, keys, all, main, side, where, alongside, counts: side.map((a) => a.length) }
  }, [road])

  const { steps, main: mainSteps } = plan
  const total = steps.length
  const isDone = (i) => done.includes(plan.keys[i])
  const mainDoneCount = mainSteps.filter((x) => isDone(x.i)).length
  const sideTotal = total - mainSteps.length
  const sideDoneCount = plan.all.filter((x) => plan.where[x.i]?.kind === 'side' && done.includes(x.k)).length
  /* timing line under a step: its own timing, plus a note when it runs alongside an earlier step */
  const subLine = (i, s) => [sub(s), plan.alongside[i] ? `with step ${plan.alongside[i]}` : ''].filter(Boolean).join(' · ')
  const progress = mainSteps.length ? Math.round((mainDoneCount / mainSteps.length) * 100) : 0
  const nextIdx = mainSteps.find((x) => !isDone(x.i))?.i ?? -1
  const allDone = mainSteps.length > 0 && nextIdx === -1

  /* the step in focus: the one the user clicked, otherwise the next unfinished main step */
  const active = total
    ? Math.min(Math.max(focusIdx ?? (nextIdx >= 0 ? nextIdx : mainSteps[mainSteps.length - 1].i), 0), total - 1)
    : 0

  const lastDoneMain = mainSteps.reduce((m, x, pos) => (isDone(x.i) ? pos : m), -1)

  const geoMode = isDesktop ? 'land' : 'port'
  const geo = useMemo(() => (mainSteps.length ? buildMap(plan.counts, isDesktop ? 'land' : 'port') : null), [plan, isDesktop])
  geoRef.current = geo
  const decor = useMemo(() => (geo ? makeDecor(geo, plan.counts) : null), [geo, plan])
  const trailTarget = geo ? (allDone ? 1 : lastDoneMain >= 0 ? geo.nodeFrac[lastDoneMain] : 0) : 0

  const placeChar = (g) => {
    const el = charRef.current
    if (!el || !g) return
    const st = charS.current
    const br = st.br != null ? g.branches[st.br] : null
    const p = br && st.b > 0.0005 ? posAt(br, st.b) : posAt(g, st.f)
    charPos.current = p
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

  /* landscape: slide the map sideways so the character stays in the middle (snap = jump instead of glide) */
  const centerStrip = (snap) => {
    const g = geoRef.current
    const sc = stripRef.current
    if (!g || !sc || !charPos.current || sc.scrollWidth <= sc.clientWidth + 2) return
    const want = (charPos.current.x / g.W) * sc.scrollWidth - sc.clientWidth / 2
    sc.scrollLeft = snap ? want : sc.scrollLeft + (want - sc.scrollLeft) * 0.2
  }

  /* portrait: gently scroll so the walking character stays around the middle of the screen */
  const follow = () => {
    const g = geoRef.current
    if (g?.mode === 'land') {
      centerStrip(false)
      return
    }
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

  /* a finished step: confetti, stars and rings burst out of its stop, a word floats up and the stop bounces */
  const celebrateStep = (idx) => {
    const g = geoRef.current
    const root = fxRef.current
    const w = plan.where[idx]
    if (!g || !root || !w || reducedMotion()) return
    const side = w.kind === 'side'
    const p = side ? g.branches[w.m].nodes[w.j] : g.nodes[w.m]
    popAt(root, pctX(g, p.x), pctY(g, p.y), {
      count: side ? 36 : 52,
      ring: side ? SIDE : '#2f80e0',
      colors: side ? [SIDE, '#c4b0fa', '#f2c230', '#ffffff', '#e0404a'] : CONFETTI,
      word: pick(FX_WORDS),
    })
    const nodeEls = mapRef.current?.querySelectorAll(side ? '.side-node' : '.step-node')
    const k = side ? plan.side.slice(0, w.m).reduce((sum, a) => sum + a.length, 0) + w.j : w.m
    const el = nodeEls?.[k]
    if (el) animate(el, { scale: [1, 1.4, 1], duration: 520, ease: 'outBack' })
  }

  /* 1. entrance: the island fades in, the road builds itself, scenery drops in and stops pop up one after another.
        Waits for the loader to be gone (animReady). */
  useEffect(() => {
    if (!animReady || !geo || !mapRef.current) return
    const root = mapRef.current
    const q = (sel) => Array.from(root.querySelectorAll(sel))
    const nodes = q('.pop-node')
    const labels = q('.pop-label')
    const decos = q('.pop-deco')
    const base = q('.base-trail')
    const slabs = q('.slab')
    const roads = q('.road-draw')

    /* the road is drawn with a dash trick, so "f" is how much of it is built */
    const setRoad = (f) =>
      roads.forEach((el) => {
        el.setAttribute('stroke-dashoffset', String(1000 - f * 1000))
        el.setAttribute('opacity', f > 0.001 ? '1' : '0')
      })

    const showAll = () => {
      ;[...nodes, ...labels, ...decos, ...base, ...slabs].forEach((el) => {
        el.style.opacity = '1'
      })
      setRoad(1)
    }

    if (reducedMotion()) {
      showAll()
      return
    }

    const runs = []
    if (slabs.length) runs.push(animate(slabs, { opacity: [0, 1], duration: 650, ease: 'outQuad' }))

    const roadF = { f: 0 }
    setRoad(0)
    runs.push(
      animate(roadF, {
        f: 1,
        duration: 1500,
        delay: 400,
        ease: 'inOutSine',
        onUpdate: () => setRoad(roadF.f),
        onComplete: () => setRoad(1),
      })
    )

    if (base.length) runs.push(animate(base, { opacity: [0, 1], duration: 700, delay: 1300, ease: 'outQuad' }))
    if (decos.length)
      runs.push(
        animate(decos, {
          opacity: [0, 1],
          translateY: [-18, 0],
          duration: 700,
          delay: stagger(40, { start: 300 }),
          ease: 'outBack',
        })
      )
    if (nodes.length)
      runs.push(
        animate(nodes, {
          opacity: [0, 1],
          scale: [0.2, 1],
          duration: 700,
          delay: stagger(90, { start: 700 }),
          ease: 'outBack',
        })
      )
    if (labels.length)
      runs.push(
        animate(labels, {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 600,
          delay: stagger(90, { start: 800 }),
          ease: 'outQuad',
        })
      )

    // if an animation is interrupted or fails, don't leave the map invisible
    const fallback = setTimeout(showAll, 4500)
    return () => {
      clearTimeout(fallback)
      runs.forEach((a) => a.pause())
    }
  }, [animReady, geo])

  /* 1b. the preview: the character walks down the whole main route (a yellow trail draws behind it,
         each stop bumps as it passes), then the normal "walk to your step" effect takes over.
         Waits for the loader to be gone (animReady). */
  useEffect(() => {
    if (!animReady) return
    if (!geo || reducedMotion()) {
      setPreviewing(false)
      return
    }
    // the layout switched (desktop <-> mobile) after the preview already played: don't play it again
    if (ranPreview.current === previewRun) {
      setPreviewing(false)
      return
    }
    const root = mapRef.current
    const prevPath = previewRef.current
    if (!root || !prevPath) return

    const stepNodes = Array.from(root.querySelectorAll('.step-node'))
    const flag = root.querySelector('.finish-node')
    const st = charS.current
    const bumped = new Set()
    let startT = 0
    let endT = 0
    let anim = null
    let fade = null
    let ended = false

    st.f = 0
    st.b = 0
    st.br = null
    placeChar(geo)
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
      ranPreview.current = previewRun
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
          duration: Math.min(6500, 1800 + geo.nodes.length * 520),
          ease: 'inOutSine',
          onUpdate: () => {
            placeChar(geo)
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
            placeChar(geo)
            drawPreview(1)
            bump(flag)
            endT = setTimeout(end, 500)
          },
        })
      },
      previewRun === 0 ? 2300 : 250
    )

    return () => {
      clearTimeout(startT)
      clearTimeout(endT)
      anim?.pause()
      fade?.pause()
      skipRef.current = null
    }
  }, [animReady, geo, previewRun])

  /* 2. the traveled route draws itself up to the last finished main step */
  useEffect(() => {
    if (!animReady || !geo) return
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
  }, [animReady, geo, trailTarget, previewing])

  /* 3. the character walks to the step in focus.
        Main step: along the main route. Optional step: along the main route to its branch point,
        then up the side path. Switching between paths walks back through the branch point. */
  useEffect(() => {
    if (!animReady || !geo || previewing) return
    const w = plan.where[active]
    if (!w) return
    const st = charS.current
    const side = w.kind === 'side'
    const tgt = {
      f: geo.nodeFrac[w.m],
      br: side ? w.m : null,
      b: side ? geo.branches[w.m].fracs[w.j + 1] : 0,
    }

    if (reducedMotion()) {
      st.f = tgt.f
      st.br = tgt.br
      st.b = tgt.b
      placeChar(geo)
      centerStrip(true)
      return
    }

    let dead = false
    let startT = 0
    const anims = []
    const tick = () => {
      placeChar(geo)
      follow()
    }
    const run = (props, duration, next) => {
      anims.push(
        animate(st, {
          ...props,
          duration,
          ease: 'inOutSine',
          onUpdate: tick,
          onComplete: () => {
            if (!dead) next?.()
          },
        })
      )
    }
    const sideTime = (delta) => 350 + Math.abs(delta) * 1400
    const finish = () => {
      placeChar(geo)
      introDone.current.walk = true
      followRef.current = false
    }
    const goBranch = () => {
      if (!side) return finish()
      st.br = tgt.br
      run({ b: tgt.b }, sideTime(tgt.b - st.b), finish)
    }
    const goMain = () => {
      if (Math.abs(st.f - tgt.f) < 0.0005) {
        st.f = tgt.f
        goBranch()
      } else {
        run({ f: tgt.f }, Math.min(3200, 600 + Math.abs(tgt.f - st.f) * 3400), goBranch)
      }
    }
    const begin = () => {
      if (st.b > 0.0005) {
        if (side && st.br === tgt.br) {
          st.f = tgt.f
          run({ b: tgt.b }, sideTime(tgt.b - st.b), finish)
          return
        }
        run({ b: 0 }, sideTime(st.b), () => {
          st.b = 0
          st.br = null
          goMain()
        })
      } else {
        st.b = 0
        st.br = null
        goMain()
      }
    }

    startT = setTimeout(begin, introDone.current.walk ? 0 : 900)
    return () => {
      dead = true
      clearTimeout(startT)
      anims.forEach((a) => a.pause())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animReady, geo, plan, active, previewing])

  /* 4. idle bob for the character */
  useEffect(() => {
    if (!animReady || !bobRef.current || reducedMotion()) return
    const a = animate(bobRef.current, {
      translateY: [-4, 3],
      duration: 800,
      alternate: true,
      loop: true,
      ease: 'inOutSine',
    })
    return () => a.pause()
  }, [animReady, geo])

  /* 5. pulse ring on the stop in focus */
  useEffect(() => {
    if (!animReady || !mapRef.current || reducedMotion()) return
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
  }, [animReady, geo, active])

  /* 6. the big celebration when the last main step is finished:
        a huge burst at the goal, confetti raining over the whole map and fireworks going off one after another.
        prevAllDone is first recorded once the loader is gone, so opening an already finished roadmap doesn't fire it. */
  useEffect(() => {
    if (!animReady || !mapRef.current) return
    const justFinished = prevAllDone.current === false && allDone
    prevAllDone.current = allDone
    if (!justFinished || reducedMotion()) return

    const root = fxRef.current
    const g = geoRef.current
    if (!root || !g) return

    popAt(root, pctX(g, g.end.x), pctY(g, g.end.y), { count: 90, spread: 230, ring: '#2f9e62', word: 'You did it!' })
    rainDown(root, 120)

    const timers = [[16, 34], [80, 30], [48, 20], [28, 62], [68, 60]].map(([lx, ty], k) =>
      setTimeout(() => {
        if (root.isConnected) popAt(root, `${lx}%`, `${ty}%`, { count: 38, spread: 140, ring: pick(CONFETTI) })
      }, 450 + k * 380)
    )

    const flag = mapRef.current.querySelector('.finish-node')
    if (flag) animate(flag, { scale: [1, 1.5, 1], duration: 700, ease: 'outBack' })

    return () => timers.forEach(clearTimeout)
  }, [animReady, allDone])

  /* the build loader with your own MBTI character: ready as soon as the roadmap loaded (or failed) */
  const loader = showLoader ? (
    <PageLoader
      mbti={pred?.mbti || cachedMbti}
      ready={status !== 'loading'}
      onFinished={() => setShowLoader(false)}
      lines={ROAD_LINES}
      title={(t, code) => (t ? `Building the road for your ${code}` : 'Building your roadmap')}
      doneTitle={(t, code) => (t ? `${code} · ${t.name}, your road is ready!` : 'Your road is ready!')}
    />
  ) : null

  /* ---- early returns ---- */
  if (status === 'loading') {
    return (
      <>
        <div className="min-h-[60vh]" />
        {loader}
      </>
    )
  }

  if (status === 'blocked') {
    return (
      <>
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
        {loader}
      </>
    )
  }

  const career = road?.career ?? {}
  const roadmap = road?.roadmap ?? {}
  const activeStep = steps[active]
  const activeKey = plan.keys[active]
  const activeDone = done.includes(activeKey)
  const activeWhere = plan.where[active]
  const activeIsSide = activeWhere?.kind === 'side'

  /* the checklist: the tasks inside the step in focus, and the hours they add up to */
  const activeSubs = substepsOf(activeStep)
  const activeHours = activeSubs.reduce((sum, sb) => sum + sb.hours, 0)
  const subTaskKey = (k) => `${activeKey}:${k}`
  /* a finished step shows every task as ticked, even if it was finished with the "Mark as done" button */
  const isSubChecked = (k) => activeDone || subDone.includes(subTaskKey(k))
  const subCheckedCount = activeSubs.filter((_, k) => isSubChecked(k)).length
  const subPct = activeSubs.length ? Math.round((subCheckedCount / activeSubs.length) * 100) : 0
  const accent = activeIsSide ? SIDE : '#2f9e62'

  /* v2: hours per week and total hours for the whole roadmap (shown in the header) */
  const hoursPerWeek = Number(roadmap.timeline?.hoursPerWeek) || 0
  const totalHours = Number(roadmap.timeline?.totalHours) || 0

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

  const goTo = (i) => setFocusIdx(Math.max(0, Math.min(total - 1, i)))

  /* a step was just finished (by ticking its last task or by the button) */
  const stepFinished = () => {
    celebrateStep(active) // confetti burst at the stop that was just finished
    setFocusIdx(null) // jump on to the next unfinished main step
    setCelebrate((n) => n + 1) // the cheering character celebrates
  }

  /* tick / untick one task of the step in focus.
     Ticking the last task finishes the step, unticking a task of a finished step reopens it. */
  const toggleSub = (k) => {
    const mine = activeSubs.map((_, j) => subTaskKey(j))
    const base = activeDone ? [...new Set([...subDone, ...mine])] : subDone // a finished step counts as all ticked
    const key = subTaskKey(k)
    const next = base.includes(key) ? base.filter((x) => x !== key) : [...base, key]
    saveSubs(next)

    const allTicked = mine.every((x) => next.includes(x))
    if (allTicked && !activeDone) {
      setStepDone(activeKey, true)
      stepFinished()
    } else if (!allTicked && activeDone) {
      setStepDone(activeKey, false)
    }
  }

  const finishActive = () => {
    const wasDone = activeDone
    const mine = activeSubs.map((_, j) => subTaskKey(j))
    // marking the step done ticks all its tasks, marking it not done clears them
    saveSubs(wasDone ? subDone.filter((x) => !mine.includes(x)) : [...new Set([...subDone, ...mine])])
    toggle(activeKey)
    if (!wasDone) stepFinished()
  }

  /* header total: "4-5 years (starting from zero)" -> "4–5 Years" (the header adds "About" and "From Scratch") */
  const estimatedTotal = text(roadmap.timeline?.estimatedTotal)
  const totalLabel = tc(
    estimatedTotal
      .replace(/^about\s+/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .trim()
      .replace(/(\d)\s*-\s*(\d)/g, '$1–$2')
  )
  const canPreview = !reducedMotion()
  const nextTitle = nextIdx >= 0 ? title(steps[nextIdx]) : ''
  const land = geoMode === 'land'

  /* ---- THE MAP ---- */
  const mapInner = geo && (
    <div
      ref={mapRef}
      className={
        land
          ? 'relative'
          : 'relative mx-auto w-full max-w-[460px] overflow-hidden rounded-3xl border-2 border-[#0b0b2b] shadow-sm'
      }
      style={{ containerType: 'inline-size', ...(land ? { width: '100%', minWidth: `${geo.W}px` } : {}) }}
    >
      <svg
        viewBox={`0 0 ${geo.W} ${geo.H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Map of your ${mainSteps.length} main steps${sideTotal ? ` and ${sideTotal} optional side steps` : ''} toward becoming ${career.title}`}
      >
        {/* sky, island, river and the scenery behind the road */}
        <Backdrop geo={geo} decor={decor} rm={!canPreview} />

        {/* the road: a soft shadow, the kerb, then the asphalt (these two build themselves in) */}
        <path
          className="base-trail"
          d={geo.d}
          fill="none"
          stroke="#1b3a14"
          strokeOpacity=".12"
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(0 5)"
          style={HIDDEN}
        />
        <path
          className="road-draw"
          d={geo.d}
          pathLength="1000"
          fill="none"
          stroke="#d6dcea"
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1000 2000"
          strokeDashoffset="1000"
          opacity="0"
        />
        <path
          className="road-draw"
          d={geo.d}
          pathLength="1000"
          fill="none"
          stroke="#8a91a6"
          strokeWidth="29"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1000 2000"
          strokeDashoffset="1000"
          opacity="0"
        />

        {/* side paths: optional steps branch off the main road, dashed and purple */}
        {Object.entries(geo.branches).map(([m, br]) => {
          const sideItems = plan.side[m]
          const lastDoneSide = sideItems.reduce((acc, it, j) => (isDone(it.i) ? j : acc), -1)
          const f = lastDoneSide >= 0 ? br.fracs[lastDoneSide + 1] : 0
          return (
            <g key={`branch-${m}`}>
              <path
                className="base-trail"
                d={br.d}
                fill="none"
                stroke="#f3edff"
                strokeWidth="15"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity=".95"
                style={HIDDEN}
              />
              <path
                className="base-trail"
                d={br.d}
                fill="none"
                stroke={SIDE}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="2 10"
                opacity=".8"
                style={HIDDEN}
              />
              <path
                d={br.d}
                pathLength="1000"
                fill="none"
                stroke={SIDE}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="1000 2000"
                style={{
                  strokeDashoffset: 1000 - f * 1000,
                  opacity: f > 0.001 ? 1 : 0,
                  transition: 'stroke-dashoffset .7s ease',
                }}
              />
            </g>
          )
        })}

        {/* the bridge where the road crosses the river */}
        <g className="base-trail" style={HIDDEN}>
          <path d={geo.bridge} fill="none" stroke="#fbfcfe" strokeWidth="44" strokeLinecap="butt" />
          <path d={geo.bridge} fill="none" stroke="#d6dcea" strokeWidth="38" strokeLinecap="butt" />
          <path d={geo.bridge} fill="none" stroke="#8a91a6" strokeWidth="29" strokeLinecap="butt" />
        </g>

        {/* a dotted line down the middle of the road, like a treasure map trail */}
        <path
          className="base-trail"
          d={geo.d}
          fill="none"
          stroke="#fff"
          strokeOpacity=".95"
          strokeWidth="3.4"
          strokeDasharray="0.1 11"
          strokeLinecap="round"
          style={HIDDEN}
        />

        {/* round pads under the start, every stop and the goal */}
        <g className="pop-deco" style={HIDDEN}>
          <circle cx={geo.start.x} cy={geo.start.y} r="30" fill="#e3e7f0" stroke="#bcc3d4" strokeWidth="2.5" />
          <circle cx={geo.start.x} cy={geo.start.y} r="22" fill="#f3f5fa" />
        </g>
        {geo.nodes.map((nd, k) => (
          <g key={`pad-${k}`} className="pop-deco" style={HIDDEN}>
            <circle cx={nd.x} cy={nd.y} r="26" fill="#f7f8fc" stroke="#c3c8d6" strokeWidth="2" />
          </g>
        ))}
        {Object.values(geo.branches).flatMap((br, k) =>
          br.nodes.map((nd, j) => (
            <g key={`sidepad-${k}-${j}`} className="pop-deco" style={HIDDEN}>
              <circle cx={nd.x} cy={nd.y} r="22" fill="#f8f4ff" stroke={SIDE} strokeWidth="2" strokeDasharray="4 3" />
            </g>
          ))
        )}
        <g className="pop-deco" style={HIDDEN}>
          <circle cx={geo.end.x} cy={geo.end.y} r="32" fill="#eef0f5" stroke="#bcc3d4" strokeWidth="2.5" />
        </g>

        {/* preview trail: drawn once while the character walks the route, then fades out */}
        <path
          ref={previewRef}
          d={geo.d}
          pathLength="1000"
          fill="none"
          stroke="#f7c948"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
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
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1000 2000"
          strokeDashoffset="1000"
          opacity="0"
        />

        {/* scenery in front of the road */}
        {decor.front.map((it, k) => (
          <Deco key={`f${k}`} {...it} />
        ))}
      </svg>

      {/* small badge while the preview is playing */}
      {previewing && animReady && (
        <div
          className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-2 rounded-full bg-[#0b0b2b]/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-md"
          role="status"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#f2c230]" aria-hidden="true" />
          Previewing your route
        </div>
      )}

      {/* stops, side stops, start and finish (HTML on top of the SVG so they are real buttons) */}
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

        {/* the main steps */}
        {mainSteps.map((it, pos) => {
          const { i, s: step } = it
          const node = geo.nodes[pos]
          const checked = isDone(i)
          const isActive = i === active
          const onLeft = pos % 2 === 0
          const labelBody = (
            <>
              <div
                className={`line-clamp-2 text-[13px] font-extrabold leading-tight ${
                  checked ? 'text-neutral-400 line-through' : 'text-black'
                }`}
              >
                {title(step)}
              </div>
              {(subLine(i, step) || i === nextIdx) && (
                <div className="mt-0.5 text-[11px] font-bold text-neutral-500">
                  {i === nextIdx && <span className="text-[#2f80e0]">Next up</span>}
                  {i === nextIdx && subLine(i, step) ? ' · ' : ''}
                  {subLine(i, step)}
                </div>
              )}
            </>
          )
          return (
            <li key={`main-${i}`} className="absolute h-0 w-0" style={{ left: pctX(geo, node.x), top: pctY(geo, node.y) }}>
              <div className="absolute left-0 top-0 flex h-0 w-0 items-center justify-center">
                <div className="pop-node step-node h-11 w-11 shrink-0" style={HIDDEN}>
                  <button
                    type="button"
                    onClick={() => setFocusIdx(i)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`Step ${pos + 1}: ${title(step)}${checked ? ' (done)' : ''}`}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold shadow-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f80e0]/40 ${
                      checked
                        ? 'bg-white'
                        : isActive
                          ? 'border-[3px] border-[#2f80e0] bg-white text-[#2f80e0]'
                          : 'border-[3px] border-[#d9c8ae] bg-white text-neutral-500 hover:border-[#0b0b2b]'
                    }`}
                  >
                    {checked ? <FaCheckCircle className="h-11 w-11 text-[#2f9e62]" aria-hidden="true" /> : pos + 1}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="pulse-ring pointer-events-none absolute inset-0 rounded-full border-2 border-[#2f80e0]"
                      />
                    )}
                  </button>
                </div>
              </div>

              {land ? (
                /* landscape: label sits under the stop */
                <div className="absolute left-0 top-[34px] flex w-0 justify-center">
                  <div
                    aria-hidden="true"
                    onClick={() => setFocusIdx(i)}
                    className="pop-label w-[156px] shrink-0 cursor-pointer rounded-xl bg-[#fff9ea]/90 px-2 py-1 text-center"
                    style={HIDDEN}
                  >
                    {labelBody}
                  </div>
                </div>
              ) : (
                /* portrait: label beside the stop, width follows the map width so it never runs into the other side */
                <div className="absolute top-0 flex h-0 items-center" style={onLeft ? { left: 32 } : { right: 32 }}>
                  <div
                    aria-hidden="true"
                    onClick={() => setFocusIdx(i)}
                    className={`pop-label w-[min(190px,36cqw)] shrink-0 cursor-pointer rounded-xl bg-[#fff9ea]/90 px-2 py-1 ${
                      onLeft ? 'text-left' : 'text-right'
                    }`}
                    style={HIDDEN}
                  >
                    {labelBody}
                  </div>
                </div>
              )}
            </li>
          )
        })}

        {/* "Optional" tags where each side path leaves the main route */}
        {Object.entries(geo.branches).map(([m, br]) => {
          const parent = geo.nodes[m]
          const first = br.nodes[0]
          return (
            <li
              key={`tag-${m}`}
              className="absolute h-0 w-0"
              style={{ left: pctX(geo, (parent.x + first.x) / 2), top: pctY(geo, (parent.y + first.y) / 2) }}
            >
              <div className="absolute left-0 top-0 flex h-0 w-0 items-center justify-center">
                <span
                  className="pop-label shrink-0 whitespace-nowrap rounded-full border border-dashed bg-white px-2 py-0.5 text-[10px] font-extrabold"
                  style={{ ...HIDDEN, borderColor: SIDE, color: SIDE }}
                >
                  Optional
                </span>
              </div>
            </li>
          )
        })}

        {/* the optional steps, each on its side path */}
        {plan.side.flatMap((items, m) =>
          items.map((it, j) => {
            const { i, s: step } = it
            const node = geo.branches[m].nodes[j]
            const checked = isDone(i)
            const isActive = i === active
            const labelBody = (
              <>
                <div
                  className={`line-clamp-2 break-words text-[12px] font-extrabold leading-tight ${
                    checked ? 'text-neutral-400 line-through' : 'text-black'
                  }`}
                >
                  {title(step)}
                </div>
                {/* on phones the duration stays in the focus card, so this label stays short and never hits the next stop */}
                <div className="mt-0.5 text-[10px] font-bold" style={{ color: SIDE }}>
                  Side Quest{land && sub(step) ? ` · ${sub(step)}` : ''}
                </div>
              </>
            )
            return (
              <li key={`side-${i}`} className="absolute h-0 w-0" style={{ left: pctX(geo, node.x), top: pctY(geo, node.y) }}>
                <div className="absolute left-0 top-0 flex h-0 w-0 items-center justify-center">
                  <div className="pop-node side-node h-10 w-10 shrink-0" style={HIDDEN}>
                    <button
                      type="button"
                      onClick={() => setFocusIdx(i)}
                      aria-current={isActive ? 'step' : undefined}
                      aria-label={`Optional side step: ${title(step)}${checked ? ' (done)' : ''}`}
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8b5cf6]/40 ${
                        checked
                          ? 'bg-white'
                          : isActive
                            ? 'border-[3px] border-dashed border-[#8b5cf6] bg-[#f3edff] text-[#8b5cf6]'
                            : 'border-[3px] border-dashed border-[#cdbcf5] bg-white text-[#8b5cf6] hover:border-[#8b5cf6]'
                      }`}
                    >
                      {checked ? (
                        <FaCheckCircle className="h-10 w-10 text-[#8b5cf6]" aria-hidden="true" />
                      ) : (
                        <FaStar className="h-4 w-4" aria-hidden="true" />
                      )}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="pulse-ring pointer-events-none absolute inset-0 rounded-full border-2 border-[#8b5cf6]"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {land ? (
                  <div className="absolute top-0 flex h-0 items-center" style={m % 2 ? { right: 30 } : { left: 30 }}>
                    <div
                      aria-hidden="true"
                      onClick={() => setFocusIdx(i)}
                      className={`pop-label w-[128px] shrink-0 cursor-pointer rounded-xl bg-[#fff9ea]/90 px-2 py-1 ${
                        m % 2 ? 'text-right' : 'text-left'
                      }`}
                      style={HIDDEN}
                    >
                      {labelBody}
                    </div>
                  </div>
                ) : (
                  <div className="absolute left-0 top-[26px] flex w-0 justify-center">
                    <div
                      aria-hidden="true"
                      onClick={() => setFocusIdx(i)}
                      className="pop-label w-[min(124px,32cqw)] shrink-0 cursor-pointer rounded-xl bg-[#fff9ea]/90 px-2 py-1 text-center"
                      style={HIDDEN}
                    >
                      {labelBody}
                    </div>
                  </div>
                )}
              </li>
            )
          })
        )}

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
            <div className="pop-label w-[min(200px,50cqw)] shrink-0 rounded-xl bg-[#fff9ea]/90 px-2 py-1 text-center" style={HIDDEN}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Goal</div>
              <div className="text-sm font-extrabold leading-tight text-black">{career.title}</div>
            </div>
          </div>

        </li>
      </ol>

      {/* the traveler: your MBTI character, walks the main route and detours onto side paths */}
      <div
        ref={charRef}
        className="pointer-events-none absolute z-20 h-0 w-0"
        style={{ left: pctX(geo, geo.start.x), top: pctY(geo, geo.start.y) }}
        aria-hidden="true"
      >
        <div className="absolute bottom-[26px] left-0 w-0">
          <div ref={bobRef} className={land ? '-ml-[44px] w-[88px]' : '-ml-[34px] w-[68px] sm:-ml-[44px] sm:w-[88px]'}>
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

      {/* confetti, stars and rings are added here whenever a step is finished */}
      <div ref={fxRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden" />
    </div>
  )

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
              {mainSteps.length} Steps
              {sideTotal > 0 ? ` + ${sideTotal} Optional` : ''}
              {totalLabel ? ` · About ${totalLabel} From Scratch` : ''}
              {hoursPerWeek > 0 ? ` · ${hoursPerWeek} h/Week` : ''}
              {totalHours > 0 ? ` · ${totalHours} h Total` : ''}
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#0b0b2b] px-4 py-2 text-sm font-extrabold text-white">
            {career.matchPercent}% match
          </span>
        </div>
      </header>

      {total > 0 && geo && (
        <>
          {/* Progress summary: only main steps count, optional ones are bonus */}
          <Box className="!p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="text-2xl font-black leading-tight text-black sm:text-3xl">{progress}% of the way there</div>
              <div className="text-sm text-neutral-600">
                {mainDoneCount} of {mainSteps.length} steps done
                {sideTotal > 0 && (
                  <span style={{ color: SIDE }} className="font-bold">
                    {' '}
                    · {sideDoneCount} of {sideTotal} optional
                  </span>
                )}
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
                  <span className="font-bold text-[#2f9e62]">Every main step is done. Nice work!</span>
                ) : (
                  <>
                    Next up: <span className="font-bold text-black">{nextTitle}</span>
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

            {/* legend */}
            {sideTotal > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[#e6d8c3] pt-3 text-[12px] font-bold text-neutral-600">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-[10px] w-8 rounded-full bg-[#8a91a6]" aria-hidden="true" />
                  Main Road
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-[4px] w-8 rounded-full border-t-[4px] border-dashed" style={{ borderColor: SIDE }} aria-hidden="true" />
                  Optional Side Path, Doesn’t Block Your Goal
                </span>
              </div>
            )}
          </Box>

          {/* Map + focus card.
              The focus card is a normal section right below the map (it does not stick to the screen).
              Mobile: portrait island. Desktop: landscape island (scrolls sideways when long).
              The cheering character rides above the focus card on both. The aside has top padding
              so the character sits in its own gap instead of covering the map. */}
          <div className="space-y-4">
            {land ? (
              <div ref={stripRef} className="overflow-x-auto overflow-y-hidden rounded-3xl border-2 border-[#0b0b2b] shadow-sm">
                {mapInner}
              </div>
            ) : (
              mapInner
            )}

            {/* FOCUS CARD + CHEER CHARACTER */}
            <aside className="relative z-10 min-w-0 pt-24 lg:pt-28">
              <div className="relative">
                {/* mounted only once the loader is gone, so its greeting bubble and timers start when the person can actually see them */}
                {theme && !showLoader && (
                  <MiniCheer
                    code={pred.mbti}
                    theme={theme}
                    progress={progress}
                    allDone={allDone}
                    celebrate={celebrate}
                    nextTitle={nextTitle}
                    hasSide={activeIsSide}
                    big={isDesktop}
                  />
                )}

                <div
                  className="rounded-2xl border-2 bg-white p-4 shadow-lg sm:p-5 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6"
                  style={{ borderColor: activeIsSide ? SIDE : '#0b0b2b' }}
                  aria-live="polite"
                >
                  <div className="min-w-0">
                    {theme && (
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: theme.dark }}>
                        {String(pred.mbti).toUpperCase()} · {theme.name}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {activeIsSide ? (
                        <span className="rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ backgroundColor: SIDE }}>
                          Optional Side Quest
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-neutral-500">
                          Step {(activeWhere?.m ?? 0) + 1} of {mainSteps.length}
                        </span>
                      )}
                      {activeDone ? (
                        <span className="rounded-full bg-[#eaf6ef] px-3 py-1 text-xs font-extrabold text-[#2f9e62]">Done</span>
                      ) : active === nextIdx ? (
                        <span className="rounded-full bg-[#2f80e0] px-3 py-1 text-xs font-extrabold text-white">Next Up</span>
                      ) : null}
                      {sub(activeStep) && (
                        <span className="rounded-full bg-[#f3e6d3] px-3 py-1 text-xs font-bold text-neutral-700">{sub(activeStep)}</span>
                      )}
                      {activeHours > 0 && (
                        <span className="rounded-full bg-[#fff3cf] px-3 py-1 text-xs font-bold text-[#7a5a08]">{activeHours} h</span>
                      )}
                      {plan.all[active]?.phase && (
                        <span className="rounded-full bg-[#e8f1fc] px-3 py-1 text-xs font-bold text-[#2f80e0]">{plan.all[active].phase}</span>
                      )}
                      {plan.alongside[active] && (
                        <span className="rounded-full bg-[#eaf6ef] px-3 py-1 text-xs font-bold text-[#2f9e62]">
                          Alongside Step {plan.alongside[active]}
                        </span>
                      )}
                    </div>

                    <div
                      className={`mt-2 break-words text-lg font-extrabold leading-snug sm:text-xl ${
                        activeDone ? 'text-neutral-400 line-through' : 'text-black'
                      }`}
                    >
                      {title(activeStep)}
                    </div>

                    {/* the checklist: tick each task as you do it. Ticking the last one finishes the step.
                        Older roadmaps without tasks keep the plain description. */}
                    {activeSubs.length > 0 ? (
                      <>
                        {text(activeStep?.note) && (
                          <div className="mt-2 text-xs font-semibold leading-snug text-neutral-500">{text(activeStep.note)}</div>
                        )}
                        <ul className="mt-4 space-y-3" aria-label="Tasks in this step">
                          {activeSubs.map((sb, k) => {
                            const ticked = isSubChecked(k)
                            return (
                              <li key={`${sb.title}-${k}`}>
                                <div
                                  className={`group/task flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                                    ticked
                                      ? 'border-[#cfe8d9] bg-[#f3faf6]'
                                      : 'border-[#eadfce] bg-[#fdfaf4] hover:border-[#d9c8ae]'
                                  }`}
                                  style={ticked && activeIsSide ? { borderColor: '#ddd0fb', backgroundColor: '#f8f4ff' } : undefined}
                                >
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={ticked}
                                    aria-label={`${ticked ? 'Untick' : 'Tick'} task: ${sb.title}`}
                                    onClick={() => toggleSub(k)}
                                    className="mt-0.5 rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f80e0]/40"
                                  >
                                    <TickBox checked={ticked} side={activeIsSide} />
                                  </button>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                      <span
                                        onClick={() => toggleSub(k)}
                                        className={`cursor-pointer break-words text-[15px] font-extrabold leading-snug ${
                                          ticked ? 'text-neutral-400 line-through decoration-2' : 'text-black'
                                        }`}
                                      >
                                        {sb.title}
                                      </span>
                                      {sb.tag && (
                                        <span className="rounded-full bg-[#0b0b2b] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                          {sb.tag}
                                        </span>
                                      )}
                                      {sb.timeframe && (
                                        <span className="rounded-full bg-[#f3e6d3] px-2 py-0.5 text-[11px] font-bold text-neutral-700">
                                          {sb.timeframe}
                                        </span>
                                      )}
                                      {sb.hours > 0 && (
                                        <span className="rounded-full bg-[#fff3cf] px-2 py-0.5 text-[11px] font-bold text-[#7a5a08]">
                                          ~{sb.hours} h
                                        </span>
                                      )}
                                    </div>

                                    {sb.why && (
                                      <div className="mt-1.5 text-[13px] italic leading-snug text-neutral-500">{sb.why}</div>
                                    )}

                                    {sb.actions.length > 0 && (
                                      <ol className="mt-3 space-y-2">
                                        {sb.actions.map((a, ai) => (
                                          <li key={`${a}-${ai}`} className="flex items-start gap-2.5 text-sm leading-snug text-neutral-700">
                                            <span
                                              aria-hidden="true"
                                              className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
                                              style={
                                                ticked
                                                  ? { backgroundColor: accent, color: '#fff' }
                                                  : { backgroundColor: '#efe4d0', color: '#6b5b3e' }
                                              }
                                            >
                                              {ai + 1}
                                            </span>
                                            <span className={`min-w-0 break-words ${ticked ? 'text-neutral-400' : ''}`}>{a}</span>
                                          </li>
                                        ))}
                                      </ol>
                                    )}
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    ) : (
                      detail(activeStep) && (
                        <div className="mt-2 text-sm leading-relaxed text-neutral-600">{detail(activeStep)}</div>
                      )
                    )}

                    {activeIsSide && (
                      <div className="mt-3 text-sm font-bold" style={{ color: SIDE }}>
                        Extra credit. It won’t count toward your progress.
                      </div>
                    )}
                  </div>

                  {/* right side: task progress and the buttons */}
                  <div className="mt-4 min-w-0 lg:mt-0 lg:border-l lg:border-[#e6d8c3] lg:pl-6">
                    <div className="flex flex-col gap-4 lg:justify-start lg:py-1">
                      {activeSubs.length > 0 && (
                        <div>
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="font-extrabold text-black">Your checklist</span>
                            <span className="font-bold text-neutral-500">
                              {subCheckedCount} / {activeSubs.length} tasks
                            </span>
                          </div>
                          <div
                            className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e8dcc8]"
                            role="progressbar"
                            aria-valuenow={subPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Tasks done in this step"
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${subPct}%`, backgroundColor: accent }}
                            />
                          </div>
                          <div className="mt-2 text-xs leading-snug text-neutral-500">
                            Tick each task as you finish it. The step completes when every task is ticked.
                          </div>
                        </div>
                      )}

                      <div className="flex w-full items-center gap-2">
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
                            disabled={active === total - 1}
                            aria-label="Next step"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9c8ae] bg-white text-sm font-bold text-neutral-700 transition hover:border-[#0b0b2b] disabled:opacity-40"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Learning resources */}
      <section>
        <h2 className="text-xl font-extrabold text-black">Learning Resources</h2>
        <div className="text-sm text-neutral-500">{tc(`Courses for ${career.title} and the skills it uses`)}</div>

        <div className="mt-4 space-y-4">
          {/* quiet strip, not a card: just a line of small text links */}
          <div className="flex flex-col gap-2 px-1 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs text-neutral-500">Search for {career.title} courses on:</div>
            <CourseLinks topic={career.title ?? ''} />
          </div>

          {!need.length && courseSkills.length > 0 && (
            <div className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
              <Label>Skills This Career Uses</Label>
              <div className="mt-3 grid gap-3" style={fit(290)}>
                {courseSkills.map((skill) => (
                  <SkillRow key={skill} skill={skill} />
                ))}
              </div>
            </div>
          )}

          {(() => {
            const groups = [
              // technical and other skills are shown together as one group
              { label: 'Technical & Other', items: uniq([...technical, ...other]), bg: 'bg-[#eaf1fc]', chip: 'border-[#c6dbf6]', ink: 'text-[#2f80e0]' },
              { label: 'Soft Skills', items: soft, bg: 'bg-[#eaf6ef]', chip: 'border-[#bfe3cd]', ink: 'text-[#2f9e62]' },
            ].filter((g) => g.items.some((x) => chipText(x)))
            return groups.length > 0 ? (
              <div className="grid gap-4" style={fit(260)}>
                {groups.map((g) => (
                  <div key={g.label} className={`min-w-0 rounded-3xl p-5 ${g.bg}`}>
                    <Label cls={g.ink}>{g.label}</Label>
                    <Chips items={g.items} cls={g.chip} />
                  </div>
                ))}
              </div>
            ) : null
          })()}

          {hasEdu && (
            <div className="min-w-0 overflow-hidden rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm">
              <Label>Education and Certificates</Label>
              <div className="mt-3 flex min-w-0 flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                {roadmap.education?.typical && (
                  <div className="w-full min-w-0 sm:w-[340px]">
                    <Label>Typical Education</Label>
                    <div className="mt-2 rounded-2xl bg-[#0b0b2b] p-4 text-white">
                      <div className="text-base font-extrabold leading-snug [overflow-wrap:anywhere] sm:text-lg">
                        {text(roadmap.education.typical)}
                      </div>
                    </div>
                  </div>
                )}
                {programs.some((x) => chipText(x)) && (
                  <div className="min-w-0 max-w-full">
                    <Label>Related Programs</Label>
                    <Chips items={programs} rows={2} />
                  </div>
                )}
                {reported.some((x) => chipText(x)) && (
                  <div className="min-w-0 max-w-full">
                    <Label>Reported by People in This Job</Label>
                    <Chips items={reported} stack />
                  </div>
                )}
                {certificates.some((x) => chipText(x)) && (
                  <div className="min-w-0 max-w-full">
                    <Label cls="text-[#8b5cf6]">Certificates</Label>
                    <Chips items={certificates} stack />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Skills check */}
      {(have.length > 0 || need.length > 0) && (
        <section>
          <h2 className="text-xl font-extrabold text-black">Skills Check</h2>
          <div className="text-sm text-neutral-500">Based on the Skills You Entered in This Prediction</div>

          <div className="mt-4 space-y-4">
            <div className="rounded-3xl bg-[#eaf6ef] p-5">
              <Label cls="text-[#2f9e62]">You Already Have</Label>
              {have.length ? (
                <Chips items={have} cls="border-[#bfe3cd]" />
              ) : (
                <div className="mt-2 text-sm text-neutral-600">None of the key skills yet.</div>
              )}
            </div>

            <div className="rounded-3xl bg-[#fcecec] p-5">
              <Label cls="text-[#e0404a]">Still to Build</Label>
              {need.length ? (
                <div className="mt-3 grid gap-3" style={fit(290)}>
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

      {/* footnote: all lowercase on purpose */}
      {roadmap.note && <div className="text-sm leading-relaxed text-neutral-500 lowercase">{text(roadmap.note)}</div>}

      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Link
          to={BACK}
          className="rounded-full border border-[#d9c8ae] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:border-[#0b0b2b]"
        >
          Choose a different career
        </Link>
        <Link
          to="/assessment-test"
          className="rounded-full bg-[#0b0b2b] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a]"
        >
          + New prediction
        </Link>
      </div>

      {/* the loader finishing its animation on top of the ready page (fixed overlay) */}
      {loader}
    </div>
  )
}

export default UserRoadMap