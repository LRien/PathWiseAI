// backend/src/services/brevo.js
// Sends transactional email through Brevo's REST API (Node 18+ has global fetch).
//
// Env (read at call time, so dotenv load order doesn't matter):
//   BREVO_API_KEY        - Brevo > SMTP & API > API Keys
//   BREVO_SENDER_EMAIL   - must be a verified sender in Brevo
//   BREVO_SENDER_NAME    - optional, defaults to "Career Match"
//   CONTACT_RECEIVER_EMAIL - optional, where contact form messages land
//                            (defaults to careermatchpathwiseai@gmail.com)

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

export async function sendEmail({ to, toName, subject, html, replyTo }) {
  const { apiKey, senderEmail, senderName } = getConfig()

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to, name: toName || to }],
    subject,
    htmlContent: html,
  }
  if (replyTo?.email) {
    payload.replyTo = { email: replyTo.email, name: replyTo.name || replyTo.email }
  }

  let res
  try {
    res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
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

// Contact form -> goes to the team inbox, reply-to is the visitor
export function sendContactMessageEmail({ name, email, subject, message }) {
  const receiver = (process.env.CONTACT_RECEIVER_EMAIL || 'careermatchpathwiseai@gmail.com').trim()

  return sendEmail({
    to: receiver,
    toName: 'Career Match Team',
    subject: `[Career Match] ${subject}`,
    replyTo: { email, name },
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="margin-bottom:4px">New contact message</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666;width:90px">Name</td><td>${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td>${escapeHtml(email)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Subject</td><td>${escapeHtml(subject)}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
        <p style="white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(message)}</p>
      </div>`,
  })
}