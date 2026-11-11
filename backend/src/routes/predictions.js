// backend/src/routes/predictions.js
//
// Predictions are CREATED by POST /api/assessments (see assessments.js).
// This file reads them, redoes them ("show me different careers"), saves the user's
// "select this career" choice, and deletes them.

import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { redoPrediction, PredictionError, MAX_REDOS } from '../services/predictionService.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const one = (v) => (Array.isArray(v) ? v[0] : v)

// Columns of career_roadmaps -> the clean shape the frontend receives
const ROADMAP_COLUMNS =
  'job_title, soft_skills, other_skills, technical_skills, education_typical, education_reported, related_programs, certificates, time_estimate, time_steps, note, roadmap, version'

// version 1 = old rows (use the old columns). version 2 = full roadmap in `plan`
// (plan.summary has the skills / education / certificates / skills-check block, plan.steps the step-by-step plan).
const formatRoadmap = (r) =>
  r
    ? {
        version: r.version ?? 1,
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
        plan: r.roadmap ?? null,
      }
    : null

/* ---------- technical skills (career_roadmaps.technical_skills) ----------
   The "You already have" / "Still to build" chips are built from the career's
   technical_skills column, so editing that column in Supabase changes what users see.
   "Have" = a technical skill the user already has, based on the skills saved with the
   prediction (skills_have) and the skills they entered in the assessment.
   "Still to build" = the rest of the technical skills.
   If a career has no technical_skills, the old saved lists are used as a fallback. */
const norm = (s) => String(s ?? '').trim().toLowerCase()
const skillName = (s) => (typeof s === 'string' ? s : s?.name ?? s?.title ?? s?.label ?? s?.text ?? '')
const skillNames = (v) =>
  (Array.isArray(v) ? v : []).map(skillName).map((s) => String(s).trim()).filter(Boolean)

// technical / other / soft skills of a career, each split into "have" and "need"
const SKILL_GROUPS = [
  ['technical', 'technical_skills'],
  ['other', 'other_skills'],
  ['soft', 'soft_skills'],
]

function skillGroupsFor(c, userSkills) {
  const roadmap = one(c.career_roadmaps)
  const known = new Set([...skillNames(c.skills_have), ...skillNames(userSkills)].map(norm))
  const groups = {}

  for (const [key, column] of SKILL_GROUPS) {
    const all = [...new Set(skillNames(roadmap?.[column]))]
    groups[key] = {
      have: all.filter((s) => known.has(norm(s))),
      need: all.filter((s) => !known.has(norm(s))),
    }
  }
  return groups
}

function technicalSkillSplit(c, userSkills) {
  const groups = skillGroupsFor(c, userSkills)
  const t = groups.technical

  // No technical skills saved for this career: fall back to the old saved lists
  if (!t.have.length && !t.need.length) {
    return { have: c.skills_have, need: c.skills_to_build, fromRoadmap: false, groups }
  }
  return { have: t.have, need: t.need, fromRoadmap: true, groups }
}

// The "Why this fits" lines that list skills are rewritten so they match the chips
const HAVE_PREFIX = 'Skills you already have:'
const NEED_PREFIX = 'Skills to work on:'

function rewriteSkillReasons(reasons, have, need) {
  return (Array.isArray(reasons) ? reasons : []).flatMap((r) => {
    const t = skillName(r)
    if (t.startsWith(HAVE_PREFIX)) return have.length ? [`${HAVE_PREFIX} ${have.join(', ')}.`] : []
    if (t.startsWith(NEED_PREFIX)) return need.length ? [`${NEED_PREFIX} ${need.join(', ')}.`] : []
    return [r]
  })
}

// Every route here requires a logged-in, verified user, and only returns THEIR predictions
router.use(requireAuth)

// Builds the "Your top 3 careers" response for one prediction id.
// Shared by GET /latest, GET /:id and POST /:id/redo so all return exactly the same shape.
async function sendPrediction(req, res, id) {
  const { data: p, error } = await supabase
    .from('predictions')
    .select(
      `id, selected_career, created_at, redo_count,
       assessments(mbti, degree_program, skills, career_preference),
       prediction_results(personality, preference_note, disclaimer),
       recommended_careers(rank, code, title, match_percent, description, why, reasons, skills_have, skills_to_build, career_roadmaps(id, soft_skills, other_skills, technical_skills)),
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
      redoCount: p.redo_count ?? 0,
      maxRedos: MAX_REDOS,
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
      recommended: [...p.recommended_careers].sort(byRank).map((c) => {
        const skills = technicalSkillSplit(c, a?.skills)

        return {
          rank: c.rank,
          code: c.code,
          title: c.title,
          matchPercent: Number(c.match_percent),
          description: c.description,
          why: c.why,
          reasons: skills.fromRoadmap
            ? rewriteSkillReasons(c.reasons, skills.have, skills.need)
            : c.reasons,
          skillsHave: skills.have,
          skillsToBuild: skills.need,
          skills: skills.groups,
          hasRoadmap: Boolean(one(c.career_roadmaps)),
        }
      }),
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

// POST /api/predictions/:id/redo
// "No, show me different careers": replaces the recommended careers and their roadmaps.
// If the Space finds nothing new, the current results stay and the Space's message is returned (409).
const redoing = new Set() // ignores double clicks while a redo is running

router.post('/:id/redo', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Prediction not found' })
  if (redoing.has(id)) return res.status(409).json({ message: 'Already finding different careers...' })

  redoing.add(id)
  try {
    await redoPrediction({ userId: req.user.id, predictionId: id })
  } catch (err) {
    if (err instanceof PredictionError) return res.status(err.status).json({ message: err.message })
    console.error('Redo prediction error:', err)
    return res.status(500).json({ message: 'Could not redo prediction' })
  } finally {
    redoing.delete(id)
  }

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

// DELETE /api/predictions/:id
// Permanently deletes one of the user's predictions from the database:
// its recommended careers, careers to avoid, insights and the saved assessment answers.
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ message: 'Prediction not found' })

  // 1. It must exist AND belong to this user. Also finds the assessment saved with it.
  const { data: p, error } = await supabase
    .from('predictions')
    .select('id, assessments(id)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (error) {
    console.error('Delete prediction (lookup) error:', error.message, error.details)
    return res.status(500).json({ message: 'Could not delete prediction' })
  }
  if (!p) return res.status(404).json({ message: 'Prediction not found' })

  const assessmentId = one(p.assessments)?.id ?? null

  // 2. Delete the rows that belong to this prediction
  for (const table of ['recommended_careers', 'avoid_careers', 'prediction_results']) {
    const { error: childError } = await supabase.from(table).delete().eq('prediction_id', id)
    if (childError) {
      console.error(`Delete prediction (${table}) error:`, childError.message, childError.details, childError.hint)
      return res.status(500).json({ message: 'Could not delete prediction' })
    }
  }

  // 3. Delete the prediction itself (scoped to this user again, just to be safe).
  //    .select('id') returns the deleted rows, so we can tell "deleted" from "nothing matched".
  const removePrediction = () =>
    supabase.from('predictions').delete().eq('id', id).eq('user_id', req.user.id).select('id')

  let { data: gone, error: delError } = await removePrediction()

  // If the assessment row points at this prediction (foreign key 23503), remove it first, then retry
  if (delError?.code === '23503' && assessmentId) {
    const { error: assessmentError } = await supabase.from('assessments').delete().eq('id', assessmentId)
    if (assessmentError) {
      console.error('Delete prediction (assessment first) error:', assessmentError.message, assessmentError.details)
    } else {
      ;({ data: gone, error: delError } = await removePrediction())
    }
  }

  if (delError || !gone?.length) {
    console.error(
      'Delete prediction error:',
      delError ? `${delError.message} | ${delError.details} | ${delError.hint}` : 'no row was deleted'
    )
    return res.status(500).json({ message: 'Could not delete prediction' })
  }

  // 4. Delete the saved assessment answers (does nothing if step 3 already removed it)
  if (assessmentId) {
    const { error: assessmentError } = await supabase.from('assessments').delete().eq('id', assessmentId)
    if (assessmentError) console.error('Delete prediction (assessment) error:', assessmentError.message)
  }

  res.json({ deleted: true, id })
})

export default router