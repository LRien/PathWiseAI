// backend/src/middleware/auth.js  (REPLACE the previous version)

import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'

// Requires a valid, non-logged-out "Authorization: Bearer <token>" header
// AND a verified email. Unverified accounts can't use any protected route.
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    return res.status(401).json({ message })
  }

  // Tokens issued before logout support have no jti: ask the user to log in again
  if (!payload.jti) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  try {
    // Logged-out (revoked) token?
    const { data: revoked, error } = await supabase
      .from('revoked_tokens')
      .select('jti')
      .eq('jti', payload.jti)
      .maybeSingle()

    if (error) throw error
    if (revoked) {
      return res.status(401).json({ message: 'Session has been logged out' })
    }

    // Account still exists, password unchanged since login, and email verified?
    // Checked live, so it also covers old tokens and deleted accounts.
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email_verified, password_changed_at')
      .eq('id', payload.sub)
      .maybeSingle()

    if (userError) throw userError
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' })
    }
    // A password reset invalidates every token issued before it
    if (
      user.password_changed_at &&
      payload.iat < Math.floor(new Date(user.password_changed_at).getTime() / 1000)
    ) {
      return res.status(401).json({ message: 'Password was changed. Please log in again.' })
    }
    // 403 (not 401) so the frontend doesn't treat it as an expired session
    if (!user.email_verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email to use this service',
      })
    }
  } catch (err) {
    console.error('Auth check error:', err)
    return res.status(500).json({ message: 'Could not verify session' })
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    jti: payload.jti,
    exp: payload.exp,
  }
  next()
}

// Use after requireAuth, e.g. requireRole('admin')
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    next()
  }