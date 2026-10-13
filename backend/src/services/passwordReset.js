// backend/src/services/passwordReset.js
// 6-digit password reset codes (sent through Brevo).
import { randomInt, createHash, timingSafeEqual } from 'node:crypto'
import { supabase } from '../config/supabase.js'
import { sendPasswordResetCodeEmail } from './brevo.js'

export const RESET_TTL_MINUTES = 15
const RESET_TTL_MS = RESET_TTL_MINUTES * 60 * 1000
export const RESET_COOLDOWN_MS = 60 * 1000 // 1 min
export const MAX_ATTEMPTS = 5

// Salted with the user id and a "reset" prefix so it can never match a verification code hash.
const hashCode = (userId, code) =>
  createHash('sha256').update(`reset:${userId}:${code}`).digest('hex')

const safeEqual = (a, b) => {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && timingSafeEqual(x, y)
}

// Creates a fresh code (replacing any older one) and emails it.
export async function issuePasswordReset(user) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')

  await supabase.from('password_resets').delete().eq('user_id', user.id)

  const { error } = await supabase.from('password_resets').insert({
    user_id: user.id,
    code_hash: hashCode(user.id, code),
    expires_at: new Date(Date.now() + RESET_TTL_MS).toISOString(),
    attempts: 0,
  })
  if (error) throw error

  // DEV ONLY: DEV_LOG_CODES=true prints the code in the server terminal and keeps it
  // valid even if the email fails. Never enable in production.
  const devLog = process.env.DEV_LOG_CODES === 'true'
  if (devLog) console.log(`[DEV] Password reset code for ${user.email}: ${code}`)

  try {
    await sendPasswordResetCodeEmail({
      email: user.email,
      name: user.name,
      code,
      minutes: RESET_TTL_MINUTES,
    })
  } catch (err) {
    if (!devLog) {
      await supabase.from('password_resets').delete().eq('user_id', user.id)
    }
    throw err
  }
}

// Checks the code. Returns { ok: true, userId } or
// { ok: false, reason: 'invalid' | 'expired' | 'locked', attemptsLeft? }
export async function consumePasswordReset(email, code) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (userError) throw userError
  if (!user) return { ok: false, reason: 'invalid' } // same answer as a wrong code

  const { data: row, error } = await supabase
    .from('password_resets')
    .select('id, code_hash, expires_at, attempts')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!row) return { ok: false, reason: 'invalid' }

  if (new Date(row.expires_at) < new Date()) {
    await supabase.from('password_resets').delete().eq('id', row.id)
    return { ok: false, reason: 'expired' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'locked' }
  }

  if (!safeEqual(row.code_hash, hashCode(user.id, code))) {
    const attempts = row.attempts + 1
    await supabase.from('password_resets').update({ attempts }).eq('id', row.id)
    return {
      ok: false,
      reason: attempts >= MAX_ATTEMPTS ? 'locked' : 'invalid',
      attemptsLeft: Math.max(MAX_ATTEMPTS - attempts, 0),
    }
  }

  // Code is correct: it can only be used once
  await supabase.from('password_resets').delete().eq('user_id', user.id)
  return { ok: true, userId: user.id }
}

// True if a reset code was sent less than RESET_COOLDOWN_MS ago.
export async function onResetCooldown(userId) {
  const { data } = await supabase
    .from('password_resets')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return !!data && Date.now() - new Date(data.created_at).getTime() < RESET_COOLDOWN_MS
}