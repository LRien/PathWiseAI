// backend/src/routes/predictions.js
//
// Predictions are CREATED by POST /api/assessments (see assessments.js).
// This file only reads them and saves the user's "select this career" choice.

import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const one = (v) => (Array.isArray(v) ? v[0] : v)

// Columns of career_roadmaps -> the clean shape the frontend receives
const ROADMAP_COLUMNS =
  'job_title, soft_skills, other_skills, technical_skills, education_typical, education_reported, related_programs, certificates, time_estimate, time_steps, note'

const formatRoadmap = (r) =>
  r
    ? {
        jobTitle: r.job_title,
        skills: {
          soft: r.soft_skills ?? [],
          other: r.other_skills ?? [],
          technical: r.technical_skills ?? [],
        },
        education: {
          typical: r.education_typical,
          reportedByWorkers: r.education_reported ?? [],
          relatedPrograms: r.related_programs ?? [],
        },
        certificates: r.certificates ?? [],
        timeline: {
          estimatedTotal: r.time_estimate,
          steps: r.time_steps ?? [],
        },
        note: r.note,
      }
    : null

// Every route here requires a logged-in, verified user, and only returns THEIR predictions
router.use(requireAuth)

// Builds the "Your top 3 careers" response for one prediction id.
// Shared by GET /latest and GET /:id so both return exactly the same shape.
async function sendPrediction(req, res, id) {
  const { data: p, error } = await supabase
    .from('predictions')
    .select(
      `id, selected_career, created_at,
       assessments(mbti, degree_program, skills, career_preference),
       prediction_results(personality, preference_note, disclaimer),
       recommended_careers(rank, code, title, match_percent, description, why, reasons, skills_have, skills_to_build, career_roadmaps(id)),
       avoid_careers(rank, code, title, description, why, reasons)`
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
  const r = one(p.prediction_results)
  const byRank = (x, y) => x.rank - y.rank

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
      insights: {
        personality: r?.personality ?? null,
        preferenceNote: r?.preference_note ?? null,
        disclaimer: r?.disclaimer ?? null,
      },
      recommended: [...p.recommended_careers].sort(byRank).map((c) => ({
        rank: c.rank,
        code: c.code,
        title: c.title,
        matchPercent: Number(c.match_percent),
        description: c.description,
        why: c.why,
        reasons: c.reasons,
        skillsHave: c.skills_have,
        skillsToBuild: c.skills_to_build,
        hasRoadmap: Boolean(one(c.career_roadmaps)),
      })),
      avoid: [...p.avoid_careers].sort(byRank).map((c) => ({
        rank: c.rank,
        code: c.code,
        title: c.title,
        description: c.description,
        why: c.why,
        reasons: c.reasons,
      })),
    },
  })
}

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

// GET /api/predictions/latest
// Full results of the user's most recent prediction (same shape as GET /:id).
// Must stay ABOVE "/:id", otherwise "latest" would be treated as an id.
router.get('/latest', async (req, res) => {
  const { data, error } = await supabase
    .from('predictions')
    .select('id')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Get latest prediction error:', error)
    return res.status(500).json({ message: 'Could not fetch prediction' })
  }
  if (!data) return res.status(404).json({ message: 'No predictions yet' })

  return sendPrediction(req, res, data.id)
})

// GET /api/predictions/:id
// "Your top 3 careers" page + careers to avoid
router.get('/:id', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Prediction not found' })

  return sendPrediction(req, res, id)
})

// GET /api/predictions/:id/roadmap
// Roadmap of the career the user selected. Optional: ?rank=1|2|3 to get a specific recommended career.
router.get('/:id/roadmap', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Prediction not found' })

  const { data: p, error } = await supabase
    .from('predictions')
    .select('id, selected_career')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (error) {
    console.error('Get roadmap (prediction) error:', error)
    return res.status(500).json({ message: 'Could not fetch roadmap' })
  }
  if (!p) return res.status(404).json({ message: 'Prediction not found' })

  let query = supabase
    .from('recommended_careers')
    .select(`rank, title, match_percent, career_roadmaps(${ROADMAP_COLUMNS})`)
    .eq('prediction_id', id)
    .eq('user_id', req.user.id)

  const rank = Number(req.query.rank)
  if (Number.isInteger(rank) && rank >= 1 && rank <= 3) {
    query = query.eq('rank', rank)
  } else if (p.selected_career) {
    query = query.eq('title', p.selected_career)
  } else {
    return res.status(400).json({ message: 'Select a career first (or pass ?rank=1)' })
  }

  const { data: c, error: cErr } = await query.maybeSingle()
  if (cErr) {
    console.error('Get roadmap error:', cErr)
    return res.status(500).json({ message: 'Could not fetch roadmap' })
  }
  if (!c) return res.status(404).json({ message: 'Career not found' })

  const roadmap = formatRoadmap(one(c.career_roadmaps))
  if (!roadmap) return res.status(404).json({ message: 'No roadmap saved for this career' })

  res.json({
    career: { rank: c.rank, title: c.title, matchPercent: Number(c.match_percent) },
    roadmap,
  })
})

// PATCH /api/predictions/:id/select
// Body: { career: "Computer Systems Analysts" }  -> saves the "Select this career" choice
router.patch('/:id/select', async (req, res) => {
  const { id } = req.params
  const career = String(req.body.career || '').trim()

  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Prediction not found' })
  if (!career) return res.status(400).json({ message: 'Career is required' })

  const { data: p, error } = await supabase
    .from('predictions')
    .select('id, recommended_careers(title)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (error) return res.status(500).json({ message: 'Could not select career' })
  if (!p) return res.status(404).json({ message: 'Prediction not found' })

  const isRecommended = p.recommended_careers.some((c) => c.title === career)
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