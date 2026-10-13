// backend/src/services/emailVerification.js
// 6-digit email verification codes (sent through Brevo).
import { randomInt, createHash, timingSafeEqual } from 'node:crypto'
import { supabase } from '../config/supabase.js'
import { sendVerificationCodeEmail } from './brevo.js'

export const CODE_TTL_MINUTES = 10
const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000 // 1 min
export const MAX_ATTEMPTS = 5

// Hash is salted with the user id, so two users with the same code never collide.
const hashCode = (userId, code) => createHash('sha256').update(`${userId}:${code}`).digest('hex')

const safeEqual = (a, b) => {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && timingSafeEqual(x, y)
}

// Creates a fresh code (replacing any older one) and emails it.
// If the email fails, the row is removed so "resend" works immediately.
export async function issueVerification(user) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')

  await supabase.from('email_verifications').delete().eq('user_id', user.id)

  const { error } = await supabase.from('email_verifications').insert({
    user_id: user.id,
    token_hash: hashCode(user.id, code), // column name kept from the link version
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    attempts: 0,
  })
  if (error) throw error

  // DEV ONLY: set DEV_LOG_CODES=true in .env to print the code in the server
  // terminal and keep it valid even if the email fails. Never enable in production.
  const devLog = process.env.DEV_LOG_CODES === 'true'
  if (devLog) console.log(`[DEV] Verification code for ${user.email}: ${code}`)

  try {
    await sendVerificationCodeEmail({
      email: user.email,
      name: user.name,
      code,
      minutes: CODE_TTL_MINUTES,
    })
  } catch (err) {
    if (!devLog) {
      await supabase.from('email_verifications').delete().eq('user_id', user.id)
    }
    throw err
  }
}

// Returns { ok: true } or
// { ok: false, reason: 'invalid' | 'expired' | 'locked', attemptsLeft? }
export async function consumeVerification(email, code) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (userError) throw userError
  if (!user) return { ok: false, reason: 'invalid' } // same answer as a wrong code

  const { data: row, error } = await supabase
    .from('email_verifications')
    .select('id, token_hash, expires_at, attempts')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!row) return { ok: false, reason: 'invalid' }

  if (new Date(row.expires_at) < new Date()) {
    await supabase.from('email_verifications').delete().eq('id', row.id)
    return { ok: false, reason: 'expired' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'locked' }
  }

  if (!safeEqual(row.token_hash, hashCode(user.id, code))) {
    const attempts = row.attempts + 1
    await supabase.from('email_verifications').update({ attempts }).eq('id', row.id)
    return {
      ok: false,
      reason: attempts >= MAX_ATTEMPTS ? 'locked' : 'invalid',
      attemptsLeft: Math.max(MAX_ATTEMPTS - attempts, 0),
    }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ email_verified: true, email_verified_at: new Date().toISOString() })
    .eq('id', user.id)
  if (updateError) throw updateError

  await supabase.from('email_verifications').delete().eq('user_id', user.id)
  return { ok: true }
}

// True if a code was sent less than RESEND_COOLDOWN_MS ago.
export async function onCooldown(userId) {
  const { data } = await supabase
    .from('email_verifications')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return !!data && Date.now() - new Date(data.created_at).getTime() < RESEND_COOLDOWN_MS
}