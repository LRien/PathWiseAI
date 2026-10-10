// server/middleware/auth.js  (REPLACE the previous version)

import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'

// Requires a valid, non-logged-out "Authorization: Bearer <token>" header.
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
    const { data: revoked, error } = await supabase
      .from('revoked_tokens')
      .select('jti')
      .eq('jti', payload.jti)
      .maybeSingle()

    if (error) throw error
    if (revoked) {
      return res.status(401).json({ message: 'Session has been logged out' })
    }
  } catch (err) {
    console.error('Token revocation check error:', err)
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