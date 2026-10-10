// server/routes/predictions.js  (NEW file)

import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const one = (v) => (Array.isArray(v) ? v[0] : v)

// Every route here requires a logged-in user, and only returns THEIR predictions
router.use(requireAuth)

// GET /api/predictions
// Dashboard: stats cards + prediction history (newest first)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('predictions')
    .select(
      'id, top_match_title, top_match_percent, selected_career, created_at, assessments(mbti, degree_program, skills)'
    )
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('List predictions error:', error)
    return res.status(500).json({ message: 'Could not fetch predictions' })
  }

  // Oldest -> newest so "Prediction #1" is the first one and change = vs previous
  let prev = null
  const items = data
    .map((p, i) => {
      const a = one(p.assessments)
      const percent = Number(p.top_match_percent)
      const item = {
        id: p.id,
        number: i + 1,
        createdAt: p.created_at,
        topMatch: { title: p.top_match_title, percent },
        change: prev === null ? null : Math.round((percent - prev) * 100) / 100,
        mbti: a?.mbti ?? null,
        degreeProgram: a?.degree_program ?? null,
        skillCount: a?.skills?.length ?? 0,
        selectedCareer: p.selected_career,
      }
      prev = percent
      return item
    })
    .reverse()

  const latest = items[0]

  res.json({
    stats: {
      total: items.length,
      latestTopMatch: latest ? latest.topMatch.percent : null,
      latestChange: latest ? latest.change : null,
      lastPredictionAt: latest ? latest.createdAt : null,
    },
    predictions: items,
  })
})

// GET /api/predictions/:id
// "Your top 3 careers" page + careers to avoid
router.get('/:id', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Prediction not found' })

  const { data: p, error } = await supabase
    .from('predictions')
    .select(
      'id, selected_career, created_at, assessments(mbti, degree_program, skills, career_preference), prediction_careers(id, kind, rank, title, match_percent, reasons)'
    )
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (error) {
    console.error('Get prediction error:', error)
    return res.status(500).json({ message: 'Could not fetch prediction' })
  }
  if (!p) return res.status(404).json({ message: 'Prediction not found' })

  // Prediction number = how many of this user's predictions are as old or older
  const { count } = await supabase
    .from('predictions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .lte('created_at', p.created_at)

  const a = one(p.assessments)
  const careers = [...p.prediction_careers].sort((x, y) => x.rank - y.rank)

  res.json({
    prediction: {
      id: p.id,
      number: count,
      createdAt: p.created_at,
      selectedCareer: p.selected_career,
      assessment: {
        mbti: a?.mbti ?? null,
        degreeProgram: a?.degree_program ?? null,
        skills: a?.skills ?? [],
        careerPreference: a?.career_preference ?? null,
      },
      recommended: careers
        .filter((c) => c.kind === 'recommended')
        .map((c) => ({
          rank: c.rank,
          title: c.title,
          matchPercent: Number(c.match_percent),
          reasons: c.reasons,
        })),
      avoid: careers
        .filter((c) => c.kind === 'avoid')
        .map((c) => ({ rank: c.rank, title: c.title, reasons: c.reasons })),
    },
  })
})

// PATCH /api/predictions/:id/select
// Body: { career: "Data Scientist" }  -> saves the "Select this career" choice
router.patch('/:id/select', async (req, res) => {
  const { id } = req.params
  const career = String(req.body.career || '').trim()

  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Prediction not found' })
  if (!career) return res.status(400).json({ message: 'Career is required' })

  const { data: p, error } = await supabase
    .from('predictions')
    .select('id, prediction_careers(title, kind)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (error) return res.status(500).json({ message: 'Could not select career' })
  if (!p) return res.status(404).json({ message: 'Prediction not found' })

  const isRecommended = p.prediction_careers.some(
    (c) => c.kind === 'recommended' && c.title === career
  )
  if (!isRecommended) {
    return res.status(400).json({ message: 'Career is not one of the recommended careers' })
  }

  const { error: updateError } = await supabase
    .from('predictions')
    .update({ selected_career: career })
    .eq('id', id)

  if (updateError) return res.status(500).json({ message: 'Could not select career' })

  res.json({ selectedCareer: career })
})

export default router