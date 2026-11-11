// backend/src/services/predictionService.js
//
// Takes a SAVED assessment, sends it to the Hugging Face Space, and stores the result:
//   predictions         -> summary row (top match, shown codes, redo count)
//   recommended_careers -> top 3 careers
//   avoid_careers       -> careers to avoid
//   career_roadmaps     -> one roadmap (v2) per recommended career
//   prediction_results  -> backup of the raw Space response
//
// createPrediction returns the new prediction id.
// redoPrediction swaps the recommended careers (and their roadmaps) for different ones.
// Both throw PredictionError if something goes wrong.

import { supabase } from '../config/supabase.js'
import { getRecommendation } from './pathwise.js'

export const MAX_REDOS = 5
const HOURS_PER_WEEK = 8

export class PredictionError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = 'PredictionError'
    this.status = status
  }
}

const one = (v) => (Array.isArray(v) ? v[0] : v)

// ---------- Helpers for the Hugging Face Space response ----------

// The Space returns:
// { mbti, personality, preference_note, disclaimer, shown_codes,
//   recommended: [{ code, title, overall_percent, description, why, skills_have, skills_to_build,
//                   roadmap (v2, with roadmap.summary), roadmap_text, summary }],
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
  const recommended = (raw?.recommended ?? []).slice(0, 3).map((c, i) => {
    const roadmap = c?.roadmap && typeof c.roadmap === 'object' ? c.roadmap : null
    return {
      rank: i + 1,
      code: c?.code ?? null,
      title: String(c?.title ?? '').trim(),
      matchPercent: toPercent(c?.overall_percent ?? c?.fit_percent),
      description: c?.description ?? null,
      why: c?.why ?? null,
      reasons: toReasons(c?.why),
      skillsHave: toStrings(c?.skills_have),
      skillsToBuild: toStrings(c?.skills_to_build),
      degreeRequired: c?.degree_required ?? null,
      roadmap,
      summary: roadmap?.summary ?? c?.summary ?? null,
      roadmapText: c?.roadmap_text ?? null,
    }
  })

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

const isValid = (recommended) =>
  recommended.length > 0 && recommended.every((c) => c.title && c.matchPercent !== null)

// ---------- career_roadmaps row (old columns stay filled, new v2 columns added) ----------

function roadmapRow(userId, recId, c) {
  const rm = c.roadmap
  const s = c.summary || {}
  const steps = Array.isArray(rm.steps) ? rm.steps : []
  const totalHours = steps.reduce(
    (a, st) => a + (st.substeps || []).reduce((b, sb) => b + (Number(sb.hours) || 0), 0),
    0
  )

  return {
    recommended_career_id: recId,
    user_id: userId,
    job_title: rm.title ?? c.title,

    // old columns (the previous page can still read these)
    technical_skills: s.technical ?? [],
    soft_skills: s.soft ?? [],
    other_skills: s.tools ?? [],
    education_typical: s.education ?? c.degreeRequired ?? null,
    education_reported: [],
    related_programs: s.programs ?? [],
    certificates: (s.certificates ?? []).filter((x) => x.kind !== 'none').map((x) => x.name),
    time_estimate: `About ${rm.skill_weeks ?? 0} weeks of skill building at ${rm.hours_per_week ?? HOURS_PER_WEEK} h/week`,
    time_steps: steps.map((st) => ({ title: st.title, timeframe: st.timeframe })),
    note: s.note ?? null,
    raw_text: c.roadmapText ?? null,

    // v2 columns
    roadmap: rm,
    version: 2,
    hours_per_week: rm.hours_per_week ?? null,
    total_hours: totalHours,
    steps_count: steps.length,
  }
}

async function insertRoadmaps(userId, recommended, idByRank) {
  const rows = recommended
    .filter((c) => c.roadmap && idByRank[c.rank])
    .map((c) => roadmapRow(userId, idByRank[c.rank], c))
  if (rows.length === 0) return { count: 0, error: null }
  const { error } = await supabase.from('career_roadmaps').insert(rows)
  return { count: rows.length, error }
}

const recRow = (c) => ({
  rank: c.rank,
  code: c.code,
  title: c.title,
  match_percent: c.matchPercent,
  description: c.description,
  why: c.why,
  reasons: c.reasons,
  skills_have: c.skillsHave,
  skills_to_build: c.skillsToBuild,
})

// ---------- Create ----------

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
      hours: HOURS_PER_WEEK,
    })
  } catch (err) {
    console.error('PathWise Space error:', err)
    throw new PredictionError('Prediction service unavailable, please try again.', 502)
  }

  const { recommended, avoid } = normalizeResult(raw)
  if (!isValid(recommended)) {
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
      shown_codes: recommended.map((c) => c.code).filter(Boolean),
      redo_count: 0,
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
    .insert(recommended.map((c) => ({ prediction_id: pred.id, user_id: userId, ...recRow(c) })))
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

  // 5. Roadmaps (one row per recommended career)
  const idByRank = Object.fromEntries(recRows.map((r) => [r.rank, r.id]))
  const { count: roadmapCount, error: rmErr } = await insertRoadmaps(userId, recommended, idByRank)
  if (rmErr) await fail('Insert career_roadmaps error', rmErr)

  // 6. Backup of the Space response (roadmaps are stored above, so they are left out here)
  const { error: resErr } = await supabase.from('prediction_results').insert({
    prediction_id: pred.id,
    user_id: userId,
    mbti: raw.mbti ?? a.mbti,
    personality: raw.personality ?? null,
    preference_note: raw.preference_note ?? null,
    disclaimer: raw.disclaimer ?? null,
    result: {
      ...raw,
      recommended: (raw.recommended ?? []).map(({ roadmap, roadmap_text, summary, ...rest }) => rest),
    },
  })
  if (resErr) await fail('Insert prediction_results error', resErr)

  console.log(
    '[prediction] Saved', pred.id, '|',
    recommended.length, 'recommended,', avoid.length, 'avoid,', roadmapCount, 'roadmaps'
  )

  return pred.id
}

// ---------- Redo: "No, show me different careers" ----------
// The Space is asked FIRST. If nothing qualifies, nothing is touched and the user keeps their results.
// Careers to avoid stay the same. Rows are updated in place by rank (keeps ids and unique keys safe).

export async function redoPrediction({ userId, predictionId }) {
  const { data: p, error } = await supabase
    .from('predictions')
    .select(
      `id, redo_count, shown_codes,
       assessments(mbti, degree_program, skills, career_preference),
       recommended_careers(id, rank, code)`
    )
    .eq('id', predictionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Redo (lookup) error:', error)
    throw new PredictionError('Could not redo prediction', 500)
  }
  if (!p) throw new PredictionError('Prediction not found', 404)

  const redoCount = p.redo_count ?? 0
  if (redoCount >= MAX_REDOS) {
    throw new PredictionError(`You can only ask for different careers ${MAX_REDOS} times per prediction.`, 429)
  }

  const a = one(p.assessments)
  if (!a) throw new PredictionError('Assessment not found for this prediction', 404)

  const old = [...p.recommended_careers].sort((x, y) => x.rank - y.rank)
  const shown = [...new Set([...(p.shown_codes ?? []), ...old.map((r) => r.code).filter(Boolean)])]

  // 1. Ask the Space for careers that were not shown yet
  let raw
  try {
    raw = await getRecommendation({
      mbti: a.mbti,
      skills: a.skills,
      education: a.degree_program,
      preference: a.career_preference || '',
      includeRoadmap: true,
      hours: HOURS_PER_WEEK,
      exclude: shown,
    })
  } catch (err) {
    console.error('PathWise Space error (redo):', err)
    throw new PredictionError('Prediction service unavailable, please try again.', 502)
  }

  const { recommended } = normalizeResult(raw)
  if (raw?.exhausted || recommended.length === 0) {
    throw new PredictionError(raw?.message || 'No more careers left to suggest for your profile.', 409)
  }
  if (!isValid(recommended)) {
    console.error('Unexpected Space response (redo):', JSON.stringify(raw))
    throw new PredictionError('Unexpected response from prediction service', 502)
  }

  // 2. Remove the old roadmaps
  const oldIds = old.map((r) => r.id)
  if (oldIds.length > 0) {
    const { error: delRm } = await supabase.from('career_roadmaps').delete().in('recommended_career_id', oldIds)
    if (delRm) {
      console.error('Redo (delete roadmaps) error:', delRm)
      throw new PredictionError('Could not redo prediction', 500)
    }
  }

  // 3. Update old rows in place by rank, insert extra ones, remove leftovers
  const idByRank = {}
  for (const c of recommended) {
    const target = old[c.rank - 1]
    if (target) {
      const { error: upErr } = await supabase
        .from('recommended_careers')
        .update(recRow(c))
        .eq('id', target.id)
        .eq('user_id', userId)
      if (upErr) {
        console.error('Redo (update career) error:', upErr)
        throw new PredictionError('Could not redo prediction', 500)
      }
      idByRank[c.rank] = target.id
    } else {
      const { data: ins, error: insErr } = await supabase
        .from('recommended_careers')
        .insert({ prediction_id: p.id, user_id: userId, ...recRow(c) })
        .select('id')
        .single()
      if (insErr) {
        console.error('Redo (insert career) error:', insErr)
        throw new PredictionError('Could not redo prediction', 500)
      }
      idByRank[c.rank] = ins.id
    }
  }
  const leftovers = old.slice(recommended.length).map((r) => r.id)
  if (leftovers.length > 0) {
    await supabase.from('recommended_careers').delete().in('id', leftovers).eq('user_id', userId)
  }

  // 4. New roadmaps
  const { error: rmErr } = await insertRoadmaps(userId, recommended, idByRank)
  if (rmErr) {
    console.error('Redo (insert roadmaps) error:', rmErr)
    throw new PredictionError('Could not redo prediction', 500)
  }

  // 5. Prediction summary: new top match, selection cleared, remember what was shown, count the redo
  const { error: pErr } = await supabase
    .from('predictions')
    .update({
      top_match_title: recommended[0].title,
      top_match_percent: recommended[0].matchPercent,
      selected_career: null,
      shown_codes: [...new Set([...shown, ...recommended.map((c) => c.code).filter(Boolean)])],
      redo_count: redoCount + 1,
    })
    .eq('id', p.id)
    .eq('user_id', userId)
  if (pErr) {
    console.error('Redo (update prediction) error:', pErr)
    throw new PredictionError('Could not redo prediction', 500)
  }

  // 6. Keep the raw backup in sync (best effort)
  await supabase
    .from('prediction_results')
    .update({
      result: {
        ...raw,
        recommended: (raw.recommended ?? []).map(({ roadmap, roadmap_text, summary, ...rest }) => rest),
      },
    })
    .eq('prediction_id', p.id)

  console.log('[prediction] Redo', p.id, '| round', redoCount + 1, '|', recommended.map((c) => c.title).join(' / '))
  return p.id
}