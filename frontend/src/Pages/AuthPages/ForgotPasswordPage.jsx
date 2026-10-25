import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { forgotPassword, resetPassword } from '../../api/auth' // adjust path if needed
import PasswordChecklist, { isStrongPassword, PASSWORD_RULES_MESSAGE } from './PasswordChecklist'
import { MIN_SPIN_MS, Spinner, popSuccess, rumble, shake, wait } from './codeAnimation' // adjust path if needed

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

// Palette: page bg #F0E6D6 | card #FAF6EF | input #F3EADB | border #E2D6C3 | navy #0A0A2C
const autofillFix =
  '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#F3EADB] [&:-webkit-autofill]:[-webkit-text-fill-color:#0A0A2C]'

const inputClass = `w-full rounded-2xl border border-[#E2D6C3] bg-[#F3EADB] px-4 py-3.5 text-sm text-[#0A0A2C] placeholder-[#8C8576] outline-none transition focus:border-[#0A0A2C] focus:bg-[#FAF6EF] focus:ring-2 focus:ring-[#0A0A2C]/15 ${autofillFix}`

const labelClass = 'mb-2 block text-sm font-semibold text-[#0A0A2C]'

const primaryBtnClass =
  'flex w-full items-center justify-center gap-2 rounded-full bg-[#0A0A2C] py-3.5 text-sm font-bold text-white transition hover:bg-[#1A1A4A] focus:outline-none focus:ring-2 focus:ring-[#0A0A2C]/40 focus:ring-offset-2 focus:ring-offset-[#FAF6EF] disabled:cursor-not-allowed disabled:opacity-60'

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

const COOLDOWN_SECONDS = 60

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  // The emailed link looks like /forgot-password?email=...&code=123456
  // When it is opened we skip straight to step 2 with both values filled in.
  const [params] = useSearchParams()
  const linkEmail = params.get('email') || ''
  const linkCode = (params.get('code') || '').replace(/\D/g, '').slice(0, 6)
  const fromLink = Boolean(linkEmail && linkCode.length === 6)

  const [step, setStep] = useState(fromLink ? 2 : 1) // 1 = enter email, 2 = code + new password
  const [email, setEmail] = useState(fromLink ? linkEmail : '')
  const [code, setCode] = useState(fromLink ? linkCode : '')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rumbling, setRumbling] = useState(false) // step 2: code box rumbles
  const [loading, setLoading] = useState(false) // spinner while the request runs
  const [success, setSuccess] = useState(false) // check mark before leaving
  const [error, setError] = useState('')
  const [info, setInfo] = useState(fromLink ? 'Link verified. Choose your new password below.' : '')
  const [cooldown, setCooldown] = useState(0)

  const codeRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Wrong code / any error on step 2: shake the code box
  useEffect(() => {
    if (error && step === 2) shake(codeRef.current)
  }, [error, step])

  const cleanEmail = email.trim().toLowerCase()

  const requestCode = async () => {
    const data = await forgotPassword(cleanEmail)
    setInfo(data.message)
    setCooldown(COOLDOWN_SECONDS)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await requestCode()
      setStep(2)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setInfo('')
    try {
      await requestCode()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.')
      return
    }
    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_RULES_MESSAGE)
      return
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }

    try {
      // Start the request right away, but don't look at the result until the animation has played
      const request = resetPassword(cleanEmail, code, newPassword).then(
        (value) => ({ ok: true, value }),
        (err) => ({ ok: false, err })
      )

      // 1) rumble the code
      setRumbling(true)
      await rumble(codeRef.current)
      setRumbling(false)

      // 2) spin while loading (at least MIN_SPIN_MS so it never just flashes)
      setLoading(true)
      const [result] = await Promise.all([request, wait(MIN_SPIN_MS)])
      if (!result.ok) throw result.err

      // 3) finish: check mark + pop, then leave
      setLoading(false)
      setSuccess(true)
      await popSuccess([codeRef.current, buttonRef.current])

      navigate('/login', {
        state: { message: 'Password updated. Please log in with your new password.' },
      })
    } catch (err) {
      let msg = err.message
      if (err.code === 'INVALID_CODE' && err.attemptsLeft !== undefined) {
        msg += ` (${err.attemptsLeft} attempt${err.attemptsLeft === 1 ? '' : 's'} left)`
      }
      setRumbling(false)
      setLoading(false)
      setError(msg || 'Something went wrong. Please try again.')
    }
  }

  const busy = rumbling || loading || success

  const errorBox = error && (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
    >
      {error}
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0E6D6] px-4 py-10">
      <div className="mx-auto mb-6 max-w-xl text-center">
        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-[#0A0A2C]">
          {step === 1 ? 'Forgot your password?' : 'Set a new password.'}
        </h1>
        <p className="mt-3 text-sm text-[#5B564B]">
          {step === 1
            ? 'Enter your email and we’ll send you a 6-digit reset code.'
            : 'Enter the code we emailed you and choose a new password.'}
        </p>
      </div>

      <div className="w-full max-w-[480px] rounded-3xl bg-[#FAF6EF] p-8 shadow-[0_2px_16px_rgba(60,45,20,0.08)]">
        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>
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

            {errorBox}

            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? (
                <>
                  <Spinner />
                  Sending...
                </>
              ) : (
                'Send Reset Code'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-5">
            <div>
              <label htmlFor="code" className={labelClass}>
                Reset Code
              </label>
              <input
                ref={codeRef}
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                readOnly={busy}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className={`${inputClass} text-center text-xl tracking-[0.5em]`}
              />
            </div>

            <PasswordField
              id="newPassword"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              autoComplete="new-password"
              placeholder="Create a strong password"
            />

            <PasswordChecklist password={newPassword} />

            <PasswordField
              id="confirmNewPassword"
              label="Confirm New Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              show={showConfirm}
              onToggle={() => setShowConfirm((s) => !s)}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
            />

            {info && (
              <div
                role="status"
                className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {info}
              </div>
            )}
            {errorBox}

            <button ref={buttonRef} type="submit" disabled={busy} className={primaryBtnClass}>
              {success ? (
                'Password updated ✓'
              ) : loading ? (
                <>
                  <Spinner />
                  Updating...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="flex flex-col items-center gap-2 text-xs text-[#5B564B]">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || busy}
                className="font-semibold text-[#0A0A2C] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep(1)
                  setError('')
                  setInfo('')
                }}
                className="hover:underline disabled:opacity-50"
              >
                Use a different email
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[#5B564B]">
          Remembered it?{' '}
          <a href="/login" className="font-semibold text-[#0A0A2C] underline-offset-2 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordPage