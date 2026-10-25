import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import { verifyEmail, resendVerification } from '../../api/auth' // adjust path if needed
import { MIN_SPIN_MS, Spinner, popSuccess, rumble, shake, wait } from './codeAnimation' // adjust path if needed

// Palette: page bg #F0E6D6 | card #FAF6EF | input #F3EADB | border #E2D6C3 | navy #0A0A2C
const autofillFix =
  '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#F3EADB] [&:-webkit-autofill]:[-webkit-text-fill-color:#0A0A2C]'

const inputClass = `w-full rounded-2xl border border-[#E2D6C3] bg-[#F3EADB] px-4 py-3.5 text-sm text-[#0A0A2C] placeholder-[#8C8576] outline-none transition focus:border-[#0A0A2C] focus:bg-[#FAF6EF] focus:ring-2 focus:ring-[#0A0A2C]/15 ${autofillFix}`

const labelClass = 'mb-2 block text-sm font-semibold text-[#0A0A2C]'

const COOLDOWN_SECONDS = 60

const VerifyEmailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = location.state?.email || ''
  const emailSent = location.state?.emailSent !== false

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [rumbling, setRumbling] = useState(false) // step 1: code box rumbles
  const [loading, setLoading] = useState(false) // step 2: spinner while verifying
  const [success, setSuccess] = useState(false) // step 3: check mark
  const [error, setError] = useState('')
  const [info, setInfo] = useState(
    initialEmail
      ? emailSent
        ? `We sent a 6-digit code to ${initialEmail}.`
        : 'We could not send the email. Tap "Resend code" to try again.'
      : ''
  )
  const [cooldown, setCooldown] = useState(0)

  const pageRef = useRef(null)
  const codeRef = useRef(null)
  const buttonRef = useRef(null)
  const infoRef = useRef(null)
  const errorRef = useRef(null)
  const prevCodeLen = useRef(0)

  // Entrance: staggered fade/slide-in
  useEffect(() => {
    if (!pageRef.current) return
    animate(pageRef.current.querySelectorAll('[data-enter]'), {
      opacity: [0, 1],
      translateY: [24, 0],
      delay: stagger(110),
      duration: 700,
      ease: 'outExpo',
    })
  }, [])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Error: slide in the alert + shake the code input
  useEffect(() => {
    if (!error) return
    if (errorRef.current) {
      animate(errorRef.current, {
        opacity: [0, 1],
        translateY: [-8, 0],
        duration: 350,
        ease: 'outQuad',
      })
    }
    shake(codeRef.current)
  }, [error])

  // Info: fade in
  useEffect(() => {
    if (!info || !infoRef.current) return
    animate(infoRef.current, {
      opacity: [0, 1],
      translateY: [-8, 0],
      duration: 350,
      ease: 'outQuad',
    })
  }, [info])

  const handleCodeChange = (e) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(next)

    // Pop on each new digit
    if (next.length > prevCodeLen.current && codeRef.current) {
      animate(codeRef.current, {
        scale: [
          { to: 1.04, duration: 80 },
          { to: 1, duration: 180 },
        ],
        ease: 'outQuad',
      })
    }
    prevCodeLen.current = next.length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.')
      return
    }

    try {
      // Start the request right away, but don't look at the result until the animation has played
      const request = verifyEmail(email.trim().toLowerCase(), code).then(
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
      const data = result.value // verifyEmail() saves the token + user when the backend returns them

      // 3) finish: check mark + pop, then leave
      setLoading(false)
      setSuccess(true)
      await popSuccess([codeRef.current, buttonRef.current])

      if (data.token) {
        navigate('/dashboard', { replace: true }) // logged in automatically
      } else {
        navigate('/login', { state: { message: 'Email verified. You can now log in.' } })
      }
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

  const handleResend = async () => {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Enter your email first.')
      return
    }

    try {
      const data = await resendVerification(email.trim().toLowerCase())
      setInfo(data.message)
      setCooldown(COOLDOWN_SECONDS)
    } catch (err) {
      if (err.status === 429) setCooldown(COOLDOWN_SECONDS)
      setError(err.message)
    }
  }

  const busy = rumbling || loading || success

  return (
    <div
      ref={pageRef}
      className="flex min-h-screen flex-col items-center justify-center bg-[#F0E6D6] px-4 py-10"
    >
      <div data-enter className="mx-auto mb-6 max-w-xl text-center opacity-0">
        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-[#0A0A2C]">
          Check your email.
        </h1>
        <p className="mt-3 text-sm text-[#5B564B]">Enter the code to verify your account.</p>
      </div>

      <div
        data-enter
        className="w-full max-w-[480px] rounded-3xl bg-[#FAF6EF] p-8 opacity-0 shadow-[0_2px_16px_rgba(60,45,20,0.08)]"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {!initialEmail && (
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
          )}

          <div>
            <label htmlFor="code" className={labelClass}>
              Verification Code
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
              onChange={handleCodeChange}
              placeholder="123456"
              className={`${inputClass} text-center text-xl tracking-[0.5em]`}
            />
          </div>

          {info && (
            <div
              ref={infoRef}
              role="status"
              className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {info}
            </div>
          )}
          {error && (
            <div
              ref={errorRef}
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <button
            ref={buttonRef}
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0A0A2C] py-3.5 text-sm font-bold text-white transition hover:bg-[#1A1A4A] focus:outline-none focus:ring-2 focus:ring-[#0A0A2C]/40 focus:ring-offset-2 focus:ring-offset-[#FAF6EF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {success ? (
              'Verified ✓'
            ) : loading ? (
              <>
                <Spinner />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-[#5B564B]">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="font-semibold text-[#0A0A2C] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
          <a href="/login" className="hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage