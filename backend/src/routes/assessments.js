// server/routes/assessments.js  (REPLACE the previous version)

import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { savePrediction } from '../services/predictionService.js'
import { predictBaseline } from '../services/baselineService.js'

const router = Router()

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

// Every route in this file requires a logged-in user
router.use(requireAuth)

// POST /api/assessments
// Body: { mbti, degreeProgram, skills: string[], careerPreference? }
router.post('/', async (req, res) => {
  const mbti = String(req.body.mbti || '').trim().toUpperCase()
  const degreeProgram = String(req.body.degreeProgram || '').trim()
  const careerPreference = String(req.body.careerPreference || '').trim()

  // Clean skills: trim, drop empties, remove duplicates (case-insensitive)
  const rawSkills = Array.isArray(req.body.skills) ? req.body.skills : []
  const seen = new Set()
  const skills = []
  for (const s of rawSkills) {
    const skill = String(s).trim()
    const key = skill.toLowerCase()
    if (skill && skill.length <= 60 && !seen.has(key)) {
      seen.add(key)
      skills.push(skill)
    }
  }

  if (!MBTI_TYPES.includes(mbti)) {
    return res.status(400).json({ message: 'Please select a valid personality type' })
  }
  if (!degreeProgram || degreeProgram.length > 150) {
    return res.status(400).json({ message: 'Degree program is required' })
  }
  if (skills.length === 0) {
    return res.status(400).json({ message: 'Please select at least one skill' })
  }
  if (skills.length > 50) {
    return res.status(400).json({ message: 'Too many skills (max 50)' })
  }
  if (careerPreference.length > 1000) {
    return res.status(400).json({ message: 'Career preference is too long (max 1000 characters)' })
  }

  // 1) Save the answers
  const { data: assessment, error } = await supabase
    .from('assessments')
    .insert({
      user_id: req.user.id,
      mbti,
      degree_program: degreeProgram,
      skills,
      career_preference: careerPreference || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Create assessment error:', error)
    return res.status(500).json({ message: 'Could not save assessment' })
  }

  // 2) Run the model and store the prediction
  try {
    const result = await predictBaseline(assessment)
    const prediction = await savePrediction({
      userId: req.user.id,
      assessmentId: assessment.id,
      recommended: result.recommended,
      avoid: result.avoid,
    })

    await supabase.from('assessments').update({ status: 'completed' }).eq('id', assessment.id)

    res.status(201).json({
      assessmentId: assessment.id,
      predictionId: prediction.id,
      recommended: result.recommended,
      avoid: result.avoid,
    })
  } catch (err) {
    console.error('Prediction error:', err)
    await supabase.from('assessments').update({ status: 'failed' }).eq('id', assessment.id)
    res.status(502).json({
      message: 'Your answers were saved but the prediction failed',
      assessmentId: assessment.id,
    })
  }
})

// GET /api/assessments/latest  -> the logged-in user's most recent assessment
router.get('/latest', async (req, res) => {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Fetch assessment error:', error)
    return res.status(500).json({ message: 'Could not fetch assessment' })
  }
  if (!data) return res.status(404).json({ message: 'No assessment found' })

  res.json({ assessment: data })
})

export default router