// server/server.js  (REPLACE your existing server.js, there is no index.js)

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { supabase } from './src/config/supabase.js'
import authRoutes from './src/routes/auth.js'
import assessmentRoutes from './src/routes/assessments.js'
import predictionRoutes from './src/routes/predictions.js'

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env')
  process.exit(1)
}

const app = express()
app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

/* open http://localhost:5000/api/health to check that everything works */
app.get('/api/health', async (_req, res) => {
  const { error } = await supabase.from('users').select('id').limit(1)
  if (error && error.code !== 'PGRST205') {
    return res.status(500).json({ ok: false, database: 'error', message: error.message })
  }
  res.json({
    ok: true,
    database: error ? 'connected (users table not created yet)' : 'connected',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/predictions', predictionRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`API running on port ${PORT}`))