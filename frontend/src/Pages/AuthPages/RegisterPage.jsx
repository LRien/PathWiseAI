import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
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

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Could not create your account.')
      }

      // If the backend logs the user in on register, keep the token and go straight in.
      if (data.token) {
        localStorage.setItem('token', data.token)
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
        navigate('/dashboard')
      } else {
        navigate('/login')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    // Redirect to your backend's Google OAuth route (or call Supabase OAuth here)
    window.location.href = `${API_URL}/api/auth/google`
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0E6D6] px-4 py-10">
      <div className="mx-auto mb-6 max-w-xl text-center">
        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-[#0A0A2C]">
          {quote.title}
        </h1>
        <p className="mt-3 text-sm text-[#5B564B]">{quote.subtitle}</p>
      </div>

      <div className="w-full max-w-[480px] rounded-3xl bg-[#FAF6EF] p-8 shadow-[0_2px_16px_rgba(60,45,20,0.08)]">
        <button
          type="button"
          onClick={handleGoogleSignup}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-[#E2D6C3] bg-[#FAF6EF] py-3 text-sm font-semibold text-[#0A0A2C] transition hover:bg-[#F3EADB]"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#E2D6C3]" />
          <span className="text-xs text-[#8C8576]">or register with email</span>
          <span className="h-px flex-1 bg-[#E2D6C3]" />
        </div>

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
            placeholder="At least 8 characters"
          />

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