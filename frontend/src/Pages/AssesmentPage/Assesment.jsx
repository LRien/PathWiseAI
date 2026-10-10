import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const PERSONALITY_TEST_URL = 'https://www.16personalities.com/free-personality-test'

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

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

// Shared by both the <button> and the <Link> so they look identical
const PRIMARY_BTN =
  'block w-full rounded-full bg-[#0A0A2C] py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#1A1A4A] focus:outline-none focus:ring-2 focus:ring-[#0A0A2C]/40 focus:ring-offset-2 focus:ring-offset-[#FAF6EF]'

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

const Assesment = () => {
  const navigate = useNavigate()
  const [mbti, setMbti] = useState('')
  const [error, setError] = useState('')

  const handleTakeTest = () => {
    window.open(PERSONALITY_TEST_URL, '_blank', 'noopener,noreferrer')
  }

  const handleStartAssessment = () => {
    if (!mbti) {
      setError('Please select your MBTI type first.')
      return
    }
    setError('')
    localStorage.setItem('mbtiType', mbti)
    // Change this route to wherever your assessment questions live
    navigate('/career-assessment', { state: { mbti } })
  }

  return (
    <div className="min-h-screen bg-[#F0E6D6] px-4 py-16">
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
            If you have taken the test before and already know your personality type, select it below
            and proceed directly to the assessment.
          </p>

          <div className="mt-6">
            <BulletList items={KNOWN_POINTS} />
          </div>

          <div className="mt-auto pt-8">
            <Link to="/assessment-test" className={PRIMARY_BTN}>
              Take Career Recommendation Assessment
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Assesment