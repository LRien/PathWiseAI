import axios from 'axios'

// Local: falls back to your Express server. Production: set VITE_API_URL
// (e.g. https://your-api.onrender.com) in your frontend host's env vars. No trailing slash.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const client = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // Render free instances can take a while to wake up
})

// Attach the JWT to every request automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Turn every failure into a plain Error with the backend's message,
// so pages can just do: catch (err) { setError(err.message) }
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data || {}

    // Expired or revoked session: clear it and go to login.
    // Only when a token existed, so a wrong password on /login doesn't trigger this.
    if (status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }

    let message = data.message || data.error
    if (!message) {
      message = error.response
        ? 'Something went wrong. Please try again.'
        : 'Cannot reach the server. Please check your connection and try again.'
    }

    const err = new Error(message)
    err.status = status
    err.code = data.code // e.g. EMAIL_NOT_VERIFIED, INVALID_CODE, CODE_EXPIRED
    err.attemptsLeft = data.attemptsLeft
    return Promise.reject(err)
  }
)

export default client