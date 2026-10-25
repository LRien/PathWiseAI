import React, { useState } from 'react'
import { sendContactMessage } from '../../api/contact' // adjust path to wherever your api folder is

const CONTACT_EMAIL = 'careermatchpathwiseai@gmail.com'

const INFO = [
  { label: 'EMAIL', value: CONTACT_EMAIL },
  { label: 'INSTITUTION', value: 'Eulogio “Amang” Rodriguez Institute of Science and Technology (EARIST)' },
  { label: 'THESIS STUDY', value: 'Personality-Based Career Guidance System Using Machine Learning' },
]

const EMPTY = { firstName: '', lastName: '', email: '', subject: '', message: '' }

const ContactPage = () => {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    if (status === 'sent' || status === 'error') setStatus('idle')
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    // Honeypot: bots fill hidden fields, real users don't
    const honey = e.target.elements._honey?.value || ''

    setStatus('sending')
    setErrorMsg('')
    try {
      await sendContactMessage({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        subject: form.subject,
        message: form.message,
        _honey: honey,
      })
      setForm(EMPTY)
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  return (
    <main className="contact">
      <section className="contact__info">
        <span className="contact__badge">GET IN TOUCH</span>
        <h1 className="contact__title">CONTACT</h1>
        <p className="contact__lead">
          Have a question about Career Match, need assistance using the system, or want to
          share feedback? Contact the research team through the information below.
        </p>

        <ul className="contact__cards">
          {INFO.map((item) => (
            <li key={item.label} className="contact__card">
              <span className="contact__card-label">{item.label}</span>
              <span className="contact__card-value">{item.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="contact__form-wrap" aria-labelledby="contact-form-title">
        <form className="contact__form" onSubmit={onSubmit}>
          <h2 id="contact-form-title" className="contact__form-title">Send Us a Message</h2>

          {/* honeypot, hidden from real users */}
          <input
            type="text"
            name="_honey"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />

          <div className="contact__row">
            <div className="contact__field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Enter your first name..."
                value={form.firstName}
                onChange={onChange}
                required
              />
            </div>
            <div className="contact__field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Enter your last name..."
                value={form.lastName}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="contact__field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email address..."
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div className="contact__field">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              name="subject"
              type="text"
              placeholder="e.g., Technical concern, feedback, research inquiry..."
              value={form.subject}
              onChange={onChange}
              required
            />
          </div>

          <div className="contact__field">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows="5"
              placeholder="Enter your message..."
              value={form.message}
              onChange={onChange}
              required
            />
          </div>

          <div className="contact__actions">
            <button type="submit" className="contact__btn" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : <>Send Message <span aria-hidden="true">→</span></>}
            </button>
          </div>

          {status === 'sent' && (
            <p className="contact__success" role="status">
              Thanks! Your message has been sent.
            </p>
          )}

          {status === 'error' && (
            <p className="contact__success contact__error" role="alert" style={{ color: '#c0392b' }}>
              {errorMsg || 'Something went wrong.'} You can also email us at {CONTACT_EMAIL}.
            </p>
          )}

          <p className="contact__note">
            Responses may take 1–3 business days. This contact form is intended for
            research-related inquiries, technical concerns, and feedback regarding the
            Career Match system.
          </p>
        </form>
      </section>
    </main>
  )
}

export default ContactPage