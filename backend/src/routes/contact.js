// backend/src/routes/contact.js
import { Router } from 'express'
import { sendContactMessageEmail } from '../services/brevo.js'

const router = Router()

/* ---------- Simple in-memory rate limit: 5 messages / 15 min / IP ---------- */
const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map() // ip -> [timestamps]

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
}

// clean out stale entries so the map doesn't grow forever
setInterval(() => {
  const now = Date.now()
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => now - t < WINDOW_MS)
    if (recent.length) hits.set(ip, recent)
    else hits.delete(ip)
  }
}, WINDOW_MS).unref()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (v) => (typeof v === 'string' ? v.trim() : '')
const oneLine = (v) => v.replace(/[\r\n]+/g, ' ')

/* ---------- POST /api/contact ---------- */
router.post('/', async (req, res) => {
  const { _honey } = req.body || {}

  // Honeypot: pretend success so bots don't retry
  if (_honey) return res.json({ ok: true, message: 'Message sent.' })

  if (rateLimited(req.ip)) {
    return res
      .status(429)
      .json({ ok: false, message: 'Too many messages. Please try again in a few minutes.' })
  }

  const name = oneLine(clean(req.body?.name))
  const email = oneLine(clean(req.body?.email))
  const subject = oneLine(clean(req.body?.subject))
  const message = clean(req.body?.message)

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, message: 'All fields are required.' })
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, message: 'Please enter a valid email address.' })
  }
  if (name.length > 100 || subject.length > 150 || message.length > 5000) {
    return res.status(400).json({ ok: false, message: 'One or more fields are too long.' })
  }

  try {
    await sendContactMessageEmail({ name, email, subject, message })
    res.json({ ok: true, message: 'Message sent.' })
  } catch (err) {
    console.error('Contact email failed:', err.message)
    res.status(500).json({ ok: false, message: 'Could not send your message. Please try again later.' })
  }
})

export default router