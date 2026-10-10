// server/services/predictionService.js  (NEW file)

import { supabase } from '../config/supabase.js'

const clean = (value, max) => String(value ?? '').trim().slice(0, max)

const cleanReasons = (reasons) =>
  (Array.isArray(reasons) ? reasons : [])
    .map((r) => clean(r, 200))
    .filter(Boolean)
    .slice(0, 6)

/**
 * Saves one prediction (+ its careers) for an assessment.
 *
 * recommended: [{ title, matchPercent, reasons: string[] }]   (top 3 are kept)
 * avoid:       [{ title, reasons?: string[] }] or ['Title', ...]
 */
export async function savePrediction({ userId, assessmentId, recommended, avoid = [] }) {
  const top = (Array.isArray(recommended) ? recommended : [])
    .map((c) => ({
      title: clean(c.title, 150),
      matchPercent: Number(c.matchPercent),
      reasons: cleanReasons(c.reasons),
    }))
    .filter((c) => c.title && Number.isFinite(c.matchPercent) && c.matchPercent >= 0 && c.matchPercent <= 100)
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 3)

  if (top.length === 0) throw new Error('No valid recommended careers to save')

  const avoidList = (Array.isArray(avoid) ? avoid : [])
    .map((c) => (typeof c === 'string' ? { title: c } : c))
    .map((c) => ({ title: clean(c.title, 150), reasons: cleanReasons(c.reasons) }))
    .filter((c) => c.title)
    .slice(0, 10)

  const { data: prediction, error } = await supabase
    .from('predictions')
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      top_match_title: top[0].title,
      top_match_percent: top[0].matchPercent,
    })
    .select()
    .single()

  if (error) throw error

  const rows = [
    ...top.map((c, i) => ({
      prediction_id: prediction.id,
      kind: 'recommended',
      rank: i + 1,
      title: c.title,
      match_percent: c.matchPercent,
      reasons: c.reasons,
    })),
    ...avoidList.map((c, i) => ({
      prediction_id: prediction.id,
      kind: 'avoid',
      rank: i + 1,
      title: c.title,
      match_percent: null,
      reasons: c.reasons,
    })),
  ]

  const { error: careersError } = await supabase.from('prediction_careers').insert(rows)

  if (careersError) {
    // No transactions in supabase-js, so undo the parent row manually
    await supabase.from('predictions').delete().eq('id', prediction.id)
    throw careersError
  }

  return prediction
}