// server/middleware/verified.js
// Use AFTER requireAuth on any route that needs a verified email:
//   router.get('/something', requireAuth, requireVerified, handler)
// Reads the flag from the DB so it's always current (not baked into the JWT).

import { supabase } from '../config/supabase.js'

export async function requireVerified(req, res, next) {
  const { data: user, error } = await supabase
    .from('users')
    .select('email_verified')
    .eq('id', req.user.id)
    .maybeSingle()

  if (error) {
    console.error('Verified check error:', error)
    return res.status(500).json({ message: 'Could not verify account status' })
  }
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (!user.email_verified) {
    return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first' })
  }
  next()
}