// backend/src/services/brevo.js
// Sends transactional email through Brevo's REST API (Node 18+ has global fetch).
//
// Env (read at call time, so dotenv load order doesn't matter):
//   BREVO_API_KEY        - Brevo > SMTP & API > API Keys
//   BREVO_SENDER_EMAIL   - must be a verified sender in Brevo
//   BREVO_SENDER_NAME    - optional, defaults to "Career Match"

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

function getConfig() {
  const apiKey = (process.env.BREVO_API_KEY || '').trim()
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim()
  const senderName = (process.env.BREVO_SENDER_NAME || 'Career Match').trim()

  const missing = []
  if (!apiKey) missing.push('BREVO_API_KEY')
  if (!senderEmail) missing.push('BREVO_SENDER_EMAIL')
  if (missing.length) {
    throw new Error(`Missing env var(s): ${missing.join(', ')}. Check backend/.env and restart the server.`)
  }
  return { apiKey, senderEmail, senderName }
}

export async function sendEmail({ to, toName, subject, html }) {
  const { apiKey, senderEmail, senderName } = getConfig()

  let res
  try {
    res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15000),
    })
  } catch (err) {
    throw new Error(`Could not reach Brevo (${err.cause?.code || err.name}): ${err.message}`)
  }

  const text = await res.text().catch(() => '')
  if (!res.ok) {
    // Brevo's body explains the reason, e.g. "unrecognised IP address" or "sender not valid"
    throw new Error(`Brevo ${res.status}: ${text}`)
  }

  let data = {}
  try { data = JSON.parse(text) } catch { /* ignore */ }
  console.log(`Brevo accepted email to ${to} (messageId: ${data.messageId || 'n/a'})`)
  return data
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function sendPasswordResetCodeEmail({ email, name, code, minutes }) {
  return sendEmail({
    to: email,
    toName: name,
    subject: `Your password reset code: ${code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>Hi ${escapeHtml(name)},</h2>
        <p>We received a request to reset your password. Use this code:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0">${escapeHtml(code)}</p>
        <p style="color:#666;font-size:13px">The code expires in ${minutes} minutes. If you didn't request this, you can ignore this email and your password will stay the same.</p>
      </div>`,
  })
}

export function sendVerificationCodeEmail({ email, name, code, minutes }) {
  return sendEmail({
    to: email,
    toName: name,
    subject: `Your verification code: ${code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>Hi ${escapeHtml(name)},</h2>
        <p>Use this code to verify your email address:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0">${escapeHtml(code)}</p>
        <p style="color:#666;font-size:13px">The code expires in ${minutes} minutes. If you didn't create an account, you can ignore this email.</p>
      </div>`,
  })
}

export function sendVerificationEmail({ email, name, link }) {
  return sendEmail({
    to: email,
    toName: name,
    subject: 'Verify your email address',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>Hi ${escapeHtml(name)},</h2>
        <p>Thanks for signing up. Please confirm your email address to activate your account.</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p>
        <p style="color:#666;font-size:13px">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        <p style="color:#666;font-size:12px">Button not working? Paste this into your browser:<br>${link}</p>
      </div>`,
  })
}