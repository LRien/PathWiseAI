import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

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

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`API running on port ${PORT}`))