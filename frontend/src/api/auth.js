import client from './client'

// Each function returns the response body (res.data) and throws an Error on failure.

// ---- Public ----
export const register = ({ name, email, password }) =>
  client.post('/auth/register', { name, email, password }).then((r) => r.data)

export const verifyEmail = (email, code) =>
  client.post('/auth/verify-email', { email, code }).then((r) => r.data)

export const resendVerification = (email) =>
  client.post('/auth/resend-verification', { email }).then((r) => r.data)

export const forgotPassword = (email) =>
  client.post('/auth/forgot-password', { email }).then((r) => r.data)

export const resetPassword = (email, code, newPassword) =>
  client.post('/auth/reset-password', { email, code, newPassword }).then((r) => r.data)

export const login = async (email, password) => {
  const data = await client.post('/auth/login', { email, password }).then((r) => r.data)
  localStorage.setItem('token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

// ---- Protected (token is added automatically by the client) ----
export const logout = async () => {
  try {
    await client.post('/auth/logout')
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

export const getMe = () => client.get('/auth/me').then((r) => r.data.user)

export const changePassword = async (currentPassword, newPassword) => {
  const data = await client
    .patch('/auth/password', { currentPassword, newPassword })
    .then((r) => r.data)
  localStorage.setItem('token', data.token) // the old token is revoked, keep the new one
  return data
}

export const deleteAccount = async (password) => {
  // axios sends a DELETE body through the `data` option
  const data = await client.delete('/auth/account', { data: { password } }).then((r) => r.data)
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  return data
}