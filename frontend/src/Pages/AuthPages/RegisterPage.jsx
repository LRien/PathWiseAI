import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../../api/auth' // adjust the path if your folders differ
import PasswordChecklist, { isStrongPassword, PASSWORD_RULES_MESSAGE } from './PasswordChecklist'

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

// Palette from the Contact and Login pages:
// page bg #F0E6D6 | card #FAF6EF | input #F3EADB | border #E2D6C3 | navy #0A0A2C
const autofillFix =
  '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#F3EADB] [&:-webkit-autofill]:[-webkit-text-fill-color:#0A0A2C]'

const inputClass = `w-full rounded-2xl border border-[#E2D6C3] bg-[#F3EADB] px-4 py-3.5 text-sm text-[#0A0A2C] placeholder-[#8C8576] outline-none transition focus:border-[#0A0A2C] focus:bg-[#FAF6EF] focus:ring-2 focus:ring-[#0A0A2C]/15 ${autofillFix}`

const labelClass = 'mb-2 block text-sm font-semibold text-[#0A0A2C]'

// One pair is picked at random each time the page loads.
const QUOTES = [
  {
    title: 'One step closer to your dream career.',
    subtitle: 'Create your Career Match account.',
  },
  {
    title: 'Every great career starts with knowing yourself.',
    subtitle: 'Create an account to discover your best fit.',
  },
  {
    title: 'Your strengths already point somewhere. Let’s find where.',
    subtitle: 'Join Career Match in a minute.',
  },
  {
    title: 'The first step is the hardest. You’re already here.',
    subtitle: 'Create your account to get started.',
  },
  {
    title: 'Start with who you are. The career will follow.',
    subtitle: 'Set up your Career Match account.',
  },
  {
    title: 'A clearer path begins with one honest assessment.',
    subtitle: 'Create your account and take the first step.',
  },
]

const pickRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)]

const PasswordField = ({ id, label, value, onChange, show, onToggle, autoComplete, placeholder }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8576] hover:text-[#0A0A2C]"
      >
        <EyeIcon off={show} />
      </button>
    </div>
  </div>
)

const RegisterPage = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  // Lazy initializer: picks once on load, so typing doesn't change the quote
  const [quote] = useState(pickRandomQuote)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isStrongPassword(form.password)) {
      setError(PASSWORD_RULES_MESSAGE)
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const email = form.email.trim().toLowerCase()
      // Backend expects a single "name" field
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()

      const data = await register({ name, email, password: form.password })

      // No token yet: the user must enter the 6-digit code sent to their email.
      navigate('/verify-email', {
        state: { email, emailSent: data.emailSent !== false },
      })
    } catch (err) {
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

      <div className="w-full max-w-[480px] rounded-3xl bg-[#FAF6EF] p-8 shadow-[0_2px_16px_rgba(60,45,20,0.08)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={handleChange}
                placeholder="Juan"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={handleChange}
                placeholder="dela Cruz"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email address..."
              className={inputClass}
            />
          </div>

          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            autoComplete="new-password"
            placeholder="Create a strong password"
          />

          <PasswordChecklist password={form.password} />

          <PasswordField
            id="confirmPassword"
            label="Confirm Password"
            value={form.confirmPassword}
            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            show={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
            autoComplete="new-password"
            placeholder="Re-enter your password"
          />

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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#5B564B]">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-[#0A0A2C] underline-offset-2 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage