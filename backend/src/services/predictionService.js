// backend/src/services/predictionService.js
//
// Takes a SAVED assessment, sends it to the Hugging Face Space, and stores the result:
//   predictions        -> summary row (top match)
//   recommended_careers-> top 3 careers
//   avoid_careers      -> careers to avoid
//   career_roadmaps    -> one structured roadmap per recommended career
//   prediction_results -> backup of the raw Space response
//
// Returns the new prediction id. Throws PredictionError if something goes wrong.

import { supabase } from '../config/supabase.js'
import { getRecommendation } from './pathwise.js'
import { parseRoadmap } from './roadmapParser.js'

export class PredictionError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = 'PredictionError'
    this.status = status
  }
}

// ---------- Helpers for the Hugging Face Space response ----------

// The Space returns:
// { mbti, personality, preference_note, disclaimer,
//   recommended: [{ code, title, fit_percent, description, why, skills_have, skills_to_build, roadmap }],
//   avoid:       [{ code, title, description, why }] }

const toPercent = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

const toStrings = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : [])

// "why" is one long paragraph -> split into short sentences
const toReasons = (why) =>
  String(why ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

function normalizeResult(raw) {
  const recommended = (raw?.recommended ?? []).slice(0, 3).map((c, i) => ({
    rank: i + 1,
    code: c?.code ?? null,
    title: String(c?.title ?? '').trim(),
    matchPercent: toPercent(c?.fit_percent),
    description: c?.description ?? null,
    why: c?.why ?? null,
    reasons: toReasons(c?.why),
    skillsHave: toStrings(c?.skills_have),
    skillsToBuild: toStrings(c?.skills_to_build),
    roadmap: parseRoadmap(c?.roadmap), // structured object, or null
  }))

  const avoid = (raw?.avoid ?? []).slice(0, 3).map((c, i) => ({
    rank: i + 1,
    code: c?.code ?? null,
    title: String(c?.title ?? '').trim(),
    description: c?.description ?? null,
    why: c?.why ?? null,
    reasons: toReasons(c?.why),
  }))

  return { recommended, avoid }
}

// ---------- Main function ----------

export async function createPrediction({ userId, assessment: a }) {
  // 1. Send the saved assessment to the Hugging Face Space (with roadmaps)
  console.log('[prediction] Calling Hugging Face Space (first call can take 30-60+ seconds)...')
  let raw
  try {
    raw = await getRecommendation({
      mbti: a.mbti,
      skills: a.skills,
      education: a.degree_program,
      preference: a.career_preference || '',
      includeRoadmap: true,
    })
  } catch (err) {
    console.error('PathWise Space error:', err)
    throw new PredictionError('Prediction service unavailable, please try again.', 502)
  }

  const { recommended, avoid } = normalizeResult(raw)
  const valid =
    recommended.length > 0 && recommended.every((c) => c.title && c.matchPercent !== null)
  if (!valid) {
    console.error('Unexpected Space response:', JSON.stringify(raw))
    throw new PredictionError('Unexpected response from prediction service', 502)
  }
  console.log('[prediction] Space responded. Top match:', recommended[0].title, recommended[0].matchPercent)

  // 2. Summary row
  const { data: pred, error: pErr } = await supabase
    .from('predictions')
    .insert({
      user_id: userId,
      assessment_id: a.id,
      top_match_title: recommended[0].title,
      top_match_percent: recommended[0].matchPercent,
    })
    .select('id')
    .single()

  if (pErr) {
    console.error('Insert prediction error:', pErr)
    throw new PredictionError('Could not save prediction', 500)
  }

  // If a later step fails, deleting the prediction also removes its child rows (ON DELETE CASCADE)
  const fail = async (label, error) => {
    console.error(`${label}:`, error)
    await supabase.from('predictions').delete().eq('id', pred.id)
    throw new PredictionError('Could not save prediction', 500)
  }

  // 3. Recommended careers
  const { data: recRows, error: rErr } = await supabase
    .from('recommended_careers')
    .insert(
      recommended.map((c) => ({
        prediction_id: pred.id,
        user_id: userId,
        rank: c.rank,
        code: c.code,
        title: c.title,
        match_percent: c.matchPercent,
        description: c.description,
        why: c.why,
        reasons: c.reasons,
        skills_have: c.skillsHave,
        skills_to_build: c.skillsToBuild,
      }))
    )
    .select('id, rank')
  if (rErr) await fail('Insert recommended_careers error', rErr)

  // 4. Careers to avoid
  if (avoid.length > 0) {
    const { error: avErr } = await supabase.from('avoid_careers').insert(
      avoid.map((c) => ({
        prediction_id: pred.id,
        user_id: userId,
        rank: c.rank,
        code: c.code,
        title: c.title,
        description: c.description,
        why: c.why,
        reasons: c.reasons,
      }))
    )
    if (avErr) await fail('Insert avoid_careers error', avErr)
  }

  // 5. Structured roadmaps (one row per recommended career)
  const idByRank = Object.fromEntries(recRows.map((r) => [r.rank, r.id]))
  const roadmapRows = recommended
    .filter((c) => c.roadmap)
    .map((c) => ({
      recommended_career_id: idByRank[c.rank],
      user_id: userId,
      job_title: c.roadmap.jobTitle ?? c.title,
      soft_skills: c.roadmap.skills.soft,
      other_skills: c.roadmap.skills.other,
      technical_skills: c.roadmap.skills.technical,
      education_typical: c.roadmap.education.typical,
      education_reported: c.roadmap.education.reportedByWorkers,
      related_programs: c.roadmap.education.relatedPrograms,
      certificates: c.roadmap.certificates,
      time_estimate: c.roadmap.timeline.estimatedTotal,
      time_steps: c.roadmap.timeline.steps,
      note: c.roadmap.note,
      raw_text: c.roadmap.rawText,
    }))

  if (roadmapRows.length > 0) {
    const { error: rmErr } = await supabase.from('career_roadmaps').insert(roadmapRows)
    if (rmErr) await fail('Insert career_roadmaps error', rmErr)
  }

  // 6. Backup of the Space response (without roadmap text, which is stored above)
  const { error: resErr } = await supabase.from('prediction_results').insert({
    prediction_id: pred.id,
    user_id: userId,
    mbti: raw.mbti ?? a.mbti,
    personality: raw.personality ?? null,
    preference_note: raw.preference_note ?? null,
    disclaimer: raw.disclaimer ?? null,
    result: {
      ...raw,
      recommended: (raw.recommended ?? []).map(({ roadmap, ...rest }) => rest),
    },
  })
  if (resErr) await fail('Insert prediction_results error', resErr)

  console.log(
    '[prediction] Saved',
    pred.id,
    '|',
    recommended.length,
    'recommended,',
    avoid.length,
    'avoid,',
    roadmapRows.length,
    'roadmaps'
  )

  return pred.id
}