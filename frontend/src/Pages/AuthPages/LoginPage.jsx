import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../../api/auth' // adjust path if needed

const EyeIcon = ({ off }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
)

// Palette taken from the Contact page:
// page bg #F0E6D6 | card #FAF6EF | input #F3EADB | border #E2D6C3 | navy #0A0A2C
// Keeps browser autofill from turning inputs light blue
const autofillFix =
  '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#F3EADB] [&:-webkit-autofill]:[-webkit-text-fill-color:#0A0A2C]'

const inputClass = `w-full rounded-2xl border border-[#E2D6C3] bg-[#F3EADB] px-4 py-3.5 text-sm text-[#0A0A2C] placeholder-[#8C8576] outline-none transition focus:border-[#0A0A2C] focus:bg-[#FAF6EF] focus:ring-2 focus:ring-[#0A0A2C]/15 ${autofillFix}`

// One pair is picked at random each time the page loads.
const QUOTES = [
  {
    title: 'Your future career starts with one honest step.',
    subtitle: 'Sign in and keep exploring what fits you.',
  },
  {
    title: 'Know yourself, and the right path gets clearer.',
    subtitle: 'Welcome back. Your results are waiting.',
  },
  {
    title: 'Great careers are built on strengths you already have.',
    subtitle: 'Sign in to see where yours can take you.',
  },
  {
    title: 'Small steps today shape the work you love tomorrow.',
    subtitle: 'Pick up where you left off.',
  },
  {
    title: 'The right direction is closer than it feels.',
    subtitle: 'Sign in to your Career Match account.',
  },
  {
    title: 'Curiosity is the best compass for your career.',
    subtitle: 'Welcome back. Let’s keep going.',
  },
  {
    title: 'You don’t have to have it all figured out. Just begin.',
    subtitle: 'Sign in to continue your journey.',
  },
  {
    title: 'Your personality is a strength. Build a career around it.',
    subtitle: 'Good to see you again.',
  },
]

const pickRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)]

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  // Success message passed from the verify / reset-password pages
  const notice = location.state?.message || ''
  // Where to go after signing in (set by ProtectedRoute); defaults to the dashboard
  const from = location.state?.from || '/dashboard'
  // Lazy initializer: picks once on load, so typing doesn't change the quote
  const [quote] = useState(pickRandomQuote)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      // login() saves the token and user in localStorage
      await login(cleanEmail, password)
      navigate(from, { replace: true })
    } catch (err) {
      // Account exists but the email was never verified: send them to enter the code
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', { state: { email: cleanEmail, emailSent: true, from } })
        return
      }
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F0E6D6] px-4 py-10">
      {/* back to the home page */}
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[#E2D6C3] bg-[#FAF6EF] px-4 py-2 text-xs font-bold text-[#0A0A2C] transition hover:border-[#0A0A2C] focus:outline-none focus:ring-2 focus:ring-[#0A0A2C]/20 sm:left-8 sm:top-8"
      >
        <span aria-hidden="true">←</span> Back to home
      </Link>

      <div className="mx-auto mb-6 mt-10 max-w-xl text-center sm:mt-0">
        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-[#0A0A2C]">
          {quote.title}
        </h1>
        <p className="mt-3 text-sm text-[#5B564B]">{quote.subtitle}</p>
      </div>

      <div className="w-full max-w-[440px] rounded-3xl bg-[#FAF6EF] p-8 shadow-[0_2px_16px_rgba(60,45,20,0.08)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#0A0A2C]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-semibold text-[#0A0A2C]">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-semibold text-[#0A0A2C] underline-offset-2 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password..."
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8576] hover:text-[#0A0A2C]"
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {notice && !error && (
            <div
              role="status"
              className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {notice}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#0A0A2C] py-3.5 text-sm font-bold text-white transition hover:bg-[#1A1A4A] focus:outline-none focus:ring-2 focus:ring-[#0A0A2C]/40 focus:ring-offset-2 focus:ring-offset-[#FAF6EF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#5B564B]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-[#0A0A2C] underline-offset-2 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage