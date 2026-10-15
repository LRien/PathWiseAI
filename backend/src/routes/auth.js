// backend/src/routes/auth.js  (REPLACE your current version)

import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { issueVerification, consumeVerification, onCooldown } from '../services/emailVerification.js'
import { issuePasswordReset, consumePasswordReset, onResetCooldown } from '../services/passwordReset.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password rules (keep in sync with the frontend PasswordChecklist):
// 8+ characters, one uppercase, one lowercase, one number, one special character
const getPasswordError = (p) =>
  p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9\s]/.test(p)
    ? null
    : 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character'

// jwtid gives every token a unique id so it can be revoked on logout
const signToken = (user) =>
  jwt.sign({ email: user.email, role: user.role }, process.env.JWT_SECRET, {
    subject: user.id,
    jwtid: randomUUID(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

const publicUser = ({ id, name, email, role, email_verified, created_at }) => ({
  id,
  name,
  email,
  role,
  email_verified,
  created_at,
})

// Marks the token used for this request as logged out
async function revokeToken(reqUser) {
  const { error } = await supabase.from('revoked_tokens').insert({
    jti: reqUser.jti,
    user_id: reqUser.id,
    expires_at: new Date(reqUser.exp * 1000).toISOString(),
  })
  // 23505 = already revoked, which is fine
  if (error && error.code !== '23505') throw error
}

// Shared by verify-email and reset-password so both answer wrong codes the same way
function sendCodeFailure(res, result) {
  if (result.reason === 'locked') {
    return res.status(429).json({
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many wrong attempts. Please request a new code.',
    })
  }
  if (result.reason === 'expired') {
    return res.status(400).json({
      code: 'CODE_EXPIRED',
      message: 'Code has expired. Please request a new one.',
    })
  }
  return res.status(400).json({
    code: 'INVALID_CODE',
    message: 'Invalid code',
    ...(result.attemptsLeft !== undefined ? { attemptsLeft: result.attemptsLeft } : {}),
  })
}

const isDev = () => process.env.NODE_ENV !== 'production'

// POST /api/auth/register
// Creates the account (unverified) and emails a 6-digit code via Brevo.
// No JWT is issued until the email is verified.
router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' })
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Invalid email address' })
  }
  const passwordError = getPasswordError(password)
  if (passwordError) {
    return res.status(400).json({ message: passwordError })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email, password_hash })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email is already registered' })
    }
    console.error('Register error:', error)
    return res.status(500).json({ message: 'Could not create account' })
  }

  // If Brevo fails the account still exists; the user can use "resend".
  let emailSent = true
  let emailError = null
  try {
    await issueVerification(user)
  } catch (err) {
    emailSent = false
    emailError = err.message
    console.error('Send verification error:', err)
  }

  res.status(201).json({
    message: emailSent
      ? 'Account created. Check your email for the verification code.'
      : 'Account created, but we could not send the verification email. Please request a new code.',
    emailSent,
    // Dev only: shows why the email failed. Hidden in production.
    ...(isDev() && emailError ? { emailError } : {}),
    user: publicUser(user),
  })
})

// POST /api/auth/verify-email
// Body: { email, code }  (the 6-digit code from the email)
// On success the user is logged in right away: returns { token, user }.
router.post('/verify-email', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const code = String(req.body?.code || '').trim()

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required' })
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Code must be 6 digits' })
  }

  try {
    const result = await consumeVerification(email, code)
    if (!result.ok) return sendCodeFailure(res, result)

    // The code proves they own the email, so log them in. Fetched AFTER the
    // verification so email_verified comes back as true.
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    if (userError || !user) throw userError || new Error('User not found after verification')

    res.json({
      message: 'Email verified.',
      token: signToken(user),
      user: publicUser(user),
    })
  } catch (err) {
    console.error('Verify email error:', err)
    res.status(500).json({ message: 'Could not verify email' })
  }
})

// POST /api/auth/resend-verification
// Body: { email }
// Always answers the same way so it can't be used to discover registered emails.
router.post('/resend-verification', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const generic = { message: 'If that account exists and is not verified, a new code has been sent.' }

  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Invalid email address' })

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, email_verified')
      .eq('email', email)
      .maybeSingle()
    if (error) throw error

    if (user && !user.email_verified) {
      if (await onCooldown(user.id)) {
        return res.status(429).json({ message: 'Please wait a minute before requesting another code' })
      }
      await issueVerification(user)
    }
    res.json(generic)
  } catch (err) {
    console.error('Resend verification error:', err)
    res.status(500).json({ message: 'Could not send verification code' })
  }
})

// POST /api/auth/forgot-password
// Body: { email }
// Emails a 6-digit reset code. Always answers the same way (even for unknown emails
// or during the cooldown) so it can't be used to discover registered emails.
// In development only, the response and terminal also say WHY nothing was sent.
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const generic = { message: 'If that email is registered, a password reset code has been sent.' }

  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Invalid email address' })

  let debug = null

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle()
    if (error) throw error

    if (!user) {
      debug = 'No account with this email'
    } else if (await onResetCooldown(user.id)) {
      debug = 'Cooldown active: a code was already sent in the last minute'
    } else {
      try {
        await issuePasswordReset(user)
      } catch (err) {
        // Don't reveal the failure to the caller in production; just log it.
        debug = `Send failed: ${err.message}`
        console.error('Send password reset error:', err)
      }
    }

    if (isDev() && debug) console.log('[forgot-password]', debug)
    res.json({ ...generic, ...(isDev() && debug ? { debug } : {}) })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ message: 'Could not process request' })
  }
})

// POST /api/auth/reset-password
// Body: { email, code, newPassword }
// Sets a new password if the code is right. All older logins stop working.
router.post('/reset-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const code = String(req.body?.code || '').trim()
  const newPassword = String(req.body?.newPassword || '')

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code and new password are required' })
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Code must be 6 digits' })
  }
  const newPasswordError = getPasswordError(newPassword)
  if (newPasswordError) {
    return res.status(400).json({ message: newPasswordError })
  }

  try {
    const result = await consumePasswordReset(email, code)
    if (!result.ok) return sendCodeFailure(res, result)

    const password_hash = await bcrypt.hash(newPassword, 10)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash, password_changed_at: new Date().toISOString() })
      .eq('id', result.userId)

    if (updateError) {
      console.error('Reset password error:', updateError)
      return res.status(500).json({ message: 'Could not reset password' })
    }

    res.json({ message: 'Password updated. Please log in with your new password.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ message: 'Could not reset password' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Could not log in' })
  }

  // Same message for unknown email and wrong password
  const valid = user && (await bcrypt.compare(password, user.password_hash))
  if (!valid) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  // Checked only after the password is correct, so it doesn't leak which emails exist.
  // 403 (not 401) so the frontend doesn't treat it as an expired session.
  if (!user.email_verified) {
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email before logging in',
    })
  }

  res.json({ token: signToken(user), user: publicUser(user) })
})

// POST /api/auth/logout  (protected)
// Revokes the token used for this request. Other devices stay logged in.
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await revokeToken(req.user)
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({ message: 'Could not log out' })
  }

  // Housekeeping: expired tokens are rejected by the JWT check anyway
  await supabase.from('revoked_tokens').delete().lt('expires_at', new Date().toISOString())

  res.json({ message: 'Logged out' })
})

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle()

  if (error) return res.status(500).json({ message: 'Could not fetch user' })
  if (!user) return res.status(404).json({ message: 'User not found' })

  res.json({ user: publicUser(user) })
})

// PATCH /api/auth/password  (protected)
// Body: { currentPassword, newPassword }
// Returns a fresh token; the old one stops working.
router.patch('/password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' })
  }
  const newPasswordError = getPasswordError(newPassword)
  if (newPasswordError) {
    return res.status(400).json({ message: newPasswordError })
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ message: 'New password must be different from the current one' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle()

  if (error) {
    console.error('Change password error:', error)
    return res.status(500).json({ message: 'Could not change password' })
  }
  if (!user) return res.status(404).json({ message: 'User not found' })

  // 400 (not 401) so the frontend doesn't treat it as an expired session
  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) {
    return res.status(400).json({ message: 'Current password is incorrect' })
  }

  const password_hash = await bcrypt.hash(newPassword, 10)
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', user.id)

  if (updateError) {
    console.error('Change password error:', updateError)
    return res.status(500).json({ message: 'Could not change password' })
  }

  // Retire the old token and hand back a new one
  try {
    await revokeToken(req.user)
  } catch (err) {
    console.error('Revoke after password change error:', err)
  }

  res.json({ message: 'Password updated', token: signToken(user) })
})

// DELETE /api/auth/account  (protected)
// Body: { password }  -> permanently deletes the user and all their data
router.delete('/account', requireAuth, async (req, res) => {
  const password = String(req.body?.password || '')

  if (!password) {
    return res.status(400).json({ message: 'Password is required to delete your account' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('id', req.user.id)
    .maybeSingle()

  if (error) {
    console.error('Delete account error:', error)
    return res.status(500).json({ message: 'Could not delete account' })
  }
  if (!user) return res.status(404).json({ message: 'User not found' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(400).json({ message: 'Password is incorrect' })
  }

  // Cascades to assessments, predictions, prediction_careers and email_verifications
  const { error: deleteError } = await supabase.from('users').delete().eq('id', user.id)

  if (deleteError) {
    console.error('Delete account error:', deleteError)
    return res.status(500).json({ message: 'Could not delete account' })
  }

  try {
    await revokeToken(req.user)
  } catch (err) {
    console.error('Revoke after account deletion error:', err)
  }

  res.json({ message: 'Account deleted' })
})

export default router