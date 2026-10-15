// server/server.js  (REPLACE your existing server.js)

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { supabase } from './src/config/supabase.js'
import authRoutes from './src/routes/auth.js'
import assessmentRoutes from './src/routes/assessments.js'
import predictionRoutes from './src/routes/predictions.js'

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment variables')
  process.exit(1)
}

const app = express()

/* ---------- CORS ----------
   CLIENT_URL can hold ONE or MANY origins, separated by commas.
   Local .env:  CLIENT_URL=http://localhost:5173,https://your-app.vercel.app
   Render env:  CLIENT_URL=https://your-app.vercel.app,http://localhost:5173
   (no trailing slashes, no spaces needed)
*/
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

// always allow common local dev ports so localhost works even if CLIENT_URL is only the Vercel link
const localOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]

app.use(
  cors({
    origin(origin, callback) {
      // allow tools without an Origin header (Postman, curl, browser address bar)
      if (!origin) return callback(null, true)
      if ([...allowedOrigins, ...localOrigins].includes(origin)) {
        return callback(null, true)
      }
      console.warn('Blocked by CORS:', origin)
      return callback(new Error(`Origin not allowed by CORS: ${origin}`))
    },
    credentials: true,
  })
)

app.use(express.json())

/* ---------- Root: shows the backend is alive ---------- */
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'PathWise AI backend is active 🚀',
    health: '/api/health',
  })
})

/* ---------- Health check (also tests Supabase) ---------- */
app.get('/api/health', async (_req, res) => {
  const { error } = await supabase.from('users').select('id').limit(1)
  if (error && error.code !== 'PGRST205') {
    return res
      .status(500)
      .json({ ok: false, database: 'error', message: error.message })
  }
  res.json({
    ok: true,
    database: error ? 'connected (users table not created yet)' : 'connected',
  })
})

/* ---------- Routes ---------- */
app.use('/api/auth', authRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/predictions', predictionRoutes)

/* ---------- 404 for unknown routes ---------- */
app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
})

/* ---------- Start ---------- */
const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`))