import React from 'react'

// Single source of truth for the password rules on the frontend.
// (The backend enforces the same rules in auth.js.)
export const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character (! @ # $ % ...)', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
]

export const isStrongPassword = (p) => passwordRules.every((r) => r.test(p))

export const PASSWORD_RULES_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.'

// Live checklist shown under the password field while the user types
const PasswordChecklist = ({ password }) =>
  password ? (
    <ul className="space-y-1 text-xs" aria-label="Password requirements">
      {passwordRules.map((r) => {
        const ok = r.test(password)
        return (
          <li key={r.id} className={ok ? 'text-green-700' : 'text-[#8C8576]'}>
            {ok ? '✓' : '○'} {r.label}
          </li>
        )
      })}
    </ul>
  ) : null

export default PasswordChecklist