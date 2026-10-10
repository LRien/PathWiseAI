// server/routes/auth.js  (REPLACE the previous version)

import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// jwtid gives every token a unique id so it can be revoked on logout
const signToken = (user) =>
  jwt.sign({ email: user.email, role: user.role }, process.env.JWT_SECRET, {
    subject: user.id,
    jwtid: randomUUID(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

const publicUser = ({ id, name, email, role, created_at }) => ({
  id,
  name,
  email,
  role,
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

// POST /api/auth/register
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
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' })
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

  res.status(201).json({ token: signToken(user), user: publicUser(user) })
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
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' })
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

  // Cascades to assessments, predictions and prediction_careers
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