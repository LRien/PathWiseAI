import React from 'react'

/* Shared by VerifyEmailPage and ForgotPasswordPage so both play the same sequence:
   1. rumble the code box  ->  2. spinner while the request runs  ->  3. check mark / pop

   Uses the browser's built-in element.animate() and an SVG-native spinner, so it does not
   depend on anime.js, Tailwind animation classes, or the element's CSS transitions. */

export const MIN_SPIN_MS = 900 // keep the spinner visible long enough to feel like "loading"

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const play = (el, keyframes, options) => {
  if (!el || typeof el.animate !== 'function') return wait(options.duration)
  return el
    .animate(keyframes, { fill: 'none', ...options })
    .finished.then(
      () => undefined,
      () => undefined
    )
}

const AMPLITUDES = [0, 14, -14, 11, -11, 8, -8, 5, -5, 2, -2, 0] // shakes that fade out

/* Rumble: the code box shakes hard, tilts and swells, then settles. Resolves when it is done. */
export const rumble = (el) =>
  play(
    el,
    AMPLITUDES.map((x, k) => ({
      transform: `translateX(${x}px) rotate(${x / 6}deg) scale(${k === 0 || k === AMPLITUDES.length - 1 ? 1 : 1.06})`,
      easing: 'ease-in-out',
    })),
    { duration: 700 }
  )

/* Short side-to-side shake for a wrong code */
export const shake = (el) =>
  play(
    el,
    [-10, 10, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 350, easing: 'ease-in-out' }
  )

/* Pop for the success state. Resolves after the pop so the page can navigate. */
export const popSuccess = (els) => {
  const targets = (Array.isArray(els) ? els : [els]).filter(Boolean)
  targets.forEach((el) =>
    play(
      el,
      [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 450, easing: 'ease-out' }
    )
  )
  return wait(700)
}

/* Spinner drawn with SVG's own rotation, so it spins no matter what CSS is loaded */
export const Spinner = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.75s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
)