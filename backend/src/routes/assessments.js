// backend/src/routes/assessments.js

import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { createPrediction, PredictionError } from '../services/predictionService.js'
import { toEnglish } from '../services/translate.js'
import { basicSkillError } from '../services/skillCheck.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MBTI_TYPES = new Set([
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
])

// No product limit on skills; this is only a sanity cap against abuse
const MAX_SKILLS_SANITY = 200

// Accepts camelCase or snake_case, and skills as an array or a comma-separated string
function validateInput(body = {}) {
  const mbti = String(body.mbti ?? '').trim().toUpperCase()
  if (!MBTI_TYPES.has(mbti)) return { error: 'A valid MBTI type is required (e.g. INTJ)' }

  const degree = String(body.degreeProgram ?? body.degree_program ?? body.degree ?? '').trim()
  if (degree.length < 2 || degree.length > 150) return { error: 'Degree program is required' }

  const rawSkills = body.skills
  const list = Array.isArray(rawSkills) ? rawSkills : String(rawSkills ?? '').split(',')
  const skills = [...new Set(list.map((s) => String(s).trim()).filter(Boolean))]
  if (skills.length === 0) return { error: 'At least one skill is required' }
  if (skills.length > MAX_SKILLS_SANITY) return { error: 'Too many skills' }

  for (const s of skills) {
    const problem = basicSkillError(s)
    if (problem) return { error: `“${s}” can’t be used: ${problem.toLowerCase()}` }
  }

  const careerPreference = String(body.careerPreference ?? body.career_preference ?? '').trim()
  if (careerPreference.length > 500) return { error: 'Career preference is too long' }

  return {
    value: { mbti, degree_program: degree, skills, career_preference: careerPreference },
  }
}

const formatAssessment = (a) => ({
  id: a.id,
  mbti: a.mbti,
  degreeProgram: a.degree_program,
  skills: a.skills ?? [],
  careerPreference: a.career_preference ?? '',
  createdAt: a.created_at ?? null,
})

// Removes stray symbols/emojis and extra whitespace from free text before it goes to the model.
// Keeps letters (any language), numbers, spaces and basic punctuation (+ and # stay for C++ / C#).
const cleanText = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}\s.,!?'"()\-:;&%+#]/gu, ' ')
    .replace(/([.,!?\-:;])\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

// Translates the free-text parts of an assessment to English for the model.
// The saved row keeps the user's original text; only the copy sent to the model is cleaned and translated.
// toEnglish never throws: if translation fails, the original text is used.
async function translateAssessment(a) {
  const original = a.skills ?? []
  const [degree, preference, ...skillsEn] = await toEnglish([
    a.degree_program,
    cleanText(a.career_preference),
    ...original,
  ])

  const skills = [...new Set(skillsEn.filter(Boolean))]

  const translated = {
    ...a,
    degree_program: degree || a.degree_program,
    career_preference: preference,
    skills: skills.length ? skills : original,
  }

  console.log('[assessment] Sent to model:', {
    degree: translated.degree_program,
    skills: translated.skills,
    preference: translated.career_preference,
  })

  return translated
}

// Users whose prediction is currently running (prevents double-clicks / duplicate rows)
const inFlight = new Set()

// Runs the prediction for an already-saved assessment and sends the HTTP response
async function runPrediction(res, userId, assessment) {
  try {
    const forModel = await translateAssessment(assessment)
    const predictionId = await createPrediction({ userId, assessment: forModel })
    return res.status(201).json({ assessmentId: assessment.id, predictionId })
  } catch (err) {
    if (err instanceof PredictionError) {
      // The assessment is saved already, so the user can retry without retyping anything
      return res.status(err.status).json({ message: err.message, assessmentId: assessment.id })
    }
    console.error('Unexpected prediction error:', err)
    return res
      .status(500)
      .json({ message: 'Could not create prediction', assessmentId: assessment.id })
  }
}

// Every route here requires a logged-in user, and only touches THEIR data
router.use(requireAuth)

// POST /api/assessments
// Body: { mbti, degreeProgram, skills: [...], careerPreference }
// 1) saves the inputs in Supabase  2) translates them to English  3) sends them to Hugging Face
// 4) stores the prediction
router.post('/', async (req, res) => {
  const userId = req.user.id

  if (inFlight.has(userId)) {
    return res
      .status(429)
      .json({ message: 'A prediction is already running. Please wait for it to finish.' })
  }

  const parsed = validateInput(req.body)
  if (parsed.error) return res.status(400).json({ message: parsed.error })

  inFlight.add(userId)
  try {
    // 1. Store the inputs first (original text, exactly as the user typed it)
    const { data: assessment, error } = await supabase
      .from('assessments')
      .insert({ user_id: userId, ...parsed.value })
      .select()
      .single()

    if (error) {
      console.error('Insert assessment error:', error)
      return res.status(500).json({ message: 'Could not save assessment' })
    }
    console.log('[assessment] Saved', assessment.id)

    // 2 + 3 + 4. Translate to English, send to Hugging Face and store the prediction
    return await runPrediction(res, userId, assessment)
  } finally {
    inFlight.delete(userId)
  }
})

// POST /api/assessments/:id/predict
// Re-runs the prediction for an assessment that is already saved (e.g. after a failed attempt)
router.post('/:id/predict', async (req, res) => {
  const userId = req.user.id
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Assessment not found' })

  if (inFlight.has(userId)) {
    return res
      .status(429)
      .json({ message: 'A prediction is already running. Please wait for it to finish.' })
  }

  inFlight.add(userId)
  try {
    const { data: assessment, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Load assessment error:', error)
      return res.status(500).json({ message: 'Could not load assessment' })
    }
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' })

    return await runPrediction(res, userId, assessment)
  } finally {
    inFlight.delete(userId)
  }
})

// GET /api/assessments
// The logged-in user's saved assessments (newest first)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('List assessments error:', error)
    return res.status(500).json({ message: 'Could not fetch assessments' })
  }

  res.json({ assessments: data.map(formatAssessment) })
})

export default router