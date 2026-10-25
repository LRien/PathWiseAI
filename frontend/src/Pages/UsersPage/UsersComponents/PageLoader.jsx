import React, { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import MbtiCharacter, { mbtiTheme } from './MbtiCharacter'

/* ------------------------------------------------------------------ */
/* PageLoader                                                          */
/* The same "bars get built" effect as the assessment page, but your   */
/* own MBTI character (from your latest prediction) stands on top and  */
/* celebrates when the data is ready.                                  */
/*                                                                     */
/*   mbti        the type to show (falls back to a soft pulsing dot)   */
/*   ready       true once the page's data has finished loading        */
/*   onFinished  called after the finish animation; hide the loader    */
/*   minShow     ms the loader stays up even if data arrives fast      */
/*   lines       rotating status text while loading                    */
/*   title       heading while loading   (string or (theme, mbti)=>)   */
/*   doneTitle   heading when finished   (string or (theme, mbti)=>)   */
/*                                                                     */
/* Layout: the character is the star (big, size locked so it can never */
/* blow up), the bars are a small accent underneath it.                */
/* ------------------------------------------------------------------ */

const LAST_KEY = 'lastMbti'

/* last known type, so the character can appear immediately on repeat visits */
export const getCachedMbti = () => {
  try {
    return localStorage.getItem(LAST_KEY) || ''
  } catch {
    return ''
  }
}

export const cacheMbti = (mbti) => {
  if (!mbti) return
  try {
    localStorage.setItem(LAST_KEY, String(mbti))
  } catch {
    /* storage unavailable: the character just won't show on the very first frame next time */
  }
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const FINISH_HOLD = 1100 // ms to enjoy the finished build before the page shows

const BAR_COLORS = ['#2f80e0', '#f2c230', '#e0404a', '#e8832a', '#6b7a99']
const BAR_W = 34
const BAR_GAP = 8
const BAR_X0 = (240 - (BAR_COLORS.length * BAR_W + (BAR_COLORS.length - 1) * BAR_GAP)) / 2
const BAR_BASE = 140
const BAR_H = BAR_COLORS.map((_, i) => 24 + i * 18)

const DEFAULT_LINES = [
  'Finding your latest prediction...',
  'Loading your top career matches...',
  'Checking your roadmap progress...',
  'Putting everything together...',
]

const PageLoader = ({
  mbti,
  ready,
  onFinished,
  minShow = 2400,
  lines = DEFAULT_LINES,
  title,
  doneTitle,
}) => {
  const rootRef = useRef(null)
  const heroRef = useRef(null) // a ref, not a class: a global ".hero" style in the app was stretching the box
  const loopRef = useRef(null)
  const startedAt = useRef(Date.now())
  const finishedCb = useRef(onFinished)
  finishedCb.current = onFinished

  const [line, setLine] = useState(0)
  const [finished, setFinished] = useState(false)

  const theme = mbti ? mbtiTheme(mbti) : null
  const code = mbti ? String(mbti).toUpperCase() : ''

  /* looping build: bars drop in one by one, then lift away and start again */
  useEffect(() => {
    if (reducedMotion() || !rootRef.current) return undefined
    const bars = rootRef.current.querySelectorAll('.bar')
    loopRef.current = animate(bars, {
      translateY: [-150, 0],
      opacity: [0, 1],
      duration: 650,
      delay: stagger(240),
      ease: 'outBounce',
      loop: true,
      alternate: true,
      loopDelay: 500,
    })
    return () => loopRef.current?.pause()
  }, [])

  /* idle hop for the character */
  useEffect(() => {
    if (reducedMotion() || !rootRef.current) return undefined
    const el = heroRef.current
    if (!el) return undefined
    const a = animate(el, {
      translateY: [0, -10],
      duration: 650,
      alternate: true,
      loop: true,
      ease: 'inOutSine',
    })
    return () => a.pause()
  }, [theme ? 1 : 0])

  /* rotating status text, stops once the data is ready */
  useEffect(() => {
    if (ready || !lines.length) return undefined
    const id = setInterval(() => setLine((n) => (n + 1) % lines.length), 2000)
    return () => clearInterval(id)
  }, [ready, lines.length])

  /* data is in: wait out the minimum time, lock the build in, raise the flag, then hand over */
  useEffect(() => {
    if (!ready) return undefined
    const wait = Math.max(0, minShow - (Date.now() - startedAt.current))
    let t2 = 0

    const t1 = setTimeout(() => {
      setFinished(true)
      loopRef.current?.pause()

      const root = rootRef.current
      const flag = root?.querySelector('.flag')
      if (root && !reducedMotion()) {
        const bars = root.querySelectorAll('.bar')
        animate(bars, { translateY: 0, opacity: 1, duration: 300, ease: 'outQuad' })
        animate(bars, { scale: [1, 1.1, 1], duration: 450, delay: stagger(70, { start: 250 }), ease: 'outQuad' })
        if (flag) animate(flag, { scale: [0, 1], opacity: [0, 1], duration: 600, delay: 650, ease: 'outBack' })
      } else if (flag) {
        flag.style.opacity = '1'
      }

      t2 = setTimeout(() => finishedCb.current?.(), FINISH_HOLD + 650)
    }, wait)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ready, minShow])

  const last = BAR_COLORS.length - 1
  const flagX = BAR_X0 + last * (BAR_W + BAR_GAP) + BAR_W / 2
  const flagY = BAR_BASE - BAR_H[last]

  const resolve = (v, fallback) => (typeof v === 'function' ? v(theme, code) : v ?? fallback)

  const heading = finished
    ? resolve(
        doneTitle,
        theme ? `${code} · ${theme.name}, you’re all set!` : 'All set!'
      )
    : resolve(title, theme ? `Loading your ${code} journey` : 'Loading your page')

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#f3e7d6]/95 px-4 py-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div ref={rootRef} className="w-full max-w-sm text-center">
        {/* your own MBTI character: big, but its size is locked here so it can never grow past this box */}
        <div className="flex items-end justify-center pb-4 pt-2">
          {theme ? (
            /* just the character, no background shape behind it */
            <div ref={heroRef} className="mx-auto shrink-0" style={{ width: 'clamp(230px, 36vmin, 320px)' }}>
              <MbtiCharacter code={mbti} cheer celebrate={finished ? 1 : 0} className="block w-full" />
            </div>
          ) : (
            <div className="mb-4 h-20 w-20 animate-pulse rounded-full bg-[#0b0b2b]/15" aria-hidden="true" />
          )}
        </div>

        {/* small bars, just an accent under the character */}
        <svg viewBox="0 0 240 160" className="mx-auto block h-auto w-full max-w-[150px] sm:max-w-[170px]" aria-hidden="true">
          <rect x="8" y={BAR_BASE} width="224" height="6" rx="3" fill="#d9c8ae" />

          {BAR_COLORS.map((color, i) => (
            <g
              key={color}
              className="bar"
              style={{ opacity: reducedMotion() ? 1 : 0, transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            >
              <rect
                x={BAR_X0 + i * (BAR_W + BAR_GAP)}
                y={BAR_BASE - BAR_H[i]}
                width={BAR_W}
                height={BAR_H[i]}
                rx="6"
                fill={color}
              />
              <rect
                x={BAR_X0 + i * (BAR_W + BAR_GAP) + 5}
                y={BAR_BASE - BAR_H[i] + 5}
                width={BAR_W - 10}
                height="6"
                rx="3"
                fill="#fff"
                opacity="0.35"
              />
            </g>
          ))}

          <g
            className="flag"
            style={{ opacity: 0, transformBox: 'fill-box', transformOrigin: '0% 100%' }}
            transform={`translate(${flagX} ${flagY})`}
          >
            <rect x="-1.5" y="-30" width="3" height="30" rx="1.5" fill="#0b0b2b" />
            <polygon points="1.5,-30 24,-23 1.5,-16" fill="#2f9e62" />
          </g>
        </svg>

        <div className="mt-5 text-xl font-black tracking-tight text-black">{heading}</div>
        <div className="mt-2 min-h-[20px] text-sm text-neutral-600">
          {finished ? 'Opening your page...' : lines[line] ?? ''}
        </div>
      </div>
    </div>
  )
}

export default PageLoader