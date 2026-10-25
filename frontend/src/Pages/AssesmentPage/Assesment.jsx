import React from 'react'
import { useNavigate } from 'react-router-dom'
import MbtiCharacter, { TYPES } from '../UsersPage/UsersComponents/MbtiCharacter'

const PERSONALITY_TEST_URL = 'https://www.16personalities.com/free-personality-test'

const TEST_POINTS = [
  'Takes only 10–12 minutes to complete',
  'Instant results',
  'No account required',
  'Return to Career Match after obtaining your personality type',
]

const KNOWN_POINTS = [
  'Skip the test if you know your type',
  'Select from all 16 MBTI types',
  'Proceed immediately to the full assessment',
  'You can always retake the test later',
]

// Shared by both buttons so they look identical
const PRIMARY_BTN =
  'block w-full rounded-full bg-[#0A0A2C] py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#1A1A4A] focus:outline-none focus:ring-2 focus:ring-[#0A0A2C]/40 focus:ring-offset-2 focus:ring-offset-[#FAF6EF]'

/* Strips the ring, the round clip and the circular scene/platform from MbtiCharacter
   using CSS only, so the component file doesn't need to change. */
const BARE_CHARACTER =
  '[&>svg]:hidden [&>div]:!inset-0 [&>div]:!overflow-visible [&>div]:!rounded-none [&>div>svg>g:first-child]:hidden [&>div>svg>polygon]:hidden'

// Even types go on the left, odd on the right, so all four colour groups appear on both sides
const LEFT = TYPES.filter((_, i) => i % 2 === 0)
const RIGHT = TYPES.filter((_, i) => i % 2 === 1)

const BulletList = ({ items }) => (
  <ul className="space-y-3">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-3 text-sm text-[#5B564B]">
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8C8576]" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

/* One side of the backdrop: 2 columns x 4 rows, the inner column dropped a little for a staggered look */
const Side = ({ types, innerCol }) => (
  <div className="grid h-full w-[calc((100%-58rem)/2)] grid-cols-2 grid-rows-4 gap-x-2">
    {types.map(([code], k) => {
      const col = k % 2
      const isInner = col === innerCol
      return (
        <div
          key={code}
          className={`flex items-center justify-center ${isInner ? 'translate-y-8' : ''}`}
        >
          <div
            className="opacity-70"
            style={{
              width: 'min(100%, 130px)',
              transform: `rotate(${(k + (isInner ? 1 : 0)) % 2 ? 6 : -6}deg)`,
            }}
          >
            <MbtiCharacter code={code} animate={false} className={BARE_CHARACTER} />
          </div>
        </div>
      )
    })}
  </div>
)

/* All 16 characters, 8 on each side of the content, always on screen while scrolling */
const CharacterBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
    <div className="sticky top-0 flex h-[calc(100vh-7rem)] justify-between px-6 py-4">
      <Side types={LEFT} innerCol={1} />
      <Side types={RIGHT} innerCol={0} />
    </div>
  </div>
)

const Assesment = () => {
  const navigate = useNavigate()

  const handleTakeTest = () => {
    window.open(PERSONALITY_TEST_URL, '_blank', 'noopener,noreferrer')
  }

  // The /dashboard route is protected: logged-in users go straight in,
  // everyone else is sent to /login and returned to the dashboard after signing in.
  const handleAlreadyKnow = () => navigate('/dashboard')

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F0E6D6] px-4 py-16">
      <CharacterBackdrop />

      <div className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-[#0A0A2C] sm:text-5xl">
            First, let&apos;s identify your personality type
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#5B564B]">
            Before we can match you with careers, we need to know your MBTI personality type. It takes
            about 10 minutes and makes your results significantly more accurate.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: take the test */}
          <div className="flex flex-col rounded-3xl bg-[#FAF6EF] p-8 shadow-[0_2px_16px_rgba(60,45,20,0.08)]">
            <h2 className="text-xl font-bold leading-snug text-[#0A0A2C]">
              Don&apos;t know your MBTI personality type?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5B564B]">
              Take the free personality assessment at 16Personalities to identify the personality type
              you&apos;ll use in Career Match.
            </p>

            <div className="mt-6">
              <BulletList items={TEST_POINTS} />
            </div>

            <div className="mt-auto pt-8">
              <button type="button" onClick={handleTakeTest} className={PRIMARY_BTN}>
                Take Personality Test
              </button>
            </div>
          </div>

          {/* Card 2: already know it */}
          <div className="flex flex-col rounded-3xl bg-[#FAF6EF] p-8 shadow-[0_2px_16px_rgba(60,45,20,0.08)]">
            <h2 className="text-xl font-bold leading-snug text-[#0A0A2C]">I already know my MBTI</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5B564B]">
              If you have taken the test before and already know your personality type, you can go
              directly to your dashboard and select it in the assessment.
            </p>

            <div className="mt-6">
              <BulletList items={KNOWN_POINTS} />
            </div>

            <div className="mt-auto pt-8">
              <button type="button" onClick={handleAlreadyKnow} className={PRIMARY_BTN}>
                Take Career Recommendation Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Assesment